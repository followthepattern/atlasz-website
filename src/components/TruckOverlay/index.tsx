import { useEffect, useState } from "react";
import { useScrollStore } from "@/motion/ScrollProvider";
import { RouteTelemetry } from "./RouteTelemetry";
import { MonthlyPerformance } from "./MonthlyPerformance";
import { FLOATING_SHELL, useTruckAnchor } from "./useTruckAnchor";

/** Where the arrangement changes. Sits inside the band where the readouts are
    faded out entirely, so the switch is never seen happening. */
const SPLIT_BELOW = 0.5;

/**
 * Instrumentation that rides with the truck.
 *
 * Two arrangements, because the two moments frame the vehicle differently. The
 * hero is near side-on and the truck spans the middle of the frame, so the
 * readouts sit either side of it. By the arrival the camera has pulled back and
 * swung round; the truck is small and left of centre, so they stack together on
 * the right.
 *
 * One anchor either way — both readouts position from a single zero-size point,
 * which is what stops them drifting apart the way they did when each pinned
 * itself.
 */
export function TruckOverlay() {
  const groupRef = useTruckAnchor<HTMLDivElement>();
  const scroll = useScrollStore();
  const [split, setSplit] = useState(() => scroll.get() < SPLIT_BELOW);

  useEffect(() => {
    // Only re-render on an actual change of arrangement. Setting state from
    // every scroll frame would put a React render in the animation loop.
    let current = scroll.get() < SPLIT_BELOW;
    setSplit(current);

    return scroll.subscribe((progress) => {
      const next = progress < SPLIT_BELOW;
      if (next === current) return;
      current = next;
      setSplit(next);
    });
  }, [scroll]);

  return (
    <div ref={groupRef} aria-hidden="true" className={FLOATING_SHELL}>
      <div className="relative h-0 w-0">
        {split ? (
          <>
            {/* Equal gaps either side of the vehicle's centre. They must clear
                a full-length semi seen square on, and stay in step with
                LEFT_REACH / RIGHT_REACH, which clamp the anchor. */}
            <div className="absolute right-[520px] top-0 w-[250px] -translate-y-1/2">
              <RouteTelemetry />
            </div>
            <div className="absolute left-[520px] top-0 w-[250px] -translate-y-1/2">
              <MonthlyPerformance />
            </div>
          </>
        ) : (
          <div className="absolute left-[210px] top-0 flex w-[300px] -translate-y-1/2 flex-col gap-5">
            <RouteTelemetry />
            <MonthlyPerformance />
          </div>
        )}
      </div>
    </div>
  );
}
