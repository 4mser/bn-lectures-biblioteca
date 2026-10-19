// GPU strokes: the 2D/3D math simulations (epicycles, Lissajous, tesseract, spacetime mesh, field lines...) are built
// in JS as world-space segments and drawn as instanced screen-space quads with a gaussian cross-section, additive in
// the HDR buffer: they get the same camera, depth of field, bloom, ACES and grain as the raymarched worlds.
export type V3 = [number, number, number];
export type RGB = [number, number, number];

// Per instance: p0.xyz, width (px at 1080), p1.xyz, caps (bit0 start, bit1 end), c0.rgba, c1.rgba = 16 floats.
export const FLOATS = 16;

export class Trazos {
  data: Float32Array;
  n = 0;
  cap: number;
  constructor(cap = 400000) {
    this.cap = cap;
    this.data = new Float32Array(cap * FLOATS);
  }
  reset() {
    this.n = 0;
  }
  seg(a: V3, b: V3, ca: RGB, aa: number, cb: RGB, ab: number, w: number, caps = 0) {
    if (this.n >= this.cap || (aa <= 0.0005 && ab <= 0.0005)) return;
    const o = this.n * FLOATS;
    const d = this.data;
    d[o] = a[0];
    d[o + 1] = a[1];
    d[o + 2] = a[2];
    d[o + 3] = w;
    d[o + 4] = b[0];
    d[o + 5] = b[1];
    d[o + 6] = b[2];
    d[o + 7] = caps;
    d[o + 8] = ca[0];
    d[o + 9] = ca[1];
    d[o + 10] = ca[2];
    d[o + 11] = aa;
    d[o + 12] = cb[0];
    d[o + 13] = cb[1];
    d[o + 14] = cb[2];
    d[o + 15] = ab;
    this.n++;
  }
  // Polyline with per-vertex colour/alpha (functions of the vertex index) and round caps only at both ends.
  linea(pts: V3[], col: RGB | ((i: number) => RGB), alfa: number | ((i: number) => number), w: number, cerrada = false) {
    const N = pts.length;
    if (N < 2) return;
    const C = typeof col === "function" ? col : () => col;
    const A = typeof alfa === "function" ? alfa : () => alfa;
    const M = cerrada ? N : N - 1;
    for (let i = 0; i < M; i++) {
      const j = (i + 1) % N;
      let caps = 0;
      if (!cerrada && i === 0) caps |= 1;
      if (!cerrada && i === M - 1) caps |= 2;
      this.seg(pts[i], pts[j], C(i), A(i), C(j), A(j), w, caps);
    }
  }
  punto(p: V3, col: RGB, a: number, w: number) {
    this.seg(p, p, col, a, col, a, w, 3);
  }
}

export const LIN_VS = /* glsl */ `
layout(location = 0) in vec4 aP0;
layout(location = 1) in vec4 aP1;
layout(location = 2) in vec4 aC0;
layout(location = 3) in vec4 aC1;
uniform float uLinGanancia;
out vec4 vC0;
out vec4 vC1;
flat out vec2 vA;
flat out vec2 vB;
flat out float vS;
flat out float vE;
flat out float vCaps;
vec3 proyecta(vec3 p) {
  vec3 d = p - uCamPos;
  float z = dot(d, uCamRot[2]);
  vec2 uv = vec2(dot(d, uCamRot[0]), dot(d, uCamRot[1])) / (max(z, 1e-3) * uFov);
  return vec3(uv * 0.5 * uRes.y + 0.5 * uRes, z);
}
void main() {
  vec3 a = proyecta(aP0.xyz);
  vec3 b = proyecta(aP1.xyz);
  if (a.z < 0.08 || b.z < 0.08) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  float esc = uRes.y / 1080.0;
  float w = aP0.w * esc;
  float zm = 0.5 * (a.z + b.z);
  float coc = uAperture * abs(zm - uFocus) / zm * uRes.y * 0.5;
  float s = max(sqrt(0.25 * w * w + 0.3 * coc * coc), 0.6);
  vE = min(1.0, 0.5 * max(w, 0.35) / s) * min(1.0, w / 0.6 + 0.2) * smoothstep(0.08, 0.6, zm);
  float R = s * 3.2 + 1.0;
  vec2 d = b.xy - a.xy;
  float L = length(d);
  vec2 t = L > 1e-4 ? d / L : vec2(1.0, 0.0);
  vec2 n = vec2(-t.y, t.x);
  int i = gl_VertexID;
  float along = (i & 1) == 0 ? -R : L + R;
  float side = (i & 2) == 0 ? -R : R;
  vec2 pos = a.xy + t * along + n * side;
  gl_Position = vec4(pos / uRes * 2.0 - 1.0, 0.0, 1.0);
  vA = a.xy; vB = b.xy; vS = s; vCaps = aP1.w;
  vC0 = vec4(aC0.rgb * aC0.a * uLinGanancia, 1.0);
  vC1 = vec4(aC1.rgb * aC1.a * uLinGanancia, 1.0);
}`;

export const LIN_FS = /* glsl */ `
in vec4 vC0;
in vec4 vC1;
flat in vec2 vA;
flat in vec2 vB;
flat in float vS;
flat in float vE;
flat in float vCaps;
out vec4 o;
void main() {
  vec2 p = gl_FragCoord.xy;
  vec2 ab = vB - vA;
  float L2 = dot(ab, ab);
  float h = L2 > 1e-6 ? dot(p - vA, ab) / L2 : 0.0;
  int caps = int(vCaps + 0.5);
  // no caps at inner joints (avoids double brightness where consecutive segments meet)
  if (L2 > 1e-6 && ((h < 0.0 && (caps & 1) == 0) || (h > 1.0 && (caps & 2) == 0))) discard;
  float hc = clamp(h, 0.0, 1.0);
  float d = length(p - vA - ab * hc);
  float g = exp(-d * d / (2.0 * vS * vS)) * vE;
  if (g < 0.002) discard;
  o = vec4(mix(vC0.rgb, vC1.rgb, hc) * g, 1.0);
}`;
