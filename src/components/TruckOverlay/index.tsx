import { RouteTelemetry } from "./RouteTelemetry";
import { MonthlyPerformance } from "./MonthlyPerformance";

/**
 * Instrumentation that rides with the truck: what the vehicle is doing right
 * now, and how the months are running.
 *
 * Both readouts sit behind the page content — they are ambient, and must not
 * compete for attention with the copy they drift across.
 */
export function TruckOverlay() {
  return (
    <>
      <RouteTelemetry />
      <MonthlyPerformance />
    </>
  );
}
