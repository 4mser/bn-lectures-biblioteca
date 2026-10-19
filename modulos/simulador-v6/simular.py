"""Uso: PYTHONPATH=../pylib python3 herramientas/simular.py [etapa ...]
Precalcula con numpy (semillas fijas, determinista) las simulaciones con estado del teaser v6 y las guarda cuadro a
cuadro (un archivo por cuadro de video, comprimido con gzip) en public/sim/<nombre>/NNNNN.gzb, más
public/sim/manifiesto.json. Las simulaciones se encadenan: el estado final de una es la condición inicial de la
siguiente.

  onda     ecuación de onda 2D (FDTD, membrana con borde absorbente): gotas en los bombos, dos fuentes coherentes que
           interfieren (periodo = un pulso de la canción) y se separan.
  schro    ecuación de Schrödinger 2D (split-step de Fourier): paquete gaussiano contra una pared con dos rendijas; la
           pared es finita, así que también hay efecto túnel.
  fluido   Navier-Stokes incompresible 2D, «stable fluids» de Jos Stam (advección semilagrangiana, MacCormack para la
           tinta, proyección espectral, confinamiento de vorticidad). Nace del paquete cuántico por la transformación
           de Madelung (densidad = |psi|^2, velocidad = grad(fase)); las rendijas siguen como boquillas y cada caja
           mete una perturbación (par de vórtices con tinta ámbar).
  gs       reacción-difusión de Gray-Scott (F = 0,055; k = 0,062, «coral»), sembrada con la tinta del fluido y
           arrastrada por su velocidad mientras se apaga. Avanza al pulso.
  ising    modelo de Ising 2D (Metropolis en tablero de ajedrez) sembrado con el patrón de Turing; temperatura bajo la
           crítica y un campo que crece: se ordena. Avanza al pulso.
"""
import gzip
import json
import os
import sys
import time

import numpy as np

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAL = os.path.join(RAIZ, "public", "sim")
CACHE = os.path.join(RAIZ, "out", "simcache")
R = json.load(open(os.path.join(RAIZ, "src", "ritmo.json"), encoding="utf-8"))
FPS = 30
PULSO = R["pulso"]
COMPAS = R["compas"]
PRIMER = R["primerCompas"]


def B(n):
    return PRIMER + n * COMPAS


def F(t):
    return int(round(t * FPS))


BOMBO = [(o["t"], o["v"]) for o in R["onsetsBombo"]]
CAJA = [(o["t"], o["v"]) for o in R["onsetsCaja"]]


def en_tiempos(lista, cuales, tol=0.12):
    out = []
    for t, v in lista:
        k = round((t - B(0)) / PULSO)
        if (k % 4) in cuales and abs(t - (B(0) + k * PULSO)) < tol:
            out.append((t, v))
    return out


BACKBEAT = en_tiempos(CAJA, [1, 3])


def pulso_warp(t, base=0.35, caida=0.16):
    """Velocidad de avance al pulso: cada tiempo de la rejilla da un empujón que cae suave (media aprox. 1)."""
    k = np.floor((t - B(0)) / PULSO)
    tb = B(0) + k * PULSO
    x = (t - tb) / caida
    return base + (1 - base) * (PULSO / caida) * np.exp(-x) / (1 - np.exp(-PULSO / caida))


manifiesto = {}
if os.path.exists(os.path.join(SAL, "manifiesto.json")):
    manifiesto = json.load(open(os.path.join(SAL, "manifiesto.json")))


def guardar(nombre, f, arr):
    d = os.path.join(SAL, nombre)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, f"{f:05d}.gzb"), "wb") as fh:
        fh.write(gzip.compress(np.ascontiguousarray(arr).tobytes(), 6, mtime=0))


def registrar(nombre, w, h, canales, tipo, f0, f1, extra=None):
    manifiesto[nombre] = dict(w=w, h=h, canales=canales, tipo=tipo, f0=f0, f1=f1, **(extra or {}))
    os.makedirs(SAL, exist_ok=True)
    with open(os.path.join(SAL, "manifiesto.json"), "w") as fh:
        json.dump(manifiesto, fh, indent=1)


