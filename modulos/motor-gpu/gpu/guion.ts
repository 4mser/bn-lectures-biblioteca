// Timeline of the GPU body (0 s to the start of the approved final): a pure function of t that maps the REAL music
// analysis (src/ritmo.json) to camera, worlds, particle forms, strokes and grade.
//
// Audiovisual mapping (consistent in every shot):
//   kick  (onsetsBombo)  -> scale pulse of the subject, camera push, shockwave ring, bloom pulse
//   snare (onsetsCaja)   -> fractures / subdivisions / shape changes, colour flash, chromatic aberration
//   hats  (onsetsHats)   -> sparks, twinkles, fine shimmer of particles
//   bass  (graves curve) -> slow deformation (mesh curvature, well depth, lens), exposure follows it
//   RMS                  -> density, flow speed (musical time) and saturation
//   downbeats            -> world changes (one per bar, then per half bar, then per beat)
//   fills and risers     -> camera acceleration
import {
  B, BOMBO, CAJA, CALMA, COMPAS, DROP, HATS, PULSO, T_FINAL, aceleracion, cuenta, curva, curvaSuave, env, onsetsEntre, tauMusical,
} from "../ritmo";
import type { MundoId } from "./glsl/mundos";
import type { Uniformes } from "./motor";
import * as S from "./sims";
import { Trazos, type RGB, type V3 } from "./trazos";

const cl = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const pr = (t: number, a: number, d: number) => cl((t - a) / d);
const ss = (x: number) => x * x * (3 - 2 * x);
const eIO = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const eOut = (x: number) => 1 - Math.pow(1 - cl(x), 3);
const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const H = COMPAS / 2;
// snares on beats 2 and 4 only (the backbeat): used for shape changes that need time to read
const enTiempos = (lista: { t: number; v: number }[], cuales: number[]) =>
  lista.filter((o) => {
    const k = Math.round((o.t - B(0)) / PULSO);
    return cuales.includes(((k % 4) + 4) % 4) && Math.abs(o.t - (B(0) + k * PULSO)) < 0.12;
  });
const BACKBEAT = enTiempos(CAJA, [1, 3]);
const KICKS = BOMBO.filter((o) => o.v >= 0.45);
const FUERTES = BOMBO.filter((o) => o.v >= 0.75);

// Particle forms (glsl/particulas.ts)
const F = { punto: 0, nube: 1, campo: 2, pozo: 3, orbita: 4, ondas: 5, prisma: 6, flujo: 7, lorenz: 8, orbital: 9, adn: 10, red: 11, toro: 12, tunel: 13, dipolo: 14 };

type Cam = { tg: V3; yaw: number; pitch: number; dist: number; fov: number; roll?: number; ap?: number };
type Ctx = { t: number; lt: number; dur: number; w: number; M: S.Musica; T: Trazos; U: Uniformes; mundo: (id: MundoId, peso: number) => void; camR: V3; camU: V3; p: Plano };
type Plano = {
  id: string;
  t0: number;
  t1: number;
  pre?: number; // fade-in before t0 (morphs / match cuts)
  post?: number; // fade-out after t1
  forma?: number; // particle form (undefined: no particles)
  intP?: number;
  neb?: [RGB, RGB];
  acento: RGB;
  expo?: number;
  cam: (lt: number, dur: number) => Cam;
  dibujar: (c: Ctx) => void;
};

// orbit camera helper
const orb = (tg: V3, yaw0: number, vy: number, pitch: number, dist: number, fov = 0.42, extra: Partial<Cam> = {}) => (lt: number): Cam => ({ tg, yaw: yaw0 + vy * lt, pitch, dist, fov, ...extra });

// ── intro epicycle shapes, changed on every backbeat snare ──
const FORMAS: S.Fasor[][] = [
  S.lissajous(2.1, 2.1, 3, 2, Math.PI / 2),
  S.rosa(2.2, 5),
  S.lissajous(2.1, 2.1, 5, 4, Math.PI / 2),
  S.rosa(2.2, 3, 0.4),
  S.lissajous(2.1, 2.1, 3, 4, Math.PI / 4),
  S.rosa(2.2, 7),
  S.lissajous(2.1, 2.1, 5, 6, Math.PI / 2),
];
const ORBITA = S.elipse(1.9, 1.25, 0.6);
const formaIntro = (t: number) => {
  const sn = BACKBEAT.filter((o) => o.t >= B(0) - 0.05 && o.t < B(2));
  let k = 0;
  let x = 0;
  for (let i = 0; i < sn.length; i++)
    if (sn[i].t <= t) {
      k = i + 1;
      x = eOut((t - sn[i].t) / 0.28);
    }
  const A = FORMAS[Math.max(0, k - 1) % FORMAS.length];
  const Bf = FORMAS[k % FORMAS.length];
  let Fz = k === 0 ? FORMAS[0] : S.mezclaFasores(A, Bf, x);
  // bar 2 (energy step + riser): the figure relaxes into an orbit
  Fz = S.mezclaFasores(Fz, ORBITA, eIO(pr(t, B(2), 0.9)));
  return Fz;
};
const marcoPlano: S.Marco = { o: [0, 0, 0], u: [1, 0, 0], v: [0, 0, 1], w: [0, 1, 0], s: 1 }; // the disk plane (xz)

