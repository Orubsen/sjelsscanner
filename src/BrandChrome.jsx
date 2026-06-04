import { useI18n } from "./i18n/I18nContext.jsx";

const LOGO_SRC = "/rosten-logo.svg";
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

export function BrandWatermark() {
  return (
    <img src={LOGO_SRC} alt="" aria-hidden style={watermarkStyle} />
  );
}

export function BrandHeader() {
  return (
    <div style={headerStyle} aria-hidden>
      <img src={LOGO_SRC} alt="" style={headerLogoStyle} />
    </div>
  );
}

export function BrandFooter() {
  const { t, brand } = useI18n();
  const year = new Date().getFullYear();
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
        filter: "drop-shadow(0 0 20px rgba(129,140,248,0.25))",
      }}
    />
  );
}