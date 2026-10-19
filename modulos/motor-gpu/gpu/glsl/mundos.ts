// Fullscreen "worlds": raymarched / analytic fragment shaders drawn additively into the HDR scene buffer.
const CAB = /* glsl */ `
uniform float uPeso;
in vec2 vUv;
out vec4 o;
`;

// ---------- point lights: core, halo, anamorphic streak and diffraction spikes ----------
const LUZ = /* glsl */ `${CAB}
uniform vec4 uLuz0, uLuz1, uLuz2;  // xyz world, w intensity
uniform vec3 uLuzC0, uLuzC1, uLuzC2;
uniform float uLuzRespira, uLuzStreak;
uniform vec2 uAnillo;
vec3 unaLuz(vec4 L, vec3 col, vec2 frag) {
  if (L.w <= 0.0) return vec3(0.0);
  vec3 d = L.xyz - uCamPos;
  float z = dot(d, uCamRot[2]);
  if (z < 0.05) return vec3(0.0);
  vec2 uv = vec2(dot(d, uCamRot[0]), dot(d, uCamRot[1])) / (z * uFov);
  vec2 px = uv * 0.5 * uRes.y + 0.5 * uRes;
  vec2 q = (frag - px) / uRes.y * 1080.0;
  float r = length(q);
  float core = exp(-r * r / 9.0) * 6.0;
  float halo = 1.0 / (1.0 + r * r * 0.004) * 0.35 + exp(-r / 90.0) * 0.12;
  float streak = exp(-abs(q.y) / 1.6) * exp(-abs(q.x) / 520.0) * 0.55 * uLuzStreak;
  float a = atan(q.y, q.x);
  float spikes = pow(abs(cos(a * 3.0)), 600.0) * exp(-r / 110.0) * 0.18 * uLuzStreak;
  vec3 c = col * (halo + streak * vec3(0.7, 0.85, 1.0) + spikes) + vec3(1.0) * core;
  // thin expanding ring (lens ghost) when the point locks
  c += vec3(0.6, 0.8, 1.0) * exp(-pow((r - uAnillo.x) / 2.5, 2.0)) * uAnillo.y * 0.35;
  return c * L.w;
}
void main() {
  vec2 f = gl_FragCoord.xy;
  vec3 c = unaLuz(uLuz0, uLuzC0, f) + unaLuz(uLuz1, uLuzC1, f) + unaLuz(uLuz2, uLuzC2, f);
  o = vec4(c * uPeso, 1.0);
}`;

