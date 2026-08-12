export type QualityTier = "low" | "medium" | "high";

export type QualitySettings = {
  tier: QualityTier;
  maxDpr: number;
  /** Rack units instanced inside the warehouse shell. */
  rackCount: number;
  antialias: boolean;
};

const SETTINGS: Record<QualityTier, Omit<QualitySettings, "tier">> = {
  low: { maxDpr: 1, rackCount: 12, antialias: false },
  medium: { maxDpr: 1.5, rackCount: 24, antialias: true },
  high: { maxDpr: 2, rackCount: 40, antialias: true },
};

/**
 * The tier a scene renders at, from what the browser will say about the device.
 *
 * **Form factor decides this, not hardware counters.** `navigator.deviceMemory`
 * and `navigator.hardwareConcurrency` are both privacy-capped and both differ
 * between browsers on the *same machine*: Safari reports no memory at all and a
 * lower core count than Chrome does on identical hardware. Anything they gate
 * therefore diverges by browser rather than by device — which is how one Mac
 * came to render this scene at 2x in Chrome and 1x in Safari, and how every
 * Safari visitor was once pinned to `low` outright.
 *
 * Pointer type and viewport width carry no such caveat. They are standardised
 * media queries, they answer the question actually being asked — is this a
 * phone or a desktop — and they resolve identically in every engine.
 *
 * The counters are kept only as a veto, and only at a value no current machine
 * reports, so a genuine potato is still caught while no healthy device can be
 * demoted by the browser it happens to be using.
 */
export function detectQuality(): QualitySettings {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency;
  const memory = nav.deviceMemory;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < 768;

  const potato =
    (cores !== undefined && cores <= 2) || (memory !== undefined && memory <= 2);

  const tier: QualityTier = potato ? "low" : coarse || narrow ? "medium" : "high";

  return { tier, ...SETTINGS[tier] };
}

export function isWebGLAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl")),
    );
  } catch {
    return false;
  }
}
