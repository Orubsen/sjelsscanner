import { useI18n } from "./i18n/I18nContext.jsx";

const LOGO_SRC = "/rosten-logo.svg";

/* ---- BrandWatermark (beholdt for bakoverkompatibilitet) ---- */
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

/* ---- BrandHeader — redesign ---- */
export function BrandHeader({ onLogo, right }) {
  const { brand } = useI18n();
  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px var(--pad-x)",
        background:
          "linear-gradient(to bottom, rgba(11,8,26,0.92), rgba(11,8,26,0))",
      }}
    >
      <button
        onClick={onLogo}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "none",
          border: "none",
          cursor: onLogo ? "pointer" : "default",
          padding: 0,
        }}
        aria-label="Tilbake til forsiden"
      >
        <img src={LOGO_SRC} alt={brand?.name || "Røsten"} style={{ width: 34, height: 34 }} />
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 13,
            letterSpacing: "0.32em",
            color: "var(--fg)",
            fontWeight: 600,
          }}
        >
          KJERNEKODEN
        </span>
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        {right}
      </div>
    </header>
  );
}

/* ---- BrandFooter — redesign ---- */
export function BrandFooter() {
  const { brand } = useI18n();
  const year = new Date().getFullYear();
  return (
    <footer
      style={{
        position: "relative",
        zIndex: 5,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: "26px 16px 30px",
        borderTop: "1px solid var(--border)",
        fontFamily: "var(--mono)",
        fontSize: 10.5,
        letterSpacing: "0.12em",
        color: "var(--dim)",
        background: "var(--bg-2)",
      }}
    >
      <nav
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 22,
        }}
      >
        <a href="/personvern" style={{ color: "var(--dim)", textDecoration: "none" }}>
          PERSONVERN
        </a>
        <a
          href={`mailto:${brand?.contactEmail || "kontakt@rubenrøsten.no"}`}
          style={{ color: "var(--dim)", textDecoration: "none" }}
        >
          KONTAKT
        </a>
        {brand?.websiteUrl && (
          <a
            href={brand.websiteUrl}
            style={{ color: "var(--dim)", textDecoration: "none" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            RUBENRØSTEN.NO
          </a>
        )}
        <a href="tel:116123" style={{ color: "var(--gold-soft)", textDecoration: "none" }}>
          KRISE 116 123
        </a>
      </nav>
      <span style={{ color: "var(--dim-2)" }}>
        © {year} {brand?.company || "RØSTEN ENT"}. ALLE RETTIGHETER RESERVERT.
      </span>
    </footer>
  );
}

/* ---- IntroBrandMark (beholdt for eksisterende IntroScreen) ---- */
export function IntroBrandMark() {
  const { brand } = useI18n();
  return (
    <img
      src={LOGO_SRC}
      alt={brand?.name || "Røsten"}
      style={{
        width: 60,
        height: 60,
        marginBottom: 24,
        filter: "drop-shadow(0 0 24px var(--accent-alpha-25))",
      }}
    />
  );
}
