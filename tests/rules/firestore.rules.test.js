/**
 * Firestore security rules tests.
 *
 * Requires the Firestore emulator on :8080 (project demo-twofold), which
 * `npm run test:rules` boots automatically via `firebase emulators:exec`.
 *
 * Run standalone:
 *   cd tests/rules && firebase emulators:exec --project demo-twofold \
 *     --only firestore,storage "node --test ./"
 */
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require("@firebase/rules-unit-testing");
const {
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  doc,
} = require("firebase/firestore");

const RULES = fs.readFileSync(
  path.join(__dirname, "..", "..", "firestore.rules"),
  "utf8"
);

let env;

test.before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-twofold",
    firestore: { rules: RULES, host: "127.0.0.1", port: 8080 },
  });
});

test.after(async () => {
  await env.cleanup();
});

async function seed(seedFn) {
  await env.withSecurityRulesDisabled(seedFn);
}

// ---------------------------------------------------------------------------
// Fixture: alice & bob are paired (group_gX), mallory is an outsider.
// ---------------------------------------------------------------------------
const GROUP = "group_alice_bob";

async function seedGroup(name, groupId, members) {
  await seed(async (ctx) => {
    const fsDb = ctx.firestore();
    for (const [uid, isPaired] of Object.entries(members)) {
      await setDoc(doc(fsDb, "users", uid), {
        uid,
        displayName: uid,
        partnerId: isPaired ? (Object.keys(members).find((k) => k !== uid && members[k]) ?? null) : "",
        groupId: isPaired ? groupId : isPaired === false ? "solo_" + uid : null,
        isSolo: !isPaired,
        createdAt: new Date().toISOString(),
      });
      if (isPaired) {
        await setDoc(doc(fsDb, "groups", groupId), {
          groupId,
          partnerAId: name[0],
          partnerBId: name[1],
          createdAt: new Date().toISOString(),
        });
      }
    }
  });
}

test("stranger cannot read a paired user's full profile", async () => {
  await seedGroup(GROUP, ["alice", "bob"], { alice: true, bob: true, mallory: false });
  const mallory = env.authenticatedContext("mallory", { uid: "mallory" });
  await assertFails(getDoc(doc(mallory.firestore(), "users", "alice")));
});

test("partner can read their partner's profile", async () => {
  await seedGroup(GROUP, ["alice", "bob"], { alice: true, bob: true, mallory: false });
  const bob = env.authenticatedContext("bob", { uid: "bob" });
  await assertSucceeds(getDoc(doc(bob.firestore(), "users", "alice")));
});

test("stranger cannot read an unpaired user's profile", async () => {
  await seed(async (ctx) => {
    const fsDb = ctx.firestore();
    // mallory and dave are both completely unpaired.
    await setDoc(doc(fsDb, "users", "mallory"), {
      uid: "mallory", displayName: "mallory", partnerId: "", groupId: "", isSolo: false,
      createdAt: new Date().toISOString(),
    });
    await setDoc(doc(fsDb, "users", "dave"), {
      uid: "dave", displayName: "dave", partnerId: "", groupId: "", isSolo: false,
      createdAt: new Date().toISOString(),
    });
  });
  const mallory = env.authenticatedContext("mallory", { uid: "mallory" });
  await assertFails(getDoc(doc(mallory.firestore(), "users", "dave")));
});

test("client may create its own solo group", async () => {
  await seed(async (ctx) => {
    const fsDb = ctx.firestore();
    await setDoc(doc(fsDb, "users", "alice"), {
      uid: "alice", displayName: "alice", partnerId: "", groupId: "", isSolo: false,
      createdAt: new Date().toISOString(),
    });
  });
  const alice = env.authenticatedContext("alice", { uid: "alice" });
  await assertSucceeds(
    setDoc(doc(alice.firestore(), "groups", "solo_alice"), {
      groupId: "solo_alice",
      partnerAId: "alice",
      partnerBId: "",
      balances: { alice: 0 },
      streaks: { choreStreak: 0, lastChoreDate: null },
      createdAt: new Date().toISOString(),
    })
  );
});

