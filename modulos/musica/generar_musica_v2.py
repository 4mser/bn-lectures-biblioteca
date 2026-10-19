"""Música y diseño de sonido del teaser de B&N Lectures. Todo sintetizado aquí con numpy, sin samples de terceros.

Electrónica oscura y cinematográfica a 120 BPM en Re frigio: kick seco, sub-bajo con sidechain, percusión metálica
(rimshots, ticks, hats cerrados), pads graves en quintas y cuartas abiertas con la novena menor (Eb) de paso, y un
motivo de 4 notas tipo «braam» (sintetizador analógico con filtro: D2 D2 F2 Eb2). Silencios antes de los golpes,
impactos con sub, transiente y cola, risers de ruido con pitch y glitches. Cierra con un golpe grave y su cola.

Grilla fija: compás = 2 s, pulso = 0,5 s. Además de public/musica.wav escribe src/ritmo.json con la grilla, las
secciones, cada golpe, cada nota del motivo y cada efecto, para que la imagen caiga en el golpe.

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
COMPASES = 24
TOTAL = COMPASES * BAR + 4.0  # 52 s: el golpe final y su cola
RAIZ = Path(__file__).resolve().parent.parent
rng = np.random.default_rng(23)
N = int(SR * TOTAL)

SECCIONES = [
    ("intro", 0), ("fisica", 4), ("geometria", 6), ("matematica", 8), ("caos", 10), ("computacion", 12),
    ("calculado", 14), ("javier", 16), ("marca", 18), ("logo", 20), ("final", 24),
]


def T(compas, pulso=0.0):
    return compas * BAR + pulso * BEAT


def midi(nombre):
    notas = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
    return 12 * (int(nombre[-1]) + 1) + notas[nombre[:-1]]


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


seco = np.zeros((N, 2))
envio = np.zeros((N, 2))
ducking = np.ones(N)
lado = {k: np.zeros((N, 2)) for k in ("pad", "sub", "arp")}


def poner(dest, t0, s, gan=1.0, pan=0.0):
    i0 = int(round(t0 * SR))
    if i0 >= N or i0 + len(s) <= 0:
        return
    if i0 < 0:
        s, i0 = s[-i0:], 0
    i1 = min(N, i0 + len(s))
    s = s[: i1 - i0] * gan
    dest[i0:i1, 0] += s * np.sqrt(1 - pan)
    dest[i0:i1, 1] += s * np.sqrt(1 + pan)


def ruido(largo):
    return rng.standard_normal(largo)


def banda(x, lo, hi, orden=4):
    X = np.fft.rfft(x, axis=0)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    H = np.ones_like(f)
    if lo:
        H *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1)) ** orden)
    if hi:
        H *= 1 / np.sqrt(1 + (f / hi) ** orden)
    if X.ndim == 2:
        H = H[:, None]
    return np.fft.irfft(X * H, n=len(x), axis=0)


# ── Instrumentos ──
def sierra(f, t, corte, detune=(0.994, 1.0, 1.006)):
    """Diente de sierra aditivo con filtro paso bajo dinámico: cada armónico n pesa 1/n y se apaga sobre corte(t)."""
    s = np.zeros(len(t))
    nmax = int(min(90, 9000 / f))
    for d in detune:
        fd = f * d
        fase = rng.random() * 6.28
        for n in range(1, nmax + 1):
            g = 1 / (1 + (n * fd / corte) ** 4)  # filtro de 24 dB/oct aproximado, por armónico
            if np.max(g) < 0.004:
                break
            s += g * np.sin(2 * np.pi * fd * n * t + fase * n) / n
    return s / len(detune)


def braam(m, dur, gan_brillo=1.0):
    """Metal grave tipo «braam»: tres sierras desafinadas más la octava de abajo; el filtro abre al golpe y se cierra."""
    largo = int((dur + 1.2) * SR)
    t = np.arange(largo) / SR
    f = hz(m)
    corte = f * (2.2 + 26 * gan_brillo * np.exp(-t * 2.6)) + 120
    s = sierra(f, t, corte) + 0.3 * sierra(f / 2, t, corte * 0.7, (0.997, 1.003))
    e = np.minimum(1, t / 0.012) * np.where(t < dur, 1.0, np.exp(-(t - dur) * 3.5)) * (0.75 + 0.25 * np.exp(-t * 1.5))
    return banda(np.tanh(s * e * 1.6), 45, None)


def pad(ms, dur):
    """Pad grave y tenso: sierras filtradas oscuras, ataque lento."""
    largo = int((dur + 0.8) * SR)
    t = np.arange(largo) / SR
    s = np.zeros(largo)
    for m in ms:
        s += sierra(hz(m), t, 700 + 250 * np.sin(2 * np.pi * t / dur) ** 2, (0.996, 1.004))
    e = np.minimum(1, t / 0.5) * np.where(t > dur, np.exp(-(t - dur) * 4), 1)
    return s * e / len(ms)


def sub(m, dur):
    largo = int(dur * SR)
    t = np.arange(largo) / SR
    f = hz(m)
    s = np.sin(2 * np.pi * f * t) + 0.12 * np.sin(4 * np.pi * f * t)
    return s * np.minimum(1, t / 0.006) * np.clip((dur - t) / 0.02, 0, 1)


def arp(m, corte=1.0):
    """Pluck analógico oscuro: sierra corta con filtro que se cierra rápido."""
    largo = int(0.22 * SR)
    t = np.arange(largo) / SR
    f = hz(m)
    s = sierra(f, t, f * (1.5 + 7 * corte * np.exp(-t * 28)), (1.0,))
    return s * np.exp(-t * 14) * np.minimum(1, t / 0.002)


def bombo():
    """Kick seco y con pegada: barrido rápido, cuerpo corto y un clic."""
    largo = int(0.26 * SR)
    t = np.arange(largo) / SR
    fr = 48 + 150 * np.exp(-t * 45)
    s = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 13)
    clic = banda(ruido(int(0.005 * SR)), 2000, 9000) * np.linspace(1, 0, int(0.005 * SR))
    s[: len(clic)] += clic * 0.5
    return np.tanh(s * 1.4)


def rim():
    largo = int(0.09 * SR)
    t = np.arange(largo) / SR
    tono = np.sin(2 * np.pi * 1720 * t) * np.exp(-t * 85) + 0.5 * np.sin(2 * np.pi * 820 * t) * np.exp(-t * 60)
    golpe = banda(ruido(largo), 1500, 9000) * np.exp(-t * 130)
    return tono * 0.7 + golpe * 0.6


def tick():
    """Tick metálico FM, cortísimo."""
    largo = int(0.03 * SR)
    t = np.arange(largo) / SR
    return np.sin(2 * np.pi * 6200 * t + 2.5 * np.sin(2 * np.pi * 8900 * t)) * np.exp(-t * 260)


def hat():
    largo = int(0.04 * SR)
    t = np.arange(largo) / SR
    return banda(ruido(largo), 8000, None) * np.exp(-t * 140)


# ── Efectos ──
FRIGIO = [midi(n) for n in ("D5", "Eb5", "F5", "G5", "A5", "Bb5", "C6", "D6")]
efectos = []


def blip(t0, m, gan=0.1, pan=0.0):
    """Blip de interfaz: FM metálico corto, afinado en la escala."""
    largo = int(0.09 * SR)
    t = np.arange(largo) / SR
    f = hz(m)
    s = np.sin(2 * np.pi * f * t + 1.4 * np.sin(2 * np.pi * f * 3.5 * t) * np.exp(-t * 40)) * np.exp(-t * 45)
    poner(seco, t0, s, gan, pan)
    poner(envio, t0, s, gan * 0.3, pan)
    efectos.append({"t": round(t0, 4), "tipo": "blip", "nota": int(m)})


def whoosh(t_pico, largo_s=0.5, gan=0.13):
    largo = int(largo_s * SR)
    t = np.arange(largo) / SR
    u = t / largo_s
    r = ruido(largo)
    s = np.zeros(largo)
    blk = 2048
    for i in range(0, largo, blk):
        c = 400 * 2 ** (u[i] * 4.5)
        s[i : i + blk] = banda(r[i : i + blk], c * 0.6, c * 1.6)[: len(s[i : i + blk])]
    s *= u ** 2.5
    i0 = t_pico - largo_s
    poner(seco, i0, s * (1 - u), gan, -0.6)
    poner(seco, i0, s * u, gan, 0.6)
    efectos.append({"t": round(t_pico, 4), "tipo": "whoosh"})


def impacto(t0, fuerte=False):
    """Impacto con cuerpo: sub que cae, transiente seco y cola a la reverb."""
    largo = int((2.2 if fuerte else 1.0) * SR)
    t = np.arange(largo) / SR
    f = hz(midi("D1")) * (1 + 2.2 * np.exp(-t * 9))
    sub_ = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (1.6 if fuerte else 4))
    trans = banda(ruido(largo), 800, 10000) * np.exp(-t * 45)
    cuerpo = banda(ruido(largo), 60, 400) * np.exp(-t * 9)
    s = sub_ * (0.7 if fuerte else 0.4) + trans * (0.6 if fuerte else 0.4) + cuerpo * 0.4
    poner(seco, t0, np.tanh(s * 1.3), 0.5 if fuerte else 0.32)
    poner(envio, t0, trans * 0.6 + cuerpo * 0.4, 0.45 if fuerte else 0.25)
    efectos.append({"t": round(t0, 4), "tipo": "impacto_fuerte" if fuerte else "impacto"})


def riser(t0, t1, gan=0.14):
    largo = int((t1 - t0) * SR)
    t = np.arange(largo) / SR
    u = t / (t1 - t0)
    r = ruido(largo)
    s = np.zeros(largo)
    blk = 4096
    for i in range(0, largo, blk):
        c = 300 * 2 ** (u[i] * 5)
        s[i : i + blk] = banda(r[i : i + blk], c * 0.7, c * 1.4)[: len(s[i : i + blk])]
    f = hz(midi("D3")) * 4 ** u  # sube dos octavas
    tono = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.25 + np.sin(2 * np.pi * np.cumsum(f * 1.498) / SR) * 0.3
    tono = banda(tono, 100, 5000)
    forma = u ** 2.4
    poner(seco, t0, (s + tono * 0.35) * forma, gan)
    poner(envio, t0, (s + tono * 0.35) * forma, gan * 0.5)
    efectos.append({"t": round(t0, 4), "tipo": "riser", "fin": round(t1, 4)})


def glitch(t0, gan=0.09, n=6):
    """Stutter digital: un fragmento repetido en fusas, con bit-crush."""
    base = np.sign(ruido(int(0.02 * SR))) * np.exp(-np.arange(int(0.02 * SR)) / SR * 80)
    base = banda(base, 600, 9000)
    for k in range(n):
        poner(seco, t0 + k * BEAT / 8, base * (1 - k / (n + 1)), gan, (-0.5, 0.5)[k % 2])
    efectos.append({"t": round(t0, 4), "tipo": "glitch"})


def stutter(t0, fuente, n=4):
    """Repite el primer 1/32 de un sonido en fusas (fill rítmico preciso)."""
    corte = fuente[: int(BEAT / 8 * SR)]
    for k in range(n):
        poner(seco, t0 + k * BEAT / 8, corte, 0.3 * (0.7 + 0.3 * (k % 2)))
    efectos.append({"t": round(t0, 4), "tipo": "glitch"})


# ── Armonía: Re frigio. Por compás: raíz del sub y voicing del pad (quintas y cuartas abiertas). ──
ACORDES = [
    (midi("D2"), [midi(n) for n in ("D3", "A3", "D4", "G4")]),  # D5 con cuarta
    (midi("Eb2"), [midi(n) for n in ("Eb3", "Bb3", "Eb4", "F4")]),  # bII
    (midi("C2"), [midi(n) for n in ("C3", "G3", "C4", "D4")]),  # bVII
    (midi("D2"), [midi(n) for n in ("D3", "A3", "Eb4", "A4")]),  # D con novena menor de paso
]
MOTIVO = [(0.0, "D2", 1.0), (1.5, "D2", 0.45), (2.0, "F2", 0.9), (3.0, "Eb2", 0.9)]
motivo_eventos = []


def motivo(compas, gan, brillo=1.0, transp=0):
    for p, n, d in MOTIVO:
        m = midi(n) + transp
        t0 = T(compas, p)
        s = braam(m, d * BEAT, brillo)
        poner(seco, t0, s, gan)
        poner(envio, t0, s, gan * 0.35)
        motivo_eventos.append({"t": round(t0, 4), "nota": int(m), "inst": "braam"})


kicks, claps, hats, arpegio = [], [], [], []
HUECOS = [(T(3, 3.5), T(4)), (T(7, 3.5), T(8)), (T(19, 3.5), T(20)), (T(23, 3.5), T(24))]

for c in range(COMPASES):
    raiz, voces = ACORDES[c % 4]
    t0 = T(c)
    gp = 0.14 if c < 4 else 0.11 if c < 16 else 0.15 if c < 18 else 0.11
    poner(lado["pad"], t0, pad(voces, BAR), gp)
    # Sub en corcheas (desde el compás 4, salvo el breakdown), con sidechain.
    if 4 <= c < 16 or c >= 18:
        for k in range(8):
            poner(lado["sub"], t0 + k * BEAT / 2, sub(raiz, BEAT / 2 * 0.95), 0.1 if c >= 8 else 0.075)
    # Arpegio oscuro en semicorcheas.
    if 4 <= c < 16 or c >= 18:
        notas = [voces[0] + 12, voces[1] + 12, voces[2], voces[1] + 12, voces[3], voces[2], voces[1] + 12, voces[0] + 24]
        for k in range(16):
            tt = t0 + k * BEAT / 4
            if c < 8:
                ct = 0.25 + 0.75 * ((c - 4) * 16 + k) / 64
            elif 18 <= c < 20:
                ct = 0.3 + 0.7 * ((c - 18) * 16 + k) / 32
            else:
                ct = 0.85
            m = notas[k % len(notas)]
            poner(lado["arp"], tt, arp(m, ct), 0.12 * (1.0 if k % 4 == 0 else 0.7), 0.4 if k % 2 else -0.4)
            arpegio.append([round(tt, 4), int(m)])
    # Kick.
    if 4 <= c < 6:
        golpes = [0, 2]
    elif 6 <= c < 16 or 20 <= c < 24:
        golpes = [0, 1, 2, 3]
    elif c == 18:
        golpes = [0, 1, 2, 3]
    elif c == 19:
        golpes = [0, 1, 2, 2.5, 3, 3.25]
    else:
        golpes = []
    for p in golpes:
        tk = T(c, p)
        poner(seco, tk, bombo(), 0.3 if c >= 6 else 0.24)
        kicks.append(round(tk, 4))
        i0 = int(tk * SR)
        largo = int(BEAT * 0.95 * SR)
        d = 1 - 0.8 * np.exp(-np.arange(largo) / SR * 11)
        i1 = min(N, i0 + largo)
        ducking[i0:i1] = np.minimum(ducking[i0:i1], d[: i1 - i0])
    # Rimshot en 2 y 4, ticks metálicos y hats cerrados.
    if 8 <= c < 16 or 20 <= c < 24:
        for p in (1, 3):
            poner(seco, T(c, p), rim(), 0.32, 0.15)
            poner(envio, T(c, p), rim(), 0.08)
            claps.append(round(T(c, p), 4))
        for k in range(16):
            acento = k % 4 == 2
            poner(seco, T(c, k / 4), hat(), 0.13 if acento else 0.065, 0.3 if k % 2 else -0.3)
            hats.append(round(T(c, k / 4), 4))
            if k in (3, 7, 11, 14):
                poner(seco, T(c, k / 4), tick(), 0.1, 0.5)
    if 6 <= c < 8 or c == 18 or c == 19:
        for k in range(8):
            poner(seco, T(c, k / 2 + 0.25), hat(), 0.1, -0.3)
            hats.append(round(T(c, k / 2 + 0.25), 4))
    # Ticks sueltos en la intro y el breakdown: la máquina contando.
    if c < 4 or 16 <= c < 18:
        for k in range(4):
            poner(seco, T(c, k), tick(), 0.08 if c >= 1 else 0.0, 0.4)
    if c == 19:
        for i, p in enumerate([2 + q / 4 for q in range(6)]):
            poner(seco, T(c, p), rim(), 0.06 + 0.12 * i / 6)

# Motivo «braam»: intro (filtrado), cada dos compases en el drop, breakdown y firma del logo.
motivo(2, 0.16, 0.45)
for c in (8, 10, 12, 14):
    motivo(c, 0.2, 1.0)
motivo(16, 0.2, 0.7)
motivo(20, 0.24, 1.2)
motivo(22, 0.24, 1.2)

# ── Efectos en la grilla ──
blip(0.0, midi("D4"), 0.12)
impacto(0.0, False)
blip(T(2), midi("A5"))
blip(T(3), midi("D6"))
for nombre, c in SECCIONES[1:]:
    if nombre == "final":
        continue
    t0 = T(c)
    whoosh(t0, 0.5)
    if nombre in ("matematica", "logo"):
        impacto(t0, True)
    elif nombre != "javier":
        impacto(t0, False)
    if nombre not in ("logo", "marca"):
        blip(t0 + 0.01, FRIGIO[[s for s, _ in SECCIONES].index(nombre) % len(FRIGIO)], 0.09)
# Computación: la señal llega a la salida en la corchea.
for c in (12, 13):
    for p in range(4):
        blip(T(c, p) + BEAT / 2, FRIGIO[(p * 2 + c) % len(FRIGIO)], 0.06, 0.4)
# Calculado: un término por pulso.
for k in range(8):
    blip(T(14) + k * BEAT, FRIGIO[k % len(FRIGIO)], 0.07, -0.3 + 0.08 * k)
# Cortes de los clips en cada pulso del compás 16.
for p in range(4):
    glitch(T(16, p), 0.08, 3)
blip(T(16), midi("F5"), 0.08)
blip(T(16, 2), midi("A5"), 0.07)
# Stutters precisos al final de los compases 11 y 13.
stutter(T(11, 3.5), bombo(), 4)
stutter(T(13, 3.5), rim(), 4)
# Risers hasta el silencio previo a cada drop.
riser(T(6, 2), T(7, 3.5), 0.12)
riser(T(18), T(19, 3.5), 0.15)
glitch(T(19, 3.5) - BEAT / 4, 0.07, 2)
# Logo: el golpe grave; «Próximamente» y la web con blips; golpe final con cola.
blip(T(22), midi("D6"), 0.08)
blip(T(22, 2), midi("A5"), 0.07)
FIN = T(24)
impacto(FIN, True)
s = braam(midi("D1"), 2.2, 0.9)
s[: int(2.8 * SR)] += 0.6 * braam(midi("D2"), 1.6, 0.6)
poner(seco, FIN, s, 0.22)
poner(envio, FIN, s, 0.18)
motivo_eventos.append({"t": round(FIN, 4), "nota": midi("D1"), "inst": "braam"})

# Silencios dramáticos: medio pulso antes de los golpes grandes, todo se corta (queda la cola de la reverb).
for b in (seco, lado["pad"], lado["sub"], lado["arp"]):
    for a, z in HUECOS:
        i0, i1 = int(a * SR), int(z * SR)
        b[i0:i1] *= 0.04

# ── Mezcla ──
lado["pad"] = banda(lado["pad"], 170, 3200)
lado["sub"] = banda(lado["sub"], 35, 160)
lado["arp"] = banda(lado["arp"], 180, 6000)
seco += (lado["pad"] + lado["sub"] * 1.0 + lado["arp"] * 0.8) * ducking[:, None] ** np.array([1.0, 1.0])
envio += (lado["pad"] * 0.5 + lado["arp"] * 0.4) * ducking[:, None]

# Reverb por convolución: sala oscura de 3 s.
L = int(3.0 * SR)
tt = np.arange(L) / SR
ir = np.zeros((L, 2))
for ch in range(2):
    r = ruido(L) * np.exp(-tt * 2.1)
    ir[:, ch] = banda(r, 200, 5000)
ir[: int(0.03 * SR)] = 0
ir /= np.sqrt((ir ** 2).sum(0))
envio = banda(envio, 200, None)
nfft = 1 << int(np.ceil(np.log2(N + L)))
humedo = np.zeros((N, 2))
for ch in range(2):
    humedo[:, ch] = np.fft.irfft(np.fft.rfft(envio[:, ch], nfft) * np.fft.rfft(ir[:, ch], nfft), nfft)[:N]
master = seco + humedo * 0.5
master = banda(master, 36, 17000, orden=8)
master[: int(0.005 * SR)] *= np.linspace(0, 1, int(0.005 * SR))[:, None]
cola = int(1.2 * SR)
master[-cola:] *= np.linspace(1, 0, cola)[:, None] ** 2

master /= np.abs(master).max()
master = np.tanh(master * 1.6) / np.tanh(1.6)
master *= 10 ** (-2.3 / 20) / np.abs(master).max()  # margen para el AAC: pico real final ≤ −1 dBFS

with wave.open(str(RAIZ / "public" / "musica.wav"), "wb") as w:
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
    "risers": [{"t0": T(6, 2), "t1": T(7, 3.5)}, {"t0": T(18), "t1": T(19, 3.5)}],
    "huecos": [[a, z] for a, z in HUECOS],
}
(RAIZ / "src" / "ritmo.json").write_text(json.dumps(ritmo, ensure_ascii=False, indent=1))

mono = master.mean(1)
print(f"pico {20 * np.log10(np.abs(master).max()):.2f} dBFS, {len(kicks)} bombos, {len(efectos)} efectos")
bordes = [T(c) for _, c in SECCIONES] + [TOTAL]
for (s_, _), a, b in zip(SECCIONES, bordes, bordes[1:]):
    x = mono[int(a * SR) : int(b * SR)]
    X = np.abs(np.fft.rfft(x)) ** 2
    f = np.fft.rfftfreq(len(x), 1 / SR)
    tot = X.sum()
    bandas = [X[(f >= lo) & (f < hi)].sum() / tot * 100 for lo, hi in ((0, 120), (120, 500), (500, 4000), (4000, 20000))]
    rms = 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-9)
    print(f"{s_:12s} {a:5.1f}s  rms {rms:6.1f} dBFS  <120 {bandas[0]:4.1f}%  120-500 {bandas[1]:4.1f}%  0,5-4k {bandas[2]:4.1f}%  >4k {bandas[3]:4.1f}%")
