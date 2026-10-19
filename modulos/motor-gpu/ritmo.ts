import R from "./ritmo.json";

// Mapa de la música real (herramientas/analizar_musica.py sobre «Synthwave» de JonasBlakewood): tempo y rejilla
// verificados, onsets por banda (bombo, caja, hats), curvas por cuadro (graves, medios, agudos, RMS, riser) y
// secciones. Toda animación importante se ancla a estos datos.
export const FPS = 30;
export const PULSO = R.pulso;
export const COMPAS = R.compas;
export const CORCHEA = PULSO / 2;
export const DURACION = R.finVideo;
export const TOTAL = Math.round(DURACION * FPS);
export const DOWNBEATS = R.downbeats;
export const PRIMER = R.primerCompas;
// Tiempo del compás n (n = 0 es el primer compás, 2,215 s; el drop es el 3 y la calma el 20).
export const B = (n: number) => PRIMER + n * COMPAS;
export const DROP = R.secciones.find((s) => s.id === "drop")!.t0;
export const CALMA = R.secciones.find((s) => s.id === "calma")!.t0;

type Onset = { t: number; v: number };
export const BOMBO: Onset[] = R.onsetsBombo;
export const CAJA: Onset[] = R.onsetsCaja;
export const HATS: Onset[] = R.onsetsHats;
export const FILLS = R.fills;

const ultimo = (lista: { t: number }[] | number[], t: number) => {
  let lo = 0;
  let hi = lista.length - 1;
  let r = -1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    const v = typeof lista[m] === "number" ? (lista[m] as number) : (lista[m] as { t: number }).t;
    if (v <= t + 1e-6) {
      r = m;
      lo = m + 1;
    } else hi = m - 1;
  }
  return r;
};
// Envolvente de onsets: golpe que cae exponencialmente; suma los dos últimos (para golpes muy seguidos).
export const env = (lista: Onset[], t: number, caida = 8) => {
  const i = ultimo(lista, t);
  let s = 0;
  for (let k = i; k >= 0 && k > i - 3; k--) s = Math.max(s, lista[k].v * Math.exp(-(t - lista[k].t) * caida));
  return s;
};
// Onsets entre a y t (con fuerza mínima), contados con una subida suave de duración d (para subdivisiones).
export const cuenta = (lista: Onset[], a: number, t: number, d = 0.12, vMin = 0) => {
  let s = 0;
  for (const o of lista) {
    if (o.t < a - 1e-4) continue;
    if (o.t > t) break;
    if (o.v < vMin) continue;
    const u = Math.min(1, (t - o.t) / d);
    s += 1 - Math.pow(1 - u, 3);
  }
  return s;
};
export const ultimoOnset = (lista: Onset[], t: number, vMin = 0) => {
  for (let k = ultimo(lista, t); k >= 0; k--) if (lista[k].v >= vMin) return lista[k];
  return null;
};
export const onsetsEntre = (lista: Onset[], a: number, b: number, vMin = 0) => lista.filter((o) => o.t >= a && o.t < b && o.v >= vMin);

// Curvas por cuadro, interpoladas linealmente.
type NombreCurva = keyof typeof R.curvas;
const curvaCruda = (n: NombreCurva) => R.curvas[n] as number[];
export const curva = (n: NombreCurva, t: number) => {
  const c = curvaCruda(n);
  const f = Math.max(0, Math.min(c.length - 1.001, t * FPS));
  const i = Math.floor(f);
  return c[i] + (c[i + 1] - c[i]) * (f - i);
};
// Versión suavizada (media exponencial hacia atrás, constante tau en segundos), precalculada.
const suaves = new Map<string, Float32Array>();
export const curvaSuave = (n: NombreCurva, t: number, tau = 0.15) => {
  const k = `${n}|${tau}`;
  let s = suaves.get(k);
  if (!s) {
    const c = curvaCruda(n);
    s = new Float32Array(c.length);
    const a = 1 - Math.exp(-1 / (FPS * tau));
    let v = c[0];
    for (let i = 0; i < c.length; i++) {
      v += (c[i] - v) * a;
      s[i] = v;
    }
    suaves.set(k, s);
  }
  const f = Math.max(0, Math.min(s.length - 1.001, t * FPS));
  const i = Math.floor(f);
  return s[i] + (s[i + 1] - s[i]) * (f - i);
};
// Tiempo musical: avanza más rápido con la energía (RMS). Lo usan los flujos y las trayectorias.
const TAU_TABLA = (() => {
  const c = curvaCruda("rms");
  const out = new Float32Array(c.length);
  let acc = 0;
  for (let i = 0; i < c.length; i++) {
    out[i] = acc;
    acc += (0.45 + 1.1 * c[i]) / FPS;
  }
  return out;
})();
export const tauMusical = (t: number) => {
  const f = Math.max(0, Math.min(TAU_TABLA.length - 1.001, t * FPS));
  const i = Math.floor(f);
  return TAU_TABLA[i] + (TAU_TABLA[i + 1] - TAU_TABLA[i]) * (f - i);
};
// Aceleración de cámara por fills y risers: integral de la curva del riser y de los fills (en compases).
const ACEL = (() => {
  const c = curvaCruda("riser");
  const out = new Float32Array(c.length);
  let acc = 0;
  for (let i = 0; i < c.length; i++) {
    out[i] = acc;
    const t = i / FPS;
    const fill = FILLS.some((f) => t >= f.t0 && t < f.t1) ? 1 : 0;
    acc += (c[i] * 1.2 + fill * 1.0) / FPS;
  }
  return out;
})();
export const aceleracion = (t: number) => ACEL[Math.max(0, Math.min(ACEL.length - 1, Math.round(t * FPS)))];

