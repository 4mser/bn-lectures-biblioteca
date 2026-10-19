// Math and geometry simulations rebuilt as GPU strokes in 3D space (they share camera, DOF, bloom and grade with the
// raymarched worlds). Every function is pure in (t, music) and draws into a Trazos batch with an overall weight w.
// All the maths is real: phasor sums, Fourier series, 4D rotations, Schwarzschild-like wells, dipole field lines,
// RK4 Lorenz, Galton binomial walks, two-slit intensity, primes, Fibonacci squares, Dijkstra, light cones and the
// Chenciner-Montgomery figure-eight.
import { Trazos, type RGB, type V3 } from "./trazos";

export type Musica = { t: number; kick: number; snare: number; hat: number; bass: number; graves: number; rms: number; agudos: number; tau: number };
export type Onset = { t: number; v: number };

const TAU = Math.PI * 2;
const cl = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

const ss = (x: number) => x * x * (3 - 2 * x);
const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
const eOut = (x: number) => 1 - Math.pow(1 - cl(x), 3);
export const hash = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const mix3 = (a: RGB, b: RGB, x: number): RGB => [lerp(a[0], b[0], x), lerp(a[1], b[1], x), lerp(a[2], b[2], x)];

// Wavelength (nm) to linear RGB, peak about 1 (smooth piecewise fit).
export const espectro = (l: number): RGB => {
  const g = (x: number, m: number, s1: number, s2: number) => Math.exp(-0.5 * ((x - m) / (x < m ? s1 : s2)) ** 2);
  const r = 1.056 * g(l, 599.8, 37.9, 31.0) + 0.362 * g(l, 442.0, 16.0, 26.7) - 0.065 * g(l, 501.1, 20.4, 26.2);
  const gg = 0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1);
  const b = 1.217 * g(l, 437.0, 11.8, 36.0) + 0.681 * g(l, 459.0, 26.0, 13.8);
  return [Math.max(0, 3.24 * r - 1.54 * gg - 0.5 * b), Math.max(0, -0.97 * r + 1.88 * gg + 0.04 * b), Math.max(0, 0.06 * r - 0.2 * gg + 1.06 * b)].map((v) => v * 1.25) as RGB;
};

// ── frames: a local 3D frame (origin, axes, scale) where a simulation lives ──
export type Marco = { o: V3; u: V3; v: V3; w: V3; s: number };
export const marco = (yaw: number, pitch: number, roll: number, s: number, o: V3 = [0, 0, 0]): Marco => {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
  // R = Ry(yaw) * Rx(pitch) * Rz(roll)
  const rz = (x: V3): V3 => [x[0] * cr - x[1] * sr, x[0] * sr + x[1] * cr, x[2]];
  const rx = (x: V3): V3 => [x[0], x[1] * cp - x[2] * sp, x[1] * sp + x[2] * cp];
  const ry = (x: V3): V3 => [x[0] * cy + x[2] * sy, x[1], -x[0] * sy + x[2] * cy];
  const R = (x: V3) => ry(rx(rz(x)));
  return { o, u: R([1, 0, 0]), v: R([0, 1, 0]), w: R([0, 0, 1]), s };
};
export const P = (m: Marco, x: number, y: number, z = 0): V3 => [
  m.o[0] + (m.u[0] * x + m.v[0] * y + m.w[0] * z) * m.s,
  m.o[1] + (m.u[1] * x + m.v[1] * y + m.w[1] * z) * m.s,
  m.o[2] + (m.u[2] * x + m.v[2] * y + m.w[2] * z) * m.s,
];
const circulo = (T: Trazos, m: Marco, cx: number, cy: number, r: number, col: RGB, a: number, w: number, n = 56, z = 0) => {
  const pts: V3[] = [];
  for (let i = 0; i < n; i++) pts.push(P(m, cx + r * Math.cos((i / n) * TAU), cy + r * Math.sin((i / n) * TAU), z));
  T.linea(pts, col, a, w, true);
};
// Star-like point: core + 4 thin diffraction spikes.
export const estrella = (T: Trazos, p: V3, col: RGB, a: number, tam: number, cam?: { r: V3; u: V3 }) => {
  T.punto(p, [1, 1, 1], a * 0.9, tam * 0.7);
  T.punto(p, col, a * 0.6, tam * 2.2);
  if (cam && a > 0.05) {
    const L = 0.012 * tam;
    for (const d of [cam.r, cam.u]) T.seg([p[0] - d[0] * L, p[1] - d[1] * L, p[2] - d[2] * L], [p[0] + d[0] * L, p[1] + d[1] * L, p[2] + d[2] * L], col, 0, col, 0, 1, 0);
    for (const d of [cam.r, cam.u]) {
      T.seg(p, [p[0] - d[0] * L, p[1] - d[1] * L, p[2] - d[2] * L], col, a * 0.7, col, 0, 1.0, 0);
      T.seg(p, [p[0] + d[0] * L, p[1] + d[1] * L, p[2] + d[2] * L], col, a * 0.7, col, 0, 1.0, 0);
    }
  }
};
// Hat sparks: every hat onset after a0 emits n sparks from origen(onset time); they fly out with drag and fade.
export const chispas = (T: Trazos, hats: Onset[], t: number, a0: number, origen: (tt: number) => V3, col: RGB, w: number, n = 7, vel = 0.9) => {
  for (let k = 0; k < hats.length; k++) {
    const h = hats[k];
    if (h.t < a0 || h.t > t) continue;
    const age = t - h.t;
    if (age > 0.7) continue;
    const o = origen(h.t);
    for (let j = 0; j < n; j++) {
      const s = h.t * 13.7 + j * 1.91;
      const z = 2 * hash(s) - 1, ph = TAU * hash(s + 0.3), rr = Math.sqrt(1 - z * z);
      const d: V3 = [rr * Math.cos(ph), z, rr * Math.sin(ph)];
      const v = vel * (0.4 + hash(s + 0.7)) * h.v;
      const dist = (v * (1 - Math.exp(-age * 5))) / 5 * 2.2;
      const p: V3 = [o[0] + d[0] * dist, o[1] + d[1] * dist - 0.15 * age * age, o[2] + d[2] * dist];
      const p0: V3 = [o[0] + d[0] * dist * 0.82, o[1] + d[1] * dist * 0.82, o[2] + d[2] * dist * 0.82];
      const a = Math.exp(-age * 6) * w * 2.2;
      T.seg(p0, p, col, a * 0.3, [1, 1, 1], a, 1.4, 3);
    }
  }
};

