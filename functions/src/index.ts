/**
 * TwoFold trusted backend entry points.
 *
 * Security model:
 *  - Callable functions validate Firebase Auth + App Check.
 *  - No app bundle contains secrets; the Gemini key lives in functions secrets.
 *  - Recurring instances use deterministic occurrence ids -> idempotent writes.
 *  - Export/delete run as privileged backend jobs, not client batches.
 */
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getStorage } from "firebase-admin/storage";

import { runGeminiOcr, parseOcrResult, needsConfirmation, OcrResult } from "./ocr";
import { generateInviteCode, hashInviteCode, normalizeCode, isValidCodeFormat } from "./inviteCode";
import { dueOccurrences, occurrenceId, RecurrenceRule } from "./recurrence";
import {
  isPairedProfile,
  mergeBudgetAllowances,
  mergePointBalances,
  mergeStreaks,
  soloGroupIdOf,
} from "./profileState";

admin.initializeApp();
const db = admin.firestore();

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const INVITE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Auth is the gate. App Check stays off until the Expo client can mint a token;
 * enforcing it with no client provider rejects every callable in production.
 */
const CALLABLE = { enforceAppCheck: false } as const;

/** Shared-data collections that carry a `groupId` field. */
const GROUP_COLLECTIONS = [
  "tasks",
  "transactions",
  "milestones",
  "memories",
  "savings_goals",
  "recurrences",
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireAuth(ctx: { auth?: { uid: string } | null }): string {
  const uid = ctx.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required");
  return uid;
}

async function getProfile(uid: string): Promise<Record<string, unknown>> {
  const snap = await db.doc(`users/${uid}`).get();
  if (!snap.exists) throw new HttpsError("not-found", "Profile missing");
  return snap.data() as Record<string, unknown>;
}

async function deleteStoragePrefix(prefix: string): Promise<void> {
  const [files] = await getStorage().bucket().getFiles({ prefix });
  await Promise.all(files.map((file) => file.delete().catch(() => undefined)));
}

async function docsInGroup(groupId: string): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  const snaps: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  for (const col of GROUP_COLLECTIONS) {
    const q = await db.collection(col).where("groupId", "==", groupId).get();
    snaps.push(...q.docs);
  }
  return snaps;
}

/** Move every group-scoped doc onto another group, keeping ids (memories stay linked). */
async function reassignGroup(fromGroupId: string, toGroupId: string): Promise<void> {
  for (const col of GROUP_COLLECTIONS) {
    const q = await db.collection(col).where("groupId", "==", fromGroupId).get();
    let batch = db.batch();
    let count = 0;
    for (const snap of q.docs) {
      batch.update(snap.ref, { groupId: toGroupId });
      count++;
      if (count >= 400) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }
    if (count > 0) await batch.commit();
  }
}

/**
 * Copy one group's docs into another group as a private snapshot.
 * Milestone ids are remapped so memories and the featured pin still resolve.
 * Returns old milestone id -> new milestone id.
 */
async function copyGroupSnapshot(fromGroupId: string, toGroupId: string): Promise<Map<string, string>> {
  const milestoneMap = new Map<string, string>();
  let batch = db.batch();
  let count = 0;
  const flush = async () => {
    if (count === 0) return;
    await batch.commit();
    batch = db.batch();
    count = 0;
  };
  const queue = (ref: FirebaseFirestore.DocumentReference, data: Record<string, unknown>) => {
    batch.set(ref, data);
    count++;
  };

  const milestones = await db.collection("milestones").where("groupId", "==", fromGroupId).get();
  for (const snap of milestones.docs) {
    const ref = db.collection("milestones").doc();
    milestoneMap.set(snap.id, ref.id);
    queue(ref, { ...snap.data(), groupId: toGroupId });
    if (count >= 400) await flush();
  }
  await flush();

  const memories = await db.collection("memories").where("groupId", "==", fromGroupId).get();
  for (const snap of memories.docs) {
    const data = { ...snap.data(), groupId: toGroupId } as Record<string, unknown>;
    const milestoneId = data.milestoneId;
    if (typeof milestoneId === "string" && milestoneMap.has(milestoneId)) {
      data.milestoneId = milestoneMap.get(milestoneId);
    }
    queue(db.collection("memories").doc(), data);
    if (count >= 400) await flush();
  }
  await flush();

  for (const col of ["tasks", "transactions", "savings_goals", "recurrences"] as const) {
    const q = await db.collection(col).where("groupId", "==", fromGroupId).get();
    for (const snap of q.docs) {
      const data = { ...snap.data(), groupId: toGroupId } as Record<string, unknown>;
      if (col === "tasks") data.notificationId = null;
      queue(db.collection(col).doc(), data);
      if (count >= 400) await flush();
    }
    await flush();
  }

  return milestoneMap;
}

