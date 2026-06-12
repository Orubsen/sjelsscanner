import { useState, useEffect, useRef } from "react";
import { useI18n } from "./i18n/I18nContext.jsx";

const LOGO_SRC = "/rosten-logo.svg";

/* ---------- ParticleField motion engine ----------
   modes: "partikler" — drifting constellation (IQVIA-like)
          "puls"      — soft breathing radial glow
          "rolig"     — static gradient, no animation          */
export function ParticleField({ mode = "partikler", intensity = 1 }) {
  const canvasRef = useRef(null);
  const reduced = typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
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
      w = canvas.offsetWidth; h = canvas.offsetHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // particles biased to the right side, like a loose sphere
    const cx = () => w * 0.78, cy = () => h * 0.42;
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
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -20) p.x = w + 20; if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20; if (p.y > h + 20) p.y = -20;
        const tw = 0.55 + 0.45 * Math.sin(t * 1.4 + p.tw);
        ctx.fillStyle = p.gold
          ? `rgba(197,163,104,${(0.5 * tw).toFixed(3)})`
          : `rgba(165,176,255,${(0.55 * tw).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [effMode, intensity]);

  const base = {
    position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
  };

  if (effMode === "puls") {
    return (
      <div style={base} aria-hidden="true">
        <div style={{
          position: "absolute", inset: 0,
          background:
            "radial-gradient(ellipse 60% 45% at 50% 42%, rgba(63,55,150,0.32), transparent 70%), " +
            "radial-gradient(ellipse 90% 70% at 50% 50%, rgba(28,22,66,0.5), transparent 75%)",
          animation: reduced ? "none" : "kk-breathe 7s ease-in-out infinite",
        }}></div>
        <style>{`
          @keyframes kk-breathe {
            0%, 100% { opacity: 0.65; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.06); }
          }
          @media (prefers-reduced-motion: reduce) { .kk-pulse-glow { animation: none; } }
        `}</style>
      </div>
    );
  }

  if (effMode === "rolig") {
    return (
      <div style={{
        ...base,
        background:
          "radial-gradient(ellipse 70% 50% at 72% 38%, rgba(63,55,150,0.22), transparent 70%)",
      }} aria-hidden="true"></div>
    );
  }

  return (
    <div style={base} aria-hidden="true">
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 55% 48% at 78% 42%, rgba(63,55,150,0.28), transparent 70%)",
      }}></div>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}></canvas>
    </div>
  );
}

/* ---------- BrandWatermark ---------- */
export function BrandWatermark() {
  return (
    <img
      src={LOGO_SRC}
      alt=""
      aria-hidden
      style={{
        position: "fixed",
        right: 20,
        bottom: 52,
        width: 88,
        height: 88,
        opacity: 0.07,
        pointerEvents: "none",
        zIndex: 50,
        filter: "grayscale(20%)",
      }}
    />
  );
}

/* ---------- BrandHeader ---------- */
export function BrandHeader({ onLogo, right }) {
  return (
    <div style={{
      position: "fixed",
      top: 14,
      left: 16,
      right: 16,
      zIndex: 900,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }}>
      <div
        onClick={onLogo}
        style={{
          cursor: onLogo ? "pointer" : "default",
          display: "flex",
          alignItems: "center",
        }}
      >
        <img
          src={LOGO_SRC}
          alt=""
          style={{
            width: 36,
            height: 36,
            opacity: 0.42,
            filter: "drop-shadow(0 0 12px var(--accent-alpha-15))",
          }}
        />
      </div>
      {right && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {right}
        </div>
      )}
    </div>
  );
}

/* ---------- BrandFooter ---------- */
const footerWrapStyle = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 900,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  padding: "8px 16px 10px",
  background: "linear-gradient(to top, rgba(8,10,15,0.95), rgba(8,10,15,0.75))",
  borderTop: "1px solid var(--border)",
  fontFamily: "var(--mono)",
  fontSize: 10,
  letterSpacing: 1,
  color: "var(--dim)",
};

const footerLinkStyle = {
  color: "var(--dim)",
  textDecoration: "none",
  margin: "0 8px",
  transition: "color 0.15s",
};

export function BrandFooter() {
  const { t, brand } = useI18n();
  const year = new Date().getFullYear();
  const COPYRIGHT_SYMBOL_SRC = "/copyright-symbol.svg";
  return (
    <footer style={footerWrapStyle}>
      <nav style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 4 }}>
        <a href="/personvern" style={footerLinkStyle}>
          {t("footer.privacy")}
        </a>
        <a href={`mailto:${brand.contactEmail}`} style={footerLinkStyle}>
          {t("footer.contact")}
        </a>
        {brand.websiteUrl ? (
          <a href={brand.websiteUrl} style={footerLinkStyle} target="_blank" rel="noopener noreferrer">
            {t("contact.website")}
          </a>
        ) : null}
        <a href="tel:116123" style={footerLinkStyle}>
          {t("footer.crisis")}
        </a>
      </nav>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <img
          src={COPYRIGHT_SYMBOL_SRC}
          alt=""
          width={14}
          height={14}
          style={{ opacity: 0.85, flexShrink: 0 }}
          aria-hidden
        />
        <span className="brand-footer-text">
          {year} {brand.company}. {t("brand.rightsReserved")}
        </span>
      </div>
    </footer>
  );
}

/* ---------- IntroBrandMark ---------- */
export function IntroBrandMark() {
  const { brand } = useI18n();
  return (
    <img
      src={LOGO_SRC}
      alt={brand.name}
      style={{
        width: 56,
        height: 56,
        marginBottom: 20,
        opacity: 0.85,
        filter: "drop-shadow(0 0 20px var(--accent-alpha-25))",
      }}
    />
  );
}
