"""Uso: PYTHONPATH=../pylib python3 herramientas/sincronia.py <video.mp4> [salida_dir]
Revisión de sincronía sobre el video ya renderizado:
  1. Luminancia media de cada cuadro (gris, reducido a 108 px de ancho).
  2. Correlación de Pearson cuadro a cuadro entre la envolvente de graves (src/ritmo.json, curvas.graves) y la
     luminancia, en ventanas de 4 compases del drop; también con la envolvente de bombo y con desfases de ±3 cuadros.
  3. Hoja de sincronía: pares de cuadros justo antes (−1) y justo después (+1) de downbeats y onsets fuertes.
"""
import json
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg
import numpy as np

RAIZ = Path(__file__).resolve().parent.parent
FF = imageio_ffmpeg.get_ffmpeg_exe()
video = sys.argv[1]
sal = Path(sys.argv[2] if len(sys.argv) > 2 else RAIZ / "out" / "sincronia")
sal.mkdir(parents=True, exist_ok=True)
R = json.load(open(RAIZ / "src" / "ritmo.json"))
FPS = 30

# 1. luminancia por cuadro
W, H = 108, 135
crudo = subprocess.run([FF, "-v", "error", "-i", video, "-vf", f"scale={W}:{H},format=gray", "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
cuadros = np.frombuffer(crudo, dtype=np.uint8).reshape(-1, H, W).astype(np.float64) / 255.0
lum = cuadros.mean(axis=(1, 2))
n = len(lum)
graves = np.array(R["curvas"]["graves"][:n])
# envolvente de bombo (onsets, caída exponencial 7/s) por cuadro
tt = np.arange(n) / FPS
bombo = np.zeros(n)
for o in R["onsetsBombo"]:
    m = tt >= o["t"]
    bombo[m] = np.maximum(bombo[m], o["v"] * np.exp(-(tt[m] - o["t"]) * 7))


def corr(a, b):
    a = a - a.mean()
    b = b - b.mean()
    return float((a * b).sum() / np.sqrt((a * a).sum() * (b * b).sum()))


comp = R["compas"]
p0 = R["primerCompas"]
print("Correlación cuadro a cuadro (Pearson r) entre audio y luminancia media del cuadro:")
print(" ventana (compases)      t (s)          r graves  r bombo   mejor desfase graves (cuadros, r)   r graves pasa-altos")


def pasa_altos(x, k=15):
    # quita el nivel de cada plano y la deriva lenta (media móvil de 0,5 s): mide el acople al pulso
    return x - np.convolve(x, np.ones(k) / k, "same")

filas = []
for a in (4, 8, 12, 15):
    t0, t1 = p0 + a * comp, p0 + (a + 4) * comp
    i0, i1 = int(round(t0 * FPS)), int(round(t1 * FPS))
    L = lum[i0:i1]
    rg = corr(graves[i0:i1], L)
    rb = corr(bombo[i0:i1], L)
    best = max(((k, corr(graves[i0 + k:i1 + k], L)) for k in range(-3, 4)), key=lambda x: x[1])
    rh = corr(pasa_altos(graves)[i0:i1], pasa_altos(lum)[i0:i1])
    filas.append((a, t0, t1, rg, rb, best, rh))
    print(f" {a:2d}-{a + 4:2d}            {t0:6.2f}-{t1:6.2f}     {rg:6.3f}   {rb:6.3f}    {best[0]:+d}, {best[1]:.3f}                     {rh:6.3f}")
json.dump({"ventanas": [{"compases": [a, a + 4], "t0": t0, "t1": t1, "r_graves": rg, "r_bombo": rb, "desfase": best[0], "r_desfase": best[1], "r_pasa_altos": rh} for a, t0, t1, rg, rb, best, rh in filas]},
          open(sal / "correlacion.json", "w"), indent=1)
# curva para graficar
np.savetxt(sal / "lum_graves.csv", np.c_[tt, lum, graves, bombo], delimiter=",", header="t,lum,graves,bombo", fmt="%.4f")

# 2. hoja de sincronía: antes/después de eventos
eventos = []
for d in R["downbeats"]:
    if 8 < d < 47:
        eventos.append(("downbeat", d))
fuertes = [o for o in R["onsetsBombo"] if o["v"] >= 0.95 and 9 < o["t"] < 46]
cajas = [o for o in R["onsetsCaja"] if o["v"] >= 0.95 and 9 < o["t"] < 46]
for o in fuertes[::5][:6]:
    eventos.append(("bombo", o["t"]))
for o in cajas[::5][:6]:
    eventos.append(("caja", o["t"]))
eventos.sort(key=lambda e: e[1])
lista = []
for i, (tipo, t) in enumerate(eventos):
    f = int(round(t * FPS))
    for k, nombre in ((-1, "a"), (1, "b")):
        fr = min(n - 1, max(0, f + k))
        lista.append((fr, f"{i:02d}{nombre}"))
for fr, nom in lista:
    subprocess.run([FF, "-v", "error", "-y", "-i", video, "-vf", f"select=eq(n\\,{fr}),scale=240:-2", "-frames:v", "1", str(sal / f"s{nom}.png")], check=True)
print("\nHoja de sincronía (pares antes/después):")
for i, (tipo, t) in enumerate(eventos):
    f = int(round(t * FPS))
    print(f" {i:02d} {tipo:9s} {t:6.2f} s  cuadros {f - 1}/{f + 1}  lum {lum[max(0, f - 1)]:.3f} -> {lum[min(n - 1, f + 1)]:.3f}")
cols = 8
filas_h = (len(lista) + cols - 1) // cols
lst = sal / "_l.txt"
lst.write_text("".join(f"file '{(sal / f's{nom}.png').resolve()}'\nduration 1\n" for _, nom in lista))
subprocess.run([FF, "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-vf",
                f"drawtext=fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:fontsize=14:fontcolor=yellow:box=1:boxcolor=black@0.7:x=4:y=4:text='%{{n}}',tile={cols}x{filas_h}:padding=3:color=white",
                "-frames:v", "1", str(sal / "hoja_sincronia.png")], check=True)
print("escrito", sal / "hoja_sincronia.png")
