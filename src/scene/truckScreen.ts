export type TruckScreenPosition = {
  /** Viewport pixels. */
  x: number;
  y: number;
  /** False when the truck is behind the camera or well outside the frame. */
  visible: boolean;
};

type Listener = (position: TruckScreenPosition) => void;

const listeners = new Set<Listener>();
let current: TruckScreenPosition = { x: 0, y: 0, visible: false };

/**
 * Where the truck's roof lands on screen, republished every frame.
 *
 * A module singleton rather than React context on purpose: the publisher lives
 * inside the lazily-loaded scene chunk and the consumer is an ordinary DOM
 * component in the main bundle, so there is no common provider to hang it off
 * without threading a context across the lazy boundary.
 *
 * `visible` stays false until the scene actually renders, so with WebGL absent
 * or the context lost the card simply never appears.
 */
export const truckScreen = {
  publish(next: TruckScreenPosition) {
    current = next;
    for (const listener of listeners) listener(next);
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    listener(current);
    return () => {
      listeners.delete(listener);
    };
  },
  reset() {
    truckScreen.publish({ x: 0, y: 0, visible: false });
  },
};
