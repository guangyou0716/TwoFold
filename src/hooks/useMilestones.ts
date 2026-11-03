import { useGroupCollection } from "./useGroupCollection";
import type { Milestone } from "../types";

const byDateAsc = (a: Milestone, b: Milestone) => a.date.localeCompare(b.date);

/** Group milestones, chronological (past → future). */
export function useMilestones(groupId: string | null | undefined) {
  const { data, loading, error, retry } = useGroupCollection<Milestone>(
    "milestones",
    groupId,
    byDateAsc
  );
  return { milestones: data, loading, error, retry };
}

export default useMilestones;