"""Música del teaser «Lo invisible» de B&N Lectures. Todo sintetizado aquí con numpy, sin samples de terceros.

Referencia: Hans Zimmer («Time», «Interstellar») y trailers de ciencia. 96 BPM (compás de 2,5 s), ostinato de piano en
corcheas que crece toda la pieza. La armonía parte en La menor (Am–F–C–G con novenas y suspensiones), se abre a Do
mayor en el clímax y resuelve en un Do mayor amplio sobre el logo, tras una cadencia Dm–G.

Capas que entran de a una: dron (frase inicial) → ostinato solo (campo) → pad grave (gravedad) → cuerdas medias
(onda) → pulso de bajo (montaje) → cuerdas altas → percusión grande (solo en el clímax) → órgano (clímax y logo).
Swells y reverses anuncian cada revelación; golpes suaves al aparecer. Un compás de swell enorme, una corchea de
silencio total antes de «Hasta que las ves moverse.», y el Do mayor final con golpe grave y cola larga.

Primero se compone el mapa de eventos y se exporta a src/ritmo.json (acordes, cada nota del ostinato, entradas de
capas, golpes, swells, silencios y el plan de escenas que sigue a la música); la imagen se anima contra ese mapa.

Uso: PYTHONPATH=pylib python3 audio/generar_musica.py
"""
import json
import wave
from pathlib import Path

import numpy as np

SR = 44100
BPM = 96
BEAT = 60 / BPM  # 0,625 s
BAR = 4 * BEAT  # 2,5 s
OCT = BEAT / 2  # corchea
TOTAL = 24 * BAR  # 60 s
RAIZ = Path(__file__).resolve().parent.parent
rng = np.random.default_rng(31)
N = int(SR * TOTAL)


def T(c, p=0.0):
    return c * BAR + p * BEAT


def midi(n):
    notas = {"C": 0, "C#": 1, "D": 2, "Eb": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "Ab": 8, "A": 9, "Bb": 10, "B": 11}
    return 12 * (int(n[-1]) + 1) + notas[n[:-1]]


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


# ═══ 1 · MAPA DE EVENTOS ═══
# Acorde por compás: (nombre, raíz del ostinato, tercera en semitonos, raíz grave)
ACORDES = {
    2: "Am", 3: "F", 4: "C", 5: "G", 6: "Am", 7: "F", 8: "C", 9: "G", 10: "Am", 11: "F", 12: "C", 13: "G", 14: "Am",
    15: "C", 16: "F", 17: "Am", 18: "F", 19: "Dm", 20: "G", 21: "C", 22: "C", 23: "C",
}
INFO = {  # raíz del ostinato (registro medio), tercera, raíz del bajo
    "Am": ("A3", 3, "A1"), "F": ("F3", 4, "F1"), "C": ("C4", 4, "C2"), "G": ("G3", 4, "G1"), "Dm": ("D4", 3, "D2"),
}
# Plan de escenas que obedece a la música: tres revelaciones de dos compases, luego el montaje acelera
# (un compás → medio compás → un pulso), converge en el golpe del clímax y siguen la frase, créditos y logo.
ESCENAS = [("frase1", T(0), T(2)), ("campo", T(2), T(4)), ("gravedad", T(4), T(6)), ("onda", T(6), T(8))]
for i, nombre in enumerate(["galton", "prisma", "rendija"]):
    ESCENAS.append((nombre, T(8 + i), T(9 + i)))
for i, nombre in enumerate(["lorenz", "adn", "orbital", "mobius"]):
    ESCENAS.append((nombre, T(11) + i * BAR / 2, T(11) + (i + 1) * BAR / 2))
for i, nombre in enumerate(["ulam", "aurea", "gradiente", "dijkstra", "cono", "tres", "fractal"]):
    t0 = T(13) + i * BEAT
    ESCENAS.append((nombre, t0, t0 + (2 * BEAT if nombre == "fractal" else BEAT)))
ESCENAS += [("clima", T(15), T(17)), ("frase2", T(17), T(19)), ("creditos", T(19), T(21)), ("logo", T(21), TOTAL)]
SILENCIO = (T(17) - OCT, T(17))  # una corchea de vacío antes de la frase final

CAPAS = [("dron", T(0) + 0.2), ("ostinato", T(2)), ("pad_grave", T(4)), ("cuerdas", T(6)), ("bajo", T(8)),
         ("cuerdas_altas", T(11)), ("percusion", T(13)), ("organo", T(15))]

