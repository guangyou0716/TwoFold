/**
 * Unit tests for pairing/profile decisions (no emulator).
 */
const test = require("node:test");
const assert = require("node:assert");
const {
  isPairedProfile,
  soloGroupIdOf,
  mergeBudgetAllowances,
  mergePointBalances,
  mergeStreaks,
} = require("../lib/profileState");

test("solo and empty profiles are not paired", () => {
  assert.strictEqual(isPairedProfile(null), false);
  assert.strictEqual(isPairedProfile({}), false);
  assert.strictEqual(isPairedProfile({ partnerId: "", groupId: "" }), false);
  assert.strictEqual(isPairedProfile({ partnerId: "", groupId: "solo_alice" }), false);
});

test("a real partner or shared group is paired", () => {
  assert.strictEqual(isPairedProfile({ partnerId: "bob", groupId: "solo_alice" }), true);
  assert.strictEqual(isPairedProfile({ groupId: "group_alice_bob" }), true);
});

test("soloGroupIdOf only matches the caller's own solo group", () => {
  assert.strictEqual(soloGroupIdOf({ groupId: "solo_alice" }, "alice"), "solo_alice");
  assert.strictEqual(soloGroupIdOf({ groupId: "solo_bob" }, "alice"), null);
  assert.strictEqual(soloGroupIdOf({ groupId: "group_alice_bob" }, "alice"), null);
  assert.strictEqual(soloGroupIdOf(undefined, "alice"), null);
});

test("allowances and balances merge without inventing zeros", () => {
  assert.strictEqual(mergeBudgetAllowances(undefined, undefined), undefined);
  assert.strictEqual(mergeBudgetAllowances(1000, undefined), 1000);
  assert.strictEqual(mergeBudgetAllowances(1000, 250), 1250);
  assert.deepStrictEqual(
    mergePointBalances({ alice: 2 }, { bob: 5, alice: 9 }),
    { alice: 9, bob: 5 }
  );
});

test("streaks keep the longer streak and the later date", () => {
  assert.deepStrictEqual(
    mergeStreaks(
      { choreStreak: 3, lastChoreDate: "2026-01-02" },
      { choreStreak: 1, lastChoreDate: "2026-04-01" }
    ),
    { choreStreak: 3, lastChoreDate: "2026-04-01" }
  );
});
