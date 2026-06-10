import { useState, useEffect } from "react";
import { ParticleField } from "./ParticleField.jsx";
import { BrandFooter } from "./BrandChrome.jsx";
import { useI18n } from "./i18n/I18nContext.jsx";

/* -----------------------------------------------------------------------
 * Statiske data
 * ----------------------------------------------------------------------- */
const DEPTH_AREAS = [
  { id: "attach",    label: "Tilknytning",        x: 52, y: 18  },
  { id: "trauma",    label: "Trauma / ACE",        x: 78, y: 30  },
  { id: "big5o",     label: "Åpenhet",             x: 32, y: 28  },
  { id: "big5c",     label: "Planmessighet",        x: 14, y: 48  },
  { id: "big5e",     label: "Ekstraversjon",        x: 24, y: 68  },
  { id: "big5a",     label: "Medmenneskelig",       x: 46, y: 82  },
  { id: "big5n",     label: "Nevrotisisme",         x: 68, y: 74  },
  { id: "defense",   label: "Forsvar",              x: 86, y: 55  },
  { id: "shadow",    label: "Skyggen",              x: 80, y: 14  },
  { id: "anima",     label: "Anima / Animus",       x: 62, y: 48  },
  { id: "id",        label: "Id",                   x: 38, y: 52  },
  { id: "ego",       label: "Ego",                  x: 55, y: 62  },
  { id: "superego",  label: "Superego",             x: 42, y: 38  },
  { id: "ace",       label: "ACE-mønstre",          x: 90, y: 36  },
  { id: "resiliens", label: "Resiliens",            x: 20, y: 86  },
];

/* Koblinger mellom noder */
const STAR_EDGES = [
  ["attach","trauma"],["attach","anima"],["attach","superego"],
  ["trauma","ace"],["trauma","shadow"],
  ["big5o","big5c"],["big5c","big5e"],["big5e","big5a"],["big5a","big5n"],["big5n","defense"],
  ["big5o","superego"],["big5n","ego"],
  ["defense","shadow"],["shadow","ace"],
  ["id","ego"],["ego","superego"],["ego","anima"],
  ["resiliens","big5e"],["resiliens","attach"],
  ["ace","defense"],
];

const FRAMEWORKS = [
  {
    id: "bigfive",
    title: "Big Five",
    desc: "Fem-faktor modellen kartlegger grunnleggende personlighetsdimensjoner som er stabile på tvers av kulturer.",
    glyph: <GlyphBigFive />,
  },
  {
    id: "attachment",
    title: "Tilknytningsteori",
    desc: "Bowlbys rammeverk for hvordan tidlige relasjoner former indre arbeidsmodeller og fremtidig adferd.",
    glyph: <GlyphTilknytning />,
  },
  {
    id: "defense",
    title: "Forsvarsmekanismer",
    desc: "Psykodynamiske strategier selvet bruker for å beskytte seg mot indre konflikt og angst.",
    glyph: <GlyphForsvar />,
  },
  {
    id: "jung",
    title: "Jungiansk analyse",
    desc: "Arketyper, skyggen og det kollektive ubevisste — kartlegger dypere lag av psyken.",
    glyph: <GlyphJung />,
  },
  {
    id: "freud",
    title: "Freudiansk teori",
    desc: "Id, ego og superego — de tre intrapsykiske instansene og deres dynamikk.",
    glyph: <GlyphFreud />,
  },
  {
    id: "ace",
    title: "ACE-forskning",
    desc: "Adverse Childhood Experiences: sammenheng mellom tidlig motgang og livslangt psykologisk mønster.",
    glyph: <GlyphAce />,
  },
];

const STEPS = [
  {
    n: "01",
    title: "Registrer deg",
    desc: "Oppgi navn og alder. Din data lagres lokalt og aldri koblet til din identitet.",
  },
  {
    n: "02",
    title: "Svar på spørsmålene",
    desc: "Mellom 15 og 25 spørsmål generert av AI på tvers av 6 psykologiske rammeverk.",
  },
  {
    n: "03",
    title: "Les analysen",
    desc: "Motta en strukturert rapport som dekonstruerer mønstre du kanskje ikke er klar over selv.",
  },
];

/* -----------------------------------------------------------------------
 * Geometriske SVG-glyfer per rammeverk
 * ----------------------------------------------------------------------- */
function GlyphBigFive() {
  const pts = Array.from({ length: 5 }, (_, i) => {
    const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
    return [20 + 14 * Math.cos(a), 20 + 14 * Math.sin(a)];
  });
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <polygon
        points={pts.map((p) => p.join(",")).join(" ")}
        stroke="var(--accent)"
        strokeWidth="1.2"
        fill="none"
        opacity="0.6"
      />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2" fill="var(--accent)" opacity="0.9" />
      ))}
    </svg>
  );
}