// ── shot list ──
const PLANOS: Plano[] = [];
const agrega = (p: Plano) => PLANOS.push(p);

// INTRO (0 to the drop): epicycles draw Lissajous figures and roses; in bar 2 the figure becomes an orbit, the camera
// descends to the disk plane and the orbit spirals in: at the drop it ignites as the black hole's disk.
agrega({
  id: "epiciclos",
  t0: 0,
  t1: DROP,
  post: 0.5,
  acento: [0.3, 0.5, 1.0],
  cam: (lt) => ({
    tg: [0, 0, 0],
    yaw: 0.25 + 0.06 * lt + 0.9 * eIO(pr(lt, B(2), DROP - B(2))),
    pitch: lerp(1.32, 0.2, eIO(pr(lt, B(2) - 0.4, DROP - B(2) + 0.4))),
    dist: lerp(lerp(7.6, 6.6, pr(lt, 0, B(2))), 4.7, eIO(pr(lt, B(2), DROP - B(2)))),
    fov: 0.42,
  }),
  dibujar: (c) => {
    const { t, M, T } = c;
    const crece = eOut(pr(t, 0.15, 2.2));
    const inspiral = eIO(pr(t, B(2) + 0.6, DROP - B(2) - 0.6));
    const esc = crece * lerp(1, 0.42, inspiral) * (1 + 0.05 * M.kick);
    const m: S.Marco = { ...marcoPlano, s: esc };
    const vel = 3.0 + 6.0 * inspiral;
    const s = 3.2 * tauMusical(t) + 2.2 * vel * inspiral * (t - B(2));
    const sale = 1 - ss(pr(t, DROP - 0.05, 0.3));
    const pen = S.epiciclos(T, m, formaIntro(t), s, c.w * sale, M, { cola: lerp(0.97, 0.5, inspiral), circulos: lerp(1, 0.15, inspiral), completa: 1 - inspiral, brillo: 1 + 0.6 * inspiral });
    S.chispas(T, HATS, t, 0.5, () => pen, [0.5, 0.7, 1.0], c.w * sale, 5, 0.8);
    // the point of light at the centre: breathes in the pickup, dies before the drop
    const I = ss(pr(t, 0.05, 1.6)) * (0.35 + 0.25 * M.bass + 0.4 * M.kick) * (1 - ss(pr(t, B(2), 1.2)));
    c.U.uLuz0 = [0, 0, 0, I];
    c.U.uLuzC0 = [0.65, 0.8, 1.0];
    c.U.uLuzStreak = 0.2;
    if (I > 0.001) c.mundo("luz", 1);
    // the black hole ignites on the drop
    const wh = ss(pr(t, DROP - 0.08, 0.14));
    if (wh > 0) mundoHoyo(c, wh, 1 + 1.2 * Math.exp(-Math.max(0, t - DROP) * 4));
  },
});

const mundoHoyo = (c: Ctx, w: number, extra = 1) => {
  const { U, M } = c;
  U.uRs = 0.2 * (1 + 0.05 * M.bass);
  U.uDiscoIn = 0.62;
  U.uDiscoOut = 2.5;
  U.uHoyoCalor = 0.35 + 0.5 * M.snare;
  U.uHoyoGiro = 1.0;
  U.uHoyoBrillo = (0.6 + 0.4 * M.kick + 0.3 * M.graves) * extra;
  U.uHoyoEstrellas = 0.7 + 1.2 * M.hat;
  c.mundo("hoyo", w);
};