test("client cannot create a pair group (pairing is callable-only)", async () => {
  await seed(async (ctx) => {
    const fsDb = ctx.firestore();
    await setDoc(doc(fsDb, "users", "alice"), {
      uid: "alice", displayName: "alice", partnerId: "", groupId: "", isSolo: false,
      createdAt: new Date().toISOString(),
    });
  });
  const alice = env.authenticatedContext("alice", { uid: "alice" });
  await assertFails(
    setDoc(doc(alice.firestore(), "groups", "group_alice_dave"), {
      groupId: "group_alice_dave",
      partnerAId: "alice",
      partnerBId: "dave",
      createdAt: new Date().toISOString(),
    })
  );
});

test("owner can write their own profile", async () => {
  await seedGroup(GROUP, ["alice", "bob"], { alice: true, bob: true, mallory: false });
  const alice = env.authenticatedContext("alice", { uid: "alice" });
  await assertSucceeds(updateDoc(doc(alice.firestore(), "users", "alice"), {
    displayName: "Alicia",
    timezoneLocation: "Asia/Kuala_Lumpur",
  }));
});

test("user cannot reassign their own group to a stranger's group", async () => {
  await seedGroup(GROUP, ["alice", "bob"], { alice: true, bob: true, mallory: false, eve: true });
  const eve = env.authenticatedContext("eve", { uid: "eve" });
  // eve tries to join alice's group by editing her own profile
  await assertFails(updateDoc(doc(eve.firestore(), "users", "eve"), {
    groupId: "group_alice_bob",
    partnerId: "alice",
    isSolo: false,
  }));
});

test("outsider cannot read group shared memory", async () => {
  await seed(async (ctx) => {
    const fsDb = ctx.firestore();
    await setDoc(doc(fsDb, "users", "alice"), {
      uid: "alice", displayName: "alice", partnerId: "bob", groupId: GROUP, isSolo: false, createdAt: new Date().toISOString(),
    });
    await setDoc(doc(fsDb, "users", "bob"), {
      uid: "bob", displayName: "bob", partnerId: "alice", groupId: GROUP, isSolo: false, createdAt: new Date().toISOString(),
    });
    await setDoc(doc(fsDb, "groups", GROUP), { groupId: GROUP, partnerAId: "alice", partnerBId: "bob", createdAt: new Date().toISOString() });
    await setDoc(doc(fsDb, "memories", "m1"), { groupId: GROUP, uploadedBy: "alice", textContent: "secret", createdAt: new Date().toISOString() });
  });
  const mallory = env.authenticatedContext("mallory", { uid: "mallory" });
  await assertFails(getDoc(doc(mallory.firestore(), "memories", "m1")));
});

test("partner can read shared memory", async () => {
  const bob = env.authenticatedContext("bob", { uid: "bob" });
  await assertSucceeds(getDoc(doc(bob.firestore(), "memories", "m1")));
});

test("memory creator must be the authenticated uploader", async () => {
  const bob = env.authenticatedContext("bob", { uid: "bob" });
  await assertFails(
    addDoc(collection(bob.firestore(), "memories"), {
      groupId: GROUP,
      uploadedBy: "alice",
      textContent: "forged",
      createdAt: new Date().toISOString(),
    })
  );
});

test("client cannot forge a generator-created transaction (source recurrence)", async () => {
  const bob = env.authenticatedContext("bob", { uid: "bob" });
  // Directly writing a recurrence-instance is reserved for the backend.
  await assertFails(
    addDoc(collection(bob.firestore(), "transactions"), {
      groupId: GROUP,
      title: "Rent",
      amount: 1000,
      type: "expense",
      source: "recurrence",
      occurrenceId: "rent_2026-08-01",
      date: "2026-08-01",
      createdAt: new Date().toISOString(),
    })
  );
});