function GlyphTilknytning() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <circle cx="12" cy="20" r="5" stroke="var(--accent)" strokeWidth="1.2" fill="none" opacity="0.6" />
      <circle cx="28" cy="20" r="5" stroke="var(--gold)" strokeWidth="1.2" fill="none" opacity="0.6" />
      <line x1="17" y1="20" x2="23" y2="20" stroke="var(--accent)" strokeWidth="1.2" opacity="0.7" />
      <line x1="12" y1="15" x2="28" y2="15" stroke="var(--border)" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.5" />
    </svg>
  );
}

function GlyphForsvar() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <path
        d="M20 5 L33 11 L33 23 Q33 32 20 37 Q7 32 7 23 L7 11 Z"
        stroke="var(--accent)"
        strokeWidth="1.2"
        fill="none"
        opacity="0.6"
      />
      <line x1="20" y1="13" x2="20" y2="29" stroke="var(--accent)" strokeWidth="0.8" opacity="0.4" />
      <line x1="13" y1="18" x2="27" y2="18" stroke="var(--accent)" strokeWidth="0.8" opacity="0.4" />
    </svg>
  );
}

function GlyphJung() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="14" stroke="var(--accent)" strokeWidth="1.2" fill="none" opacity="0.5" />
      <path d="M20 6 A7 7 0 0 1 20 20 A7 7 0 0 0 20 34" stroke="var(--accent)" strokeWidth="1.2" fill="none" opacity="0.8" />
      <circle cx="20" cy="13" r="2.5" fill="var(--accent)" opacity="0.9" />
      <circle cx="20" cy="27" r="2.5" fill="var(--bg-2)" stroke="var(--accent)" strokeWidth="1" opacity="0.7" />
    </svg>
  );
}

function GlyphFreud() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <rect x="7" y="8" width="26" height="7" stroke="var(--accent)" strokeWidth="1.2" fill="none" opacity="0.5" />
      <rect x="7" y="17" width="26" height="7" stroke="var(--accent)" strokeWidth="1.2" fill="none" opacity="0.65" />
      <rect x="7" y="26" width="26" height="7" stroke="var(--gold)" strokeWidth="1.2" fill="none" opacity="0.55" />
      <text x="20" y="14" textAnchor="middle" fill="var(--dim)" fontFamily="var(--mono)" fontSize="5.5">superego</text>
      <text x="20" y="23" textAnchor="middle" fill="var(--dim)" fontFamily="var(--mono)" fontSize="5.5">ego</text>
      <text x="20" y="32" textAnchor="middle" fill="var(--gold)" fontFamily="var(--mono)" fontSize="5.5" opacity="0.8">id</text>
    </svg>
  );
}

function GlyphAce() {
  const dots = [
    [20, 8], [14, 18], [26, 18],
    [8, 28], [20, 28], [32, 28],
  ];
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <polygon
        points={`${dots[0].join(",")} ${dots[3].join(",")} ${dots[5].join(",")}`}
        stroke="var(--error)"
        strokeWidth="1"
        fill="none"
        opacity="0.35"
      />
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 0 ? 2.5 : 2} fill={i === 0 ? "var(--error)" : "var(--accent)"} opacity={i === 0 ? 0.9 : 0.65} />
      ))}
    </svg>
  );
}

/* -----------------------------------------------------------------------
 * StarMap — SVG-konstellasjonskart over 15 psykologiske dybdeområder
 * ----------------------------------------------------------------------- */
