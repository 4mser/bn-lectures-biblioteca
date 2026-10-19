// ═══ Final: epiciclos de Fourier dibujan la marca B&N, el trazo se suelta en partículas y las partículas convergen
// en el logo sobre el campo de dos cargas (la foto de perfil de B&N Lectures). Todo es función pura de t y está
// anclado a la música (src/ritmo.json):
//   T_FINAL (46,25 s, mitad del compás de F)  aparecen las cadenas de epiciclos y empiezan a trazar
//   T_ACENTO (47,5 s, golpe suave, acorde Dm)  el trazo y los círculos laten
//   T_SUELTA (50,0 s, golpe suave, acorde G)   el contorno completo se rompe en partículas; vacío con el redoble
//   T_CONV (52,5 s, golpe final, acorde C)     convergencia con resortes, se encienden las cargas, se revela el campo
//   notas del ostinato desde 52,8 s            LECTURES letra a letra (en Video.tsx)
//   golpes «nota» (55,0 y 56,25 s)             «Próximamente» y «bnsolutions.cl» (en Video.tsx)
import M from "./marca.json";
import type { Disp } from "./disposicion";
import { brillo, rgba, azar, TAU, type Pt } from "./lab/luz";
import { auxiliar, posCargas } from "./escenas-apoyo";
import { COMPAS, RITMO, T_FINAL, golpe, golpesDe, pulsoNota, swell } from "./ritmo";
import { cl, eIO, eOut, lerp, pr } from "./theme";

type Ctx = CanvasRenderingContext2D;

const tras = (lista: number[], t: number) => lista.find((g) => g >= t - 1e-4) ?? t;
export const T_ACENTO = tras(golpesDe("suave"), T_FINAL);
export const T_SUELTA = tras(golpesDe("suave"), T_ACENTO + 0.1);
export const T_CONV = tras(golpesDe("final"), T_SUELTA);
// El logo nítido aparece cuando las partículas ya aterrizaron.
export const T_MARCA = T_CONV + 0.95;
// Deriva de cámara del cierre: un push-in mínimo y continuo hasta el último cuadro (se aplica en Video.tsx).
export const derivaCierre = (t: number) => 1 + 0.03 * pr(t, T_CONV, RITMO.total - T_CONV);
// Pulsos que viajan por las líneas desde las cargas: uno por nota del ostinato; cuando el ostinato termina, uno por
// medio compás, para que el campo nunca quede quieto.
const PULSOS = (() => {
  const notas = RITMO.ostinato.filter((o) => o.t >= T_CONV - 1e-4).map((o) => ({ t: o.t, v: o.vel }));
  const ult = notas.length ? notas[notas.length - 1].t : T_CONV;
  for (let x = ult + COMPAS / 2; x < RITMO.total; x += COMPAS / 2) notas.push({ t: x, v: 0.3 });
  return notas;
})();
// Luz de una carga, viva: halo que respira con la música y rayos finos que titilan y giran muy lento.
const estallidoVivo = (ctx: Ctx, x: number, y: number, s: number, a: number, semilla: number, t: number) => {
  if (a <= 0.01) return;
  brillo(ctx, x, y, 300 * s, "30,70,240", 0.2 * a);
  brillo(ctx, x, y, 150 * s, "90,140,255", 0.62 * a);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineWidth = 1;
  const giro = t * 0.045 * (semilla ? -1 : 1);
  for (let i = 0; i < 120; i++) {
    const ang = azar(i * 1.7 + semilla) * TAU + giro;
    const tit = 0.55 + 0.45 * Math.sin(t * (1.3 + 2.2 * azar(i * 2.3 + semilla)) + azar(i * 4.1 + semilla) * TAU);
    const L = s * (25 + 150 * azar(i * 3.1 + semilla) ** 2.2) * (0.85 + 0.15 * tit);
    const g = ctx.createLinearGradient(x, y, x + Math.cos(ang) * L, y + Math.sin(ang) * L);
    g.addColorStop(0, rgba("220,232,255", (0.2 + 0.42 * azar(i + semilla)) * tit * a));
    g.addColorStop(1, rgba("90,140,255", 0));
    ctx.strokeStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * L, y + Math.sin(ang) * L);
    ctx.stroke();
  }
  ctx.restore();
  brillo(ctx, x, y, 70 * s, "170,200,255", 0.75 * a);
  brillo(ctx, x, y, 30 * s, "240,246,255", 1 * a);
  ctx.fillStyle = rgba("252,253,255", a);
  ctx.beginPath();
  ctx.arc(x, y, 8 * s, 0, TAU);
  ctx.fill();
};
export const NOTAS_LECTURES = RITMO.ostinato.filter((o) => o.t >= T_CONV - 1e-4).slice(0, 8).map((o) => o.t);