// Golpe real más cercano a un tiempo de la rejilla: el bombo más próximo dentro de ±90 ms (si no, la rejilla).
export const golpeReal = (tg: number, ventana = 0.09) => {
  let mejor: Onset | null = null;
  for (const o of BOMBO) if (Math.abs(o.t - tg) <= ventana && (!mejor || Math.abs(o.t - tg) < Math.abs(mejor.t - tg))) mejor = o;
  return mejor ? mejor.t : tg;
};

// ── Final (src/final.ts, aprobado): sus golpes se anclan a eventos reales de la calma ──
//   T_FINAL  compás 21 + 2 tiempos (bombo real)  aparecen los epiciclos y trazan la marca
//   T_ACENTO compás 22 (bombo real)               el trazo late
//   T_SUELTA compás 23 (bombo real)               la marca se suelta en partículas
//   T_CONV   compás 24 (bombo real)               convergencia en el logo y revelación del campo
//   LECTURES: los 8 onsets reales siguientes (bombo, caja o hats, separados al menos 0,22 s)
//   «Próximamente» compás 25 y «bnsolutions.cl» compás 25 + 2 tiempos (bombos reales)
export const T_FINAL = golpeReal(B(21) + 2 * PULSO);
const T_ACENTO_R = golpeReal(B(22));
const T_SUELTA_R = golpeReal(B(23));
const T_CONV_R = golpeReal(B(24));
const T_PROX = golpeReal(B(25));
const T_WEB = golpeReal(B(25) + 2 * PULSO);
const NOTAS_REALES = (() => {
  const todos = [...BOMBO, ...CAJA, ...HATS].filter((o) => o.v >= 0.4).sort((a, b) => a.t - b.t);
  const out: { t: number; vel: number }[] = [];
  for (const o of todos) {
    if (out.length && o.t - out[out.length - 1].t < 0.22) continue;
    out.push({ t: o.t, vel: Math.min(1, 0.55 + 0.4 * o.v) });
  }
  return out;
})();
// Objeto con la forma que espera final.ts (ostinato = onsets reales, golpes con tipo, swell del redoble).
export const RITMO = {
  total: DURACION,
  compas: COMPAS,
  corchea: CORCHEA,
  ostinato: NOTAS_REALES.filter((o) => o.t >= T_CONV_R + 0.12 || o.t < T_CONV_R - 0.05),
  golpes: [
    { t: T_ACENTO_R, tipo: "suave" },
    { t: T_SUELTA_R, tipo: "suave" },
    { t: T_CONV_R, tipo: "final" },
    { t: T_PROX, tipo: "nota" },
    { t: T_WEB, tipo: "nota" },
  ],
  swells: [{ t0: T_SUELTA_R, t1: T_CONV_R, tipo: "redoble" }],
};
export const golpesDe = (...tipos: string[]) => RITMO.golpes.filter((g) => tipos.includes(g.tipo)).map((g) => g.t);
export const golpe = (t: number, lista: number[], caida = 7) => {
  const i = ultimo(lista, t);
  return i < 0 ? 0 : Math.exp(-(t - lista[i]) * caida);
};
const NOTAS_T = RITMO.ostinato.map((o) => o.t);
export const pulsoNota = (t: number, caida = 9) => {
  const i = ultimo(NOTAS_T, t);
  return i < 0 ? 0 : Math.exp(-(t - NOTAS_T[i]) * caida) * RITMO.ostinato[i].vel;
};
export const swell = (t: number, tipo: string) => {
  for (const s of RITMO.swells) if (s.tipo === tipo && t >= s.t0 && t < s.t1) return (t - s.t0) / (s.t1 - s.t0);
  return 0;
};