// ═══ Epicycles: a sum of rotating phasors z(s) = Σ a·e^{i(f s + p)} draws Lissajous figures and roses ═══
export type Fasor = { f: number; a: number; p: number };
export const lissajous = (A: number, Bv: number, a: number, b: number, d: number): Fasor[] => [
  { f: a, a: A / 2, p: d - Math.PI / 2 },
  { f: -a, a: A / 2, p: -(d - Math.PI / 2) },
  { f: b, a: Bv / 2, p: 0 },
  { f: -b, a: Bv / 2, p: Math.PI },
];
// rose r = R cos(kθ): z = R/2 (e^{i(1+k)θ} + e^{i(1−k)θ}) (plus two silent phasors so every set has four)
export const rosa = (R: number, k: number, giro = 0): Fasor[] => [
  { f: 1 + k, a: R / 2, p: giro },
  { f: 1 - k, a: R / 2, p: giro },
  { f: 2 * k + 1, a: 0, p: 0 },
  { f: -(2 * k + 1), a: 0, p: 0 },
];
// ellipse (orbit): z = a cos s + i b sin s = ((a+b)/2) e^{is} + ((a−b)/2) e^{−is}
export const elipse = (a: number, b: number, giro = 0): Fasor[] => [
  { f: 1, a: (a + b) / 2, p: giro },
  { f: -1, a: (a - b) / 2, p: -giro },
  { f: 2, a: 0, p: 0 },
  { f: -2, a: 0, p: 0 },
];
export const mezclaFasores = (A: Fasor[], Bf: Fasor[], x: number): Fasor[] => A.map((p, i) => ({ f: lerp(p.f, Bf[i].f, x), a: lerp(p.a, Bf[i].a, x), p: lerp(p.p, Bf[i].p, x) }));
export const evalF = (F: Fasor[], s: number): [number, number] => {
  let x = 0, y = 0;
  for (const q of F) {
    x += q.a * Math.cos(q.f * s + q.p);
    y += q.a * Math.sin(q.f * s + q.p);
  }
  return [x, y];
};
export const epiciclos = (
  T: Trazos, m: Marco, F: Fasor[], s: number, w: number, M: Musica,
  o: { cola?: number; colorA?: RGB; colorB?: RGB; circulos?: number; brillo?: number; completa?: number } = {},
) => {
  const cola = o.cola ?? 0.97;
  const cA = o.colorA ?? [0.35, 0.55, 1.0];
  const cB = o.colorB ?? [1.0, 0.95, 0.9];
  const br = (o.brillo ?? 1) * (1 + 0.9 * M.kick);
  // chain of circles, biggest first
  const orden = F.map((q, i) => i).filter((i) => F[i].a > 1e-4).sort((a, b) => F[b].a - F[a].a);
  let x = 0, y = 0;
  const centros: [number, number][] = [[0, 0]];
  for (const i of orden) {
    const q = F[i];
    if ((o.circulos ?? 1) > 0) circulo(T, m, x, y, q.a, [0.45, 0.62, 1.0], 0.22 * w * (o.circulos ?? 1), 1.0, 72);
    x += q.a * Math.cos(q.f * s + q.p);
    y += q.a * Math.sin(q.f * s + q.p);
    centros.push([x, y]);
  }
  T.linea(centros.map(([a, b]) => P(m, a, b)), [0.8, 0.88, 1.0], 0.55 * w, 1.2);
  for (const [a, b] of centros.slice(0, -1)) T.punto(P(m, a, b), [0.85, 0.9, 1.0], 0.6 * w, 2.4);
  // trail: the last `cola` of a revolution, brightening to the pen
  const N = 420;
  const pts: V3[] = [];
  for (let k = 0; k <= N; k++) {
    const [a, b] = evalF(F, s - cola * TAU * (1 - k / N));
    pts.push(P(m, a, b));
  }
  T.linea(pts, (k) => mix3(cA, cB, Math.pow(k / N, 3)), (k) => w * br * (0.05 + 1.3 * Math.pow(k / N, 2.2)), 2.2);
  if ((o.completa ?? 0) > 0) {
    const full: V3[] = [];
    for (let k = 0; k < 360; k++) {
      const [a, b] = evalF(F, (k / 360) * TAU);
      full.push(P(m, a, b));
    }
    T.linea(full, cA, 0.12 * w * (o.completa ?? 0), 1.2, true);
  }
  const [hx, hy] = evalF(F, s);
  T.punto(P(m, hx, hy), [1, 1, 1], 1.6 * w * br, 4.5);
  T.punto(P(m, hx, hy), cA, 0.8 * w * br, 14);
  return P(m, hx, hy);
};

