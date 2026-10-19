# Catálogo de simulaciones B&N

[← Volver al README](README.md)

Este es el catálogo de todas las simulaciones y efectos de los videos de B&N: la serie de electromagnetismo, el reel original y todas las versiones del teaser de B&N Lectures, incluidas las que se habían sobrescrito y se recuperaron de las transcripciones de los agentes.

- **Catálogo:** 192 simulaciones y efectos, agrupados por tipo y con una miniatura cada uno (`miniaturas/<id>.png`).
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
| Reel original `BN_Electromagnetismo` (repo de un tercero; solo lectura) | ccf0600 | `0-De-lo-discreto-a-lo-continuo.mp4`, `-16x9.mp4` y `-9x16.mp4` |
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

## Índice

- [Campo eléctrico](#campo-eléctrico) (79)
- [Gravedad y órbitas](#gravedad-y-órbitas) (13)
- [Ondas](#ondas) (9)
- [Fluidos](#fluidos) (2)
- [Cuántica](#cuántica) (6)
- [Caos](#caos) (4)
- [Fractales](#fractales) (6)
- [Geometría y topología](#geometría-y-topología) (9)
- [Computación e IA](#computación-e-ia) (5)
- [Probabilidad](#probabilidad) (2)
- [Tipografía y créditos](#tipografía-y-créditos) (15)
- [Finales y logo](#finales-y-logo) (16)
- [Motores y efectos de postproceso](#motores-y-efectos-de-postproceso) (16)
- [Música y análisis de audio](#música-y-análisis-de-audio) (10)

## Campo eléctrico

| Miniatura | Simulación | Qué muestra | Dónde | Depende de | Reutilizable |
|---|---|---|---|---|---|
| <img src="miniaturas/carga-sonda.png" width="200"> | **Carga puntual y sonda 1/r²**<br>`carga-sonda` | E ∝ 1/r²: rayos radiales con partículas; la flecha a 2r mide un cuarto de la de r | BN_Electromagnetismo = plantilla<br>`E00UnaCarga.tsx: step, sonda` | canvas 2D (lab), voz.json | alta: sonda y rayos sirven para cualquier carga |
| <img src="miniaturas/superposicion.png" width="200"> | **Superposición vectorial en P**<br>`superposicion` | E = ΣEᵢ de 3 cargas, punta con cola, resultante y líneas con `trazar` (RK2). Variantes en lineas-de-campo E06 y ley-de-coulomb E11 (fuerzas) | BN_Electromagnetismo = plantilla<br>`E01Superposicion.tsx: step` | canvas 2D (lab), voz.json | alta: patrón repetido en tres videos |
| <img src="miniaturas/electrones-1nc.png" width="200"> | **Contador de electrones en 1 nC**<br>`electrones-1nc` | 1 nC/e = 6 241 509 074; contador logarítmico; la nube se aplana en barra continua | BN_Electromagnetismo = plantilla<br>`E02Millones.tsx: step` | canvas 2D, voz.json | media: la transición discreto→continuo sirve |
| <img src="miniaturas/densidades.png" width="200"> | **Densidades λ, σ, ρ**<br>`densidades` | Línea, superficie 3D y cubo de volumen con el trocito dq latiendo | BN_Electromagnetismo = plantilla<br>`E03Densidad.tsx: lineaCargada, superficie, volumen, cubo` | canvas 2D, proyeccion.ts, KaTeX | alta: las tres distribuciones generales |
| <img src="miniaturas/riemann.png" width="200"> | **Suma de Riemann que converge**<br>`riemann` | Barra partida en N = 2, 4, 8, 16 cargas (punto medio); la resultante se acerca al campo exacto en la mediatriz | BN_Electromagnetismo = plantilla<br>`E04Riemann.tsx: trozos, step` | canvas 2D, voz.json | alta: ilustra cualquier límite de una suma |
| <img src="miniaturas/suma-integral.png" width="200"> | **De la suma a la integral**<br>`suma-integral` | Σ kΔq/r² → ∫ k dq/r², líneas de una barra de 40 cargas | BN_Electromagnetismo = plantilla<br>`E05Integral.tsx: step` | canvas 2D, KaTeX | media: la barra con líneas es genérica |
| <img src="miniaturas/arco.png" width="200"> | **Arco: la simetría cancela**<br>`arco` | E = 2kλ sinθ₀/r; pares simétricos cancelan; el arco se vuelve anillo y E = 0 al centro | BN_Electromagnetismo = plantilla<br>`E06Arco.tsx: arcoLuz, step` | canvas 2D, KaTeX | media: `arcoLuz` es reutilizable |
| <img src="miniaturas/anillo-ez.png" width="200"> | **Anillo en 3D con gráfico E(z)**<br>`anillo-ez` | E = kQz/(z²+R²)^{3/2}; P recorre el eje; de lejos tiende a kQ/z² | BN_Electromagnetismo = plantilla<br>`E07Anillo.tsx: grafico, step` | canvas 2D, proyeccion.ts, KaTeX | alta: 3D más gráfico vivo |
| <img src="miniaturas/disco.png" width="200"> | **Disco como pila de anillos**<br>`disco` | E = σ/2ε₀·(1 − z/√(z²+R²)); malla en perspectiva que se llena anillo por anillo | BN_Electromagnetismo = plantilla<br>`E08Disco.tsx: step` | canvas 2D, proyeccion.ts (mallaDisco), KaTeX | alta: malla 3D general |
| <img src="miniaturas/plano-infinito.png" width="200"> | **Plano infinito visto de canto**<br>`plano-infinito` | El segmento crece sin límite y E = σ/2ε₀ queda constante | BN_Electromagnetismo = plantilla<br>`E09Plano.tsx: step` | canvas 2D, KaTeX | media: sirve para placas |
| <img src="miniaturas/barra-eje.png" width="200"> | **Barra en su eje**<br>`barra-eje` | Aportes ∝ 1/d² apilados; E = kλL/(x₀(x₀+L)) | BN_Electromagnetismo = plantilla<br>`E10BarraEje.tsx: step` | canvas 2D, KaTeX | media: apilado de aportes |
| <img src="miniaturas/barra-mediatriz.png" width="200"> | **Barra en la mediatriz**<br>`barra-mediatriz` | Las horizontales se cancelan; E = 2kλ sinβ₀/y | BN_Electromagnetismo = plantilla<br>`E11Mediatriz.tsx: step` | canvas 2D, KaTeX | media |
| <img src="miniaturas/barra-infinita.png" width="200"> | **Barra infinita**<br>`barra-infinita` | β₀ → 90°: E = 2kλ/y frente a un fantasma 1/y² | BN_Electromagnetismo = plantilla<br>`E12BarraInfinita.tsx: step` | canvas 2D, KaTeX | media: compara leyes de decaimiento |
| <img src="miniaturas/patron-1r.png" width="200"> | **Patrón 1/r², 1/r, r⁰**<br>`patron-1r` | Punto, línea y plano en 3D, cada uno con sonda a doble distancia | BN_Electromagnetismo = plantilla<br>`E13Patron.tsx: plano, sonda, step` | canvas 2D, proyeccion.ts, KaTeX | alta: resumen visual muy claro |
| <img src="miniaturas/ambar.png" width="200"> | **Ámbar frotado atrae plumas**<br>`ambar` | Electrización por frotamiento: aparecen cargas − y vuelan plumas y pajitas | del-ambar-a-millikan<br>`E00Ambar.tsx: step, pluma, pajita` | canvas 2D, voz.json | baja: narrativa específica |
| <img src="miniaturas/guericke.png" width="200"> | **Muestras de Gilbert y globo de Guericke**<br>`guericke` | Esfera de azufre girando que acumula carga y chispas | del-ambar-a-millikan<br>`E01Guericke.tsx: poligono, step` | canvas 2D | media: esfera giratoria vistosa |
| <img src="miniaturas/gray-hilo.png" width="200"> | **Gray: carga que viaja por un hilo**<br>`gray-hilo` | Conductores y aislantes: cargas que recorren un hilo hasta una esfera | del-ambar-a-millikan<br>`E02Gray.tsx: step` | canvas 2D | media: conducción |
| <img src="miniaturas/dufay.png" width="200"> | **Péndulos de Du Fay**<br>`dufay` | Iguales se repelen, distintas se atraen, con flechas de fuerza | del-ambar-a-millikan<br>`E03DuFay.tsx: step` | canvas 2D | media: péndulos electrostáticos |
| <img src="miniaturas/franklin.png" width="200"> | **Franklin: un solo fluido**<br>`franklin` | Conservación de la carga: negativas pasan del vidrio al paño; carga neta contada | del-ambar-a-millikan<br>`E04Franklin.tsx: step` | canvas 2D | media |
| <img src="miniaturas/priestley.png" width="200"> | **Cáscara esférica de Priestley**<br>`priestley` | Teorema de la cáscara: puntos de Fibonacci en 3D, fuerza 1/r² sumada nula adentro | del-ambar-a-millikan<br>`E05Priestley.tsx: step` | canvas 2D, KaTeX | alta: anticipa la ley de Gauss |
| <img src="miniaturas/balanza-cavendish.png" width="200"> | **Balanza de torsión (historia)**<br>`balanza-cavendish` | θ = θ₀(d₀/d)²; esferas de Cavendish y balanza desde arriba | del-ambar-a-millikan<br>`E06Coulomb.tsx: step` | canvas 2D | media: hay versión dinámica en ley-de-coulomb |
| <img src="miniaturas/rutherford.png" width="200"> | **Dispersión de Rutherford**<br>`rutherford` | Repulsión K/r² integrada con paso adaptativo; una alfa rebota en la lámina | del-ambar-a-millikan<br>`E07Rutherford.tsx: step` | canvas 2D | alta: integrador de trayectorias con estela |
| <img src="miniaturas/millikan.png" width="200"> | **Gota de Millikan suspendida**<br>`millikan` | qE = mg; velocidad terminal ∝ mg − qE entre placas | del-ambar-a-millikan<br>`E10Millikan.tsx: step` | canvas 2D, KaTeX | alta: placas y gotas |
| <img src="miniaturas/regla-log.png" width="200"> | **Regla logarítmica de electrones**<br>`regla-log` | n = Q/e de 10⁰ a 10¹⁹; una fila discreta se vuelve continua | del-ambar-a-millikan<br>`E12Coulomb.tsx: marca, step` | canvas 2D, KaTeX | media: regla logarítmica genérica |
| <img src="miniaturas/electrizacion.png" width="200"> | **Electrización por contacto e inducción**<br>`electrizacion` | Contacto deja el mismo signo; inducción con tierra el opuesto | del-ambar-a-millikan<br>`E13Electrizacion.tsx: step` | canvas 2D, lab/historia.ts | media |
| <img src="miniaturas/esfera-punto.png" width="200"> | **De esfera a carga puntual**<br>`esfera-punto` | Tamaño/distancia de 0,30 a 0,002 en escala log: la esfera se vuelve punto | ley-de-coulomb<br>`E00Reposo.tsx: step` | canvas 2D, lab/cargas.ts | media |
| <img src="miniaturas/atrae-repele.png" width="200"> | **¿Atracción o repulsión?**<br>`atrae-repele` | Cambia el signo y se invierten las fuerzas | ley-de-coulomb<br>`E01Pregunta.tsx: step` | canvas 2D | baja: introducción |
| <img src="miniaturas/balanza-dinamica.png" width="200"> | **Balanza de torsión dinámica**<br>`balanza-dinamica` | κθ = ℓF cos(θ/2), F ∝ 1/d²; giro amortiguado al equilibrio | ley-de-coulomb<br>`E02Balanza.tsx: step` | canvas 2D, KaTeX | alta: oscilador amortiguado real |
| <img src="miniaturas/producto-cargas.png" width="200"> | **Producto de cargas**<br>`producto-cargas` | F ∝ \|q₁\|\|q₂\|: duplicar q₂ duplica F | ley-de-coulomb<br>`E03Producto.tsx: step` | canvas 2D, KaTeX | media |
| <img src="miniaturas/inverso-cuadrado.png" width="200"> | **Inverso del cuadrado con gráfico**<br>`inverso-cuadrado` | F(r) = F₀/r² dibujándose con un punto que sigue la separación | ley-de-coulomb<br>`E04Cuadrado.tsx: step` | canvas 2D | alta: gráfico vivo genérico |
| <img src="miniaturas/central.png" width="200"> | **Fuerza central y acción-reacción**<br>`central` | F₂₁ = −F₁₂ por la recta que une las cargas | ley-de-coulomb<br>`E05Central.tsx: step` | canvas 2D, KaTeX | media |
| <img src="miniaturas/constante-k.png" width="200"> | **Constante k_e**<br>`constante-k` | F = k_e\|q₁q₂\|/r², k_e = 1/4πε₀ | ley-de-coulomb<br>`E06Constante.tsx: step` | canvas 2D, KaTeX | baja: casi solo fórmula |
| <img src="miniaturas/forma-vectorial.png" width="200"> | **Forma vectorial de Coulomb**<br>`forma-vectorial` | F₁₂ = k q₁q₂ (r₂−r₁)/\|r₂−r₁\|³ con q₂ orbitando | ley-de-coulomb<br>`E07Vector.tsx: step` | canvas 2D, KaTeX | alta: vectores posición sobre ejes |
| <img src="miniaturas/ordenes-39.png" width="200"> | **39 órdenes de magnitud**<br>`ordenes-39` | Átomo de H: escala log de 10⁻⁵⁰ a 10⁻⁴ N, barra que sube década por década | ley-de-coulomb<br>`E09Ordenes.tsx: step` | canvas 2D, fisica.tsx (CODATA) | alta: escala logarítmica visual |
| <img src="miniaturas/tres-en-linea.png" width="200"> | **Tres cargas en línea**<br>`tres-en-linea` | +2 µC, −3 µC y q₀: fuerzas en x y neta | ley-de-coulomb<br>`E12Linea.tsx: step` | canvas 2D | media: ejercicio 1D |
| <img src="miniaturas/equilibrio.png" width="200"> | **Equilibrio entre q y 4q**<br>`equilibrio` | x = d/3; q₀ se acomoda amortiguada | ley-de-coulomb<br>`E13Equilibrio.tsx: step` | canvas 2D, KaTeX | alta: búsqueda visual de equilibrio |
| <img src="miniaturas/faraday-limaduras.png" width="200"> | **Limaduras de Faraday**<br>`faraday-limaduras` | Dipolo: limaduras que caen y se alinean con E, luego líneas con partículas | lineas-de-campo<br>`E01Faraday.tsx: step` | canvas 2D, lab/campo.ts | alta: muy vistoso |
| <img src="miniaturas/definicion-e.png" width="200"> | **Definición E = F/q₀**<br>`definicion-e` | Duplicar q₀ duplica F; E no cambia | lineas-de-campo<br>`E03Definicion.tsx: step` | canvas 2D, KaTeX | media |
| <img src="miniaturas/convencion.png" width="200"> | **Convención de la carga de prueba**<br>`convencion` | F = qE: q₀ negativa invierte F, no E | lineas-de-campo<br>`E04Convencion.tsx: step` | canvas 2D, KaTeX | media |
| <img src="miniaturas/puntual-signo.png" width="200"> | **Carga puntual ±**<br>`puntual-signo` | E = kQ/r² r̂ hacia afuera o hacia adentro según el signo | lineas-de-campo<br>`E05Puntual.tsx: step` | canvas 2D, KaTeX | alta |
| <img src="miniaturas/tangente.png" width="200"> | **Tangente a la línea de campo**<br>`tangente` | Un punto recorre una línea del dipolo; ángulo cuerda-campo calculado | lineas-de-campo<br>`E07Tangente.tsx: step` | canvas 2D, lab/campo.ts | alta |
| <img src="miniaturas/nacen-mueren.png" width="200"> | **Nacen y mueren**<br>`nacen-mueren` | +2q/−q con 12 líneas por unidad; unas vuelven a −q, otras al infinito | lineas-de-campo<br>`E08Reglas.tsx: step` | canvas 2D, lab/campo.ts (lineas) | alta: conteo correcto de líneas |
| <img src="miniaturas/densidad-lineas.png" width="200"> | **Densidad de líneas**<br>`densidad-lineas` | \|E\| ∝ 1/r² y campo uniforme entre placas | lineas-de-campo<br>`E09Densidad.tsx: step` | canvas 2D | media |
| <img src="miniaturas/cuatro-signos.png" width="200"> | **Cuatro combinaciones de signos**<br>`cuatro-signos` | ++, +−, −+, −− con el punto nulo como cero de Eₓ | lineas-de-campo<br>`E10Cuatro.tsx: step` | canvas 2D, lab/campo.ts (cerosEje) | alta: rejilla 2×2 de dipolos |
| <img src="miniaturas/punto-nulo.png" width="200"> | **El punto nulo se mueve**<br>`punto-nulo` | q₂ variable; líneas recalculadas por cuadro, nulo buscado numéricamente, gráfica de Eₓ | lineas-de-campo<br>`E11Nulo.tsx: step` | canvas 2D, lab/campo.ts, KaTeX | alta: la simulación más rica de la serie |
| <img src="miniaturas/igualar.png" width="200"> | **Igualar magnitudes no basta**<br>`igualar` | ±Q: en el punto medio los aportes se suman | lineas-de-campo<br>`E12Igualar.tsx: step` | canvas 2D | media |
| <img src="miniaturas/uniforme-placas.png" width="200"> | **Campo uniforme entre placas**<br>`uniforme-placas` | Sondas en grilla 4×3 que miden el mismo vector | carga-en-un-campo<br>`E00Uniforme.tsx: step` | canvas 2D, lab/campo.ts (placas) | alta: pieza base |
| <img src="miniaturas/signo-fuerza.png" width="200"> | **El signo decide la fuerza**<br>`signo-fuerza` | F = qE con q = ±e, E = 10³ N/C | carga-en-un-campo<br>`E01Signo.tsx: step` | canvas 2D, KaTeX | media |
| <img src="miniaturas/razon-qm.png" width="200"> | **Razón q/m**<br>`razon-qm` | a = (q/m)E con razones 1, 2 y ½; t ∝ 1/√a | carga-en-un-campo<br>`E03Razon.tsx: step` | canvas 2D, KaTeX | media |
| <img src="miniaturas/tres-lanzamientos.png" width="200"> | **Tres lanzamientos +, 0, −**<br>`tres-lanzamientos` | Misma v₀, desvío según el signo | carga-en-un-campo<br>`E04Tres.tsx: step` | canvas 2D, lab/campo.ts (camino, rastro) | alta: trayectorias con rastro |
| <img src="miniaturas/estroboscopio.png" width="200"> | **Parábola estroboscópica**<br>`estroboscopio` | y = a_y x²/(2v₀²); caídas 1, 4, 9, 16 | carga-en-un-campo<br>`E05Parabola.tsx: step` | canvas 2D, lab/campo.ts (estrobo) | alta: muy didáctico |
| <img src="miniaturas/trayectoria-no-linea.png" width="200"> | **La trayectoria no es línea de campo**<br>`trayectoria-no-linea` | Lanzada a 60° frente a soltada en reposo | carga-en-un-campo<br>`E07Trayectoria.tsx: step` | canvas 2D | media |
| <img src="miniaturas/electron-campo.png" width="200"> | **Electrón en campo modesto**<br>`electron-campo` | a = eE/mₑ ≈ 1,76×10¹⁴ m/s² | carga-en-un-campo<br>`E08Electron.tsx: step` | canvas 2D, KaTeX | media |
| <img src="miniaturas/gravedad-despreciable.png" width="200"> | **Gravedad despreciable**<br>`gravedad-despreciable` | Barras log: g frente a a_E (≈10¹³) | carga-en-un-campo<br>`E09Despreciable.tsx: barra, step` | canvas 2D, lab/campo.ts (potencia) | alta: comparador logarítmico |
| <img src="miniaturas/centimetro.png" width="200"> | **Un centímetro: ns contra ms**<br>`centimetro` | t = √(2d/a): electrón frente a piedra | carga-en-un-campo<br>`E10Centimetro.tsx: step` | canvas 2D | media |
| <img src="miniaturas/gota-dos-campos.png" width="200"> | **Gota con dos campos**<br>`gota-dos-campos` | a = g + (q/m)E; equilibrio estilo Millikan | carga-en-un-campo<br>`E11Ambos.tsx: step` | canvas 2D, KaTeX | media |
| <img src="miniaturas/lambda-x.png" width="200"> | **λ uniforme a λ(x)**<br>`lambda-x` | Densidad pareja que pasa a rampa αx con el mismo total | densidades-no-uniformes<br>`E00Intro.tsx: step` | canvas 2D, lab/densidad.ts | alta: trazo de densidad variable |
| <img src="miniaturas/receta.png" width="200"> | **Receta de siete pasos**<br>`receta` | dq, r y β, dE con componentes, simetría, resultante y revisión | densidades-no-uniformes<br>`E01Receta.tsx: step` | canvas 2D, HTML | alta: método general |
| <img src="miniaturas/componentes.png" width="200"> | **Componentes, no módulos**<br>`componentes` | Suma vectorial frente a suma de módulos | densidades-no-uniformes<br>`E02Componentes.tsx: step` | canvas 2D | alta: error típico |
| <img src="miniaturas/barra-dq.png" width="200"> | **Barra λ = αx y dq**<br>`barra-dq` | dq = αx dx sobre [a, b] | densidades-no-uniformes<br>`E03BarraDq.tsx: step` | canvas 2D, barra.ts, densidad.ts | media |
| <img src="miniaturas/aportes-dx.png" width="200"> | **Aportes α dx/x**<br>`aportes-dx` | dE = −kα dx/x x̂; ocho trozos apilados | densidades-no-uniformes<br>`E04BarraAportes.tsx: step` | canvas 2D | media |
| <img src="miniaturas/integral-log.png" width="200"> | **Integral de 1/x = logaritmo**<br>`integral-log` | Área bajo 1/x = ln(b/a), verificada contra suma directa | densidades-no-uniformes<br>`E05BarraIntegral.tsx: step` | canvas 2D, densidad.ts (grafico) | alta: área acumulada |
| <img src="miniaturas/revisar-limite.png" width="200"> | **Revisar b → a**<br>`revisar-limite` | El campo se apaga; Q = α(b²−a²)/2 | densidades-no-uniformes<br>`E06BarraRevisar.tsx: step` | canvas 2D | media |
| <img src="miniaturas/misma-carga.png" width="200"> | **Misma carga, otro campo**<br>`misma-carga` | λ = αx frente a uniforme | densidades-no-uniformes<br>`E07BarraUniforme.tsx: barra, step` | canvas 2D | media |
| <img src="miniaturas/semicirculo.png" width="200"> | **Semicírculo λ₀ cosθ**<br>`semicirculo` | Q = 2λ₀R, densidad angular | densidades-no-uniformes<br>`E08Semicirculo.tsx: step` | canvas 2D, semi.ts | media |
| <img src="miniaturas/simetria-par.png" width="200"> | **Simetría con densidad par**<br>`simetria-par` | ∫ sinθ cosθ dθ = 0: pares ±θ cancelan Eₓ | densidades-no-uniformes<br>`E09Simetria.tsx: step` | canvas 2D | media |
| <img src="miniaturas/barrido-angular.png" width="200"> | **Barrido de la integral angular**<br>`barrido-angular` | E(P) = −πkλ₀/(2R) ŷ | densidades-no-uniformes<br>`E10SemiIntegral.tsx: step` | canvas 2D | media |
| <img src="miniaturas/fuerza-qe.png" width="200"> | **Fuerza F = qE**<br>`fuerza-qe` | q = −2 µC en P, fuerza opuesta al campo | densidades-no-uniformes<br>`E11Fuerza.tsx: step` | canvas 2D | baja |
| <img src="miniaturas/mapa-integral-viva.png" width="200"> | **P en movimiento con integral numérica**<br>`mapa-integral-viva` | Integral rehecha cada cuadro; mapa de direcciones en grilla | densidades-no-uniformes<br>`E12OtraHerramienta.tsx: step` | canvas 2D, fisica.ts (campo2En) | alta: mapa de campo en vivo |
| <img src="miniaturas/v1-rayos-lissajous.png" width="200"> | **Rayos de campo que se vuelven Lissajous**<br>`v1-rayos-lissajous` | 28 rayos de una carga que se doblan sobre x = R sen(as + π/2), y = R sen(bs), a:b = 3:2 | teaser-lectures @ v1-luminosa<br>`src/escenas.ts: intro (lis, lisAB, giroIntro)` | canvas 2D, ritmo.json | media: transición acoplada |
| <img src="miniaturas/v1-logo-dipolo.png" width="200"> | **Logo vivo: dipolo con partículas**<br>`v1-logo-dipolo` | 220 líneas del dipolo ±q (trazar, RK2) con partículas; el interior de la marca converge. v2: misma física con golpe seco | teaser-lectures @ v1-luminosa<br>`src/escenas.ts: logo, fondoLogo (también v2)` | canvas 2D, marca.json, ritmo.json | alta: dipolo reutilizable |
| <img src="miniaturas/v4-limaduras.png" width="200"> | **Campo de una carga: limaduras → líneas**<br>`v4-limaduras` | Limaduras radiales nota a nota; desde el acorde F, 72 líneas con pulso por nota. Código heredado en teaser-cuerpo (no visible) | teaser-lectures @ v4-lo-invisible<br>`src/escenas.ts: campo (v4, final, cuerpo)` | canvas 2D, ritmo.json | alta: limaduras reales |
| <img src="miniaturas/estallido.png" width="200"> | **Estallido de carga**<br>`estallido` | Luz de carga como la foto de perfil: halos, núcleo y 110 rayos; versión viva en final.ts (estallidoVivo) | teaser-lectures @ v4-lo-invisible<br>`src/escenas.ts: estallido; src/final.ts: estallidoVivo` | canvas 2D | alta: firma visual de B&N |
| <img src="miniaturas/campo-dos-lic.png" width="200"> | **Clímax: campo de dos cargas con LIC**<br>`campo-dos-lic` | Textura LIC del dipolo revelada por golpes, flujo de guiones por 180 líneas, anillos y swell | teaser-lectures @ v4-lo-invisible<br>`src/escenas.ts: clima, campoDos (v4, final)` | canvas 2D, public/img/campo-*.png, ritmo.json | alta: campoDos es el núcleo |
| <img src="miniaturas/lic-estatica.png" width="200"> | **LIC estática del dipolo**<br>`lic-estatica` | Line integral convolution del campo real ±q, núcleo de Hann L = 70 px, paleta azul | teaser-lectures @ v4-lo-invisible<br>`herramientas/lic.py → public/img/campo-{45,169,916}.png` | numpy, ffmpeg (offline) | alta: ver modulos/lic |
| <img src="miniaturas/lic-animada.png" width="200"> | **LIC animada (Cabral-Leedom/Forssell)**<br>`lic-animada` | Núcleo Hann·(1 + m cos(Φ − θ)): hebras que fluyen de +q a −q, loop de 60 cuadros | teaser-lectures @ final-epiciclos (= main)<br>`herramientas/lic_animada.py → public/img/campo-*/fNN.jpg; final.ts: revelacion` | numpy, ffmpeg (offline) | alta: ver modulos/lic |
| <img src="miniaturas/gpu-campo-puntual.png" width="200"> | **Líneas de campo de carga puntual (partículas GPU)**<br>`gpu-campo-puntual` | E radial ∝ q/r²; partículas que fluyen hacia afuera y laten por nota | teaser-cuerpo<br>`src/gpu/glsl/particulas.ts: forma 2` | motor GPU, ritmo.json | alta: forma de partículas en GLSL |
| <img src="miniaturas/gpu-dipolo-3d.png" width="200"> | **Dipolo revolucionado en 3D (trazos)**<br>`gpu-dipolo-3d` | Líneas de +q/−q integradas con RK2 y rotadas en torno al eje; pulsos en bombos | teaser-v5<br>`src/gpu/sims.ts: lineasCampo (v5, v6)` | motor GPU (trazos), análisis de audio | alta: función pura |
| <img src="miniaturas/gpu-dipolo-pantalla.png" width="200"> | **Dipolo en pantalla (partículas GPU)**<br>`gpu-dipolo-pantalla` | Líneas de dos cargas calzadas con la LIC del perfil | teaser-cuerpo<br>`src/gpu/glsl/particulas.ts: forma 14 + datos.ts: datosDipolo (cuerpo, v5)` | motor GPU | alta: datos deterministas |

## Gravedad y órbitas

| Miniatura | Simulación | Qué muestra | Dónde | Depende de | Reutilizable |
|---|---|---|---|---|---|
| <img src="miniaturas/coulomb-newton.png" width="200"> | **Coulomb y Newton**<br>`coulomb-newton` | F_g = Gm₁m₂/r² frente a F_e: masas solo atraen | ley-de-coulomb<br>`E08Newton.tsx: step` | canvas 2D, lab/cargas.ts (masa) | media |
| <img src="miniaturas/neutra-masa.png" width="200"> | **Carga se cancela, masa suma**<br>`neutra-masa` | Protones y electrones alternados: carga neta 0, masa creciente | ley-de-coulomb<br>`E10Neutra.tsx: step` | canvas 2D | media |
| <img src="miniaturas/accion-distancia.png" width="200"> | **Acción a distancia**<br>`accion-distancia` | Dos masas se atraen a través del vacío y se vuelven cargas | lineas-de-campo<br>`E00Distancia.tsx: step` | canvas 2D | baja: narrativa |
| <img src="miniaturas/caida-libre.png" width="200"> | **Caída libre: todos caen igual**<br>`caida-libre` | ma = mg ⇒ a = g; masas 1, 2 y 4 con estela | carga-en-un-campo<br>`E02Gravedad.tsx: cuerpo, step` | canvas 2D, KaTeX | alta |
| <img src="miniaturas/tiro-parabolico.png" width="200"> | **Tiro parabólico g frente a qE/m**<br>`tiro-parabolico` | Proyectil con g al lado de carga con qE/m = g: misma parábola | carga-en-un-campo<br>`E06Tiro.tsx: step` | canvas 2D, KaTeX | alta: pantalla dividida |
| <img src="miniaturas/flamm-toro.png" width="200"> | **Toro → pozo de Flamm**<br>`flamm-toro` | Toro que se transforma en el paraboloide de Flamm z = 2√(r_s(ρ − r_s)); r_s late con el bombo. v2 austera, v4 por nota, cuerpo heredado | teaser-lectures @ v1-luminosa<br>`src/escenas.ts: espacio, superficie, flamm, rsPozo (v1, v2); gravedad (v4, final)` | canvas 2D, ritmo.json | alta: malla 3D sin dependencias |
| <img src="miniaturas/orbita-precesion.png" width="200"> | **Órbita con precesión**<br>`orbita-precesion` | ρ(φ) = p/(1 + e cos νφ), ν = 0,88: el perihelio avanza ≈ 49° por vuelta; segunda ley de Kepler | teaser-lectures @ v4-lo-invisible<br>`src/escenas.ts: orbita (v1, v2, v4, final)` | canvas 2D | alta: física clara |
| <img src="miniaturas/cono-luz.png" width="200"> | **Cono de luz**<br>`cono-luz` | Conos pasado/futuro (c = 1), línea de universo; en v5 con cascarones por bombo | teaser-lectures @ v4-lo-invisible<br>`src/escenas.ts: cono (v4, final); v5 src/gpu/sims.ts: cono` | canvas 2D / motor GPU | alta: geometría simple |
| <img src="miniaturas/tres-cuerpos.png" width="200"> | **Tres cuerpos en ocho**<br>`tres-cuerpos` | Coreografía de Chenciner–Montgomery (G = m = 1), Verlet de velocidad (el comentario dice RK4) | teaser-lectures @ v4-lo-invisible<br>`src/escenas.ts: tres (v4, final); v5 src/gpu/sims.ts: tres` | canvas 2D / motor GPU | alta: condiciones exactas |
| <img src="miniaturas/gpu-hoyo-negro.png" width="200"> | **Agujero negro**<br>`gpu-hoyo-negro` | Rayos curvados tipo Schwarzschild, disco de acreción con Doppler beaming, esfera de fotones | teaser-cuerpo<br>`src/gpu/glsl/mundos.ts: HOYO (cuerpo, v5, v6)` | motor GPU | alta: mundo raymarcheado |
| <img src="miniaturas/gpu-pozo.png" width="200"> | **Pozo gravitacional (partículas)**<br>`gpu-pozo` | Grilla polar que se hunde; caída kepleriana con rotación | teaser-cuerpo<br>`src/gpu/glsl/particulas.ts: forma 3` | motor GPU | alta |
| <img src="miniaturas/gpu-orbita-relativista.png" width="200"> | **Órbita relativista (partículas)**<br>`gpu-orbita-relativista` | Elipse a = 2,3, e = 0,5 con anomalía verdadera; la roseta queda como estela | teaser-cuerpo<br>`src/gpu/glsl/particulas.ts: forma 4 + guion.ts: ORB` | motor GPU | alta |
| <img src="miniaturas/gpu-malla-st.png" width="200"> | **Malla espacio-tiempo**<br>`gpu-malla-st` | Grilla hundida en un pozo (los graves lo profundizan), ondas gravitacionales en bombos | teaser-v5<br>`src/gpu/sims.ts: malla (v5); guion.ts: malla (v6)` | motor GPU (trazos), análisis de audio | alta |

## Ondas

| Miniatura | Simulación | Qué muestra | Dónde | Depende de | Reutilizable |
|---|---|---|---|---|---|
| <img src="miniaturas/maxwell-c.png" width="200"> | **Maxwell: cambio a velocidad c**<br>`maxwell-c` | Δt = 1 UA/c ≈ 8,3 min: frente anular que viaja a la Tierra | lineas-de-campo<br>`E02Maxwell.tsx: step` | canvas 2D, lab/campo.ts | alta |
| <img src="miniaturas/onda-bombo.png" width="200"> | **Onda gravitacional de juguete**<br>`onda-bombo` | Pulso gaussiano radial en la malla por bombo | teaser-lectures @ v1-luminosa<br>`src/escenas.ts: ondaBombo (v1, v2)` | ritmo.json | media |
| <img src="miniaturas/fourier-cuadrada.png" width="200"> | **Epiciclos → onda cuadrada**<br>`fourier-cuadrada` | 4/π Σ sen((2k−1)x)/(2k−1): un término más por pulso. En v5 versión 3D con trazos | teaser-lectures @ v1-luminosa<br>`src/escenas.ts: fourier (v1, v2); v5 src/gpu/sims.ts: ondaCuadrada` | canvas 2D, ritmo.json | alta: Fourier didáctico |
| <img src="miniaturas/interferencia.png" width="200"> | **Interferencia de dos fuentes**<br>`interferencia` | Σ cos(kr − ωt)/√(1 + r/λ) con frente causal; v2 en franjas nítidas; v4 pasa a relieve 3D | teaser-lectures @ v1-luminosa<br>`src/escenas.ts: interferencia (v1, v2); ondaEsc, amplitud (v4, final)` | canvas 2D (ImageData), ritmo.json | alta: ondas reales baratas |
| <img src="miniaturas/interferencia-relieve.png" width="200"> | **Interferencia → relieve 3D**<br>`interferencia-relieve` | La misma suma de ondas pasa a una malla en perspectiva con altura = amplitud | teaser-lectures @ v4-lo-invisible<br>`src/escenas.ts: ondaEsc` | canvas 2D, ritmo.json | alta |
| <img src="miniaturas/prisma-snell.png" width="200"> | **Prisma con dispersión (canvas)**<br>`prisma-snell` | Ley de Snell vectorial, n(λ) = 1,5 + 0,0042/λ² (Cauchy), 7 colores | teaser-lectures @ v4-lo-invisible<br>`src/escenas.ts: prisma, refracta (v4, final)` | canvas 2D | alta: óptica real |
| <img src="miniaturas/gpu-ondas-iridiscentes.png" width="200"> | **Superficie de interferencia iridiscente**<br>`gpu-ondas-iridiscentes` | Dos fuentes coherentes sobre una superficie con película delgada real | teaser-cuerpo<br>`src/gpu/glsl/mundos.ts: ONDAS + particulas.ts: forma 5` | motor GPU | alta |
| <img src="miniaturas/gpu-prisma.png" width="200"> | **Prisma raymarcheado**<br>`gpu-prisma` | Haz blanco, vidrio con Fresnel y abanico espectral (Zucconi CIE) | teaser-cuerpo<br>`src/gpu/glsl/mundos.ts: PRISMA (cuerpo, v5)` | motor GPU | alta: muy vistoso |
| <img src="miniaturas/fdtd-membrana.png" width="200"> | **Membrana: ecuación de onda 2D (FDTD)**<br>`fdtd-membrana` | ∂²h/∂t² = c²∇²h con esponja absorbente; gotas en bombos y dos fuentes coherentes | teaser-v6 (en desarrollo)<br>`herramientas/simular.py: onda → public/sim/onda; glsl/sim2d.ts` | datos precalculados en public/sim, ritmo.json | media: atado a la canción |

## Fluidos

| Miniatura | Simulación | Qué muestra | Dónde | Depende de | Reutilizable |
|---|---|---|---|---|---|
| <img src="miniaturas/gpu-curl-noise.png" width="200"> | **Fluido curl-noise (partículas)**<br>`gpu-curl-noise` | Líneas de traza transportadas por el rotacional de un ruido | teaser-cuerpo<br>`src/gpu/glsl/particulas.ts: forma 7 (cuerpo, v5)` | motor GPU | alta: sin precálculo |
| <img src="miniaturas/stable-fluids.png" width="200"> | **Stable fluids de Stam (vía Madelung)**<br>`stable-fluids` | Navier-Stokes incompresible 2D, MacCormack, proyección espectral, confinamiento de vorticidad; nace de ψ | teaser-v6 (en desarrollo)<br>`herramientas/simular.py: fluido → public/sim/fluido` | datos precalculados en public/sim | media: encadenado al estado cuántico |

## Cuántica

| Miniatura | Simulación | Qué muestra | Dónde | Depende de | Reutilizable |
|---|---|---|---|---|---|
| <img src="miniaturas/zoom-atomo.png" width="200"> | **Zoom del átomo al núcleo**<br>`zoom-atomo` | Razón de radios 10⁵; zoom log de 10⁻¹⁰ a 10⁻¹⁴ m | del-ambar-a-millikan<br>`E08Escala.tsx: step` | canvas 2D, KaTeX | alta: zoom de potencias de diez |
| <img src="miniaturas/bohr.png" width="200"> | **Colapso clásico y órbitas de Bohr**<br>`bohr` | Espiral con ω ∝ r^{-3/2} y anillos de radiación; luego órbitas estacionarias | del-ambar-a-millikan<br>`E09Bohr.tsx: step` | canvas 2D | alta |
| <img src="miniaturas/cuantizacion.png" width="200"> | **Cuantización Q = ne**<br>`cuantizacion` | Gotas que se apilan en múltiplos de e | del-ambar-a-millikan<br>`E11Multiplos.tsx: step` | canvas 2D, KaTeX | media |
| <img src="miniaturas/doble-rendija.png" width="200"> | **Doble rendija**<br>`doble-rendija` | 2400 impactos de I ∝ cos²(9πy)·sinc²(2,2πy) muestreados por CDF inversa; en v5 con trazos | teaser-lectures @ v4-lo-invisible<br>`src/escenas.ts: rendija (v4, final); v5 src/gpu/sims.ts: rendija` | canvas 2D, ritmo.json | alta: cuántica icónica |
| <img src="miniaturas/orbital-3dz2.png" width="200"> | **Orbital 3d_z² del hidrógeno**<br>`orbital-3dz2` | \|ψ\|² ∝ r⁴e^{−2r/3}(3cos²θ − 1)² por muestreo de rechazo; versión GPU volumétrica | teaser-lectures @ v4-lo-invisible<br>`src/escenas.ts: orbital (v4, final); src/gpu/glsl/mundos.ts: ORBITAL (cuerpo, v5)` | canvas 2D / motor GPU | alta |
| <img src="miniaturas/schrodinger.png" width="200"> | **Schrödinger 2D split-step**<br>`schrodinger` | iψₜ = −½∇²ψ + Vψ: paquete gaussiano contra doble rendija finita (difracción y túnel) | teaser-v6 (en desarrollo)<br>`herramientas/simular.py: schro → public/sim/schro` | datos precalculados en public/sim | media |

## Caos

| Miniatura | Simulación | Qué muestra | Dónde | Depende de | Reutilizable |
|---|---|---|---|---|---|
| <img src="miniaturas/lorenz.png" width="200"> | **Atractor de Lorenz**<br>`lorenz` | σ = 10, ρ = 28, β = 8/3, RK4 de 6500 pasos; v2 con cortes de cámara; v4: 1300 condiciones iniciales que el flujo ordena | teaser-lectures @ v1-luminosa<br>`src/escenas.ts: lorenz (v1, v2, v4, final)` | canvas 2D, ritmo.json | alta: clásico determinista |
| <img src="miniaturas/lorenz-nube.png" width="200"> | **Lorenz desde ruido**<br>`lorenz-nube` | 1300 condiciones iniciales integradas con RK4 que convergen al atractor | teaser-lectures @ v4-lo-invisible<br>`src/escenas.ts: lorenz (v4, final)` | canvas 2D | alta |
| <img src="miniaturas/caos-titulo.png" width="200"> | **Título CAOS hecho de trayectorias**<br>`caos-titulo` | Cada punto de la palabra viaja por un tramo del atractor y aterriza en las letras | teaser-lectures @ v2-oscura-titulos<br>`src/escenas.ts: tituloCaos + titulos.ts: grillaPuntos` | canvas 2D, ritmo.json | alta: partículas que forman texto |
| <img src="miniaturas/gpu-lorenz.png" width="200"> | **Atractor de Lorenz con un millón de partículas**<br>`gpu-lorenz` | RK4, 1024² muestras en textura; v5 además como trazo que se dibuja; v6 dos trayectorias que divergen | teaser-cuerpo<br>`src/gpu/datos.ts: datosLorenz + particulas.ts: forma 8; v5 sims.ts: lorenzTrazo` | motor GPU | alta |

## Fractales

| Miniatura | Simulación | Qué muestra | Dónde | Depende de | Reutilizable |
|---|---|---|---|---|---|
| <img src="miniaturas/mandelbrot-v1.png" width="200"> | **Mandelbrot con zoom**<br>`mandelbrot-v1` | z ↦ z² + c con escape suavizado, zoom de 2,4 a 2e-4 hacia el valle de los caballitos de mar; v4 zoom hasta 4e-6 que se parte hacia las cargas | teaser-lectures @ v1-luminosa<br>`src/escenas.ts: mandelbrot (v1, v2); fractal (v4, final)` | canvas 2D (ImageData), ritmo.json | alta: render por píxel parametrizable |
| <img src="miniaturas/mandelbrot-mascara.png" width="200"> | **Mandelbrot enmascarado por MATEMÁTICA**<br>`mandelbrot-mascara` | El fractal dentro de la palabra, invertido o en negativo según el pulso | teaser-lectures @ v2-oscura-titulos<br>`src/escenas.ts: mandelbrot, modoMandel` | canvas 2D, ritmo.json | alta: máscara tipográfica |
| <img src="miniaturas/espiral-aurea.png" width="200"> | **Espiral áurea**<br>`espiral-aurea` | Cuadrados de Fibonacci y cuartos de círculo; en v5 zoom ×φ por bombo | teaser-lectures @ v4-lo-invisible<br>`src/escenas.ts: aurea (v4, final); v5 src/gpu/sims.ts: aurea` | canvas 2D / motor GPU | alta |
| <img src="miniaturas/gpu-mandelbrot.png" width="200"> | **Mandelbrot zoom profundo (GPU)**<br>`gpu-mandelbrot` | Iteraciones suaves, orbit traps, relieve por estimador de distancia, 8 paletas | teaser-cuerpo<br>`src/gpu/glsl/mundos.ts: FRACTAL (cuerpo, v5)` | motor GPU | alta |
| <img src="miniaturas/julia.png" width="200"> | **Conjunto de Julia**<br>`julia` | z → z² + c con c que avanza un paso por pulso | teaser-v6 (en desarrollo)<br>`src/gpu/glsl/sim2d.ts: JULIA + guion.ts` | motor GPU, ritmo.json | alta: shader pequeño |
| <img src="miniaturas/gray-scott.png" width="200"> | **Gray-Scott (reacción-difusión)**<br>`gray-scott` | F = 0,055, k = 0,062 («coral»), sembrado con la tinta del fluido | teaser-v6 (en desarrollo)<br>`herramientas/simular.py: gs → public/sim/gs` | datos precalculados en public/sim | media |

## Geometría y topología

| Miniatura | Simulación | Qué muestra | Dónde | Depende de | Reutilizable |
|---|---|---|---|---|---|
| <img src="miniaturas/lissajous-circulo.png" width="200"> | **Lissajous → círculo**<br>`lissajous-circulo` | a:b de 3:2 a 1:1 con un punto que recorre la curva | teaser-lectures @ v1-luminosa<br>`src/escenas.ts: intro, lisAB` | canvas 2D, ritmo.json | alta |
| <img src="miniaturas/teseracto.png" width="200"> | **Teseracto 4D**<br>`teseracto` | 16 vértices (±1)⁴, rotación en XW e YZ, proyección 1/(3 − w); v2 austero; v5 con trazos | teaser-lectures @ v1-luminosa<br>`src/escenas.ts: teseracto (v1, v2); v5 src/gpu/sims.ts: teseracto` | canvas 2D / motor GPU | alta |
| <img src="miniaturas/adn.png" width="200"> | **Hélice de ADN**<br>`adn` | Doble hélice con desfase 0,8π y pares de bases por nota; versión de partículas en GPU | teaser-lectures @ v4-lo-invisible<br>`src/escenas.ts: adn (v4, final); particulas.ts: forma 10 (cuerpo, v5)` | canvas 2D / motor GPU | media |
| <img src="miniaturas/mobius.png" width="200"> | **Cinta de Möbius**<br>`mobius` | x = (1 + v cos(u/2)) cos u, y = (1 + v cos(u/2)) sen u, z = v sen(u/2) | teaser-lectures @ v4-lo-invisible<br>`src/escenas.ts: mobius (v4, final)` | canvas 2D | alta |
| <img src="miniaturas/proyeccion-3d.png" width="200"> | **Proyección 3D sencilla**<br>`proyeccion-3d` | Cámara con giro y elevación; circunferencias delante/detrás; anillo y malla de disco | BN_Electromagnetismo = plantilla<br>`src/lab/proyeccion.ts (los 7 proyectos)` | canvas 2D | alta: 3D barato |
| <img src="miniaturas/gpu-epiciclos-intro.png" width="200"> | **Epiciclos de Fourier (intro)**<br>`gpu-epiciclos-intro` | z(s) = Σ a e^{i(fs+p)}: Lissajous, rosas y elipse que se vuelve órbita | teaser-v5<br>`src/gpu/sims.ts: epiciclos, lissajous, rosa, elipse` | motor GPU (trazos) | alta |
| <img src="miniaturas/gpu-nudo.png" width="200"> | **Nudo de Lissajous 3D**<br>`gpu-nudo` | (cos(nₓs + φₓ), cos(n_y s + φ_y), cos(n_z s)) con color espectral | teaser-v5<br>`src/gpu/sims.ts: nudo` | motor GPU (trazos) | alta |
| <img src="miniaturas/gpu-toro.png" width="200"> | **Toro de vidrio iridiscente**<br>`gpu-toro` | Toro raymarcheado con película delgada; la red se proyecta encima | teaser-cuerpo<br>`src/gpu/glsl/mundos.ts: TORO (cuerpo, v5)` | motor GPU | alta |
| <img src="miniaturas/gpu-tunel.png" width="200"> | **Túnel de zoom**<br>`gpu-tunel` | Puntos en streaming (inmersión) | teaser-cuerpo<br>`src/gpu/glsl/particulas.ts: forma 13` | motor GPU | media: transición genérica |

## Computación e IA

| Miniatura | Simulación | Qué muestra | Dónde | Depende de | Reutilizable |
|---|---|---|---|---|---|
| <img src="miniaturas/red-neuronal.png" width="200"> | **Red neuronal que crece**<br>`red-neuronal` | MLP tanh 3-6-8-6-2, una capa por palma, forward por pulso; en v5 6-10-14-14-10-6 con trazos | teaser-lectures @ v1-luminosa<br>`src/escenas.ts: red, pasada (v1, v2); v5 src/gpu/sims.ts: red` | canvas 2D, ritmo.json | alta: forward real |
| <img src="miniaturas/computacion-titulo.png" width="200"> | **Título COMPUTACIÓN escrito por la red**<br>`computacion-titulo` | Matriz de puntos escrita columna a columna por las salidas de la red | teaser-lectures @ v2-oscura-titulos<br>`src/escenas.ts: tituloComputacion` | canvas 2D, ritmo.json | media |
| <img src="miniaturas/gradiente.png" width="200"> | **Descenso de gradiente con momento**<br>`gradiente` | Pérdida cuadrática anisótropa, heavy-ball v = 0,75v − 0,05∇L | teaser-lectures @ v4-lo-invisible<br>`src/escenas.ts: gradiente (v4, final, cuerpo)` | canvas 2D | alta: optimización explicable |
| <img src="miniaturas/dijkstra.png" width="200"> | **Dijkstra en grilla**<br>`dijkstra` | Grilla 30×18 con 22 % de muros: frente de distancias y camino mínimo; v5 con trazos | teaser-lectures @ v4-lo-invisible<br>`src/escenas.ts: dijkstra (v4, final); v5 src/gpu/sims.ts: dijkstra` | canvas 2D / motor GPU | alta |
| <img src="miniaturas/ulam.png" width="200"> | **Espiral de Ulam**<br>`ulam` | Criba de Eratóstenes; los primos se encienden en la espiral | teaser-lectures @ v4-lo-invisible<br>`src/escenas.ts: ulam (v4, final); v5 src/gpu/sims.ts: ulam` | canvas 2D / motor GPU | alta |

## Probabilidad

| Miniatura | Simulación | Qué muestra | Dónde | Depende de | Reutilizable |
|---|---|---|---|---|---|
| <img src="miniaturas/galton.png" width="200"> | **Tablero de Galton**<br>`galton` | Caminos binomiales en 12 filas; los contenedores dibujan la normal N(6, √3); v5 con trazos | teaser-lectures @ v4-lo-invisible<br>`src/escenas.ts: galton (v4, final); v5 src/gpu/sims.ts: galton` | canvas 2D, ritmo.json | alta: autocontenido |
| <img src="miniaturas/ising.png" width="200"> | **Modelo de Ising 2D**<br>`ising` | Metropolis en tablero bajo T crítica con campo creciente: se ordena | teaser-v6 (en desarrollo)<br>`herramientas/simular.py: ising → public/sim/ising` | datos precalculados en public/sim | media |

## Tipografía y créditos

| Miniatura | Simulación | Qué muestra | Dónde | Depende de | Reutilizable |
|---|---|---|---|---|---|
| <img src="miniaturas/linea-tiempo.png" width="200"> | **Línea de tiempo Newton/Faraday/Maxwell**<br>`linea-tiempo` | Hitos 1687/1831/1865 que se encienden | lineas-de-campo<br>`src/escenas/Linea.tsx: LineaTiempo` | HTML | alta: componente genérico |
| <img src="miniaturas/titulo-palabras.png" width="200"> | **Título palabra por palabra, HUD y fórmulas**<br>`titulo-palabras` | Entrada con desenfoque, HUD de lecturas vivas, KaTeX que se enfoca (Titulo, Hud, Formula) | BN_Electromagnetismo = plantilla<br>`src/comun.tsx: Titulo, Hud; src/formula.tsx: Formula, resalta` | HTML, KaTeX | alta |
| <img src="miniaturas/v1-tipografia.png" width="200"> | **Tipografía cinética, HUD y cromo (v1)**<br>`v1-tipografia` | Líneas letra a letra, mono que se decodifica, HUD con valores vivos | teaser-lectures @ v1-luminosa<br>`src/Video.tsx: Linea, Codigo, Hud, Textos, Cromo` | ritmo.json | alta |
| <img src="miniaturas/v1-tarjeta-clips.png" width="200"> | **Tarjeta con clips de la serie**<br>`v1-tarjeta-clips` | La onda aplanada se vuelve el borde de una tarjeta con 4 clips | teaser-lectures @ v1-luminosa<br>`src/escenas.ts: tarjeta + Video.tsx: Tarjeta` | public/clips, ritmo.json | baja |
| <img src="miniaturas/fisica-titulo.png" width="200"> | **Título FÍSICA curvado por el pozo**<br>`fisica-titulo` | Cada franja de la palabra baja según la profundidad de Flamm | teaser-lectures @ v2-oscura-titulos<br>`src/escenas.ts: tituloFisica` | canvas 2D, ritmo.json | alta: texto deformado por campo |
| <img src="miniaturas/geometria-titulo.png" width="200"> | **Título GEOMETRÍA armado con aristas**<br>`geometria-titulo` | Tramos de la palabra que salen de las aristas del teseracto | teaser-lectures @ v2-oscura-titulos<br>`src/escenas.ts: tituloGeometria + titulos.ts: tramos` | canvas 2D, ritmo.json | media |
| <img src="miniaturas/v2-creditos.png" width="200"> | **Créditos de la intro (v2)**<br>`v2-creditos` | «Nicolás Moreno», «Benjamín Campos», «Presentan», «Ideas complejas, animadas.» | teaser-lectures @ v2-oscura-titulos<br>`src/Video.tsx: Nombre, Intro, Rebanadas, Decodifica` | ritmo.json | media |
| <img src="miniaturas/v2-capitulos.png" width="200"> | **Capítulos, registro y cromo técnico**<br>`v2-capitulos` | Numeración, anotaciones vivas, marcas de registro, timecode y BAR/BPM | teaser-lectures @ v2-oscura-titulos<br>`src/Video.tsx: Capitulo, Registro, Cromo` | ritmo.json | alta |
| <img src="miniaturas/invitado.png" width="200"> | **Invitado con clips dentro de las letras**<br>`invitado` | «JAVIER PATIÑO» como máscara de video; sello «INVITADO ESPECIAL» | teaser-lectures @ v2-oscura-titulos<br>`src/Video.tsx: Invitado` | public/clips, ritmo.json | media |
| <img src="miniaturas/rasterizador.png" width="200"> | **Rasterizador de títulos**<br>`rasterizador` | Texto a imagen, puntos interiores y tramos, con caché | teaser-lectures @ v2-oscura-titulos<br>`src/titulos.ts: rasterizar, tamPara, grillaPuntos, tramos (v2, v4, final, cuerpo)` | canvas 2D | alta: base de texto de partículas |
| <img src="miniaturas/frase-limaduras.png" width="200"> | **Frase hecha de limaduras**<br>`frase-limaduras` | «Hay cosas que no se ven.»: segmentos que se ordenan en las letras y se fijan en un golpe | teaser-lectures @ v4-lo-invisible<br>`src/escenas.ts: frase1, rasterFrase` | canvas 2D, ritmo.json | alta |
| <img src="miniaturas/frase-campo.png" width="200"> | **Frase rellena de campo**<br>`frase-campo` | «Hasta que las ves moverse.»: letras rellenas con la LIC y su flujo | teaser-lectures @ v4-lo-invisible<br>`src/escenas.ts: frase2, palabrasFrase2 (v4, final, cuerpo)` | public/img/campo-*.png, ritmo.json | alta |
| <img src="miniaturas/creditos-billing.png" width="200"> | **Créditos tipo billing block**<br>`creditos-billing` | Creado por / Con / Invitado especial, con barrido de luz; v5/v6 con reglas en golpes reales | teaser-lectures @ v4-lo-invisible<br>`src/Video.tsx: Creditos (v4, cuerpo, v5, v6)` | ritmo.json / análisis de audio | alta: componente React |
| <img src="miniaturas/gpu-texto-refractado.png" width="200"> | **Texto refractado y disuelto por la simulación**<br>`gpu-texto-refractado` | Glifos que la GPU refracta según el gradiente del campo y disuelve | teaser-v6 (en desarrollo)<br>`src/gpu/texto.ts + glsl/sim2d.ts: TEXTO, VELO` | motor GPU, public/sim | alta: sirve sobre cualquier campo |
| <img src="miniaturas/rotulos-canvas.png" width="200"> | **Rótulos mono y variables KaTeX en el canvas**<br>`rotulos-canvas` | rotulo, variable, puntoP, angulo, flecha | BN_Electromagnetismo = plantilla<br>`src/lab/luz.ts` | canvas 2D, public/fonts | alta |

## Finales y logo

| Miniatura | Simulación | Qué muestra | Dónde | Depende de | Reutilizable |
|---|---|---|---|---|---|
| <img src="miniaturas/cierre-serie.png" width="200"> | **Cierres de la serie con créditos**<br>`cierre-serie` | Barra + que termina en una carga −, créditos MIT y logo; variantes por video (dipolo, placas, fila, densidad) | BN_Electromagnetismo = plantilla<br>`E14Cierre.tsx: step, Creditos, Logo (y E12/E13/E14 de cada video)` | canvas 2D, public/img/bn-logo.png | alta |
| <img src="miniaturas/cierre-ambar.png" width="200"> | **Cierre dipolo y tres propiedades**<br>`cierre-ambar` | Signos, cuantizada, se conserva | del-ambar-a-millikan<br>`E14Cierre.tsx` | canvas 2D | alta |
| <img src="miniaturas/cierre-lineas.png" width="200"> | **Cierre placas con carga**<br>`cierre-lineas` | Campo uniforme y carga + quieta | lineas-de-campo<br>`E13Cierre.tsx` | canvas 2D | alta |
| <img src="miniaturas/cierre-carga.png" width="200"> | **Cierre de discreto a continuo**<br>`cierre-carga` | La fila de cargas se multiplica hasta ser línea | carga-en-un-campo<br>`E12Cierre.tsx: fila, step` | canvas 2D | alta |
| <img src="miniaturas/cierre-dens.png" width="200"> | **Cierre barra con densidad variable**<br>`cierre-dens` | Líneas más juntas donde hay más carga | densidades-no-uniformes<br>`E13Cierre.tsx` | canvas 2D, densidad.ts | alta |
| <img src="miniaturas/cierre-coulomb.png" width="200"> | **Cierre dipolo (Coulomb)**<br>`cierre-coulomb` | Líneas de + a −; créditos | ley-de-coulomb<br>`E14Cierre.tsx` | canvas 2D | alta |
| <img src="miniaturas/marco-cromo.png" width="200"> | **Fondo con viñeta y cromo B&N LAB**<br>`marco-cromo` | Viñeta azulada, marca y tema, punto «Calculado en vivo» | BN_Electromagnetismo = plantilla<br>`src/Marco.tsx: Fondo, Cromo` | HTML, serie.ts | alta |
| <img src="miniaturas/epiciclos-marca-v1.png" width="200"> | **Epiciclos que dibujan la marca (v1)**<br>`epiciclos-marca-v1` | DFT de los 5 contornos de B&N, 80 epiciclos por contorno; v2 en trazo blanco | teaser-lectures @ v1-luminosa<br>`src/escenas.ts: marca, COEFS, evalua (v1, v2)` | marca.json, ritmo.json | alta: cualquier contorno vectorizado |
| <img src="miniaturas/dispersion-trazo.png" width="200"> | **Dispersión del trazo**<br>`dispersion-trazo` | El contorno se suelta en partículas antes del drop | teaser-lectures @ v1-luminosa<br>`src/escenas.ts: dispersion` | marca.json | media |
| <img src="miniaturas/logo-v1.png" width="200"> | **Logo y «Próximamente» (v1, v2)**<br>`logo-v1` | bn-mark.png con blur, LECTURES letra a letra, web | teaser-lectures @ v1-luminosa<br>`src/Video.tsx: Logo (v1, v2)` | public/img/bn-mark.png, ritmo.json | media |
| <img src="miniaturas/logo-v4.png" width="200"> | **Logo sobre el campo (v4)**<br>`logo-v4` | campoDos con estallidos, LECTURES por nota, «Próximamente» | teaser-lectures @ v4-lo-invisible<br>`src/escenas.ts: logo + Video.tsx: Logo` | public/img/campo-*.png, bn-mark.png | alta: fiel a la foto de perfil |
| <img src="miniaturas/final-epiciclos.png" width="200"> | **Final: epiciclos de la marca (versión aprobada)**<br>`final-epiciclos` | DFT completa de cada contorno, 30 círculos por cadena, estela, cierre por semicorchea, empuje de cámara | teaser-lectures @ final-epiciclos (= main)<br>`src/final.ts: epiciclos, CURVAS, PLAN, componer (final, v5; v6 modificado)` | marca.json, ritmo.json | alta: ver modulos/final-epiciclos |
| <img src="miniaturas/final-particulas.png" width="200"> | **Final: partículas que convergen en el logo**<br>`final-particulas` | 5200 partículas; P = C + Rot(θ)[A + E], un solo giro, smootherstep hasta los píxeles de bn-mark | teaser-lectures @ final-epiciclos (= main)<br>`src/final.ts: nubes, metasDesdeImagen, posicion` | marca.json, bn-mark.png, ritmo.json | alta: morph sin saltos |
| <img src="miniaturas/final-logo.png" width="200"> | **Final: logo nítido, LECTURES y revelación del campo**<br>`final-logo` | La LIC animada se abre desde las cargas; LECTURES letra a letra, «Próximamente», web | teaser-lectures @ final-epiciclos (= main)<br>`src/final.ts: revelacion, NOTAS_LECTURES + Video.tsx: Logo` | public/img/campo-*/fNN.jpg, ritmo.json | alta |
| <img src="miniaturas/marca-extractor.png" width="200"> | **Extractor de la marca**<br>`marca-extractor` | Alfa de bn-mark.png → contornos (BFS) y puntos interiores normalizados | teaser-lectures @ v1-luminosa<br>`herramientas/marca.py → src/marca.json (todas las versiones)` | numpy, ffmpeg (offline) | alta: vectoriza cualquier logo |
| <img src="miniaturas/gpu-luz-genesis.png" width="200"> | **Punto de luz génesis**<br>`gpu-luz-genesis` | Fuente con halo, streak anamórfico, espigas de difracción y anillo de lente | teaser-cuerpo<br>`src/gpu/glsl/mundos.ts: LUZ (cuerpo, v5)` | motor GPU | alta |

## Motores y efectos de postproceso

| Miniatura | Simulación | Qué muestra | Dónde | Depende de | Reutilizable |
|---|---|---|---|---|---|
| <img src="miniaturas/motor-canvas-serie.png" width="200"> | **Motor de simulación canvas de la serie**<br>`motor-canvas-serie` | step(ctx, w, h, t) puro; adapta a 4:5, 16:9 y 9:16 | BN_Electromagnetismo = plantilla<br>`src/lab/motor.tsx: Simulacion (los 7)` | canvas 2D | alta: ver modulos/lab-serie |
| <img src="miniaturas/motor-luz.png" width="200"> | **Motor de luz (brillo, carga, chispa, partículas, trazar)**<br>`motor-luz` | Primitivas aditivas y líneas de campo RK2 de cargas puntuales | BN_Electromagnetismo = plantilla<br>`src/lab/luz.ts (serie y teasers; lineas-de-campo modificado)` | canvas 2D | alta: base de todo |
| <img src="miniaturas/helpers-lab-extra.png" width="200"> | **Helpers propios de cada video**<br>`helpers-lab-extra` | campo.ts (lineas, cerosEje / placas, estrobo), densidad.ts, historia.ts, cargas.ts | lineas-de-campo<br>`src/lab/campo.ts, densidad.ts, historia.ts, cargas.ts` | canvas 2D | alta |
| <img src="miniaturas/transiciones-serie.png" width="200"> | **Transiciones entre escenas y layouts**<br>`transiciones-serie` | Fundido, salida con desenfoque y escala; reparto 16:9 / 9:16 | BN_Electromagnetismo = plantilla<br>`src/comun.tsx: Escena, Horizontal, Alto` | HTML | alta |
| <img src="miniaturas/pipeline-render.png" width="200"> | **Render por tramos y revisión**<br>`pipeline-render` | render.py por tramos con reintentos, cuadros.mjs, hoja.py, parte.mjs | BN_Electromagnetismo = plantilla<br>`herramientas/*` | Remotion renderer, ffmpeg | alta: pipeline copiable |
| <img src="miniaturas/warp.png" width="200"> | **Warp de estrellas en el riser**<br>`warp` | Starfield con velocidad 0,15 + 1,6u² | teaser-lectures @ v1-luminosa<br>`src/escenas.ts: warp (v1, v2)` | ritmo.json (risers) | alta |
| <img src="miniaturas/explosion-teseracto.png" width="200"> | **Explosión del teseracto**<br>`explosion-teseracto` | Aristas despedidas con desenfoque de movimiento de 3 muestras | teaser-lectures @ v1-luminosa<br>`src/escenas.ts: explosion` | canvas 2D, ritmo.json | media |
| <img src="miniaturas/aberracion-grano.png" width="200"> | **Aberración cromática, grano y destello**<br>`aberracion-grano` | Separación rojo/cian por impacto, 4 texturas de grano, flash en drops; v4 solo grano y viñeta | teaser-lectures @ v1-luminosa<br>`src/Video.tsx: Lienzo, Destello (v1, v2, v4, final)` | ritmo.json | alta: drop-in |
| <img src="miniaturas/glitch.png" width="200"> | **Glitch digital**<br>`glitch` | Separación RGB, bloques desplazados y scanlines por 3 cuadros | teaser-lectures @ v2-oscura-titulos<br>`src/Video.tsx: Lienzo (glitchEn)` | ritmo.json | alta: determinista |
| <img src="miniaturas/deriva-camara.png" width="200"> | **Deriva de cámara del cierre**<br>`deriva-camara` | Push-in de 3 % desde la convergencia | teaser-lectures @ final-epiciclos (= main)<br>`src/final.ts: derivaCierre` | ritmo.json | alta |
| <img src="miniaturas/verificar-trayectorias.png" width="200"> | **Verificación de trayectorias**<br>`verificar-trayectorias` | Aceleraciones máxima y media por cuadro para probar que no hay saltos | teaser-lectures @ final-epiciclos (= main)<br>`src/final.ts: verificarTrayectorias` | — | media: QA de animación |
| <img src="miniaturas/motor-gpu.png" width="200"> | **Motor GPU WebGL2**<br>`motor-gpu` | Búfer HDR, mundos de pantalla completa, 2^20 partículas, trazos instanciados | teaser-v5<br>`src/gpu/motor.ts, Cuerpo.tsx (cuerpo ⊂ v5 ⊂ v6)` | WebGL2 (ANGLE) | alta: ver modulos/motor-gpu |
| <img src="miniaturas/gpu-bloom-grade.png" width="200"> | **Bloom de doble filtro y grade final**<br>`gpu-bloom-grade` | Bloom de 6 mips (Karis), ACES, aberración, grano, viñeta, dithering, colapso a azul B&N | teaser-v5<br>`src/gpu/glsl/post.ts: BLOOM_DOWN, BLOOM_UP, FINAL` | motor GPU | alta |
| <img src="miniaturas/gpu-choque-flash.png" width="200"> | **Onda de choque y flash por golpe**<br>`gpu-choque-flash` | Anillo refractivo por bombo y flash de color por caja | teaser-v5<br>`src/gpu/glsl/post.ts: FINAL (uChoque, uFlashCol)` | motor GPU, análisis de audio | alta |
| <img src="miniaturas/gpu-nebula-bokeh.png" width="200"> | **Nebulosa de fondo y partículas con bokeh**<br>`gpu-nebula-bokeh` | Fondo cromático por mundo; un millón de puntos HDR con profundidad de campo y morph | teaser-cuerpo<br>`src/gpu/glsl/mundos.ts: NEBULA; particulas.ts: PART_VS/PART_FS` | motor GPU | alta |
| <img src="miniaturas/gpu-trazos.png" width="200"> | **Trazos instanciados con perfil gaussiano**<br>`gpu-trazos` | Segmentos 3D como quads con sección gaussiana; base de todos los sims de v5 | teaser-v5<br>`src/gpu/trazos.ts` | motor GPU | alta |

## Música y análisis de audio

| Miniatura | Simulación | Qué muestra | Dónde | Depende de | Reutilizable |
|---|---|---|---|---|---|
| <img src="miniaturas/musica-serie.png" width="200"> | **Música de la serie (numpy)**<br>`musica-serie` | 92 BPM, Dm7–B♭maj7–Fmaj7–C, pad, bajo, arpegio; sfx sintetizados; ducking bajo la voz | BN_Electromagnetismo = plantilla<br>`audio/generar_musica.py; src/Video.tsx: habla` | public/musica.wav, public/sfx, voz.json | alta: sin samples de terceros |
| <img src="miniaturas/voz-sincronia.png" width="200"> | **Voz y sincronía por palabra**<br>`voz-sincronia` | edge-tts es-CL-LorenzoNeural; palabras.json; w(escena, palabra) ancla animaciones | BN_Electromagnetismo = plantilla<br>`audio/generar_voz.py, src/linea.ts: w` | voz.json, palabras.json | alta |
| <img src="miniaturas/musica-v1.png" width="200"> | **Música v1 «luminosa»**<br>`musica-v1` | Re mayor, 120 BPM, I–V–vi–IV, motivo F#5 A5 E5 F#5 D6; exporta bombos, palmas, hats, arpegio, motivo, efectos, drops | teaser-lectures @ v1-luminosa<br>`audio/generar_musica.py @ v1-luminosa (copia en modulos/musica)` | escribe public/musica.wav y src/ritmo.json | media: estilo fijo |
| <img src="miniaturas/musica-v2.png" width="200"> | **Música v2 «oscura»**<br>`musica-v2` | Re frigio, 120 BPM, braams, sub con sidechain; huecos antes de cada drop | teaser-lectures @ v2-oscura-titulos<br>`audio/generar_musica.py @ v2-oscura-titulos` | escribe public/musica.wav y src/ritmo.json | media |
| <img src="miniaturas/musica-v4.png" width="200"> | **Música v4 «Lo invisible» y final**<br>`musica-v4` | 96 BPM, Am–F–C–G → Do mayor, ostinato de piano, capas, swells, reverb 4,5 s; exporta acordes, ostinato, golpes, silencios, escenas | teaser-lectures @ v4-lo-invisible<br>`audio/generar_musica.py @ v4-lo-invisible (= main, = teaser-cuerpo)` | escribe public/musica.wav y src/ritmo.json | media |
| <img src="miniaturas/grilla-ritmo.png" width="200"> | **Grilla de ritmo**<br>`grilla-ritmo` | Grilla empujada por anillos en cada bombo, hats que titilan, arpegio sobre Lissajous | teaser-lectures @ v1-luminosa<br>`src/escenas.ts: grilla (v1, v2)` | ritmo.json | alta: visualizador de beat |
| <img src="miniaturas/silencio.png" width="200"> | **Silencio y huecos**<br>`silencio` | Negro total antes de cada drop o de la frase 2 | teaser-lectures @ v4-lo-invisible<br>`src/escenas.ts: enSilencio (v4), enHueco (v2)` | ritmo.json | alta |
| <img src="miniaturas/analizar-musica.png" width="200"> | **Análisis real de MP3**<br>`analizar-musica` | STFT, bandas, onsets por banda, tempo por autocorrelación, secciones, curvas por cuadro | teaser-v5<br>`herramientas/analizar_musica.py (v5, v6)` | escribe src/ritmo.json y public/musica.wav | alta: ver modulos/analisis-musica |
| <img src="miniaturas/ritmo-helpers.png" width="200"> | **Helpers de ritmo**<br>`ritmo-helpers` | golpe, golpesDe, swell, pulsoNota, tauMusical, golpeReal | teaser-v5<br>`src/ritmo.ts (v4, final, v5, v6)` | ritmo.json | alta |
| <img src="miniaturas/sincronia.png" width="200"> | **Verificación de sincronía**<br>`sincronia` | Pearson luminancia ↔ graves con desfases de ±3 cuadros; hojas antes/después de golpes | teaser-v5<br>`herramientas/sincronia.py (v5, v6), hoja_sincronia.py, movimiento.py (v6)` | mp4 renderizado, ritmo.json | alta: QA genérico |

## Lo que no se pudo recuperar

- Los mp4 originales de v1 y v2 se perdieron. Los de `entregables/archivo/` son re-renders del código reconstruido, no los archivos originales, aunque cuadro a cuadro coinciden con las capturas que quedaron.
- No hay estados intermedios dentro de cada versión, solo el estado al entregar. La excepción son las dos previas del final.
- `teaser-v6` sigue en desarrollo: su catálogo y su `simular.py` reflejan el 18 oct a las 02:10, y sus miniaturas son capturas existentes de `teaser-v6/out/rev2/`.
