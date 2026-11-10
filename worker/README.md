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

## Jumuʿah donations that land on a Friday

`POST /api/donate/friday  { amount, fund }  ->  { url, firstCharge }`

**Why the Worker is involved at all.** "Friday Pay" used to open a static
Stripe Payment Link. A Payment Link charges at checkout and then every seven
days from that moment — so a donor who set one up on Sunday 8 November 2026
was charged that Sunday, and would have been charged every Sunday after, under
a button that read *"Donate £10 every Friday"*.

No link can fix it. The wait to Friday is one day on a Thursday and seven on a
Saturday, and a Payment Link's `trial_period_days` is a fixed integer baked
into the link. You would need a different link for each day of the week.

A Checkout Session can, because it takes `billing_cycle_anchor`, which Stripe
documents as setting *"the day of week for `week` intervals"*. Anchor a weekly
subscription to any Friday and it bills every Friday, for good.

**`proration_behavior` is set to `none`, and must stay that way.** Stripe's
default with a future anchor is to charge a part amount now for the days in
between. That is the original complaint wearing a smaller number and a harder
explanation. `test/friday.test.mjs` fails if the parameter goes missing.

### The secrets it needs

```sh
npx wrangler secret put STRIPE_SECRET_KEY        # Stripe → Developers → API keys (sk_live_…)
```

Until that is set the route answers **503** and says so, rather than failing in
front of a donor.

Two optional ones, both plain configuration rather than secrets, so they can go
in `wrangler.toml`:

| | |
|---|---|
| `STRIPE_DONATION_PRODUCT` | A Stripe product id (`prod_…`). The weekly amounts are created inline, and without this each lands under its own product name. Set it and they all hang off one product, which keeps the reporting readable. |
| `DONATE_RETURN_URL` | Where Stripe sends the donor afterwards. Defaults to the app site. |

**The live key is a live key.** It can move money. It belongs in
`wrangler secret put`, never in `wrangler.toml`, never in the repository, and
never in a screenshot.
