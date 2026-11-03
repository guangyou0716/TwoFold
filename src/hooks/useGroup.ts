import { useCallback, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import type { GroupProfile } from "../types";

export interface GroupState {
  group: GroupProfile | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/** Subscribe to a group document (balances, streaks, featured milestone). */
export function useGroup(groupId: string | null | undefined): GroupState {
  const [group, setGroup] = useState<GroupProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(!!groupId);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const retry = useCallback(() => setRetryToken((n) => n + 1), []);

  useEffect(() => {
    if (!groupId) {
      setGroup(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const unsub = onSnapshot(
      doc(db, "groups", groupId),
      (snap) => {
        if (!active) return;
        setGroup(snap.exists() ? (snap.data() as GroupProfile) : null);
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
  }, [groupId, retryToken]);

  return { group, loading, error, retry };
}

export default useGroup;