// ── Geometría de la marca: bn-mark.png mide 1218×372 (a 2x) y su tinta va de x = 11 a 1204 e y = 13 a 359. Los
// contornos de marca.json están normalizados al ancho de la tinta (597 px a 1x). ──
const ANCHO_TINTA = 597;
export const PNG_W = 609;
export const PNG_H = 186;
const mapa = (d: Disp) => {
  const s = d.logo.s;
  return { s, cx: d.logo.cx - 0.5 * s, cy: d.logo.cy + 0.25 * s, w: ANCHO_TINTA * s };
};

// ── Series de Fourier de cada contorno (B, &, N y sus huecos) ──
type Termino = { k: number; amp: number; fase: number };
type Curva = { centro: Pt; terminos: Termino[]; denso: Pt[]; largo: number };
const DENSO = 4;
const CURVAS: Curva[] = (M.contornos as number[][][]).map((crudo) => {
  // suavizado circular leve: quita la escalera de píxeles sin redondear las esquinas
  let p = crudo.map(([x, y]) => [x, y] as Pt);
  const n = p.length;
  for (let pasada = 0; pasada < 2; pasada++) {
    p = p.map((b, i) => {
      const a = p[(i - 1 + n) % n];
      const c = p[(i + 1) % n];
      return [(a[0] + 2 * b[0] + c[0]) / 4, (a[1] + 2 * b[1] + c[1]) / 4] as Pt;
    });
  }
  const terminos: Termino[] = [];
  let centro: Pt = [0, 0];
  for (let k = -n / 2; k < n / 2; k++) {
    let re = 0;
    let im = 0;
    for (let j = 0; j < n; j++) {
      const ang = (-TAU * k * j) / n;
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      re += p[j][0] * c - p[j][1] * s;
      im += p[j][0] * s + p[j][1] * c;
    }
    re /= n;
    im /= n;
    if (k === 0) centro = [re, im];
    else terminos.push({ k, amp: Math.hypot(re, im), fase: Math.atan2(im, re) });
  }
  terminos.sort((a, b) => b.amp - a.amp);
  // curva densa: la serie completa evaluada en DENSO·n puntos (pasa exacto por los puntos originales)
  const m = n * DENSO;
  const denso: Pt[] = [];
  for (let j = 0; j < m; j++) {
    const u = j / m;
    let x = centro[0];
    let y = centro[1];
    for (const tr of terminos) {
      const a = tr.fase + TAU * tr.k * u;
      x += tr.amp * Math.cos(a);
      y += tr.amp * Math.sin(a);
    }
    denso.push([x, y]);
  }
  let largo = 0;
  for (let j = 0; j < m; j++) largo += Math.hypot(denso[(j + 1) % m][0] - denso[j][0], denso[(j + 1) % m][1] - denso[j][1]);
  return { centro, terminos, denso, largo };
});
const enCurva = (c: Curva, u: number): Pt => {
  const m = c.denso.length;
  const f = (((u % 1) + 1) % 1) * m;
  const i = Math.floor(f);
  const r = f - i;
  const a = c.denso[i % m];
  const b = c.denso[(i + 1) % m];
  return [a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r];
};

// Calendario de trazado: arrancan escalonados y cierran uno por semicorchea, el último una corchea antes de la suelta.
const SEMI = RITMO.corchea / 2;
const PLAN = CURVAS.map((_, i) => {
  const n = CURVAS.length;
  return { a: T_FINAL + 0.3 + i * SEMI, b: T_SUELTA - RITMO.corchea - (n - 1 - i) * SEMI };
});
const NCIRC = 30; // círculos visibles por cadena (los demás son subpíxel)
const COLA = 0.16; // largo de la estela brillante (fracción del contorno)
// Avance del trazo: expo de entrada y salida, mezclado con un poco de lineal para que nunca se detenga del todo.
const avance = (x: number) => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const ex = x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2;
  return 0.35 * x + 0.65 * ex;
};

