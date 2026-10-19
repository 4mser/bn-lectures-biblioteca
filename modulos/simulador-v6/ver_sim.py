"""Uso: PYTHONPATH=../pylib python3 herramientas/ver_sim.py <nombre> <salida.png> <cuadro1,cuadro2,...> [canal]
Hoja de revisión rápida de una simulación precalculada (public/sim): mapa de grises, sin pasar por la GPU."""
import gzip
import json
import os
import struct
import sys
import zlib

import numpy as np

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
nombre, salida, lista = sys.argv[1], sys.argv[2], [int(x) for x in sys.argv[3].split(",")]
canal = int(sys.argv[4]) if len(sys.argv) > 4 else 0
M = json.load(open(os.path.join(RAIZ, "public", "sim", "manifiesto.json")))[nombre]
dt = np.float16 if M["tipo"] == "f16" else np.uint8
imgs = []
for f in lista:
    a = np.frombuffer(gzip.decompress(open(os.path.join(RAIZ, "public", "sim", nombre, f"{f:05d}.gzb"), "rb").read()), dt)
    a = a.reshape(M["h"], M["w"], M["canales"])[..., canal].astype(np.float32)
    if dt == np.float16:
        a = 0.5 + a * 1.2
    else:
        a = a / 255
    imgs.append(np.clip(a, 0, 1))
h, w = imgs[0].shape
hoja = np.ones((h, (w + 4) * len(imgs))) * 0.3
for i, a in enumerate(imgs):
    hoja[:, i * (w + 4):i * (w + 4) + w] = a
px = (hoja * 255).astype(np.uint8)
raw = b"".join(b"\x00" + px[y].tobytes() for y in range(px.shape[0]))
def chunk(t, d):
    return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", px.shape[1], px.shape[0], 8, 0, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 6)) + chunk(b"IEND", b"")
open(salida, "wb").write(png)
print(salida)
