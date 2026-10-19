# Helpers de la serie de electromagnetismo (`src/lab/`)

Motor de simulación de la serie, creado por Nicolás Moreno para B&N Lab ([bn-lab-simulations](https://github.com/4mser/bn-lab-simulations)). Benjamín Campos lo usó para el reel «De lo discreto a lo continuo» ([BN_Electromagnetismo](https://github.com/B3njjaman/BN_Electromagnetismo)), y de esa versión sale el módulo publicado aquí.

Origen: `plantilla/src/lab/`. Son idénticos en los cinco videos de la serie, salvo `luz.ts` de `ley-de-coulomb`, que tiene cambios propios (ver el catálogo).

- `lab/luz.ts`: el motor canvas 2D. `trazar` integra líneas de campo de cargas puntuales (RK). También incluye `particulas`, `carga`, `brillo`, `chispa`, `linea`, `rgba`, `azar` y `TAU`.
- `lab/motor.tsx`: el lienzo de Remotion que adapta la escena a los formatos 4:5, 16:9 (`YT`) y 9:16 (`TT`).
- `lab/proyeccion.ts`: una proyección 3D simple para cuerpos y superficies.
- `theme.ts` y `katex-sin-fuentes.css`: paleta, fuentes, curvas de easing y formatos. Las fuentes viven en `public/fonts` del proyecto.

## Cómo integrarlo
1. Copia `lab/`, `theme.ts` y el css a `src/` y las fuentes a `public/fonts/`.
2. Lo más simple es partir de la plantilla de [bn-lectures-clases](https://github.com/4mser/bn-lectures-clases/tree/main/plantilla), que ya trae todo esto.
3. Comprobado: `tsc --noEmit` compila esta carpeta tal como está.
