import { useEffect, useRef } from "react";

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only on desktop
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mx = 0, my = 0, rx = 0, ry = 0;
    let rafId: number;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.left = `${mx}px`;
      dot.style.top = `${my}px`;
    };

    const lerp = () => {
      rx += (mx - rx) * 0.1;
      ry += (my - ry) * 0.1;
      ring.style.left = `${rx}px`;
      ring.style.top = `${ry}px`;
      rafId = requestAnimationFrame(lerp);
    };

    document.addEventListener("mousemove", onMove);
    rafId = requestAnimationFrame(lerp);

    return () => {
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Don't render on touch devices
  if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
    return null;
  }

  return (
    <>
      <div
        ref={dotRef}
        style={{
          position: "fixed",
          zIndex: 9999,
          pointerEvents: "none",
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "var(--mint)",
          transform: "translate(-50%,-50%)",
          boxShadow: "0 0 12px rgba(0,194,120,0.7)",
          transition: "width 0.15s var(--ease), height 0.15s var(--ease)",
        }}
      />
      <div
        ref={ringRef}
        style={{
          position: "fixed",
          zIndex: 9998,
          pointerEvents: "none",
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "1px solid rgba(0,194,120,0.4)",
          transform: "translate(-50%,-50%)",
          transition: "width 0.4s var(--ease), height 0.4s var(--ease), opacity 0.2s",
        }}
      />
    </>
  );
}
