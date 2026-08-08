// Run: node scripts/strip-secure.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// stripSecure is not exported from proxy.ts (Next only allows the proxy export),
// so pull the function out of the source and evaluate it here.
const src = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");
const body = src.match(/function stripSecure\(cookie: string\) \{([\s\S]*?)\n\}/)[1];
const stripSecure = new Function("cookie", body);

const real =
  "pos-core-admin-auth=eyJhbGci.abc; Max-Age=86400; Path=/; Expires=Sun, 09 Aug 2026 07:55:09 GMT; HttpOnly; Secure; SameSite=None";
const out = stripSecure(real);

assert.ok(!/;\s*Secure/i.test(out), "Secure attribute must be gone");
assert.match(out, /SameSite=Lax/, "SameSite must be downgraded to Lax");
assert.match(out, /HttpOnly/, "HttpOnly must survive");
assert.match(out, /Max-Age=86400/, "Max-Age must survive");
assert.match(out, /^pos-core-admin-auth=eyJhbGci\.abc;/, "name=value must survive");
// "Expires=...GMT" contains no semicolons but does contain a comma; make sure the
// date is not mangled by the split/join.
assert.match(out, /Expires=Sun, 09 Aug 2026 07:55:09 GMT/, "Expires date must survive");

// A cookie value containing the literal word "secure" must not be touched.
assert.equal(
  stripSecure("session=secure-token-secure; Path=/"),
  "session=secure-token-secure; Path=/"
);

console.log("ok:", out);
