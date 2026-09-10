import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import walkingUrl from '../assets/Walking.fbx?url';
import { applyPalette, accentFill, panelFill, disposeObject } from '../materials';
import type { ScenePalette } from '../palette';
import type { fuelStopPose } from './fuelStop';

export function createDriver(palette: ScenePalette) {
  const group = new THREE.Group();
  group.name = 'sandbox-driver';
  const body = panelFill(palette);
  // The human needs a stronger silhouette than the large truck panels.
  body.color.copy(palette.line).lerp(palette.fill, 0.35);
  body.opacity = 1;
  const joints = accentFill(palette);
  let disposed = false;
  let model: THREE.Group | undefined;
  let mixer: THREE.AnimationMixer | undefined;
  let hips: THREE.Object3D | undefined;
  let duration = 1;
  const standing: { bone: THREE.Bone; position: THREE.Vector3; quaternion: THREE.Quaternion }[] = [];

  // A jointed stand-in also keeps the experiment usable if the FBX fails.
  const fallback = new THREE.Group();
  const limb = (radius: number, length: number, x: number, y: number) => {
    const pivot = new THREE.Group(); pivot.position.set(x, y, 0);
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 3, 6), body);
    mesh.position.y = -length / 2; pivot.add(mesh); fallback.add(pivot); return pivot;
  };
  limb(0.2, 0.42, 0, 1.43);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), joints);
  head.position.y = 1.67; fallback.add(head);
  const legs = [limb(0.095, 0.69, -0.13, 0.83), limb(0.095, 0.69, 0.13, 0.83)];
  const arms = [limb(0.065, 0.55, -0.29, 1.41), limb(0.065, 0.55, 0.29, 1.41)];
  group.add(fallback);

  function releaseSkeletons(root: THREE.Object3D) {
    const skeletons = new Set<THREE.Skeleton>();
    root.traverse((object) => {
      const mesh = object as THREE.SkinnedMesh;
      if (mesh.isSkinnedMesh) skeletons.add(mesh.skeleton);
    });
    for (const skeleton of skeletons) skeleton.dispose();
  }

  new FBXLoader().load(walkingUrl, (loaded) => {
    if (disposed) { releaseSkeletons(loaded); disposeObject(loaded); return; }
    const clip = loaded.animations.find((animation) => animation.duration > 0);
    if (!clip) { releaseSkeletons(loaded); disposeObject(loaded); return; }
    model = loaded;
    model.scale.setScalar(0.01); // Mixamo centimetres -> scene metres.
    const oldMaterials = new Set<THREE.Material>();
    model.traverse((object) => {
      const mesh = object as THREE.SkinnedMesh;
      if (mesh.isMesh) {
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) oldMaterials.add(material);
        mesh.material = mesh.name.includes('Joints') ? joints : body;
        mesh.frustumCulled = false;
      }
    });
    for (const material of oldMaterials) material.dispose();
    mixer = new THREE.AnimationMixer(model);
    mixer.clipAction(clip).play();
    duration = clip.duration;
    hips = model.getObjectByName('mixamorigHips');
    mixer.setTime(0);
    if (hips) { hips.position.x = 0; hips.position.z = 0; }
    model.traverse((object) => {
      const bone = object as THREE.Bone;
      if (bone.isBone) standing.push({ bone, position: bone.position.clone(), quaternion: bone.quaternion.clone() });
    });
    model.updateMatrixWorld(true);
    model.position.y = -new THREE.Box3().setFromObject(model, true).min.y;
    fallback.visible = false;
    group.add(model);
  }, undefined, () => { /* Keep the procedural driver if the asset is unavailable. */ });

  return {
    object3D: group,
    update(pose: ReturnType<typeof fuelStopPose>, reduced: boolean) {
      group.visible = pose.visible;
      group.position.set(pose.x, pose.y, pose.z);
      group.rotation.y = pose.yaw;
      // Match stride to metres travelled. Remove the FBX's baked forward motion
      // so it cannot accumulate drift, including when scrubbing backwards.
      const time = reduced ? 0 : pose.distance / 1.724 * duration;
      if (mixer) {
        mixer.setTime(time);
        if (hips) { hips.position.x = 0; hips.position.z = 0; }
        const idle = reduced ? 1 : 1 - pose.gait;
        for (const { bone, position, quaternion } of standing) {
          bone.position.lerp(position, idle);
          bone.quaternion.slerp(quaternion, idle);
        }
      }
      const swing = pose.walking && !reduced ? Math.sin(time * Math.PI * 2) * 0.5 * pose.gait : 0;
      legs[0].rotation.x = swing; legs[1].rotation.x = -swing;
      arms[0].rotation.x = -swing; arms[1].rotation.x = swing;
    },
    setPalette(next: ScenePalette) {
      applyPalette([body, joints], next);
      body.color.copy(next.line).lerp(next.fill, 0.35); body.opacity = 1;
    },
    dispose() {
      disposed = true;
      mixer?.stopAllAction();
      if (model) mixer?.uncacheRoot(model);
      releaseSkeletons(group);
      disposeObject(group);
    },
  };
}
