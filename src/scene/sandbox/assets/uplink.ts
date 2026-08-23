import * as THREE from "three";
import { panelFill, accentFill, edgeMaterial, edgesFor } from "../../materials";
import type { ScenePalette } from "../../palette";

/* Two satellites flanking the vehicle, and the traffic between them.
 *
 * Everything here is built in the truck's own local frame — +x along its
 * direction of travel, +z out to its side — and the world drops the whole group
 * onto the truck each frame. That is what makes the beams static geometry: both
 * ends are fixed relative to the vehicle, so the lines never need rebuilding
 * and only the packets running along them move.
 *
 * It also keeps the pair framed. The camera's framings are authored relative to
 * the truck as well, so satellites pinned to the truck sit where they were put
 * no matter how far along the route the vehicle has got.
 */

/** How high the pair rides, and how far out to each side. Metres. */
const ALTITUDE = 150;
const SIDE = 60;

/** Where the beams meet the vehicle — just above the trailer roof. */
const GROUND_ANCHOR = new THREE.Vector3(-6, 5.2, 0);

/** Packets in flight per beam. Staggered, so the traffic reads as a stream. */
const PACKETS = 3;

/** How long a packet takes to run a beam, in seconds. */
const TRANSIT = 2.6;

export type Uplink = {
  object3D: THREE.Object3D;
  /** 0 hides the pair, 1 is fully present. Driven by the climb. */
  setStrength(value: number): void;
  update(elapsed: number): void;
  setPalette(palette: ScenePalette): void;
  dispose(): void;
};

/**
 * One satellite: a body, two wings and a dish, in the scene's own register.
 *
 * Deliberately built from the same panel-and-outline vocabulary as the truck
 * and the warehouse. The cloud deck is this scene's experiment; the hardware is
 * not, and a satellite arriving in a different visual language would confound
 * the two.
 */
function satellite(
  fill: THREE.Material,
  accent: THREE.Material,
  edge: THREE.LineBasicMaterial,
) {
  const group = new THREE.Group();

  const body = new THREE.BoxGeometry(6, 4.4, 4.4);
  group.add(new THREE.Mesh(body, fill), edgesFor(body, edge));

  // Wings out along the vehicle's axis, so the pair reads as a matched span
  // from a camera looking down the road rather than across it.
  const wing = new THREE.BoxGeometry(15, 0.3, 5.2);
  for (const side of [-1, 1]) {
    const mesh = new THREE.Mesh(wing, accent);
    mesh.position.x = side * 10.5;
    const outline = edgesFor(wing, edge);
    outline.position.copy(mesh.position);
    group.add(mesh, outline);
  }

  // The dish, under the body, aimed down at the vehicle.
  const dish = new THREE.ConeGeometry(2.4, 2.2, 16, 1, true);
  const dishMesh = new THREE.Mesh(dish, fill);
  dishMesh.position.y = -3.2;
  const dishOutline = edgesFor(dish, edge);
  dishOutline.position.copy(dishMesh.position);
  group.add(dishMesh, dishOutline);

  return group;
}

export function proceduralUplink(palette: ScenePalette): Uplink {
  const group = new THREE.Group();

  const fill = panelFill(palette);
  const accent = accentFill(palette);
  const edge = edgeMaterial(palette);
  const beam = edgeMaterial(palette, true);
  const materials: THREE.Material[] = [fill, accent, edge, beam];

  const ends: THREE.Vector3[] = [];

  for (const side of [1, -1]) {
    const unit = satellite(fill, accent, edge);
    const at = new THREE.Vector3(GROUND_ANCHOR.x, ALTITUDE, side * SIDE);
    unit.position.copy(at);
    // Cant each one inward, so the pair reads as attending to the vehicle
    // between them rather than as two unrelated objects.
    unit.rotation.z = side * -0.16;
    group.add(unit);
    ends.push(at);
  }

  /* The beams. Both endpoints are fixed in this frame, so these are built once
     and never touched again — what moves along them is the packets. */
  for (const end of ends) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      GROUND_ANCHOR.clone(),
      end.clone(),
    ]);
    group.add(new THREE.Line(geometry, beam));
  }

  /* Packets: small enough to read as data rather than as cargo, and running
     both ways, because the vehicle reports and the network answers. */
  const packetGeometry = new THREE.OctahedronGeometry(1.5);
  const packets: {
    mesh: THREE.Mesh;
    end: THREE.Vector3;
    offset: number;
    up: boolean;
  }[] = [];

  for (const end of ends) {
    for (let i = 0; i < PACKETS; i += 1) {
      const mesh = new THREE.Mesh(packetGeometry, accent);
      group.add(mesh);
      packets.push({ mesh, end, offset: i / PACKETS, up: i % 2 === 0 });
    }
  }

  let strength = 0;

  /* Fade by material opacity rather than by removing the group, so the pair
     arrives rather than appears. Base opacities come from the palette, so this
     has to be re-applied after any theme change. */
  function applyStrength(value: number) {
    strength = Math.min(1, Math.max(0, value));
    group.visible = strength > 0.001;
    fill.opacity = palette.fillOpacity * strength;
    accent.opacity = 0.9 * strength;
    edge.opacity = palette.lineOpacity * strength;
    beam.opacity = palette.lineOpacity * 0.45 * strength;
  }

  applyStrength(0);

  return {
    object3D: group,

    setStrength: applyStrength,

    update(elapsed) {
      if (!group.visible) return;
      for (const { mesh, end, offset, up } of packets) {
        const t = (elapsed / TRANSIT + offset) % 1;
        mesh.position.lerpVectors(GROUND_ANCHOR, end, up ? t : 1 - t);
        // Swell in and out across the run, so packets arrive and depart rather
        // than popping into existence at the endpoints.
        mesh.scale.setScalar(0.35 + Math.min(1, Math.sin(Math.PI * t) * 2.2) * 0.65);
      }
    },

    setPalette(next) {
      fill.color.copy(next.fill);
      accent.color.copy(next.accent);
      edge.color.copy(next.line);
      beam.color.copy(next.lineDim);
      palette = next;
      applyStrength(strength);
    },

    dispose() {
      packetGeometry.dispose();
      // Traverse rather than track: edgesFor builds an EdgesGeometry of its own
      // for every outline, and those are not otherwise reachable from here.
      group.traverse((child) => {
        const holder = child as Partial<THREE.Mesh>;
        holder.geometry?.dispose();
      });
      for (const material of materials) material.dispose();
      group.clear();
    },
  };
}
