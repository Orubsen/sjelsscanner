import { useI18n } from "./i18n/I18nContext.jsx";

const linkStyle = {
  color: "var(--accent)",
  textDecoration: "none",
};

const summaryStyle = {
  fontSize: 10,
  letterSpacing: 2,
  fontFamily: "var(--mono)",
  cursor: "pointer",
  listStyle: "none",
};

const detailsBase = {
  width: "100%",
  marginBottom: 12,
  textAlign: "left",
};

const panelStyle = {
  marginTop: 12,
  padding: 14,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  fontFamily: "var(--mono)",
  fontSize: 11,
  lineHeight: 1.65,
  color: "var(--dim)",
};

function InfoDropdown({ title, titleColor = "var(--dim)", variant = "default", style = {}, children }) {
  const isCrisis = variant === "crisis";
  return (
    <details
      style={{
        ...detailsBase,
        ...style,
      }}
    >
      <summary
        style={{
          ...summaryStyle,
          color: titleColor,
        }}
      >
        {title}
      </summary>
      <div
        style={{
          ...panelStyle,
          ...(isCrisis
            ? {
                borderColor: "var(--crisis-border)",
                background: "var(--crisis-bg)",
              }
            : { color: "var(--fg-soft)" }),
        }}
      >
        {children}
      </div>
    </details>
  );
}

export function EstimatedTimeNote({ style = {} }) {
  const { t, brand } = useI18n();
  const { min, max } = brand.estimatedMinutes || { min: 15, max: 30 };
  const title = t("estimatedTime.label").replace(/\s*·\s*$/, "").trim();
  return (
    <InfoDropdown title={title} titleColor="var(--accent)" style={style}>
      {t("estimatedTime.text", { min, max })}
    </InfoDropdown>
  );
}

export function CrisisHelpBox({ compact = false, style = {} }) {
  const { t, crisisLines } = useI18n();
  return (
    <InfoDropdown
      title={t("crisis.title")}
      titleColor="var(--crisis)"
      variant="crisis"
      style={{ marginBottom: compact ? 8 : 12, ...style }}
    >
      <p style={{ marginBottom: 8, color: "var(--fg-soft)" }}>{t("crisis.intro")}</p>
      <ul style={{ margin: 0, paddingLeft: 18, color: "var(--fg-soft)" }}>
        {crisisLines.map((line) => (
          <li key={line.label} style={{ marginBottom: 4 }}>
            {line.label}:{" "}
            <a href={line.href} style={linkStyle}>
              {line.value}
            </a>
          </li>
        ))}
      </ul>
    </InfoDropdown>
  );
}

export function ContactRosten({ style = {} }) {
  const { t, brand } = useI18n();
  return (
    <p
      style={{
        padding: 14,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        fontFamily: "var(--mono)",
        fontSize: 11,
        lineHeight: 1.65,
        color: "var(--dim)",
        marginBottom: 16,
        textAlign: "center",
        ...style,
      }}
    >
      <a href={`mailto:${brand.contactEmail}`} style={linkStyle}>
        {t("footer.contact")}
      </a>
      {brand.websiteUrl ? (
        <>
          {" · "}
          <a href={brand.websiteUrl} style={linkStyle} target="_blank" rel="noopener noreferrer">
            {t("contact.website")}
          </a>
        </>
      ) : null}
    </p>
  );
}

/* Non-collapsible gold-styled crisis box matching the redesign */
export function CrisisBox() {
  return (
    <div style={{
      border: "1px solid rgba(197,163,104,0.3)",
      background: "var(--gold-alpha-12)",
      padding: "14px 18px",
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <span className="kk-label" style={{ color: "var(--gold)" }}>Trenger du hjelp nå?</span>
      <span style={{ fontSize: 15, color: "var(--fg-soft)", lineHeight: 1.5 }}>
        Kjernekoden erstatter ikke krisehjelp eller behandling. Mental Helse:{" "}
        <a href="tel:116123" style={{ color: "var(--gold)" }}>116 123</a> · Akutt:{" "}
        <a href="tel:113" style={{ color: "var(--gold)" }}>113</a>
      </span>
    </div>
  );
}

export function ConsentDetails() {
  const { t } = useI18n();
  const privacyHref = "/personvern";
  const body = t("consent.body");
  const linkText = t("consent.privacyLink");
  const parts = body.split(linkText);
  return (
    <span>
      {parts[0]}
      <a href={privacyHref} style={linkStyle}>
        {linkText}
      </a>
      {parts[1] || ""}
    </span>
  );
}