// ---------- black hole: Schwarzschild-like bending, thin accretion disk with Doppler beaming ----------
const HOYO = /* glsl */ `${CAB}
uniform float uRs, uDiscoIn, uDiscoOut, uHoyoCalor, uHoyoGiro, uHoyoBrillo, uHoyoEstrellas;
vec3 colorDisco(float T) {
  // cold palette: deep blue -> cyan -> white, warm tint only in the hottest/receding parts
  vec3 a = vec3(0.02, 0.07, 0.35), b = vec3(0.2, 0.55, 1.0), c = vec3(1.0, 0.97, 0.94);
  vec3 col = T < 0.5 ? mix(a, b, T * 2.0) : mix(b, c, T * 2.0 - 1.0);
  return col;
}
vec3 estrellas(vec3 d) {
  vec3 c = vec3(0.0);
  for (int i = 0; i < 2; i++) {
    float s = 140.0 + float(i) * 170.0;
    vec3 g = floor(d * s); vec3 f = fract(d * s) - 0.5;
    vec3 h = hash33(g + float(i) * 13.0);
    vec3 off = (h - 0.5) * 0.7;
    float dd = length(f - off);
    float b = pow(h.x, 22.0) * smoothstep(0.08, 0.0, dd);
    c += b * mix(vec3(0.6, 0.75, 1.0), vec3(1.0, 0.9, 0.8), h.y) * 3.0;
  }
  return c;
}
void main() {
  vec3 ro = uCamPos;
  vec3 rd = rayo(gl_FragCoord.xy + (hash12(gl_FragCoord.xy) - 0.5) * 0.0);
  vec3 p = ro, v = rd;
  vec3 col = vec3(0.0);
  float trans = 1.0;
  float h2 = dot(cross(p, v), cross(p, v));
  bool capt = false;
  for (int i = 0; i < 300; i++) {
    float r = length(p);
    if (r < uRs) { capt = true; break; }
    if (r > 30.0 && dot(p, v) > 0.0) break;
    float dt = clamp(0.06 * (r - uRs * 0.6), 0.004, 0.6);
    vec3 a = -1.5 * uRs * h2 * p / pow(r, 5.0);
    vec3 pn = p + v * dt + 0.5 * a * dt * dt;
    vec3 vn = normalize(v + a * dt);
    if (p.y * pn.y < 0.0) {
      float f = p.y / (p.y - pn.y);
      vec3 x = mix(p, pn, f);
      float rr = length(x.xz);
      if (rr > uDiscoIn && rr < uDiscoOut) {
        float ang = atan(x.z, x.x);
        float w = sqrt(uRs * 0.5) / pow(rr, 1.5) * 1.6;
        float lr = log(rr);
        float a2 = ang - uTime * w * uHoyoGiro;
        float tur = fbm(vec3(lr * 16.0, cos(a2) * 2.6, sin(a2) * 2.6));
        float fil = fbm(vec3(lr * 46.0 + tur * 2.0, cos(a2) * 6.0, sin(a2) * 6.0));
        float dens = pow(sat(tur * 1.25), 2.2) * 1.6 + pow(sat(fil * 1.3 - 0.3), 3.0) * 1.4;
        float T = pow(uDiscoIn / rr, 0.75) * pow(max(0.0, 1.0 - sqrt(uDiscoIn / rr)), 0.25) * 2.2;
        // Doppler beaming
        vec3 vel = normalize(vec3(-x.z, 0.0, x.x));
        float beta = sqrt(0.5 * uRs / max(rr - uRs, 0.01)) * 0.85;
        float gam = 1.0 / sqrt(1.0 - beta * beta);
        float g = 1.0 / (gam * (1.0 - beta * dot(vel, -v)));
        float grav = sqrt(max(0.0, 1.0 - uRs / rr));
        float D = g * grav;
        float I = pow(T, 2.4) * pow(D, 4.0) * dens;
        vec3 c = colorDisco(sat(T * D * 0.75));
        c = mix(c, c * vec3(1.35, 0.72, 0.42), sat((1.0 - D) * 1.8) * uHoyoCalor);
        float edge = smoothstep(uDiscoIn, uDiscoIn * 1.06, rr) * smoothstep(uDiscoOut, uDiscoOut * 0.45, rr);
        float alpha = sat(I * 1.5) * edge;
        col += trans * c * I * edge * 1.15 * uHoyoBrillo;
        trans *= 1.0 - alpha * 0.85;
      }
    }
    p = pn; v = vn;
    if (trans < 0.02) break;
  }
  if (!capt) col += trans * estrellas(v) * 0.6 * uHoyoEstrellas;
  // faint photon-sphere glow
  o = vec4(col * uPeso, 1.0);
}`;

