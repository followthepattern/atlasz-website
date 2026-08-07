export type QualityTier = "low" | "medium" | "high";

export type QualitySettings = {
  tier: QualityTier;
  maxDpr: number;
  particleCount: number;
  /** Rack units instanced inside the warehouse shell. */
  rackCount: number;
  antialias: boolean;
};

const SETTINGS: Record<QualityTier, Omit<QualitySettings, "tier">> = {
  low: { maxDpr: 1, particleCount: 260, rackCount: 12, antialias: false },
  medium: { maxDpr: 1.5, particleCount: 900, rackCount: 24, antialias: true },
  high: { maxDpr: 2, particleCount: 2200, rackCount: 40, antialias: true },
};

/* A persistent canvas renders for the whole visit, so the cost of guessing too
   high is a hot phone rather than one slow frame. Bias low when unsure. */
export function detectQuality(): QualitySettings {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < 768;

  let tier: QualityTier = "high";
  if (coarse || narrow) tier = "medium";
  if (cores <= 4 || memory <= 4) tier = "low";
  if (cores >= 8 && memory >= 8 && !coarse && !narrow) tier = "high";

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
