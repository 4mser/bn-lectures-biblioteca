"""Música y diseño de sonido del teaser de B&N Lectures. Todo sintetizado aquí con numpy, sin samples de terceros.

Electrónica luminosa a 120 BPM en Re mayor (con color lidio, G# en el motivo de cierre), progresión I–V–vi–IV
(D – A – Bm – G) con voicings abiertos de novena y séptima mayor. Motivo de 5 notas (F#5 A5 E5 F#5 D6) que aparece
en el piano de la intro, crece en las campanitas del drop, vuelve en el breakdown y firma el cierre sobre el logo.
Los efectos (blips, whooshes, impactos, risers, shimmer) van afinados en la escala para que el sonido sea musical.

Grilla fija: compás = 2 s, pulso = 0,5 s. Además de public/musica.wav escribe src/ritmo.json con la grilla, las
secciones, cada golpe de bombo, cada nota del motivo y cada efecto, para que la imagen caiga en el golpe.

Uso: PYTHONPATH=pylib python3 audio/generar_musica.py
"""
import json
import wave
from pathlib import Path

import numpy as np

SR = 44100
BPM = 120
BEAT = 60 / BPM
BAR = 4 * BEAT
COMPASES = 24  # compases con música; luego el acorde final queda sonando
TOTAL = COMPASES * BAR + 4.0  # 52 s
RAIZ = Path(__file__).resolve().parent.parent
rng = np.random.default_rng(11)
N = int(SR * TOTAL)

# Secciones (compás de inicio). La imagen usa los mismos nombres.
SECCIONES = [
    ("intro", 0), ("fisica", 4), ("geometria", 6), ("matematica", 8), ("caos", 10), ("computacion", 12),
    ("calculado", 14), ("javier", 16), ("marca", 18), ("logo", 20), ("final", 24),
]


def T(compas, pulso=0.0):
    return compas * BAR + pulso * BEAT


def midi(nombre):
    notas = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
    return 12 * (int(nombre[-1]) + 1) + notas[nombre[:-1]]


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


# ── Buses: seco y envío a reverb, estéreo ──
seco = np.zeros((N, 2))
envio = np.zeros((N, 2))
ducking = np.ones(N)  # sidechain del bombo para pad y bajo
lado = {k: np.zeros((N, 2)) for k in ("pad", "bajo")}


def poner(dest, t0, s, gan=1.0, pan=0.0):
    i0 = int(round(t0 * SR))
    if i0 >= N or i0 + len(s) <= 0:
        return
    if i0 < 0:
        s, i0 = s[-i0:], 0
    i1 = min(N, i0 + len(s))
    s = s[: i1 - i0] * gan
    dest[i0:i1, 0] += s * np.sqrt((1 - pan) / 2) * np.sqrt(2)
    dest[i0:i1, 1] += s * np.sqrt((1 + pan) / 2) * np.sqrt(2)


def env(largo, ataque, caida):
    t = np.arange(largo) / SR
    e = np.minimum(1, t / max(ataque, 1e-4)) * np.exp(-t / caida)
    r = min(largo, int(0.03 * SR))
    e[-r:] *= np.linspace(1, 0, r)
    return e


# ── Instrumentos ──
def piano(m, dur, vel=1.0):
    """Piano suave aditivo: parciales algo inarmónicos que caen más rápido cuanto más agudos, y un golpecito de martillo."""
    largo = int((dur + 1.6) * SR)
    t = np.arange(largo) / SR
    f = hz(m)
    B = 0.0004
    s = np.zeros(largo)
    for n in range(1, 9):
        fn = f * n * np.sqrt(1 + B * n * n)
        if fn > 9000:
            break
        a = vel ** (0.6 + 0.15 * n) / n ** 1.15
        s += a * np.sin(2 * np.pi * fn * t + n) * np.exp(-t * (0.9 + 0.55 * n) * (1 + f / 1400))
    s *= np.minimum(1, t / 0.004)
    # suelta la tecla
    k = int(dur * SR)
    if k < largo:
        s[k:] *= np.exp(-(t[k:] - dur) * 5)
    golpe = rng.standard_normal(int(0.012 * SR)) * np.exp(-np.arange(int(0.012 * SR)) / SR * 400) * 0.02 * vel
    s[: len(golpe)] += golpe
    return s