// ---------- interference surface with real thin-film iridescence ----------
const ONDAS = /* glsl */ `${CAB}
uniform vec4 uOnd, uOndK;
uniform float uOndS2, uIrid, uOndLuz;
float H(vec2 xz) {
  float r1 = length(xz - uOnd.xy), r2 = length(xz - uOnd.zw);
  float f1 = smoothstep(uOndK.w, uOndK.w - 0.6, r1);
  float f2 = smoothstep(uOndK.w, uOndK.w - 0.6, r2) * uOndS2;
  return uOndK.z * (cos(uOndK.x * r1 - uOndK.y * uTime) * f1 / sqrt(1.0 + r1 * 1.5) + cos(uOndK.x * r2 - uOndK.y * uTime) * f2 / sqrt(1.0 + r2 * 1.5));
}
vec3 entorno(vec3 d) {
  // dark studio: two long softboxes and a cold horizon glow
  float hz = exp(-abs(d.y) * 9.0) * 0.05;
  float sb1 = smoothstep(0.035, 0.0, abs(d.x - 0.35)) * smoothstep(0.15, 0.5, d.y) * 2.2;
  float sb2 = smoothstep(0.02, 0.0, abs(d.z + 0.45)) * smoothstep(0.1, 0.4, d.y) * 1.6;
  float sb3 = smoothstep(0.02, 0.0, abs(d.x + d.z * 0.5 + 0.6)) * smoothstep(0.2, 0.6, d.y) * 1.2;
  float top = smoothstep(0.92, 1.0, d.y) * 0.8;
  return vec3(0.6, 0.8, 1.0) * hz + vec3(1.0) * (sb1 + sb2 + sb3 + top);
}
void main() {
  vec3 ro = uCamPos, rd = rayo(gl_FragCoord.xy);
  float A = max(uOndK.z, 1e-3) * 2.2;
  if (rd.y >= -1e-4 && ro.y > A) { o = vec4(0, 0, 0, 1); return; }
  float t0 = (ro.y - A) / max(-rd.y, 1e-4);
  float t1 = (ro.y + A) / max(-rd.y, 1e-4);
  t0 = max(t0, 0.0);
  float t = t0;
  float dt = (t1 - t0) / 90.0;
  float prev = ro.y + rd.y * t - H((ro + rd * t).xz);
  bool hit = false;
  for (int i = 0; i < 90; i++) {
    t += dt;
    vec3 p = ro + rd * t;
    float d = p.y - H(p.xz);
    if (d < 0.0) {
      // refine by bisection
      float a = t - dt, b = t;
      for (int k = 0; k < 6; k++) { float m = 0.5 * (a + b); vec3 q = ro + rd * m; if (q.y - H(q.xz) < 0.0) b = m; else a = m; }
      t = 0.5 * (a + b); hit = true; break;
    }
    prev = d;
  }
  vec3 col = vec3(0.0);
  if (hit) {
    vec3 p = ro + rd * t;
    float e = 0.01;
    vec3 n = normalize(vec3(H(p.xz - vec2(e, 0)) - H(p.xz + vec2(e, 0)), 2.0 * e, H(p.xz - vec2(0, e)) - H(p.xz + vec2(0, e))));
    float cosI = sat(dot(n, -rd));
    vec3 rf = reflect(rd, n);
    float fres = 0.04 + 0.96 * pow(1.0 - cosI, 5.0);
    float h = H(p.xz) / max(uOndK.z, 1e-3);
    float swirl = fbm(vec3(p.xz * 0.7, uTime * 0.1)) ;
    float th = 250.0 + 520.0 * (0.5 + 0.5 * h) + 380.0 * swirl;
    vec3 film = pelicula(th, 1.35, cosI);
    vec3 filmMono = vec3(luma(film)) * vec3(0.75, 0.9, 1.0);
    film = max(mix(vec3(luma(film)), film, 2.4), 0.0);
    film = mix(filmMono, film, uIrid);
    vec3 env = entorno(rf);
    float vivo = smoothstep(uOndK.w + 0.2, uOndK.w - 1.2, length(p.xz));
    col = env * film * (0.08 + fres * 1.6) * 1.3 * vivo;
    // emissive constructive-interference fringes (time-averaged |psi1 + psi2|^2)
    float r1 = length(p.xz - uOnd.xy), r2 = length(p.xz - uOnd.zw);
    float fr = pow(0.5 + 0.5 * cos(uOndK.x * (r1 - r2)), 14.0) * uOndS2 * smoothstep(uOndK.w, uOndK.w - 1.0, max(r1, r2));
    vec3 fc = pelicula(320.0 + 90.0 * (r1 + r2), 1.35, 0.7); fc = max(mix(vec3(luma(fc)), fc, 2.6), 0.0);
    vec3 franja = mix(vec3(0.6, 0.85, 1.0), fc * 1.3, uIrid);
    col += franja * fr * 0.7 * uOndLuz / (1.0 + 0.4 * (r1 + r2));
    // expanding wavefront: a luminous ring leaves the sources (the shock of the collapse at 15 s)
    float frente = exp(-pow((r1 - uOndK.w + 0.35) / 0.07, 2.0)) * 1.4 / (1.0 + r1) + exp(-pow((r2 - uOndK.w + 0.35) / 0.07, 2.0)) * 0.9 * uOndS2 / (1.0 + r2);
    col += vec3(0.65, 0.85, 1.0) * frente * smoothstep(6.0, 2.0, uOndK.w) * uOndLuz;
    // ripples rim light: crests catch light
    col += film * pow(sat(0.5 + 0.5 * h), 10.0) * 0.12 * uOndLuz;
    float fog = exp(-max(0.0, t - 3.0) * 0.3) * smoothstep(4.6, 2.6, length(p.xz));
    col *= fog;
  }
  o = vec4(col * uPeso, 1.0);
}`;

