# Generadores de música sintetizada (numpy)

Cada script sintetiza la pista y sus efectos con numpy y escribe `public/musica.wav` y `src/ritmo.json`, el mapa de eventos que mueve las animaciones. Son deterministas: al regenerarlos dan el mismo wav, byte a byte.

- `generar_musica_serie.py`: la música de la plantilla y de los videos de la serie.
- `generar_musica_v1.py`: teaser v1 «luminosa», en Re mayor (I–V–vi–IV, motivo de 5 notas), 52 s. Recuperado de las transcripciones.
- `generar_musica_v2.py`: teaser v2 «oscura», en frigio, con braams, 52 s. Recuperado.
- `generar_musica_v4.py`: teaser v4 «Lo invisible» y el final, 60 s, con acordes, ostinato, golpes, swells y silencios. Es el mismo script que hoy está en `teaser-lectures` y `teaser-cuerpo`.

Uso: `PYTHONPATH=pylib python3 audio/generar_musica.py`. Las escenas leen los campos de `ritmo.json`, así que cada versión de la música va con las escenas de su versión (ver los tags de `teaser-lectures`).