// ═══ Fourier series of the square wave: f(x) = (4/π) Σ sin(n x)/n, n odd ═══
// Harmonics are stacked in depth with spectral colours; morph m flattens them into the prism's spectral fan.
export const ondaCuadrada = (T: Trazos, nArm: number, fase: number, w: number, M: Musica, morph = 0) => {
  const A = 0.78 * (1 + 0.06 * M.kick);
  const X0 = -2.35; // epicycle stack centre
  const XW = -1.45; // wave starts here
  const XE = 3.2;
  const kx = 2.4; // spatial frequency of the travelling wave
  const nH = Math.max(1, nArm);
  const mm = ss(morph);
  const Q: V3 = [0.35, 0.05, 0];
  const lam = (i: number) => lerp(690, 410, nH <= 1 ? 0 : i / Math.max(1, nH - 1));
  // epicycle stack
  let cx = 0, cy = 0;
  const centros: V3[] = [[X0, 0, 0]];
  for (let i = 0; i < Math.ceil(nH); i++) {
    const n = 2 * i + 1;
    const vis = cl(nH - i);
    const r = ((4 / Math.PI) * A) / n;
    const cm: Marco = { o: [X0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1], s: 1 };
    circulo(T, cm, cx, cy, r, espectro(lam(i)), 0.55 * w * vis * (1 - mm), 1.3, 64);
    cx += r * vis * Math.cos(n * fase);
    cy += r * vis * Math.sin(n * fase);
    centros.push([X0 + cx, cy, 0]);
  }
  T.linea(centros, [0.85, 0.9, 1.0], 0.6 * w * (1 - mm), 1.2);
  // connector from the pen to the wave start
  T.seg([X0 + cx, cy, 0], [XW, cy, 0], [1, 1, 1], 0.25 * w * (1 - mm), [1, 1, 1], 0.5 * w * (1 - mm), 1.0, 0);
  // the sum (white) and each harmonic (behind, spectral)
  const NP = 260;
  const suma: V3[] = [];
  for (let k = 0; k <= NP; k++) {
    const x = lerp(XW, XE, k / NP);
    const ph = fase - kx * (x - XW);
    let y = 0;
    for (let i = 0; i < Math.ceil(nH); i++) {
      const n = 2 * i + 1;
      y += cl(nH - i) * ((4 / Math.PI) * A / n) * Math.sin(n * ph);
    }
    // morph: the sum becomes the incoming white beam (flat line along y ≈ 0 ending at the prism)
    const yb = lerp(-0.35, 0.0, cl((x + 7) / 6.65));
    suma.push([lerp(x, Math.min(x, -0.35), mm), lerp(y, yb, mm), 0]);
  }
  T.linea(suma, [1, 0.97, 0.92], w * (1.1 + 0.8 * M.kick), 2.6);
  for (let i = 0; i < Math.ceil(nH); i++) {
    const n = 2 * i + 1;
    const vis = cl(nH - i);
    const col = espectro(lam(i));
    const z = -0.22 - 0.16 * i;
    const dev = (lam(i) - 580) / 200;
    const dir = (() => {
      const d: V3 = [1, -0.12 - dev * 0.55, dev * 0.08];
      const l = Math.hypot(d[0], d[1], d[2]);
      return [d[0] / l, d[1] / l, d[2] / l] as V3;
    })();
    const pts: V3[] = [];
    for (let k = 0; k <= 160; k++) {
      const u = k / 160;
      const x = lerp(XW, XE, u);
      const y = vis * ((4 / Math.PI) * A / n) * Math.sin(n * (fase - kx * (x - XW)));
      const ray: V3 = [Q[0] + dir[0] * u * 6, Q[1] + dir[1] * u * 6, Q[2] + dir[2] * u * 6];
      pts.push([lerp(x, ray[0], mm), lerp(y, ray[1], mm), lerp(z, ray[2], mm)]);
    }
    T.linea(pts, col, w * vis * (0.95 + 0.5 * mm), 1.8 + mm * 0.8);
  }
};

// ═══ Tesseract: 16 vertices of {±1}^4 rotated in the xw, yz and zw planes, perspective-projected 4D → 3D ═══
const V4 = Array.from({ length: 16 }, (_, i) => [i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1, i & 8 ? 1 : -1]);
const ARISTAS: [number, number][] = [];
for (let i = 0; i < 16; i++) for (let b = 0; b < 4; b++) if (!(i & (1 << b))) ARISTAS.push([i, i | (1 << b)]);
const ESTRELLAS: V3[] = Array.from({ length: 1400 }, (_, i) => {
  const z = 2 * hash(i * 1.37) - 1, a = TAU * hash(i * 2.11), r = Math.sqrt(1 - z * z), R = 7 + 9 * hash(i * 3.7);
  return [r * Math.cos(a) * R, z * R, r * Math.sin(a) * R];
});
export const cielo = (T: Trazos, w: number, M: Musica, n = 1400) => {
  for (let i = 0; i < n; i++) {
    const tw = 0.6 + 0.4 * Math.sin(M.t * (1.5 + 3 * hash(i * 9.1)) + hash(i) * TAU);
    T.punto(ESTRELLAS[i], hash(i * 5.3) < 0.3 ? [1, 0.85, 0.7] : [0.7, 0.8, 1.0], w * (0.25 + 1.6 * Math.pow(hash(i * 4.4), 8)) * tw * (1 + M.hat * 0.8), 1.3 + 2.2 * Math.pow(hash(i * 6.1), 6));
  }
};
export const teseracto = (T: Trazos, ang: [number, number, number], esc: number, w: number, M: Musica, llegada = 1, cam?: { r: V3; u: V3 }) => {
  const [a, b, c] = ang;
  const P3: V3[] = [];
  const W4: number[] = [];
  for (const v of V4) {
    let [x, y, z, ww] = v;
    [x, ww] = [x * Math.cos(a) - ww * Math.sin(a), x * Math.sin(a) + ww * Math.cos(a)];
    [y, z] = [y * Math.cos(b) - z * Math.sin(b), y * Math.sin(b) + z * Math.cos(b)];
    [z, ww] = [z * Math.cos(c) - ww * Math.sin(c), z * Math.sin(c) + ww * Math.cos(c)];
    const k = 2.6 / (3.2 - ww);
    P3.push([x * k * esc, y * k * esc, z * k * esc]);
    W4.push(ww);
  }
  // vertices fly in from 16 stars of the sky (staggered), so the vertices literally are stars
  const pos = P3.map((p, i) => {
    const e = ESTRELLAS[(i * 83) % ESTRELLAS.length];
    const u = ss(cl(llegada * 1.6 - (i / 16) * 0.6));
    return [lerp(e[0], p[0], u), lerp(e[1], p[1], u), lerp(e[2], p[2], u)] as V3;
  });
  const colW = (ww: number): RGB => mix3([0.2, 0.85, 1.0], [1.0, 0.25, 0.85], cl((ww + 1.4) / 2.8));
  const aE = cl(llegada * 1.4 - 0.4);
  for (const [i, j] of ARISTAS) {
    const pts: V3[] = [];
    for (let k = 0; k <= 10; k++) {
      const u = (k / 10) * aE;
      pts.push([lerp(pos[i][0], pos[j][0], u), lerp(pos[i][1], pos[j][1], u), lerp(pos[i][2], pos[j][2], u)]);
    }
    T.linea(pts, (k) => colW(lerp(W4[i], W4[j], k / 10)), w * (0.9 + 0.7 * M.kick), 2.0);
  }
  pos.forEach((p, i) => estrella(T, p, colW(W4[i]), w * (1.2 + 0.8 * M.hat * hash(i + Math.floor(M.t * 8))), 5, cam));
};