// ---------- glass prism + volumetric white beam + spectral fan ----------
const PRISMA = /* glsl */ `${CAB}
uniform float uPrismaFan, uPrismaGiro, uHaz;
float sdTri(vec3 p, vec2 h) { vec3 q = abs(p); return max(q.z - h.y, max(q.x * 0.866025 + p.y * 0.5, -p.y) - h.x * 0.5); }
float mapP(vec3 p) {
  p.xz = rot(uPrismaGiro) * p.xz;
  return sdTri(p.xzy * vec3(1, 1, 1) , vec2(0.62, 0.62)) - 0.01;
}
float mapPr(vec3 p) { vec3 q = p; q.xy = rot(0.0) * q.xy; return sdTri(vec3(q.x, q.y, q.z), vec2(0.7, 0.55)) - 0.012; }
vec3 nrm(vec3 p) { vec2 e = vec2(0.002, 0); return normalize(vec3(mapPr(p + e.xyy) - mapPr(p - e.xyy), mapPr(p + e.yxy) - mapPr(p - e.yxy), mapPr(p + e.yyx) - mapPr(p - e.yyx))); }
float distSeg(vec3 ro, vec3 rd, vec3 a, vec3 b, out float tRay) {
  vec3 ba = b - a, oa = ro - a;
  float baba = dot(ba, ba), bard = dot(ba, rd), baoa = dot(ba, oa), rdoa = dot(rd, oa);
  float den = baba - bard * bard;
  float s = sat((baoa - bard * rdoa) / max(den, 1e-6) * 1.0);
  s = sat((baoa + bard * (-rdoa) ) / max(baba - bard * bard, 1e-6));
  // closest points
  float tt = dot(a + ba * s - ro, rd);
  tRay = tt;
  vec3 pr = ro + rd * max(tt, 0.0);
  // re-project for accuracy
  float s2 = sat(dot(pr - a, ba) / baba);
  return length(pr - (a + ba * s2));
}
void main() {
  vec3 ro = uCamPos, rd = rayo(gl_FragCoord.xy);
  vec3 A = vec3(-7.0, -0.35, 0.0), P = vec3(-0.35, 0.0, 0.0), Q = vec3(0.35, 0.05, 0.0);
  vec3 col = vec3(0.0);
  float tr;
  // incoming white beam (volumetric glow, inverse-square-ish falloff)
  float d0 = distSeg(ro, rd, A, P, tr);
  col += vec3(1.0, 0.98, 0.95) * (exp(-d0 * d0 / 0.0006) * 1.4 + 0.012 / (d0 * d0 * 40.0 + 0.02)) * uHaz;
  float d1 = distSeg(ro, rd, P, Q, tr);
  col += vec3(1.0) * exp(-d1 * d1 / 0.001) * 1.6 * uHaz;
  // spectral fan
  for (int i = 0; i < 44; i++) {
    float lam = 400.0 + 300.0 * (float(i) + 0.5) / 44.0;
    float dev = (lam - 580.0) / 200.0;
    vec3 dir = normalize(vec3(1.0, -0.12 - dev * 0.55 * uPrismaFan, dev * 0.08));
    float d = distSeg(ro, rd, Q, Q + dir * 9.0, tr);
    float w = 0.0012 + 0.0009 * max(tr - 4.0, 0.0);
    col += espectro(lam) * (exp(-d * d / w) * 0.2 + 0.001 / (d * d * 30.0 + 0.01)) * uHaz;
  }
  // glass prism: raymarch, fresnel reflections of a studio, glowing edges
  float t = 0.0; bool hit = false;
  for (int i = 0; i < 90; i++) { vec3 p = ro + rd * t; float d = mapPr(p); if (d < 0.0008) { hit = true; break; } t += d; if (t > 30.0) break; }
  if (hit) {
    vec3 p = ro + rd * t; vec3 n = nrm(p);
    float cosI = sat(dot(n, -rd));
    float fres = 0.04 + 0.96 * pow(1.0 - cosI, 5.0);
    vec3 rf = reflect(rd, n);
    float studio = smoothstep(0.85, 1.0, rf.y) * 1.5 + smoothstep(0.9, 1.0, rf.x) * 0.8 + smoothstep(0.92, 1.0, -rf.z) * 0.6;
    // edge glow: distance to the prism's edges via SDF curvature
    vec3 e = vec3(0.012, 0, 0);
    float curv = abs(mapPr(p + n * 0.012) * 2.0 - 0.024) ;
    float lap = mapPr(p + e.xyy) + mapPr(p - e.xyy) + mapPr(p + e.yxy) + mapPr(p - e.yxy) + mapPr(p + e.yyx) + mapPr(p - e.yyx);
    float edge = smoothstep(0.004, 0.03, lap);
    vec3 disp = pelicula(500.0 + 300.0 * rf.y, 1.5, cosI);
    col = col * 0.7 + (vec3(studio) * fres * 1.2 + edge * vec3(0.9, 0.95, 1.0) * 1.2) * mix(vec3(1.0), disp * 1.4, 0.5);
    col += vec3(0.6, 0.75, 1.0) * 0.006;
  }
  o = vec4(col * uPeso, 1.0);
}`;