// ---------------------------------------------------------------------------
// 2.1 Receipt OCR
// ---------------------------------------------------------------------------
/** Image path in Cloud Storage: users/{uid}/pending/{file}. */
export const scanReceipt = onCall(
  { ...CALLABLE, secrets: ["GEMINI_API_KEY"] },
  async (request) => {
  const uid = requireAuth(request);
  const path = typeof request.data?.path === "string" ? request.data.path : null;

  if (!path || !path.startsWith(`users/${uid}/pending/`)) {
    throw new HttpsError("invalid-argument", "Invalid or unauthorized image path");
  }

  const bucket = getStorage().bucket();
  const file = bucket.file(path);
  const [meta, buffer] = await Promise.all([file.getMetadata(), file.download()]);

  const size = Number(meta[0].size);
  if (!Number.isFinite(size) || size > MAX_IMAGE_BYTES) {
    throw new HttpsError("invalid-argument", "Image too large");
  }

  const mime = meta[0].contentType ?? "image/jpeg";
  if (!mime.startsWith("image/")) {
    throw new HttpsError("invalid-argument", "Only image receipts are supported");
  }
  let parsed: OcrResult;
  try {
    const raw = await runGeminiOcr(buffer[0].toString("base64"), mime);
    parsed = parseOcrResult(raw);
  } catch (err) {
    console.warn("[scanReceipt]", err instanceof Error ? err.message : err);
    throw new HttpsError("internal", "OCR failed");
  }

  // Best-effort cleanup of the temp object (non-fatal).
  await file.delete().catch(() => {});

    return { result: parsed, needsConfirmation: needsConfirmation(parsed) };
  }
);

// ---------------------------------------------------------------------------
// 2.3 Invite codes (short, expiring, single-use; never exposes the UID)
// ---------------------------------------------------------------------------
export const createInvite = onCall(CALLABLE, async (request) => {
  const uid = requireAuth(request);
  const mine = await getProfile(uid);
  if (isPairedProfile(mine)) {
    throw new HttpsError("failed-precondition", "ALREADY_PAIRED");
  }
  const inviteId = admin.firestore().collection("invite_codes").doc().id;
  const code = generateInviteCode(6);
  const expiresAt = Date.now() + INVITE_TTL_MS;
  await db.doc(`invite_codes/${inviteId}`).set({
    codeHash: hashInviteCode(code),
    creatorId: uid,
    createdAt: Date.now(),
    expiresAt,
    claimedAt: null,
    claimedByUid: null,
  });
  return { code, expiresAt };
});

export const claimInvite = onCall(CALLABLE, async (request) => {
  const uid = requireAuth(request);
  const input = normalizeCode(String(request.data?.code ?? ""));
  if (!isValidCodeFormat(input)) throw new HttpsError("invalid-argument", "INVALID_INVITE");

  const mine = await getProfile(uid);
  if (isPairedProfile(mine)) {
    throw new HttpsError("failed-precondition", "Already paired");
  }

  const codeSnap = await db
    .collection("invite_codes")
    .where("codeHash", "==", hashInviteCode(input))
    .limit(1)
    .get();
  if (codeSnap.empty) throw new HttpsError("invalid-argument", "INVALID_INVITE");

  const docRef = codeSnap.docs[0].ref;
  const docData = codeSnap.docs[0].data();

  const creatorId = docData.creatorId as string;
  if (creatorId === uid) throw new HttpsError("failed-precondition", "CANNOT_CLAIM_OWN");

  const creator = await getProfile(creatorId);
  // A solo group is not a pairing. Home-screen "pair later" depends on this.
  if (isPairedProfile(creator)) {
    throw new HttpsError("failed-precondition", "CREATOR_ALREADY_PAIRED");
  }

  const creatorSolo = soloGroupIdOf(creator, creatorId);
  const claimerSolo = soloGroupIdOf(mine, uid);
  const soloIds = [creatorSolo, claimerSolo].filter((id): id is string => !!id);
  const soloSnaps = await Promise.all(soloIds.map((id) => db.doc(`groups/${id}`).get()));
  const soloPayloads = soloSnaps.map((snap) => (snap.data() ?? {}) as Record<string, unknown>);
  const moves = (
    await Promise.all(soloIds.map((id) => docsInGroup(id)))
  ).flat();
  if (moves.length > 450) {
    throw new HttpsError("failed-precondition", "TOO_MUCH_DATA");
  }

  const allowance = mergeBudgetAllowances(soloPayloads[0]?.budgetBalance, soloPayloads[1]?.budgetBalance);
  const balances = mergePointBalances(soloPayloads[0]?.balances, soloPayloads[1]?.balances);
  const streaks = mergeStreaks(soloPayloads[0]?.streaks, soloPayloads[1]?.streaks);
  const featuredRaw = soloPayloads[0]?.featuredMilestoneId ?? soloPayloads[1]?.featuredMilestoneId;
  const featuredMilestoneId = typeof featuredRaw === "string" ? featuredRaw : null;

  // Atomic transaction prevents concurrent double-claim and keeps solo history.
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) throw new HttpsError("invalid-argument", "INVALID_INVITE");
    const cur = snap.data() as { claimedAt: number | null; expiresAt: number };
    if (cur.claimedAt) throw new HttpsError("failed-precondition", "INVITE_USED");
    if (cur.expiresAt < Date.now()) throw new HttpsError("failed-precondition", "INVITE_EXPIRED");

    const groupId = `group_${creatorId}_${uid}`;
    tx.update(docRef, { claimedAt: Date.now(), claimedByUid: uid });
    tx.set(db.doc(`groups/${groupId}`), {
      groupId,
      partnerAId: creatorId,
      partnerBId: uid,
      balances,
      streaks,
      ...(allowance !== undefined ? { budgetBalance: allowance } : {}),
      ...(featuredMilestoneId ? { featuredMilestoneId } : {}),
      createdAt: new Date().toISOString(),
    });
    tx.update(db.doc(`users/${creatorId}`), { partnerId: uid, groupId, isSolo: false });
    tx.update(db.doc(`users/${uid}`), { partnerId: creatorId, groupId, isSolo: false });
    for (const docSnap of moves) {
      tx.update(docSnap.ref, { groupId });
    }
    for (const soloId of soloIds) {
      tx.delete(db.doc(`groups/${soloId}`));
    }
  });
});

