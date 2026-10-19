// WebGL2 engine for the teaser body: HDR scene buffer (RGBA16F), fullscreen "world" shaders, a million GPU
// particles, physically-inspired bloom (dual filter mip chain) and a final grade pass (chromatic aberration,
// ACES tonemap, grain, vignette, dithering). Every frame is a pure function of the uniforms (uTime = frame / fps).
import { COMUN } from "./glsl/comun";
import { MUNDOS, type MundoId } from "./glsl/mundos";
import { PART_FS, PART_VS } from "./glsl/particulas";
import { BLOOM_DOWN, BLOOM_UP, FINAL, VS_FULL } from "./glsl/post";
import { datosDipolo, datosLorenz } from "./datos";
import { FLOATS, LIN_FS, LIN_VS, type Trazos } from "./trazos";

export type Uniformes = Record<string, number | number[]>;

type Prog = { p: WebGLProgram; u: Map<string, WebGLUniformLocation | null> };
type RT = { fb: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number };

const NIVELES = 6;

export class Motor {
  gl: WebGL2RenderingContext;
  W: number;
  H: number;
  progs = new Map<string, Prog>();
  escena: RT;
  mips: RT[] = [];
  texLorenz: WebGLTexture;
  texDipolo: WebGLTexture;
  texLIC: WebGLTexture | null = null;
  vao: WebGLVertexArrayObject;
  vaoLin: WebGLVertexArrayObject;
  bufLin: WebGLBuffer;
  nPart: number;

