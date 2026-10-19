import React, { useLayoutEffect, useRef, useState } from "react";
import { estado } from "./guion";
import { Motor } from "./motor";

// GPU body of the teaser (0 s to the approved final). One WebGL2 context per tab, reused across frames; each frame is
// rendered synchronously from estado(t), so parallel renders are deterministic.
const N_PART = 1 << 20;

export const Cuerpo: React.FC<{ t: number; W: number; H: number; opacidad?: number }> = ({ t, W, H, opacidad = 1 }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const motor = useRef<Motor | null>(null);
  const [error, setError] = useState<string | null>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    try {
      if (!motor.current) motor.current = new Motor(ref.current, W, H, N_PART);
      const e = estado(t, W, H);
      motor.current.render(e.comun, e.mundos, e.part, e.post, e.trazos, e.linGanancia);
    } catch (err) {
      setError(String((err as Error).message ?? err));
    }
  });
  return (
    <>
      <canvas ref={ref} width={W} height={H} style={{ position: "absolute", left: 0, top: 0, width: W, height: H, opacity: opacidad }} />
      {error ? <pre style={{ position: "absolute", left: 10, top: 10, color: "#f55", fontSize: 18, whiteSpace: "pre-wrap", background: "#000c" }}>{error}</pre> : null}
    </>
  );
};