// ---------------------------------------------------------------------------
// 2.2 Recurring transactions — deterministic, idempotent
// ---------------------------------------------------------------------------
export const processRecurrences = onSchedule(
  { schedule: "0 2 * * *", timeZone: "Etc/UTC" },
  async () => {
    const today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10); // approx UTC+7
    const rules = await db.collection("recurrences").where("paused", "==", false).get();

    let writes = 0;
    let batch = db.batch();

    const commitIfNeeded = async (force = false) => {
      if (writes === 0 || (!force && writes < 450)) return;
      await batch.commit();
      batch = db.batch();
      writes = 0;
    };

    for (const ds of rules.docs) {
      const rule = { id: ds.id, ...ds.data() } as RecurrenceRule;
      const template = (ds.data().template ?? {}) as Record<string, unknown>;
      const occurrences = dueOccurrences(rule, today);

      for (const occ of occurrences) {
        // set-with-merge on a deterministic id is idempotent across retries/partners.
        batch.set(
          db.doc(`transactions/${occurrenceId(rule.id, occ.date)}`),
          {
            ...template,
            groupId: rule.groupId,
            source: "recurrence",
            occurrenceId: occ.id,
            recurrenceId: rule.id,
            date: occ.date,
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        );
        writes++;
        await commitIfNeeded();
      }

      batch.update(ds.ref, { lastFiredAt: Date.now() });
      writes++;
      await commitIfNeeded();
    }

    await commitIfNeeded(true);
  }
);