// ═══ Spacetime mesh: a grid sinking into a well (bass deepens it), kicks send gravitational ripples ═══
export const malla = (T: Trazos, opts: { masa: number; n: number; kicks: Onset[]; t: number; ext?: number; color?: RGB; brillo?: number; masas?: [number, number, number][] }, w: number, M: Musica) => {
  const ext = opts.ext ?? 4.2;
  const masas = opts.masas ?? [[0, 0, opts.masa]];
  const y = (x: number, z: number) => {
    let h = 0;
    for (const [mx, mz, mm] of masas) h -= mm / Math.sqrt((x - mx) ** 2 + (z - mz) ** 2 + 0.09);
    const r = Math.hypot(x, z);
    for (const k of opts.kicks) {
      const age = opts.t - k.t;
      if (age < 0 || age > 2.2) continue;
      const R = age * 2.6;
      h += 0.16 * k.v * Math.exp(-(((r - R) / 0.28) ** 2)) * Math.exp(-age * 1.4) * Math.cos((r - R) * 9);
    }
    return Math.max(h, -2.6);
  };
  const col = opts.color ?? [0.25, 0.5, 1.0];
  const br = (opts.brillo ?? 1) * (0.8 + 0.5 * M.bass);
  const n = opts.n;
  const R = 110;
  for (let d = 0; d < 2; d++)
    for (let i = 0; i <= n; i++) {
      const c = lerp(-ext, ext, i / n);
      const pts: V3[] = [];
      const al: number[] = [];
      for (let k = 0; k <= R; k++) {
        const s = lerp(-ext, ext, k / R);
        const x = d ? c : s, z = d ? s : c;
        const yy = y(x, z);
        pts.push([x, yy, z]);
        const r = Math.hypot(x, z);
        al.push(cl(1.15 - r / ext) * (0.5 + 0.9 * cl(-yy * 0.6)));
      }
      T.linea(pts, (k) => mix3(col, [0.75, 0.9, 1.0], cl(-pts[k][1] * 0.45)), (k) => w * br * al[k] * 0.9, 1.3);
    }
};

// ═══ Field lines of a dipole (+q at x = −1, −q at x = +1), revolved around the axis: lines emerge from +q ═══
const LINEAS_DIPOLO: [number, number][][] = (() => {
  const campo = (x: number, y: number): [number, number] => {
    let ex = 0, ey = 0;
    for (const [qx, q] of [[-1, 1], [1, -1]]) {
      const dx = x - qx, dy = y;
      const r3 = Math.pow(dx * dx + dy * dy + 1e-6, 1.5);
      ex += (q * dx) / r3;
      ey += (q * dy) / r3;
    }
    const m = Math.hypot(ex, ey) + 1e-12;
    return [ex / m, ey / m];
  };
  const out: [number, number][][] = [];
  const NL = 18;
  for (let k = 0; k < NL; k++) {
    const a = ((k + 0.5) / NL) * Math.PI; // upper half (revolved later)
    let x = -1 + 0.04 * Math.cos(a), y = 0.04 * Math.sin(a);
    const pts: [number, number][] = [[x, y]];
    for (let i = 0; i < 900; i++) {
      const [ax, ay] = campo(x, y);
      const [bx, by] = campo(x + 0.01 * ax, y + 0.01 * ay);
      x += 0.02 * bx;
      y += 0.02 * by;
      pts.push([x, y]);
      if (Math.hypot(x - 1, y) < 0.04 || Math.abs(x) > 5 || Math.abs(y) > 5) break;
    }
    // keep every 3rd point
    out.push(pts.filter((_, i) => i % 3 === 0 || i === pts.length - 1));
  }
  return out;
})();
export const lineasCampo = (T: Trazos, opts: { crece: number; planos: number; kicks: Onset[]; t: number; giro: number; esc: number }, w: number, M: Musica) => {
  const { crece, planos, t, giro, esc } = opts;
  for (let pl = 0; pl < planos; pl++) {
    const phi = (pl / planos) * TAU + giro;
    const c = Math.cos(phi), s = Math.sin(phi);
    LINEAS_DIPOLO.forEach((L, li) => {
      // each line appears with a stagger (more lines with every snare: crece is a count)
      const vis = cl(crece - (li * 0.37 + pl * 0.53) % 3);
      if (vis <= 0) return;
      const n = Math.max(2, Math.floor(L.length * eOut(vis)));
      const pts: V3[] = [];
      for (let i = 0; i < n; i++) pts.push([L[i][0] * esc, L[i][1] * s * esc, L[i][1] * c * esc]);
      const largo = L.length;
      T.linea(
        pts,
        (i) => mix3([1.0, 0.55, 0.18], [0.3, 0.55, 1.0], i / largo),
        (i) => {
          const u = i / largo;
          let pul = 0;
          for (const k of opts.kicks) {
            const age = t - k.t;
            if (age < 0 || age > 1.2) continue;
            pul += k.v * Math.exp(-(((u - age * 1.1) / 0.05) ** 2)) * 3.0;
          }
          return w * (0.32 + pul) * (0.7 + 0.6 * M.bass);
        },
        1.3,
      );
    });
  }
  // the charges
  T.punto([-esc, 0, 0], [1.0, 0.7, 0.35], w * (2.2 + 2 * M.kick), 7);
  T.punto([-esc, 0, 0], [1.0, 0.45, 0.1], w * 1.0, 26);
  T.punto([esc, 0, 0], [0.5, 0.7, 1.0], w * (2.2 + 2 * M.kick), 7);
  T.punto([esc, 0, 0], [0.2, 0.4, 1.0], w * 1.0, 26);
};

