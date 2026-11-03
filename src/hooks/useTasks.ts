import { useGroupCollection } from "./useGroupCollection";
import type { Task } from "../types";

const byCreatedDesc = (a: Task, b: Task) => b.createdAt.localeCompare(a.createdAt);

/** Group tasks/reminders, newest first. */
export function useTasks(groupId: string | null | undefined) {
  const { data, loading, error, retry } = useGroupCollection<Task>("tasks", groupId, byCreatedDesc);
  return { tasks: data, loading, error, retry };
}

export default useTasks;