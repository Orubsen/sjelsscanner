import { BRAND } from "./analysisConfig.js";
import { CrisisHelpBox, ContactRosten } from "./SiteExtras.jsx";
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
  return (
    <div className="app-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Crimson+Pro:wght@400&display=swap');
        :root {
          --bg: #080a0f; --surface: #0d1117; --border: #1c2230;
          --fg: #e2e8f0; --fg-soft: #a8b4c4; --dim: #4a5568;
          --accent: #818cf8; --mono: 'IBM Plex Mono', monospace;
          --body: 'Crimson Pro', serif;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: var(--bg); color: var(--fg); min-height: 100vh; padding-bottom: 72px; }
        a { color: var(--accent); }
      `}</style>

      <div
        className="layout-shell"
        style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px", width: "100%" }}
      >
        <a
          href="/"
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: 2,
            color: "var(--dim)",
            textDecoration: "none",
            display: "inline-block",
            marginBottom: 24,
          }}
        >
          ← TILBAKE TIL {BRAND.product.toUpperCase()}
        </a>

        <h1
          style={{
            fontFamily: "var(--mono)",
            fontSize: 22,
            letterSpacing: 2,
            color: "var(--accent)",
            marginBottom: 8,
          }}
        >
          PERSONVERNERKLÆRING
        </h1>
        <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)", marginBottom: 32 }}>
          {BRAND.company} · {BRAND.product} · Sist oppdatert {new Date().toLocaleDateString("nb-NO")}
        </p>

        <CrisisHelpBox />

        <section style={section}>
          <h2 style={h2style}>BEHANDLINGSANSVARLIG</h2>
          <p>
            {BRAND.company} ({BRAND.name}) er behandlingsansvarlig for personopplysninger du oppgir i{" "}
            {BRAND.product}. Kontakt:{" "}
            <a href={`mailto:${BRAND.contactEmail}`}>{BRAND.contactEmail}</a>.
          </p>
        </section>

        <section style={section}>
          <h2 style={h2style}>HVILKE DATA VI SAMLER INN</h2>
          <ul style={{ paddingLeft: 20 }}>
            <li>Navn, alder og e-post (når du starter kartleggingen)</li>
            <li>Dine svar på spørsmål og den genererte rapporten (lagres lokalt i nettleseren under økten)</li>
            <li>Tekniske data via hosting (Netlify), f.eks. IP-adresse i serverlogger</li>
          </ul>
        </section>

        <section style={section}>
          <h2 style={h2style}>FORMÅL OG RETTSLIG GRUNNLAG</h2>
          <p>
            Vi behandler opplysningene for å gjennomføre kartleggingen du ber om, lagre registrering for
            oppfølging, og forbedre tjenesten. Grunnlag: ditt samtykke (GDPR art. 6 nr. 1 bokstav a) og
            berettiget interesse i sikker drift.
          </p>
        </section>

        <section style={section}>
          <h2 style={h2style}>GOOGLE GEMINI (AI)</h2>
          <p>
            Spørsmål og svar sendes til <strong>Google Gemini</strong> (Googles API) for å generere neste
            spørsmål og den psykoanalytiske rapporten. Google kan behandle data i henhold til sine vilkår.
            Vi sender ikke data til andre AI-leverandører for denne tjenesten. Ikke oppgi sensitive
            personopplysninger du ikke ønsker delt med AI-systemet.
          </p>
        </section>

        <section style={section}>
          <h2 style={h2style}>LAGRING OG HOSTING</h2>
          <p>
            Navn, alder og e-post lagres i <strong>Netlify Blobs</strong> (hosting hos Netlify). Økt-data
            (spørsmål/svar underveis) lagres primært lokalt på din enhet til du avslutter eller sletter
            nettleserdata. Ved fullført analyse markeres registreringen som fullført i vårt system.
          </p>
        </section>

        <section style={section}>
          <h2 style={h2style}>HVOR LENGE VI LAGRER</h2>
          <p>
            Deltakerregistreringer beholdes til du ber om sletting eller vi gjennomfører rutinemessig
            opprydding. Ta kontakt på e-post for sletting av dine opplysninger.
          </p>
        </section>

        <section style={section}>
          <h2 style={h2style}>DINE RETTIGHETER</h2>
          <p>
            Du kan be om innsyn, retting, sletting, begrensning, dataportabilitet og å trekke tilbake
            samtykke. Klage kan sendes til Datatilsynet. Kontakt oss først på{" "}
            <a href={`mailto:${BRAND.contactEmail}`}>{BRAND.contactEmail}</a>.
          </p>
        </section>

        <section style={section}>
          <h2 style={h2style}>IKKE HELSETJENESTE</h2>
          <p>
            {BRAND.product} er ikke diagnose, behandling eller akutt hjelp. Ved krise, bruk
            nødnumrene under.
          </p>
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
          Scanner
        </a>
        <a href="/personvern" style={{ color: "var(--accent)" }}>
          Personvern
        </a>
      </footer>
    </div>
  );
}