def pluck(m, brillo=1.0):
    """Pluck del arpegio: aditivo tipo Karplus-Strong (los armónicos altos se apagan antes). brillo abre el filtro."""
    largo = int(0.42 * SR)
    t = np.arange(largo) / SR
    f = hz(m)
    s = np.zeros(largo)
    nmax = int(2 + 10 * brillo)
    for n in range(1, nmax + 1):
        if f * n > 12000:
            break
        s += np.sin(2 * np.pi * f * n * t) / n ** 1.3 * np.exp(-t * (7 + 5 * n / max(brillo, 0.15)))
    return s * np.minimum(1, t / 0.002)


def campana(m, dur=1.6):
    """Campanita/glockenspiel: parciales de barra (1, 2.76, 5.40, 8.93) con ataque nítido."""
    largo = int(dur * SR)
    t = np.arange(largo) / SR
    f = hz(m)
    s = np.zeros(largo)
    for r, a, d in ((1, 1, 1.1), (2.76, 0.42, 3.5), (5.40, 0.2, 7), (8.93, 0.08, 12)):
        if f * r < 15000:
            s += a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d)
    return s * np.minimum(1, t / 0.0015)


def pad(ms, dur):
    """Pad cálido: diente de sierra suave (aditivo, 1/n²) con detune, ataque y caída lentos."""
    largo = int((dur + 0.8) * SR)
    t = np.arange(largo) / SR
    s = np.zeros(largo)
    for m in ms:
        for d in (0.996, 1.0, 1.004):
            f = hz(m) * d
            for n in range(1, 7):
                s += np.sin(2 * np.pi * f * n * t + n * d * 7) / (n * n)
    e = np.minimum(1, t / 0.6) * np.where(t > dur, np.exp(-(t - dur) * 4), 1)
    return s * e / len(ms)


def bajo(m, dur):
    largo = int(dur * SR)
    t = np.arange(largo) / SR
    f = hz(m)
    s = np.sin(2 * np.pi * f * t) + 0.18 * np.sin(4 * np.pi * f * t) + 0.05 * np.sin(6 * np.pi * f * t)
    return s * np.minimum(1, t / 0.008) * np.minimum(1, (dur - t) / 0.03).clip(0) * np.exp(-t * 1.2)


def bombo():
    largo = int(0.32 * SR)
    t = np.arange(largo) / SR
    fr = 46 + 85 * np.exp(-t * 32)
    s = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 11)
    s[: int(0.003 * SR)] += np.linspace(0.25, 0, int(0.003 * SR))
    return s


def ruido(largo):
    return rng.standard_normal(largo)


def banda(x, lo, hi):
    """Filtro de banda por FFT (fase cero), con flancos suaves."""
    X = np.fft.rfft(x, axis=0)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    H = np.ones_like(f)
    if lo:
        H *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1)) ** 4)
    if hi:
        H *= 1 / np.sqrt(1 + (f / hi) ** 4)
    if X.ndim == 2:
        H = H[:, None]
    return np.fft.irfft(X * H, n=len(x), axis=0)


def palmas():
    largo = int(0.22 * SR)
    t = np.arange(largo) / SR
    r = banda(ruido(largo), 1100, 5200)
    e = sum(np.exp(-np.clip(t - d, 0, None) * 60) * (t >= d) for d in (0, 0.011, 0.022)) + 0.6 * np.exp(-np.clip(t - 0.03, 0, None) * 18) * (t >= 0.03)
    return r * e


