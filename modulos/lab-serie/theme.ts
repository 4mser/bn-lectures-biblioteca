import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import "./katex-sin-fuentes.css";

// Lenguaje visual del reel de B&N Lab (ley de Gauss): fondo negro, cargas que brillan, títulos en Space Grotesk
// y rótulos en IBM Plex Mono. La carga positiva brilla en azul; la negativa, en ámbar.
export const W = 1080;
export const H = 1350;
export const MARGEN = 72;

// Versión horizontal para YouTube (1920×1080): el texto va en una columna a la izquierda y la escena vertical
// (en sus coordenadas de 1080×1350) se dibuja a la derecha, escalada s y desplazada (ox, oy).
export const YT = { W: 1920, H: 1080, s: 1, ox: 800, oy: -150, col: { x: 104, w: 640 } };

// Versión 9:16 para TikTok y Reels (1080×1920): la escena vertical baja oy px, lejos de los botones y el texto
// que la app pone arriba y abajo; el lienzo llena el alto extra.
export const TT = { W: 1080, H: 1920, oy: 200 };
export type Formato = "vertical" | "horizontal" | "alto";
export const formato = (width: number, height: number): Formato => (width > height ? "horizontal" : height > width * 1.5 ? "alto" : "vertical");

export const C = {
  fondo: "#020306",
  texto: "#F4F5F8",
  texto2: "rgba(244,245,248,.74)",
  texto3: "rgba(244,245,248,.48)",
  texto4: "rgba(244,245,248,.30)",
  azul: "#5B86FF",
};
// Colores del canvas como "r,g,b", para armar rgba con alfa variable.
export const RGB = {
  pos: "70,122,255",
  neg: "255,176,72",
  hielo: "205,218,255",
  blanco: "244,245,248",
  azul: "91,134,255",
  malla: "64,110,255",
};

export const SANS = "Space Grotesk";
export const MONO = "IBM Plex Mono";

for (const w of ["300", "400", "500", "600", "700"]) {
  loadFont({ family: SANS, url: staticFile(`fonts/grotesk-${w}.woff2`), weight: w });
}
for (const w of ["400", "500"]) {
  loadFont({ family: MONO, url: staticFile(`fonts/plex-${w}.woff2`), weight: w });
}
// Fuentes de KaTeX: [familia, archivo, peso, estilo].
const KATEX: [string, string, string, string][] = [
  ["KaTeX_Main", "Main-Regular", "400", "normal"],
  ["KaTeX_Main", "Main-Bold", "700", "normal"],
  ["KaTeX_Main", "Main-Italic", "400", "italic"],
  ["KaTeX_Main", "Main-BoldItalic", "700", "italic"],
  ["KaTeX_Math", "Math-Italic", "400", "italic"],
  ["KaTeX_Math", "Math-BoldItalic", "700", "italic"],
  ["KaTeX_AMS", "AMS-Regular", "400", "normal"],
  ["KaTeX_Size1", "Size1-Regular", "400", "normal"],
  ["KaTeX_Size2", "Size2-Regular", "400", "normal"],
  ["KaTeX_Size3", "Size3-Regular", "400", "normal"],
  ["KaTeX_Size4", "Size4-Regular", "400", "normal"],
];
for (const [family, archivo, weight, style] of KATEX) {
  loadFont({ family, url: staticFile(`fonts/katex/KaTeX_${archivo}.woff2`), weight, style });
}

// Curvas: todo se calcula desde t, sin estado.
export const cl = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const pr = (t: number, a: number, d: number) => cl((t - a) / d);
export const eOut = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
export const eIO = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
// Lleva un valor de a a b entre t0 y t0 + d con la curva eIO (para los parámetros de las simulaciones).
export const tramo = (t: number, t0: number, d: number, a: number, b: number) => lerp(a, b, eIO(pr(t, t0, d)));
// Número con coma decimal, como se escribe en Chile.
export const num = (v: number, d = 2) => v.toFixed(d).replace(".", ",").replace("-", "−");
