import { useEffect, useRef } from "react";

/**
 * ParticleField – bakgrunnsanimasjon med tre stiler:
 *   "partikler"  — drivende data-partikkel-konstellasjon (IQVIA-inspirert)
 *   "puls"       — myk pulserende radial glød (rolig, Gemini-inspirert)
 *   "rolig"      — statisk gradient, ingen animasjon
 */
export function ParticleField({ mode = "partikler", intensity = 1 }) {
  const canvasRef = useRef(null);
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const effMode = reduced ? "rolig" : mode;

  useEffect(() => {
    if (effMode !== "partikler") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf, w, h, dpr;
    const N = Math.round(90 * intensity);
    let pts = [];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const cx = () => w * 0.78;
    const cy = () => h * 0.42;
    pts = Array.from({ length: N }, (_, i) => {
      const onSphere = i < N * 0.62;
      const a = Math.random() * Math.PI * 2;
      const r = onSphere
        ? (0.55 + Math.random() * 0.45) * Math.min(w, h) * 0.34
        : Math.random() * Math.max(w, h) * 0.7;
      return {
        x: onSphere ? cx() + Math.cos(a) * r : Math.random() * w,
        y: onSphere ? cy() + Math.sin(a) * r * 0.85 : Math.random() * h,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        s: 0.6 + Math.random() * 1.7,
        gold: Math.random() < 0.12,
        tw: Math.random() * Math.PI * 2,
      };
    });

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      const t = performance.now() / 1000;
      ctx.lineWidth = 0.5;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 110 * 110) {
            const o = (1 - Math.sqrt(d2) / 110) * 0.14 * intensity;
            ctx.strokeStyle = `rgba(129,140,248,${o.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;
        const tw = 0.55 + 0.45 * Math.sin(t * 1.4 + p.tw);
        ctx.fillStyle = p.gold
          ? `rgba(197,163,104,${(0.5 * tw).toFixed(3)})`
          : `rgba(165,176,255,${(0.55 * tw).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [effMode, intensity]);

  const base = {
    position: "fixed",
    inset: 0,
    zIndex: 0,
    pointerEvents: "none",
  };

  if (effMode === "puls") {
    return (
      <div style={base} aria-hidden="true">
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 60% 45% at 50% 42%, rgba(63,55,150,0.32), transparent 70%), radial-gradient(ellipse 90% 70% at 50% 50%, rgba(28,22,66,0.5), transparent 75%)",
            animation: "kk-breathe 7s ease-in-out infinite",
          }}
        />
        <style>{`
          @keyframes kk-breathe {
            0%, 100% { opacity: 0.65; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.06); }
          }
          @media (prefers-reduced-motion: reduce) {
            @keyframes kk-breathe { from { opacity: 0.65; } to { opacity: 0.65; } }
          }
        `}</style>
      </div>
    );
  }

  if (effMode === "rolig") {
    return (
      <div
        style={{
          ...base,
          background:
            "radial-gradient(ellipse 70% 50% at 72% 38%, rgba(63,55,150,0.22), transparent 70%)",
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div style={base} aria-hidden="true">
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 55% 48% at 78% 42%, rgba(63,55,150,0.28), transparent 70%)",
        }}
      />
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
    </div>
  );
}