// Cámara: empuja suave mientras se dibuja (la marca llena el cuadro) y retrocede durante el vacío, de modo que en la
// convergencia queda en 1 y el cuadro calza con la foto de perfil.
const camara = (t: number) =>
  t < T_SUELTA ? lerp(1.22, 1.36, eIO(pr(t, T_FINAL, T_SUELTA - T_FINAL))) : lerp(1.36, 1, eIO(pr(t, T_SUELTA, T_CONV - T_SUELTA)));

// ── Partículas: nacen repartidas por largo de arco sobre los contornos y aterrizan dentro de la marca ──
const NP = 5200;
type Particula = { o: Pt; v: Pt; kd: number; giro: number; giroTotal: number; fase: number; r: number; azul: boolean; meta: Pt; tIni: number; tFin: number };
let cacheP: { clave: string; ps: Particula[] } | null = null;
const metasDesdeImagen = (d: Disp, marca: HTMLImageElement | null): Pt[] => {
  const { s } = mapa(d);
  const w = Math.round(PNG_W * s);
  const h = Math.round(PNG_H * s);
  const x0 = d.logo.cx - (PNG_W * s) / 2;
  const y0 = d.logo.cy - (PNG_H * s) / 2;
  const puntos: Pt[] = [];
  if (marca && marca.complete && marca.naturalWidth) {
    const c = auxiliar(w, h, "metas");
    const x = c.getContext("2d", { willReadFrequently: true })!;
    x.clearRect(0, 0, w, h);
    x.drawImage(marca, 0, 0, w, h);
    const dat = x.getImageData(0, 0, w, h).data;
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (dat[(yy * w + xx) * 4 + 3] > 150) puntos.push([x0 + xx + 0.5, y0 + yy + 0.5]);
  }
  if (puntos.length < 100) {
    const { cx, cy, w: W } = mapa(d);
    (M.interior as number[][]).forEach(([x, y]) => puntos.push([cx + x * W, cy + y * W]));
  }
  // subconjunto determinista de NP puntos, con un leve temblor subpíxel
  const orden = puntos.map((_, i) => i).sort((a, b) => azar(a * 0.731 + 5) - azar(b * 0.731 + 5));
  return Array.from({ length: NP }, (_, i) => {
    const p = puntos[orden[i % orden.length]];
    return [p[0] + (azar(i * 3.3) - 0.5) * 0.8, p[1] + (azar(i * 4.7) - 0.5) * 0.8] as Pt;
  });
};
const particulas = (d: Disp, marca: HTMLImageElement | null) => {
  const lista = !!(marca && marca.complete && marca.naturalWidth);
  const clave = `${d.W}x${d.H}|${lista}`;
  if (cacheP && cacheP.clave === clave) return cacheP.ps;
  const { s, cx, cy, w } = mapa(d);
  const total = CURVAS.reduce((a, c) => a + c.largo, 0);
  const ps: Particula[] = [];
  for (let i = 0; i < NP; i++) {
    // origen por largo de arco
    let resto = ((i + azar(i * 7.1)) / NP) * total;
    let ci = 0;
    while (ci < CURVAS.length - 1 && resto > CURVAS[ci].largo) resto -= CURVAS[ci++].largo;
    const c = CURVAS[ci];
    const u = resto / c.largo;
    const a = enCurva(c, u);
    const b = enCurva(c, u + 0.002);
    const o: Pt = [cx + a[0] * w, cy + a[1] * w];
    let nx = -(b[1] - a[1]);
    let ny = b[0] - a[0];
    const nn = Math.hypot(nx, ny) || 1;
    nx /= nn;
    ny /= nn;
    const rx = o[0] - d.logo.cx;
    const ry = o[1] - d.logo.cy;
    const rr = Math.hypot(rx, ry) || 1;
    if (nx * rx + ny * ry < 0) {
      nx = -nx;
      ny = -ny;
    }
    // salida: sobre todo normal al trazo (hacia afuera o hacia adentro de la letra) y algo radial, con dispersión
    const sg = azar(i * 12.7) < 0.42 ? -1 : 1;
    let dx = (rx / rr) * 0.35 + sg * nx * 0.65;
    let dy = (ry / rr) * 0.35 + sg * ny * 0.65;
    const dd = Math.hypot(dx, dy) || 1;
    const giro0 = (azar(i * 2.9) - 0.5) * 0.9;
    const c0 = Math.cos(giro0);
    const s0 = Math.sin(giro0);
    [dx, dy] = [(dx / dd) * c0 - (dy / dd) * s0, (dx / dd) * s0 + (dy / dd) * c0];
    const rap = lerp(40, 380, Math.pow(azar(i * 5.3), 1.8)) * s;
    ps.push({
      o,
      v: [dx * rap, dy * rap],
      kd: lerp(1.6, 2.8, azar(i * 6.1)),
      giro: lerp(0.5, 1.0, azar(i * 8.3)),
      fase: azar(i * 9.7) * TAU,
      r: lerp(0.65, 1.45, Math.pow(azar(i * 10.9), 2)),
      azul: azar(i * 11.3) < 0.35,
      giroTotal: 0,
      meta: [0, 0],
      tIni: 0,
      tFin: 0,
    });
  }
  // Giro total de cada partícula: un solo sentido (antihorario en pantalla), mayor cerca del centro (remolino).
  ps.forEach((p) => {
    const r0 = Math.hypot(p.o[0] - d.logo.cx, p.o[1] - d.logo.cy);
    p.giroTotal = (p.giro * 0.62) / (0.55 + r0 / (420 * s));
  });
  // Metas por ángulo alrededor de la marca, medido donde quedaría cada partícula con su giro completo: así el destino
  // está «adelante» en el sentido del giro y la convergencia sigue girando hacia el mismo lado (sin desandar el giro).
  const ang = (x: number, y: number) => Math.atan2((y - d.logo.cy) / 0.32, x - d.logo.cx);
  const metas = metasDesdeImagen(d, marca);
  const ordM = metas.map((_, i) => i).sort((p, q) => ang(metas[p][0], metas[p][1]) - ang(metas[q][0], metas[q][1]));
  const clavePs = ps.map((p) => {
    const rx = p.o[0] - d.logo.cx;
    const ry = p.o[1] - d.logo.cy;
    const c = Math.cos(p.giroTotal);
    const sn = Math.sin(p.giroTotal);
    return ang(d.logo.cx + rx * c - ry * sn, d.logo.cy + rx * sn + ry * c);
  });
  const ordP = ps.map((_, i) => i).sort((p, q) => clavePs[p] - clavePs[q]);
  ordP.forEach((pi, j) => (ps[pi].meta = metas[ordM[j]]));
  // llegada escalonada por distancia: las cercanas empiezan a converger en el golpe, las lejanas hasta 0,3 s después
  ps.forEach((p) => {
    const dist = Math.hypot(p.o[0] - p.meta[0], p.o[1] - p.meta[1]) + Math.hypot(p.v[0], p.v[1]) / p.kd;
    p.tIni = T_CONV + 0.3 * cl(dist / (520 * s));
    p.tFin = p.tIni + DUR_CONV;
  });
  cacheP = { clave, ps };
  return ps;
};
// Una sola trayectoria continua por partícula, de la suelta al aterrizaje. En un marco que gira alrededor de la marca:
//   P(t) = C + Rot(θ(t)) · [ A(t) + E(t) ]
//   θ(t) = Θ·(1 − (1 − u)^2,5), u = (t − suelta)/(llegada − suelta): un único giro que desacelera hasta 0 al llegar
//   A(t) = lerp(o − C, Rot(−Θ)(meta − C), h(t)): del punto del trazo al destino (visto en el marco que gira)
//   E(t) = v·(1 − e^(−k·τ))/k · (1 − h(t)): la expansión con inercia, que se recoge al converger
//   h(t) = smootherstep entre tIni y tFin (velocidad y aceleración nulas en ambos bordes)
// En la suelta P = o (un punto exacto del trazo); al final P = meta con velocidad 0. No hay tramos pegados.
const DUR_CONV = 0.9;
const suave5 = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (6 * x - 15) + 10));
const posicion = (p: Particula, t: number, d: Disp): Pt => {
  const tau = Math.max(0, t - T_SUELTA);
  const u = cl(tau / (p.tFin - T_SUELTA));
  const th = p.giroTotal * (1 - Math.pow(1 - u, 2.5));
  const h = suave5((t - p.tIni) / (p.tFin - p.tIni));
  const cx = d.logo.cx;
  const cy = d.logo.cy;
  // destino en el marco que gira
  const cT = Math.cos(-p.giroTotal);
  const sT = Math.sin(-p.giroTotal);
  const mx = p.meta[0] - cx;
  const my = p.meta[1] - cy;
  const ax = lerp(p.o[0] - cx, mx * cT - my * sT, h);
  const ay = lerp(p.o[1] - cy, mx * sT + my * cT, h);
  const f = ((1 - Math.exp(-p.kd * tau)) / p.kd) * (1 - h);
  // vaivén leve: nace suave (1 − e^(−2τ)²) y se apaga con la convergencia
  const vai = 5 * d.logo.s * Math.pow(1 - Math.exp(-2 * tau), 2) * (1 - h);
  const qx = ax + p.v[0] * f + vai * Math.sin(tau * 1.9 + p.fase);
  const qy = ay + p.v[1] * f + vai * Math.cos(tau * 1.6 + p.fase * 1.3);
  const c = Math.cos(th);
  const sn = Math.sin(th);
  return [cx + qx * c - qy * sn, cy + qx * sn + qy * c];
};
// Muestra de velocidades y aceleraciones cuadro a cuadro (para verificar que no hay saltos): devuelve, por cuadro, la
// aceleración máxima y media de una muestra de partículas, en px/s².
export const verificarTrayectorias = (d: Disp, desde: number, hasta: number, fps = 30) => {
  const ps = particulas(d, null);
  const muestra = ps.filter((_, i) => i % 25 === 0);
  const filas: { t: number; vMedia: number; aMax: number; aMedia: number }[] = [];
  for (let t = desde; t <= hasta + 1e-9; t += 1 / fps) {
    let vm = 0;
    let am = 0;
    let aMax = 0;
    muestra.forEach((p) => {
      const a0 = posicion(p, t - 1 / fps, d);
      const a1 = posicion(p, t, d);
      const a2 = posicion(p, t + 1 / fps, d);
      const v = Math.hypot(a2[0] - a0[0], a2[1] - a0[1]) * (fps / 2);
      const ac = Math.hypot(a2[0] - 2 * a1[0] + a0[0], a2[1] - 2 * a1[1] + a0[1]) * fps * fps;
      vm += v;
      am += ac;
      aMax = Math.max(aMax, ac);
    });
    filas.push({ t, vMedia: vm / muestra.length, aMax, aMedia: am / muestra.length });
  }
  return filas;
};

