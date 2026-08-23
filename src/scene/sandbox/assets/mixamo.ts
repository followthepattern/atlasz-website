import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import walkingUrl from "@/scene/assets/Walking.fbx?url";
import type { ScenePalette } from "../../palette";
import type { Humanoid } from "./humanoid";

/* A rigged figure from Mixamo, standing in for the procedural one.
 *
 * This is the experiment the lab exists for: whether a real skinned mesh with
 * real motion capture can sit in a scene that is otherwise unlit panels and
 * outlines, or whether it reads as something pasted in from another project.
 *
 * Four things have to be dealt with on the way in, and each of them is the kind
 * of thing that looks like a bug if you have not met it before:
 *
 *   1. Mixamo exports in centimetres. The figure arrives 100x too large, in a
 *      world where the truck is eighteen units long. Scaled from its own
 *      measured height rather than by a hardcoded 0.01, so a different export
 *      with different proportions still lands at 1.8m.
 *
 *   2. The clip has root motion — the hips travel 172 units over one cycle.
 *      The world already carries this figure along its path, so left alone the
 *      two would compound and it would walk away from itself. The horizontal
 *      components of the hip track are flattened and the vertical left alone,
 *      which is the standard in-place conversion and keeps the bob.
 *
 *   3. It arrives with MeshPhongMaterial and textures. Those are replaced, but
 *      NOT with the scene's usual MeshBasicMaterial: a 49,000-triangle body with
 *      no shading is a flat silhouette, and outlines cannot save it because
 *      EdgesGeometry is static and this mesh deforms every frame. So it gets a
 *      lit material and its own lights — which makes it the only shaded object
 *      in the scene. That is either exactly right or exactly wrong, and it is
 *      the question worth answering.
 *
 *   4. Loading is asynchronous and `SceneFactory` is not. The group returns
 *      empty and fills in when the file arrives, so nothing waits on it.
 */

/** Target height in metres, matching the procedural figure it replaces. */
const HEIGHT = 1.8;

/** Walk cycles per unit of `along`. Tuned so the feet do not skate. */
const CYCLES = 5;

/** A frame of the walk that reads as standing. Mid-stance, both feet down. */
const STANDING_FRAME = 0.26;

export function mixamoHumanoid(palette: ScenePalette): Humanoid {
  const group = new THREE.Group();

  /* Lit, unlike everything else here. Lambert rather than Standard: there is no
     environment map and no roughness to speak of, so the extra cost of a PBR
     model would buy nothing this scene can show.
   *
   * White, via `line` rather than a literal 0xffffff. In the dark theme `line`
   * is the foreground colour, which is white — so this is white where you are
   * looking at it — and in the light theme it inverts with everything else
   * instead of leaving a white figure on a white page. Opaque, because this one
   * is hidden by visibility rather than faded. */
  const skin = new THREE.MeshLambertMaterial({ color: palette.line });

  /* The figure's own lighting, parented to it. Everything else in the scene is
     MeshBasicMaterial and ignores lights entirely, so these touch nothing but
     the body — a key light to give the form somewhere to turn away from, and a
     fill so the shadow side does not go to black. */
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(3, 6, 4);
  const fill = new THREE.HemisphereLight(0xffffff, 0x000000, 1.4);
  group.add(key, key.target, fill);

  let mixer: THREE.AnimationMixer | null = null;
  let action: THREE.AnimationAction | null = null;
  let duration = 1;

  new FBXLoader().load(
    walkingUrl,
    (fbx) => {
      // 1. Scale from measured height, not from an assumed unit.
      const box = new THREE.Box3().setFromObject(fbx);
      const size = box.getSize(new THREE.Vector3());
      const scale = HEIGHT / (size.y || HEIGHT);
      fbx.scale.setScalar(scale);
      fbx.position.y = -box.min.y * scale; // stand it on the ground

      /* Mixamo characters face +Z — measured, not assumed: the hips travel
         1.6 to 174.0 in Z across the clip. Everything in this scene faces +X,
         including the procedural figure this replaces and the rotation maths in
         `driver.ts` that aims it. Turning the model here rather than patching
         the caller keeps that convention true for whatever loads next. */
      fbx.rotation.y = Math.PI / 2;

      // 3. Strip the imported materials for one this scene can tint.
      fbx.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        const old = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of old) material.dispose();
        mesh.material = skin;
        mesh.frustumCulled = false; // skinned bounds go stale as it animates
      });

      const clip = fbx.animations[0];
      if (clip) {
        // 2. In place: flatten the hips' horizontal travel, keep the vertical.
        for (const track of clip.tracks) {
          if (!track.name.endsWith("mixamorigHips.position")) continue;
          const v = track.values;
          const x = v[0];
          const z = v[2];
          for (let i = 0; i < v.length; i += 3) {
            v[i] = x;
            v[i + 2] = z;
          }
        }
        duration = clip.duration;
        mixer = new THREE.AnimationMixer(fbx);
        action = mixer.clipAction(clip);
        action.play();
        // Held at a frame by the poses below rather than left running, so the
        // stride stays tied to distance covered exactly as the procedural
        // figure's was.
        mixer.setTime(STANDING_FRAME);
      }

      group.add(fbx);
    },
    undefined,
    (error) => {
      // The scene carries on without a driver rather than failing outright.
      console.warn("[sandbox] could not load the rigged figure", error);
    },
  );

  /** Scrub the clip to a time. The whole animation interface, really. */
  const at = (time: number) => {
    if (!mixer) return;
    mixer.setTime(((time % duration) + duration) % duration);
  };

  return {
    object3D: group,

    stand() {
      at(STANDING_FRAME);
    },

    walk(along) {
      // Driven by distance, so scrolling fast does not make the legs whirr.
      at(along * CYCLES * duration);
    },

    work(elapsed, phase) {
      /* No typing clip in this export, so this is a held pose with a little
         drift on it. It is the weakest thing here and the fix is another FBX
         rather than more code. */
      at(STANDING_FRAME + Math.sin(elapsed * 0.7 + phase) * 0.04);
    },

    setPalette(next) {
      skin.color.copy(next.line);
    },

    dispose() {
      mixer?.stopAllAction();
      group.traverse((child) => {
        (child as Partial<THREE.Mesh>).geometry?.dispose();
      });
      skin.dispose();
      group.clear();
    },
  };
}
