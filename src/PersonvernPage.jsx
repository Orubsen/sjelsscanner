import { CrisisHelpBox, ContactRosten } from "./SiteExtras.jsx";
import { useI18n } from "./i18n/I18nContext.jsx";
import { LanguageSwitcher } from "./i18n/LanguageSwitcher.jsx";
import "./theme.css";

const section = {
  marginBottom: 28,
  fontFamily: "var(--body)",
  fontSize: 15,
  lineHeight: 1.75,
  color: "var(--fg-soft)",
};

const h2style = {
  fontFamily: "var(--mono)",
  fontSize: 11,
  letterSpacing: 2,
  color: "var(--accent)",
  marginBottom: 12,
};

export default function PersonvernPage() {
  const { t, brand, dateLocale, privacySections } = useI18n();
  const updated = new Date().toLocaleDateString(dateLocale || "nb-NO");

  return (
    <div className="app-root">
      {/* F3 – :root, @import og base-stiler er flytta til theme.css (importert globalt via main.jsx) */}

      <div
        className="layout-shell"
        style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px", width: "100%" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          <a
            href="/"
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: 2,
              color: "var(--dim)",
              textDecoration: "none",
            }}
          >
            {t("privacy.back", { product: brand.product.toUpperCase() })}
          </a>
          <LanguageSwitcher />
        </div>

        <h1
          style={{
            fontFamily: "var(--mono)",
            fontSize: 22,
            letterSpacing: 2,
            color: "var(--accent)",
            marginBottom: 8,
          }}
        >
          {t("privacy.title")}
        </h1>
        <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)", marginBottom: 32 }}>
          {brand.company} · {brand.product} · {t("privacy.updated")} {updated}
        </p>

        <CrisisHelpBox />

        <section style={section}>
          <h2 style={h2style}>{privacySections.controller.title}</h2>
          <p>
            {t("privacy.sections.controller.body", { company: brand.company, name: brand.name, product: brand.product })}{" "}
            <a href={`mailto:${brand.contactEmail}`}>{brand.contactEmail}</a>.
          </p>
        </section>

        <section style={section}>
          <h2 style={h2style}>{privacySections.data.title}</h2>
          <ul style={{ paddingLeft: 20 }}>
            {privacySections.data.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        <section style={section}>
          <h2 style={h2style}>{privacySections.purpose.title}</h2>
          <p>{privacySections.purpose.body}</p>
        </section>

        <section style={section}>
          <h2 style={h2style}>{privacySections.gemini.title}</h2>
          <p>{privacySections.gemini.body}</p>
        </section>

        <section style={section}>
          <h2 style={h2style}>{privacySections.storage.title}</h2>
          <p>{privacySections.storage.body}</p>
        </section>

        <section style={section}>
          <h2 style={h2style}>{privacySections.retention.title}</h2>
          <p>{privacySections.retention.body}</p>
        </section>

        <section style={section}>
          <h2 style={h2style}>{privacySections.rights.title}</h2>
          <p>
            {privacySections.rights.body}{" "}
            <a href={`mailto:${brand.contactEmail}`}>{brand.contactEmail}</a>.
          </p>
        </section>

        <section style={section}>
          <h2 style={h2style}>{privacySections.notHealthcare.title}</h2>
          <p>{t("privacy.sections.notHealthcare.body", { product: brand.product })}</p>
        </section>

        <ContactRosten />
      </div>

      <footer
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "12px 16px",
          textAlign: "center",
          fontFamily: "var(--mono)",
          fontSize: 10,
          color: "var(--dim)",
          borderTop: "1px solid var(--border)",
          background: "rgba(8,10,15,0.95)",
        }}
      >
        <a href="/" style={{ color: "var(--dim)", marginRight: 16 }}>
          {t("privacy.footerScanner")}
        </a>
        <a href="/personvern" style={{ color: "var(--accent)" }}>
          {t("privacy.footerPrivacy")}
        </a>
      </footer>
    </div>
  );
}