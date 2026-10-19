// Two helpers that final.ts used to import from the teaser's escenas.ts, extracted verbatim
// so this module does not depend on the whole scene file.
import type { Disp } from "./disposicion";
import type { Pt } from "./lab/luz";

const auxiliares = new Map<string, HTMLCanvasElement>();
// Reusable offscreen canvas, cached by name and size.
export const auxiliar = (w: number, h: number, nombre = "") => {
  const k = `${nombre}${w}x${h}`;
  let c = auxiliares.get(k);
  if (!c) {
    c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    auxiliares.set(k, c);
  }
  return c;
};

// Horizontal half-distance between the two charges, in logo units (same value as escenas.ts).
const Q_DX = 400;
export const posCargas = (d: Disp): [Pt, Pt] => [[d.W / 2 - Q_DX * d.logo.s, d.cargasY], [d.W / 2 + Q_DX * d.logo.s, d.cargasY]];