ostinato = []  # (t, midi, velocidad)
for c in range(2, 22):
    if c == 16:
        pass
    nombre = ACORDES[c]
    raiz, ter, _ = INFO[nombre]
    r = midi(raiz)
    patron = [r, r + 7, r + 12, r + 14, r + 12 + ter, r + 14, r + 12, r + 7]
    for k in range(8):
        t = T(c) + k * OCT
        if SILENCIO[0] - 1e-6 <= t < SILENCIO[1]:
            continue
        if c == 21 and k >= 8:
            continue
        if c < 15:
            vel = 0.42 + 0.58 * (c - 2) / 12
        elif c < 17:
            vel = 1.0
        elif c < 19:
            vel = 0.4  # frase final: vuelve íntimo
        elif c < 21:
            vel = 0.5 + 0.4 * (c - 19 + k / 8) / 2
        else:
            vel = 0.75
        ostinato.append((round(t, 4), int(patron[k]), round(vel, 3)))

golpes = []  # (t, tipo)
swells = []  # (t0, t1, tipo)
golpes.append((T(1), "fijar"))  # la frase inicial se fija
swells.append((T(0) + 0.3, T(1), "reverse"))
for nombre, t0, _ in ESCENAS[1:4]:
    golpes.append((t0, "revelacion"))
    swells.append((t0 - BAR / 2, t0, "reverse"))
for nombre, t0, _ in ESCENAS:
    if nombre in ("galton", "prisma", "rendija", "lorenz", "adn", "orbital", "mobius"):
        golpes.append((t0, "suave"))
    if nombre in ("ulam", "aurea", "gradiente", "dijkstra", "cono", "tres", "fractal"):
        golpes.append((t0, "tom"))
golpes.append((T(14, 2.5), "tom"))
golpes.append((T(14, 3), "tom"))
golpes.append((T(14, 3.5), "tom"))
golpes.append((T(15), "taiko"))  # convergencia
for p in (1, 2, 2.5, 3):
    golpes.append((T(15, p), "tom"))
golpes.append((T(16), "taiko"))
for p in (1, 1.5, 2, 2.5, 3, 3.25, 3.5):
    golpes.append((T(16, p), "tom"))
swells.append((T(16), SILENCIO[0], "swell"))
golpes.append((T(19), "suave"))
golpes.append((T(20), "suave"))
swells.append((T(20), T(21), "redoble"))
golpes.append((T(21), "final"))
golpes.append((T(22), "nota"))  # «Próximamente»
golpes.append((T(22, 2), "nota"))  # la web
swells.append((T(21) + 0.05, T(23), "brillo"))
golpes.sort()

ritmo = {
    "bpm": BPM, "pulso": BEAT, "compas": BAR, "corchea": OCT, "total": TOTAL,
    "acordes": [{"t": round(T(c), 4), "compas": c, "acorde": a} for c, a in sorted(ACORDES.items())],
    "ostinato": [{"t": t, "nota": m, "vel": v} for t, m, v in ostinato],
    "capas": [{"id": n, "t": round(t, 4)} for n, t in CAPAS],
    "golpes": [{"t": round(t, 4), "tipo": g} for t, g in golpes],
    "swells": [{"t0": round(a, 4), "t1": round(b, 4), "tipo": s} for a, b, s in swells],
    "silencios": [[round(SILENCIO[0], 4), round(SILENCIO[1], 4)]],
    "escenas": [{"id": n, "t0": round(a, 4), "t1": round(b, 4)} for n, a, b in ESCENAS],
}
(RAIZ / "src" / "ritmo.json").write_text(json.dumps(ritmo, ensure_ascii=False, indent=1))

# ═══ 2 · SÍNTESIS ═══
seco = np.zeros((N, 2))
envio = np.zeros((N, 2))


def poner(dest, t0, s, gan=1.0, pan=0.0):
    i0 = int(round(t0 * SR))
    if i0 >= N or i0 + len(s) <= 0:
        return
    if i0 < 0:
        s, i0 = s[-i0:], 0
    i1 = min(N, i0 + len(s))
    s = s[: i1 - i0] * gan
    if s.ndim == 2:
        dest[i0:i1] += s
        return
    dest[i0:i1, 0] += s * np.sqrt(1 - pan)
    dest[i0:i1, 1] += s * np.sqrt(1 + pan)


def ruido(n):
    return rng.standard_normal(n)


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


