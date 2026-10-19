<p align="center">
  <img src="docs/assets/hero.gif" width="100%" alt="Mosaico de miniaturas de simulaciones que cambian una a una: líneas de campo, un agujero negro, un fluido, reacción-difusión, el atractor de Lorenz y escenas de la serie de electromagnetismo">
</p>

<p align="center">
  <a href="CATALOGO.md"><b>Catálogo completo</b></a> &nbsp;·&nbsp;
  <a href="https://github.com/4mser/bn-lectures"><b>B&N Lectures</b></a> &nbsp;·&nbsp;
  <a href="https://bnsolutions.cl/lectures"><b>bnsolutions.cl/lectures</b></a> &nbsp;·&nbsp;
  <a href="README.en.md">Read in English</a>
</p>

Cada video de B&N Lectures está hecho de simulaciones: líneas de campo integradas con RK4, un paquete cuántico que cruza una doble rendija, un fluido que nace de ese paquete, rayos que se curvan alrededor de un agujero negro. Esta biblioteca las reúne todas. Son 192 simulaciones y efectos, sacados de la serie de Electricidad y Magnetismo, del reel original y de cada versión del teaser, incluidas las que se habían perdido y se reconstruyeron.

Cada entrada del catálogo tiene su miniatura, lo que muestra con su ecuación o modelo, el archivo y la función de donde salió, de qué depende y qué tan fácil es reutilizarla. Las piezas más útiles están además copiadas en siete módulos limpios, listos para llevar a otro proyecto.

### `// 01` Qué hay aquí

| | |
|---|---|
| **[`CATALOGO.md`](CATALOGO.md)** | Las 192 entradas agrupadas por tipo, con miniatura, ecuación, origen, dependencias y reutilización, más el mapa de versiones: de qué código salió cada video. |
| **`miniaturas/`** | Una imagen por entrada, sacada del cuadro del video donde se ve la simulación. |
| **`modulos/`** | Siete piezas reutilizables, cada una con un `LEEME.md` que explica qué hace y cómo integrarla. |
| **`datos/` y `herramientas/`** | El catálogo como datos de Python y los scripts que generan `CATALOGO.md` y las miniaturas. |

### `// 02` Una muestra

<table>
  <tr>
    <td width="25%" valign="top"><img src="miniaturas/gpu-hoyo-negro.png" width="100%" alt="Agujero negro con su disco de acreción curvado"><br><b>Agujero negro</b><br><sub>Rayos curvados tipo Schwarzschild, disco con Doppler beaming y esfera de fotones</sub></td>
    <td width="25%" valign="top"><img src="miniaturas/schrodinger.png" width="100%" alt="Paquete de ondas cuántico que atraviesa una doble rendija"><br><b>Schrödinger 2D</b><br><sub>iψₜ = −½∇²ψ + Vψ por split-step de Fourier, con difracción y túnel</sub></td>
    <td width="25%" valign="top"><img src="miniaturas/stable-fluids.png" width="100%" alt="Fluido azul con remolinos que sube desde abajo"><br><b>Stable fluids</b><br><sub>Navier-Stokes incompresible 2D que nace del estado cuántico por Madelung</sub></td>
    <td width="25%" valign="top"><img src="miniaturas/gray-scott.png" width="100%" alt="Patrón de reacción-difusión en forma de coral azul"><br><b>Gray-Scott</b><br><sub>Reacción-difusión con F = 0,055 y k = 0,062, sembrada con la tinta del fluido</sub></td>
  </tr>
  <tr>
    <td width="25%" valign="top"><img src="miniaturas/gpu-lorenz.png" width="100%" alt="Atractor de Lorenz en rosa y amarillo hecho de partículas"><br><b>Atractor de Lorenz</b><br><sub>Un millón de partículas integradas con RK4 en una textura de la GPU</sub></td>
    <td width="25%" valign="top"><img src="miniaturas/gpu-prisma.png" width="100%" alt="Un haz blanco entra a un prisma y sale en un abanico de colores"><br><b>Prisma</b><br><sub>Vidrio raymarcheado con Fresnel y abanico espectral</sub></td>
    <td width="25%" valign="top"><img src="miniaturas/ising.png" width="100%" alt="Dominios magnéticos de un modelo de Ising que se ordenan"><br><b>Modelo de Ising</b><br><sub>Metropolis en tablero bajo la temperatura crítica, con un campo que crece</sub></td>
    <td width="25%" valign="top"><img src="miniaturas/julia.png" width="100%" alt="Conjunto de Julia azul con dos trayectorias de Lorenz encima"><br><b>Conjunto de Julia</b><br><sub>z ↦ z² + c, con c que avanza un paso por pulso de la música</sub></td>
  </tr>
