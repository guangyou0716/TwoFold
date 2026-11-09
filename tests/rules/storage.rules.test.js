/**
 * Storage security rules tests. Requires the Firestore + Storage emulators
 * (project demo-twofold) running on 8080 / 9199.
 */
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require("@firebase/rules-unit-testing");

const FIRESTORE_RULES = fs.readFileSync(
  path.join(__dirname, "..", "..", "firestore.rules"),
  "utf8"
);
const STORAGE_RULES = fs.readFileSync(
  path.join(__dirname, "..", "..", "storage.rules"),
  "utf8"
);

const GROUP = "group_alice_bob";
const BUCKET = "demo-twofold.appspot.com";

let env;

test.before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-twofold",
    firestore: { rules: FIRESTORE_RULES, host: "127.0.0.1", port: 8080 },
    storage: { rules: STORAGE_RULES, host: "127.0.0.1", port: 9199 },
  });
});

test.after(async () => {
  await env.cleanup();
});

async function seedGroup() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const fsDb = ctx.firestore();
    const { setDoc, doc } = require("firebase/firestore");
    for (const [uid, partner] of [
      ["alice", "bob"],
      ["bob", "alice"],
    ]) {
      await setDoc(doc(fsDb, "users", uid), {
        uid,
        displayName: uid,
        partnerId: partner,
        groupId: GROUP,
        isSolo: false,
        createdAt: new Date().toISOString(),
      });
    }
    await setDoc(doc(fsDb, "groups", GROUP), {
      groupId: GROUP,
      partnerAId: "alice",
      partnerBId: "bob",
      createdAt: new Date().toISOString(),
    });
  });
}

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUg==", "base64");

test("group member can upload bounded image with uploader metadata", async () => {
  await seedGroup();
  const alice = env.authenticatedContext("alice");
  const storage = alice.storage(BUCKET);
  const uploader = storage.ref(`groups/${GROUP}/memories/pic1.png`);
  await assertSucceeds(
    uploader.put(PNG, {
      contentType: "image/png",
      customMetadata: { uploader: "alice" },
    })
  );
});

test("outsider cannot upload to the group's media area", async () => {
  const mallory = env.authenticatedContext("mallory");
  const storage = mallory.storage(BUCKET);
  const uploader = storage.ref(`groups/${GROUP}/memories/evil.png`);
  await assertFails(
    uploader.put(PNG, {
      contentType: "image/png",
      customMetadata: { uploader: "mallory" },
    })
  );
});

test("member cannot upload claiming an uploader they are not", async () => {
  const bob = env.authenticatedContext("bob");
  const storage = bob.storage(BUCKET);
  const uploader = storage.ref(`groups/${GROUP}/memories/impostor.png`);
  await assertFails(
    uploader.put(PNG, {
      contentType: "image/png",
      customMetadata: { uploader: "alice" },
    })
  );
});

test("member can read group media", async () => {
  await seedGroup();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const storage = ctx.storage(BUCKET);
    await storage.ref(`groups/${GROUP}/memories/pic1.png`).put(PNG, {
      contentType: "image/png",
      customMetadata: { uploader: "alice" },
    });
  });
  const bob = env.authenticatedContext("bob");
  const storage = bob.storage(BUCKET);
  const reader = storage.ref(`groups/${GROUP}/memories/pic1.png`);
  await assertSucceeds(reader.getDownloadURL());
});

test("outsider cannot read group media", async () => {
  const mallory = env.authenticatedContext("mallory");
  const storage = mallory.storage(BUCKET);
  const reader = storage.ref(`groups/${GROUP}/memories/pic1.png`);
  await assertFails(reader.getDownloadURL());
});

test("any group member can delete shared media", async () => {
  // bob uploaded an asset; alice can remove it as a member of the group.
  await seedGroup();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const storage = ctx.storage(BUCKET);
    await storage.ref(`groups/${GROUP}/memories/bybob.png`).put(PNG, {
      contentType: "image/png",
      customMetadata: { uploader: "bob" },
    });
  });
  const alice = env.authenticatedContext("alice");
  const storage = alice.storage(BUCKET);
  await assertSucceeds(storage.ref(`groups/${GROUP}/memories/bybob.png`).delete());
});
