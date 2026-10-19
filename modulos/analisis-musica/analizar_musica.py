"""Uso: PYTHONPATH=../pylib python3 herramientas/analizar_musica.py [segundos]
Análisis real de la música (audio/jonasblakewood-synthwave-618628.mp3) con numpy:
  1. Decodifica con el ffmpeg de imageio_ffmpeg (mono, 44,1 kHz).
  2. STFT a 100 Hz (ventana Hann de 2048) y energía por bandas: graves 20-150 Hz, medios 150 Hz-2 kHz,
     agudos 2-12 kHz y RMS total.
  3. Flujo espectral por banda y onsets por banda (picos sobre umbral adaptativo): bombo (40-130 Hz),
     caja (150 Hz-5 kHz, con peso en el ruido de 1-5 kHz) y hats (6-12 kHz).
  4. Verifica el tempo (autocorrelación del flujo a 8 pulsos y regresión lineal de las cajas en los tiempos 2 y 4)
     y la fase del primer compás (ordenada de esa regresión; las cajas deben caer en 2 y 4).
  5. Secciones por energía de cada compás, fills (caja densa al final del compás) y risers (agudos que suben).
  6. Escribe src/ritmo.json con todo, incluidas las curvas cuadro a cuadro a 30 fps (graves[f], medios[f],
     agudos[f], rms[f], riser[f]) y public/musica.wav con el tramo usado y su fundido.
"""
import json
import os
import subprocess
import sys

import imageio_ffmpeg
import numpy as np

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MP3 = os.path.join(RAIZ, "audio", "jonasblakewood-synthwave-618628.mp3")
SR = 44100
FPS = 30
HOP = 441  # 100 Hz
NFFT = 2048
# Datos conocidos (de un uso anterior); el análisis los verifica.
BPM_CONOCIDO = 107.88
PRIMER_COMPAS_CONOCIDO = 2.158
DROP_CONOCIDO = 8.83
CALMA_CONOCIDA = (46.7, 80.02)
FIN_VIDEO = 62.0  # el video dura 62 s: fundido de audio desde el downbeat de 60,02 s


