import R from "./ritmo.json";

// Mapa de eventos de la música (audio/generar_musica.py): acordes, cada nota del ostinato, entradas de capas, golpes,
// swells y silencios, y el plan de escenas que sigue a la música. Toda animación importante se ancla a estos tiempos.
export const RITMO = R;
export const PULSO = R.pulso;
export const COMPAS = R.compas;
export const CORCHEA = R.corchea;
export const DURACION = R.total;
export const FPS = 30;
export const tc = (c: number, p = 0) => c * COMPAS + p * PULSO;
// El video ya no abre con «Hay cosas que no se ven.»: arranca en el swell inverso que lleva a la primera revelación
// (5,0 s). Los tiempos siguen siendo los de la música; el cuadro 0 corresponde a t = INICIO.
export const INICIO = 3.75;
export const TOTAL = Math.round((DURACION - INICIO) * FPS);
// Final (src/final.ts): epiciclos que dibujan la marca, suelta en partículas y convergencia en el logo. Empieza a
// mitad del compás 18 y reemplaza a los créditos y al logo del plan de ritmo.json; la frase 2 termina donde empieza.
export const T_FINAL = tc(18, 2);
export const ESCENAS = [
  ...R.escenas.filter((e) => !["frase1", "creditos", "logo"].includes(e.id)).map((e) => (e.id === "frase2" ? { ...e, t1: T_FINAL } : e)),
  { id: "final", t0: T_FINAL, t1: R.total },
];

export const escena = (id: string) => {
  const e = ESCENAS.find((x) => x.id === id);
  if (!e) throw new Error(`No hay escena ${id} en el plan`);
  return e;
};
export const hayEscena = (id: string) => ESCENAS.some((x) => x.id === id);
const ultimoIdx = (lista: number[], t: number) => {
  let lo = 0;
  let hi = lista.length - 1;
  let r = -1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (lista[m] <= t + 1e-6) {
      r = m;
      lo = m + 1;
    } else hi = m - 1;
  }
  return r;
};
export const NOTAS = R.ostinato.map((n) => n.t);
// Cuántas notas del ostinato sonaron desde t0 hasta t (incluida la de t0).
export const notasDesde = (t0: number, t: number) => Math.max(0, ultimoIdx(NOTAS, t) - ultimoIdx(NOTAS, t0 - 1e-4));
// Golpe de la última nota (1 en la nota y cae).
export const pulsoNota = (t: number, caida = 9) => {
  const i = ultimoIdx(NOTAS, t);
  return i < 0 ? 0 : Math.exp(-(t - NOTAS[i]) * caida) * R.ostinato[i].vel;
};
export const tiempoNota = (i: number) => NOTAS[i];
export const golpesDe = (...tipos: string[]) => R.golpes.filter((g) => tipos.includes(g.tipo)).map((g) => g.t);
export const golpe = (t: number, lista: number[], caida = 7) => {
  const i = ultimoIdx(lista, t);
  return i < 0 ? 0 : Math.exp(-(t - lista[i]) * caida);
};
// Nivel de un swell (0 a 1) si t está dentro de uno del tipo pedido.
export const swell = (t: number, tipo: string) => {
  for (const s of R.swells) if (s.tipo === tipo && t >= s.t0 && t < s.t1) return (t - s.t0) / (s.t1 - s.t0);
  return 0;
};
export const enSilencio = (t: number) => R.silencios.some(([a, b]) => t >= a && t < b);
