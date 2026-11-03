/**
 * Unit tests for invite-code generation/normalization.
 */
const test = require("node:test");
const assert = require("node:assert");
const { generateInviteCode, normalizeCode, hashInviteCode, isValidCodeFormat } = require("../lib/inviteCode");

test("generated codes have the requested length", () => {
  for (let i = 0; i < 50; i++) {
    assert.strictEqual(generateInviteCode(6).length, 6);
  }
});

test("codes only use unambiguous alphabet chars", () => {
  for (let i = 0; i < 200; i++) {
    const code = generateInviteCode(6);
    assert.ok(isValidCodeFormat(code));
  }
});

test("normalizeCode uppercases and strips spaces/dashes", () => {
  assert.strictEqual(normalizeCode("  ab-cd e3 "), "ABCDE3");
});

test("validation rejects disallowed characters", () => {
  assert.ok(!isValidCodeFormat("ABCDE0")); // O/0 not in alphabet
  assert.ok(!isValidCodeFormat("abcde3")); // lowercase
  assert.ok(!isValidCodeFormat("ABCDEF1")); // wrong length
});

test("hash is stable across normalized input", () => {
  assert.strictEqual(hashInviteCode("ab-cd e3"), hashInviteCode("ABCDE3"));
});
