import { BRAND } from "./analysisConfig.js";

const LOGO_SRC = "/rosten-logo.svg";
/** White © for dark backgrounds — Wikimedia: Copyright_white.svg (PD) */
const COPYRIGHT_SYMBOL_SRC = "/copyright-symbol.svg";

const watermarkStyle = {
  position: "fixed",
  right: 20,
  bottom: 52,
  width: 88,
  height: 88,
  opacity: 0.07,
  pointerEvents: "none",
  zIndex: 50,
  filter: "grayscale(20%)",
};

const headerStyle = {
  position: "fixed",
  top: 14,
  right: 16,
  zIndex: 900,
  display: "flex",
  alignItems: "center",
  gap: 10,
  pointerEvents: "none",
};

const headerLogoStyle = {
  width: 36,
  height: 36,
  opacity: 0.42,
  filter: "drop-shadow(0 0 12px rgba(129,140,248,0.15))",
};

const footerStyle = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 900,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "10px 16px",
  background: "linear-gradient(to top, rgba(8,10,15,0.95), rgba(8,10,15,0.75))",
  borderTop: "1px solid var(--border)",
  fontFamily: "var(--mono)",
  fontSize: 10,
  letterSpacing: 1,
  color: "var(--dim)",
  pointerEvents: "none",
};

export function BrandWatermark() {
  return (
    <img
      src={LOGO_SRC}
      alt=""
      aria-hidden
      style={watermarkStyle}
    />
  );
}

export function BrandHeader() {
  return (
    <div style={headerStyle} aria-hidden>
      <img src={LOGO_SRC} alt="" style={headerLogoStyle} />
    </div>
  );
}

export function BrandFooter({ company = BRAND.company }) {
  const year = new Date().getFullYear();
  return (
    <footer style={footerStyle}>
      <img
        src={COPYRIGHT_SYMBOL_SRC}
        alt="Copyright"
        width={16}
        height={16}
        style={{ opacity: 0.85, flexShrink: 0 }}
      />
      <span>
        {year} {company}. Alle rettigheter reservert.
      </span>
    </footer>
  );
}

export function IntroBrandMark() {
  return (
    <img
      src={LOGO_SRC}
      alt="Røsten"
      style={{
        width: 56,
        height: 56,
        marginBottom: 20,
        opacity: 0.85,
        filter: "drop-shadow(0 0 20px rgba(129,140,248,0.25))",
      }}
    />
  );
}