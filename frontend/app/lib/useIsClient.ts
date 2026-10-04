import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** True only after hydration, so portals and browser-only APIs never mismatch SSR. */
export function useIsClient() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