def hat(abierto=False):
    largo = int((0.22 if abierto else 0.05) * SR)
    t = np.arange(largo) / SR
    return banda(ruido(largo), 7500, None) * np.exp(-t * (14 if abierto else 85))


# ── Efectos afinados ──
ESCALA = [midi(n) for n in ("D5", "E5", "F#5", "A5", "B5", "D6", "E6", "F#6")]
efectos = []


def blip(t0, m, gan=0.12, pan=0.0):
    largo = int(0.16 * SR)
    t = np.arange(largo) / SR
    f = hz(m)
    s = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 32) * np.minimum(1, t / 0.001)
    poner(seco, t0, s, gan, pan)
    poner(envio, t0, s, gan * 0.6, pan)
    efectos.append({"t": round(t0, 4), "tipo": "blip", "nota": int(m)})


def whoosh(t_pico, largo_s=0.7, gan=0.16):
    """Whoosh filtrado que culmina en t_pico: ruido pasado por una banda que sube, con paneo que cruza."""
    largo = int(largo_s * SR)
    t = np.arange(largo) / SR
    u = t / largo_s
    r = ruido(largo)
    # banda móvil por bloques
    s = np.zeros(largo)
    blk = 2048
    for i in range(0, largo, blk):
        c = 500 * 2 ** (u[min(i, largo - 1)] * 4)
        s[i : i + blk] = banda(r[i : i + blk + 0], c * 0.6, c * 1.6)[: len(s[i : i + blk])]
    s = banda(s, 200, 9000)
    forma = np.sin(np.pi * np.clip(u, 0, 1) ** 1.6) ** 2
    s = s * forma
    i0 = int((t_pico - largo_s * 0.8) * SR)
    for k, pan in enumerate((-0.6, 0.6)):
        cola = s * (u if k else 1 - u)
        poner(seco, i0 / SR, cola, gan, pan)
    poner(envio, i0 / SR, s, gan * 0.5)
    efectos.append({"t": round(t_pico, 4), "tipo": "whoosh"})


def impacto(t0, fuerte=False):
    """Impacto: sub afinado en Re que cae, más un soplo de ruido brillante."""
    largo = int((1.6 if fuerte else 0.8) * SR)
    t = np.arange(largo) / SR
    f = hz(midi("D2")) * (1 + 0.9 * np.exp(-t * 14))
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (2.6 if fuerte else 5))
    aire = banda(ruido(largo), 2500, 12000) * np.exp(-t * (6 if fuerte else 12))
    s = sub * (0.9 if fuerte else 0.5) + aire * (0.25 if fuerte else 0.12)
    poner(seco, t0, banda(s, 32, None), 0.4)
    poner(envio, t0, aire * 0.3, 0.5)
    efectos.append({"t": round(t0, 4), "tipo": "impacto_fuerte" if fuerte else "impacto"})


def riser(t0, t1, gan=0.13):
    """Riser: ruido con banda que sube y un tono que asciende una octava hasta la nota de llegada (Re)."""
    largo = int((t1 - t0) * SR)
    t = np.arange(largo) / SR
    u = t / (t1 - t0)
    r = ruido(largo)
    s = np.zeros(largo)
    blk = 4096
    for i in range(0, largo, blk):
        c = 400 * 2 ** (u[i] * 4.5)
        s[i : i + blk] = banda(r[i : i + blk], c * 0.7, c * 1.5)[: len(s[i : i + blk])]
    f = hz(midi("D4")) * 2 ** u
    tono = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)
    forma = u ** 2.2
    poner(seco, t0, (s * 0.9 + tono * 0.12) * forma, gan)
    poner(envio, t0, (s * 0.9 + tono * 0.12) * forma, gan * 0.7)
    efectos.append({"t": round(t0, 4), "tipo": "riser", "fin": round(t1, 4)})


