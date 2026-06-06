process.env.TOKEN_ENCRYPTION_KEY ||= "a".repeat(64);

import { encryptSecret, decryptSecret } from "../crypto";

function assert(name: string, cond: boolean) {
  if (cond) console.log(`\x1b[32mPASS\x1b[0m  ${name}`);
  else {
    console.error(`\x1b[31mFAIL\x1b[0m  ${name}`);
    process.exitCode = 1;
  }
}

const tokens = [
  "ya29.a0ARrdaM8c9_PmADcGxBnZ-real-looking-google-token",
  "1//04qExampleRefreshToken_kP_ZQ",
  ""
];

for (const t of tokens) {
  const enc = encryptSecret(t);
  const dec = decryptSecret(enc);
  assert(`round-trip "${t.slice(0, 12)}…"`, dec === t);
  if (t.length > 0) {
    assert(`ciphertext differs from plaintext "${t.slice(0, 12)}…"`, enc !== t);
  }
}

console.log("\nCrypto round-trip passes.");
