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