// ═══ Lorenz (σ = 10, ρ = 28, β = 8/3), RK4: the trajectory traces itself (same mapping as the particle form) ═══
const LZ = (() => {
  const n = 9000, dt = 0.004;
  const out = new Float32Array(n * 3);
  let x = 0.1, y = 0, z = 0;
  const f = (x: number, y: number, z: number) => [10 * (y - x), x * (28 - z) - y, x * y - (8 / 3) * z];
  for (let i = 0; i < 800; i++) {
    const d = f(x, y, z);
    x += d[0] * dt; y += d[1] * dt; z += d[2] * dt;
  }
  for (let i = 0; i < n; i++) {
    out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
    const k1 = f(x, y, z);
    const k2 = f(x + (dt / 2) * k1[0], y + (dt / 2) * k1[1], z + (dt / 2) * k1[2]);
    const k3 = f(x + (dt / 2) * k2[0], y + (dt / 2) * k2[1], z + (dt / 2) * k2[2]);
    const k4 = f(x + dt * k3[0], y + dt * k3[1], z + dt * k3[2]);
    x += (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    y += (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    z += (dt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
  }
  return out;
})();
export const lorenzTrazo = (T: Trazos, cabeza: number, largo: number, rot: number, w: number, M: Musica) => {
  const h = Math.min(LZ.length / 3 - 1, Math.floor(cabeza));
  const a = Math.max(0, h - largo);
  const c = Math.cos(rot), s = Math.sin(rot);
  const pts: V3[] = [];
  const lob: number[] = [];
  for (let i = a; i <= h; i += 2) {
    const x = LZ[i * 3] / 20, y = (LZ[i * 3 + 2] - 25) / 20, z = LZ[i * 3 + 1] / 20;
    const q: V3 = [x * 1.65, y * 1.65, z * 1.65];
    pts.push([q[0] * c - q[2] * s, q[1], q[0] * s + q[2] * c]);
    lob.push(cl(0.5 + LZ[i * 3] * 0.08));
  }
  const N = pts.length;
  T.linea(pts, (i) => mix3([1.0, 0.45, 0.08], [1.0, 0.12, 0.6], lob[i]), (i) => w * (0.15 + 1.5 * Math.pow(i / N, 3)) * (1 + 0.7 * M.kick), 2.0);
  if (N) {
    T.punto(pts[N - 1], [1, 0.95, 0.85], w * 2.5, 5);
    T.punto(pts[N - 1], [1.0, 0.4, 0.2], w * 1.2, 18);
  }
  return N ? pts[N - 1] : ([0, 0, 0] as V3);
};

// ═══ Neural network with activations: forward passes on every kick (same node layout as the particle form) ═══
const NCAPA = [6, 10, 14, 14, 10, 6];
export const nodoRed = (l: number, j: number): V3 => {
  const n = NCAPA[l];
  const x = (l - 2.5) * 1.15;
  const rr = 0.25 + 1.05 * Math.sqrt((j + 0.5) / n);
  const a = j * 2.39996323 + l * 0.7;
  return [x, rr * Math.cos(a), rr * Math.sin(a)];
};
export const red = (T: Trazos, kicks: Onset[], t: number, w: number, M: Musica) => {
  const PASO = 0.085;
  // edges
  for (let l = 0; l < 5; l++)
    for (let a = 0; a < NCAPA[l]; a++)
      for (let b = 0; b < NCAPA[l + 1]; b++) {
        const A = nodoRed(l, a), Bn = nodoRed(l + 1, b);
        T.seg(A, Bn, [1.0, 0.3, 0.22], 0.07 * w, [1.0, 0.3, 0.22], 0.07 * w, 1.0, 0);
      }
  const brillo = new Map<string, number>();
  for (let ki = 0; ki < kicks.length; ki++) {
    const k = kicks[ki];
    const age = t - k.t;
    if (age < 0 || age > PASO * 7) continue;
    for (let l = 0; l < 5; l++) {
      const u = (age - l * PASO) / PASO;
      if (u < -0.2 || u > 1.6) continue;
      for (let a = 0; a < NCAPA[l]; a++)
        for (let b = 0; b < NCAPA[l + 1]; b++) {
          if (hash(ki * 31.7 + l * 7.1 + a * 1.3 + b * 0.77) > 0.42) continue;
          const A = nodoRed(l, a), Bn = nodoRed(l + 1, b);
          const uu = cl(u);
          const p: V3 = [lerp(A[0], Bn[0], uu), lerp(A[1], Bn[1], uu), lerp(A[2], Bn[2], uu)];
          const q0 = cl(uu - 0.25);
          const p0: V3 = [lerp(A[0], Bn[0], q0), lerp(A[1], Bn[1], q0), lerp(A[2], Bn[2], q0)];
          const al = w * k.v * (u > 1 ? Math.max(0, 1 - (u - 1) * 2) : 1);
          T.seg(p0, p, [1.0, 0.6, 0.2], 0.1 * al, [1.0, 0.85, 0.5], 1.6 * al, 1.6, 2);
          if (u > 0.9) {
            const key = `${l + 1}|${b}`;
            brillo.set(key, Math.max(brillo.get(key) ?? 0, k.v * Math.exp(-(age - (l + 1) * PASO) * 6)));
          }
        }
    }
    for (let a = 0; a < NCAPA[0]; a++) brillo.set(`0|${a}`, Math.max(brillo.get(`0|${a}`) ?? 0, k.v * Math.exp(-age * 6)));
  }
  for (let l = 0; l < 6; l++)
    for (let j = 0; j < NCAPA[l]; j++) {
      const b = brillo.get(`${l}|${j}`) ?? 0;
      const p = nodoRed(l, j);
      T.punto(p, mix3([1.0, 0.35, 0.25], [1.0, 0.92, 0.7], b), w * (0.6 + 2.8 * b), 6 + 6 * b);
    }
};

// ═══ Galton board: balls released on hats and kicks take ±½ steps through 12 rows; bins build the binomial bell ═══
export const galton = (T: Trazos, m: Marco, sueltas: Onset[], t: number, a0: number, w: number, M: Musica) => {
  const FILAS = 12, dx = 0.16, dy = 0.15, top = 1.55, DT = 0.042;
  for (let f = 0; f < FILAS; f++)
    for (let k = 0; k <= f; k++) T.punto(P(m, (k - f / 2) * dx * 2, top - f * dy), [0.55, 0.7, 1.0], 0.55 * w, 3.2);
  const fondo = top - FILAS * dy - 0.12;
  const pila = new Array(FILAS + 1).fill(0);
  let id = 0;
  for (const s of sueltas) {
    if (s.t < a0 || s.t > t) continue;
    const nb = 4 + Math.round(8 * s.v);
    for (let b = 0; b < nb; b++, id++) {
      const tb = s.t + b * 0.018;
      if (t < tb) continue;
      const camino: number[] = Array.from({ length: FILAS }, (_, f) => (hash(id * 97.1 + f * 3.3) < 0.5 ? 0 : 1));
      const pasos = (t - tb) / DT;
      if (pasos >= FILAS) {
        const bin = camino.reduce((x, c) => x + c, 0);
        const h = pila[bin]++;
        const fresco = Math.exp(-(pasos - FILAS) * DT * 5);
        T.punto(P(m, (bin - FILAS / 2) * dx * 2 + ((h % 3) - 1) * 0.045, fondo - 1.05 + Math.floor(h / 3) * 0.05), mix3([0.3, 0.55, 1.0], [1, 1, 1], fresco), w * (0.9 + fresco), 5.5);
        continue;
      }
      const f = Math.floor(pasos), fr = pasos - f;
      const x0 = camino.slice(0, f).reduce((x, c) => x + c, 0) - f / 2;
      const x1 = x0 + (camino[f] ? 0.5 : -0.5);
      const X = lerp(x0, x1, fr) * dx * 2;
      const Y = top + dy * 0.6 - (f + fr) * dy + Math.sin(Math.PI * fr) * dy * 0.45;
      T.punto(P(m, X, Y), [1, 1, 1], w * 1.8, 5);
      T.punto(P(m, X, Y), [0.4, 0.65, 1.0], w * 0.5, 13);
    }
  }
  // bins walls
  for (let b = 0; b <= FILAS + 1; b++) T.seg(P(m, (b - 0.5 - FILAS / 2) * dx * 2, fondo), P(m, (b - 0.5 - FILAS / 2) * dx * 2, fondo - 1.1), [0.3, 0.45, 0.9], 0.25 * w, [0.3, 0.45, 0.9], 0.05 * w, 1.0, 0);
  // the theoretical bell (binomial ≈ normal), scaled to the balls already landed
  const total = pila.reduce((a, b) => a + b, 0);
  if (total > 8) {
    const sig = Math.sqrt(FILAS / 4);
    const pts: V3[] = [];
    for (let i = 0; i <= 100; i++) {
      const xb = (i / 100) * FILAS;
      const dens = Math.exp(-((xb - FILAS / 2) ** 2) / (2 * sig * sig)) / (sig * Math.sqrt(TAU));
      pts.push(P(m, (xb - FILAS / 2) * dx * 2, fondo - 1.05 + (dens * total * 0.05) / 3 + 0.03));
    }
    T.linea(pts, [1.0, 0.75, 0.3], w * (0.8 + 1.2 * M.snare), 2.4);
  }
};

// ═══ Double slit: I(y) ∝ cos²(π d y / λL) · sinc²(π a y / λL); impacts arrive in bursts on every hat ═══
const IMPACTOS = (() => {
  const M = 700;
  const cdf: number[] = [];
  let acc = 0;
  for (let i = 0; i < M; i++) {
    const y = (i / (M - 1)) * 2 - 1;
    const b = 9 * y;
    const sinc = Math.abs(y) < 1e-6 ? 1 : Math.sin(2.2 * y * Math.PI) / (2.2 * y * Math.PI);
    acc += Math.cos(b * Math.PI) ** 2 * sinc * sinc;
    cdf.push(acc);
  }
  return Array.from({ length: 3000 }, (_, k) => {
    const u = hash(k * 1.37 + 5) * acc;
    let i = 0;
    while (cdf[i] < u) i++;
    return { y: (i / (M - 1)) * 2 - 1 + (hash(k * 2.9) - 0.5) * 0.004, x: hash(k * 4.1) };
  });
})();
export const rendija = (T: Trazos, m: Marco, golpes: Onset[], t: number, a0: number, w: number, M: Musica) => {
  const xb = -1.2, xs = 1.5, H = 1.7, sep = 0.16, hueco = 0.05;
  const muro = [0.65, 0.75, 1.0] as RGB;
  for (const [y0, y1] of [[H, sep + hueco], [sep - hueco, -sep + hueco], [-sep - hueco, -H]]) T.seg(P(m, xb, y0), P(m, xb, y1), muro, 0.8 * w, muro, 0.8 * w, 2.4, 3);
  T.seg(P(m, xs, H), P(m, xs, -H), [0.4, 0.55, 1.0], 0.22 * w, [0.4, 0.55, 1.0], 0.22 * w, 1.2, 3);
  // plane wave arriving from the left and circular fronts from both slits, one per kick/hat
  for (const g of golpes) {
    if (g.t < a0 - 1.2 || g.t > t) continue;
    const age = t - g.t;
    const xp = -3 + age * 2.4;
    if (xp < xb) T.seg(P(m, xp, H * 0.8), P(m, xp, -H * 0.8), [0.5, 0.7, 1.0], 0.5 * w * g.v, [0.5, 0.7, 1.0], 0.5 * w * g.v, 1.4, 3);
    const r = (age - (xb + 3) / 2.4) * 2.4;
    if (r > 0 && r < xs - xb + 0.2)
      for (const yy of [sep, -sep]) {
        const pts: V3[] = [];
        for (let i = 0; i <= 50; i++) {
          const a = lerp(-1.25, 1.25, i / 50);
          const x = xb + r * Math.cos(a), y = yy + r * Math.sin(a);
          if (x > xs) continue;
          pts.push(P(m, x, y));
        }
        T.linea(pts, [0.45, 0.75, 1.0], 0.55 * w * g.v * (1 - r / (xs - xb + 0.2)), 1.3);
      }
  }
  // impacts
  let k = 0;
  for (const g of golpes) {
    if (g.t < a0 - 1.0 || g.t > t) continue;
    const nb = Math.round(40 + 120 * g.v);
    for (let j = 0; j < nb && k < IMPACTOS.length; j++, k++) {
      const im = IMPACTOS[k];
      const age = t - g.t - 0.05 * hash(k);
      if (age < 0) continue;
      const fresco = Math.exp(-age * 4);
      T.punto(P(m, xs + 0.02 + im.x * 0.38, im.y * H * 0.92), mix3([0.25, 0.5, 1.0], [1, 1, 1], fresco), w * (0.5 + 1.6 * fresco), 2.8 + 3 * fresco);
    }
  }
};

// ═══ Ulam spiral: integers on a square spiral, primes light up ═══
const NU = 6000;
const PRIMO = (() => {
  const c = new Uint8Array(NU + 2).fill(1);
  c[0] = c[1] = 0;
  for (let i = 2; i * i <= NU + 1; i++) if (c[i]) for (let j = i * i; j <= NU + 1; j += i) c[j] = 0;
  return c;
})();
const ULAM: [number, number][] = (() => {
  const out: [number, number][] = [[0, 0]];
  let x = 0, y = 0, paso = 1, dir = 0;
  const D = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  while (out.length < NU) {
    for (let r = 0; r < 2; r++) {
      for (let s = 0; s < paso; s++) {
        x += D[dir][0];
        y += D[dir][1];
        out.push([x, y]);
      }
      dir = (dir + 1) % 4;
    }
    paso++;
  }
  return out;
})();
export const ulam = (T: Trazos, m: Marco, n: number, w: number, M: Musica) => {
  const g = 0.031;
  const N = Math.min(NU - 1, Math.floor(n));
  for (let i = 1; i < N; i++) {
    if (!PRIMO[i + 1]) continue;
    const [x, y] = ULAM[i];
    const nuevo = cl((i - (N - 300)) / 300);
    T.punto(P(m, x * g, y * g), mix3([0.3, 0.55, 1.0], [1.0, 0.95, 0.85], nuevo), w * (1.3 + 1.4 * nuevo) * (1 + 0.5 * M.kick), 1.9 + 1.5 * nuevo);
  }
  const pts: V3[] = [];
  for (let i = Math.max(0, N - 220); i <= N; i++) pts.push(P(m, ULAM[i][0] * g, ULAM[i][1] * g));
  T.linea(pts, [0.5, 0.7, 1.0], (i) => w * 0.7 * (i / pts.length) ** 2, 1.3);
  T.punto(pts[pts.length - 1], [1, 1, 1], w * 2, 6);
};

// ═══ Golden spiral: Fibonacci-like squares of a golden rectangle; zooming by φ per beat is self-similar ═══
const PHI = (1 + Math.sqrt(5)) / 2;
const AUREA = (() => {
  let x = 0, y = 0, W = PHI, H = 1;
  const cuadros: { x: number; y: number; s: number; d: number }[] = [];
  for (let i = 0; i < 40; i++) {
    const d = i % 4;
    if (d === 0) { cuadros.push({ x, y, s: H, d }); x += H; W -= H; }
    else if (d === 1) { cuadros.push({ x, y: y + H - W, s: W, d }); H -= W; }
    else if (d === 2) { cuadros.push({ x: x + W - H, y, s: H, d }); W -= H; }
    else { cuadros.push({ x, y, s: W, d }); y += W; H -= W; }
  }
  const c: [number, number] = [x + W / 2, y + H / 2];
  return { cuadros, c };
})();
export const aurea = (T: Trazos, m: Marco, zoom: number, w: number, M: Musica) => {
  const { cuadros, c } = AUREA;
  // view: scale φ^zoom about the limit point, rotate by zoom·90° (one step of the self-similarity)
  const k = Math.pow(PHI, zoom) * 1.25;
  const a = zoom * (Math.PI / 2);
  const tr = (x: number, y: number): V3 => {
    const X = (x - c[0]) * k, Y = (y - c[1]) * k;
    return P(m, X * Math.cos(a) - Y * Math.sin(a), X * Math.sin(a) + Y * Math.cos(a));
  };
  cuadros.forEach((q, i) => {
    const sz = q.s * k;
    if (sz < 0.01 || sz > 30) return;
    const al = w * cl(sz / 0.05) * cl(8 / sz);
    T.linea([tr(q.x, q.y), tr(q.x + q.s, q.y), tr(q.x + q.s, q.y + q.s), tr(q.x, q.y + q.s)], [0.35, 0.5, 1.0], 0.35 * al, 1.2, true);
    // quarter arc: centre at the corner shared with the next square
    const cen: [number, number] = q.d === 0 ? [q.x + q.s, q.y + q.s] : q.d === 1 ? [q.x, q.y + q.s] : q.d === 2 ? [q.x, q.y] : [q.x + q.s, q.y];
    const a0 = q.d === 0 ? Math.PI : q.d === 1 ? 1.5 * Math.PI : q.d === 2 ? 0 : 0.5 * Math.PI;
    const pts: V3[] = [];
    for (let j = 0; j <= 24; j++) {
      const an = a0 + (j / 24) * (Math.PI / 2);
      pts.push(tr(cen[0] + q.s * Math.cos(an), cen[1] + q.s * Math.sin(an)));
    }
    T.linea(pts, mix3([1.0, 0.72, 0.25], [1.0, 0.95, 0.8], cl(1 - i / 30)), al * (1.2 + 0.8 * M.kick), 2.4);
  });
};

// ═══ Dijkstra on a grid with walls: the distance front expands step by step, then the shortest path lights ═══
const DJ = (() => {
  const C = 22, F = 26;
  const muro = (i: number, j: number) => hash(i * 31 + j * 7.7) < 0.24 && !(i < 2 && j < 2) && !(i > C - 3 && j > F - 3);
  const dist = new Array(C * F).fill(Infinity);
  const prev = new Array(C * F).fill(-1);
  const cola = [0];
  dist[0] = 0;
  while (cola.length) {
    cola.sort((a, b) => dist[a] - dist[b]);
    const u = cola.shift()!;
    const i = u % C, j = Math.floor(u / C);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= C || nj >= F || muro(ni, nj)) continue;
      const v = nj * C + ni;
      if (dist[u] + 1 < dist[v]) { dist[v] = dist[u] + 1; prev[v] = u; cola.push(v); }
    }
  }
  let fin = C * F - 1;
  while (dist[fin] === Infinity) fin--;
  const camino: number[] = [];
  for (let v = fin; v >= 0; v = prev[v]) camino.unshift(v);
  return { C, F, muro, dist, camino, dmax: dist[fin] as number };
})();
export const dijkstra = (T: Trazos, m: Marco, frente: number, camino: number, w: number, M: Musica) => {
  const { C, F, muro, dist, camino: cm } = DJ;
  const g = 0.135;
  const X = (i: number) => (i - (C - 1) / 2) * g, Y = (j: number) => ((F - 1) / 2 - j) * g;
  const fr = frente * DJ.dmax;
  for (let j = 0; j < F; j++)
    for (let i = 0; i < C; i++) {
      if (muro(i, j)) {
        const h = g * 0.36;
        T.linea([P(m, X(i) - h, Y(j) - h), P(m, X(i) + h, Y(j) - h), P(m, X(i) + h, Y(j) + h), P(m, X(i) - h, Y(j) + h)], [0.25, 0.3, 0.7], 0.3 * w, 1.0, true);
        continue;
      }
      const d = dist[j * C + i];
      const borde = d <= fr && fr - d < 1.5;
      const a = d <= fr ? (borde ? 1.8 : 0.5) : 0.12;
      T.punto(P(m, X(i), Y(j)), borde ? [1, 1, 1] : mix3([0.2, 0.9, 0.8], [0.3, 0.5, 1.0], d / DJ.dmax), w * a * (borde ? 1 + M.hat : 1), borde ? 6 : 3.5);
    }
  if (camino > 0) {
    const n = Math.max(2, Math.round(cm.length * camino));
    const pts = cm.slice(0, n).map((v) => P(m, X(v % C), Y(Math.floor(v / C))));
    T.linea(pts, [1.0, 0.8, 0.35], w * (1.6 + M.kick), 3.2);
  }
};

// ═══ Light cone (c = 1): past and future cones, a world line and light shells from events on every kick ═══
export const cono = (T: Trazos, kicks: Onset[], t: number, w: number, M: Musica) => {
  const H = 1.7;
  for (const sg of [1, -1]) {
    for (let r = 1; r <= 6; r++) {
      const h = (r / 6) * H;
      const pts: V3[] = [];
      for (let i = 0; i < 72; i++) pts.push([h * Math.cos((i / 72) * TAU), sg * h, h * Math.sin((i / 72) * TAU)]);
      T.linea(pts, sg > 0 ? [0.4, 0.75, 1.0] : [0.65, 0.45, 1.0], w * (0.25 + 0.06 * r), 1.2, true);
    }
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      T.seg([0, 0, 0], [H * Math.cos(a), sg * H, H * Math.sin(a)], [0.5, 0.7, 1.0], 0.5 * w, [0.5, 0.7, 1.0], 0.1 * w, 1.0, 0);
    }
  }
  // light shells: a ring climbing the future cone from the apex at every kick
  for (const k of kicks) {
    const age = t - k.t;
    if (age < 0 || age > 1.1) continue;
    const h = age * 1.8;
    if (h > H) continue;
    const pts: V3[] = [];
    for (let i = 0; i < 90; i++) pts.push([h * Math.cos((i / 90) * TAU), h, h * Math.sin((i / 90) * TAU)]);
    T.linea(pts, [1, 0.95, 0.85], w * k.v * 2.2 * (1 - h / H), 2.4, true);
  }
  // world line inside the cone (timelike: slope < 1)
  const mundo: V3[] = [];
  for (let i = -40; i <= 40; i++) {
    const s = (i / 40) * H;
    mundo.push([0.38 * Math.sin(s * 2.1) * Math.abs(s) * 0.6, s, 0.25 * Math.cos(s * 1.7) * Math.abs(s) * 0.5]);
  }
  T.linea(mundo, [1.0, 0.75, 0.3], w * 1.4, 2.6);
  T.punto([0, 0, 0], [1, 1, 1], w * (2.5 + 2 * M.kick), 7);
  T.punto([0, 0, 0], [0.5, 0.7, 1.0], w * 1.2, 30);
};

