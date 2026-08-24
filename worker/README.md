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
