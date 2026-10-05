import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

/**
 * The table only draws when something changes (frameloop "demand"). After an
 * idle stretch the first frame's delta is the whole idle time, which would
 * make every animation jump to its end, so animations use a capped step.
 */
export const frameStep = (delta: number) => Math.min(delta, 1 / 30);

/** Pulsing glows don't need the display's full refresh rate. */
const PULSE_FPS = 30;

/** Keeps the table drawing at a modest rate while `active`, for looping effects like pulses. */
export function usePulseFrames(active: boolean) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (!active) {
      return;
    }
    const timer = setInterval(() => invalidate(), 1000 / PULSE_FPS);
    return () => clearInterval(timer);
  }, [active, invalidate]);
}