// ---------------------------------------------------------------------------
// Unlink — each partner keeps a private snapshot, then the shared group goes.
// Client writes cannot change groupId, so this has to be a trusted callable.
// ---------------------------------------------------------------------------
export const unlinkPartner = onCall(CALLABLE, async (request) => {
  const uid = requireAuth(request);
  const mine = await getProfile(uid);
  if (!isPairedProfile(mine)) {
    throw new HttpsError("failed-precondition", "NOT_PAIRED");
  }
  const groupId = String(mine.groupId ?? "");
  const groupSnap = await db.doc(`groups/${groupId}`).get();
  if (!groupSnap.exists) throw new HttpsError("not-found", "Group missing");
  const group = groupSnap.data() as {
    partnerAId?: string;
    partnerBId?: string;
    balances?: Record<string, number>;
    streaks?: { choreStreak?: number; lastChoreDate?: string | null };
    budgetBalance?: number;
    featuredMilestoneId?: string | null;
  };
  const partnerId = group.partnerAId === uid ? group.partnerBId : group.partnerAId;
  if (!partnerId || partnerId === uid) {
    throw new HttpsError("failed-precondition", "NOT_PAIRED");
  }

  const owners = [uid, partnerId];
  const milestoneMaps = new Map<string, Map<string, string>>();
  for (const ownerId of owners) {
    const soloGroupId = `solo_${ownerId}`;
    // Drop a snapshot left by a previous attempt so retry does not duplicate it.
    for (const col of GROUP_COLLECTIONS) {
      await deleteWhere(col, "groupId", soloGroupId);
    }
    milestoneMaps.set(ownerId, await copyGroupSnapshot(groupId, soloGroupId));
  }

  const batch = db.batch();
  for (const ownerId of owners) {
    const soloGroupId = `solo_${ownerId}`;
    const featured = group.featuredMilestoneId
      ? milestoneMaps.get(ownerId)?.get(group.featuredMilestoneId)
      : undefined;
    const points = group.balances ?? {};
    batch.set(db.doc(`groups/${soloGroupId}`), {
      groupId: soloGroupId,
      partnerAId: ownerId,
      partnerBId: "",
      balances: { [ownerId]: typeof points[ownerId] === "number" ? points[ownerId] : 0 },
      streaks: {
        choreStreak: group.streaks?.choreStreak ?? 0,
        lastChoreDate: group.streaks?.lastChoreDate ?? null,
      },
      ...(typeof group.budgetBalance === "number" ? { budgetBalance: group.budgetBalance } : {}),
      ...(featured ? { featuredMilestoneId: featured } : {}),
      createdAt: new Date().toISOString(),
    });
    batch.update(db.doc(`users/${ownerId}`), {
      partnerId: "",
      groupId: soloGroupId,
      isSolo: true,
    });
  }
  await batch.commit();

  for (const col of GROUP_COLLECTIONS) {
    await deleteWhere(col, "groupId", groupId);
  }
  await db.doc(`groups/${groupId}`).delete().catch(() => undefined);
  return { ok: true };
});

// ---------------------------------------------------------------------------
// 2.4 Export / delete account — privileged job orchestration
// ---------------------------------------------------------------------------
export const startAccountJob = onCall(CALLABLE, async (request) => {
  const uid = requireAuth(request);
  const type = request.data?.type;
  if (type !== "export" && type !== "delete") {
    throw new HttpsError("invalid-argument", "type must be export|delete");
  }
  if (type === "delete") {
    const authTime = Number(request.auth?.token?.auth_time);
    if (!Number.isFinite(authTime) || Date.now() / 1000 - authTime > 5 * 60) {
      throw new HttpsError("failed-precondition", "RECENT_LOGIN_REQUIRED");
    }
  }
  const jobId = admin.firestore().collection("jobs").doc().id;
  await db.doc(`jobs/${jobId}`).set({
    ownerId: uid,
    type,
    status: "queued",
    progress: 0,
    createdAt: Date.now(),
    error: null,
  });
  // The Firestore trigger below owns execution so this callable stays short
  // and clients can recover through getJobStatus.
  return { jobId };
});

export const processAccountJob = onDocumentCreated("jobs/{jobId}", async (event) => {
  if (event.data) await runAccountJob(event.params.jobId);
});

export const getJobStatus = onCall(CALLABLE, async (request) => {
  const uid = requireAuth(request);
  const jobId = String(request.data?.jobId ?? "");
  const snap = await db.doc(`jobs/${jobId}`).get();
  const data = snap.data() as { ownerId?: string } | undefined;
  if (!data || data.ownerId !== uid) throw new HttpsError("not-found", "Job not found");
  return { ...snap.data(), jobId };
});

