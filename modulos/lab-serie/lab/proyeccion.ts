// Proyección 3D sencilla para el anillo, el disco y el plano: eje z vertical en pantalla,
// cámara girada psi en torno a z y elevada el sobre el plano xy. Unidades del mundo = px.
import { RGB } from "../theme";
import { TAU, azar, brillo, chispa, linea, rgba, type Pt } from "./luz";

export type Camara = { cx: number; cy: number; psi: number; el: number };

export const proyectar = (c: Camara, x: number, y: number, z: number) => {
  const x1 = x * Math.cos(c.psi) - y * Math.sin(c.psi);
  const y1 = x * Math.sin(c.psi) + y * Math.cos(c.psi);
  return {
    sx: c.cx + x1,
    // Lo que está más lejos (y1 > 0) se ve más arriba, porque la cámara mira desde arriba.
    sy: c.cy - (z * Math.cos(c.el) + y1 * Math.sin(c.el)),
    // Profundidad: positiva = más lejos de quien mira.
    prof: y1 * Math.cos(c.el) - z * Math.sin(c.el),
  };
};

// Circunferencia de radio R a la altura z. mitad elige qué parte dibujar respecto del eje (para taparlo bien).
export const circulo = (ctx: CanvasRenderingContext2D, c: Camara, R: number, z: number, rgb: string, a: number, ancho: number, mitad: "atras" | "frente" | "todo" = "todo") => {
  if (a <= 0.01 || R <= 0) return;
  const n = 96;
  let tramo: Pt[] = [];
  let atrasTramo: boolean | null = null;
  const cierra = () => {
    if (tramo.length > 1 && atrasTramo !== null) {
      if (mitad === "todo" || (mitad === "atras") === atrasTramo) linea(ctx, tramo, rgb, a * (atrasTramo ? 0.5 : 1), ancho);
    }
  };
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * TAU;
    const p = proyectar(c, R * Math.cos(u), R * Math.sin(u), z);
    const atras = p.prof > 0;
    if (atrasTramo !== null && atras !== atrasTramo) {
      tramo.push([p.sx, p.sy]);
      cierra();
      tramo = [];
    }
    atrasTramo = atras;
    tramo.push([p.sx, p.sy]);
  }
  cierra();
};

// Anillo cargado: tubo de luz con chispas que giran lento sobre él.
export const anilloLuz = (ctx: CanvasRenderingContext2D, c: Camara, R: number, t: number, a: number, mitad: "atras" | "frente" | "todo" = "todo", rgb = RGB.pos) => {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  circulo(ctx, c, R, 0, rgb, 0.12 * a, 18, mitad);
  circulo(ctx, c, R, 0, rgb, 0.3 * a, 6, mitad);
  ctx.restore();
  circulo(ctx, c, R, 0, "225,235,255", 0.9 * a, 2.2, mitad);
  for (let k = 0; k < 28; k++) {
    const u = (k / 28) * TAU + t * 0.25;
    const p = proyectar(c, R * Math.cos(u), R * Math.sin(u), 0);
    const atras = p.prof > 0;
    if (mitad !== "todo" && (mitad === "atras") !== atras) continue;
    chispa(ctx, p.sx, p.sy, 1.8, rgb, a * (atras ? 0.5 : 1) * (0.6 + 0.4 * Math.sin(t * 3 + k)));
  }
};

// Superficie cargada en malla (disco o plano): relleno tenue, anillos y radios, y puntos de luz en los cruces.
export const mallaDisco = (ctx: CanvasRenderingContext2D, c: Camara, R: number, t: number, a: number, nAnillos = 9, nRadios = 24, rgb = RGB.malla) => {
  if (a <= 0.01 || R <= 0) return;
  const centro = proyectar(c, 0, 0, 0);
  // Relleno: elipse con degradado radial (el disco visto en perspectiva).
  ctx.save();
  ctx.translate(centro.sx, centro.sy);
  ctx.scale(1, Math.sin(c.el));
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
  g.addColorStop(0, rgba(rgb, 0.3 * a));
  g.addColorStop(1, rgba(rgb, 0.12 * a));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.fill();
  ctx.restore();
  for (let i = 1; i <= nAnillos; i++) circulo(ctx, c, (R * i) / nAnillos, 0, rgb, a * (i === nAnillos ? 0.9 : 0.4), i === nAnillos ? 2 : 1);
  for (let j = 0; j < nRadios; j++) {
    const u = (j / nRadios) * TAU;
    const p = proyectar(c, R * Math.cos(u), R * Math.sin(u), 0);
    linea(ctx, [[centro.sx, centro.sy], [p.sx, p.sy]], rgb, a * 0.25, 1);
  }
  for (let k = 0; k < 40; k++) {
    const rr = R * Math.sqrt(azar(k * 1.7 + 2));
    const u = azar(k * 2.9 + 1) * TAU + t * 0.08;
    const p = proyectar(c, rr * Math.cos(u), rr * Math.sin(u), 0);
    chispa(ctx, p.sx, p.sy, 1.6, RGB.pos, a * (0.5 + 0.5 * Math.sin(t * 2.4 + k * 1.3)));
  }
  brillo(ctx, centro.sx, centro.sy, R * 0.9, RGB.pos, 0.08 * a);
};
