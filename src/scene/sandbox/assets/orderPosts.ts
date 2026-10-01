import * as THREE from "three";
import type { TreePlacement } from "../../assets/trees";
import type { ScenePalette } from "../../palette";

/** World-space order boards anchored beside actual trees, with perspective and occlusion. */
export function createOrderPosts(trees: TreePlacement[], startX: number, endX: number, palette: ScenePalette) {
  const object3D = new THREE.Group();
  object3D.name = "RoadsideOrderMarketplace";
  const routes = ["Budapest → Vienna", "Graz → Munich", "Bratislava → Budapest", "Vienna → Prague"];
  const prices = ["€1,560", "€1,840", "€720", "€980"];
  const used = new Set<TreePlacement>();
  const geometry = new THREE.PlaneGeometry(12, 7.2);
  let colors = palette;
  let language = "";
  const boards = Array.from({ length: 8 }, (_, i) => {
    const targetX = THREE.MathUtils.lerp(startX, endX, Math.floor(i / 2) / 3);
    const side = i % 2 ? -1 : 1;
    const tree = trees.filter(t => !used.has(t) && Math.sign(t.position.z) === side)
      .sort((a, b) => (Math.abs(a.position.x - targetX) + Math.abs(Math.abs(a.position.z) - 20) * 2) - (Math.abs(b.position.x - targetX) + Math.abs(Math.abs(b.position.z) - 20) * 2))[0];
    if (!tree) return null;
    used.add(tree);
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 540;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `OrderPost-${i + 1}`;
    // Keep the trees themselves intact; the board hovers just above the canopy.
    mesh.position.copy(tree.position).add(new THREE.Vector3(2, tree.scale * 6 + 2, -side * 4));
    mesh.rotation.y = Math.PI / 2 + side * .22;
    object3D.add(mesh);
    return { canvas, texture, material, mesh, y: mesh.position.y, i };
  }).filter(board => board !== null);

  function paint() {
    const hu = language === "hu";
    const dark = colors.fog.getHex() < 0x888888;
    for (const board of boards) {
      const ctx = board.canvas.getContext("2d")!;
      const buy = board.i % 2 === 0;
      ctx.clearRect(0, 0, 900, 540);
      ctx.fillStyle = dark ? "#202124" : "#ffffff";
      ctx.strokeStyle = dark ? "#67696c" : "#b6b8bb";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(3, 3, 894, 534, 28); ctx.fill(); ctx.stroke();
      ctx.fillStyle = buy ? (dark ? "#73e8aa" : "#167442") : (dark ? "#c7d5ef" : "#364b70");
      ctx.font = "500 34px system-ui";
      ctx.fillText(buy ? (hu ? "Megbízás vásárlása" : "Buy an order") : (hu ? "Megbízás eladása" : "Sell an order"), 45, 78);
      ctx.fillStyle = dark ? "#ffffff" : "#151719";
      ctx.font = "600 46px system-ui";
      ctx.fillText(routes[board.i % 4], 45, 196);
      ctx.fillStyle = dark ? "#babdc2" : "#666b73";
      ctx.font = "30px system-ui";
      ctx.fillText(hu ? "12 raklap · Európai fuvar" : "12 pallets · European transport", 45, 261);
      ctx.beginPath(); ctx.moveTo(45, 325); ctx.lineTo(855, 325); ctx.stroke();
      ctx.fillStyle = dark ? "#ffffff" : "#151719";
      ctx.font = "500 60px system-ui";
      ctx.fillText(prices[board.i % 4], 45, 430);
      ctx.fillStyle = dark ? "#babdc2" : "#666b73";
      ctx.font = "26px system-ui";
      ctx.fillText(hu ? "Példaajánlat" : "Example listing", 45, 485);
      board.texture.needsUpdate = true;
    }
  }
  return {
    object3D,
    update(elapsed: number, strength: number, reduced: boolean, locale: string) {
      object3D.visible = strength > .001;
      if (!object3D.visible) return;
      if (language !== locale) { language = locale; paint(); }
      for (const board of boards) {
        board.material.opacity = strength;
        board.mesh.position.y = board.y + (reduced ? 0 : Math.sin(elapsed * .7 + board.i) * .55);
      }
    },
    setPalette(next: ScenePalette) { colors = next; paint(); },
    dispose() {
      geometry.dispose();
      for (const board of boards) { board.texture.dispose(); board.material.dispose(); }
      object3D.clear();
    },
  };
}