  constructor(canvas: HTMLCanvasElement, W: number, H: number, nPart: number) {
    const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true, antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: "high-performance" });
    if (!gl) throw new Error("WebGL2 no disponible (render con --gl=angle)");
    if (!gl.getExtension("EXT_color_buffer_float")) throw new Error("Falta EXT_color_buffer_float");
    gl.getExtension("OES_texture_float_linear");
    this.gl = gl;
    this.W = W;
    this.H = H;
    this.nPart = nPart;
    this.vao = gl.createVertexArray()!;
    this.escena = this.rt(W, H);
    let w = W;
    let h = H;
    for (let i = 0; i < NIVELES; i++) {
      w = Math.max(1, Math.floor(w / 2));
      h = Math.max(1, Math.floor(h / 2));
      this.mips.push(this.rt(w, h));
    }
    // Data textures (pure functions of fixed seeds: deterministic in every tab).
    const L = datosLorenz();
    this.texLorenz = this.texFloat(L.w, L.h, L.data);
    const D = datosDipolo();
    this.texDipolo = this.texFloat(D.w, D.h, D.data);
    // Programs
    for (const [id, fs] of Object.entries(MUNDOS)) this.prog("m_" + id, VS_FULL, COMUN + fs);
    this.prog("part", COMUN + PART_VS, COMUN + PART_FS);
    this.prog("lin", COMUN + LIN_VS, COMUN + LIN_FS);
    // instanced stroke buffer: 4 vec4 attributes per instance
    this.vaoLin = gl.createVertexArray()!;
    this.bufLin = gl.createBuffer()!;
    gl.bindVertexArray(this.vaoLin);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufLin);
    for (let k = 0; k < 4; k++) {
      gl.enableVertexAttribArray(k);
      gl.vertexAttribPointer(k, 4, gl.FLOAT, false, FLOATS * 4, k * 16);
      gl.vertexAttribDivisor(k, 1);
    }
    gl.bindVertexArray(null);
    this.prog("down", VS_FULL, BLOOM_DOWN);
    this.prog("up", VS_FULL, BLOOM_UP);
    this.prog("final", VS_FULL, COMUN + FINAL);
  }

  ponerLIC(img: HTMLImageElement) {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.texLIC = t;
  }

  private texFloat(w: number, h: number, data: Float32Array) {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    return t;
  }

  private rt(w: number, h: number): RT {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { fb, tex, w, h };
  }

  private prog(nombre: string, vs: string, fs: string) {
    const gl = this.gl;
    const mk = (ty: number, src: string) => {
      const s = gl.createShader(ty)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(s);
        const lineas = src.split("\n").map((l, i) => `${i + 1}: ${l}`);
        const m = /0:(\d+)/.exec(log ?? "");
        const n = m ? Number(m[1]) : 0;
        throw new Error(`[${nombre}] ${log}\n${lineas.slice(Math.max(0, n - 4), n + 2).join("\n")}`);
      }
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`[${nombre}] link: ${gl.getProgramInfoLog(p)}`);
    this.progs.set(nombre, { p, u: new Map() });
  }

  private usar(nombre: string, U: Uniformes) {
    const gl = this.gl;
    const pr = this.progs.get(nombre)!;
    gl.useProgram(pr.p);
    for (const [k, v] of Object.entries(U)) {
      if (!pr.u.has(k)) pr.u.set(k, gl.getUniformLocation(pr.p, k));
      const loc = pr.u.get(k);
      if (!loc) continue;
      if (typeof v === "number") gl.uniform1f(loc, v);
      else if (v.length === 2) gl.uniform2fv(loc, v);
      else if (v.length === 3) gl.uniform3fv(loc, v);
      else if (v.length === 4) gl.uniform4fv(loc, v);
      else if (v.length === 9) gl.uniformMatrix3fv(loc, false, v);
      else if (v.length === 16) gl.uniformMatrix4fv(loc, false, v);
      else gl.uniform1fv(loc, v);
    }
    return pr;
  }

  private tex(pr: Prog, nombre: string, unidad: number, t: WebGLTexture | null) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unidad);
    gl.bindTexture(gl.TEXTURE_2D, t);
    if (!pr.u.has(nombre)) pr.u.set(nombre, gl.getUniformLocation(pr.p, nombre));
    const loc = pr.u.get(nombre);
    if (loc) gl.uniform1i(loc, unidad);
  }

  private dibujarFull() {
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
  }

  render(comun: Uniformes, mundos: { id: MundoId; peso: number }[], part: Uniformes & { uPartPeso: number }, post: Uniformes, trazos: Trazos | null = null, linGanancia = 1) {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    // 1. Scene (HDR)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.escena.fb);
    gl.viewport(0, 0, this.W, this.H);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE);
    for (const m of mundos) {
      if (m.peso <= 0.002) continue;
      const pr = this.usar("m_" + m.id, { ...comun, uPeso: m.peso });
      this.tex(pr, "uLIC", 0, this.texLIC);
      this.tex(pr, "uDipolo", 1, this.texDipolo);
      this.dibujarFull();
    }
    if (part.uPartPeso > 0.002) {
      const pr = this.usar("part", { ...comun, ...part });
      this.tex(pr, "uLorenz", 0, this.texLorenz);
      this.tex(pr, "uDipolo", 1, this.texDipolo);
      gl.drawArrays(gl.POINTS, 0, this.nPart);
    }
    if (trazos && trazos.n > 0) {
      this.usar("lin", { ...comun, uLinGanancia: linGanancia });
      gl.bindVertexArray(this.vaoLin);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bufLin);
      gl.bufferData(gl.ARRAY_BUFFER, trazos.data.subarray(0, trazos.n * FLOATS), gl.DYNAMIC_DRAW);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, trazos.n);
      gl.bindVertexArray(this.vao);
    }
    gl.disable(gl.BLEND);
    // 2. Bloom: downsample chain
    let src = this.escena;
    for (let i = 0; i < NIVELES; i++) {
      const dst = this.mips[i];
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
      gl.viewport(0, 0, dst.w, dst.h);
      const pr = this.usar("down", { uTexel: [1 / src.w, 1 / src.h], uPrimero: i === 0 ? 1 : 0 });
      this.tex(pr, "uSrc", 0, src.tex);
      this.dibujarFull();
      src = dst;
    }
    // upsample, accumulating additively into each larger mip
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = NIVELES - 1; i > 0; i--) {
      const s = this.mips[i];
      const dst = this.mips[i - 1];
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
      gl.viewport(0, 0, dst.w, dst.h);
      const pr = this.usar("up", { uTexel: [1 / s.w, 1 / s.h], uRadio: 1.0 });
      this.tex(pr, "uSrc", 0, s.tex);
      this.dibujarFull();
    }
    gl.disable(gl.BLEND);
    // 3. Final grade
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.W, this.H);
    const pr = this.usar("final", { ...comun, ...post });
    this.tex(pr, "uEscena", 0, this.escena.tex);
    this.tex(pr, "uBloom", 1, this.mips[0].tex);
    this.dibujarFull();
    gl.finish();
  }
}
