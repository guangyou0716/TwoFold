import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

/**
 * Online/offline state from NetInfo. Screens/gates use this for the offline
 * banner and to decide whether optimistic writes are safe.
 */
export function useConnectivity(): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      // `isInternetReachable` can be null during transitions — treat as online
      // rather than flashing the banner.
      setIsOnline(
        state.isConnected !== false && state.isInternetReachable !== false
      );
    });
    return unsub;
  }, []);

  return { isOnline };
}

export default useConnectivity;