def shimmer(t0, gan=0.12):
    """Shimmer: nube de campanitas agudas en la escala (Dmaj9) que se abre en abanico y se va a la reverb."""
    notas = [midi(n) for n in ("D6", "F#6", "A6", "C#7", "E7", "A7")]
    for k, m in enumerate(notas):
        c = campana(m, 2.4) * 0.5
        poner(seco, t0 + k * 0.045, c, gan * 0.6, -0.7 + 1.4 * k / 5)
        poner(envio, t0 + k * 0.045, c, gan * 1.2)
    efectos.append({"t": round(t0, 4), "tipo": "shimmer"})


def glitch(t0, m, gan=0.08):
    """Glitch musical: la misma nota tartamudeada en fusas, con un clic."""
    for k in range(4):
        largo = int(0.03 * SR)
        tt = np.arange(largo) / SR
        s = np.sign(np.sin(2 * np.pi * hz(m + 12 * (k % 2)) * tt)) * np.exp(-tt * 60) * 0.5
        poner(seco, t0 + k * BEAT / 8, banda(s, 300, 7000), gan, (-0.5, 0.5)[k % 2])
    efectos.append({"t": round(t0, 4), "tipo": "glitch"})


# ── Armonía ──
# Por compás: raíz del bajo, voicing del pad (sin raíz), voicing del piano (mano derecha).
ACORDES = [
    ("D", midi("D2"), [midi(n) for n in ("A3", "E4", "F#4", "C#5")]),  # Dmaj9
    ("A", midi("A1"), [midi(n) for n in ("E4", "A4", "B4", "C#5")]),  # Aadd9
    ("Bm", midi("B1"), [midi(n) for n in ("F#4", "A4", "C#5", "D5")]),  # Bm9
    ("G", midi("G1"), [midi(n) for n in ("B3", "D4", "F#4", "A4")]),  # Gmaj9
]
MOTIVO = [(0.0, "F#5", 0.75), (0.75, "A5", 0.75), (1.5, "E5", 0.5), (2.0, "F#5", 0.5), (2.5, "D6", 1.5)]
motivo_eventos = []


def motivo(compas, instrumento, gan, transp=0, eco=False):
    for p, n, d in MOTIVO:
        m = midi(n) + transp
        t0 = T(compas, p)
        if instrumento == "piano":
            s = piano(m, d * BEAT, 0.9)
        else:
            s = campana(m, 1.8)
        poner(seco, t0, s, gan, 0.15)
        poner(envio, t0, s, gan * 0.9)
        if eco:
            poner(envio, t0 + 0.75 * BEAT, s, gan * 0.35)
        motivo_eventos.append({"t": round(t0, 4), "nota": int(m), "inst": instrumento})


kicks = []
claps = []
hats = []
arpegio = []

