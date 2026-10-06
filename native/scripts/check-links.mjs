/* Does the app point at the same places the website points at?
 *
 * The Stripe links are the ones that matter. Two of the website's seven had no
 * counterpart in the app at all — the nikāḥ fee, member and non-member — so the
 * only two Payment Links that are NOT donations could not be reached. A nikāḥ
 * fee is not a gift: putting it through a donation link misstates it in the
 * charity's accounts and risks a Gift Aid problem, so "near enough" is not a
 * standard this file accepts.
 *
 * It also checks the phone numbers, the addresses people are told to write to,
 * and the one Supabase project, because a number that is one digit out is
 * indistinguishable from a working app until somebody rings it.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = f => fs.readFileSync(f, "utf8");
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
  const f = path.join(d, e.name);
  return e.isDirectory() ? walk(f) : /\.(js|jsx|json)$/.test(e.name) ? [f] : [];
});

const URL_RE = /(https?:\/\/[^\s"'<>)\\]+|tel:[+\d\s()-]{6,}|mailto:[^\s"'<>)\\]+)/g;
const grab = text => new Set([...text.matchAll(URL_RE)].map(m => m[0].replace(/[.,;]+$/, "")));

const web = grab(read(path.resolve(root, "..", "index.html")));
const app = new Set();
for (const f of walk(path.join(root, "src"))) for (const u of grab(read(f))) app.add(u);

const kind = u => u.includes("buy.stripe.com") ? "stripe"
  : u.startsWith("tel:") ? "phone"
  : u.startsWith("mailto:") ? "email"
  : u.includes("supabase") ? "supabase" : "other";

let bad = 0;
for (const k of ["stripe", "phone", "email", "supabase"]) {
  const w = [...web].filter(u => kind(u) === k).sort();
  const a = new Set([...app].filter(u => kind(u) === k));
  const missing = w.filter(u => !a.has(u));
  /* A link the app has and the website does not is not automatically wrong —
   * the app has screens the website never had — but a STRIPE one is, because
   * money must not go anywhere the website does not already send it. */
  const invented = k === "stripe" ? [...a].filter(u => !web.has(u)) : [];
  console.log(`  ${k.padEnd(9)} website ${String(w.length).padStart(2)}   app ${String(a.size).padStart(2)}` +
              (missing.length || invented.length ? "" : "   ✓"));
  for (const u of missing)  { console.log(`      MISSING FROM THE APP  ${u}`); bad++; }
  for (const u of invented) { console.log(`      NOT ON THE WEBSITE    ${u}`); bad++; }
}
console.log(bad ? `\n${bad} link(s) disagree with the website.` : "\nEvery link matches the website.");
if (bad) process.exit(1);
