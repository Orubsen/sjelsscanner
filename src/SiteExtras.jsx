import { useI18n } from "./i18n/I18nContext.jsx";

const boxStyle = {
  padding: 14,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  fontFamily: "var(--mono)",
  fontSize: 11,
  lineHeight: 1.65,
  color: "var(--dim)",
};

const linkStyle = {
  color: "var(--accent)",
  textDecoration: "none",
};

export function EstimatedTimeNote({ style = {} }) {
  const { t, brand } = useI18n();
  const { min, max } = brand.estimatedMinutes || { min: 15, max: 30 };
  return (
    <p style={{ ...boxStyle, marginBottom: 16, color: "var(--fg-soft)", ...style }}>
      <span style={{ color: "var(--accent)", letterSpacing: 1 }}>{t("estimatedTime.label")}</span>
      {t("estimatedTime.text", { min, max })}
    </p>
  );
}

export function CrisisHelpBox({ compact = false, style = {} }) {
  const { t, crisisLines } = useI18n();
  return (
    <div
      style={{
        ...boxStyle,
        borderColor: "rgba(248,113,113,0.35)",
        background: "rgba(248,113,113,0.06)",
        marginBottom: compact ? 12 : 20,
        ...style,
      }}
    >
      <div style={{ fontSize: 10, letterSpacing: 2, color: "#fca5a5", marginBottom: 8 }}>
        {t("crisis.title")}
      </div>
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
    </div>
  );
}

export function ContactRosten({ style = {} }) {
  const { t, brand } = useI18n();
  return (
    <p style={{ ...boxStyle, marginBottom: 16, textAlign: "center", ...style }}>
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

export function ConsentDetails() {
  const { t, brand } = useI18n();
  const privacyHref = "/personvern";
  const body = t("consent.body", {
    product: brand.product,
    company: brand.company,
  });
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