// DROP · one world per bar
agrega({
  id: "hoyo",
  t0: DROP,
  t1: B(4),
  post: 0.3,
  acento: [0.35, 0.6, 1.0],
  cam: (lt) => ({ tg: [0, 0, 0], yaw: 1.15 + 0.16 * lt, pitch: lerp(0.2, 0.13, pr(lt, 0, 2.2)), dist: lerp(4.7, 5.6, eOut(pr(lt, 0, 2.2))), fov: 0.42 }),
  dibujar: (c) => mundoHoyo(c, c.w),
});
agrega({
  id: "malla",
  t0: B(4),
  t1: B(5),
  pre: 0.2,
  forma: F.pozo,
  intP: 0.45,
  acento: [0.2, 0.75, 1.0],
  cam: (lt) => ({ tg: [0, -0.5, 0], yaw: 0.6 + 0.22 * lt, pitch: lerp(0.62, 0.5, pr(lt, 0, 2.2)), dist: lerp(6.0, 6.8, pr(lt, 0, 2.2)), fov: 0.42 }),
  dibujar: (c) => {
    const { t, M, T } = c;
    const sn = cuenta(BACKBEAT, c.p.t0, t, 0.2);
    const n = 20 * Math.pow(2, Math.min(2, Math.floor(sn + 0.5)));
    S.malla(T, { masa: 0.45 + 0.5 * M.bass, n, kicks: onsetsEntre(KICKS, c.p.t0 - 1, t + 0.01), t }, c.w, M);
    T.punto([0, -1.6, 0], [0.7, 0.85, 1.0], c.w * (1.2 + M.kick), 8);
  },
});
agrega({
  id: "campo",
  t0: B(5),
  t1: B(6),
  acento: [1.0, 0.55, 0.2],
  cam: (lt) => ({ tg: [0, 0, 0], yaw: 0.95 + 0.3 * lt, pitch: 0.28, dist: lerp(5.4, 5.9, pr(lt, 0, 2.2)), fov: 0.42 }),
  dibujar: (c) => {
    const { t, M, T } = c;
    const crece = 0.9 + 1.4 * cuenta(BACKBEAT, c.p.t0, t, 0.25) + 0.7 * c.lt;
    S.lineasCampo(T, { crece, planos: 10, kicks: onsetsEntre(KICKS, c.p.t0 - 0.5, t + 0.01), t, giro: 0.15 * c.lt, esc: 1.1 * (1 + 0.04 * M.kick) }, c.w, M);
  },
});
agrega({
  id: "teseracto",
  t0: B(6),
  t1: B(7),
  acento: [1.0, 0.3, 0.85],
  cam: (lt) => ({ tg: [0, 0, 0], yaw: 0.3 + 0.12 * lt, pitch: 0.18, dist: lerp(6.2, 5.6, eOut(pr(lt, 0, 2.2))), fov: 0.42 }),
  dibujar: (c) => {
    const { t, M, T } = c;
    S.cielo(T, c.w * 1.3, M);
    const sn = cuenta(BACKBEAT, c.p.t0, t, 0.22);
    const tau = tauMusical(t);
    S.teseracto(T, [0.75 * tau + 0.7 * sn, 0.45 * tau, 0.3 * tau + 0.35 * sn], 0.95 * (1 + 0.07 * M.kick), c.w, M, pr(c.lt, 0, 0.55), { r: c.camR, u: c.camU });
  },
});
agrega({
  id: "cuadrada",
  t0: B(7),
  t1: B(8),
  acento: [1.0, 0.85, 0.5],
  cam: (lt) => ({ tg: [0.35, 0, 0], yaw: 0.1 - 0.05 * lt, pitch: 0.08, dist: 7.2, fov: 0.42 }),
  dibujar: (c) => {
    const { t, M, T } = c;
    const nArm = Math.min(15, 1.5 + 1.1 * cuenta(HATS.filter((h) => h.v > 0.25), c.p.t0, t, 0.1) + 0.8 * cuenta(KICKS, c.p.t0, t, 0.1));
    const morph = pr(t, B(8) - 0.55, 0.55);
    S.ondaCuadrada(T, nArm, 6.5 * tauMusical(t), c.w, M, morph);
  },
});
agrega({
  id: "prisma",
  t0: B(8),
  t1: B(9),
  forma: F.prisma,
  acento: [1.0, 1.0, 1.0],
  cam: (lt) => ({ tg: [lerp(0.25, 0.7, eOut(pr(lt, 0, 2.2))), -0.15, 0], yaw: lerp(-0.04, 0.45, eIO(pr(lt, 0, 2.2))), pitch: lerp(0.06, 0.16, pr(lt, 0, 2.2)), dist: lerp(7.6, 5.6, eOut(pr(lt, 0, 1.2))), fov: 0.42 }),
  dibujar: (c) => {
    const { U, M } = c;
    U.uPrismaFan = (eIO(pr(c.lt, 0, 0.5)) * 0.6 + 0.4) * (1 + 0.18 * M.snare);
    U.uHaz = (0.45 + 0.3 * M.kick + 0.3 * M.graves) * c.w;
    U.uPrismaGiro = 0;
    c.mundo("prisma", ss(pr(c.lt, -0.05, 0.25)) * c.w);
  },
});
agrega({
  id: "flujo",
  t0: B(9),
  t1: B(10),
  forma: F.flujo,
  neb: [[0.02, 0.05, 0.25], [0.25, 0.02, 0.22]],
  acento: [0.9, 0.3, 1.0],
  cam: (lt) => ({ tg: [0.4, -0.3, 0], yaw: 2.85 - 0.14 * lt, pitch: 0.12, dist: lerp(5.4, 4.8, pr(lt, 0, 2.2)), fov: 0.42 }),
  dibujar: () => {},
});
agrega({
  id: "lorenz",
  t0: B(10),
  t1: B(11),
  forma: F.lorenz,
  neb: [[0.3, 0.07, 0.0], [0.28, 0.0, 0.14]],
  acento: [1.0, 0.4, 0.1],
  cam: (lt) => ({ tg: [0, 0, 0], yaw: 2.5 - 0.35 * lt, pitch: 0.2, dist: lerp(5.0, 4.4, pr(lt, 0, 2.2)), fov: 0.42 }),
  dibujar: (c) => {
    const { t, M, T } = c;
    S.lorenzTrazo(T, 1200 + 900 * (tauMusical(t) - tauMusical(c.p.t0)) * 1.6, 2600, rotLorenz(t), c.w, M);
  },
});
const rotLorenz = (t: number) => 0.35 + 0.22 * tauMusical(t) + 0.4 * cuenta(BACKBEAT, B(10), t, 0.25);

