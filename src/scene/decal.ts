import * as THREE from "three";

/**
 * Lettering drawn to a canvas and used as a texture — an operator's name on a
 * trailer flank is a printed decal, so a raster one is the honest model.
 *
 * Building the glyphs as extruded shapes would keep the scene purely vector,
 * but it means hand-authoring outlines for every letter and re-authoring them
 * for any wording change. At the distances the camera works at, a 1024px
 * texture across a 5.5 m panel is far past the point where the difference
 * shows.
 */
export type TextDecal = {
  texture: THREE.CanvasTexture;
  /** Redraw in a new colour, for the light/dark swap. */
  recolor(color: THREE.Color): void;
  dispose(): void;
};

/* Aspect must track the panel it is mapped onto (7.4 m x 2.3 m ≈ 3.2:1), or
   the lettering stretches. */
const WIDTH = 1280;
const HEIGHT = 400;

export function createTextDecal(text: string, color: THREE.Color): TextDecal {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  function draw(next: THREE.Color) {
    if (!context) return;
    context.clearRect(0, 0, WIDTH, HEIGHT);
    context.fillStyle = `#${next.getHexString()}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    // Matches the site's own stack so the branding reads as one system.
    context.font =
      '700 300px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
    // Not universally supported; assigning it is harmless where it is not.
    context.letterSpacing = "16px";
    // Squeeze to the panel width rather than letting long wording overflow.
    const maxWidth = WIDTH * 0.94;
    context.fillText(text, WIDTH / 2, HEIGHT / 2 + 10, maxWidth);
    texture.needsUpdate = true;
  }

  draw(color);

  return {
    texture,
    recolor: draw,
    dispose() {
      texture.dispose();
    },
  };
}
