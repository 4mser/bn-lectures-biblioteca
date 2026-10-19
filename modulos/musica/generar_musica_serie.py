"""Música de fondo y efectos del reel «De lo discreto a lo continuo». Todo sintetizado aquí, sin samples de terceros.

Música: progresión Dm7–Bbmaj7–Fmaj7–C a 92 BPM, más calmada que la de una propuesta: es una clase. Colchón de acordes, bajo, arpegio en corcheas,
bombo suave en 1 y 3 y hi-hat apenas audible. Es una base pareja para que la narración se siga sin cansar.
Efectos: soplido (cambio de escena), tic (algo aparece), check (algo se aprueba), golpe (cifra grande)
y campana (cierre).

Uso: python audio/generar_musica.py [segundos]  ->  public/musica.wav y public/sfx/*.wav
"""
import sys
import wave
from pathlib import Path

import numpy as np

SR = 44100
BPM = 92
DURACION = int(sys.argv[1]) if len(sys.argv) > 1 else 180  # segundos; el video hace fade antes de terminar
RAIZ = Path(__file__).resolve().parent.parent
rng = np.random.default_rng(7)


def nota(m):
    return 440 * 2 ** ((m - 69) / 12)


def envolvente(largo, ataque, relajo):
    e = np.ones(largo)
    a = min(largo, int(ataque * SR))
    r = min(largo - a, int(relajo * SR))
    e[:a] = np.linspace(0, 1, a)
    if r > 0:
        e[-r:] = np.linspace(1, 0, r)
    return e


def guardar(ruta, estereo):
    estereo = estereo / max(1e-9, np.abs(estereo).max()) * 0.85
    ruta.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(ruta), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((estereo * 32767).astype("<i2").tobytes())


# ── Música ──
beat = 60 / BPM
compas = 4 * beat
n = int(SR * DURACION)
mezcla = np.zeros((n, 2))


def suma(inicio, senal, pan=0.0, gan=1.0):
    i0 = int(inicio * SR)
    i1 = min(n, i0 + len(senal))
    if i0 >= n:
        return
    s = senal[: i1 - i0] * gan
    mezcla[i0:i1, 0] += s * (1 - pan) / 2 * 2 ** 0.5
    mezcla[i0:i1, 1] += s * (1 + pan) / 2 * 2 ** 0.5


# (raíz MIDI, voces) para Dm7, Bbmaj7, Fmaj7, C
ACORDES = [(50, [57, 60, 65]), (46, [57, 62, 65]), (53, [57, 60, 64]), (48, [55, 60, 64])]
for c in range(int(DURACION / compas) + 1):
    raiz, voces = ACORDES[c % 4]
    inicio = c * compas
    largo = int(compas * SR * 1.08)
    tt = np.arange(largo) / SR
    pad = sum(
        np.sin(2 * np.pi * nota(m + 12) * tt * d) * 0.5 + np.sin(4 * np.pi * nota(m + 12) * tt * d) * 0.1
        for m in voces
        for d in (0.997, 1.003)
    )
    suma(inicio, pad * envolvente(largo, 0.7, 0.7), 0.0, 0.03)
    lb = int(compas * SR)
    tb = np.arange(lb) / SR
    bajo = (np.sin(2 * np.pi * nota(raiz - 12) * tb) + 0.25 * np.sin(4 * np.pi * nota(raiz - 12) * tb)) * envolvente(lb, 0.02, 0.4)
    suma(inicio, bajo, 0.0, 0.09)
    arpegio = voces + [voces[0] + 12, voces[1] + 12, voces[2], voces[1], voces[0] + 12]
    for k in range(8):
        lk = int(beat / 2 * SR * 1.7)
        tk = np.arange(lk) / SR
        f = nota(arpegio[k % len(arpegio)] + 12)
        pluck = (np.sin(2 * np.pi * f * tk) + 0.3 * np.sin(4 * np.pi * f * tk)) * np.exp(-tk * 7)
        suma(inicio + k * beat / 2, pluck, -0.35 if k % 2 else 0.35, 0.04)
    if c >= 2:
        for b in (0, 2):
            lk = int(0.35 * SR)
            tk = np.arange(lk) / SR
            frec = 55 + 70 * np.exp(-tk * 30)
            bombo = np.sin(2 * np.pi * np.cumsum(frec) / SR) * np.exp(-tk * 9)
            suma(inicio + b * beat, bombo, 0.0, 0.14)
        for b in range(4):
            lk = int(0.05 * SR)
            hat = np.diff(rng.standard_normal(lk) * np.exp(-np.arange(lk) / SR * 90), prepend=0)
            suma(inicio + b * beat + beat / 2, hat, 0.2, 0.011)

mezcla[: int(2 * SR)] *= np.linspace(0, 1, int(2 * SR))[:, None]
guardar(RAIZ / "public" / "musica.wav", mezcla)


# ── Efectos ──
def mono(x):
    return np.stack([x, x], 1)


def soplido():
    largo = int(0.9 * SR)
    tk = np.arange(largo) / SR
    r = rng.standard_normal(largo)
    suave = np.convolve(r, np.ones(24) / 24, "same")
    forma = np.sin(np.pi * np.clip(tk / 0.9, 0, 1)) ** 2
    return mono((r - suave) * 0.25 * forma + suave * 0.9 * forma)


def tic():
    tk = np.arange(int(0.08 * SR)) / SR
    return mono(np.sin(2 * np.pi * 1650 * tk) * np.exp(-tk * 70))


def check():
    tk = np.arange(int(0.45 * SR)) / SR
    a = np.sin(2 * np.pi * nota(84) * tk) * np.exp(-tk * 9)
    b = np.where(tk > 0.07, np.sin(2 * np.pi * nota(91) * (tk - 0.07)) * np.exp(-np.clip(tk - 0.07, 0, None) * 8), 0)
    return mono(a * 0.6 + b * 0.7)


def golpe():
    tk = np.arange(int(0.7 * SR)) / SR
    frec = 45 + 90 * np.exp(-tk * 20)
    return mono(np.sin(2 * np.pi * np.cumsum(frec) / SR) * np.exp(-tk * 6))


def campana():
    tk = np.arange(int(2.2 * SR)) / SR
    return mono(sum(np.sin(2 * np.pi * nota(m) * tk) for m in (77, 81, 84, 88)) * np.exp(-tk * 2.2))


def alerta():
    tk = np.arange(int(0.5 * SR)) / SR
    return mono(np.sin(2 * np.pi * nota(76) * tk) * np.exp(-tk * 10) + np.where(tk > 0.12, np.sin(2 * np.pi * nota(72) * (tk - 0.12)), 0) * np.exp(-np.clip(tk - 0.12, 0, None) * 10))


for nombre, f in [("soplido", soplido), ("tic", tic), ("check", check), ("golpe", golpe), ("campana", campana), ("alerta", alerta)]:
    guardar(RAIZ / "public" / "sfx" / f"{nombre}.wav", f())
print("ok", DURACION, "s")
