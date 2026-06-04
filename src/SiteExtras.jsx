import { BRAND, CRISIS_LINES, ESTIMATED_MINUTES } from "./analysisConfig.js";

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
  return (
    <p style={{ ...boxStyle, marginBottom: 16, color: "var(--fg-soft)", ...style }}>
      <span style={{ color: "var(--accent)", letterSpacing: 1 }}>ESTIMERT TID · </span>
      ca. {ESTIMATED_MINUTES.min}–{ESTIMATED_MINUTES.max} minutter (avhengig av antall spørsmål før analyse).
    </p>
  );
}

export function CrisisHelpBox({ compact = false, style = {} }) {
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
        TRENGER DU HJELP NÅ?
      </div>
      <p style={{ marginBottom: 8, color: "var(--fg-soft)" }}>
        Sjelsscanner erstatter ikke krisehjelp eller behandling. Ved akutt ubehag eller krise:
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, color: "var(--fg-soft)" }}>
        {CRISIS_LINES.map((line) => (
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
  return (
    <p style={{ ...boxStyle, marginBottom: 16, ...style }}>
      <span style={{ color: "var(--accent)", letterSpacing: 1 }}>KONTAKT · </span>
      {BRAND.company} —{" "}
      <a href={`mailto:${BRAND.contactEmail}`} style={linkStyle}>
        {BRAND.contactEmail}
      </a>
      {BRAND.websiteUrl ? (
        <>
          {" "}
          ·{" "}
          <a href={BRAND.websiteUrl} style={linkStyle} target="_blank" rel="noopener noreferrer">
            rosten.no
          </a>
        </>
      ) : null}
    </p>
  );
}

export function ConsentDetails() {
  return (
    <span>
      Jeg samtykker til at {BRAND.product} lagrer navn, alder og e-post hos {BRAND.company} (Netlify,
      EU/US avhengig av hosting). Mine svar sendes til <strong style={{ color: "var(--fg-soft)" }}>Google Gemini</strong>{" "}
      for å generere spørsmål og rapport — ikke til andre formål enn denne kartleggingen. Jeg har lest{" "}
      <a href="/personvern" style={linkStyle}>
        personvernerklæringen
      </a>
      . Behandling i tråd med GDPR.
    </span>
  );
}