for c in range(COMPASES):
    nombre, raiz, voces = ACORDES[c % 4]
    t0 = T(c)
    # Pad: todo el tema salvo el hueco antes del drop.
    gp = 0.05 if c < 4 else 0.04 if c < 16 else 0.06 if c < 18 else 0.045
    poner(lado["pad"], t0, pad(voces, BAR), gp)
    # Piano: acordes en la intro, el breakdown y el logo (abierto, con la raíz abajo).
    if c < 4 or 16 <= c < 18 or c >= 20:
        v = 0.6 if c < 4 else 0.5
        poner(seco, t0, piano(raiz + 24, BAR * 0.95, v), 0.08, -0.2)
        poner(envio, t0, piano(raiz + 24, BAR * 0.95, v), 0.06)
        for k, m in enumerate(voces):
            s = piano(m + (12 if m < midi("D4") else 0), BAR * 0.9, v)
            poner(seco, t0 + k * 0.035, s, 0.07, -0.3 + 0.2 * k)
            poner(envio, t0 + k * 0.035, s, 0.06)
    # Arpegio en semicorcheas desde el compás 4; el filtro se abre en el build (4-7) y en el segundo (18-19).
    if 4 <= c < 16 or c >= 18:
        notas = voces + [voces[1] + 12, voces[2] + 12, voces[3] + 12, voces[2] + 12]
        for k in range(16):
            tt = t0 + k * BEAT / 4
            if c < 8:
                br = 0.15 + 0.85 * ((c - 4) * 16 + k) / 64
            elif 18 <= c < 20:
                br = 0.25 + 0.75 * ((c - 18) * 16 + k) / 32
            else:
                br = 0.9
            m = notas[(k * 3) % len(notas)] + 12
            s = pluck(m, br)
            arpegio.append([round(tt, 4), int(m)])
            g = 0.06 * (0.75 if k % 4 else 1.0)
            poner(seco, tt, s, g, 0.45 if k % 2 else -0.45)
            poner(envio, tt, s, g * 0.8)
    # Bajo redondo en corcheas, en el drop y el logo.
    if 8 <= c < 16 or c >= 20:
        for k in range(8):
            m = raiz + 12 + (12 if k in (3, 7) else 0)
            poner(lado["bajo"], t0 + k * BEAT / 2, bajo(m, BEAT / 2 * 0.92), 0.1)
    # Bombo.
    if 4 <= c < 6:
        golpes = [0, 2]
    elif 6 <= c < 16 or 20 <= c < 24:
        golpes = [0, 1, 2, 3]
    elif c == 18:
        golpes = [0, 1, 2, 3]
    elif c == 19:
        golpes = [0, 1, 1.5, 2, 2.5, 3]
    else:
        golpes = []
    for p in golpes:
        tk = T(c, p)
        poner(seco, tk, banda(bombo(), 38, None), 0.25 if c >= 6 else 0.18)
        kicks.append(round(tk, 4))
        i0 = int(tk * SR)
        largo = int(BEAT * 0.9 * SR)
        d = 1 - 0.55 * np.exp(-np.arange(largo) / SR * 9)
        i1 = min(N, i0 + largo)
        ducking[i0:i1] = np.minimum(ducking[i0:i1], d[: i1 - i0])
    # Palmas/snap en 2 y 4; hi-hats delicados.
    if 8 <= c < 16 or 20 <= c < 24:
        for p in (1, 3):
            poner(seco, T(c, p), palmas(), 0.09, 0.1)
            poner(envio, T(c, p), palmas(), 0.05)
            claps.append(round(T(c, p), 4))
        for k in range(16):
            # semicorcheas delicadas; la corchea a contratiempo más presente (abierta desde el compás 12)
            contra = k % 4 == 2
            ab = contra and c >= 12
            poner(seco, T(c, k / 4), hat(ab), 0.04 if contra else 0.018, 0.3 if k % 2 else -0.25)
            hats.append(round(T(c, k / 4), 4))
    if 6 <= c < 8:
        for k in range(8):
            poner(seco, T(c, k / 2 + 0.25), hat(False), 0.032, -0.25)
            hats.append(round(T(c, k / 2 + 0.25), 4))
    # Redoble suave de palmas en el compás 19 (sube de corcheas a semicorcheas), con hueco antes del drop.
    if c == 19:
        pasos = [p / 2 for p in range(0, 4)] + [2 + p / 4 for p in range(0, 6)]
        for i, p in enumerate(pasos):
            poner(seco, T(c, p), palmas(), 0.03 + 0.05 * i / len(pasos), 0.0)

# Acorde final: Dmaj9 abierto que queda sonando con brillo.
FIN = T(24)
for k, m in enumerate([midi(n) for n in ("D2", "A2", "E3", "F#3", "C#4", "E4", "A4")]):
    s = piano(m + 12, 3.6, 0.75)
    poner(seco, FIN + k * 0.03, s, 0.06, -0.4 + 0.13 * k)
    poner(envio, FIN + k * 0.03, s, 0.08)
