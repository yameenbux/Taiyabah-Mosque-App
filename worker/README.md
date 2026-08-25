# Sender service

The Cloudflare Worker that `admin.html` talks to. It is the only place the
OneSignal REST API key and the trustee password exist — both are Worker
secrets, never shipped to the browser.

```
worker/
├── src/index.js     /api/login and /api/send
├── wrangler.toml     Worker config (no secrets in here)
└── package.json
```

## What it does

- **`POST /api/login`** — checks the posted password against `TRUSTEE_PASSWORD`
  and, on success, returns a signed token good for 12 hours.
- **`POST /api/send`** — requires that token as a Bearer header, then calls
  the OneSignal REST API with a tag filter for the chosen topic (`jamaah`,
  `janazah`, `announcements` or `events` — the same tags `index.html` sets
  when someone opts in on the Alerts screen).

There is no database: tokens are self-verifying (HMAC-signed, with an
expiry baked into the payload), so there's nothing to provision beyond the
four secrets below.

## Deploy

Requires a [Cloudflare account](https://dash.cloudflare.com/sign-up) (the
free tier is enough) and the masjid's OneSignal **App ID** and **REST API
Key** (Settings → Keys & IDs in the OneSignal dashboard).

```bash
cd worker
npm install
npx wrangler login

npx wrangler secret put TRUSTEE_PASSWORD
npx wrangler secret put SESSION_SECRET          # any long random string
npx wrangler secret put ONESIGNAL_APP_ID
npx wrangler secret put ONESIGNAL_REST_API_KEY

npx wrangler deploy
```

`wrangler deploy` prints the Worker's URL — it should come out as
`https://taiyabah-sender.<your-subdomain>.workers.dev`. `admin.html`
already defaults `API_BASE` to `https://taiyabah-sender.yameenbux.workers.dev`,
so deploying under that Cloudflare account needs no further change; deploying
under a different account means updating `API_BASE` in `admin.html` (or
setting `localStorage.senderUrl` on the device, which `admin.html` also
reads).

## Rotating the trustee password or session secret

```bash
npx wrangler secret put TRUSTEE_PASSWORD
```

Changing `SESSION_SECRET` invalidates every signed-in trustee's token
immediately (everyone is asked to sign in again) — use it if a device with
an active session is lost.

## Local testing

```bash
npm run dev
```

Wrangler will prompt for local secret values (or read `.dev.vars` — see
[Wrangler's docs](https://developers.cloudflare.com/workers/configuration/secrets/#local-development-with-secrets));
point `admin.html`'s `senderUrl` (via `localStorage.setItem("senderUrl", "http://127.0.0.1:8787")`
in the browser console) at it while testing.
# Notification sender — Cloudflare Worker

Sits between the trustee compose screen (`admin.html`) and OneSignal.

The OneSignal **REST API key can message the entire congregation**, so it lives
only in Cloudflare's secret store — never in the app, never in this repo.

Free tier, always on, nothing to patch or restart.

## Setup

You'll need a free Cloudflare account.

**1. Choose a password and generate the secrets**

```bash
cd worker
node hash-password.js "a-long-password-you-choose"
```

Keep the two values it prints. The password itself is never stored — only its hash.

**2. Deploy**

```bash
npx wrangler login
npx wrangler deploy
```

**3. Add the secrets** (each prompts for the value)

```bash
npx wrangler secret put ONESIGNAL_APP_ID          # 2506fafe-179d-401c-b9e3-a0f320d68857
npx wrangler secret put ONESIGNAL_REST_API_KEY    # Dashboard → Settings → Keys & IDs
npx wrangler secret put ADMIN_PASSWORD_HASH       # from step 1
npx wrangler secret put SESSION_SECRET            # from step 1
```

**4. Check it's alive**

Wrangler prints a URL like `https://taiyabah-sender.<your-name>.workers.dev`.

```bash
curl https://taiyabah-sender.<your-name>.workers.dev/api/health
# {"ok":true}
```

**5. Point the admin page at it** — once per device that will send.

Open `admin.html`, and in the browser console:

```js
localStorage.setItem("senderUrl", "https://taiyabah-sender.<your-name>.workers.dev");
```

Reload, sign in, send a test.

## Changing the password

Run `node hash-password.js` again and
`npx wrangler secret put ADMIN_PASSWORD_HASH`. Existing sessions stay valid for
up to 8 hours; to end them immediately, also replace `SESSION_SECRET`.

## Security

- Sends require the password; sessions are signed and last 8 hours.
- CORS only permits the app's own origin (`ALLOWED_ORIGIN` in `wrangler.toml`).
- Title and message length are enforced server-side.
- Login attempts and sends are rate limited on a best-effort basis — Workers
  run across short-lived isolates, so the password and session are the real
  control, not the limiter.
- Cloudflare's dashboard holds request logs; OneSignal's dashboard holds a
  record of every message sent.

## Diagnostic reports

Congregants can send their own diagnostics from the app's **Having trouble**
screen. Reports are stored in KV and read in `admin.html` under *Reports from
congregants*. They expire after two months.

That works with no configuration. To have them emailed as well, set two
secrets — without them the endpoint still stores the report and the admin
screen still shows it, so a missing or broken email provider never loses one:

    npx wrangler secret put RESEND_API_KEY   # from resend.com
    npx wrangler secret put REPORT_EMAIL     # where reports should go

Optionally `REPORT_FROM` (defaults to Resend's shared sending address, which
is fine for testing; a verified domain is better for anything lasting).

The destination address is a secret rather than a value in this file on
purpose — it is a personal inbox and this repository is public.

Reports carry what the phone could see about itself: subscription and user
ids, page origin, permission state, service workers, browser user agent. No
names, no contact details, and nothing the person did not press a button to
send.