// ═══ Three bodies: Chenciner–Montgomery figure-eight (G = m = 1), velocity Verlet ═══
const TRES = (() => {
  const dt = 0.002, pasos = 3200;
  let q = [[0.97000436, -0.24308753], [-0.97000436, 0.24308753], [0, 0]];
  const v3 = [-0.93240737, -0.86473146];
  let v = [[-v3[0] / 2, -v3[1] / 2], [-v3[0] / 2, -v3[1] / 2], v3];
  const acc = (q: number[][]) => q.map((qi, i) => {
    let ax = 0, ay = 0;
    q.forEach((qj, j) => {
      if (i === j) return;
      const dx = qj[0] - qi[0], dy = qj[1] - qi[1];
      const r3 = Math.pow(dx * dx + dy * dy, 1.5);
      ax += dx / r3; ay += dy / r3;
    });
    return [ax, ay];
  });
  const out: number[][][] = [];
  for (let s = 0; s < pasos; s++) {
    out.push(q.map((x) => [...x]));
    const a0 = acc(q);
    q = q.map((qi, i) => [qi[0] + v[i][0] * dt + 0.5 * a0[i][0] * dt * dt, qi[1] + v[i][1] * dt + 0.5 * a0[i][1] * dt * dt]);
    const a1 = acc(q);
    v = v.map((vi, i) => [vi[0] + 0.5 * (a0[i][0] + a1[i][0]) * dt, vi[1] + 0.5 * (a0[i][1] + a1[i][1]) * dt]);
  }
  return out;
})();
export const tres = (T: Trazos, m: Marco, k: number, w: number, M: Musica) => {
  const N = TRES.length;
  const cols: RGB[] = [[1.0, 0.6, 0.15], [0.25, 0.85, 1.0], [1.0, 0.25, 0.75]];
  for (let b = 0; b < 3; b++) {
    const pts: V3[] = [];
    const kk = Math.floor(k);
    for (let s = kk - 1100; s <= kk; s += 4) {
      const i = ((s % N) + N) % N;
      pts.push(P(m, TRES[i][b][0], TRES[i][b][1], 0.08 * Math.sin(s * 0.004 + b * 2)));
    }
    const n = pts.length;
    T.linea(pts, cols[b], (i) => w * (0.05 + 1.5 * Math.pow(i / n, 2.5)) * (1 + 0.6 * M.kick), 2.4);
    T.punto(pts[n - 1], [1, 1, 1], w * (2.2 + 2 * M.kick), 6);
    T.punto(pts[n - 1], cols[b], w * 1.0, 24);
  }
};

// ═══ Lissajous knot in 3D: (cos(nx s + φx), cos(ny s + φy), cos(nz s)) with spectral colour; snares morph it ═══
export const nudo = (T: Trazos, fa: [number, number, number], fb: [number, number, number], x: number, esc: number, fase: number, w: number, M: Musica) => {
  const f = [lerp(fa[0], fb[0], x), lerp(fa[1], fb[1], x), lerp(fa[2], fb[2], x)];
  const N = 900;
  const pts: V3[] = [];
  for (let i = 0; i < N; i++) {
    const s = (i / N) * TAU;
    pts.push([Math.cos(f[0] * s + 0.7) * esc, Math.cos(f[1] * s + 0.2) * esc, Math.cos(f[2] * s) * esc]);
  }
  const cab = Math.floor(((fase / TAU) % 1) * N);
  T.linea(pts, (i) => espectro(400 + 300 * ((i / N + fase * 0.05) % 1)), (i) => {
    const d = (((cab - i) % N) + N) % N;
    return w * (0.35 + 1.6 * Math.exp(-d / 90)) * (1 + 0.6 * M.kick);
  }, 2.0, true);
};