def piano(m, dur, vel=1.0):
    """Piano suave aditivo: parciales algo inarmónicos que caen antes cuanto más agudos, y el golpe del martillo."""
    largo = int((dur + 2.2) * SR)
    t = np.arange(largo) / SR
    f = hz(m)
    s = np.zeros(largo)
    for n in range(1, 15):
        fn = f * n * np.sqrt(1 + 0.00035 * n * n)
        if fn > 13000:
            break
        a = vel ** (0.5 + 0.18 * n) / n ** 1.1
        s += a * np.sin(2 * np.pi * fn * t + n * 0.7) * np.exp(-t * (0.7 + 0.45 * n) * (1 + f / 1600))
    s *= np.minimum(1, t / 0.003)
    k = int(dur * SR)
    if k < largo:
        s[k:] *= np.exp(-(t[k:] - dur) * 3.5)
    g = int(0.01 * SR)
    s[:g] += banda(ruido(g), 800, 6000) * np.exp(-np.arange(g) / SR * 500) * 0.03 * vel
    return s


def sierra(f, t, corte, detune, vib=0.0):
    """Sierra aditiva con filtro paso bajo por armónico, varias voces desafinadas y vibrato lento."""
    s = np.zeros(len(t))
    nmax = int(min(70, 11000 / f))
    for j, d in enumerate(detune):
        fase0 = rng.random() * 6.28
        fm = 2 * np.pi * f * d * t + vib * np.sin(2 * np.pi * (4.6 + 0.37 * j) * t + j) / (4.6 + 0.37 * j)
        for n in range(1, nmax + 1):
            g = 1 / (1 + (n * f / corte) ** 4)
            if np.max(g) < 0.003:
                break
            s += g * np.sin(n * fm + fase0 * n) / n
    return s / len(detune)


def cuerdas(ms, dur, corte=2200, ataque=1.2, vib=0.9):
    """Sección de cuerdas sintética: cinco voces por nota, ataque lento, vibrato; estéreo abierto."""
    largo = int((dur + 1.5) * SR)
    t = np.arange(largo) / SR
    out = np.zeros((largo, 2))
    for i, m in enumerate(ms):
        f = hz(m)
        c = corte * (0.6 + 0.4 * np.minimum(1, t / (ataque * 1.5)))
        L = sierra(f, t, c, (0.993, 0.998, 1.004), vib)
        R = sierra(f, t, c, (0.995, 1.002, 1.007), vib)
        out[:, 0] += L
        out[:, 1] += R
    e = np.minimum(1, t / ataque) ** 1.5 * np.where(t > dur, np.exp(-(t - dur) * 2.2), 1)
    return out * e[:, None] / len(ms)


def organo(ms, dur, ataque=0.6):
    """Órgano de tubos aditivo (registros 16', 8', 4', 2 2/3', 2'), con un leve coro."""
    largo = int((dur + 2.0) * SR)
    t = np.arange(largo) / SR
    out = np.zeros((largo, 2))
    regs = [(0.5, 0.5), (1, 1.0), (2, 0.6), (3, 0.3), (4, 0.35), (6, 0.12), (8, 0.1)]
    for m in ms:
        f = hz(m)
        for r, a in regs:
            if f * r > 9000:
                continue
            out[:, 0] += a * np.sin(2 * np.pi * f * r * 0.9993 * t)
            out[:, 1] += a * np.sin(2 * np.pi * f * r * 1.0007 * t + 0.3)
    e = np.minimum(1, t / ataque) * np.where(t > dur, np.exp(-(t - dur) * 1.6), 1)
    return out * e[:, None] / len(ms)


def sub(m, dur):
    largo = int(dur * SR)
    t = np.arange(largo) / SR
    f = hz(m)
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t) + 0.08 * np.sin(6 * np.pi * f * t)
    return s * np.minimum(1, t / 0.01) * np.exp(-t * 3.2)


def tambor(grave=True, gan=1.0):
    """Tom o taiko cinematográfico: cuerpo con barrido de tono, piel de ruido y algo de sala."""
    largo = int((1.4 if grave else 0.7) * SR)
    t = np.arange(largo) / SR
    f0, f1 = (95, 42) if grave else (180, 85)
    fr = f1 + (f0 - f1) * np.exp(-t * 18)
    cuerpo = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * (3.2 if grave else 7))
    piel = banda(ruido(largo), 150, 3000) * np.exp(-t * 28)
    return np.tanh((cuerpo + 0.35 * piel) * 1.4 * gan)