def decodificar():
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    crudo = subprocess.run([ff, "-v", "error", "-i", MP3, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(crudo, dtype=np.float32).astype(np.float64)


def stft(x):
    win = np.hanning(NFFT)
    pad = np.concatenate([np.zeros(NFFT // 2), x, np.zeros(NFFT // 2)])
    n = 1 + (len(pad) - NFFT) // HOP
    idx = np.arange(NFFT)[None, :] + HOP * np.arange(n)[:, None]
    marcos = pad[idx] * win[None, :]
    return np.abs(np.fft.rfft(marcos, axis=1))  # (n, NFFT/2+1), marco i centrado en i*HOP/SR


def banda(freqs, a, b):
    return (freqs >= a) & (freqs < b)


def flujo(S, m):
    L = np.log1p(100.0 * S[:, m])
    d = np.diff(L, axis=0, prepend=L[:1])
    return np.maximum(d, 0).sum(axis=1)


def picos(env, tasa, separacion, k=1.4, ventana=0.25, piso=0.0):
    """Picos locales de env sobre mediana móvil + k·MAD; separación mínima en segundos. Devuelve (índices, fuerza)."""
    n = len(env)
    w = int(ventana * tasa)
    med = np.array([np.median(env[max(0, i - w): i + w + 1]) for i in range(n)])
    mad = np.array([np.median(np.abs(env[max(0, i - w): i + w + 1] - med[i])) for i in range(n)])
    umbral = med + k * mad + piso
    cand = [i for i in range(1, n - 1) if env[i] > umbral[i] and env[i] >= env[i - 1] and env[i] >= env[i + 1]]
    sep = int(separacion * tasa)
    elegidos = []
    for i in sorted(cand, key=lambda j: -env[j]):
        if all(abs(i - j) >= sep for j in elegidos):
            elegidos.append(i)
    elegidos.sort()
    return np.array(elegidos, dtype=int), env[elegidos] if elegidos else np.array([])


def normalizar(v, p_bajo=3, p_alto=99.5):
    a, b = np.percentile(v, p_bajo), np.percentile(v, p_alto)
    return np.clip((v - a) / max(b - a, 1e-9), 0, 1)


def main():
    seg_salida = float(sys.argv[1]) if len(sys.argv) > 1 else FIN_VIDEO + 0.5
    x = decodificar()
    dur = len(x) / SR
    print(f"audio: {dur:.2f} s")
    S = stft(x)
    freqs = np.fft.rfftfreq(NFFT, 1 / SR)
    n = S.shape[0]
    tt = np.arange(n) * HOP / SR
    P = S ** 2
    e_gr = P[:, banda(freqs, 20, 150)].sum(1)
    e_me = P[:, banda(freqs, 150, 2000)].sum(1)
    e_ag = P[:, banda(freqs, 2000, 12000)].sum(1)
    # RMS total desde la señal (ventana de 2048 centrada en cada marco)
    pad = np.concatenate([np.zeros(NFFT // 2), x, np.zeros(NFFT // 2)])
    rms = np.array([np.sqrt(np.mean(pad[i * HOP: i * HOP + NFFT] ** 2)) for i in range(n)])

    # ── flujo espectral por banda (onsets) ──
    f_bombo = flujo(S, banda(freqs, 40, 90))
    f_caja = flujo(S, banda(freqs, 1000, 5000))
    f_hats = flujo(S, banda(freqs, 7000, 12000))
    f_todo = flujo(S, banda(freqs, 30, 12000))

    # ── onsets por banda: picos sobre mediana móvil + k·MAD, con fuerza relativa al percentil 90 ──
    def detectar(env, sep, k, rel):
        ii, vv = picos(env, 100, sep, k=k)
        m = np.percentile(vv, 90)
        return [(float(tt[i]), float(min(1.0, v / m))) for i, v in zip(ii, vv) if v >= rel * m]
    on_c = detectar(f_caja, 0.3, 3.0, 0.35)
    on_b = detectar(f_bombo, 0.2, 3.0, 0.35)
    tc_ = np.array([t for t, _ in on_c])
    on_h = [(t, v) for t, v in detectar(f_hats, 0.1, 2.0, 0.2) if len(tc_) == 0 or np.min(np.abs(tc_ - t)) > 0.05]

    # ── tempo ──
    # (a) autocorrelación del flujo total en el drop (9 a 46 s)
    a, b = int(9 * 100), int(46 * 100)
    o = f_todo[a:b] - f_todo[a:b].mean()
    ac = np.correlate(o, o, "full")[len(o) - 1:]
    lag8 = np.arange(len(ac)) / 100
    bpms = 60 / np.maximum(lag8, 1e-9)
    # pico cerca de 8 pulsos (más precisión que un pulso)
    p_aprox = 60 / BPM_CONOCIDO
    ventana = (lag8 > 8 * p_aprox - 0.15) & (lag8 < 8 * p_aprox + 0.15)
    i0 = np.argmax(np.where(ventana, ac, -np.inf))
    y0, y1, y2 = ac[i0 - 1], ac[i0], ac[i0 + 1]
    off = 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2)
    bpm_ac = 60 * 8 / ((i0 + off) / 100)
    # (b) regresión lineal de las cajas (tiempos 2 y 4) contra su índice de pulso, en el tramo usado (0 a 65 s):
    #     la pendiente es el pulso y la ordenada el primer tiempo 1
    def regresion(eventos, cuales, t0, pulso, hasta=65.0):
        ts = np.array([t for t, v in eventos if t < hasta])
        ks = np.round((ts - t0) / pulso).astype(int)
        m = np.isin(ks % 4, cuales) & (np.abs(ts - (t0 + ks * pulso)) < 0.16)
        bb, aa = np.polyfit(ks[m], ts[m], 1)
        res = ts[m] - (aa + bb * ks[m])
        return bb, aa, int(m.sum()), float(np.std(res))
    pulso_r, t0_r, n_r, sd_r = regresion(on_c, [1, 3], PRIMER_COMPAS_CONOCIDO, 60 / BPM_CONOCIDO)
    pulso_r, t0_r, n_r, sd_r = regresion(on_c, [1, 3], t0_r, pulso_r)
    pulso_b, t0_b, n_b, sd_b = regresion(on_b, [0], t0_r, pulso_r)
    bpm_r = 60 / pulso_r
    print(f"tempo: autocorrelación (8 pulsos) {bpm_ac:.2f} BPM · regresión de {n_r} cajas en 2 y 4: {bpm_r:.3f} BPM "
          f"(desvío {sd_r * 1000:.0f} ms) · bombos en 1: {60 / pulso_b:.3f} BPM · dato conocido {BPM_CONOCIDO}")
    BPM = round(bpm_r, 3)
    PULSO = 60 / BPM
    COMPAS = 4 * PULSO
    primer = t0_r
    print(f"primer compás: {primer:.3f} s por las cajas · {t0_b:.3f} s por los bombos · dato conocido {PRIMER_COMPAS_CONOCIDO} "
          f"(la rejilla conocida queda {1000 * (primer - PRIMER_COMPAS_CONOCIDO):.0f} ms antes de los golpes medidos)")
    on_b = [{"t": round(t, 3), "v": round(v, 3)} for t, v in on_b]
    on_c = [{"t": round(t, 3), "v": round(v, 3)} for t, v in on_c]
    on_h = [{"t": round(t, 3), "v": round(v, 3)} for t, v in on_h]
    # verificación del compás: energía de caja plegada en el compás (2 y 4 deben dominar)
    fase_c = [((e["t"] - primer) / PULSO) % 4 for e in on_c if 9 < e["t"] < 46]
    hist = [sum(1 for f in fase_c if abs(f - k) < 0.25 or abs(f - k - 4) < 0.25) for k in range(4)]
    print("cajas por tiempo del compás (1, 2, 3, 4):", hist)

    # ── rejilla ──
    pulsos = [round(primer + i * PULSO, 4) for i in range(-int(primer / PULSO), int((dur - primer) / PULSO) + 1)]
    downbeats = [round(primer + i * COMPAS, 4) for i in range(-int(primer / COMPAS), int((dur - primer) / COMPAS) + 1)]

    # ── energía por compás y secciones ──
    def media(env, a, b):
        return float(env[int(a * 100): int(b * 100)].mean())
    db = lambda v: 10 * np.log10(v + 1e-12)
    filas = []
    for t0 in downbeats:
        if t0 + COMPAS > dur:
            break
        filas.append({"t": t0, "rms": db(media(rms ** 2, t0, t0 + COMPAS)), "gr": db(media(e_gr, t0, t0 + COMPAS)), "ag": db(media(e_ag, t0, t0 + COMPAS)),
                      "bombos": sum(1 for e in on_b if t0 <= e["t"] < t0 + COMPAS), "cajas": sum(1 for e in on_c if t0 <= e["t"] < t0 + COMPAS)})
    print("\ncompás  t(s)    RMS dB  graves dB  agudos dB  bombos cajas")
    for i, f in enumerate(filas):
        if f["t"] > 90:
            break
        print(f"{i:5d} {f['t']:7.2f} {f['rms']:8.1f} {f['gr']:9.1f} {f['ag']:9.1f} {f['bombos']:7d} {f['cajas']:5d}")
    # límites: cambio de RMS de compás >= 3 dB o cambio de graves >= 6 dB
    limites = []
    for i in range(1, len(filas)):
        if abs(filas[i]["rms"] - filas[i - 1]["rms"]) >= 3 or abs(filas[i]["gr"] - filas[i - 1]["gr"]) >= 6:
            limites.append(round(filas[i]["t"], 3))
    print("\nlímites por energía:", limites[:20])

    # ── fills: compases con cajas/toms densos en su último pulso; risers: agudos que suben 2 compases seguidos ──
    fills = []
    for t0 in downbeats:
        a2, b2 = t0 + 3 * PULSO, t0 + COMPAS
        nb = sum(1 for e in on_c if a2 <= e["t"] < b2) + sum(1 for e in on_b if a2 <= e["t"] < b2)
        if nb >= 3:
            fills.append({"t0": round(a2, 3), "t1": round(b2, 3), "golpes": nb})
    ag_s = np.convolve(db(e_ag), np.ones(50) / 50, "same")
    pend = np.gradient(ag_s) * 100  # dB/s
    riser100 = np.clip(np.convolve(pend, np.ones(100) / 100, "same") / 6.0, 0, 1)
    risers = []
    dentro = False
    for i, v in enumerate(riser100):
        if v > 0.35 and not dentro:
            dentro, ini = True, i
        elif v <= 0.35 and dentro:
            dentro = False
            if (i - ini) / 100 > 0.8:
                risers.append({"t0": round(ini / 100, 3), "t1": round(i / 100, 3)})
    print("fills:", [(f["t0"], f["golpes"]) for f in fills if f["t0"] < 64])
    print("risers:", [r for r in risers if r["t0"] < 64])

    # ── curvas por cuadro (30 fps): máximo de la energía 100 Hz dentro de cada cuadro, en dB normalizados ──
    nf = int(np.ceil(seg_salida * FPS)) + 1
    def por_cuadro(env100, red=np.max):
        out = np.zeros(nf)
        for f in range(nf):
            a3 = int(round((f - 0.5) / FPS * 100))
            b3 = int(round((f + 0.5) / FPS * 100))
            seg = env100[max(0, a3): max(a3 + 1, b3)]
            out[f] = red(seg) if len(seg) else 0
        return out
    curvas = {}
    # amplitud lineal (raíz de la energía de la banda), normalizada al percentil 99,5 del primer minuto y medio:
    # conserva el bombeo del bajo y del bombo (en dB el drop quedaría comprimido entre 0,8 y 1)
    for nombre, env in (("graves", e_gr), ("medios", e_me), ("agudos", e_ag), ("rms", rms ** 2)):
        amp = np.sqrt(env)
        ref = np.percentile(amp[: int(90 * 100)], 99.5)
        curvas[nombre] = [round(float(z), 3) for z in np.clip(por_cuadro(amp) / ref, 0, 1)]
        v = db(env)
        a4, b4 = np.percentile(v[: int(90 * 100)], 3), np.percentile(v[: int(90 * 100)], 99.5)
        curvas[nombre + "Db"] = [round(float(z), 3) for z in np.clip((por_cuadro(v) - a4) / (b4 - a4), 0, 1)]
    curvas["riser"] = [round(float(z), 3) for z in por_cuadro(riser100)]
    # flujo por banda normalizado (golpes "crudos" por cuadro, útil para chispas)
    for nombre, env in (("flujoBombo", f_bombo), ("flujoCaja", f_caja), ("flujoHats", f_hats)):
        m = np.percentile(env[: 90 * 100], 99.5)
        curvas[nombre] = [round(float(z), 3) for z in np.clip(por_cuadro(env) / m, 0, 1)]

    # ── secciones (verificadas contra el dato conocido) ──
    drop = min(downbeats, key=lambda t: abs(t - DROP_CONOCIDO))
    calma = min(downbeats, key=lambda t: abs(t - CALMA_CONOCIDA[0]))
    vuelta = min(downbeats, key=lambda t: abs(t - CALMA_CONOCIDA[1]))
    secciones = [
        {"id": "intro", "t0": 0.0, "t1": drop},
        {"id": "drop", "t0": drop, "t1": calma},
        {"id": "calma", "t0": calma, "t1": vuelta},
    ]
    print(f"\nsecciones: intro 0-{drop:.3f} · drop {drop:.3f}-{calma:.3f} · calma {calma:.3f}-{vuelta:.3f}")

    sal = {
        "fuente": "audio/jonasblakewood-synthwave-618628.mp3 · «Synthwave», JonasBlakewood · Pixabay Content License",
        "fps": FPS,
        "finVideo": FIN_VIDEO,
        "duracionAudio": round(dur, 3),
        "bpm": BPM,
        "bpmMedido": {"autocorrelacion": round(float(bpm_ac), 2), "regresionCajas": round(float(bpm_r), 3), "regresionBombos": round(float(60 / pulso_b), 3), "desvioMs": round(sd_r * 1000, 1)},
        "datoConocido": {"bpm": BPM_CONOCIDO, "primerCompas": PRIMER_COMPAS_CONOCIDO, "drop": DROP_CONOCIDO, "calma": list(CALMA_CONOCIDA)},
        "pulso": round(PULSO, 5),
        "compas": round(COMPAS, 5),
        "primerCompas": round(float(primer), 3),
        "pulsos": [p for p in pulsos if 0 <= p <= seg_salida + 2],
        "downbeats": [p for p in downbeats if 0 <= p <= seg_salida + 2],
        "secciones": secciones,
        "limitesEnergia": [l for l in limites if l < seg_salida + 20],
        "fills": [f for f in fills if f["t0"] < seg_salida],
        "risers": [r for r in risers if r["t0"] < seg_salida],
        "onsetsBombo": [e for e in on_b if e["t"] <= seg_salida],
        "onsetsCaja": [e for e in on_c if e["t"] <= seg_salida],
        "onsetsHats": [e for e in on_h if e["t"] <= seg_salida],
        "compases": [{"t": round(f["t"], 3), "rms": round(f["rms"], 1), "graves": round(f["gr"], 1), "agudos": round(f["ag"], 1), "bombos": f["bombos"], "cajas": f["cajas"]} for f in filas if f["t"] < seg_salida + 4],
        "curvas": curvas,
    }
    with open(os.path.join(RAIZ, "src", "ritmo.json"), "w", encoding="utf-8") as fh:
        json.dump(sal, fh, ensure_ascii=False, separators=(",", ":"))
    print(f"\nonsets: bombo {len(sal['onsetsBombo'])} · caja {len(sal['onsetsCaja'])} · hats {len(sal['onsetsHats'])} (hasta {seg_salida} s)")
    print("escrito src/ritmo.json")

    # ── audio del video: 0 a FIN s, fundido de coseno desde el downbeat más cercano a 60 s ──
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    est = subprocess.run([ff, "-v", "error", "-i", MP3, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    st = np.frombuffer(est, dtype=np.float32).reshape(-1, 2).astype(np.float64)
    t_fade = min(downbeats, key=lambda t: abs(t - 60.0))
    fin = FIN_VIDEO
    st = st[: int(fin * SR)].copy()
    i0 = int(t_fade * SR)
    k = np.arange(len(st) - i0) / (len(st) - i0)
    st[i0:] *= (0.5 + 0.5 * np.cos(np.pi * k))[:, None]
    pcm = (np.clip(st, -1, 1) * 32767).astype("<i2").tobytes()
    import wave
    with wave.open(os.path.join(RAIZ, "public", "musica.wav"), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm)
    print(f"public/musica.wav: 0 a {fin} s, fundido desde {t_fade:.3f} s")


if __name__ == "__main__":
    main()