</table>

<table>
  <tr>
    <td width="50%" valign="top"><img src="miniaturas/rutherford.png" width="100%" alt="Partículas alfa contra una lámina de oro; una rebota"><br><b>Dispersión de Rutherford</b><br><sub>Repulsión K/r² integrada con paso adaptativo: una alfa de cada varios miles rebota</sub></td>
    <td width="50%" valign="top"><img src="miniaturas/nacen-mueren.png" width="100%" alt="Líneas de campo que nacen en +2q y mueren en −q"><br><b>Nacen y mueren</b><br><sub>+2q y −q con doce líneas por unidad de carga: la mitad termina en −q y el resto se va al infinito</sub></td>
  </tr>
</table>

### `// 03` Categorías

| Categoría | Entradas | | Categoría | Entradas |
|---|---|---|---|---|
| [Campo eléctrico](CATALOGO.md#campo-eléctrico) | 79 | | [Cuántica](CATALOGO.md#cuántica) | 6 |
| [Finales y logo](CATALOGO.md#finales-y-logo) | 16 | | [Fractales](CATALOGO.md#fractales) | 6 |
| [Motores y postproceso](CATALOGO.md#motores-y-efectos-de-postproceso) | 16 | | [Computación e IA](CATALOGO.md#computación-e-ia) | 5 |
| [Tipografía y créditos](CATALOGO.md#tipografía-y-créditos) | 15 | | [Caos](CATALOGO.md#caos) | 4 |
| [Gravedad y órbitas](CATALOGO.md#gravedad-y-órbitas) | 13 | | [Fluidos](CATALOGO.md#fluidos) | 2 |
| [Música y análisis de audio](CATALOGO.md#música-y-análisis-de-audio) | 10 | | [Probabilidad](CATALOGO.md#probabilidad) | 2 |
| [Ondas](CATALOGO.md#ondas) | 9 | | [Geometría y topología](CATALOGO.md#geometría-y-topología) | 9 |

### `// 04` Los módulos

| Módulo | Qué hace | Necesita |
|---|---|---|
| [`motor-gpu`](modulos/motor-gpu/LEEME.md) | Motor WebGL2: mundos raymarcheados (agujero negro, prisma, ondas, nebulosa, toro, fractal), hasta un millón de partículas, trazos 3D, bloom y grade ACES. Cada cuadro sale de `estado(t, W, H)` | Remotion, Chrome con ANGLE |
| [`lic`](modulos/lic/LEEME.md) | Texturas LIC del campo de dos cargas, fijas y animadas en un loop de 60 cuadros sin costura | numpy, imageio-ffmpeg |
| [`analisis-musica`](modulos/analisis-musica/LEEME.md) | Del mp3 a un mapa de eventos (bombo, caja, hats, secciones, risers) a 30 fps, y la medición de la sincronía sobre el mp4 terminado | numpy, imageio-ffmpeg |
| [`final-epiciclos`](modulos/final-epiciclos/LEEME.md) | Epiciclos de Fourier que dibujan una marca, partículas que aterrizan en el logo y el campo que se revela | canvas 2D, `ritmo.json` |
| [`simulador-v6`](modulos/simulador-v6/LEEME.md) | Simulaciones encadenadas y precalculadas: onda FDTD → Schrödinger → fluido → Gray-Scott → Ising | numpy |
| [`lab-serie`](modulos/lab-serie/LEEME.md) | El motor canvas de la serie: líneas de campo integradas, partículas, cargas con brillo y el lienzo que se adapta a 4:5, 16:9 y 9:16 | Remotion |
| [`musica`](modulos/musica/LEEME.md) | Generadores de música y efectos con numpy, deterministas byte a byte, que escriben el wav y su mapa de eventos | numpy |

### `// 05` Cómo usar un módulo

1. Lee su `LEEME.md`: dice de qué proyecto salió, qué archivos trae y qué espera encontrar.
2. Copia la carpeta a tu proyecto. Los módulos de TypeScript van en `src/` de un proyecto [Remotion](https://www.remotion.dev); los de Python, en `herramientas/` o `audio/`.
3. Instala lo que pida. Para los scripts de Python basta un entorno con `numpy` e `imageio-ffmpeg` (y `pillow` para las hojas de contacto); los módulos de TypeScript compilan con `tsc --noEmit` tal como están.
4. Si el módulo depende de la música (`ritmo.json`), genera el tuyo con `analisis-musica` o con uno de los generadores de `musica`.

Para una clase nueva conviene partir de la plantilla de [bn-lectures-clases](https://github.com/4mser/bn-lectures-clases/tree/main/plantilla), que ya trae `lab-serie`, las fuentes y las herramientas de render. Para algo en la línea del teaser, el proyecto completo está en [bn-lectures-teaser](https://github.com/4mser/bn-lectures-teaser).

### `// 06` Mantener el catálogo

```bash
python3 herramientas/catalogo.py                              # datos/catalogo.py → CATALOGO.md
BN_VIDEOS=<carpeta de trabajo> python3 herramientas/miniaturas.py   # vuelve a sacar las miniaturas
```

Para sumar una entrada, agrégala en `datos/catalogo.py` y corre los dos scripts. Las rutas de la columna «Dónde» son relativas a la carpeta de trabajo de B&N, donde viven los proyectos de origen; los que están publicados son [el teaser](https://github.com/4mser/bn-lectures-teaser) y [las clases](https://github.com/4mser/bn-lectures-clases).

### `// 07` Equipo

| | |
|---|---|
| **Nicolás Moreno**<br>[@4mser](https://github.com/4mser) | Cofundador de B&N Solutions e ingeniero de software. Creó el motor de simulación de B&N Lab y desarrolla las animaciones y los videos. |
| **Benjamín Campos**<br>[@B3njjaman](https://github.com/B3njjaman) | Cofundador de B&N Solutions e ingeniero físico. Creó el reel original de la serie, «De lo discreto a lo continuo». |
| **Javier Patiño** | Licenciado en Física y profesor de Electricidad y Magnetismo. Autor de los apuntes en que se basan las clases y la voz de B&N Lectures. |

### `// 08` Licencia

El código y la documentación están bajo la [licencia MIT](LICENSE), © 2026 B&N Solutions.

La marca B&N, su logo y el nombre «B&N Lectures» quedan fuera de MIT: aparecen en `modulos/final-epiciclos/marca.json` y en algunas miniaturas, y siguen siendo de B&N Solutions ([TRADEMARKS.md](TRADEMARKS.md)). Las técnicas de otros autores que usan los módulos (LIC de Cabral y Leedom y de Forssell, stable fluids de Stam, Gray y Scott, Lorenz) están citadas en el catálogo.

---

<p align="center">
  <img src="docs/assets/footer.svg" width="100%" alt="Líneas de campo de un dipolo que fluyen entre dos cargas, con el texto simulación = f(t) y bnsolutions.cl/lectures">
</p>
