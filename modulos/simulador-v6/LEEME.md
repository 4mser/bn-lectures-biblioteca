# Simulador físico precalculado (teaser v6)

Copia de `teaser-v6/herramientas/simular.py` y `ver_sim.py` tal como estaban el 18 de octubre de 2026 a las 02:10. Ese proyecto seguía en desarrollo: revisa la versión vigente allí antes de reusarlo.

`simular.py` precalcula con numpy, con semillas fijas, simulaciones encadenadas (el estado final de una es la condición inicial de la siguiente) y las guarda cuadro a cuadro en `public/sim/<nombre>/NNNNN.gzb`, más `public/sim/manifiesto.json`:
- `onda`: ecuación de onda 2D (FDTD con borde absorbente). Gotas en los bombos y dos fuentes coherentes que interfieren.
- `schro`: Schrödinger 2D (split-step de Fourier). Un paquete gaussiano contra una doble rendija finita, así que también hay efecto túnel.
- `fluido`: Navier-Stokes incompresible (stable fluids de Stam, MacCormack y confinamiento de vorticidad). Nace del paquete cuántico por la transformación de Madelung.
- `gs`: reacción-difusión de Gray-Scott (F = 0,055; k = 0,062), sembrada con la tinta del fluido.
- `ising`: Ising 2D (Metropolis en tablero de ajedrez), sembrado con el patrón de Turing.

## Cómo integrarlo
1. Necesita `src/ritmo.json` con `pulso`, `compas` y `primerCompas` (lo escribe `../analisis-musica/analizar_musica.py`).
2. Ejecuta `PYTHONPATH=../pylib python3 herramientas/simular.py [etapa ...]`. Hay una caché en `out/simcache`.
3. `ver_sim.py` saca una vista rápida de los cuadros guardados. El lector del lado de Remotion está en `teaser-v6/src/gpu/campos.ts`.
