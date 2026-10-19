// Post: fullscreen triangle, bloom (Jimenez dual filter: 13-tap down with Karis average, 9-tap tent up) and grade.
export const VS_FULL = /* glsl */ `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const BLOOM_DOWN = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uPrimero;
in vec2 vUv; out vec4 o;
vec3 S(vec2 d) { return texture(uSrc, vUv + d * uTexel).rgb; }
float karis(vec3 c) { return 1.0 / (1.0 + dot(c, vec3(0.2126, 0.7152, 0.0722)) * 0.25); }
void main() {
  vec3 a = S(vec2(-2, 2)), b = S(vec2(0, 2)), c = S(vec2(2, 2));
  vec3 d = S(vec2(-2, 0)), e = S(vec2(0, 0)), f = S(vec2(2, 0));
  vec3 g = S(vec2(-2, -2)), h = S(vec2(0, -2)), i = S(vec2(2, -2));
  vec3 j = S(vec2(-1, 1)), k = S(vec2(1, 1)), l = S(vec2(-1, -1)), m = S(vec2(1, -1));
  vec3 r;
  if (uPrimero > 0.5) {
    vec3 g0 = (a + b + d + e) * 0.25, g1 = (b + c + e + f) * 0.25, g2 = (d + e + g + h) * 0.25, g3 = (e + f + h + i) * 0.25, g4 = (j + k + l + m) * 0.25;
    float w0 = karis(g0), w1 = karis(g1), w2 = karis(g2), w3 = karis(g3), w4 = karis(g4);
    r = (g0 * w0 * 0.125 + g1 * w1 * 0.125 + g2 * w2 * 0.125 + g3 * w3 * 0.125 + g4 * w4 * 0.5) / (w0 * 0.125 + w1 * 0.125 + w2 * 0.125 + w3 * 0.125 + w4 * 0.5);
  } else {
    r = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  }
  o = vec4(max(r, 0.0), 1.0);
}`;

export const BLOOM_UP = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uRadio;
in vec2 vUv; out vec4 o;
vec3 S(vec2 d) { return texture(uSrc, vUv + d * uTexel * uRadio).rgb; }
void main() {
  vec3 r = S(vec2(0)) * 4.0 + (S(vec2(-1, 0)) + S(vec2(1, 0)) + S(vec2(0, 1)) + S(vec2(0, -1))) * 2.0
         + S(vec2(-1, -1)) + S(vec2(1, -1)) + S(vec2(-1, 1)) + S(vec2(1, 1));
  o = vec4(r / 16.0 * 0.62, 1.0);
}`;

export const FINAL = /* glsl */ `
uniform sampler2D uEscena; uniform sampler2D uBloom;
uniform float uExpo, uBloomK, uAberr, uGrano, uVin, uAzul, uSatur, uNegro, uFlash;
uniform vec3 uTinte;
uniform vec4 uChoque;   // centre (uv), radius (fraction of height), strength
uniform vec3 uFlashCol; // additive colour flash (snare), scaled by luminance
in vec2 vUv; out vec4 o;

vec3 aces(vec3 x) { // Narkowicz fit, with a slightly gentler toe
  x *= 0.6;
  return sat3((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14));
}
vec3 aSRGB(vec3 c) { return mix(12.92 * c, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }

void main() {
  vec2 uv = vUv;
  // kick shockwave: a thin refractive ring expanding from the centre
  if (uChoque.w > 0.001) {
    vec2 asp = vec2(uRes.x / uRes.y, 1.0);
    vec2 q = (uv - uChoque.xy) * asp;
    float r = length(q);
    float k = (r - uChoque.z) / 0.035;
    float onda = exp(-k * k) * k;
    uv -= (q / max(r, 1e-4)) / asp * onda * 0.012 * uChoque.w;
  }
  vec2 dc = uv - 0.5;
  float r2 = dot(dc * vec2(uRes.x / uRes.y, 1.0), dc * vec2(uRes.x / uRes.y, 1.0));
  // fine radial chromatic aberration (lens dispersion), grows to the corners
  vec2 off = dc * uAberr * (0.35 + r2) / uRes.y * 1080.0 * 0.0016;
  vec3 c;
  c.r = texture(uEscena, uv - off).r;
  c.g = texture(uEscena, uv).g;
  c.b = texture(uEscena, uv + off).b;
  vec3 bl;
  bl.r = texture(uBloom, uv - off * 2.0).r;
  bl.g = texture(uBloom, uv).g;
  bl.b = texture(uBloom, uv + off * 2.0).b;
  c += bl * uBloomK * (1.0 + uFlash * 6.0);
  c *= uExpo * (1.0 + uFlash * 2.5);
  // collapse every colour towards B&N blue (act 3)
  float L = luma(c);
  vec3 azul = vec3(0.07, 0.19, 1.0) * L * 1.6 + vec3(0.55, 0.7, 1.0) * max(0.0, L - 0.7) * 0.8;
  c = mix(c, azul, uAzul);
  c = mix(vec3(luma(c)), c, uSatur);
  c *= uTinte;
  c += uFlashCol * (0.25 * luma(c) + 0.01);
  // vignette (optical falloff)
  c *= mix(1.0, smoothstep(1.25, 0.15, r2 * 1.1), uVin);
  vec3 m = aces(c);
  m = aSRGB(m);
  // film grain, luma-weighted, animated per frame
  float fr = floor(uTime * 30.0 + 0.5);
  float g = hash12(gl_FragCoord.xy + fr * vec2(37.0, 17.0)) + hash12(gl_FragCoord.xy * 1.37 + fr * vec2(11.0, 53.0)) - 1.0;
  float lm = luma(m);
  m += g * uGrano * (0.12 + 0.88 * smoothstep(0.015, 0.22, lm)) * (1.0 - 0.6 * smoothstep(0.6, 1.0, lm));
  // triangular dither against banding
  float dth = hash12(gl_FragCoord.xy + fr * 1.618) + hash12(gl_FragCoord.yx * 1.13 + fr) - 1.0;
  m += dth / 255.0;
  m *= uNegro;
  o = vec4(m, 1.0);
}`;
