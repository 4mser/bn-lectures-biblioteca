# Análisis de la música y revisión de sincronía

Origen: `teaser-v5/herramientas/`. `analizar_musica_v6.py` es la copia de `teaser-v6` del 18 de octubre; solo cambia `FIN_VIDEO` (64 s en vez de 62 s).

- `analizar_musica.py`: decodifica el mp3, calcula una STFT a 100 Hz y la energía por bandas (graves, medios y agudos), y detecta onsets por banda (bombo, caja y hats) con un umbral adaptativo. Verifica el tempo por autocorrelación y regresión de las cajas, detecta secciones, fills y risers, y escribe `src/ritmo.json` (eventos y curvas cuadro a cuadro a 30 fps) y `public/musica.wav` con el tramo usado y su fundido.
- `sincronia.py`: sobre el mp4 ya renderizado, calcula la correlación de Pearson entre la luminancia por cuadro y la envolvente de graves (con desfases de ±3 cuadros) y arma hojas de cuadros antes y después de cada golpe.

## Cómo integrarlo
1. Cambia `MP3`, `BPM_CONOCIDO`, `PRIMER_COMPAS_CONOCIDO` y `FIN_VIDEO` para la nueva canción.
2. Ejecuta `PYTHONPATH=../pylib python3 herramientas/analizar_musica.py`.
3. Lee los datos en Remotion con un `ritmo.ts` como el de `../motor-gpu/ritmo.ts`.
4. La canción de v5 y v6 es de un tercero (ver `audio/CREDITOS-musica.md` en esos proyectos) y no se copia aquí.
