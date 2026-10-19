// Shared GLSL: header, uniforms common to every pass, hashes, noise, camera, spectral colour and thin film.
export const COMUN = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

uniform vec2 uRes;
uniform float uTime;
uniform vec3 uCamPos;
uniform mat3 uCamRot;     // columns: right, up, forward
uniform float uFov;       // tan(vfov / 2)
uniform float uFocus;     // focus distance
uniform float uAperture;  // circle of confusion scale
uniform float uNota;      // last ostinato note envelope (0..1)
uniform float uNotaIdx;   // ostinato notes elapsed (float, with fractional ease)
uniform float uAcorde;    // chord index (0 = Am at 5 s)
uniform float uTAcorde;   // seconds since the last chord
uniform float uGolpe;     // last hit envelope
uniform float uSwell;     // swell level 0..1

#define PI 3.14159265359
#define TAU 6.28318530718

float sat(float x) { return clamp(x, 0.0, 1.0); }
vec3 sat3(vec3 x) { return clamp(x, 0.0, 1.0); }

// Hashes without sine (Dave Hoskins)
float hash11(float p) { p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3) { p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec2 hash21(float p) { vec3 p3 = fract(vec3(p) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
vec3 hash31(float p) { vec3 p3 = fract(vec3(p) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xxy + p3.yzz) * p3.zyx); }
vec3 hash33(vec3 p3) { p3 = fract(p3 * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }
// integer hash for particle ids (good distribution for huge counts)
uint pcg(uint v) { uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
float rndu(uint id, uint k) { return float(pcg(id * 7919u + k * 104729u + 17u)) / 4294967295.0; }

float vnoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), f.x), mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), f.x), mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// Camera ray for a pixel (pixel centre + optional subpixel offset)
vec3 rayo(vec2 frag) {
  vec2 uv = (frag - 0.5 * uRes) / (0.5 * uRes.y);
  return normalize(uCamRot * vec3(uv * uFov, 1.0));
}

// Spectral colour for a wavelength in nm (smooth fit to CIE, linear RGB, peak ~1)
vec3 espectro(float l) {
  float t;
  vec3 c = vec3(0.0);
  // Zucconi 6-bump approximation
  vec3 x = vec3((l - 400.0) / 300.0);
  vec3 c1 = vec3(3.54585104, 2.93225262, 2.41593945), x1 = vec3(0.69549072, 0.49228336, 0.27699880), y1 = vec3(0.02312639, 0.15225084, 0.52607955);
  vec3 c2 = vec3(3.90307140, 3.21182957, 3.96587128), x2 = vec3(0.11748627, 0.86755042, 0.66077860), y2 = vec3(0.84897130, 0.88445281, 0.73949448);
  vec3 a = c1 * (x - x1); vec3 b = c2 * (x - x2);
  c = sat3(vec3(1.0) - a * a - y1) + sat3(vec3(1.0) - b * b - y2);
  t = 0.0;
  return c + t;
}

// Thin-film interference reflectance (soap / oil film) for a film of thickness d (nm), index n, view cosine.
vec3 pelicula(float d, float n, float cosI) {
  float sinT2 = (1.0 - cosI * cosI) / (n * n);
  float cosT = sqrt(max(0.0, 1.0 - sinT2));
  float opd = 2.0 * n * d * cosT;
  vec3 acc = vec3(0.0); vec3 norm = vec3(0.0);
  for (int i = 0; i < 10; i++) {
    float l = 400.0 + 33.0 * float(i);
    vec3 s = espectro(l);
    float ph = TAU * opd / l + PI;
    acc += s * (0.5 + 0.5 * cos(ph));
    norm += s;
  }
  return acc / norm;
}

vec3 paleta(float t, vec3 a, vec3 b, vec3 c, vec3 d) { return a + b * cos(TAU * (c * t + d)); }

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
`;
