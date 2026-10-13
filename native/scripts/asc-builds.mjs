/**
 * Ask App Store Connect where the builds went.
 *
 * WHY THIS EXISTS. altool reported both 2.0.2 build 1 and build 2 as uploaded,
 * and TestFlight showed "No Builds". Those are not contradictory: an upload
 * only has to be accepted, and PROCESSING happens afterwards, asynchronously,
 * and can reject a build for reasons the upload never checks. Apple emails the
 * account holder when that happens — which is a poor place for the answer to
 * live when the build pipeline is the thing that needs to know.
 *
 * So this asks the API directly and prints what it says: every build it has for
 * this bundle id, what state processing left it in, and — when a build was
 * rejected — the reason, which is the thing actually worth having.
 *
 * It needs no Xcode and no macOS. The three secrets the release workflow
 * already uses are enough, and it runs in seconds on a Linux runner, so it can
 * be asked as often as it is useful.
 *
 * The key never leaves this process: it signs a short-lived token and nothing
 * else, and only metadata is ever printed.
 */
import crypto from "node:crypto";

const KEY_ID = process.env.APPSTORE_KEY_ID;
const ISSUER = process.env.APPSTORE_ISSUER_ID;
const P8_B64 = process.env.APPSTORE_API_KEY_P8;
const BUNDLE = process.env.BUNDLE_ID || "com.taiyabahmasjid.app";

const annotate = (level, msg, max = 900) =>
  console.log(`::${level}::${String(msg).replace(/\r?\n/g, " ").slice(0, max)}`);

for (const [name, v] of [["APPSTORE_KEY_ID", KEY_ID], ["APPSTORE_ISSUER_ID", ISSUER],
                         ["APPSTORE_API_KEY_P8", P8_B64]]) {
  if (!v) { annotate("error", `${name} is not set`); process.exit(1); }
}

/* ES256, as App Store Connect requires. ieee-p1363 is the raw r||s encoding a
 * JWT wants; Node's default DER would be rejected with a bare 401 that says
 * nothing about why. */
function token() {
  const now = Math.floor(Date.now() / 1000);
  const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64url");
  const input = `${b64({ alg: "ES256", kid: KEY_ID, typ: "JWT" })}.`
              + `${b64({ iss: ISSUER, iat: now, exp: now + 900, aud: "appstoreconnect-v1" })}`;
  const sig = crypto.sign("sha256", Buffer.from(input), {
    key: Buffer.from(P8_B64, "base64").toString("utf8"),
    dsaEncoding: "ieee-p1363",
  });
  return `${input}.${sig.toString("base64url")}`;
}

const JWT = token();

async function api(path) {
  const r = await fetch(`https://api.appstoreconnect.apple.com${path}`,
    { headers: { Authorization: `Bearer ${JWT}` } });
  const body = await r.text();
  if (!r.ok) {
    let why = body.slice(0, 400);
    try {
      why = JSON.parse(body).errors?.map(e => `${e.title}: ${e.detail}`).join("; ") || why;
    } catch { /* not JSON; the raw body is the best available */ }
    throw new Error(`${r.status} on ${path} — ${why}`);
  }
  return JSON.parse(body);
}

try {
  const apps = await api(`/v1/apps?filter[bundleId]=${encodeURIComponent(BUNDLE)}`);
  if (!apps.data?.length) {
    annotate("error", `App Store Connect has no app with bundle id ${BUNDLE} — uploads would have gone nowhere this key can see`);
    process.exit(1);
  }
  const app = apps.data[0];
  annotate("notice", `app: ${app.attributes.name} (${BUNDLE}), Apple ID ${app.id}`);

  const builds = await api(
    `/v1/builds?filter[app]=${app.id}&limit=20&sort=-uploadedDate`
    + `&include=preReleaseVersion`
    + `&fields[builds]=version,processingState,uploadedDate,expired,usesNonExemptEncryption`);

  if (!builds.data?.length) {
    annotate("error", "App Store Connect holds NO builds for this app at all. The uploads were accepted but nothing survived — check the Apple ID inbox for an ITMS- message, which names the reason.");
    process.exit(1);
  }

  const versions = Object.fromEntries(
    (builds.included || []).filter(i => i.type === "preReleaseVersions")
      .map(i => [i.id, i.attributes.version]));

  let usable = 0;
  for (const b of builds.data) {
    const a = b.attributes;
    const short = versions[b.relationships?.preReleaseVersion?.data?.id] || "?";
    const line = `${short} (${a.version}) — ${a.processingState}`
               + `${a.expired ? ", EXPIRED" : ""} — uploaded ${a.uploadedDate}`;
    if (a.processingState === "VALID" && !a.expired) { usable++; annotate("notice", line); }
    else annotate("warning", line);

    /* PROCESSING_FAILED is the case worth chasing: the state alone does not say
     * why, and the reason is what fixes it. */
    if (a.processingState === "FAILED" || a.processingState === "INVALID") {
      try {
        const d = await api(`/v1/builds/${b.id}/buildBetaDetail`);
        annotate("error", `${short} (${a.version}) beta state: `
          + `internal=${d.data?.attributes?.internalBuildState} `
          + `external=${d.data?.attributes?.externalBuildState}`);
      } catch (e) {
        annotate("warning", `could not read beta detail for ${a.version}: ${e.message}`);
      }
    }
  }

  if (!usable) {
    annotate("error", "No build is both VALID and unexpired, which is why TestFlight shows none. A build still PROCESSING will appear on its own; anything else needs the ITMS- reason from the Apple ID inbox.");
    process.exit(1);
  }
  annotate("notice", `${usable} build(s) are VALID and should be installable from TestFlight.`);
} catch (e) {
  annotate("error", e.message);
  process.exit(1);
}
