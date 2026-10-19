# Texturas LIC del campo de dos cargas

Origen: `teaser-lectures/herramientas/`. Es idéntico en `teaser-v5` y `teaser-v6`.

- `lic.py`: LIC (*line integral convolution*, Cabral y Leedom) del campo real de un dipolo, E = Σ q·r/|r|³, con +q a la izquierda y −q a la derecha. Escribe una imagen por formato en `public/img/campo-<formato>.png`.
- `lic_animada.py`: LIC animada (técnica de Forssell). El núcleo Hann·(1 + m·cos(Φ(s) − θ)) hace que las hebras fluyan de +q a −q. Basta una integración por formato para sacar los N = 60 cuadros de un loop sin costura. Escribe `public/img/campo-<formato>/fNN.jpg`.

## Cómo integrarlo
1. Cópialos a `herramientas/` y ajusta `FORMATOS` (nombre, ancho, alto, y de las cargas, escala), que debe coincidir con tu `disposicion.ts`. Las cargas están a ±400·s px del centro.
2. Ejecuta `PYTHONPATH=pylib python3 herramientas/lic.py` y `... lic_animada.py 169 45 916`. Solo dependen de numpy e imageio-ffmpeg y usan semilla fija, así que el resultado es determinista.
3. En Remotion, carga el cuadro `f{frame % 60}.jpg` con `delayRender` (ver `useCuadro` en `teaser-lectures/src/Video.tsx`).
