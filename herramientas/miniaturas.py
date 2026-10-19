#!/usr/bin/env python3
"""Build one thumbnail per catalog entry into miniaturas/<id>.png (480 px wide).

Usage: python3 herramientas/miniaturas.py [--solo id1,id2] [--rehacer]
Frames come from each project's own herramientas/cuadros.mjs. Recovered teaser versions are extracted
with `git archive <tag>` from teaser-lectures into tmp/ (node_modules cloned), so the project is untouched.
"""
import argparse
import os
import subprocess
import sys
from collections import defaultdict

# Root of the B&N working folder that holds the source projects (not part of this repo).
BN = os.environ.get("BN_VIDEOS", os.path.expanduser(os.path.join("~", "Development", "BN_Videos")))
BIB = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(BIB, "datos"))
import catalogo  # noqa: E402

FF = os.path.join(BN, "pylib", "imageio_ffmpeg", "binaries", "ffmpeg-macos-aarch64-v7.1")
TAGS = {"v1": "v1-luminosa", "v2": "v2-oscura-titulos", "v4": "v4-lo-invisible", "final": "final-epiciclos"}
DIRS = {"reel": "plantilla", "ambar": "del-ambar-a-millikan", "coulomb": "ley-de-coulomb", "lineas": "lineas-de-campo",
        "carga": "carga-en-un-campo", "dens": "densidades-no-uniformes", "cuerpo": "teaser-cuerpo", "v5": "teaser-v5"}
OUT = os.path.join(BIB, "miniaturas")
TMP = os.path.join(BIB, "tmp")


def proyecto(key):
    if key in DIRS:
        return os.path.join(BN, DIRS[key])
    dst = os.path.join(TMP, TAGS[key])
    if not os.path.isdir(dst):
        os.makedirs(dst)
        tl = os.path.join(BN, "teaser-lectures")
        arch = subprocess.run(["git", "-C", tl, "archive", TAGS[key]], capture_output=True, check=True).stdout
        subprocess.run(["tar", "-x", "-C", dst], input=arch, check=True)
        subprocess.run(["cp", "-Rc", os.path.join(tl, "node_modules"), dst], check=True)
        os.symlink(os.path.join(BN, "pylib"), os.path.join(dst, "pylib"))
    return dst


def escalar(src, dst, wav=False):
    if wav:
        cmd = [FF, "-v", "error", "-y", "-i", src, "-lavfi",
               "showspectrumpic=s=480x270:legend=0:scale=log:fscale=log:stop=16000:color=cool", dst]
    else:
        cmd = [FF, "-v", "error", "-y", "-i", src, "-vf", "scale=480:-2", dst]
    subprocess.run(cmd, check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--solo", default="")
    ap.add_argument("--rehacer", action="store_true")
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    solo = set(x for x in a.solo.split(",") if x)
    lotes = defaultdict(list)
    for e in catalogo.E:
        id_, thumb = e[0], e[8]
        if solo and id_ not in solo:
            continue
        dst = os.path.join(OUT, id_ + ".png")
        if os.path.exists(dst) and not a.rehacer:
            continue
        tipo, p, comp, seg = thumb
        if tipo == "cuadro":
            lotes[(p, comp)].append((id_, round(seg * 30)))
        else:
            escalar(os.path.join(BN, p), dst, wav=(tipo == "espectro"))
    for (p, comp), items in lotes.items():
        d = proyecto(p)
        crudos = os.path.join(TMP, "cuadros", f"{p}-{comp}")
        frames = sorted(set(f for _, f in items))
        print(f"{p} {comp}: {len(frames)} cuadros", flush=True)
        subprocess.run(["node", "herramientas/cuadros.mjs", crudos, ",".join(map(str, frames)), comp], cwd=d,
                       check=True, stdout=subprocess.DEVNULL)
        for id_, f in items:
            escalar(os.path.join(crudos, f"f{f:05d}.png"), os.path.join(OUT, id_ + ".png"))


if __name__ == "__main__":
    main()
