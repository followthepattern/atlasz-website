type Stop = { page: number; scene: number };

/** Scene boundaries follow the actual page, including translated copy. */
export function pageStops(): Stop[] {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (max <= 0) return [{ page: 0, scene: 0 }, { page: 1, scene: 1 }];
  const stops = Array.from(document.querySelectorAll<HTMLElement>('[data-scene-start]')).map((section) => ({
    page: (section.getBoundingClientRect().top + window.scrollY) / max,
    scene: Number(section.dataset.sceneStart),
  }));
  return stops.length ? [...stops, { page: 1, scene: 1 }] : [{ page: 0, scene: 0 }, { page: 1, scene: 1 }];
}

function interpolate(p: number, stops: Stop[], input: 'page' | 'scene', output: 'page' | 'scene') {
  const value = Math.max(0, Math.min(1, p));
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1], b = stops[i];
    if (value <= b[input]) return a[output] + (value - a[input]) / Math.max(1e-9, b[input] - a[input]) * (b[output] - a[output]);
  }
  return 1;
}
export const pageToScene = (p: number, stops = pageStops()) => interpolate(p, stops, 'page', 'scene');
export const sceneToPage = (p: number, stops = pageStops()) => interpolate(p, stops, 'scene', 'page');
