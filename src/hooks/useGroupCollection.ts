import { useCallback, useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../firebaseConfig";

export interface CollectionState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  /** Manual re-subscribe (used by error/retry surfaces). */
  retry: () => void;
}

/**
 * Shared groupId-scoped collection subscription.
 *
 * Every feature hook (tasks, milestones, savings, transactions) is a thin
 * wrapper over this: it always unsubscribes, surfaces listener errors instead of
 * logging them, and self-heals permission-denied races with a single delayed
 * retry (the previous inline behaviour in the dashboard screen).
 */
export function useGroupCollection<T extends { id: string }>(
  collectionName: string,
  groupId: string | null | undefined,
  sort?: (a: T, b: T) => number
): CollectionState<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(!!groupId);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const retry = useCallback(() => setRetryToken((n) => n + 1), []);

  useEffect(() => {
    if (!groupId) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const q = query(collection(db, collectionName), where("groupId", "==", groupId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!active) return;
        const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
        if (sort) loaded.sort(sort);
        setData(loaded);
        setLoading(false);
      },
      (err) => {
        if (!active) return;
        setError(err.message);
        setLoading(false);
        retryTimer = setTimeout(() => setRetryToken((n) => n + 1), 1500);
      }
    );

    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
      unsub();
    };
  }, [collectionName, groupId, retryToken, sort]);

  return { data, loading, error, retry };
}

export default useGroupCollection;