def limpiar(nombre):
    d = os.path.join(SAL, nombre)
    if os.path.isdir(d):
        for x in os.listdir(d):
            os.remove(os.path.join(d, x))


def ss(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def eio(x):
    x = min(max(x, 0.0), 1.0)
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def remuestrear(a, nh, nw):
    """Bilineal (centros de celda alineados) de a (h, w) a (nh, nw)."""
    h, w = a.shape[:2]
    y = (np.arange(nh) + 0.5) * h / nh - 0.5
    x = (np.arange(nw) + 0.5) * w / nw - 0.5
    y0 = np.clip(np.floor(y).astype(int), 0, h - 1)
    x0 = np.clip(np.floor(x).astype(int), 0, w - 1)
    y1 = np.clip(y0 + 1, 0, h - 1)
    x1 = np.clip(x0 + 1, 0, w - 1)
    fy = np.clip(y - y0, 0, 1)[:, None]
    fx = np.clip(x - x0, 0, 1)[None, :]
    if a.ndim == 3:
        fy = fy[..., None]
        fx = fx[..., None]
    return (a[y0][:, x0] * (1 - fy) * (1 - fx) + a[y0][:, x1] * (1 - fy) * fx + a[y1][:, x0] * fy * (1 - fx) + a[y1][:, x1] * fy * fx)


def suavizar(a, s):
    """Desenfoque gaussiano periódico por FFT (sigma s en celdas)."""
    ky = np.fft.fftfreq(a.shape[0])[:, None]
    kx = np.fft.fftfreq(a.shape[1])[None, :]
    g = np.exp(-2 * (np.pi * s) ** 2 * (kx ** 2 + ky ** 2))
    return np.real(np.fft.ifft2(np.fft.fft2(a) * g))


# Rejilla de las ondas (membrana y Schrödinger): 432 x 540 visibles (0,4 de 1080 x 1350).
NX, NY = 432, 540
# Geometría compartida (en celdas visibles de la rejilla de ondas)
MURO_Y = int(NY * 0.47)  # fila de la pared con rendijas
MURO_G = 6  # grosor
RENDIJA_DX = 24  # mitad de la separación entre rendijas
RENDIJA_W = 9  # ancho de cada rendija
FUENTES_Y = NY * 0.58


# ═════════════════════════════ 1 · membrana: ecuación de onda ═════════════════════════════
def onda():
    t0 = time.time()
    limpiar("onda")
    P = 48
    nx, ny = NX + 2 * P, NY + 2 * P
    rng = np.random.default_rng(11)
    Y, X = np.mgrid[0:ny, 0:nx].astype(np.float64)
    Xv, Yv = X - P, Y - P
    # esponja absorbente fuera de la zona visible
    dx = np.maximum(np.maximum(-Xv, Xv - (NX - 1)), 0)
    dy = np.maximum(np.maximum(-Yv, Yv - (NY - 1)), 0)
    dd = np.maximum(dx, dy) / P
    gam0 = 0.0006 + 0.22 * dd ** 2
    h = np.zeros((ny, nx))
    hp = np.zeros((ny, nx))
    C2 = 0.25  # (c dt / dx)^2, c dt = 0,5 celdas por paso
    SPF = 4  # pasos por cuadro: 60 celdas/s
    w_paso = 2 * np.pi / (PULSO * FPS * SPF)  # periodo de las fuentes = un pulso

    def gauss(cx, cy, s):
        return np.exp(-((Xv - cx) ** 2 + (Yv - cy) ** 2) / (2 * s * s))

    # gotas: la primera en el centro del texto (B2); luego los bombos del compás 2; desde el drop solo los fuertes
    gotas = [(B(2), NX * 0.5, NY * 0.44, 1.4)]
    for t, v in BOMBO:
        if B(2) + 0.2 < t < B(3) - 0.05 and v >= 0.55:
            gotas.append((t, NX * rng.uniform(0.18, 0.82), NY * rng.uniform(0.2, 0.8), 0.7 * v))
        elif B(3) + 0.3 < t < B(5) and v >= 0.95:
            gotas.append((t, NX * rng.uniform(0.12, 0.88), NY * rng.uniform(0.08, 0.4), 0.22 * v))
    f_ini, f_fin = F(B(2)) - 1, F(B(6) + 0.3)
    gotas_f = {}
    for t, x, y, a in gotas:
        gotas_f.setdefault(F(t), []).append((x, y, a))
    mascara_vis = (slice(P, P + NY), slice(P, P + NX))
    for f in range(f_ini, f_fin + 1):
        t = f / FPS
        guardar("onda", f, h[mascara_vis].astype(np.float16))
        for (x, y, a) in gotas_f.get(f + 1, []):
            g = gauss(x, y, 3.2) * a
            h += g
            hp += g
        # fuentes coherentes desde el drop: separación que crece en los compases 4 y 5; se apagan en el 5
        sep = 0.1 + 0.08 * eio((t - B(4)) / (2 * COMPAS))
        amp = eio((t - B(3)) / PULSO) * (1 - eio((t - B(5)) / COMPAS))
        gam = gam0 + 0.004 * eio((t - B(5) - 0.5 * COMPAS) / COMPAS)
        G1 = gauss(NX * (0.5 - sep), FUENTES_Y, 2.4) if amp > 0 else None
        G2 = gauss(NX * (0.5 + sep), FUENTES_Y, 2.4) if amp > 0 else None
        for k in range(SPF):
            n = f * SPF + k
            lap = np.roll(h, 1, 0) + np.roll(h, -1, 0) + np.roll(h, 1, 1) + np.roll(h, -1, 1) - 4 * h
            hn = 2 * h - hp + C2 * lap - gam * (h - hp)
            if amp > 0:
                hn += 0.11 * amp * np.sin(w_paso * n) * (G1 + G2)
            hp, h = h, hn
    registrar("onda", NX, NY, 1, "f16", f_ini, f_fin, dict(fuentesY=FUENTES_Y / NY))
    print(f"onda: cuadros {f_ini}-{f_fin} en {time.time() - t0:.1f} s, max {np.abs(h).max():.3f}")


# ═════════════════════════════ 2 · Schrödinger 2D split-step ═════════════════════════════
SCH_DT = 0.93
SCH_SPF = 10


def schro():
    t0 = time.time()
    limpiar("schro")
    P = 40
    nx, ny = NX + 2 * P, NY + 2 * P
    Y, X = np.mgrid[0:ny, 0:nx].astype(np.float64)
    Xv, Yv = X - P, Y - P
    k0 = 2 * np.pi / 16.0
    E = k0 * k0 / 2
    V = np.zeros((ny, nx))
    muro = (Yv >= MURO_Y) & (Yv < MURO_Y + MURO_G)
    rend = (np.abs(Xv - (NX / 2 - RENDIJA_DX)) < RENDIJA_W / 2) | (np.abs(Xv - (NX / 2 + RENDIJA_DX)) < RENDIJA_W / 2)
    V[muro & ~rend] = 1.7 * E
    # paquete: ancho lateral para cubrir las dos rendijas, entra por abajo hacia arriba (fila decreciente)
    sx, sy = 70.0, 18.0
    y0 = NY + 10.0
    psi = np.exp(-((Xv - NX / 2) ** 2) / (2 * sx * sx) - ((Yv - y0) ** 2) / (2 * sy * sy)) * np.exp(-1j * k0 * Yv)
    kx = 2 * np.pi * np.fft.fftfreq(nx)[None, :]
    ky = 2 * np.pi * np.fft.fftfreq(ny)[:, None]
    cin = np.exp(-1j * (kx ** 2 + ky ** 2) / 2 * SCH_DT)
    pot = np.exp(-1j * V * SCH_DT / 2)
    dx_ = np.maximum(np.maximum(-Xv, Xv - (NX - 1)), 0)
    dy_ = np.maximum(np.maximum(-Yv, Yv - (NY - 1)), 0)
    # abajo dejamos entrar el paquete: la esponja inferior empieza más lejos
    dy_ = np.where(Yv > NY, np.maximum(Yv - (NY + 30), 0), dy_)
    dd = np.maximum(dx_, dy_) / P
    absor = np.exp(-0.12 * dd ** 2 * SCH_DT)
    f_ini, f_fin = F(B(5)), F(B(7)) + 2
    vis = (slice(P, P + NY), slice(P, P + NX))
    for f in range(f_ini, f_fin + 1):
        # c = sqrt(|psi|) e^(i fase): Re e Im se interpolan bien en la GPU y |psi| = |c|^2
        pv = psi[vis]
        c = np.sqrt(np.clip(np.abs(pv), 0, 1)) * np.exp(1j * np.angle(pv))
        out = np.empty((NY, NX, 2), np.uint8)
        out[..., 0] = np.clip(128 + 127 * c.real + 0.5, 0, 255).astype(np.uint8)
        out[..., 1] = np.clip(128 + 127 * c.imag + 0.5, 0, 255).astype(np.uint8)
        guardar("schro", f, out)
        if f == F(B(7)):
            np.save(os.path.join(CACHE, "psi_B7.npy"), psi[vis])
        for _ in range(SCH_SPF):
            psi *= pot
            psi = np.fft.ifft2(np.fft.fft2(psi) * cin)
            psi *= pot
            psi *= absor
    registrar("schro", NX, NY, 2, "u8", f_ini, f_fin, dict(muroY=MURO_Y / NY, muroG=MURO_G / NY, rendDx=RENDIJA_DX / NX, rendW=RENDIJA_W / NX, k0=k0))
    print(f"schro: cuadros {f_ini}-{f_fin} en {time.time() - t0:.1f} s")


# ═════════════════════════════ 3 · fluido (stable fluids) ═════════════════════════════
FW, FH = 540, 675  # zona visible del fluido
FPX, FPY = 50, 64
FNX, FNY = FW + 2 * FPX, FH + 2 * FPY


def advectar(q, u, v, dt):
    """Semilagrangiano bilineal periódico: q(x - dt*u). q puede ser (ny, nx) o (ny, nx, c)."""
    ny, nx = u.shape
    Y, X = np.mgrid[0:ny, 0:nx]
    xs = X - dt * u
    ys = Y - dt * v
    x0 = np.floor(xs).astype(int)
    y0 = np.floor(ys).astype(int)
    fx = xs - x0
    fy = ys - y0
    x0 %= nx
    y0 %= ny
    x1 = (x0 + 1) % nx
    y1 = (y0 + 1) % ny
    if q.ndim == 3:
        fx = fx[..., None]
        fy = fy[..., None]
    return (q[y0, x0] * (1 - fx) * (1 - fy) + q[y0, x1] * fx * (1 - fy) + q[y1, x0] * (1 - fx) * fy + q[y1, x1] * fx * fy), (y0, x0, y1, x1)


def maccormack(q, u, v, dt):
    adel, (y0, x0, y1, x1) = advectar(q, u, v, dt)
    atras, _ = advectar(adel, u, v, -dt)
    r = adel + 0.5 * (q - atras)
    # limitador: dentro del rango de los 4 vecinos de la ida
    vec = np.stack([q[y0, x0], q[y0, x1], q[y1, x0], q[y1, x1]])
    return np.clip(r, vec.min(0), vec.max(0))


class Fluido:
    def __init__(self):
        self.u = np.zeros((FNY, FNX))
        self.v = np.zeros((FNY, FNX))
        self.tinta = np.zeros((FNY, FNX, 2))
        kx = 2 * np.pi * np.fft.fftfreq(FNX)[None, :]
        ky = 2 * np.pi * np.fft.fftfreq(FNY)[:, None]
        k2 = kx ** 2 + ky ** 2
        k2[0, 0] = 1
        self.kx, self.ky, self.k2 = kx, ky, k2
        Y, X = np.mgrid[0:FNY, 0:FNX].astype(np.float64)
        self.X, self.Y = X - FPX, Y - FPY  # coordenadas visibles
        dx = np.maximum(np.maximum(-self.X, self.X - (FW - 1)), 0)
        dy = np.maximum(np.maximum(-self.Y, self.Y - (FH - 1)), 0)
        self.borde = np.exp(-0.08 * (np.maximum(dx / FPX, dy / FPY) * 6) ** 2)

    def proyectar(self, visc=0.0, dt=1.0):
        U = np.fft.fft2(self.u)
        V = np.fft.fft2(self.v)
        d = (self.kx * U + self.ky * V) / self.k2
        U -= self.kx * d
        V -= self.ky * d
        if visc > 0:
            g = np.exp(-visc * self.k2 * dt)
            U *= g
            V *= g
        self.u = np.real(np.fft.ifft2(U))
        self.v = np.real(np.fft.ifft2(V))

    def vorticidad(self):
        u, v = self.u, self.v
        return 0.5 * ((np.roll(v, -1, 1) - np.roll(v, 1, 1)) - (np.roll(u, -1, 0) - np.roll(u, 1, 0)))

    def confinar(self, eps, dt):
        w = self.vorticidad()
        aw = np.abs(w)
        gx = 0.5 * (np.roll(aw, -1, 1) - np.roll(aw, 1, 1))
        gy = 0.5 * (np.roll(aw, -1, 0) - np.roll(aw, 1, 0))
        n = np.sqrt(gx * gx + gy * gy) + 1e-6
        gx /= n
        gy /= n
        self.u += eps * dt * gy * w
        self.v += eps * dt * (-gx) * w

    def vortice_par(self, cx, cy, ang, fuerza, sep=14.0, s=9.0):
        """Par de vórtices opuestos (dipolo) que avanza en la dirección ang."""
        nx_, ny_ = np.cos(ang), np.sin(ang)
        px, py = -ny_, nx_
        for sg in (1, -1):
            x0, y0 = cx + sg * px * sep, cy + sg * py * sep
            dx, dy = self.X - x0, self.Y - y0
            r2 = dx * dx + dy * dy
            g = np.exp(-r2 / (2 * s * s))
            # vórtice gaussiano (velocidad tangencial)
            self.u += -sg * fuerza * dy / s * g
            self.v += sg * fuerza * dx / s * g

    def gota(self, cx, cy, s, canal, cant):
        g = np.exp(-((self.X - cx) ** 2 + (self.Y - cy) ** 2) / (2 * s * s))
        self.tinta[..., canal] += cant * g

    def paso(self, dt, visc=0.0, conf=0.0, arrastre=0.0, decae=0.0):
        if conf > 0:
            self.confinar(conf, dt)
        uu, _ = advectar(np.stack([self.u, self.v], -1), self.u, self.v, dt)
        self.u, self.v = uu[..., 0], uu[..., 1]
        self.proyectar(visc, dt)
        if arrastre > 0:
            self.u *= 1 - arrastre * dt
            self.v *= 1 - arrastre * dt
        self.u *= self.borde
        self.v *= self.borde
        self.tinta = maccormack(self.tinta, self.u, self.v, dt)
        if decae > 0:
            self.tinta *= 1 - decae * dt
        self.tinta *= self.borde[..., None]

    def visible(self, a):
        return a[FPY:FPY + FH, FPX:FPX + FW]


def fluido():
    t0 = time.time()
    limpiar("fluido")
    os.makedirs(CACHE, exist_ok=True)
    psi = np.load(os.path.join(CACHE, "psi_B7.npy"))
    fl = Fluido()
    esc = FW / NX  # 1,25
    # Madelung: densidad y velocidad = Im(conj(psi) grad psi) / |psi|^2 (celdas de Schrödinger por unidad de tiempo)
    rho = np.abs(psi) ** 2
    gy, gx = np.gradient(psi)
    jx = np.imag(np.conj(psi) * gx)
    jy = np.imag(np.conj(psi) * gy)
    eps = 0.02 * rho.max()
    vx = jx / (rho + eps)
    vy = jy / (rho + eps)
    m = ss(rho / (0.08 * rho.max()))
    k = SCH_DT * SCH_SPF * esc * 0.55  # a celdas del fluido por cuadro, algo más lento
    vx = remuestrear(vx * m * k, FH, FW)
    vy = remuestrear(vy * m * k, FH, FW)
    dens = remuestrear(rho / np.percentile(rho, 99.7), FH, FW)
    fl.u[FPY:FPY + FH, FPX:FPX + FW] = vx
    fl.v[FPY:FPY + FH, FPX:FPX + FW] = vy
    fl.tinta[FPY:FPY + FH, FPX:FPX + FW, 0] = np.clip(dens, 0, 1.6)
    # semilla de turbulencia: vórtices suaves al azar, pesados por la densidad (rompen la simetría)
    rng = np.random.default_rng(7)
    psi_r = suavizar(rng.standard_normal((FNY, FNX)), 24)
    psi_r /= np.abs(psi_r).max()
    m_d = suavizar(fl.tinta[..., 0], 6)
    fl.u += 4.0 * (np.roll(psi_r, -1, 0) - np.roll(psi_r, 1, 0)) * 0.5 * 14 * (0.3 + m_d)
    fl.v += -4.0 * (np.roll(psi_r, -1, 1) - np.roll(psi_r, 1, 1)) * 0.5 * 14 * (0.3 + m_d)
    fl.proyectar()
    # boquillas: las rendijas (en coordenadas visibles del fluido)
    by = (MURO_Y - 2) * esc
    bxs = [(NX / 2 - RENDIJA_DX) * esc, (NX / 2 + RENDIJA_DX) * esc]
    perturb = {}
    for t, v in BACKBEAT:
        if B(7) + 0.5 * COMPAS < t < B(11) - 0.1:
            perturb.setdefault(F(t), []).append(v)
    f_ini, f_fin = F(B(7)), F(B(12) + 0.75 * COMPAS)
    fuerte = F(B(11))
    estado_gs = None
    for f in range(f_ini, f_fin + 1):
        t = f / FPS
        tv = fl.visible(fl.tinta)
        out = np.empty((FH, FW, 2), np.uint8)
        out[...] = np.clip(np.sqrt(np.clip(tv / 1.4, 0, 1)) * 255 + 0.5, 0, 255).astype(np.uint8)
        guardar("fluido", f, out)
        if f == F(B(11) + 0.5 * COMPAS):
            np.save(os.path.join(CACHE, "tinta_gs.npy"), tv.sum(-1))
        if f >= F(B(11) + 0.5 * COMPAS):
            # velocidad visible para arrastrar el Gray-Scott (cuadro a cuadro)
            np.save(os.path.join(CACHE, f"vel_{f:05d}.npy"), np.stack([fl.visible(fl.u), fl.visible(fl.v)]).astype(np.float32))
        # perturbaciones de las cajas: par de vórtices con tinta ámbar
        for v in perturb.get(f, []):
            cx = FW * rng.uniform(0.22, 0.78)
            cy = FH * rng.uniform(0.18, 0.7)
            ang = rng.uniform(0, 2 * np.pi)
            tam = rng.uniform(0.7, 1.5)
            fl.vortice_par(cx, cy, ang, 2.6 * v * rng.uniform(0.7, 1.2), sep=13 * tam, s=9 * tam)
            fl.gota(cx + rng.uniform(-6, 6), cy + rng.uniform(-6, 6), 7 * tam, 1, 0.38 * v)
        if f == fuerte:
            # «Fuerzas»: un dipolo grande sube desde abajo
            fl.vortice_par(FW * 0.5, FH * 0.86, -np.pi / 2, 3.2, sep=34, s=20)
            fl.gota(FW * 0.5, FH * 0.86, 22, 1, 1.0)
        for sub in range(2):
            dt = 0.5
            ts = t + sub * dt / FPS
            # chorros desde las rendijas durante dos compases y medio, con un vaivén lento que siembra remolinos
            chorro = 0.0  # v6: sin chorros (el par simétrico dibujaba un corazón)
            if chorro > 0.001:
                for i, bx in enumerate(bxs):
                    g = np.exp(-((fl.X - bx) ** 2 / (2 * 4.5 ** 2) + (fl.Y - (by - 8)) ** 2 / (2 * 6 ** 2)))
                    vaiven = 0.35 * np.sin(2 * np.pi * ts / (2 * PULSO) + i * 1.7)
                    a = 0.35 * chorro
                    fl.u = fl.u * (1 - a * g) + a * g * vaiven * 2.4
                    fl.v = fl.v * (1 - a * g) + a * g * (-2.4)
                    fl.tinta[..., 0] += 0.06 * chorro * g * dt
            # flotación (Boussinesq): la tinta más densa que su entorno sube; se apaga en el compás 10
            beta = 0.022 * (1 - eio((ts - B(9) - 0.5 * COMPAS) / (1.5 * COMPAS)))
            if beta > 1e-4:
                d0 = fl.tinta[..., 0] + fl.tinta[..., 1]
                fl.v -= beta * dt * (d0 - suavizar(d0, 30))
            fl.paso(dt, visc=0.02, conf=0.12, arrastre=0.012 + 0.03 * (1 - eio((ts - B(7)) / COMPAS)), decae=0.0015)
    registrar("fluido", FW, FH, 2, "u8", f_ini, f_fin)
    print(f"fluido: cuadros {f_ini}-{f_fin} en {time.time() - t0:.1f} s")


# ═════════════════════════════ 4 · Gray-Scott ═════════════════════════════
GW, GH = 360, 450


def lap5(a):
    return np.roll(a, 1, 0) + np.roll(a, -1, 0) + np.roll(a, 1, 1) + np.roll(a, -1, 1) - 4 * a


def lap9(a):
    # laplaciano isótropo de 9 puntos (patrones sin sesgo de rejilla)
    n = np.roll(a, 1, 0) + np.roll(a, -1, 0) + np.roll(a, 1, 1) + np.roll(a, -1, 1)
    d = np.roll(np.roll(a, 1, 0), 1, 1) + np.roll(np.roll(a, 1, 0), -1, 1) + np.roll(np.roll(a, -1, 0), 1, 1) + np.roll(np.roll(a, -1, 0), -1, 1)
    return 0.2 * n + 0.05 * d - a


def gs():
    t0 = time.time()
    limpiar("gs")
    tinta = np.load(os.path.join(CACHE, "tinta_gs.npy"))
    rng = np.random.default_rng(5)
    s = remuestrear(tinta, GH, GW)
    s = s / max(np.percentile(s, 99.5), 1e-6)
    V = 0.36 * ss((s - 0.03) / 0.25) + 0.02 * rng.random((GH, GW))
    # semillas sueltas también fuera de la tinta: el patrón termina cubriendo todo, primero donde había tinta
    sem = suavizar((rng.random((GH, GW)) < 0.0015).astype(float), 1.5)
    V += 0.4 * np.clip(sem / max(sem.max(), 1e-6), 0, 1)
    U = 1 - V
    Fp, kp = 0.055, 0.062
    dt = 1.0
    f_ini, f_fin = F(B(11) + 0.5 * COMPAS), F(B(13) + 0.75 * COMPAS)
    esc = GW / FW
    for f in range(f_ini, f_fin + 1):
        t = f / FPS
        guardar("gs", f, np.clip(V * 2.6 * 255, 0, 255).astype(np.uint8))
        if f == F(B(12) + 0.5 * COMPAS):
            np.save(os.path.join(CACHE, "gs_ising.npy"), V)
        # arrastre por el fluido que se apaga
        vp = os.path.join(CACHE, f"vel_{f:05d}.npy")
        apaga = 1 - eio((t - (B(11) + 0.5 * COMPAS)) / (0.9 * COMPAS))
        if os.path.exists(vp) and apaga > 0.01:
            vel = np.load(vp).astype(np.float64)
            uu = remuestrear(vel[0], GH, GW) * esc * apaga
            vv = remuestrear(vel[1], GH, GW) * esc * apaga
            UV, _ = advectar(np.stack([U, V], -1), uu, vv, 1.0)
            U, V = UV[..., 0], UV[..., 1]
        n = int(round(64 * pulso_warp(t)))
        for _ in range(n):
            uvv = U * V * V
            U += dt * (0.2097 * lap5(U) - uvv + Fp * (1 - U))
            V += dt * (0.105 * lap5(V) + uvv - (Fp + kp) * V)
    registrar("gs", GW, GH, 1, "u8", f_ini, f_fin)
    print(f"gs: cuadros {f_ini}-{f_fin} en {time.time() - t0:.1f} s, V max {V.max():.3f}")


# ═════════════════════════════ 5 · Ising ═════════════════════════════
IW, IH = 360, 450


def ising():
    t0 = time.time()
    limpiar("ising")
    V = np.load(os.path.join(CACHE, "gs_ising.npy"))
    rng = np.random.default_rng(3)
    Vb = V[GH // IH // 2::GH // IH, GW // IW // 2::GW // IW]
    thr = np.median(Vb)
    S = np.where(Vb > thr, 1, -1).astype(np.int8)
    Yi, Xi = np.mgrid[0:IH, 0:IW]
    neg = (Yi + Xi) % 2 == 0
    f_ini, f_fin = F(B(12) + 0.5 * COMPAS), F(B(15) + 0.3)
    acc = 0.0
    for f in range(f_ini, f_fin + 1):
        t = f / FPS
        guardar("ising", f, np.where(S > 0, 255, 0).astype(np.uint8))
        # temperatura bajo la crítica (2,269) que baja; campo externo que ordena desde el compás 14
        T = 1.2 - 0.3 * eio((t - B(13)) / (1.5 * COMPAS))
        hcampo = 0.22 * eio((t - B(13) - 0.5 * COMPAS) / (1.2 * COMPAS))
        acc += pulso_warp(t, base=0.2) * (0.25 + 2.75 * eio((t - B(13)) / (1.2 * COMPAS)))
        while acc >= 1:
            acc -= 1
            for par in (neg, ~neg):
                nb = np.roll(S, 1, 0) + np.roll(S, -1, 0) + np.roll(S, 1, 1) + np.roll(S, -1, 1)
                dE = 2 * S * (nb + hcampo)
                acepta = (dE <= 0) | (rng.random(S.shape) < np.exp(-np.clip(dE, 0, None) / T))
                S = np.where(par & acepta, -S, S).astype(np.int8)
    registrar("ising", IW, IH, 1, "u8", f_ini, f_fin)
    print(f"ising: cuadros {f_ini}-{f_fin} en {time.time() - t0:.1f} s, magnetización final {S.mean():.2f}")


ETAPAS = {"onda": onda, "schro": schro, "fluido": fluido, "gs": gs, "ising": ising}
if __name__ == "__main__":
    os.makedirs(CACHE, exist_ok=True)
    pedidas = sys.argv[1:] or list(ETAPAS)
    for e in pedidas:
        ETAPAS[e]()
    tam = sum(os.path.getsize(os.path.join(dp, x)) for dp, _, fs in os.walk(SAL) for x in fs)
    print(f"public/sim: {tam / 1e6:.0f} MB")
