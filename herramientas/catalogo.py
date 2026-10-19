#!/usr/bin/env python3
"""Generate CATALOGO.md (Spanish catalog) from datos/catalogo.py. Usage: python3 herramientas/catalogo.py"""
import os
import sys

BIB = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(BIB, "datos"))
import catalogo as C  # noqa: E402

CABEZA = """# Catálogo de simulaciones B&N

[← Volver al README](README.md)

Este es el catálogo de todas las simulaciones y efectos de los videos de B&N: la serie de electromagnetismo, el reel «De lo discreto a lo continuo» y todas las versiones del teaser de B&N Lectures, incluidas las que se habían sobrescrito y se recuperaron de las transcripciones de los agentes.

- **Catálogo:** {n} simulaciones y efectos, agrupados por tipo y con una miniatura cada uno (`miniaturas/<id>.png`).
- **`modulos/`:** copias limpias de las piezas más reutilizables, cada una con un `LEEME.md` que explica cómo integrarla.
- **`herramientas/`:**
  - `miniaturas.py` saca las miniaturas;
  - `catalogo.py` genera este catálogo desde `datos/catalogo.py`. Para agregar una entrada, edítala allí y vuelve a ejecutar los dos últimos.

Las rutas de las columnas «Dónde» y del mapa de versiones son relativas a la carpeta de trabajo de B&N, donde viven los proyectos de origen; de ellos se publican el teaser final ([bn-lectures-teaser](https://github.com/4mser/bn-lectures-teaser)), las clases de la serie ([bn-lectures-clases](https://github.com/4mser/bn-lectures-clases)) y, en este repositorio, los módulos de `modulos/`. Las versiones anteriores del teaser se leían con `git -C teaser-lectures show <tag>:<archivo>`. Para regenerar las miniaturas hace falta esa carpeta: `BN_VIDEOS=<ruta> python3 herramientas/miniaturas.py`.

## Mapa de versiones: de qué código salió cada video

### Teaser de B&N Lectures (`teaser-lectures`, rama `historial`)

| Versión | Tag (commit) | Video | Fidelidad de la reconstrucción |
|---|---|---|---|
| v1 «luminosa», 22:56 del 17 oct. Re mayor, carga → Lissajous → toro → pozo → teseracto → Mandelbrot → Lorenz → red → Fourier → epiciclos de la marca → logo | `v1-luminosa` (28b96d1) | El original se perdió (lo sobrescribió la v2). Re-render: `entregables/archivo/teaser-v1-luminosa-16x9.mp4` y `-4x5.mp4`; música en `-musica.wav` | `escenas.ts` es idéntico byte a byte al respaldo `escenas-v1.ts` que guardó el agente. Los cuadros a 9,5, 33 y 51,9 s coinciden con las capturas del mp4 original: PSNR de 39 a 41 dB, el nivel de la compresión |
| v2 «oscura, títulos», 23:23. Frigio, títulos de geometría, créditos e invitado Javier Patiño | `v2-oscura-titulos` (f130fe5) | El original (`L-BN-Lectures-teaser-16x9-v2.mp4`) se borró. Re-render: `entregables/archivo/teaser-v2-oscura-titulos-16x9.mp4` y `-4x5.mp4` | Cuadros a 8,3, 33 y 51,9 s: PSNR de 36 a 42 dB contra las capturas originales |
| v4 «Lo invisible», 00:03 del 18 oct | `v4-lo-invisible` (ec40252) | Original: `entregables/L-BN-Lectures-teaser.mp4`, `-16x9.mp4` y `-9x16.mp4`. Re-render: `entregables/archivo/teaser-v4-lo-invisible-*.mp4` | Cuadros 105, 996 y 1770 contra el mp4 original: PSNR de 40 a 45 dB |
| Final, previa A, 00:17 | `final-previa-a` (f62cc0d) | `entregables/PREVIA-final-logo-16x9-anterior.mp4` (cuadros 1275 a 1687) | PSNR de 40 dB contra la previa |
| Final, previa B: LIC animada, 00:32 | `final-previa-b` (e6f24a5) | `entregables/PREVIA-final-logo-16x9.mp4` y su copia `-v2.mp4` | PSNR de 37 a 39 dB contra la previa |
| Final «epiciclos», 00:43 | `final-epiciclos` (e65f644) | `entregables/PREVIA-final-logo-16x9-v3.mp4` (solo el tramo final). Video completo, nuevo: `entregables/archivo/teaser-final-epiciclos-16x9.mp4` y `-4x5.mp4` | Su árbol de git es idéntico al snapshot de `main` (d6379a9), incluido `musica.wav` |

- El commit raíz de `historial` (94b232a) es la plantilla tal como se copió. `main` no se tocó.
- La reconstrucción reprodujo, en orden, cada Write, Edit y comando Bash de los agentes sobre una copia aislada. Los generadores (`generar_musica.py`, `lic.py`, `lic_animada.py`, `marca.py`) son deterministas: la música regenerada de la v4 y el final es idéntica byte a byte a la actual.
- Los re-renders usaron el mismo `herramientas/render.py` del proyecto, con concurrencia 2. El 9:16 de v1 y v2 no se re-renderizó, pero cada tag lo puede generar.

### Otros proyectos

| Proyecto | Commit | Videos en `entregables/` |
|---|---|---|
| Reel «De lo discreto a lo continuo» `BN_Electromagnetismo` (repo de un tercero; solo lectura) | ccf0600 | `0-De-lo-discreto-a-lo-continuo.mp4`, `-16x9.mp4` y `-9x16.mp4` |
| `del-ambar-a-millikan` | 7cca2ba | `1-Del-ambar-a-la-carga-elemental*.mp4` |
| `ley-de-coulomb` | 1da4211 | `2-La-ley-de-Coulomb*.mp4` |
| `lineas-de-campo` | 8d72675 | `3-El-campo-electrico-y-sus-lineas*.mp4` |
| `carga-en-un-campo` | b54ff0d | `4-Una-carga-en-un-campo*.mp4` |
| `densidades-no-uniformes` | f67e612 | `5-Densidades-no-uniformes*.mp4` |
| `teaser-cuerpo` | c0ad430 | `PREVIA-acto1-16x9.mp4`, `PREVIA-acto2-3-16x9.mp4` |
| `teaser-v5` | d7b70ba | `PREVIA-v5-4x5.mp4`, `PREVIA-v5-4x5-borrador.mp4`. El borrador se renderizó a las 01:18, después del último cambio de `src/`, así que sale del mismo código |
| `teaser-v6` (en desarrollo) | f6315bf / f558b3c | `PREVIA-v6-4x5.mp4`, `PREVIA-v6-simulaciones-crudas.png`. Es trabajo en curso: el commit puede no coincidir con la previa |

- Los 4:5 y 16:9 de la serie son del 17 oct a las 20:24.
- Los 9:16 son del mismo día a las 22:07, después de `parche_tiktok.py`, que agregó el formato TikTok a los proyectos.
- `teaser-cuerpo` y `teaser-v5` se hicieron en una sola pasada cada uno: no tienen versiones sobrescritas que recuperar.

## Módulos reutilizables (`modulos/`)

| Módulo | Origen | Qué es |
|---|---|---|
| `motor-gpu/` | `teaser-v5/src/gpu` | Motor WebGL2: mundos raymarcheados, un millón de partículas, trazos, bloom y grade ACES |
| `lic/` | `teaser-lectures/herramientas` | `lic.py` y `lic_animada.py`: texturas LIC del campo de dos cargas |
| `analisis-musica/` | `teaser-v5/herramientas` (+ copia v6) | `analizar_musica.py` (mp3 → `ritmo.json`) y `sincronia.py` (QA de sincronía) |
| `final-epiciclos/` | `teaser-lectures/src/final.ts` | Final con epiciclos, partículas y logo, más `marca.json` y `marca.py`; compila solo |
| `simulador-v6/` | `teaser-v6/herramientas` (18 oct, 02:10) | `simular.py`: onda FDTD → Schrödinger → fluido → Gray-Scott → Ising, encadenados |
| `lab-serie/` | `plantilla/src/lab` | Helpers canvas de la serie: `luz.ts`, `motor.tsx`, `proyeccion.ts` y `theme.ts` |
| `musica/` | todas las versiones | Generadores numpy de la serie y del teaser (v1, v2 y v4), incluidos los recuperados |

## Respaldos de video (`entregables/`)

Nada de `entregables/` se movió ni se sobrescribió. Lo nuevo está en `entregables/archivo/`:

| Archivo | Contenido |
|---|---|
| `teaser-v1-luminosa-16x9.mp4`, `-4x5.mp4`, `-musica.wav` | v1 recuperada (52 s) |
| `teaser-v2-oscura-titulos-16x9.mp4`, `-4x5.mp4`, `-musica.wav` | v2 recuperada (52 s) |
| `teaser-v4-lo-invisible-16x9.mp4`, `-4x5.mp4`, `-musica.wav` | v4 re-renderizada (60 s); el original sigue en `L-BN-Lectures-teaser*.mp4` |
| `teaser-final-epiciclos-16x9.mp4`, `-4x5.mp4`, `-musica.wav` | Final completo (56,25 s); antes solo existían las previas del tramo final. Su wav es la pista de la v4 sin recortar (el video arranca a los 3,75 s) |

**Columnas del catálogo:**
- **Dónde:** proyecto o versión y archivo con la función o el shader.
- **Depende de:**
  - «canvas 2D» es el motor de `src/lab`;
  - «motor GPU» es `src/gpu`;
  - `ritmo.json` es el mapa de eventos de la música;
  - `voz.json` es la línea de tiempo de la voz de la serie.
- **Reutilizable:** alta, media o baja, con el motivo.
"""