/** Deletes/aggregates all data owned by the requesting user + their group. */
export async function runAccountJob(jobId: string): Promise<void> {
  const snap = await db.doc(`jobs/${jobId}`).get();
  if (!snap.exists) return;
  const job = snap.data() as { ownerId: string; type: string; status: string };
  if (job.status === "complete") return;

  const profile = (await getProfile(job.ownerId).catch(() => null)) as Record<string, unknown> | null;
  const groupId = (profile?.groupId as string) ?? null;
  const totalSteps = GROUP_COLLECTIONS.length + 3;

  try {
    let step = 0;
    const report = (p: number) =>
      db.doc(`jobs/${jobId}`).update({ progress: Math.min(100, Math.round(p * 100)) }).catch(() => {});

    if (job.type === "delete") {
      // User-scoped nudges (sent + received).
      await deleteWhere("nudges", "senderId", job.ownerId);
      await deleteWhere("nudges", "recipientId", job.ownerId);
      report(++step / totalSteps);

      // Group-scoped shared data.
      if (groupId) {
        const groupSnap = await db.doc(`groups/${groupId}`).get();
        const group = groupSnap.data() as {
          partnerAId?: string;
          partnerBId?: string;
          balances?: Record<string, number>;
          streaks?: { choreStreak?: number; lastChoreDate?: string | null };
          budgetBalance?: number;
          featuredMilestoneId?: string | null;
        } | undefined;
        const partnerId = group?.partnerAId === job.ownerId
          ? group.partnerBId
          : group?.partnerAId;
        const handoff = !!partnerId && partnerId !== job.ownerId && !groupId.startsWith("solo_");

        if (handoff && partnerId) {
          // The remaining partner keeps the shared history in their solo group.
          const soloGroupId = `solo_${partnerId}`;
          await reassignGroup(groupId, soloGroupId);
          const points = group?.balances ?? {};
          await db.doc(`groups/${soloGroupId}`).set({
            groupId: soloGroupId,
            partnerAId: partnerId,
            partnerBId: "",
            balances: { [partnerId]: typeof points[partnerId] === "number" ? points[partnerId] : 0 },
            streaks: {
              choreStreak: group?.streaks?.choreStreak ?? 0,
              lastChoreDate: group?.streaks?.lastChoreDate ?? null,
            },
            ...(typeof group?.budgetBalance === "number" ? { budgetBalance: group.budgetBalance } : {}),
            ...(group?.featuredMilestoneId ? { featuredMilestoneId: group.featuredMilestoneId } : {}),
            createdAt: new Date().toISOString(),
          });
          await db.doc(`users/${partnerId}`).update({
            partnerId: "",
            groupId: soloGroupId,
            isSolo: true,
          }).catch((error) => {
            console.warn("[runAccountJob] Partner profile reset skipped:", error);
          });
          await db.doc(`groups/${groupId}`).delete().catch(() => undefined);
          report(++step / totalSteps);
        } else {
          await deleteStoragePrefix(`groups/${groupId}/memories/`);
          for (const col of GROUP_COLLECTIONS) {
            await deleteWhere(col, "groupId", groupId);
            report(++step / totalSteps);
          }
          await db.doc(`groups/${groupId}`).delete().catch(() => undefined);
          report(++step / totalSteps);
        }
      }

      // Invites we created.
      const invites = await db.collection("invite_codes").where("creatorId", "==", job.ownerId).get();
      for (const i of invites.docs) await i.ref.delete();

      await deleteStoragePrefix(`users/${job.ownerId}/pending/`);

      await db.doc(`users/${job.ownerId}`).delete();
      await admin.auth().deleteUser(job.ownerId).catch(() => {});
    } else {
      // Export: aggregate docs into job payload; media manifest is appended by
      // getJobStatus consumers. Full signed-download generation is a deployment
      // step documented in README.
      const manifest: Record<string, unknown> = {
        schemaVersion: 1,
        exportedAt: Date.now(),
        userProfile: { uid: job.ownerId, ...(profile ?? {}) },
      };
      for (const col of GROUP_COLLECTIONS) {
        if (groupId) {
          const q = await db.collection(col).where("groupId", "==", groupId).get();
          manifest[col] = q.docs.map((d) => ({ id: d.id, ...d.data() }));
        }
        report(++step / totalSteps);
      }
      if (groupId) {
        const group = await db.doc(`groups/${groupId}`).get();
        if (group.exists) manifest.group = { id: group.id, ...group.data() };
      }
      const [mediaFiles] = await getStorage().bucket().getFiles({
        prefix: groupId ? `groups/${groupId}/memories/` : `users/${job.ownerId}/`,
      });
      manifest.mediaManifest = mediaFiles.map((file) => ({
        path: file.name,
        size: file.metadata?.size ?? null,
        contentType: file.metadata?.contentType ?? null,
      }));
      const nudges = await db.collection("nudges").where("senderId", "==", job.ownerId).get();
      const receivedNudges = await db.collection("nudges").where("recipientId", "==", job.ownerId).get();
      manifest.nudges = [
        ...nudges.docs.map((d) => ({ id: d.id, ...d.data() })),
        ...receivedNudges.docs.map((d) => ({ id: d.id, ...d.data() })),
      ];
      await db.doc(`jobs/${jobId}`).update({ manifest });
    }

    await db.doc(`jobs/${jobId}`).update({ status: "complete", progress: 100 });
  } catch (err) {
    await db
      .doc(`jobs/${jobId}`)
      .update({ status: "error", error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

async function deleteWhere(
  collection: string,
  field: string,
  value: string
): Promise<void> {
  const q = await db.collection(collection).where(field, "==", value).get();
  for (const d of q.docs) await d.ref.delete();
}

export { normalizeCode };
export type { RecurrenceRule, OcrResult };
