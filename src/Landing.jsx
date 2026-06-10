import { useState, useEffect, useRef } from "react";
import { getCategories } from "./i18n/categories.js";
import { CrisisBox } from "./SiteExtras.jsx";
import { BrandFooter } from "./BrandChrome.jsx";

/* ---- Small geometric SVG glyphs ---- */
const GLYPH = { width: 44, height: 44, viewBox: "0 0 48 48", fill: "none", "aria-hidden": true };

function GlyphBigFive() {
  const pts = [[24, 6], [41.1, 18.4], [34.6, 38.6], [13.4, 38.6], [6.9, 18.4]];
  return (
    <svg {...GLYPH}>
      <polygon points={pts.map((p) => p.join(",")).join(" ")} stroke="var(--accent)" strokeWidth="1" opacity="0.5" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.6" fill="var(--accent)" />)}
    </svg>
  );
}
function GlyphTilknytning() {
  return (
    <svg {...GLYPH}>
      <line x1="16" y1="28" x2="33" y2="21" stroke="var(--accent)" strokeWidth="1" opacity="0.6" />
      <circle cx="15" cy="29" r="8.5" stroke="var(--accent)" strokeWidth="1.2" />
      <circle cx="34" cy="20" r="6" stroke="var(--accent)" strokeWidth="1.2" />
    </svg>
  );
}
function GlyphForsvar() {
  return (
    <svg {...GLYPH}>
      <rect x="9" y="9" width="30" height="30" stroke="var(--accent)" strokeWidth="1" opacity="0.5" />
      <circle cx="24" cy="24" r="8" stroke="var(--accent)" strokeWidth="1.2" />
      <circle cx="24" cy="24" r="2.2" fill="var(--accent)" />
    </svg>
  );
}
function GlyphJung() {
  return (
    <svg {...GLYPH}>
      <circle cx="18" cy="24" r="11" fill="var(--accent)" opacity="0.28" />
      <circle cx="30" cy="24" r="11" stroke="var(--accent)" strokeWidth="1.2" />
    </svg>
  );
}
function GlyphFreud() {
  return (
    <svg {...GLYPH}>
      <rect x="14" y="9" width="20" height="6" fill="var(--accent)" opacity="0.9" />
      <rect x="10" y="21" width="28" height="6" fill="var(--accent)" opacity="0.45" />
      <rect x="6" y="33" width="36" height="6" fill="var(--accent)" opacity="0.18" />
    </svg>
  );
}
function GlyphAce() {
  return (
    <svg {...GLYPH}>
      <circle cx="24" cy="24" r="16" stroke="var(--accent)" strokeWidth="1" opacity="0.35" />
      <circle cx="24" cy="24" r="11" stroke="var(--accent)" strokeWidth="1" opacity="0.6" />
      <circle cx="24" cy="24" r="6" stroke="var(--gold)" strokeWidth="1.4" />
      <circle cx="24" cy="24" r="1.8" fill="var(--gold)" />
    </svg>
  );
}

const FRAMEWORK_FACTS = [
  {
    title: "Big Five (Femfaktormodellen)",
    glyph: <GlyphBigFive />,
    desc: "Den mest anerkjente vitenskapelige metoden for å måle personlighet. Den deler personligheten inn i fem hovedtrekk: Åpenhet, Pliktoppfyllelse, Ekstroversjon, Medmenneskelighet og Nevrotisisme (emosjonell ustabilitet).",
  },
  {
    title: "Tilknytningsteori",
    glyph: <GlyphTilknytning />,
    desc: "En psykologisk teori om hvordan våre tidlige bånd til omsorgspersoner former våre relasjoner som voksne. De fire hovedstilene er trygg, engstelig (ambivalent), unngående og desorganisert.",
  },
  {
    title: "Forsvarsmekanismer",
    glyph: <GlyphForsvar />,
    desc: "Ubevisste psykologiske strategier vi bruker for å beskytte oss mot angst, vonde følelser eller stress. Eksempler er fornektelse, projeksjon og fortrengning.",
  },
  {
    title: "Jungianske arketyper",
    glyph: <GlyphJung />,
    desc: "Universelle, medfødte symboler og mønstre i menneskets underbevissthet, utviklet av Carl Jung. Sentrale arketyper inkluderer Skyggen, Persona (masken) og Helten.",
  },
  {
    title: "Freudiansk analyse",
    glyph: <GlyphFreud />,
    desc: "Sigmund Freuds psykoanalytiske teori handler om at vår atferd styres av ubevisste krefter. Psyken deles inn i Id (drifter), Ego (fornuft) og Super-ego (samvittighet).",
  },
  {
    title: "ACE-forskning",
    glyph: <GlyphAce />,
    desc: "Adverse Childhood Experiences — en stor amerikansk studie som viser hvordan belastende opplevelser i barndommen (som omsorgssvikt eller traumer) kan sette dype spor og påvirke fysisk og psykisk helse senere i livet.",
  },
];