poner(lado["pad"], FIN, pad([midi(n) for n in ("A3", "E4", "F#4", "C#5", "E5")], 3.2), 0.07)

# Motivo: intro (piano), drop (campanitas cada dos compases), breakdown (piano) y firma en el logo.
motivo(2, "piano", 0.09)
for c in (8, 10, 12, 14):
    motivo(c, "campana", 0.07, eco=True)
motivo(16, "piano", 0.1)
motivo(20, "campana", 0.07, eco=True)
motivo(20, "piano", 0.06)
motivo(22, "campana", 0.07, eco=True)
motivo(22, "piano", 0.06, transp=0)
# Respuesta lidia (G#) al final del cierre, sobre el último compás.
for p, n in ((0, "A5"), (0.5, "G#5"), (1, "F#5"), (1.5, "E5"), (2, "C#6"), (3, "D6")):
    s = campana(midi(n), 1.8)
    poner(seco, T(23, p), s, 0.05)
    poner(envio, T(23, p), s, 0.06)
    motivo_eventos.append({"t": round(T(23, p), 4), "nota": midi(n), "inst": "campana"})

# ── Efectos en la grilla ──
# Intro: la carga se enciende (blip grave + shimmer leve) y blips cuando entran las palabras.
blip(0.0, midi("D5"), 0.1)
shimmer(0.0, 0.05)
blip(T(2), midi("A5"))
blip(T(3), midi("D6"))
for nombre, c in SECCIONES[1:]:
    if nombre in ("final",):
        continue
    t0 = T(c)
    whoosh(t0, 0.6 if nombre not in ("matematica", "logo") else 0.9)
    if nombre in ("matematica", "logo"):
        impacto(t0, True)
    elif nombre != "javier":
        impacto(t0, False)
    if nombre not in ("logo", "marca"):
        blip(t0 + 0.02, ESCALA[[s for s, _ in SECCIONES].index(nombre) % len(ESCALA)], 0.1)
# Computación: en cada pulso la red procesa una entrada; la señal llega a la salida media corchea después (blip).
for c in (12, 13):
    for p in range(4):
        blip(T(c, p) + BEAT / 2, ESCALA[(p * 2 + c) % len(ESCALA)], 0.05, 0.4)
# Calculado: cada pulso suma un término de Fourier (blip ascendente en la escala).
for k in range(8):
    blip(T(14) + k * BEAT, ESCALA[k % len(ESCALA)], 0.07, -0.3 + 0.08 * k)
blip(T(14, 2), midi("A5"), 0.08)
# Javier: los destellos de la serie cortan en cada pulso del compás 16 (glitch afinado).
for p in range(4):
    glitch(T(16, p), ESCALA[p * 2 % len(ESCALA)])
blip(T(16), midi("F#5"), 0.08)
blip(T(17), midi("A5"), 0.08)
# Builds: risers hacia el drop y hacia el logo.
riser(T(6, 2), T(8), 0.11)
riser(T(18), T(19, 3.5), 0.14)
glitch(T(19, 3.5), midi("D6"), 0.06)
# Logo: shimmer al revelar, blips al entrar «Próximamente» y la web; shimmer y golpe final con el acorde.
shimmer(T(20), 0.14)
blip(T(22), midi("F#6"), 0.08)
blip(T(22, 2), midi("A6"), 0.07)
shimmer(FIN, 0.1)
impacto(FIN, False)

# Hueco antes del drop del logo: medio pulso de silencio (salvo la cola de la reverb).
i0, i1 = int(T(19, 3.5) * SR), int(T(20) * SR)
for b in (seco, lado["pad"]):
    b[i0:i1] *= np.linspace(1, 0, i1 - i0)[:, None] ** 0.5 * 0.15