// ── Capas: trazo nítido (A) y su resplandor azul (B), compuestos en aditivo con desenfoque medido ──
const capas = (d: Disp) => {
  const A = auxiliar(d.W, d.H, "finA");
  const B = auxiliar(d.W, d.H, "finB");
  const a = A.getContext("2d")!;
  const b = B.getContext("2d")!;
  for (const x of [a, b]) {
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = "source-over";
    x.globalAlpha = 1;
    x.filter = "none";
    x.clearRect(0, 0, d.W, d.H);
  }
  return { A, B, a, b };
};
const componer = (ctx: Ctx, A: HTMLCanvasElement, B: HTMLCanvasElement, brilloB: number, brilloA = 1) => {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = cl(0.55 * brilloB);
  ctx.filter = "blur(14px)";
  ctx.drawImage(B, 0, 0);
  ctx.globalAlpha = cl(0.7 * brilloB);
  ctx.filter = "blur(4px)";
  ctx.drawImage(B, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = cl(brilloA);
  ctx.drawImage(A, 0, 0);
  ctx.restore();
};
const conCamara = (x: Ctx, d: Disp, k: number) => x.setTransform(k, 0, 0, k, d.logo.cx * (1 - k), d.logo.cy * (1 - k));

// ── 1 · Epiciclos ──
const epiciclos = (ctx: Ctx, d: Disp, t: number) => {
  const k = camara(t);
  const { cx, cy, w } = mapa(d);
  const { A, B, a, b } = capas(d);
  conCamara(a, d, k);
  conCamara(b, d, k);
  const late = golpe(t, [T_ACENTO], 3.2);
  const nota = pulsoNota(t, 10);
  ctx.save();
  conCamara(ctx, d, k);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const px = 1 / k; // grosores en píxeles de pantalla
  CURVAS.forEach((c, ci) => {
    const { a: ta, b: tb } = PLAN[ci];
    const crece = eOut(pr(t, ta - 0.55, 0.75));
    const apaga = eIO(pr(t, tb, 0.42));
    const vis = crece * (1 - apaga);
    const u = avance(pr(t, ta, tb - ta));
    // cadena de círculos
    if (vis > 0.01) {
      let x = cx + c.centro[0] * w;
      let y = cy + c.centro[1] * w;
      const centros: Pt[] = [[x, y]];
      c.terminos.slice(0, NCIRC).forEach((tr) => {
        const r = tr.amp * w * crece;
        const ang = tr.fase + TAU * tr.k * u;
        x += r * Math.cos(ang);
        y += r * Math.sin(ang);
        centros.push([x, y]);
      });
      for (let j = 0; j < NCIRC; j++) {
        const r = c.terminos[j].amp * w * crece;
        if (r * k < 0.8) continue;
        const f = 1 - j / NCIRC;
        ctx.strokeStyle = rgba("125,162,255", vis * (0.1 + 0.32 * Math.pow(f, 1.3)) * (1 + 0.5 * late));
        ctx.lineWidth = (j < 3 ? 1 : 0.7) * px;
        ctx.beginPath();
        ctx.arc(centros[j][0], centros[j][1], r, 0, TAU);
        ctx.stroke();
      }
      // radios: una sola polilínea fina y más clara que los círculos
      ctx.strokeStyle = rgba("205,218,255", vis * 0.42 * (1 + 0.4 * late));
      ctx.lineWidth = 0.8 * px;
      ctx.beginPath();
      centros.forEach(([X, Y], j) => (j ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)));
      const punta = enCurva(c, u);
      ctx.lineTo(cx + punta[0] * w, cy + punta[1] * w);
      ctx.stroke();
      // articulaciones de los primeros círculos
      ctx.fillStyle = rgba("225,232,255", vis * 0.55);
      for (let j = 0; j < 6; j++) {
        ctx.beginPath();
        ctx.arc(centros[j][0], centros[j][1], 1.3 * px, 0, TAU);
        ctx.fill();
      }
    }
    if (t < ta) return;
    // trazo: línea persistente + estela que se apaga detrás de la punta
    const m = c.denso.length;
    const fin = u * m;
    const ruta = (x: Ctx, desde: number, hasta: number) => {
      x.beginPath();
      const i0 = Math.max(0, Math.floor(desde));
      const p0 = enCurva(c, desde / m);
      x.moveTo(cx + p0[0] * w, cy + p0[1] * w);
      for (let j = i0 + 1; j < hasta; j++) x.lineTo(cx + c.denso[j % m][0] * w, cy + c.denso[j % m][1] * w);
      const p1 = enCurva(c, hasta / m);
      x.lineTo(cx + p1[0] * w, cy + p1[1] * w);
      if (hasta >= m) x.closePath();
    };
    const cerrado = pr(t, tb, 0.5); // al cerrar, el contorno se asienta algo más brillante
    for (const x of [a, b]) {
      x.lineCap = "round";
      x.lineJoin = "round";
    }
    a.strokeStyle = rgba("226,234,255", 0.62 + 0.25 * cerrado + 0.2 * late);
    a.lineWidth = 1.6 * px;
    ruta(a, 0, fin);
    a.stroke();
    b.strokeStyle = rgba("70,120,255", 0.55 + 0.3 * cerrado + 0.3 * late);
    b.lineWidth = 3.2 * px;
    ruta(b, 0, fin);
    b.stroke();
    if (u < 1) {
      // estela: tramos con brillo y grosor crecientes hacia la punta
      const L = COLA * m;
      const tramos = 14;
      a.lineCap = "butt";
      for (let q = 0; q < tramos; q++) {
        const d0 = fin - L * (1 - q / tramos);
        const d1 = fin - L * (1 - (q + 1) / tramos);
        if (d1 <= 0) continue;
        const f = (q + 1) / tramos;
        a.strokeStyle = rgba("246,249,255", 0.75 * f * f);
        a.lineWidth = lerp(1.6, 2.8, f * f) * px;
        ruta(a, Math.max(0, d0), d1);
        a.stroke();
        b.strokeStyle = rgba("110,155,255", 0.6 * f * f);
        b.lineWidth = lerp(3, 6, f) * px;
        ruta(b, Math.max(0, d0), d1);
        b.stroke();
      }
      // punta
      const p = enCurva(c, u);
      const X = cx + p[0] * w;
      const Y = cy + p[1] * w;
      a.fillStyle = rgba("255,255,255", 1);
      a.beginPath();
      a.arc(X, Y, 2.1 * px, 0, TAU);
      a.fill();
      b.fillStyle = rgba("150,185,255", 0.9 + 0.4 * nota);
      b.beginPath();
      b.arc(X, Y, 7 * px, 0, TAU);
      b.fill();
    }
    // destello al cerrar el contorno
    const g = golpe(t, [tb], 6);
    if (t >= tb && g > 0.02) {
      const p = enCurva(c, 0);
      brillo(b, cx + p[0] * w, cy + p[1] * w, 46, "160,195,255", 0.9 * g);
    }
  });
  ctx.restore();
  // halo de fondo muy tenue que crece con el dibujo
  brillo(ctx, d.logo.cx, d.logo.cy, d.W * 0.42, "30,60,200", 0.05 * pr(t, T_FINAL, T_SUELTA - T_FINAL));
  componer(ctx, A, B, 1 + 0.5 * late);
};

