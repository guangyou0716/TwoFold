/**
 * Pure profile/group decisions shared by invite, unlink, and account jobs.
 * No Firebase imports — unit-tested with Node's test runner.
 */

export function isPairedProfile(
  profile: { partnerId?: unknown; groupId?: unknown } | null | undefined
): boolean {
  if (!profile) return false;
  const partnerId = typeof profile.partnerId === "string" ? profile.partnerId.trim() : "";
  if (partnerId) return true;
  const groupId = typeof profile.groupId === "string" ? profile.groupId : "";
  return groupId.length > 0 && !groupId.startsWith("solo_");
}

/** The caller's own solo group, or null when they are unpaired or already sharing. */
export function soloGroupIdOf(
  profile: { groupId?: unknown } | null | undefined,
  uid: string
): string | null {
  const groupId = typeof profile?.groupId === "string" ? profile.groupId : "";
  return groupId === `solo_${uid}` ? groupId : null;
}

/** Combine two solo starting allowances. Missing values are skipped, not treated as zero. */
export function mergeBudgetAllowances(a: unknown, b: unknown): number | undefined {
  const values = [a, b].filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  if (values.length === 0) return undefined;
  return values.reduce((sum, n) => sum + n, 0);
}

export function mergePointBalances(a: unknown, b: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  for (const source of [a, b]) {
    if (!source || typeof source !== "object") continue;
    for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
      if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
    }
  }
  return out;
}

export function mergeStreaks(
  a: unknown,
  b: unknown
): { choreStreak: number; lastChoreDate: string | null } {
  const read = (value: unknown) => {
    const row = value && typeof value === "object"
      ? (value as { choreStreak?: unknown; lastChoreDate?: unknown })
      : {};
    return {
      choreStreak: typeof row.choreStreak === "number" && Number.isFinite(row.choreStreak) ? row.choreStreak : 0,
      lastChoreDate: typeof row.lastChoreDate === "string" ? row.lastChoreDate : null,
    };
  };
  const left = read(a);
  const right = read(b);
  const dates = [left.lastChoreDate, right.lastChoreDate].filter((d): d is string => !!d).sort();
  return {
    choreStreak: Math.max(left.choreStreak, right.choreStreak),
    lastChoreDate: dates.length > 0 ? dates[dates.length - 1] : null,
  };
}