# ── Mezcla ──
lado["pad"] = banda(lado["pad"], 160, 7000)
lado["bajo"] = banda(lado["bajo"], 35, 900)
seco += (lado["pad"] + lado["bajo"]) * ducking[:, None]
envio += lado["pad"] * ducking[:, None] * 0.7

# Reverb por convolución: ruido estéreo que decae (2,6 s) con predelay, oscureciéndose con el tiempo.
L = int(2.6 * SR)
tt = np.arange(L) / SR
ir = np.zeros((L, 2))
for ch in range(2):
    r = ruido(L) * np.exp(-tt * 2.4)
    claro = banda(r, 300, 9000)
    oscuro = banda(r, 300, 2500)
    mezcla_t = np.exp(-tt * 1.5)
    ir[:, ch] = claro * mezcla_t + oscuro * (1 - mezcla_t)
ir[: int(0.022 * SR)] = 0
ir /= np.sqrt((ir ** 2).sum(0))
envio = banda(envio, 250, None)
nfft = 1 << int(np.ceil(np.log2(N + L)))
humedo = np.zeros((N, 2))
for ch in range(2):
    humedo[:, ch] = np.fft.irfft(np.fft.rfft(envio[:, ch], nfft) * np.fft.rfft(ir[:, ch], nfft), nfft)[:N]
master = seco + humedo * 0.55
master = banda(master, 28, 16000)
# Entrada y salida: el acorde final se apaga suave hasta el último cuadro.
master[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))[:, None]
fin_fade = int(1.4 * SR)
master[-fin_fade:] *= np.linspace(1, 0, fin_fade)[:, None] ** 1.5

# Saturación suave y normalización a −1,5 dBFS de pico (deja margen para el AAC).
master /= np.abs(master).max()
master = np.tanh(master * 1.4) / np.tanh(1.4)
master *= 10 ** (-1.5 / 20) / np.abs(master).max()

ruta = RAIZ / "public" / "musica.wav"
with wave.open(str(ruta), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((master * 32767).astype("<i2").tobytes())

ritmo = {
    "bpm": BPM,
    "pulso": BEAT,
    "compas": BAR,
    "total": TOTAL,
    "secciones": [{"id": s, "compas": c, "t": T(c)} for s, c in SECCIONES],
    "bombos": kicks,
    "palmas": claps,
    "hats": sorted(hats),
    "arpegio": arpegio,
    "motivo": sorted(motivo_eventos, key=lambda e: e["t"]),
    "efectos": sorted(efectos, key=lambda e: e["t"]),
    "drops": [T(8), T(20)],
    "risers": [{"t0": T(6, 2), "t1": T(8)}, {"t0": T(18), "t1": T(19, 3.5)}],
    "hueco": [T(19, 3.5), T(20)],
}
(RAIZ / "src" / "ritmo.json").write_text(json.dumps(ritmo, ensure_ascii=False, indent=1))

# Informe de niveles por sección y bandas (para revisar la mezcla sin oírla).
mono = master.mean(1)
print(f"pico {20 * np.log10(np.abs(master).max()):.2f} dBFS, {len(kicks)} bombos, {len(efectos)} efectos")
bordes = [T(c) for _, c in SECCIONES] + [TOTAL]
for (s, _), a, b in zip(SECCIONES, bordes, bordes[1:]):
    x = mono[int(a * SR) : int(b * SR)]
    X = np.abs(np.fft.rfft(x)) ** 2
    f = np.fft.rfftfreq(len(x), 1 / SR)
    tot = X.sum()
    bandas = [X[(f >= lo) & (f < hi)].sum() / tot * 100 for lo, hi in ((0, 120), (120, 500), (500, 4000), (4000, 20000))]
    rms = 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-9)
    print(f"{s:12s} {a:5.1f}s  rms {rms:6.1f} dBFS  <120 {bandas[0]:4.1f}%  120-500 {bandas[1]:4.1f}%  0,5-4k {bandas[2]:4.1f}%  >4k {bandas[3]:4.1f}%")
