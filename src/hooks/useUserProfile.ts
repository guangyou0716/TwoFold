import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { doc, onSnapshot, Unsubscribe } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import type { UserProfile } from "../types";

export interface UserProfileState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  /** True once a read settled (success or permission/missing error). */
  resolved: boolean;
}

/**
 * Single source of truth for the current user's profile. Replaces the ad-hoc
 * `onSnapshot(doc(db, "users", uid))` listeners spread across navigator + screens.
 * Always unsubscribes; surfaces permission/missing errors instead of silent logs.
 */
export function useUserProfile(user: User | null): UserProfileState {
  const [state, setState] = useState<UserProfileState>({
    profile: null,
    loading: true,
    error: null,
    resolved: false,
  });

  useEffect(() => {
    if (!user) {
      setState({ profile: null, loading: false, error: null, resolved: true });
      return;
    }

    setState({ profile: null, loading: true, error: null, resolved: false });

    let unsub: Unsubscribe;
    let active = true;

    try {
      unsub = onSnapshot(
        doc(db, "users", user.uid),
        (snap) => {
          if (!active) return;
          if (snap.exists()) {
            setState({
              profile: snap.data() as UserProfile,
              loading: false,
              error: null,
              resolved: true,
            });
          } else {
            setState({ profile: null, loading: false, error: "PROFILE_MISSING", resolved: true });
          }
        },
        (err) => {
          if (!active) return;
          setState({ profile: null, loading: false, error: err.message, resolved: true });
        }
      );
    } catch (err) {
      if (active) {
        setState({ profile: null, loading: false, error: String(err), resolved: true });
      }
      return;
    }

    return () => {
      active = false;
      unsub?.();
    };
  }, [user]);

  return state;
}

export default useUserProfile;
