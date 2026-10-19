// One million GPU particles. Every particle evaluates two "forms" (A and B) as pure functions of its id and time
// and morphs between them with a per-particle stagger and a curl-noise transport, so the output of one simulation
// literally becomes the matter of the next. Additive HDR points with depth-of-field bokeh.
export const PART_VS = /* glsl */ `
uniform float uFormA, uFormB, uMix, uPartInt, uPartTam, uCurl, uNPart, uMixBrillo, uStagKey;
uniform vec4 uNotas;            // times of the last 4 ostinato notes
uniform vec2 uNube;             // cloud scale, burst time
uniform vec4 uOrb;              // a, e, period, precession per orbit (rad)
uniform float uOrbT0, uOrbTail, uOrbInc;
uniform vec4 uOnd;              // source 1 (x,z), source 2 (x,z)
uniform vec4 uOndK;             // k, omega, amplitude, front radius
uniform float uOndS2;           // second source strength
uniform float uLorRot;
uniform float uRedFase, uRedCiclo;
uniform float uDipEsc, uDipD, uDipFlujo;
uniform float uToroRot;
uniform float uZoomVel;
uniform float uPrismaFan;
uniform float uPartEsc;          // global scale (kick pulse)
uniform sampler2D uLorenz;
uniform sampler2D uDipolo;

out vec3 vCol;
out float vBokeh;

vec3 esfera(float u, float v) { float z = 2.0 * u - 1.0; float a = TAU * v; float s = sqrt(1.0 - z * z); return vec3(s * cos(a), z, s * sin(a)); }
vec3 gauss3(uint id, uint k) {
  float u1 = max(rndu(id, k), 1e-7), u2 = rndu(id, k + 1u), u3 = max(rndu(id, k + 2u), 1e-7), u4 = rndu(id, k + 3u);
  float r1 = sqrt(-2.0 * log(u1)), r2 = sqrt(-2.0 * log(u3));
  return vec3(r1 * cos(TAU * u2), r1 * sin(TAU * u2), r2 * cos(TAU * u4));
}
vec3 fib(float i, float n) { float z = 1.0 - 2.0 * (i + 0.5) / n; float a = i * 2.39996323; float s = sqrt(1.0 - z * z); return vec3(s * cos(a), z, s * sin(a)); }

// cheap smooth vector field and its curl (numerical) for the transport and the fluid
vec3 campoV(vec3 p) {
  return vec3(sin(p.y * 1.7 + 1.3) + sin(p.z * 2.3 + 0.4 + sin(p.x * 1.1)),
              sin(p.z * 1.9 + 2.1) + sin(p.x * 1.3 + 4.0 + sin(p.y * 0.9)),
              sin(p.x * 1.5 + 0.7) + sin(p.y * 2.1 + 3.3 + sin(p.z * 1.3)));
}
vec3 curl(vec3 p) {
  const float e = 0.08;
  vec3 dx = vec3(e, 0, 0), dy = vec3(0, e, 0), dz = vec3(0, 0, e);
  vec3 px0 = campoV(p - dx), px1 = campoV(p + dx);
  vec3 py0 = campoV(p - dy), py1 = campoV(p + dy);
  vec3 pz0 = campoV(p - dz), pz1 = campoV(p + dz);
  return vec3((py1.z - py0.z) - (pz1.y - pz0.y), (pz1.x - pz0.x) - (px1.z - px0.z), (px1.y - px0.y) - (py1.x - py0.x)) / (2.0 * e);
}

// ---------- forms ----------
// 0 · a single point of light (all matter collapsed)
void f0(uint id, out vec3 p, out vec3 c) {
  p = gauss3(id, 1u) * 0.006;
  c = vec3(0.8, 0.9, 1.0) * 2e-6;
}
// 1 · burst: a supernova-like shell of radial filaments (it will order itself into field lines)
void f1(uint id, out vec3 p, out vec3 c) {
  // same directions as the field lines (id % 560): the burst literally straightens into the field
  vec3 d = normalize(fib(float(id % 560u), 560.0) + gauss3(id, 1u) * 0.035 + (hash31(float(id % 560u)) - 0.5) * 0.12);
  float age = max(uTime - uNube.y, 0.0);
  float R = uNube.x > 1.5 ? uNube.x : 0.05 + 1.7 * (1.0 - exp(-age * 3.2));
  float u = rndu(id, 3u);
  float lump = 0.82 + 0.18 * vnoise(d * 5.0 + 3.0);
  float rr = R * lump * mix(0.12, 1.0, pow(u, 0.45));
  p = d * rr + curl(d * 2.0 + uTime * 0.1) * 0.015 * R;
  float edge = pow(u, 3.0);
  c = mix(vec3(0.45, 0.75, 1.0), vec3(1.0), edge) * (0.002 + 0.008 * edge);
}
// 2 · field lines of a point charge (volumetric, flowing outward, pulses on every ostinato note)
void f2(uint id, out vec3 p, out vec3 c) {
  float NL = 560.0;
  float L = float(id % 560u);
  vec3 d = fib(L, NL);
  float u = fract(rndu(id, 1u) + uTime * 0.11);
  float r = 0.16 * pow(25.0, u);
  vec3 j = gauss3(id, 3u) * 0.0022 * (1.0 + r * 1.2);
  p = d * r + j;
  float b = smoothstep(0.16, 1.2, r) / (0.35 + r * r * 0.9) * 1.3;
  float pul = 0.0;
  for (int k = 0; k < 4; k++) { float age = uTime - uNotas[k]; if (age > 0.0 && age < 3.0) { float R = age * 2.4; pul += exp(-pow((r - R) / (0.035 + 0.03 * R), 2.0)) * exp(-age * 0.9) * smoothstep(0.3, 1.0, r); } }
  float hue = sat(r / 3.0);
  c = mix(vec3(0.95, 0.98, 1.0), vec3(0.3, 0.7, 1.0), hue) * (0.012 * b + 0.02 * pul) * smoothstep(4.0, 2.0, r);
}
// 3 · gravitational well: polar grid sinking into a throat, infalling and rotating (Keplerian)
float pozoY(float rho) { return -0.5 / (rho + 0.05) + 0.12; }
void f3(uint id, out vec3 p, out vec3 c) {
  float sel = rndu(id, 1u);
  float rho, a;
  if (sel < 0.45) {
    float k = floor(rndu(id, 2u) * 64.0);
    float u = fract(rndu(id, 3u) - uTime * 0.18);
    rho = mix(0.32, 4.2, u * u);
    a = k / 64.0 * TAU + 0.6 / rho * 1.0 + uTime * 0.25 / pow(rho, 1.5);
  } else {
    float k = floor(rndu(id, 2u) * 30.0);
    rho = 0.32 * pow(4.2 / 0.32, (k + 0.5) / 30.0);
    a = rndu(id, 3u) * TAU + uTime * 0.35 / pow(rho, 1.5);
  }
  p = vec3(rho * cos(a), pozoY(rho), rho * sin(a)) + gauss3(id, 5u) * 0.004;
  float w = smoothstep(4.2, 2.6, rho);
  c = mix(vec3(0.9, 0.97, 1.0), vec3(0.25, 0.6, 1.0), sat(rho / 3.0)) * 0.012 * w * (0.5 + 0.25 / (rho + 0.3)) * smoothstep(0.32, 0.7, rho);
}
// 4 · star orbit with relativistic precession: the whole rosette accumulates as a luminous trail
vec3 orbita(float tt) {
  float n = TAU / uOrb.z;
  float M = n * (tt - uOrbT0);
  float e = uOrb.y;
  float E = M; for (int i = 0; i < 6; i++) E = E - (E - e * sin(E) - M) / (1.0 - e * cos(E));
  float nu = 2.0 * atan(sqrt((1.0 + e) / (1.0 - e)) * tan(E * 0.5));
  // continuous true anomaly (unwrap with E)
  nu += TAU * floor((E + PI) / TAU);
  float r = uOrb.x * (1.0 - e * cos(E));
  float w = uOrb.w * (M / TAU) + 0.8;
  float ang = nu + w;
  vec3 q = vec3(r * cos(ang), 0.0, r * sin(ang));
  q.yz = rot(uOrbInc) * q.yz;
  return q;
}
void f4(uint id, out vec3 p, out vec3 c) {
  float s = rndu(id, 1u);
  float tail = max(uOrbTail, 0.001);
  float tt = uTime - s * tail;
  p = orbita(tt) + gauss3(id, 2u) * 0.003 * (0.3 + s);
  float head = exp(-s * tail * 6.0);
  float fade = pow(1.0 - s, 1.3);
  c = mix(vec3(0.55, 0.78, 1.0), vec3(1.0, 0.97, 0.92), head) * (0.004 * fade + 0.05 * head) * step(uOrbT0, tt);
}
// 5 · two-source interference surface (point lattice, thin-film colour)
float ondaH(vec2 xz) {
  float r1 = length(xz - uOnd.xy), r2 = length(xz - uOnd.zw);
  float f1 = smoothstep(uOndK.w, uOndK.w - 0.6, r1);
  float f2 = smoothstep(uOndK.w, uOndK.w - 0.6, r2) * uOndS2;
  return uOndK.z * (cos(uOndK.x * r1 - uOndK.y * uTime) * f1 / sqrt(1.0 + r1 * 1.5) + cos(uOndK.x * r2 - uOndK.y * uTime) * f2 / sqrt(1.0 + r2 * 1.5));
}
void f5(uint id, out vec3 p, out vec3 c) {
  float gx = float(id % 1024u), gz = float(id / 1024u);
  vec2 xz = (vec2(gx, gz) / 1023.0 - 0.5) * 8.0 + (vec2(rndu(id, 1u), rndu(id, 2u)) - 0.5) * 0.006;
  float h = ondaH(xz);
  p = vec3(xz.x, h, xz.y);
  float r1 = length(xz - uOnd.xy), r2 = length(xz - uOnd.zw);
  float fr = pow(0.5 + 0.5 * cos(uOndK.x * (r1 - r2)), 10.0) * uOndS2 * smoothstep(uOndK.w, uOndK.w - 1.0, max(r1, r2));
  float th = 380.0 + 700.0 * (h / max(uOndK.z, 1e-3) * 0.5 + 0.5) + 160.0 * sin(r1 * 0.9 - r2 * 0.6);
  vec3 film = pelicula(th, 1.33, 0.6);
  float edge = smoothstep(3.8, 2.0, length(xz));
  c = (film * 1.4 + 0.1) * (0.0015 + 0.012 * fr) * edge;
}
// 6 · prism: white beam (sum of all wavelengths) dispersed into a spectral fan
vec3 prismaRayo(float lam, float s, out float tras) {
  // beam enters from the left, refracts at the prism (origin) and exits as a fan to the right
  vec3 A = vec3(-7.0, -0.35, 0.0), P = vec3(-0.35, 0.0, 0.0), Q = vec3(0.35, 0.05, 0.0);
  float dev = (lam - 580.0) / 200.0;
  vec3 dir = normalize(vec3(1.0, -0.12 - dev * 0.55 * uPrismaFan, dev * 0.08));
  float l1 = length(P - A), l2 = length(Q - P), l3 = 9.0;
  float L = s * (l1 + l2 + l3);
  tras = step(l1 + l2, L);
  if (L < l1) return mix(A, P, L / l1);
  if (L < l1 + l2) return mix(P, Q, (L - l1) / l2);
  return Q + dir * (L - l1 - l2);
}
void f6(uint id, out vec3 p, out vec3 c) {
  float lam = 400.0 + 300.0 * rndu(id, 1u);
  float s = fract(rndu(id, 2u) + uTime * 0.07);
  float tras;
  vec3 q = prismaRayo(lam, s, tras);
  float th = mix(0.012, 0.02 + 0.03 * s, tras);
  p = q + gauss3(id, 3u) * th;
  c = espectro(lam) * 0.022 * mix(1.0, 1.6, tras) * smoothstep(1.0, 0.75, s);
}
// 7 · curl-noise fluid: discrete emitters on a stratified rainbow sheet; each emitter releases particles
// continuously, so particles of one emitter draw a streakline (a thin luminous filament of a single colour)
void f7(uint id, out vec3 p, out vec3 c) {
  uint k = id % 2600u;
  float e1 = rndu(k, 1u), e2 = rndu(k, 2u);
  float lam = 400.0 + 300.0 * e1;
  float life = 6.0;
  float age = fract(rndu(id, 3u) + uTime / life) * life;
  float dev = (lam - 580.0) / 200.0;
  vec3 q = vec3(-1.6 + 3.2 * e2, -0.2 - dev * 1.5 - e2 * 0.2, dev * 0.5 + (rndu(k, 4u) - 0.5) * 0.3);
  float dt = age / 14.0;
  for (int i = 0; i < 14; i++) {
    vec3 v = curl(q * 0.75 + vec3(0.0, 0.0, uTime * 0.05)) * 0.3 + vec3(0.32, 0.03, 0.0);
    q += v * dt;
  }
  p = q + gauss3(id, 5u) * 0.0025;
  float env = smoothstep(0.0, 0.4, age) * smoothstep(life, life * 0.55, age);
  c = espectro(lam) * 0.013 * env;
}
// 8 · Lorenz attractor: a million points flowing along one long trajectory (amber / magenta)
vec4 lorenzEn(float idx) {
  float i0 = floor(idx); float f = idx - i0;
  ivec2 a = ivec2(int(mod(i0, 1024.0)), int(mod(floor(i0 / 1024.0), 1024.0)));
  float i1 = i0 + 1.0;
  ivec2 b = ivec2(int(mod(i1, 1024.0)), int(mod(floor(i1 / 1024.0), 1024.0)));
  return mix(texelFetch(uLorenz, a, 0), texelFetch(uLorenz, b, 0), f);
}
void f8(uint id, out vec3 p, out vec3 c) {
  float idx = fract(rndu(id, 1u) + uTime * 0.0035) * 1048570.0;
  vec4 L = lorenzEn(idx);
  vec3 q = L.xyz * 1.65;
  q.xz = rot(uLorRot) * q.xz;
  p = q + gauss3(id, 2u) * 0.003;
  float lobo = smoothstep(-0.25, 0.25, L.x * 1.0);
  vec3 col = mix(vec3(1.0, 0.42, 0.07), vec3(1.0, 0.1, 0.55), lobo);
  col = mix(col, vec3(1.0, 0.8, 0.6), sat(L.w * 1.4 - 0.5) * 0.45);
  c = col * 0.022 * (0.5 + L.w * 1.2);
}
// 9 · hydrogen 3d_z2 orbital sampled from |psi|^2 (gamma radial + angular rejection), violet
void f9(uint id, out vec3 p, out vec3 c) {
  float pr = 1.0;
  for (uint k = 0u; k < 7u; k++) pr *= max(rndu(id, 10u + k), 1e-7);
  float r = -1.5 * log(pr) / 10.5;
  vec3 d = vec3(0.0);
  float ang = 0.0;
  for (uint k = 0u; k < 10u; k++) {
    d = esfera(rndu(id, 30u + k * 2u), rndu(id, 31u + k * 2u));
    float ct = d.y;
    ang = 3.0 * ct * ct - 1.0;
    if (rndu(id, 60u + k) < ang * ang / 4.0) break;
  }
  p = d * r * 1.0;
  p.xz = rot(uTime * 0.25) * p.xz;
  float lobo = step(0.0, ang);
  vec3 col = mix(vec3(0.62, 0.22, 1.0), vec3(0.35, 0.45, 1.0), lobo);
  float spk = pow(rndu(id, 80u), 30.0);
  col = mix(col, vec3(0.95, 0.85, 1.0), spk);
  c = col * (0.0035 + 0.05 * spk);
}
// 10 · DNA double helix of points (teal), drifting along its axis
void f10(uint id, out vec3 p, out vec3 c) {
  float sel = rndu(id, 1u);
  float x = (rndu(id, 2u) - 0.5) * 11.0;
  float R = 0.62;
  float tw = 2.1;
  float a = x * tw + uTime * 1.3;
  vec3 col;
  if (sel < 0.78) {
    float off = sel < 0.39 ? 0.0 : 2.3;
    float aa = a + off;
    p = vec3(x, R * cos(aa), R * sin(aa)) + gauss3(id, 3u) * 0.028;
    col = mix(vec3(0.05, 0.95, 0.78), vec3(0.6, 1.0, 0.95), pow(rndu(id, 4u), 6.0));
    c = col * 0.03;
  } else {
    float xk = (floor(x / 0.17) + 0.5) * 0.17;
    float ak = xk * tw + uTime * 1.3;
    vec3 A = vec3(xk, R * cos(ak), R * sin(ak));
    vec3 B = vec3(xk, R * cos(ak + 2.3), R * sin(ak + 2.3));
    float s = rndu(id, 5u);
    p = mix(A, B, s) + gauss3(id, 6u) * 0.012;
    float base = hash11(xk * 13.1);
    col = mix(vec3(0.1, 0.7, 1.0), vec3(0.2, 1.0, 0.6), base);
    c = col * 0.05 * (0.6 + 0.4 * sin(s * PI));
  }
  c *= smoothstep(5.5, 3.5, abs(x));
}
// 11/12 · neural network (coral edges, gold activations) and the same network projected on a torus
const int CAPAS = 6;
float nCapa(int l) { return l == 0 ? 6.0 : l == 1 ? 10.0 : l == 2 ? 14.0 : l == 3 ? 14.0 : l == 4 ? 10.0 : 6.0; }
vec3 nodoRed(int l, float j) {
  float n = nCapa(l);
  float x = (float(l) - 2.5) * 1.15;
  float rr = 0.25 + 1.05 * sqrt((j + 0.5) / n);
  float a = j * 2.39996323 + float(l) * 0.7;
  return vec3(x, rr * cos(a), rr * sin(a));
}
vec3 nodoToro(int l, float j) {
  float n = nCapa(l);
  float u = (float(l) / 6.0) * TAU + uToroRot;
  float v = (j / n) * TAU + float(l) * 0.5;
  float R = 1.55, r = 0.62;
  return vec3((R + r * cos(v)) * cos(u), r * sin(v), (R + r * cos(v)) * sin(u));
}
vec3 toroUV(float u, float v) { float R = 1.55, r = 0.62; return vec3((R + r * cos(v)) * cos(u), r * sin(v), (R + r * cos(v)) * sin(u)); }
void redComun(uint id, bool toro, out vec3 p, out vec3 c) {
  float sel = rndu(id, 1u);
  int l = int(floor(rndu(id, 2u) * 5.0));
  float ja = floor(rndu(id, 3u) * nCapa(l));
  float jb = floor(rndu(id, 4u) * nCapa(l + 1));
  float ciclo = floor(uRedFase / 6.0);
  float fase = mod(uRedFase, 6.0);
  float activo = step(0.55, hash13(vec3(float(l), ja + jb * 17.0, ciclo)));
  vec3 col;
  if (sel < 0.82) {
    float s = rndu(id, 5u);
    if (!toro) {
      p = mix(nodoRed(l, ja), nodoRed(l + 1, jb), s);
    } else {
      float n0 = nCapa(l), n1 = nCapa(l + 1);
      float u0 = (float(l) / 6.0) * TAU + uToroRot, u1 = (float(l + 1) / 6.0) * TAU + uToroRot;
      float v0 = (ja / n0) * TAU + float(l) * 0.5, v1 = (jb / n1) * TAU + float(l + 1) * 0.5;
      float dv = mod(v1 - v0 + PI, TAU) - PI;
      p = toroUV(mix(u0, u1, s), v0 + dv * s);
    }
    p += gauss3(id, 6u) * 0.004;
    float pul = exp(-pow((s - (fase - float(l))) * 5.0, 2.0)) * activo;
    col = vec3(1.0, 0.28, 0.2) * 0.006 + vec3(1.0, 0.78, 0.35) * pul * 0.09;
  } else {
    int ln = int(floor(rndu(id, 7u) * 6.0));
    float jn = floor(rndu(id, 8u) * nCapa(ln));
    vec3 q = toro ? nodoToro(ln, jn) : nodoRed(ln, jn);
    p = q + gauss3(id, 9u) * 0.03;
    float llega = exp(-pow((fase - float(ln)) * 2.2, 2.0));
    col = mix(vec3(1.0, 0.35, 0.25) * 0.02, vec3(1.0, 0.9, 0.6) * 0.12, llega);
  }
  c = col;
}
void f11(uint id, out vec3 p, out vec3 c) { redComun(id, false, p, c); }
void f12(uint id, out vec3 p, out vec3 c) { redComun(id, true, p, c); c *= mix(vec3(1.0), vec3(1.0, 0.55, 1.0), 0.6); }
// 13 · zoom tunnel: streaming points (deep dive)
void f13(uint id, out vec3 p, out vec3 c) {
  float z = fract(rndu(id, 1u) + uTime * uZoomVel);
  float a = rndu(id, 2u) * TAU;
  float r = 0.15 + 2.5 * pow(rndu(id, 3u), 0.7);
  vec3 q = vec3(r * cos(a), r * sin(a), mix(9.0, 0.2, z));
  p = uCamPos + uCamRot * q;
  c = mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.6, 0.9), rndu(id, 4u)) * 0.004 * smoothstep(0.0, 0.3, z) * smoothstep(1.0, 0.8, z);
}
// 14 · field lines of two charges, matching the LIC of the profile image (built in screen space)
void f14(uint id, out vec3 p, out vec3 c) {
  float k = float(id % 256u);
  float s = fract(rndu(id, 1u) + uTime * uDipFlujo);
  vec4 D = texelFetch(uDipolo, ivec2(int(s * 511.0), int(k)), 0);
  vec2 uv = D.xy * uDipEsc;
  vec2 j = (vec2(rndu(id, 2u), rndu(id, 3u)) - 0.5) * 0.004;
  uv += j;
  p = uCamPos + uDipD * (uCamRot * vec3(uv * uFov, 1.0));
  float d1 = length(D.xy - vec2(-1.0, 0.0)), d2 = length(D.xy - vec2(1.0, 0.0));
  float near = 1.0 / (0.25 + min(d1, d2) * 2.0);
  float out_ = smoothstep(2.6, 1.2, length(D.xy));
  c = mix(vec3(0.1, 0.25, 1.0), vec3(0.5, 0.7, 1.0), sat(near - 0.6)) * 0.012 * smoothstep(0.03, 0.35, min(d1, d2)) * out_;
}

void forma(int f, uint id, out vec3 p, out vec3 c) {
  if (f == 0) f0(id, p, c);
  else if (f == 1) f1(id, p, c);
  else if (f == 2) f2(id, p, c);
  else if (f == 3) f3(id, p, c);
  else if (f == 4) f4(id, p, c);
  else if (f == 5) f5(id, p, c);
  else if (f == 6) f6(id, p, c);
  else if (f == 7) f7(id, p, c);
  else if (f == 8) f8(id, p, c);
  else if (f == 9) f9(id, p, c);
  else if (f == 10) f10(id, p, c);
  else if (f == 11) f11(id, p, c);
  else if (f == 12) f12(id, p, c);
  else if (f == 13) f13(id, p, c);
  else f14(id, p, c);
}

void main() {
  uint id = uint(gl_VertexID);
  vec3 pa, ca, pb, cb;
  int fa = int(uFormA + 0.5), fb = int(uFormB + 0.5);
  forma(fa, id, pa, ca);
  float m = 0.0;
  if (fb != fa && uMix > 0.0) {
    forma(fb, id, pb, cb);
    float st = 0.55;
    float rk = uStagKey > 0.5 ? rndu(id % uint(uStagKey), 99u) : rndu(id, 99u);
    m = sat(uMix * (1.0 + st) - rk * st);
    m = m * m * (3.0 - 2.0 * m);
  } else { pb = pa; cb = ca; }
  vec3 p = mix(pa, pb, m) * uPartEsc;
  vec3 c = mix(ca, cb, m);
  // curl transport mid-morph (and global turbulence)
  float tr = sin(PI * m) * uCurl;
  p += curl(p * 0.7 + vec3(0.0, uTime * 0.2, 0.0)) * 0.22 * tr;
  c *= max(0.0, 1.0 + sin(PI * m) * uMixBrillo);
  // twinkle
  c *= 0.75 + 0.5 * rndu(id, 98u);
  // project
  vec3 d = p - uCamPos;
  vec3 R = uCamRot[0], U = uCamRot[1], F = uCamRot[2];
  float z = dot(d, F);
  c *= smoothstep(0.5, 1.6, z);
  if (z < 0.05) { gl_Position = vec4(2.0, 2.0, 0.0, 1.0); gl_PointSize = 0.0; vCol = vec3(0); vBokeh = 0.0; return; }
  vec2 uv = vec2(dot(d, R), dot(d, U)) / (z * uFov);
  gl_Position = vec4(uv.x * uRes.y / uRes.x, uv.y, 0.0, 1.0);
  float esc = uRes.y / 1080.0;
  float base = uPartTam * esc;
  float coc = uAperture * abs(z - uFocus) / z * uRes.y * 0.5;
  float sz = clamp(sqrt(base * base + coc * coc), base, 48.0 * esc);
  gl_PointSize = sz;
  float ener = (base * base) / (sz * sz);
  vCol = c * uPartInt * ener * 6.0;
  vBokeh = sat((sz - 3.0 * esc) / (6.0 * esc));
}`;

export const PART_FS = /* glsl */ `
in vec3 vCol;
in float vBokeh;
out vec4 o;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float d2 = dot(q, q);
  if (d2 > 1.0) discard;
  float g = exp(-d2 * 3.2);
  // bokeh disc: flat with a slightly brighter rim
  float disc = smoothstep(1.0, 0.82, sqrt(d2)) * (0.85 + 0.25 * smoothstep(0.5, 0.95, sqrt(d2)));
  float a = mix(g * 1.6, disc * 0.95, vBokeh);
  o = vec4(vCol * a, 1.0);
}`;