// ---------- coloured nebula backdrop (gives every world its own chromatic atmosphere) ----------
const NEBULA = /* glsl */ `${CAB}
uniform vec3 uNebA, uNebB;
uniform float uNebEsc;
void main() {
  vec3 rd = rayo(gl_FragCoord.xy);
  vec2 q = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  // soft atmospheric gradient: two colour pools that drift slowly, no hard cloud texture
  float n = vnoise(rd * 1.6 + vec3(0.0, uTime * 0.05, 0.0)) * 0.6 + vnoise(rd * 3.1 + 7.0) * 0.4;
  float pool = exp(-dot(q - vec2(0.25, 0.1), q - vec2(0.25, 0.1)) * 3.0);
  float pool2 = exp(-dot(q + vec2(0.35, 0.15), q + vec2(0.35, 0.15)) * 3.5);
  vec3 c = uNebA * pool * (0.6 + 0.6 * n) + uNebB * pool2 * (0.6 + 0.6 * (1.0 - n));
  c *= 0.9;
  o = vec4(c * uPeso, 1.0);
}`;

// ---------- volumetric |psi|^2 of the 3d_z2 orbital ----------
const ORBITAL = /* glsl */ `${CAB}
uniform float uOrbDens;
float psi2(vec3 p, out float sgn) {
  p.xz = rot(-uTime * 0.25) * p.xz;
  float r = length(p) * 10.5 / 1.0;
  float ct = p.y / max(length(p), 1e-4);
  float ang = 3.0 * ct * ct - 1.0;
  sgn = ang;
  float R = pow(r, 4.0) * exp(-2.0 * r / 3.0) / 2400.0;
  return R * ang * ang;
}
void main() {
  vec3 ro = uCamPos, rd = rayo(gl_FragCoord.xy);
  float b = dot(ro, rd), c = dot(ro, ro) - 4.0;
  float h = b * b - c;
  vec3 col = vec3(0.0);
  if (h > 0.0) {
    h = sqrt(h);
    float t0 = max(-b - h, 0.0), t1 = -b + h;
    float N = 96.0;
    float dt = (t1 - t0) / N;
    float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    float t = t0 + dt * ign;
    for (int i = 0; i < 96; i++) {
      vec3 p = ro + rd * t;
      float s;
      float d = psi2(p, s);
      float dd = d * uOrbDens;
      vec3 cc = s > 0.0 ? vec3(0.4, 0.3, 1.0) : vec3(0.85, 0.2, 1.0);
      cc = mix(cc, vec3(0.95, 0.9, 1.0), sat(dd * 0.35 - 0.2));
      col += cc * pow(dd, 1.7) * dt * 1.6;
      t += dt;
    }
  }
  o = vec4(col * uPeso, 1.0);
}`;