// HALF BARS
const medio = (n: number, k: number) => B(n) + k * H;
agrega({ id: "adn", t0: medio(11, 0), t1: medio(11, 1), forma: F.adn, neb: [[0.0, 0.18, 0.16], [0.0, 0.07, 0.2]], acento: [0.1, 1.0, 0.8], cam: orb([0, 0, 0], 0.35, 0.5, 0.18, 4.4), dibujar: () => {} });
agrega({
  id: "orbital",
  t0: medio(11, 1),
  t1: medio(12, 0),
  forma: F.orbital,
  neb: [[0.12, 0.02, 0.32], [0.03, 0.03, 0.3]],
  acento: [0.7, 0.3, 1.0],
  cam: orb([0, 0, 0], 1.3, 0.45, 0.3, 4.2),
  dibujar: (c) => {
    c.U.uOrbDens = 5.0 * (1 + 0.5 * c.M.kick + 0.3 * c.M.bass);
    c.mundo("orbital", c.w);
  },
});
agrega({
  id: "red",
  t0: medio(12, 0),
  t1: medio(12, 1),
  forma: F.red,
  intP: 0.8,
  neb: [[0.25, 0.04, 0.03], [0.2, 0.1, 0.0]],
  acento: [1.0, 0.75, 0.3],
  cam: orb([0, 0, 0], 0.5, 0.3, 0.2, 5.4),
  dibujar: (c) => S.red(c.T, onsetsEntre([...KICKS, ...BACKBEAT].sort((a, b) => a.t - b.t), c.p.t0 - 0.8, c.t + 0.01), c.t, c.w, c.M),
});
agrega({
  id: "toro",
  t0: medio(12, 1),
  t1: medio(13, 0),
  forma: F.toro,
  neb: [[0.22, 0.03, 0.18], [0.03, 0.12, 0.22]],
  acento: [1.0, 0.4, 0.8],
  cam: orb([0, 0, 0], 0.9, 0.4, 0.62, 4.9),
  dibujar: (c) => {
    c.U.uToroRot = 0.35 * tauMusical(c.t) * 1.4;
    c.U.uToroVidrio = 1 + 0.6 * c.M.kick;
    c.mundo("toro", c.w);
  },
});
const plano2D = (yaw0: number, vy: number, pitch: number, dist: number) => (lt: number): Cam => ({ tg: [0, 0, 0], yaw: yaw0 + vy * lt, pitch, dist, fov: 0.42, ap: 0.01 });
const fondo2D = (c: Ctx) => S.cielo(c.T, 0.35 * c.w, c.M, 700);
agrega({
  id: "galton",
  t0: medio(13, 0),
  t1: medio(13, 1),
  acento: [1.0, 0.75, 0.3],
  cam: plano2D(-0.18, 0.2, 0.05, 6.0),
  dibujar: (c) => {
    fondo2D(c);
    const m = S.marco(0, 0, 0, 1.15 * (1 + 0.04 * c.M.kick), [0, 0.1, 0]);
    S.galton(c.T, m, [...HATS.filter((h) => h.v > 0.35), ...KICKS].sort((a, b) => a.t - b.t), c.t, c.p.t0 - 1.6, c.w, c.M);
  },
});
agrega({
  id: "rendija",
  t0: medio(13, 1),
  t1: medio(14, 0),
  acento: [0.4, 0.75, 1.0],
  cam: plano2D(0.3, -0.25, 0.08, 5.6),
  dibujar: (c) => {
    fondo2D(c);
    const m = S.marco(0, 0, 0, 1.0 * (1 + 0.04 * c.M.kick));
    S.rendija(c.T, m, [...HATS.filter((h) => h.v > 0.35), ...KICKS].sort((a, b) => a.t - b.t), c.t, c.p.t0, c.w, c.M);
  },
});
agrega({
  id: "ulam",
  t0: medio(14, 0),
  t1: medio(14, 1),
  acento: [0.6, 0.8, 1.0],
  cam: (lt) => ({ tg: [0, 0, 0], yaw: 0.1 * lt, pitch: 0.12, dist: lerp(4.6, 6.2, eOut(lt / 1.1)), fov: 0.42 }),
  dibujar: (c) => {
    fondo2D(c);
    const m = S.marco(0.0, 0, 0.15 * c.lt, 1.0 * (1 + 0.05 * c.M.kick));
    S.ulam(c.T, m, 1400 + 3800 * eOut(c.lt / 1.1) + 150 * cuenta(HATS, c.p.t0, c.t, 0.08), c.w, c.M);
  },
});
agrega({
  id: "aurea",
  t0: medio(14, 1),
  t1: medio(15, 0),
  acento: [1.0, 0.75, 0.25],
  cam: plano2D(0, 0.15, 0.1, 5.2),
  dibujar: (c) => {
    fondo2D(c);
    // zoom by φ on every kick: the spiral is self-similar, so the motion is endless
    const z = 1.2 + cuenta(KICKS, c.p.t0 - 0.05, c.t, 0.32);
    S.aurea(c.T, S.marco(0, 0, 0, 1.0), z, c.w, c.M);
  },
});
agrega({
  id: "dijkstra",
  t0: medio(15, 0),
  t1: medio(15, 1),
  acento: [0.2, 1.0, 0.8],
  cam: plano2D(-0.25, 0.25, 0.25, 5.4),
  dibujar: (c) => {
    fondo2D(c);
    const frente = cl(0.15 + 0.06 * cuenta(HATS, c.p.t0, c.t, 0.1) + 0.35 * c.lt);
    S.dijkstra(c.T, S.marco(0, 0, 0, 1.0 * (1 + 0.03 * c.M.kick)), frente, eOut(pr(c.t, c.p.t1 - 0.4, 0.35)), c.w, c.M);
  },
});
agrega({
  id: "cono",
  t0: medio(15, 1),
  t1: medio(16, 0),
  acento: [1.0, 0.8, 0.4],
  cam: orb([0, 0, 0], 0.6, 0.6, 0.32, 5.2),
  dibujar: (c) => {
    fondo2D(c);
    S.cono(c.T, onsetsEntre(KICKS, c.p.t0 - 1.2, c.t + 0.01), c.t, c.w, c.M);
  },
});
agrega({
  id: "tres",
  t0: medio(16, 0),
  t1: medio(16, 1),
  acento: [1.0, 0.6, 0.2],
  cam: plano2D(0.2, -0.2, 0.35, 4.6),
  dibujar: (c) => {
    fondo2D(c);
    S.tres(c.T, S.marco(0, 0, 0, 1.6 * (1 + 0.05 * c.M.kick)), 1400 * tauMusical(c.t), c.w, c.M);
  },
});
agrega({
  id: "nudo",
  t0: medio(16, 1),
  t1: B(17),
  acento: [0.8, 0.5, 1.0],
  cam: orb([0, 0, 0], 0.4, 0.8, 0.25, 5.0),
  dibujar: (c) => {
    fondo2D(c);
    const sn = BACKBEAT.filter((o) => o.t >= c.p.t0 - 0.05 && o.t <= c.t).length;
    const fs: [number, number, number][] = [[3, 2, 5], [3, 4, 7], [5, 4, 3], [2, 3, 7]];
    const ult = BACKBEAT.filter((o) => o.t <= c.t).pop();
    const x = ult ? eOut((c.t - ult.t) / 0.25) : 1;
    S.nudo(c.T, fs[Math.max(0, sn - 1) % 4], fs[sn % 4], sn === 0 ? 0 : x, 1.55 * (1 + 0.05 * c.M.kick), 4 * tauMusical(c.t), c.w, c.M);
  },
});
// bar 17 (fills): one world per beat, recap with acceleration
agrega({
  id: "r-malla",
  t0: B(17),
  t1: B(17) + PULSO,
  forma: F.pozo,
  intP: 0.4,
  acento: [0.2, 0.75, 1.0],
  cam: orb([0, -0.5, 0], 1.6, 0.6, 0.45, 5.6),
  dibujar: (c) => S.malla(c.T, { masa: 0.6 + 0.5 * c.M.bass, n: 48, kicks: onsetsEntre(KICKS, c.p.t0 - 1, c.t + 0.01), t: c.t }, c.w, c.M),
});
agrega({
  id: "r-teseracto",
  t0: B(17) + PULSO,
  t1: B(17) + 2 * PULSO,
  acento: [1.0, 0.3, 0.85],
  cam: orb([0, 0, 0], 0.9, 0.5, 0.3, 4.8),
  dibujar: (c) => {
    S.cielo(c.T, c.w * 0.6, c.M);
    const tau = tauMusical(c.t);
    S.teseracto(c.T, [0.9 * tau, 0.6 * tau, 0.4 * tau], 1.0 * (1 + 0.08 * c.M.kick), c.w, c.M, 1, { r: c.camR, u: c.camU });
  },
});
agrega({
  id: "r-lorenz",
  t0: B(17) + 2 * PULSO,
  t1: B(17) + 3 * PULSO,
  forma: F.lorenz,
  neb: [[0.3, 0.07, 0.0], [0.28, 0.0, 0.14]],
  acento: [1.0, 0.4, 0.1],
  cam: orb([0, 0, 0], 3.6, 0.8, 0.35, 4.0),
  dibujar: (c) => S.lorenzTrazo(c.T, 5200 + 2400 * (c.t - c.p.t0), 2600, rotLorenz(c.t), c.w, c.M),
});
agrega({
  id: "r-epiciclos",
  t0: B(17) + 3 * PULSO,
  t1: B(18),
  acento: [0.3, 0.5, 1.0],
  cam: (lt) => ({ tg: [0, 0, 0], yaw: 0.2 + 0.4 * lt, pitch: 1.0, dist: 6.4, fov: 0.42 }),
  dibujar: (c) => {
    const m: S.Marco = { ...marcoPlano, s: 1.0 * (1 + 0.06 * c.M.kick) };
    const pen = S.epiciclos(c.T, m, S.rosa(2.2, 5), 9 * tauMusical(c.t), c.w, c.M, { completa: 1 });
    S.chispas(c.T, HATS, c.t, c.p.t0 - 0.3, () => pen, [0.5, 0.7, 1.0], c.w, 6);
  },
});
// bars 18-19: Mandelbrot deep zoom, palette changes on every snare, collapses to B&N blue at the calm
agrega({
  id: "fractal",
  t0: B(18),
  t1: CALMA,
  post: 0.6,
  forma: F.tunel,
  intP: 0.7,
  acento: [0.5, 0.6, 1.0],
  cam: () => ({ tg: [0, 0, 0], yaw: 0, pitch: 0, dist: 6, fov: 0.45 }),
  dibujar: (c) => {
    const { t, U, M } = c;
    const tz = 1.6 * (tauMusical(t) - tauMusical(B(18)));
    U.uFracC = [-0.743643887, 0.131825904];
    U.uFracZoom = 1.6 * Math.exp(-tz * 1.15);
    U.uFracRot = 0.25 + (t - B(18)) * 0.12 + cuenta(CAJA, B(18), t, 0.15) * 0.05;
    U.uFracPal = cuenta(CAJA.filter((o) => o.v > 0.5), B(18), t, 0.1);
    U.uFracBrillo = (0.85 + 0.55 * M.kick + 0.2 * M.bass) * lerp(1, 0.55, ss(pr(t, CALMA - 1.2, 1.6)));
    c.mundo("fractal", c.w);
  },
});
// CALM: B&N blue, living background for the credits (slow filaments + a breathing mesh)
agrega({
  id: "calma",
  t0: CALMA,
  t1: T_FINAL + 0.6,
  pre: 0.4,
  forma: F.flujo,
  intP: 0.55,
  acento: [0.2, 0.4, 1.0],
  expo: 0.8,
  cam: (lt) => ({ tg: [0.4, -0.3, 0], yaw: 2.85 - 0.06 * lt, pitch: 0.1, dist: 5.6, fov: 0.42, ap: 0.02 }),
  dibujar: (c) => {
    const m: V3 = [0, -1.8, 0];
    void m;
    S.malla(c.T, { masa: 0.2 + 0.3 * c.M.bass, n: 30, kicks: onsetsEntre(KICKS, c.t - 2.2, c.t + 0.01), t: c.t, ext: 6, brillo: 0.35, color: [0.15, 0.3, 1.0] }, c.w * ss(pr(c.lt, 0, 1.2)), c.M);
  },
});
// meshes of the calm are seen from below the filaments: lower them
PLANOS.sort((a, b) => a.t0 - b.t0);
export const PLAN = PLANOS.map((p) => ({ id: p.id, t0: p.t0, t1: p.t1 }));

