import { RouteTelemetry } from "./RouteTelemetry";
import { MonthlyPerformance } from "./MonthlyPerformance";
import { FLOATING_GROUP, FLOATING_SHELL, useTruckAnchor } from "./useTruckAnchor";

/**
 * Instrumentation that rides with the truck: what the vehicle is doing right
 * now, and how the months are running.
 *
 * Anchored once, as a group. Each readout used to pin itself, which let them
 * drift apart the moment one was positioned differently from the other — the
 * chart held to the viewport edge while the card tracked the vehicle. Both
 * belong to the same cluster and travel together.
 *
 * The cluster sits behind the page content: it is ambient, and must not compete
 * with the copy it drifts across.
 */
export function TruckOverlay() {
  const groupRef = useTruckAnchor<HTMLDivElement>();

  return (
    <div ref={groupRef} aria-hidden="true" className={FLOATING_SHELL}>
      <div className={FLOATING_GROUP}>
        <RouteTelemetry />
        <MonthlyPerformance />
      </div>
    </div>
  );
}
