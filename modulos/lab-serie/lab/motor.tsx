/* ═══ MOTOR DE SIMULACIONES (lab de bnsolutions.cl, versión reel) ═══════════
   Mismo contrato que lab.js: cada simulación es un step(ctx, w, h, t) que se
   llama en cada cuadro. Diferencia con la web: allá t avanza con
   requestAnimationFrame y los sliders los mueve la persona; aquí t sale del
   cuadro de Remotion y los parámetros los fija la escena, anclados a la voz.
   Por eso step tiene que ser una función pura de t: sin estado entre cuadros,
   o el render en paralelo saca cuadros distintos.
   El lienzo ocupa todo el cuadro, sin ventana: la simulación es el fondo.
═══════════════════════════════════════════════════════════════════════════ */
import React, { useLayoutEffect, useRef } from "react";
import { useVideoConfig } from "remotion";
import { H, TT, W, YT, formato } from "../theme";

export type Paso = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void;

// En horizontal el lienzo cubre todo el cuadro y la escena se dibuja con la transformación de YT,
// así las líneas de campo siguen hasta el borde en vez de cortarse en el ancho de la escena vertical.
// Una máscara la desvanece hacia la columna de texto, para que nada pase detrás de las cifras.
const MASCARA = `linear-gradient(90deg, transparent ${YT.col.x + YT.col.w - 40}px, #000 ${YT.ox + 60}px)`;
const Lienzo: React.FC<{ t: number; step: Paso }> = ({ t, step }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const { width, height } = useVideoConfig();
  const horizontal = width > height;
  const alto = formato(width, height) === "alto";
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (horizontal) ctx.setTransform(YT.s, 0, 0, YT.s, YT.ox, YT.oy);
    if (alto) ctx.setTransform(1, 0, 0, 1, 0, TT.oy);
    step(ctx, W, H, t);
  });
  const mascara: React.CSSProperties = horizontal ? { maskImage: MASCARA, WebkitMaskImage: MASCARA } : {};
  return <canvas ref={ref} width={width} height={height} style={{ position: "absolute", left: 0, top: 0, width, height, ...mascara }} />;
};
export const Simulacion = Object.assign(Lienzo, { lienzo: true });