// ── camera ──
const fovK = (W: number, H: number) => Math.max(1, H / W);

export type Estado = { comun: Uniformes; mundos: { id: MundoId; peso: number }[]; part: Uniformes & { uPartPeso: number }; post: Uniformes; trazos: Trazos; linGanancia: number };
const TRAZOS = new Trazos(420000);
const INT: Record<number, number> = { 3: 0.8, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 1 };

export const estado = (t: number, W: number, Ht: number): Estado => {
  const M: S.Musica = {
    t,
    kick: env(BOMBO, t, 7),
    snare: env(CAJA, t, 9),
    hat: env(HATS, t, 16),
    bass: curvaSuave("graves", t, 0.25),
    graves: curva("graves", t),
    rms: curvaSuave("rms", t, 0.3),
    agudos: curva("agudos", t),
    tau: tauMusical(t),
  };
  // dominant shot (the camera belongs to it): last one whose t0 <= t
  let iA = 0;
  for (let i = 0; i < PLANOS.length; i++) if (PLANOS[i].t0 <= t + 1e-6) iA = i;
  const pA = PLANOS[iA];
  const c = pA.cam(t - pA.t0, pA.t1 - pA.t0);
  const acel = aceleracion(t) - aceleracion(pA.t0);
  const yaw = c.yaw + 0.35 * acel;
  const pitch = c.pitch;
  const dist = c.dist * (1 - 0.055 * M.kick) * (t < DROP ? 1 : 1 - 0.02 * M.bass);
  const pos: V3 = [c.tg[0] + dist * Math.cos(pitch) * Math.sin(yaw), c.tg[1] + dist * Math.sin(pitch), c.tg[2] - dist * Math.cos(pitch) * Math.cos(yaw)];
  const roll = (c.roll ?? 0) + 0.012 * M.snare * Math.sin(t * 31);
  const fw = norm(sub(c.tg, pos));
  const upW: V3 = [Math.sin(roll), Math.cos(roll), 0];
  const rt = norm(cruz(upW, fw));
  const up = cruz(fw, rt);
  const fov = c.fov * fovK(W, Ht);
  const comun: Uniformes = {
    uRes: [W, Ht],
    uTime: t,
    uCamPos: pos,
    uCamRot: [...rt, ...up, ...fw],
    uFov: fov,
    uFocus: dist,
    uAperture: (c.ap ?? 0.006) * 0.6,
    uNota: M.kick,
    uNotaIdx: 0,
    uAcorde: 0,
    uTAcorde: 0,
    uGolpe: M.kick,
    uSwell: 0,
  };
  const U = comun;
  const mundos: { id: MundoId; peso: number }[] = [];
  const T = TRAZOS;
  T.reset();
  const mundo = (id: MundoId, peso: number) => {
    if (peso <= 0.002) return;
    const e = mundos.find((m) => m.id === id);
    if (e) e.peso = Math.max(e.peso, peso);
    else mundos.push({ id, peso });
  };
  // defaults the worlds need
  U.uLuz0 = [0, 0, 0, 0];
  U.uLuz1 = [0, 0, 0, 0];
  U.uLuz2 = [0, 0, 0, 0];
  U.uLuzC0 = [1, 1, 1];
  U.uLuzC1 = [1, 1, 1];
  U.uLuzC2 = [1, 1, 1];
  U.uLuzStreak = 0.5;
  U.uAnillo = [0, 0];
  // every shot active at t (with its fades) draws
  let neb: [RGB, RGB] | null = null;
  let nebPeso = 0;
  let expo = 1;
  for (const p of PLANOS) {
    const pre = p.pre ?? 0;
    const post = p.post ?? 0.0;
    if (t < p.t0 - pre || t >= p.t1 + post) continue;
    const wi = pre > 0 ? ss(pr(t, p.t0 - pre, pre)) : 1;
    const wo = post > 0 ? 1 - ss(pr(t, p.t1, post)) : t < p.t1 ? 1 : 0;
    const w = wi * wo;
    if (w <= 0.001) continue;
    p.dibujar({ t, lt: t - p.t0, dur: p.t1 - p.t0, w, M, T, U, mundo, camR: rt, camU: up, p });
    if (p.neb && w > nebPeso) {
      neb = p.neb;
      nebPeso = w;
    }
    if (p === pA) expo = p.expo ?? 1;
  }
  if (neb) {
    U.uNebA = neb[0];
    U.uNebB = neb[1];
    U.uNebEsc = 1;
    mundo("nebula", nebPeso * 0.085 * (0.75 + 0.6 * M.bass));
  }

  // ---------- particles: morph between the forms of consecutive shots ----------
  const conForma = (i: number) => PLANOS[i]?.forma;
  const pPrev = PLANOS[iA - 1];
  const pNext = PLANOS[iA + 1];
  let fa = pA.forma ?? -1;
  let fb = fa;
  let mix = 0;
  let intA = pA.intP ?? 1;
  let intB = intA;
  let fade = 1;
  const MPRE = 0.28;
  const MPOST = 0.32;
  // entering the dominant shot (morph from the previous one)
  if (pPrev && t < pA.t0 + MPOST) {
    const ff = conForma(iA - 1) ?? -1;
    if (ff >= 0 && fa >= 0 && ff !== fa) {
      fb = fa;
      fa = ff;
      intB = intA;
      intA = pPrev.intP ?? 1;
      mix = eIO(pr(t, pA.t0 - MPRE, MPRE + MPOST));
    } else if (fa < 0 && ff >= 0) {
      fa = fb = ff;
      intA = intB = pPrev.intP ?? 1;
      fade = 1 - ss(pr(t, pA.t0 - 0.12, 0.16));
    } else if (fa >= 0 && ff < 0) {
      fade = ss(pr(t, pA.t0 - 0.05, 0.3));
    }
  }
  // leaving towards the next shot
  if (pNext && t >= pNext.t0 - MPRE && t < pNext.t0) {
    const fn = pNext.forma ?? -1;
    if (fa >= 0 && fn >= 0 && fn !== fa) {
      fb = fn;
      intB = pNext.intP ?? 1;
      mix = eIO(pr(t, pNext.t0 - MPRE, MPRE + MPOST));
    }
  }
  // leaving towards a shot without particles: they fade just before the cut
  if (pNext && pNext.forma === undefined && fa >= 0 && t >= pNext.t0 - 0.12 && t < pNext.t0) fade *= 1 - ss(pr(t, pNext.t0 - 0.12, 0.16));
  const tieneP = fa >= 0;
  const part: Uniformes & { uPartPeso: number } = {
    uPartPeso: tieneP ? 1 : 0,
    uTime: 2 + 1.25 * M.tau,
    uFormA: Math.max(0, fa),
    uFormB: Math.max(0, fb),
    uMix: mix,
    uPartInt: tieneP ? lerp((INT[fa] ?? 1) * intA, (INT[fb] ?? 1) * intB, mix) * fade * (0.75 + 0.35 * M.hat + 0.2 * M.kick + 0.4 * M.graves) * (0.8 + 0.4 * M.rms) : 0,
    uPartTam: 1.7,
    uCurl: 1.1,
    uStagKey: 0,
    uMixBrillo: -0.6,
    uNPart: 0,
    uNotas: (() => {
      const r = KICKS.filter((k) => k.t <= t).slice(-4).map((k) => k.t);
      while (r.length < 4) r.unshift(-100);
      return r.reverse();
    })(),
    uNube: [1.0, 0.0],
    uOrb: [2.3, 0.5, 1.25, 0.55],
    uOrbT0: 10,
    uOrbTail: 1,
    uOrbInc: 0.22,
    uOnd: [0, 0, 1, 0],
    uOndK: [13, 6.5, 0.04, 3],
    uOndS2: 1,
    uLorRot: rotLorenz(t),
    uRedFase: (() => {
      const k = KICKS.filter((o) => o.t <= t);
      if (!k.length) return 0;
      return k.length * 6 + Math.min(5.9, (t - k[k.length - 1].t) / 0.085);
    })(),
    uDipEsc: 0.59,
    uDipD: 6.0,
    uDipFlujo: 0.04,
    uToroRot: 0.35 * tauMusical(t) * 1.4,
    uZoomVel: 0.25 + 0.25 * M.rms,
    uPrismaFan: (U.uPrismaFan as number) ?? 1,
    uPartEsc: fa === F.tunel || fb === F.tunel ? 1 : 1 + 0.05 * M.kick,
  };
  if (part.uPrismaFan === undefined) part.uPrismaFan = 1;

  // ---------- grade ----------
  const cortes = PLANOS.map((p) => p.t0).filter((x) => x > 0.5 && x < CALMA + 0.1);
  let flashCorte = 0;
  for (const x of cortes) if (t >= x && t - x < 0.4) flashCorte = Math.max(flashCorte, Math.exp(-(t - x) * 10));
  const kF = FUERTES.filter((k) => k.t <= t && k.t > DROP - 0.1).pop();
  const ageK = kF ? t - kF.t : 99;
  const enCalma = t >= CALMA ? 0.35 : 1;
  const ac = pA.acento;
  const post: Uniformes = {
    uExpo: (0.66 + 0.62 * M.graves + 0.1 * M.kick + 0.25 * M.rms) * expo,
    uBloomK: 0.42 + 0.3 * M.kick * enCalma + 0.5 * M.graves,
    uAberr: 1.0 + 2.6 * M.snare * enCalma,
    uGrano: 0.016,
    uVin: 0.85,
    uAzul: ss(pr(t, CALMA - 1.3, 1.4)),
    uSatur: 0.82 + 0.4 * M.rms,
    uNegro: 1,
    uFlash: flashCorte * 0.12 + Math.exp(-Math.max(0, t - DROP) * 6) * (t >= DROP ? 0.45 : 0),
    uTinte: [1, 1, 1],
    uChoque: [0.5, 0.5, ageK * 0.95, ageK < 1.2 ? Math.exp(-ageK * 2.6) * (kF?.v ?? 0) * enCalma : 0],
    uFlashCol: [ac[0] * M.snare * 0.45 * enCalma, ac[1] * M.snare * 0.45 * enCalma, ac[2] * M.snare * 0.45 * enCalma],
  };
  return { comun, mundos, part, post, trazos: T, linGanancia: 0.78 + 0.45 * M.graves };
};