/* ---- Star map positions (% of container width/height) ---- */
const STAR_POS = [
  { x: 8, y: 34 }, { x: 17, y: 16 }, { x: 29, y: 27 }, { x: 24, y: 56 },
  { x: 37, y: 68 }, { x: 46, y: 42 }, { x: 43, y: 14 }, { x: 57, y: 25 },
  { x: 65, y: 50 }, { x: 56, y: 74 }, { x: 73, y: 68 }, { x: 81, y: 38 },
  { x: 75, y: 14 }, { x: 89, y: 22 }, { x: 91, y: 60 },
];

/* Seeded random deco stars so they're stable across renders */
const DECO_STARS = (() => {
  let s = 1337;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  return Array.from({ length: 52 }, () => ({
    x: r() * 100, y: r() * 100, o: 0.1 + r() * 0.35, sz: 1 + r() * 1.5, d: r() * 5,
  }));
})();

function StarMap({ categories }) {
  const [active, setActive] = useState(null);
  return (
    <div className="kk-starmap" onClick={() => setActive(null)}>
      <svg className="kk-starmap-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline
          points={STAR_POS.map((p) => p.x + "," + p.y).join(" ")}
          stroke="var(--accent)" strokeWidth="1" opacity="0.16" fill="none"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {DECO_STARS.map((d, i) => (
        <span key={"d" + i} className="kk-deco-star" style={{
          left: d.x + "%", top: d.y + "%", opacity: d.o,
          width: d.sz, height: d.sz, animationDelay: d.d.toFixed(2) + "s",
        }} />
      ))}
      {categories.map((c, i) => {
        const p = STAR_POS[i];
        const isActive = active === i;
        const labelPos =
          (p.y < 24 ? " kk-star-label-below" : "") +
          (p.x > 72 ? " kk-star-label-left" : p.x < 14 ? " kk-star-label-right" : "");
        return (
          <button
            key={c.id}
            className={"kk-star" + (i === 14 ? " kk-star-gold" : "") + (isActive ? " kk-star-active" : "")}
            style={{ left: p.x + "%", top: p.y + "%" }}
            aria-label={"Område " + (i + 1) + ": " + c.name}
            onClick={(e) => { e.stopPropagation(); setActive(isActive ? null : i); }}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive((a) => (a === i ? null : a))}
            onFocus={() => setActive(i)}
            onBlur={() => setActive((a) => (a === i ? null : a))}
          >
            <span className="kk-star-rays" aria-hidden="true" />
            <span className="kk-star-core" />
            <span className={"kk-star-label" + labelPos} aria-hidden="true">
              <span className="kk-star-num">{String(i + 1).padStart(2, "0")}</span>{c.name}
            </span>
          </button>
        );
      })}

      <style>{`
        @media (max-width: 860px) {
          .kk-engine-grid { grid-template-columns: 1fr !important; gap: 36px !important; }
          .kk-starmap { height: 430px; }
        }
        .kk-starmap {
          position: relative; height: 500px; margin-top: 26px;
        }
        .kk-starmap-lines { position: absolute; inset: 0; width: 100%; height: 100%; }
        .kk-deco-star {
          position: absolute; border-radius: 50%; background: #cfd4ff;
          pointer-events: none; transform: translate(-50%, -50%);
        }
        .kk-star {
          position: absolute; transform: translate(-50%, -50%);
          background: none; border: none; cursor: pointer;
          width: 44px; height: 44px;
          display: flex; align-items: center; justify-content: center;
          padding: 0; z-index: 2;
        }
        .kk-star-core {
          display: block; width: 7px; height: 7px; border-radius: 50%;
          background: var(--accent-bright);
          box-shadow: 0 0 9px var(--accent), 0 0 20px var(--accent-alpha-25);
          transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s;
        }
        .kk-star-gold .kk-star-core {
          width: 9px; height: 9px; background: #e8cf9e;
          box-shadow: 0 0 10px var(--gold), 0 0 24px rgba(197,163,104,0.35);
        }
        .kk-star:hover .kk-star-core, .kk-star-active .kk-star-core {
          transform: scale(1.8);
          box-shadow: 0 0 14px var(--accent), 0 0 36px var(--accent-alpha-25);
        }
        .kk-star-gold:hover .kk-star-core, .kk-star-gold.kk-star-active .kk-star-core {
          box-shadow: 0 0 14px var(--gold), 0 0 40px rgba(197,163,104,0.4);
        }
        .kk-star-rays {
          position: absolute; inset: 0; opacity: 0;
          transition: opacity 0.35s; pointer-events: none;
        }
        .kk-star-rays::before, .kk-star-rays::after {
          content: ""; position: absolute; left: 50%; top: 50%;
          background: linear-gradient(90deg, transparent, var(--accent-bright), transparent);
        }
        .kk-star-rays::before { width: 56px; height: 1px; transform: translate(-50%, -50%); }
        .kk-star-rays::after {
          width: 1px; height: 56px; transform: translate(-50%, -50%);
          background: linear-gradient(180deg, transparent, var(--accent-bright), transparent);
        }
        .kk-star-gold .kk-star-rays::before { background: linear-gradient(90deg, transparent, #e8cf9e, transparent); }
        .kk-star-gold .kk-star-rays::after { background: linear-gradient(180deg, transparent, #e8cf9e, transparent); }
        .kk-star-active .kk-star-rays, .kk-star:hover .kk-star-rays { opacity: 0.7; }
        .kk-star-label {
          position: absolute; bottom: calc(100% + 4px); left: 50%;
          transform: translateX(-50%) translateY(5px);
          display: flex; align-items: baseline; gap: 9px;
          max-width: min(74vw, 330px); width: max-content; text-align: left;
          font-family: var(--body); font-size: 15.5px; line-height: 1.4; color: var(--fg);
          background: rgba(20, 16, 41, 0.94); border: 1px solid var(--border-soft);
          padding: 9px 13px; opacity: 0; pointer-events: none;
          transition: opacity 0.3s, transform 0.3s; z-index: 5;
        }
        .kk-star-num { font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.16em; color: var(--accent-bright); }
        .kk-star-gold .kk-star-num { color: var(--gold); }
        .kk-star-gold .kk-star-label { border-color: rgba(197,163,104,0.4); }
        .kk-star-active .kk-star-label { opacity: 1; transform: translateX(-50%) translateY(0); }
        .kk-star-label-below { bottom: auto; top: calc(100% + 4px); transform: translateX(-50%) translateY(-5px); }
        .kk-star-active .kk-star-label-below { transform: translateX(-50%) translateY(0); }
        .kk-star-label-left { left: auto; right: 50%; margin-right: -22px; transform: translateY(5px); }
        .kk-star-active .kk-star-label-left { transform: translateY(0); }
        .kk-star-label-right { left: 50%; margin-left: -22px; transform: translateY(5px); }
        .kk-star-active .kk-star-label-right { transform: translateY(0); }
        @media (prefers-reduced-motion: no-preference) {
          .kk-deco-star { animation: kk-twinkle 4.5s ease-in-out infinite; }
        }
        @keyframes kk-twinkle {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.6); }
        }
      `}</style>
    </div>
  );
}

