# Motor GPU (WebGL2)

Origen: `teaser-v5/src/gpu/` (evolución de `teaser-cuerpo/src/gpu/`). La versión más nueva, con `campos.ts` y `texto.ts`, está en `teaser-v6/src/gpu/`, que aún está en desarrollo.

## Qué hace
- `gpu/motor.ts`, clase `Motor`: búfer de escena HDR (RGBA16F), «mundos» que son shaders de pantalla completa, hasta 2^20 partículas en GPU, líneas (`Trazos`), bloom de cadena de mips (dual filter) y una pasada final con aberración cromática, tonemap ACES, grano, viñeta y dithering.
- `gpu/glsl/mundos.ts`: los mundos (`luz`, `hoyo`, `ondas`, `prisma`, `nebula`, `orbital`, `toro`, `fractal`...). El tipo `MundoId` sale de las claves de `MUNDOS`.
- `gpu/glsl/particulas.ts`: el vertex shader de partículas, que define sus formas y transiciones.
- `gpu/datos.ts`: los datos iniciales de las partículas (atractor de Lorenz, dipolo).
- `gpu/sims.ts` y `gpu/trazos.ts`: simulaciones que se dibujan como líneas 3D (`Trazos`, 16 floats por vértice).
- `gpu/guion.ts`: el guion del teaser v5. Cada cuadro es `estado(t, W, H)`, que devuelve los uniformes de los mundos, las partículas, la postproducción y los trazos. Depende de `ritmo.ts`.
- `gpu/Cuerpo.tsx`: el componente de Remotion. Usa un contexto WebGL2 por pestaña y renderiza cada cuadro de forma síncrona desde `estado(t)`. Así los renders en paralelo son deterministas.

## Cómo integrarlo en un proyecto nuevo
1. Copia `gpu/` a `src/gpu/`. `ritmo.ts` y `ritmo.json` son el ejemplo del v5: reemplázalos por los de tu música (ver `../analisis-musica/`).
2. Escribe tu propio `guion.ts` con una función `estado(t, W, H)` que devuelva `{ comun, mundos, part, post, trazos, linGanancia }`, con la misma forma que el ejemplo.
3. En la composición: `<Cuerpo t={frame / fps} W={width} H={height} />`.
4. Renderiza con ANGLE: `Config.setChromiumOpenGlRenderer("angle")` en `remotion.config.ts` y `chromiumOptions: { gl: "angle" }` en `selectComposition`, `renderStill` y `renderMedia`, como hacen `herramientas/cuadros.mjs` y `parte.mjs` de `teaser-v5`.
5. Comprobado: `tsc --noEmit` compila esta carpeta tal como está (con el `tsconfig` de la serie).
