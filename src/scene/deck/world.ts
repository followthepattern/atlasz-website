import * as THREE from "three";
import { applyPalette, disposeObject } from "../materials";
import { proceduralTruck } from "../assets/truck";
import { proceduralWarehouse } from "../assets/warehouse";
import { proceduralTrees } from "../assets/trees";
import type { SceneAsset } from "../assets/types";
import { buildGrid, placeOnRoute, treePlacements, type Follow } from "../road";
import { createCameraRig, type Framing } from "../cameraRig";
import type { SceneContext, SceneInstance, SceneFactory } from "../types";

/* The Early Partner deck's world: the last leg of a trip, arriving at a depot.
 *
 * Its own scene, not the landing page's re-aimed. It happens to be built from
 * the same kit today — the same road, the same asset library — but nothing
 * couples the two, so this is where stations, depots and whatever else the deck
 * grows will go, and the marketing page will not notice. */

/* The deck page is roughly half the landing page's height, and scroll progress
   is normalised against document height — so running the full route here would
   drive the truck at twice the speed per scrolled pixel and read as hurried. It
   starts most of the way along instead, and still arrives at the bays. */
const TRUCK_FROM = 0.45;
const TRUCK_TO = 0.612;

const PARKING_BAY = 5.4; // metres between bay centres, across the apron

const WAREHOUSE_AT = 0.62;
const WAREHOUSE_OFFSET = 26; // metres from the route centreline

/* How far the truck sits right of centre, as a fraction of the viewing
   distance. The copy occupies a left band the full height of every section, so
   a centred vehicle sits straight underneath it.

   At the title framing that works out as follows: the camera is ~31 m off,
   which on a 16:9 window at this 28° vertical field of view is about 30 m of
   visible width, and the rig is ~18 m long. 0.28 slides the aim ~8.7 m down the
   trailer, which leaves the vehicle across the right-hand half with the cab
   comfortably inside the frame. Much past 0.3 and the cab runs off the edge. */
const BIAS = 0.28;

const from = (base: THREE.Vector3, x: number, y: number, z: number) =>
  base.clone().add(new THREE.Vector3(x, y, z));

/**
 * Pans the aim sideways so the vehicle sits off-centre in frame.
 *
 * `fraction` is of the viewing distance, not a distance itself. A fixed number
 * of metres is a different angle from every framing — the same 13 m that reads
 * as a third of the frame from 34 m away swings past the horizon from 16 m — so
 * the four shots would each sit the truck somewhere different.
 *
 * Computed in the truck's local frame, which is the world frame rotated about
 * y — a rotation preserves angles, so the screen-right worked out here survives
 * the transform the rig applies later.
 */
function biasAim(offset: THREE.Vector3, look: THREE.Vector3, fraction: number) {
  const view = look.clone().sub(offset);
  // Screen-right for a y-up camera is normalize(cross(forward, up)), which for
  // up = (0,1,0) reduces to (-z, 0, x). Flattened, so a high framing does not
  // shorten the pan.
  const right = new THREE.Vector3(-view.z, 0, view.x).normalize();
  return look.clone().addScaledVector(right, -view.length() * fraction);
}

/**
 * Four framings rather than the marketing page's six, with a gentler sweep. The
 * page is presented live on a landscape screen and the copy is the subject, so
 * the camera has no reason to work as hard as it does over five viewports.
 *
 * Bearings run +84° → +29° → -15° → -48°, so the single crossing holds.
 */