test("manual client transaction write is allowed", async () => {
  const bob = env.authenticatedContext("bob", { uid: "bob" });
  await assertSucceeds(
    addDoc(collection(bob.firestore(), "transactions"), {
      groupId: GROUP,
      title: "Coffee",
      amount: 8.5,
      type: "expense",
      source: "manual",
      date: "2026-08-01",
      createdAt: new Date().toISOString(),
    })
  );
});

test("outsider cannot create a transaction in the group", async () => {
  const mallory = env.authenticatedContext("mallory", { uid: "mallory" });
  await assertFails(
    addDoc(collection(mallory.firestore(), "transactions"), {
      groupId: GROUP,
      title: "Heist",
      amount: 999,
      type: "expense",
      source: "manual",
      date: "2026-08-01",
      createdAt: new Date().toISOString(),
    })
  );
});

test("nudge can only be sent to your partner", async () => {
  const alice = env.authenticatedContext("alice", { uid: "alice" });
  // alice trying to nudge mallory (not partner) → denied
  await assertFails(
    addDoc(collection(alice.firestore(), "nudges"), {
      senderId: "alice",
      recipientId: "mallory",
      type: "hug",
      createdAt: new Date().toISOString(),
    })
  );
});

test("group ownership id cannot be mutated after creation", async () => {
  const alice = env.authenticatedContext("alice", { uid: "alice" });
  await assertFails(updateDoc(doc(alice.firestore(), "groups", GROUP), {
    partnerAId: "mallory",
  }));
});

test("savings goal update stays within the group", async () => {
  const alice = env.authenticatedContext("alice", { uid: "alice" });
  await assertSucceeds(
    setDoc(doc(alice.firestore(), "savings_goals", "g1"), {
      groupId: GROUP,
      title: "Trip",
      targetAmount: 5000,
      currentAmount: 100,
      createdAt: new Date().toISOString(),
    })
  );
});

// ---------------------------------------------------------------------------
// Recurrence schedules (client configures the rule; the backend generates the
// occurrence ledger). Guards the client/server split enforced in Phase 2.2/6.
// ---------------------------------------------------------------------------

test("group member can create and edit a recurrence rule", async () => {
  const alice = env.authenticatedContext("alice", { uid: "alice" });
  await assertSucceeds(
    setDoc(doc(alice.firestore(), "recurrences", "rent-rule"), {
      groupId: GROUP,
      kind: "monthly",
      anchorDate: "2026-10-01",
      paused: false,
      template: { title: "Rent", amount: 1200, type: "expense", category: "Rent" },
      createdAt: new Date().toISOString(),
    })
  );
  await assertSucceeds(
    updateDoc(doc(alice.firestore(), "recurrences", "rent-rule"), { paused: true })
  );
});

test("outsider cannot create a recurrence rule in the group", async () => {
  const mallory = env.authenticatedContext("mallory", { uid: "mallory" });
  await assertFails(
    setDoc(doc(mallory.firestore(), "recurrences", "evil-rule"), {
      groupId: GROUP,
      kind: "monthly",
      anchorDate: "2026-10-01",
      paused: false,
      template: { title: "x", amount: 1, type: "expense", category: "Other" },
      createdAt: new Date().toISOString(),
    })
  );
});

test("recurrence group cannot be reassigned by a member", async () => {
  const alice = env.authenticatedContext("alice", { uid: "alice" });
  await assertFails(
    updateDoc(doc(alice.firestore(), "recurrences", "rent-rule"), {
      groupId: "group_someone_else",
    })
  );
});

test("client cannot write a transaction carrying a server occurrenceId", async () => {
  const bob = env.authenticatedContext("bob", { uid: "bob" });
  await assertFails(
    addDoc(collection(bob.firestore(), "transactions"), {
      groupId: GROUP,
      title: "Rent (fake instance)",
      amount: 1200,
      type: "expense",
      date: "2026-10-01",
      occurrenceId: "rent-rule_2026-10-01",
      createdAt: new Date().toISOString(),
    })
  );
});
