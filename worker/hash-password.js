/* Generate ADMIN_PASSWORD_HASH and SESSION_SECRET for the Worker.
   Usage:  node hash-password.js "your-password"
   Uses PBKDF2-SHA256 to match what the Worker can verify. */
const pw = process.argv[2];
if (!pw) { console.error('Usage: node hash-password.js "your-password"'); process.exit(1); }
if (pw.length < 12) console.warn("⚠  Use at least 12 characters — this password can message the whole congregation.\n");

const ITER = 100000;   // Cloudflare Workers caps PBKDF2 at 100,000
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
const bits = await crypto.subtle.deriveBits({ name:"PBKDF2", salt, iterations: ITER, hash:"SHA-256" }, key, 256);
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2,"0")).join("");
console.log("\nADMIN_PASSWORD_HASH:");
console.log(`${hex(salt)}:${hex(bits)}:${ITER}`);
console.log("\nSESSION_SECRET:");
console.log(hex(crypto.getRandomValues(new Uint8Array(32))));