/* ---- Engine stat with star-glitch on the number and drifting description ---- */
function EngineStat({ n, d, i }) {
  const [disp, setDisp] = useState(n);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const chars = "0123456789*#+%≠⋆";
    let cancelled = false, timer = null, iv = null;
    const cycle = () => {
      timer = setTimeout(() => {
        if (cancelled) return;
        let frame = 0;
        iv = setInterval(() => {
          frame++;
          if (cancelled || frame > 5) {
            clearInterval(iv);
            if (!cancelled) { setDisp(n); cycle(); }
            return;
          }
          setDisp(n.split("").map((c) =>
            Math.random() < 0.65 ? chars[Math.floor(Math.random() * chars.length)] : c
          ).join(""));
        }, 70);
      }, 2600 + Math.random() * 4200);
    };
    cycle();
    return () => { cancelled = true; clearTimeout(timer); clearInterval(iv); };
  }, [n]);

  return (
    <div className="kk-stat-row">
      <span className="kk-stat-n" style={{ animationDelay: (i * 1.3).toFixed(1) + "s" }}>{disp}</span>
      <span className="kk-stat-d" style={{ animationDelay: (i * 2.1).toFixed(1) + "s" }}>{d}</span>
    </div>
  );
}

/* ---- Scroll-reveal hook ---- */
function useRevealOnScroll() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const items = el.querySelectorAll("[data-reveal]");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("kk-in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.18 });
    items.forEach((item) => io.observe(item));
    return () => io.disconnect();
  }, []);
  return ref;
}