// ── 2 y 3 · Partículas (suelta, vacío y convergencia) ──
const NIVELES = 6;
const nubes = (ctx: Ctx, d: Disp, t: number, marca: HTMLImageElement | null) => {
  const ps = particulas(d, marca);
  const k = camara(t);
  const tau = t - T_SUELTA;
  const desvanece = eIO(pr(t, T_MARCA + 0.2, 0.7));
  if (desvanece >= 1) return;
  const { A, B, a, b } = capas(d);
  conCamara(a, d, k);
  conCamara(b, d, k);
  a.globalCompositeOperation = "lighter";
  b.globalCompositeOperation = "lighter";
  a.lineCap = "round";
  b.lineCap = "round";
  const rd = swell(t, "redoble");
  // brillo general: estallido en la suelta, calma en el vacío, sube con el redoble y con la llegada
  const base = lerp(1, 0.8, eOut(pr(tau, 0, 1.2))) + 0.25 * (t < T_CONV ? rd : Math.exp(-(t - T_CONV) * 4)) + 0.3 * eIO(pr(t, T_CONV, 0.5));
  const dt = 1 / 60;
  const tope = 9 / k; // estela máxima de cada partícula (px)
  // trazos cortos en la dirección del movimiento (desenfoque de movimiento), agrupados por color, tamaño y brillo
  const caminos = Array.from({ length: 2 * 2 * NIVELES }, () => new Path2D());
  ps.forEach((p, i) => {
    const q = posicion(p, t, d);
    const q0 = posicion(p, t - dt, d);
    const tw = 0.75 + 0.25 * Math.sin(t * 3.1 + p.fase * 5);
    const al = cl(base * tw * (0.55 + 0.45 * azar(i * 1.37)));
    const nivel = Math.min(NIVELES - 1, Math.floor(al * NIVELES));
    const c = caminos[((p.azul ? 1 : 0) * 2 + (p.r > 1.05 ? 1 : 0)) * NIVELES + nivel];
    let ex = q0[0] - q[0];
    let ey = q0[1] - q[1];
    const el = Math.hypot(ex, ey);
    if (el > tope) {
      ex *= tope / el;
      ey *= tope / el;
    }
    c.moveTo(q[0] + ex, q[1] + ey);
    c.lineTo(q[0] + 0.01, q[1]);
  });
  const vis = 1 - desvanece;
  caminos.forEach((c, j) => {
    const nivel = j % NIVELES;
    const grande = Math.floor(j / NIVELES) % 2;
    const azul = Math.floor(j / NIVELES / 2);
    const al = ((nivel + 0.5) / NIVELES) * vis;
    a.strokeStyle = rgba(azul ? "150,182,255" : "236,242,255", al);
    a.lineWidth = (grande ? 2.3 : 1.4) / k;
    a.stroke(c);
    b.strokeStyle = rgba("80,128,255", al * 0.8);
    b.lineWidth = (grande ? 5 : 3.5) / k;
    b.stroke(c);
  });
  const suelta = golpe(t, [T_SUELTA], 5);
  componer(ctx, A, B, 0.9 + 1.4 * suelta, 1);
  // destello de la suelta sobre la marca
  if (suelta > 0.02) brillo(ctx, d.logo.cx, d.logo.cy, 520 * d.logo.s, "120,160,255", 0.16 * suelta);
};