function StarMap() {
  const [hovered, setHovered] = useState(null);
  const W = 480, H = 300;

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: W, margin: "0 auto" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        aria-label="Psykologisk stjernekartkart"
      >
        {/* Koblingslinjer */}
        {STAR_EDGES.map(([aId, bId], i) => {
          const a = DEPTH_AREAS.find((d) => d.id === aId);
          const b = DEPTH_AREAS.find((d) => d.id === bId);
          if (!a || !b) return null;
          return (
            <line
              key={i}
              x1={(a.x / 100) * W}
              y1={(a.y / 100) * H}
              x2={(b.x / 100) * W}
              y2={(b.y / 100) * H}
              stroke="rgba(129,140,248,0.18)"
              strokeWidth="0.7"
            />
          );
        })}
        {/* Noder */}
        {DEPTH_AREAS.map((d) => {
          const cx = (d.x / 100) * W;
          const cy = (d.y / 100) * H;
          const isHov = hovered === d.id;
          return (
            <g
              key={d.id}
              onMouseEnter={() => setHovered(d.id)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "default" }}
            >
              {isHov && (
                <circle cx={cx} cy={cy} r={8} fill="rgba(129,140,248,0.12)" />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={isHov ? 3.5 : 2.5}
                fill={isHov ? "var(--accent-bright)" : "var(--accent)"}
                opacity={isHov ? 1 : 0.75}
                style={{ transition: "r 0.15s, opacity 0.15s" }}
              />
              {isHov && (
                <text
                  x={cx + (d.x > 80 ? -8 : 8)}
                  y={cy - 8}
                  textAnchor={d.x > 80 ? "end" : "start"}
                  fill="var(--fg)"
                  fontFamily="var(--mono)"
                  fontSize="9"
                  letterSpacing="0.06em"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {/* Legende */}
      <div
        style={{
          position: "absolute",
          bottom: 8,
          right: 0,
          fontFamily: "var(--mono)",
          fontSize: 9,
          color: "var(--dim)",
          letterSpacing: "0.1em",
          opacity: 0.6,
        }}
      >
        HOVER FOR NAVN
      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------
 * EngineStat — tall med glitch-effekt
 * ----------------------------------------------------------------------- */
const GLITCH = "!@#$%^*01";

function EngineStat({ value, label }) {
  const [display, setDisplay] = useState(String(value));
  const [glitching, setGlitching] = useState(false);

  useEffect(() => {
    const startGlitch = () => {
      setGlitching(true);
      let frame = 0;
      const val = String(value);
      const id = setInterval(() => {
        if (frame >= 7) {
          setDisplay(val);
          setGlitching(false);
          clearInterval(id);
          return;
        }
        setDisplay(
          val
            .split("")
            .map((c, i) =>
              i < frame * 2
                ? c
                : GLITCH[Math.floor(Math.random() * GLITCH.length)]
            )
            .join("")
        );
        frame++;
      }, 55);
    };

    const initial = setTimeout(startGlitch, Math.random() * 600 + 200);
    const recurring = setInterval(startGlitch, 6000 + Math.random() * 4000);
    return () => {
      clearTimeout(initial);
      clearInterval(recurring);
    };
  }, [value]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span
        style={{
          fontFamily: "var(--display)",
          fontSize: "clamp(2.6rem, 6vw, 4rem)",
          fontWeight: 600,
          lineHeight: 1,
          color: glitching ? "var(--accent-bright)" : "var(--fg)",
          transition: "color 0.08s",
          letterSpacing: "-0.02em",
        }}
        aria-label={`${value} ${label}`}
      >
        {display}
      </span>
      <span
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.22em",
          color: "var(--dim)",
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        {label}
      </span>
    </div>
  );
}

/* -----------------------------------------------------------------------
 * Landing — selve landinssiden
 * ----------------------------------------------------------------------- */
export function Landing({ onStart }) {
  const { t, brand } = useI18n();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={ready ? "kk-anim-ready" : ""}
      style={{ position: "relative", minHeight: "100vh", overflowX: "hidden" }}
    >
      <ParticleField mode="partikler" intensity={1} />

      {/* ---- Hero ---- */}
      <section
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "80px var(--pad-x) 60px",
          maxWidth: 780,
        }}
      >
        <p
          className="kk-label kk-rise"
          style={{ marginBottom: 24, letterSpacing: "0.3em" }}
        >
          RØSTEN ENT · KJERNEKODEN
        </p>

        <h1
          className="kk-rise kk-rise-1"
          style={{
            fontFamily: "var(--display)",
            fontSize: "clamp(2.6rem, 6.5vw, 5rem)",
            fontWeight: 600,
            lineHeight: 1.06,
            marginBottom: 28,
          }}
        >
          <span className="kk-shimmer">
            Dekonstruksjonen
            <br />av selvbedrag.
          </span>
        </h1>

        <p
          className="kk-rise kk-rise-2"
          style={{
            fontFamily: "var(--body)",
            fontSize: "clamp(1.05rem, 2.2vw, 1.25rem)",
            lineHeight: 1.65,
            color: "var(--fg-soft)",
            maxWidth: 540,
            marginBottom: 42,
          }}
        >
          Ikke en personlighetstest. En kirurgisk kartlegging av psykologiske
          mønstre — basert på seks etablerte vitenskapelige rammeverk.
        </p>

        <div
          className="kk-rise kk-rise-3"
          style={{ display: "flex", flexWrap: "wrap", gap: 14 }}
        >
          <button className="kk-btn-primary" onClick={onStart}>
            START KARTLEGGING
          </button>
          <a
            href="#om"
            className="kk-btn-ghost"
            style={{ textDecoration: "none" }}
          >
            LES MER
          </a>
        </div>
      </section>

      {/* ---- Motorstatistikk ---- */}
      <section
        id="om"
        style={{
          position: "relative",
          zIndex: 2,
          padding: "64px var(--pad-x)",
          borderTop: "1px solid var(--border)",
        }}
      >
        <p className="kk-label" style={{ marginBottom: 40, textAlign: "center" }}>
          ANALYSEMOTOREN
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "40px 64px",
          }}
        >
          <EngineStat value="15" label="Psyk. dybdeområder" />
          <EngineStat value="1" label="AI-analyseenhet" />
          <EngineStat value="≤25" label="Min. til rapport" />
        </div>
      </section>

      {/* ---- Stjernekartkart ---- */}
      <section
        style={{
          position: "relative",
          zIndex: 2,
          padding: "64px var(--pad-x)",
          borderTop: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p className="kk-label" style={{ marginBottom: 12 }}>
            PSYKOLOGISK KARTBILDE
          </p>
          <p
            style={{
              fontFamily: "var(--body)",
              fontSize: "1.05rem",
              color: "var(--fg-soft)",
              maxWidth: 500,
              lineHeight: 1.6,
            }}
          >
            15 psykologiske dybdeområder kartlegges og kobles — som et stjernekartet
            over din indre arkitektur.
          </p>
        </div>
        <StarMap />
      </section>

      {/* ---- Rammeverk-kort ---- */}
      <section
        style={{
          position: "relative",
          zIndex: 2,
          padding: "64px var(--pad-x)",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <p className="kk-label" style={{ marginBottom: 12 }}>
            6 VITENSKAPELIGE RAMMEVERK
          </p>
          <p
            style={{
              fontFamily: "var(--body)",
              fontSize: "1.05rem",
              color: "var(--fg-soft)",
              lineHeight: 1.6,
            }}
          >
            Analysen krysser refererer på tvers av etablert psykologisk teori.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
            gap: 1,
            background: "var(--border)",
          }}
        >
          {FRAMEWORKS.map((fw) => (
            <div
              key={fw.id}
              className="kk-card"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                background: "var(--surface)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    flexShrink: 0,
                    width: 40,
                    height: 40,
                  }}
                >
                  {fw.glyph}
                </div>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 12,
                    letterSpacing: "0.18em",
                    color: "var(--fg)",
                    fontWeight: 600,
                  }}
                >
                  {fw.title.toUpperCase()}
                </span>
              </div>
              <p
                style={{
                  fontFamily: "var(--body)",
                  fontSize: "0.95rem",
                  color: "var(--fg-soft)",
                  lineHeight: 1.6,
                }}
              >
                {fw.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Steg ---- */}
      <section
        style={{
          position: "relative",
          zIndex: 2,
          padding: "64px var(--pad-x)",
          borderTop: "1px solid var(--border)",
        }}
      >
        <p
          className="kk-label"
          style={{ marginBottom: 40, textAlign: "center" }}
        >
          SLIK FUNGERER DET
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))",
            gap: 32,
            maxWidth: 860,
            margin: "0 auto",
          }}
        >
          {STEPS.map((s) => (
            <div key={s.n} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span
                style={{
                  fontFamily: "var(--display)",
                  fontSize: "2.4rem",
                  color: "var(--accent)",
                  opacity: 0.35,
                  lineHeight: 1,
                  fontWeight: 600,
                }}
              >
                {s.n}
              </span>
              <h3
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 13,
                  letterSpacing: "0.16em",
                  color: "var(--fg)",
                  fontWeight: 600,
                }}
              >
                {s.title.toUpperCase()}
              </h3>
              <p
                style={{
                  fontFamily: "var(--body)",
                  fontSize: "0.95rem",
                  color: "var(--fg-soft)",
                  lineHeight: 1.65,
                }}
              >
                {s.desc}
              </p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 52 }}>
          <button className="kk-btn-primary" onClick={onStart}>
            START KARTLEGGING
          </button>
        </div>
      </section>

      {/* Krise-linje */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "16px var(--pad-x)",
          borderTop: "1px solid var(--crisis-border)",
          background: "var(--crisis-bg)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 8,
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.14em",
        }}
      >
        <span style={{ color: "var(--crisis)" }}>KRISEHJELP:</span>
        <a href="tel:116123" style={{ color: "var(--crisis)", textDecoration: "none" }}>
          Mental Helse 116 123
        </a>
        <span style={{ color: "var(--dim-2)" }}>·</span>
        <a href="tel:116111" style={{ color: "var(--dim)", textDecoration: "none" }}>
          Barnevernvakten 116 111
        </a>
      </div>

      <BrandFooter />
    </div>
  );
}