// ---------- raymarched torus: thin-film glass shell onto which the network is projected ----------
const TORO = /* glsl */ `${CAB}
uniform float uToroRot, uToroVidrio;
float sdT(vec3 p) { vec2 q = vec2(length(p.xz) - 1.55, p.y); return length(q) - 0.62; }
void main() {
  vec3 ro = uCamPos, rd = rayo(gl_FragCoord.xy);
  float t = 0.0; bool hit = false;
  for (int i = 0; i < 100; i++) { float d = sdT(ro + rd * t); if (d < 0.0006) { hit = true; break; } t += d; if (t > 25.0) break; }
  vec3 col = vec3(0.0);
  if (hit) {
    vec3 p = ro + rd * t;
    vec2 e = vec2(0.001, 0);
    vec3 n = normalize(vec3(sdT(p + e.xyy) - sdT(p - e.xyy), sdT(p + e.yxy) - sdT(p - e.yxy), sdT(p + e.yyx) - sdT(p - e.yyx)));
    float cosI = sat(dot(n, -rd));
    float fres = 0.04 + 0.96 * pow(1.0 - cosI, 5.0);
    float u = atan(p.z, p.x) - uToroRot;
    float v = atan(p.y, length(p.xz) - 1.55);
    float th = 300.0 + 500.0 * (0.5 + 0.5 * sin(u * 3.0 + v * 2.0 + uTime * 0.6)) + 200.0 * fbm(p * 2.0);
    vec3 film = pelicula(th, 1.4, cosI);
    vec3 rf = reflect(rd, n);
    float studio = smoothstep(0.6, 1.0, rf.y) * 1.2 + smoothstep(0.85, 1.0, rf.x) * 0.6 + 0.05;
    // fine geodesic lattice engraved on the surface
    float grid = pow(abs(sin(u * 18.0)), 80.0) + pow(abs(sin(v * 9.0)), 80.0);
    col = film * (studio * fres * 2.2 + 0.05) + film * grid * 0.06;
    col *= uToroVidrio;
  }
  o = vec4(col * uPeso, 1.0);
}`;

