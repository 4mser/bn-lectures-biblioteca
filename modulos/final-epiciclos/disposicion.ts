import { formato, type Formato } from "./theme";

// Composición por formato. Las revelaciones van centradas en la zona visual (vis); el cierre reproduce la foto de
// perfil: dos cargas a media altura, a ±400·s px del centro, y la marca centrada 43·s px más arriba.
// En 9:16 todo queda dentro de la zona segura de TikTok (200 px arriba, 370 abajo, sin texto en los 140 px de la
// derecha entre y = 900 y y = 1600).
export type Disp = {
  fmt: Formato;
  W: number;
  H: number;
  vis: { cx: number; cy: number; r: number };
  cargasY: number;
  logo: { cx: number; cy: number; s: number; y2: number };
  textoAncho: number;
  campo: string; // textura LIC precalculada (herramientas/lic.py)
};

export const disposicion = (W: number, H: number): Disp => {
  const fmt = formato(W, H);
  if (fmt === "horizontal") {
    const cy = 540;
    const s = 1.12;
    return { fmt, W, H, vis: { cx: 960, cy: 540, r: 410 }, cargasY: cy, logo: { cx: 960, cy: cy - 43 * s, s, y2: cy + 290 }, textoAncho: 1300, campo: "img/campo-169.png" };
  }
  if (fmt === "alto") {
    const cy = 960;
    return { fmt, W, H, vis: { cx: 540, cy: 900, r: 400 }, cargasY: cy, logo: { cx: 540, cy: cy - 43, s: 1, y2: cy + 330 }, textoAncho: 800, campo: "img/campo-916.png" };
  }
  const cy = 675;
  return { fmt, W, H, vis: { cx: 540, cy: 640, r: 400 }, cargasY: cy, logo: { cx: 540, cy: cy - 43, s: 1, y2: cy + 330 }, textoAncho: 900, campo: "img/campo-45.png" };
};
