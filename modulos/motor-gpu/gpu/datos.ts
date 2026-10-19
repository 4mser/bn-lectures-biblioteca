// Precomputed data textures, deterministic (fixed seeds, IEEE math): identical in every render tab.

let lorenz: { w: number; h: number; data: Float32Array } | null = null;
// One long Lorenz trajectory (sigma 10, rho 28, beta 8/3), RK4, 1024 x 1024 samples: xyz centred and scaled to
// roughly [-1, 1], w = local speed (for colour).
export const datosLorenz = () => {
  if (lorenz) return lorenz;
  const w = 1024;
  const h = 1024;
  const n = w * h;
  const data = new Float32Array(n * 4);
  const s = 10;
  const r = 28;
  const b = 8 / 3;
  const dt = 0.0021;
  let x = 0.1;
  let y = 0;
  let z = 0;
  const f = (x: number, y: number, z: number): [number, number, number] => [s * (y - x), x * (r - z) - y, x * y - b * z];
  const paso = () => {
    const k1 = f(x, y, z);
    const k2 = f(x + (dt / 2) * k1[0], y + (dt / 2) * k1[1], z + (dt / 2) * k1[2]);
    const k3 = f(x + (dt / 2) * k2[0], y + (dt / 2) * k2[1], z + (dt / 2) * k2[2]);
    const k4 = f(x + dt * k3[0], y + dt * k3[1], z + dt * k3[2]);
    x += (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    y += (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    z += (dt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
    return k1;
  };
  for (let i = 0; i < 6000; i++) paso();
  for (let i = 0; i < n; i++) {
    const v = paso();
    data[i * 4] = x / 20;
    data[i * 4 + 1] = (z - 25) / 20;
    data[i * 4 + 2] = y / 20;
    data[i * 4 + 3] = Math.hypot(v[0], v[1], v[2]) / 200;
  }
  lorenz = { w, h, data };
  return lorenz;
};

let dipolo: { w: number; h: number; data: Float32Array } | null = null;
// Field lines of +q at (-1, 0) and -q at (1, 0) in the plane, K lines x M points of equal arc length.
// xy = position, z = normalised arc length (0 at +q), w = 1 if the point is valid.
export const datosDipolo = () => {
  if (dipolo) return dipolo;
  const M = 512;
  const K = 256;
  const data = new Float32Array(M * K * 4);
  const campo = (x: number, y: number): [number, number] => {
    let ex = 0;
    let ey = 0;
    for (const [qx, q] of [
      [-1, 1],
      [1, -1],
    ]) {
      const dx = x - qx;
      const dy = y;
      const r3 = Math.pow(dx * dx + dy * dy + 1e-6, 1.5);
      ex += (q * dx) / r3;
      ey += (q * dy) / r3;
    }
    const m = Math.hypot(ex, ey) + 1e-12;
    return [ex / m, ey / m];
  };
  const ds = 0.012;
  for (let k = 0; k < K; k++) {
    // golden-angle jitter so lines are not perfectly regular
    const a = ((k + 0.5) / K) * Math.PI * 2 + 0.013 * Math.sin(k * 12.9898);
    let x = -1 + 0.02 * Math.cos(a);
    let y = 0.02 * Math.sin(a);
    const pts: [number, number][] = [[x, y]];
    let terminado = false;
    for (let i = 0; i < 6000 && !terminado; i++) {
      // RK2
      const [ax, ay] = campo(x, y);
      const [bx, by] = campo(x + (ds / 2) * ax, y + (ds / 2) * ay);
      x += ds * bx;
      y += ds * by;
      pts.push([x, y]);
      if (Math.hypot(x - 1, y) < 0.02 || Math.abs(x) > 6 || Math.abs(y) > 6) terminado = true;
    }
    // resample to M points of equal arc length (keep at most 9 units of length)
    const largo = Math.min(pts.length - 1, Math.round(9 / ds));
    for (let j = 0; j < M; j++) {
      const u = (j / (M - 1)) * largo;
      const i0 = Math.floor(u);
      const i1 = Math.min(largo, i0 + 1);
      const f = u - i0;
      const o = (k * M + j) * 4;
      data[o] = pts[i0][0] * (1 - f) + pts[i1][0] * f;
      data[o + 1] = pts[i0][1] * (1 - f) + pts[i1][1] * f;
      data[o + 2] = j / (M - 1);
      data[o + 3] = 1;
    }
  }
  dipolo = { w: M, h: K, data };
  return dipolo;
};