def golpe_suave():
    """Golpe suave de revelación: un bombo de fieltro grave con un poco de aire."""
    largo = int(1.2 * SR)
    t = np.arange(largo) / SR
    fr = 40 + 60 * np.exp(-t * 14)
    s = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 4.5)
    aire = banda(ruido(largo), 300, 3000) * np.exp(-t * 9)
    return s * 0.9 + aire * 0.15


def reverse(t0, t1, gan=0.3, brillo=6000):
    """Reverse: ruido y un acorde que crecen hacia t1 y se cortan en seco (como una cola de reverb al revés)."""
    largo = int((t1 - t0) * SR)
    t = np.arange(largo) / SR
    u = t / (t1 - t0)
    r = banda(ruido(largo), 400, brillo) * u ** 3
    poner(seco, t0, r, gan * 0.5)
    poner(envio, t0, r, gan * 0.4)


# ── Dron de la frase inicial ──
largo = int(T(2) * SR)
tt = np.arange(largo) / SR
dron = cuerdas([midi("A1"), midi("E2")], T(2) - 0.2, corte=420, ataque=2.2, vib=0.3)
poner(seco, 0.2, banda(dron, 60, None), 0.11)
poner(envio, 0.2, dron, 0.18)
aire = banda(ruido(largo), 1500, 7000) * np.minimum(1, tt / 2.0) * 0.5
poner(envio, 0.0, aire, 0.025)

