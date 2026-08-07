import { RouteTelemetry } from "./RouteTelemetry";
import { TripEconomics } from "./TripEconomics";

/**
 * Instrumentation that rides with the truck: what the vehicle is doing, and
 * what the trip is earning.
 *
 * Both readouts sit behind the page content — they are ambient, and must not
 * compete for attention with the copy they drift across.
 */
export function TruckOverlay() {
  return (
    <>
      <RouteTelemetry />
      <TripEconomics />
    </>
  );
}