/* ---- Main Landing component ---- */
export default function Landing({ onStart }) {
  const categories = getCategories("nb");
  const fwRef = useRevealOnScroll();

  const steps = [
    { n: "01", t: "Registrer deg", d: "Navn, alder og e-post. Spørsmålene tilpasses din livsfase fra første svar." },
    { n: "02", t: "Svar ærlig", d: "Ett spørsmål om gangen, generert i sanntid. Vanligvis 15–25 spørsmål, ca. 15–30 minutter." },
    { n: "03", t: "Motta rapporten", d: "En strukturert psykoanalytisk rapport: mønstre, spenninger og klinisk videre utforsking." },
  ];

  return (
    <div style={{ position: "relative", zIndex: 1 }}>

      {/* ---- Hero ---- */}
      <section style={{
        minHeight: "92vh", display: "flex", flexDirection: "column",
        justifyContent: "center", maxWidth: 1060, margin: "0 auto",
        padding: "112px var(--pad-x) 60px",
      }}>
        <span className="kk-label kk-rise" style={{ color: "var(--accent)", marginBottom: 22 }}>
          Psykoanalytisk system v2.4.1
        </span>
        <h1 className="kk-rise kk-rise-1" style={{
          fontFamily: "var(--mono)", fontWeight: 600, lineHeight: 0.96,
          fontSize: "clamp(52px, 12vw, 124px)", letterSpacing: "0.02em", margin: 0,
        }}>
          <span className="kk-shimmer">KJERNE</span><br />
          <span className="kk-shimmer-accent">KODEN</span>
        </h1>
        <p className="kk-rise kk-rise-2" style={{
          fontFamily: "var(--display)", fontStyle: "italic", fontWeight: 500,
          fontSize: "clamp(24px, 3vw, 32px)", color: "var(--fg-soft)",
          maxWidth: 600, lineHeight: 1.4, margin: "30px 0 0", textWrap: "pretty",
        }}>
          Kirurgisk psykoanalytisk kartlegging —{" "}
          <span className="kk-shimmer-gold">ikke en personlighetstest.</span>
        </p>
        <div className="kk-rise kk-rise-3" style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 44, flexWrap: "wrap" }}>
          <button className="kk-btn-primary kk-hero-cta" onClick={onStart}>
            INITIER ANALYSE&ensp;▸
          </button>
        </div>
        <p className="kk-rise kk-rise-4" style={{
          fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.08em",
          color: "var(--dim)", marginTop: 26,
        }}>
          ⚠ Ikke diagnose eller behandling. Antall spørsmål tilpasses individuelt (opp til 25).
        </p>
      </section>

      {/* ---- Adaptive engine ---- */}
      <section style={{ borderTop: "1px solid var(--border)", background: "var(--bg-2)" }}>
        <div className="kk-engine-grid" style={{
          maxWidth: 1060, margin: "0 auto", padding: "84px var(--pad-x)",
          display: "grid", gridTemplateColumns: "minmax(0, 5fr) minmax(0, 4fr)", gap: 64,
        }}>
          <div>
            <span className="kk-label" style={{ color: "var(--gold)" }}>Hvor kommer spørsmålene fra?</span>
            <h2 style={{
              fontFamily: "var(--display)", fontStyle: "italic", fontWeight: 600,
              fontSize: "clamp(32px, 4.4vw, 48px)", lineHeight: 1.15,
              margin: "18px 0 20px", textWrap: "balance",
            }}>
              Generert i sanntid av en <span className="kk-shimmer-accent">adaptiv analysemotor.</span>
            </h2>
            <p style={{ fontSize: 19, lineHeight: 1.65, color: "var(--fg-soft)", textWrap: "pretty" }}>
              Dette er ikke et statisk skjema fra en støvete testbok. For hvert svar du avgir,
              kalkulerer Kjernekoden ditt neste trekk med utgangspunkt i 15 psykologiske
              dybdeområder — inkludert barndom, tilknytning og skyggesider. Du får ett
              spørsmål om gangen, og systemet tilpasser dybden individuelt.
            </p>
          </div>
          <div className="kk-stats">
            {[
              ["15", "psykologiske dybdeområder"],
              ["1", "spørsmål om gangen, kalkulert fra dine svar"],
              ["≤25", "spørsmål — dybden vurderes individuelt"],
            ].map(([n, d], i) => (
              <EngineStat key={n} n={n} d={d} i={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ---- 15 categories star map ---- */}
      <section style={{ borderTop: "1px solid var(--border)", position: "relative", overflow: "hidden" }}>
        <div aria-hidden="true" style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 55% 42% at 50% 18%, rgba(63,55,150,0.16), transparent 72%)",
        }} />
        <div style={{ maxWidth: 1020, margin: "0 auto", padding: "92px var(--pad-x) 104px", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <div>
              <span className="kk-label" style={{ color: "var(--accent)" }}>Kartleggingen dekker</span>
              <h2 style={{
                fontFamily: "var(--display)", fontStyle: "italic", fontWeight: 600,
                fontSize: "clamp(34px, 5vw, 50px)", margin: "14px 0 0", lineHeight: 1.1,
              }}>
                15 <span className="kk-shimmer">dybdeområder</span>
              </h2>
            </div>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, letterSpacing: "0.2em", color: "var(--dim)" }}>01 — 15</span>
          </div>
          <p style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.24em", color: "var(--dim)", margin: "30px 0 0" }}>
            PEK PÅ EN STJERNE FOR Å AVDEKKE OMRÅDET
          </p>
          <StarMap categories={categories} />
        </div>
      </section>

      {/* ---- Frameworks + steps ---- */}
      <section style={{ borderTop: "1px solid var(--border)", background: "var(--bg-2)" }}>
        <div ref={fwRef} style={{ maxWidth: 1060, margin: "0 auto", padding: "84px var(--pad-x)" }}>
          <span className="kk-label" style={{ color: "var(--gold)" }}>Forankret i</span>
          <h2 style={{
            fontFamily: "var(--display)", fontStyle: "italic", fontWeight: 600,
            fontSize: "clamp(34px, 5vw, 50px)", margin: "14px 0 40px", lineHeight: 1.1,
          }}>
            Seks <span className="kk-shimmer-gold">etablerte</span> rammeverk
          </h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 310px), 1fr))",
            gap: 14, marginBottom: 72,
          }}>
            {FRAMEWORK_FACTS.map((f, i) => (
              <article
                key={f.title}
                className="kk-fact"
                data-reveal
                style={{ animationDelay: (i * 0.06).toFixed(2) + "s" }}
              >
                <div className="kk-fact-glyph">{f.glyph}</div>
                <h3 style={{
                  fontFamily: "var(--mono)", fontSize: 12.5, letterSpacing: "0.14em",
                  fontWeight: 600, color: "var(--fg)", margin: "0 0 12px",
                }}>
                  {f.title.toUpperCase()}
                </h3>
                <p style={{ fontSize: 16.5, lineHeight: 1.6, color: "var(--fg-soft)", margin: 0, textWrap: "pretty" }}>
                  {f.desc}
                </p>
              </article>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 28 }}>
            {steps.map((s) => (
              <div key={s.n} style={{ borderTop: "1px solid var(--border)", paddingTop: 22 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.2em", color: "var(--accent)" }}>{s.n}</span>
                <h3 style={{
                  fontFamily: "var(--display)", fontStyle: "italic", fontWeight: 600,
                  fontSize: 27, margin: "12px 0 10px",
                }}>{s.t}</h3>
                <p style={{ fontSize: 16.5, lineHeight: 1.55, color: "var(--fg-soft)", textWrap: "pretty" }}>{s.d}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 70, display: "flex", flexDirection: "column", gap: 26, alignItems: "flex-start" }}>
            <button className="kk-btn-primary" onClick={onStart}>INITIER ANALYSE&ensp;▸</button>
            <CrisisBox />
          </div>
        </div>
      </section>

      <BrandFooter />

      <style>{`
        .kk-stats { display: flex; flex-direction: column; align-self: center; }
        .kk-stat-row {
          display: flex; align-items: baseline; gap: 26px; padding: 26px 0;
        }
        .kk-stat-row + .kk-stat-row {
          border-top: 1px solid transparent;
          border-image: linear-gradient(90deg, var(--accent-alpha-25), transparent 75%) 1;
        }
        .kk-stat-n {
          font-family: var(--mono); font-weight: 600; line-height: 1;
          font-size: clamp(44px, 5.5vw, 64px); min-width: 122px; text-align: right;
          background-image: linear-gradient(135deg, var(--accent-bright) 5%, var(--accent) 55%, var(--gold) 110%);
          -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
        }
        .kk-stat-d {
          font-family: var(--display); font-style: italic; font-weight: 500;
          font-size: clamp(19px, 2.2vw, 23px); line-height: 1.4; color: var(--fg-soft);
        }
        @media (max-width: 700px) {
          .kk-stat-row { flex-direction: column; gap: 4px; padding: 20px 0; }
          .kk-stat-n { text-align: left; min-width: 0; }
        }
        @media (prefers-reduced-motion: no-preference) {
          .kk-stat-n { animation: kk-stat-twinkle 4.2s ease-in-out infinite; }
          .kk-stat-d { animation: kk-text-drift 9s ease-in-out infinite; }
        }
        @keyframes kk-stat-twinkle {
          0%, 100% { filter: drop-shadow(0 0 6px var(--accent-alpha-25)); opacity: 1; }
          42% { filter: drop-shadow(0 0 16px var(--accent-alpha-25)) brightness(1.25); opacity: 1; }
          58% { filter: none; opacity: 0.8; }
          70% { filter: drop-shadow(0 0 18px var(--accent-alpha-25)) brightness(1.3); opacity: 1; }
        }
        @keyframes kk-text-drift {
          0%, 100% { opacity: 1; transform: translateX(0); }
          46% { opacity: 0.35; transform: translateX(10px); }
          60% { opacity: 0.9; transform: translateX(-2px); }
        }
        .kk-fact {
          background: var(--surface); border: 1px solid var(--border); padding: 26px 26px 28px;
          transition: border-color 0.3s, background 0.3s, transform 0.3s;
        }
        .kk-fact:hover {
          border-color: var(--border-soft); background: var(--surface-2); transform: translateY(-3px);
        }
        .kk-fact-glyph { margin-bottom: 18px; opacity: 0.85; }
        @media (prefers-reduced-motion: no-preference) {
          .kk-in { animation: kk-rise-transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        }
        @keyframes kk-rise-transform {
          from { transform: translateY(16px); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