# ── Ostinato ──
for t, m, v in ostinato:
    s = piano(m, OCT * 0.95, v)
    poner(seco, t, s, 0.13 * (0.6 + 0.4 * v), -0.15 if (m % 2) else 0.15)
    poner(envio, t, s, 0.12 * (0.6 + 0.4 * v))
    # doblaje de sinte pulsante desde el compás 8 y octava arriba desde el 12
    c = int(t // BAR)
    if 8 <= c < 17 or 19 <= c < 21:
        lp = int(OCT * 1.4 * SR)
        tp = np.arange(lp) / SR
        sp = sierra(hz(m), tp, hz(m) * (2 + 6 * v * np.exp(-tp * 9)), (0.996, 1.004)) * np.exp(-tp * 6)
        poner(seco, t, sp, 0.05 * v, 0.4 if (m % 2) else -0.4)
        poner(envio, t, sp, 0.04 * v)
    if 12 <= c < 17:
        s2 = piano(m + 12, OCT * 0.9, v * 0.8)
        poner(seco, t, s2, 0.06, 0.3)
        poner(envio, t, s2, 0.06)

# ── Pads, cuerdas, bajo, órgano por compás ──
VOICING = {  # voces medias (cuerdas) con novenas y suspensiones
    "Am": ["E3", "A3", "B3", "C4", "E4"], "F": ["F3", "A3", "C4", "G4"], "C": ["E3", "G3", "C4", "D4", "G4"],
    "G": ["D3", "G3", "A3", "D4"], "Dm": ["D3", "A3", "E4", "F4"],
}
for c in range(2, 24):
    nombre = ACORDES[c]
    raiz, ter, grave = INFO[nombre]
    t0 = T(c)
    if T(16) <= t0 < T(17):
        dur = SILENCIO[0] - t0
    else:
        dur = BAR
    if c >= 21:
        continue  # el acorde final se escribe aparte
    # pad grave: raíz y quinta, desde el compás 4
    if c >= 4:
        g = 0.18 if c < 15 else 0.26 if c < 17 else 0.14
        p = cuerdas([midi(grave) + 12, midi(grave) + 19], dur, corte=700, ataque=0.9, vib=0.4)
        poner(seco, t0, p, g)
        poner(envio, t0, p, g * 0.6)
    # cuerdas medias desde el compás 6 (crecen)
    if c >= 6:
        g = 0.08 + 0.1 * min(1, (c - 6) / 9) if c < 17 else 0.07
        cs = cuerdas([midi(n) for n in VOICING[nombre]], dur, corte=2800 + 200 * min(c, 16), ataque=0.8)
        poner(seco, t0, cs, g)
        poner(envio, t0, cs, g * 0.9)
    # cuerdas altas desde el compás 11 (y la nota tenida de la frase final)
    if 11 <= c < 17 or 17 <= c < 19:
        alta = [midi(VOICING[nombre][-1]) + 12, midi(VOICING[nombre][-2]) + 12]
        ca = cuerdas(alta, dur, corte=8000, ataque=1.0, vib=1.2)
        poner(seco, t0, ca, 0.07 if c < 17 else 0.06)
        poner(envio, t0, ca, 0.1)
    # pulso de bajo en corcheas desde el compás 8
    if 8 <= c < 17 or 19 <= c < 21:
        for k in range(8):
            tk = t0 + k * OCT
            if SILENCIO[0] - 1e-6 <= tk < SILENCIO[1]:
                continue
            poner(seco, tk, sub(midi(grave) + 12, OCT * 0.9), 0.16 if c < 15 else 0.2)
    # órgano en el clímax
    if 15 <= c < 17:
        o = organo([midi(n) for n in VOICING[nombre]] + [midi(grave) + 12], dur, ataque=0.25)
        poner(seco, t0, o, 0.09)
        poner(envio, t0, o, 0.1)

# ── Percusión y golpes ──
for t, g in golpes:
    if g == "tom":
        s = tambor(False, 0.9)
        poner(seco, t, s, 0.32, (azar := (hash(round(t, 3)) % 7 - 3) / 6))
        poner(envio, t, s, 0.18)
    elif g == "taiko":
        s = tambor(True, 1.2)
        poner(seco, t, s, 0.42)
        poner(envio, t, s, 0.3)
        lc = int(2.5 * SR)
        plato = banda(ruido(lc), 4500, 14000) * np.exp(-np.arange(lc) / SR * 1.8)
        poner(seco, t, plato, 0.06, 0.3)
        poner(envio, t, plato, 0.08)
    elif g == "nota":
        m = midi("C6") if abs(t - T(22)) < 0.01 else midi("G5")
        poner(seco, t, piano(m, 2.0, 0.55), 0.09, 0.2)
        poner(envio, t, piano(m, 2.0, 0.55), 0.14)
    elif g == "fijar":
        poner(seco, t, golpe_suave(), 0.12)
        poner(envio, t, golpe_suave(), 0.12)
    elif g in ("suave", "revelacion"):
        s = golpe_suave()
        poner(seco, t, s, 0.35 if g == "revelacion" else 0.24)
        poner(envio, t, s, 0.15)
for t0, t1, tipo in swells:
    if tipo == "reverse":
        if t1 <= T(1) + 1e-6:
            reverse(t0, t1, 0.2, brillo=2200)  # la primera, oscura y suave
        else:
            reverse(t0, t1, 0.35)
    elif tipo == "swell":
        # swell enorme: ruido brillante y un clúster de cuerdas que suben, hasta el silencio
        largo = int((t1 - t0) * SR)
        tt = np.arange(largo) / SR
        u = tt / (t1 - t0)
        r = banda(ruido(largo), 300, 9000) * u ** 2.5
        poner(seco, t0, r, 0.22)
        poner(envio, t0, r, 0.25)
        cl = cuerdas([midi(n) for n in ("C4", "F4", "G4", "C5")], t1 - t0, corte=5000, ataque=t1 - t0, vib=1.5)
        poner(seco, t0, cl[: largo], 0.16)
    elif tipo == "redoble":
        # redoble de timbal que crece hacia el logo
        n = 0
        t = t0
        while t < t1 - 0.03:
            u = (t - t0) / (t1 - t0)
            s = tambor(True, 0.5 + 0.6 * u)
            poner(seco, t, s[: int(0.4 * SR)], 0.04 + 0.14 * u ** 2, (-0.3, 0.3)[n % 2])
            t += OCT / (2 + 2 * u)
            n += 1
        reverse(t1 - BAR / 2, t1, 0.4)

# ── Acorde final: Do mayor amplio con golpe grave y cola larga ──
FIN = T(21)
fin_dur = TOTAL - FIN - 1.0
voces = [midi(n) for n in ("C2", "G2", "C3", "E3", "G3", "C4", "D4", "E4", "G4")]
poner(seco, FIN, organo(voces, fin_dur, ataque=0.08), 0.3)
poner(envio, FIN, organo(voces, fin_dur, ataque=0.08), 0.2)
cf = cuerdas([midi(n) for n in ("C3", "G3", "C4", "E4", "G4", "C5", "E5", "G5")], fin_dur, corte=7000, ataque=0.15, vib=1.0)
poner(seco, FIN, cf, 0.44)
poner(envio, FIN, cf, 0.3)
for m in (midi("C2"), midi("C3"), midi("G3"), midi("E4")):
    poner(seco, FIN, piano(m, 4.0, 0.9), 0.1)
    poner(envio, FIN, piano(m, 4.0, 0.9), 0.1)
poner(seco, FIN, tambor(True, 1.4), 0.48)
poner(envio, FIN, tambor(True, 1.4), 0.4)
lf = int(3.0 * SR)
tf = np.arange(lf) / SR
boom = np.sin(2 * np.pi * np.cumsum(32 + 40 * np.exp(-tf * 6)) / SR) * np.exp(-tf * 1.4)
poner(seco, FIN, boom, 0.32)
lc = int(5 * SR)
plato = banda(ruido(lc), 4000, 14000) * np.exp(-np.arange(lc) / SR * 1.0)
poner(seco, FIN, plato, 0.07, -0.2)
poner(envio, FIN, plato, 0.1)

# ── Reverb larga por convolución (4,5 s), estéreo decorrelado ──
L = int(4.5 * SR)
tt = np.arange(L) / SR
ir = np.zeros((L, 2))
for ch in range(2):
    r = ruido(L) * np.exp(-tt * 1.45)
    claro = banda(r, 200, 11000)
    oscuro = banda(r, 200, 2200)
    k = np.exp(-tt * 1.2)
    ir[:, ch] = claro * k + oscuro * (1 - k)
ir[: int(0.035 * SR)] = 0
ir /= np.sqrt((ir ** 2).sum(0))
envio = banda(envio, 180, None)
nfft = 1 << int(np.ceil(np.log2(N + L)))
humedo = np.zeros((N, 2))
for ch in range(2):
    humedo[:, ch] = np.fft.irfft(np.fft.rfft(envio[:, ch], nfft) * np.fft.rfft(ir[:, ch], nfft), nfft)[:N]
master = seco + humedo * 0.6
master = banda(master, 30, 17000, orden=6)
# Ecualización: baja el barro (200-500 Hz) y abre el aire arriba de 4 kHz.
X = np.fft.rfft(master, axis=0)
fr = np.fft.rfftfreq(len(master), 1 / SR)
eq = 1 - 0.5 * np.exp(-((np.log(np.maximum(fr, 1) / 320)) / 0.45) ** 2) + 0.7 / (1 + (5000 / np.maximum(fr, 1)) ** 2)
master = np.fft.irfft(X * eq[:, None], n=len(master), axis=0)
# Silencio total antes de la frase final (también se corta la reverb), con micro-fundidos.
a, b = int(SILENCIO[0] * SR), int(SILENCIO[1] * SR)
f = int(0.01 * SR)
master[a - f : a] *= np.linspace(1, 0, f)[:, None]
master[a:b] = 0
master[b : b + f] *= np.linspace(0, 1, f)[:, None]
master[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))[:, None]
cola = int(1.5 * SR)
master[-cola:] *= np.linspace(1, 0, cola)[:, None] ** 2
# Saturación suave y normalización (margen para el AAC: pico real final ≤ −1 dBFS).
master /= np.abs(master).max()
master = np.tanh(master * 2.2) / np.tanh(2.2)
master *= 10 ** (-2.4 / 20) / np.abs(master).max()
with wave.open(str(RAIZ / "public" / "musica.wav"), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((master * 32767).astype("<i2").tobytes())

mono = master.mean(1)
print(f"pico {20 * np.log10(np.abs(master).max()):.2f} dBFS · {len(ostinato)} notas de ostinato · {len(golpes)} golpes")
TRAMOS = [("frase1", 0, 2), ("campo", 2, 4), ("gravedad", 4, 6), ("onda", 6, 8), ("montaje 1", 8, 11), ("montaje 1/2", 11, 13),
          ("montaje pulso", 13, 15), ("clímax", 15, 17), ("frase2", 17, 19), ("créditos", 19, 21), ("logo", 21, 24)]
for nombre, c0, c1 in TRAMOS:
    x = mono[int(T(c0) * SR) : int(T(c1) * SR)]
    X = np.abs(np.fft.rfft(x)) ** 2
    fr = np.fft.rfftfreq(len(x), 1 / SR)
    tot = X.sum()
    bandas = [X[(fr >= lo) & (fr < hi)].sum() / tot * 100 for lo, hi in ((0, 120), (120, 500), (500, 4000), (4000, 20000))]
    rms = 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-9)
    print(f"{nombre:14s} {T(c0):5.1f}s  rms {rms:6.1f} dBFS  <120 {bandas[0]:4.1f}%  120-500 {bandas[1]:4.1f}%  0,5-4k {bandas[2]:4.1f}%  >4k {bandas[3]:4.1f}%")