// ---------- Mandelbrot deep zoom: smooth iteration count, orbit traps, DE relief lighting ----------
const FRACTAL = /* glsl */ `${CAB}
uniform vec2 uFracC;
uniform float uFracZoom, uFracRot, uFracPal, uFracBrillo;
vec3 pal(float t, float k) {
  // eight curated two-tone palettes (linear RGB, saturated): one per tom
  float i = mod(floor(k), 8.0);
  vec3 A, B;
  if (i < 0.5) { A = vec3(0.0, 0.12, 0.6); B = vec3(0.3, 0.9, 1.0); }
  else if (i < 1.5) { A = vec3(0.55, 0.0, 0.45); B = vec3(1.0, 0.65, 0.08); }
  else if (i < 2.5) { A = vec3(0.55, 0.03, 0.0); B = vec3(1.0, 0.5, 0.04); }
  else if (i < 3.5) { A = vec3(0.22, 0.0, 0.75); B = vec3(0.9, 0.35, 1.0); }
  else if (i < 4.5) { A = vec3(0.0, 0.4, 0.22); B = vec3(0.45, 1.0, 0.55); }
  else if (i < 5.5) { A = vec3(0.0, 0.42, 0.5); B = vec3(1.0, 0.35, 0.25); }
  else if (i < 6.5) { A = vec3(0.0, 0.45, 0.9); B = vec3(1.0, 0.25, 0.65); }
  else { A = vec3(0.45, 0.2, 0.0); B = vec3(1.0, 0.85, 0.45); }
  return mix(A, B, 0.5 + 0.5 * cos(TAU * t));
}
vec3 mandel(vec2 px) {
  vec2 uv = (px - 0.5 * uRes) / (0.5 * uRes.y);
  uv = rot(uFracRot) * uv;
  vec2 c = uFracC + uv * uFracZoom;
  vec2 z = vec2(0.0), dz = vec2(0.0);
  float trap1 = 1e9, trap2 = 1e9;
  float n = 0.0;
  const float B = 256.0;
  for (int i = 0; i < 420; i++) {
    dz = 2.0 * vec2(z.x * dz.x - z.y * dz.y, z.x * dz.y + z.y * dz.x) + vec2(1.0, 0.0);
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    trap1 = min(trap1, abs(length(z - vec2(0.0, 0.0)) - 0.5));
    trap2 = min(trap2, abs(z.y + z.x * 0.3));
    if (dot(z, z) > B * B) break;
    n += 1.0;
  }
  if (n >= 419.0) return vec3(0.0);
  float sn = n - log2(log2(dot(z, z))) + 4.0;
  // distance estimate -> relief normal
  float zl = length(z);
  float de = 0.5 * zl * log(zl) / max(length(dz), 1e-20);
  vec2 nrm = z / dz; // direction of gradient (complex division)
  vec2 u = vec2(z.x * dz.x + z.y * dz.y, z.y * dz.x - z.x * dz.y);
  u = normalize(u);
  vec2 luzD = normalize(vec2(cos(0.8), sin(0.8)));
  float relief = dot(u, luzD) * 0.5 + 0.5;
  float k = uFracPal;
  // brightness lives near the boundary: glow decays with the distance estimate (in pixels)
  float dpx = de / (uFracZoom / (0.5 * uRes.y));
  float t = 0.16 * log(dpx + 1.0) + sat(trap1) * 0.7 + uFracPal * 0.137;
  vec3 col = mix(pal(t, k), pal(t, k + 1.0), smoothstep(0.0, 1.0, fract(k)));
  col *= 1.4;
  float glow = exp(-dpx * 0.14) * 0.22 + exp(-dpx * 1.0) * 0.32;
  col *= (0.3 + 0.9 * relief) * glow;
  col += pal(t + 0.5, k) * exp(-trap1 * 25.0) * 0.5 * glow;
  col += vec3(1.0, 0.96, 0.9) * exp(-dpx * 1.8) * 0.1;
  return col;
}
void main() {
  vec3 c = vec3(0.0);
  for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) c += mandel(gl_FragCoord.xy + (vec2(i, j) - 0.5) * 0.5);
  c *= 0.25;
  o = vec4(c * uFracBrillo * uPeso, 1.0);
}`;

// ---------- the profile image: LIC of two charges, with pulses travelling along the field ----------
const CAMPO = /* glsl */ `${CAB}
uniform sampler2D uLIC;
uniform float uDipEsc, uCampoRev, uCampoFlujo, uCampoPulso;
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 lic = texture(uLIC, uv).rgb;
  lic = pow(lic, vec3(2.2));
  vec2 q = (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * uRes.y);
  vec2 a = vec2(-uDipEsc, 0.0), b = vec2(uDipEsc, 0.0);
  float r1 = length(q - a), r2 = length(q - b);
  float V = 1.0 / (r1 + 0.01) - 1.0 / (r2 + 0.01);
  // equipotential bands sweeping from + to - : pulses that travel along every strand
  float band = 0.5 + 0.5 * cos(log(abs(V) + 1.0) * 9.0 * sign(V) - uTime * uCampoFlujo);
  float mod_ = mix(0.75, 1.0 + 0.9 * pow(band, 6.0), 0.8);
  // reveal grows from both charges
  float rev = smoothstep(uCampoRev, uCampoRev - 0.35, min(r1, r2));
  vec3 col = lic * mod_ * 2.2 * rev;
  // the charges glow on each hit
  float g = exp(-r1 * r1 / 0.0004) + exp(-r2 * r2 / 0.0004);
  col += vec3(0.5, 0.7, 1.0) * g * (0.4 + uCampoPulso * 1.5);
  col += vec3(0.1, 0.25, 1.0) * (exp(-r1 * 7.0) + exp(-r2 * 7.0)) * 0.06 * (1.0 + uCampoPulso * 2.0) * rev;
  o = vec4(col * uPeso, 1.0);
}`;

export const MUNDOS = { luz: LUZ, hoyo: HOYO, ondas: ONDAS, prisma: PRISMA, nebula: NEBULA, orbital: ORBITAL, toro: TORO, fractal: FRACTAL, campo: CAMPO } as const;
export type MundoId = keyof typeof MUNDOS;
