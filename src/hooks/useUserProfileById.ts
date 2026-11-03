import { useCallback, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import type { UserProfile } from "../types";

export interface UserDocState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * Subscribe to any user document by uid (used for the current user and for the
 * partner profile display). Always unsubscribes; surfaces errors.
 */
export function useUserProfileById(uid: string | null | undefined): UserDocState {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(!!uid);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const retry = useCallback(() => setRetryToken((n) => n + 1), []);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const unsub = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        if (!active) return;
        setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
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
  }, [uid, retryToken]);

  return { profile, loading, error, retry };
}

export default useUserProfileById;