function buildFramings(anchors: Record<string, THREE.Vector3>): Framing[] {
  const trailer = anchors.trailer ?? new THREE.Vector3(-7.4, 2.5, 0);

  const framing = (
    at: number,
    offset: THREE.Vector3,
    look: THREE.Vector3,
    bias = BIAS,
  ): Framing => ({ at, offset, lookOffset: biasAim(offset, look, bias) });

  return [
    /* Title — a wide profile of the whole rig, from above the treeline.

       Height is doing real work here, not styling. The verge starts 18 m off
       the centreline and scatters out to 34 m, so a camera standing far enough
       back to frame all 17 m of the vehicle stands among the conifers — and at
       this point on the route one sits directly in the lens. The tallest tree
       reaches about 9 units, so anything above ~11 looks over the whole verge.
       Dropping in closer instead only trades the tree for a wall of trailer. */
    framing(
      0,
      from(trailer, 3, 9, 30), // +84°
      from(trailer, 3, 1, 0),
    ),
    // Standing back for the two copy-heavy sections. Still facility side.
    framing(
      0.36,
      from(trailer, 46, 20, 26), // +29°
      trailer.clone(),
    ),
    // "Élő bemutató" — the crossing, past the nose onto the far side. That
    // section is a near-empty frame, so this is where the scene does the work.
    framing(
      0.7,
      from(trailer, 52, 18, -14), // -15°
      trailer.clone(),
    ),
    // Arrived: the truck pulls in between the parked pair, facility behind.
    // Less bias — the yard is the subject here, not a backdrop to step around.
    framing(
      1,
      from(trailer, 37, 19, -33), // -48°
      from(trailer, 4, 0, 10),
      0.06,
    ),
  ];
}

export const createDeckScene: SceneFactory = ({
  palette,
  quality,
  aspect,
  reduced,
}: SceneContext): SceneInstance => {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(palette.fog.getHex(), palette.fogDensity);

  const camera = new THREE.PerspectiveCamera(28, aspect, 0.5, 600);

  const grid = buildGrid(palette);
  scene.add(grid.object3D);

  const truck = proceduralTruck(palette);
  scene.add(truck.object3D);

  const parked = [-PARKING_BAY, PARKING_BAY].map((side) => {
    const unit = proceduralTruck(palette);
    placeOnRoute(unit.object3D, TRUCK_TO, side);
    scene.add(unit.object3D);
    return unit;
  });

  const trees = proceduralTrees(
    palette,
    // Only the stretch this scene actually travels, and the frontage left
    // clear where the facility meets the road.
    treePlacements({ from: 0.34, to: 0.78, clearings: [[WAREHOUSE_AT, 0.055]] }),
  );
  scene.add(trees.object3D);

  const warehouse = proceduralWarehouse(palette, quality.rackCount);
  placeOnRoute(warehouse.object3D, WAREHOUSE_AT, WAREHOUSE_OFFSET);
  warehouse.object3D.rotation.y += Math.PI / 2;
  scene.add(warehouse.object3D);

  const follow: Follow = { position: new THREE.Vector3(), heading: 0 };

  function driveTo(progress: number) {
    const p = Math.min(1, Math.max(0, progress));
    placeOnRoute(truck.object3D, TRUCK_FROM + (TRUCK_TO - TRUCK_FROM) * p, 0);
    follow.position.copy(truck.object3D.position);
    follow.heading = truck.object3D.rotation.y;
  }

  driveTo(0);

  const rig = createCameraRig(camera, follow, buildFramings(truck.anchorPoints), {
    reduced,
    label: "deck",
  });
  rig.setProgress(0);
  rig.snap();

  const assets: SceneAsset[] = [truck, ...parked, warehouse, trees];
  let progress = 0;

  return {
    scene,
    camera,
    setProgress(next) {
      progress = next;
      rig.setProgress(next);
    },
    update(elapsed, delta) {
      driveTo(progress);
      truck.update?.(elapsed, delta, progress);
      rig.update(elapsed, delta);
    },
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    setPalette(next) {
      applyPalette([grid.material], next);
      for (const asset of assets) asset.setPalette(next);
      const fog = scene.fog as THREE.FogExp2;
      fog.color.copy(next.fog);
      fog.density = next.fogDensity;
    },
    dispose() {
      for (const asset of assets) asset.dispose();
      disposeObject(scene);
      scene.clear();
    },
  };
};
