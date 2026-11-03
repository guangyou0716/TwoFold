import { useGroupCollection } from "./useGroupCollection";
import type { SavingsGoal } from "../types";

const byCreatedDesc = (a: SavingsGoal, b: SavingsGoal) =>
  b.createdAt.localeCompare(a.createdAt);

/** Group savings goals, newest first. */
export function useSavingsGoals(groupId: string | null | undefined) {
  const { data, loading, error, retry } = useGroupCollection<SavingsGoal>(
    "savings_goals",
    groupId,
    byCreatedDesc
  );
  return { goals: data, loading, error, retry };
}

export default useSavingsGoals;