// ── 3 · Revelación: campo LIC desde las cargas hacia afuera (borde suave), flujo y estallidos ──
const revelacion = (ctx: Ctx, d: Disp, t: number, img: HTMLImageElement | null) => {
  if (t < T_CONV) return;
  const lt = t - T_CONV;
  const R = Math.hypot(d.W, d.H) * 1.1;
  const radio = R * (1 - Math.pow(1 - pr(t, T_CONV, 3.2), 2.4)) + 1;
  const capa = auxiliar(d.W, d.H, "finLIC");
  const x = capa.getContext("2d")!;
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalCompositeOperation = "source-over";
  x.globalAlpha = 1;
  x.clearRect(0, 0, d.W, d.H);
  if (img && img.complete && img.naturalWidth) x.drawImage(img, 0, 0, d.W, d.H);
  x.globalCompositeOperation = "lighter";
  // el flujo lo da la propia LIC animada (sin guiones superpuestos: alineados, formaban anillos)
  if (radio < R) {
    const mask = auxiliar(d.W, d.H, "finMask");
    const mx = mask.getContext("2d")!;
    mx.setTransform(1, 0, 0, 1, 0, 0);
    mx.globalCompositeOperation = "source-over";
    mx.clearRect(0, 0, d.W, d.H);
    mx.globalCompositeOperation = "lighter";
    posCargas(d).forEach(([qx, qy]) => {
      const g = mx.createRadialGradient(qx, qy, 0, qx, qy, radio);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.55, "rgba(255,255,255,1)");
      g.addColorStop(0.82, "rgba(255,255,255,0.3)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      mx.fillStyle = g;
      mx.fillRect(qx - radio, qy - radio, 2 * radio, 2 * radio);
    });
    x.globalCompositeOperation = "destination-in";
    x.drawImage(mask, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.drawImage(capa, 0, 0);
  ctx.restore();
  // pulsos de brillo: anillos que salen de las cargas e iluminan las hebras a su paso
  const vivos = PULSOS.filter((p) => p.t <= t && t - p.t < 1.4);
  if (vivos.length && img && img.complete && img.naturalWidth) {
    const pm = auxiliar(d.W, d.H, "finPulso");
    const px = pm.getContext("2d")!;
    px.setTransform(1, 0, 0, 1, 0, 0);
    px.globalCompositeOperation = "source-over";
    px.globalAlpha = 1;
    px.clearRect(0, 0, d.W, d.H);
    px.globalCompositeOperation = "lighter";
    vivos.forEach((p) => {
      const tau = t - p.t;
      const rr = 40 + tau * 640 * d.logo.s;
      const anchoP = 90 * d.logo.s;
      const al = Math.exp(-tau * 2.2) * (0.5 + p.v);
      posCargas(d).forEach(([qx, qy]) => {
        const g2 = px.createRadialGradient(qx, qy, Math.max(0, rr - anchoP), qx, qy, rr + anchoP);
        g2.addColorStop(0, "rgba(255,255,255,0)");
        g2.addColorStop(0.5, rgba("255,255,255", al));
        g2.addColorStop(1, "rgba(255,255,255,0)");
        px.fillStyle = g2;
        px.fillRect(qx - rr - anchoP, qy - rr - anchoP, 2 * (rr + anchoP), 2 * (rr + anchoP));
      });
    });
    px.globalCompositeOperation = "source-in";
    px.drawImage(img, 0, 0, d.W, d.H);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = cl(eOut(pr(t, T_CONV, 1.5)));
    ctx.drawImage(pm, 0, 0);
    ctx.drawImage(pm, 0, 0);
    ctx.restore();
  }
  // frente de la revelación: un anillo fino que se aleja de cada carga
  const g = golpe(t, [T_CONV], 2.2);
  if (radio < R) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 1;
    posCargas(d).forEach(([qx, qy]) => {
      ctx.strokeStyle = rgba("170,200,255", 0.28 * g);
      ctx.beginPath();
      ctx.arc(qx, qy, radio * 0.8, 0, TAU);
      ctx.stroke();
    });
    ctx.restore();
  }
  // cargas: se encienden en el golpe y quedan como en la foto
  const enciende = eOut(pr(t, T_CONV, 0.18));
  const pico = golpe(t, [T_CONV], 3);
  const respira = 1 + 0.07 * pulsoNota(t, 4) + 0.035 * Math.sin((TAU * t) / COMPAS);
  posCargas(d).forEach(([qx, qy], i) => estallidoVivo(ctx, qx, qy, (i ? 1.12 : 0.95) * (1 + 0.55 * pico) * respira * d.logo.s, enciende, i * 13, t));
  if (lt < 1.5) brillo(ctx, d.W / 2, d.logo.cy, d.W * 0.55, "90,130,255", 0.1 * pico);
};

export const dibujarFinal = (ctx: Ctx, d: Disp, t: number, img: HTMLImageElement | null, marca: HTMLImageElement | null) => {
  if (t < T_SUELTA) {
    epiciclos(ctx, d, t);
    return;
  }
  revelacion(ctx, d, t, img);
  nubes(ctx, d, t, marca);
};