def celda(s):
    return str(s).replace("|", "\\|")


def main():
    E = C.E
    out = [CABEZA.format(n=len(E))]
    out.append("## Índice\n")
    for g, nombre in C.GRUPOS:
        k = sum(1 for e in E if e[1] == g)
        ancla = nombre.lower().replace(" ", "-")  # GitHub keeps accented letters in heading anchors
        out.append(f"- [{nombre}](#{ancla}) ({k})")
    out.append("")
    for g, nombre in C.GRUPOS:
        items = [e for e in E if e[1] == g]
        if not items:
            continue
        out.append(f"## {nombre}\n")
        out.append("| Miniatura | Simulación | Qué muestra | Dónde | Depende de | Reutilizable |")
        out.append("|---|---|---|---|---|---|")
        for id_, _, nom, que, proy, archivo, dep, reuso, _thumb in items:
            etiqueta, base = C.PROYECTOS[proy]
            img = f'<img src="miniaturas/{id_}.png" width="200">'
            out.append(f"| {img} | **{celda(nom)}**<br>`{id_}` | {celda(que)} | {celda(etiqueta)}<br>`{celda(archivo)}` | {celda(dep)} | {celda(reuso)} |")
        out.append("")
    out.append("## Lo que no se pudo recuperar\n")
    out.append("- Los mp4 originales de v1 y v2 se perdieron. Los de `entregables/archivo/` son re-renders del código reconstruido, no los archivos originales, aunque cuadro a cuadro coinciden con las capturas que quedaron.")
    out.append("- No hay estados intermedios dentro de cada versión, solo el estado al entregar. La excepción son las dos previas del final.")
    out.append("- `teaser-v6` sigue en desarrollo: su catálogo y su `simular.py` reflejan el 18 oct a las 02:10, y sus miniaturas son capturas existentes de `teaser-v6/out/rev2/`.")
    open(os.path.join(BIB, "CATALOGO.md"), "w", encoding="utf-8").write("\n".join(out) + "\n")
    print("CATALOGO.md:", len(E), "entradas")


if __name__ == "__main__":
    main()
