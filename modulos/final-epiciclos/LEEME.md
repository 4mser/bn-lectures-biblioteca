# Final con epiciclos: la marca B&N, sus partículas y el logo sobre el campo

Origen: `teaser-lectures/src/final.ts` (tag `final-epiciclos`). Lo reusaron `teaser-v5` (idéntico) y `teaser-v6` (modificado).

## Qué hace
- Cadenas de epiciclos (serie de Fourier compleja de cada contorno de `marca.json`) dibujan la marca B&N.
- El trazo se rompe en partículas. Cada una sigue una sola trayectoria continua con un solo giro hasta su lugar en el logo, con resortes amortiguados.
- Las cargas se encienden y se revela el campo (LIC animada, ver `../lic/`).
- Todo es función pura de t, anclada a `ritmo.json`: `T_FINAL`, `T_ACENTO`, `T_SUELTA`, `T_CONV` y `T_MARCA`.

## Archivos
- `final.ts`: `dibujarFinal(ctx, d, t, img, marca)`, `verificarTrayectorias(d, desde, hasta)`, las constantes de tiempo y `NOTAS_LECTURES`.
- `marca.json`: contornos y puntos interiores de la marca, normalizados. Se genera con `marca.py` desde `public/img/bn-mark.png`.
- `escenas-apoyo.ts`: `auxiliar` y `posCargas`, extraídos tal cual de `escenas.ts` para que el módulo no dependa de las escenas del teaser. Es el único cambio respecto del original: el `import` de `final.ts` apunta aquí.
- `disposicion.ts`, `ritmo.ts`, `ritmo.json`, `theme.ts` y `lab/luz.ts`: las dependencias, copiadas sin cambios.

## Cómo integrarlo
1. Copia la carpeta a `src/`. `theme.ts` carga fuentes de `public/fonts`: usa las tuyas o copia las de la serie.
2. Si tu música es otra, reemplaza `ritmo.json` y redefine los `T_*` al principio de `final.ts`. Usan `golpesDe("suave")` y `golpesDe("final")`.
3. En un `<canvas>` 2D: `dibujarFinal(ctx, disposicion(W, H), t, cuadroLic, imagenMarca)`. Superpón «LECTURES» con `NOTAS_LECTURES`, como en `teaser-lectures/src/Video.tsx`.
4. Comprobado: `tsc --noEmit` compila esta carpeta tal como está.
