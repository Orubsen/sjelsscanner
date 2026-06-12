import { useState, useEffect, useRef } from "react";
import { useI18n } from "./i18n/I18nContext.jsx";
import {
  KK_AXES,
  KK_ARCHETYPES,
  KK_POPULATION,
  kkArchByKey,
  kkAxisPercentile,
} from "./archetypes.js";

/* Count-up animation helper */
function useCountUp(target, run) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf, start;
    const dur = 900;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return val;
}

/* Intersection observer helper */
function useInView() {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const trigger = () => setSeen(true);
    const r = el.getBoundingClientRect();
    if (r.top < (window.innerHeight || 0) && r.bottom > 0) {
      trigger();
      return;
    }
    let io;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (ents) => {
          if (ents.some((e) => e.isIntersecting)) {
            trigger();
            io.disconnect();
          }
        },
        { threshold: 0.01, rootMargin: "0px 0px -8% 0px" }
      );
      io.observe(el);
    }
    const t = setTimeout(trigger, 1600);
    return () => {
      if (io) io.disconnect();
      clearTimeout(t);
    };
  }, [seen]);
  return [ref, seen];
}

/* Archetype distribution chart */
function ArchetypeDistribution({ activeKey, run }) {
  const sorted = KK_ARCHETYPES.slice().sort((a, b) => b.share - a.share);
  const max = Math.max(...sorted.map((a) => a.share));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sorted.map((a, i) => {
        const mine = a.key === activeKey;
        return (
          <div
            key={a.key}
            style={{
              display: "grid",
              gridTemplateColumns: "138px 1fr 44px",
              alignItems: "center",
              gap: 14,
            }}
          >
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 12,
                letterSpacing: "0.06em",
                color: mine ? "var(--gold)" : "var(--fg-soft)",
                textAlign: "right",
                fontWeight: mine ? 600 : 400,
                whiteSpace: "nowrap",
              }}
            >
              {mine && "▸ "}
              {a.name}
            </span>
            <span
              style={{
                position: "relative",
                height: 18,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  transformOrigin: "left",
                  width: (run ? (a.share / max) * 100 : 0) + "%",
                  background: mine ? "var(--gold)" : "var(--accent)",
                  opacity: mine ? 0.92 : 0.42,
                  transition: "width 0.9s cubic-bezier(0.22,1,0.36,1)",
                  transitionDelay: i * 55 + "ms",
                }}
              />
            </span>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 12,
                color: mine ? "var(--gold)" : "var(--dim)",
                textAlign: "right",
              }}
            >
              {a.share}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* User position vs average population spectrum row */
function SpectrumRow({ axis, pos, run }) {
  const { t } = useI18n();
  const pct = kkAxisPercentile(axis.id, pos);
  const avg = KK_POPULATION.axisAverage[axis.id];

  const leftLabel = t("dashboard.axes." + axis.id + "Left") || axis.left;
  const rightLabel = t("dashboard.axes." + axis.id + "Right") || axis.right;
  const leanLabel = pos < 50 ? leftLabel.toLowerCase() : rightLabel.toLowerCase();
  const pctVal = pos < 50 ? 100 - pct : pct;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: "0.08em",
          color: "var(--fg-soft)",
        }}
      >
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <div style={{ position: "relative", height: 2, background: "var(--border-soft)", margin: "12px 0" }}>
        {/* population average */}
        <span
          title={t("dashboard.axisAverageTitle")}
          style={{
            position: "absolute",
            top: "50%",
            left: avg + "%",
            transform: "translate(-50%,-50%)",
            width: 10,
            height: 10,
            border: "1px solid var(--dim)",
            borderRadius: "50%",
            background: "var(--bg)",
          }}
        />
        {/* user position */}
        <span
          title={t("dashboard.axisTitle")}
          style={{
            position: "absolute",
            top: "50%",
            left: (run ? pos : 50) + "%",
            transform: "translate(-50%,-50%)",
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "var(--gold)",
            boxShadow: "0 0 14px var(--gold)",
            transition: "left 0.9s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </div>
      <span style={{ fontSize: 14.5, color: "var(--fg-soft)", lineHeight: 1.5 }}>
        {t("dashboard.axesInfo", { lean: leanLabel, pct: pctVal }) || (
          <>
            Du ligger lenger mot <strong style={{ color: "var(--fg)" }}>{leanLabel}</strong> enn{" "}
            <strong style={{ color: "var(--gold)" }}>{pctVal}%</strong> som har tatt analysen.
          </>
        )}
      </span>
    </div>
  );
}

/* CompareSection */
export function CompareSection({ archetypeKey, themes, embedded }) {
  const { t } = useI18n();
  const arch = kkArchByKey(archetypeKey);
  const [ref, seen] = useInView();
  const rarity = useCountUp(arch.share, seen);
  const total = useCountUp(KK_POPULATION.total, seen);

  // map themes to include population prevalence
  const myThemes = (themes && themes.length ? themes : arch.themes)
    .map((themeName) => {
      const found = KK_POPULATION.themePrevalence.find((p) => p.theme === themeName);
      return { theme: themeName, pct: found ? found.pct : 28 + ((themeName.length * 7) % 40) };
    })
    .sort((a, b) => b.pct - a.pct);

  const Wrap = embedded ? "div" : "section";

  const rarityStatus = arch.share < 12 ? t("dashboard.rarityStatusRare") : t("dashboard.rarityStatusCommon");
  const rarityDesc = arch.share < 12 ? t("dashboard.rarityDescRare") : t("dashboard.rarityDescCommon");

  return (
    <Wrap
      ref={ref}
      style={{
        position: "relative",
        zIndex: 1,
        ...(embedded ? {} : { maxWidth: 860, margin: "0 auto", padding: "120px var(--pad-x) 90px" }),
      }}
    >
      <span className="kk-label" style={{ color: "var(--gold)" }}>
        {t("dashboard.privacySetting")}
      </span>
      <h2
        style={{
          fontFamily: "var(--display)",
          fontStyle: "italic",
          fontWeight: 600,
          fontSize: "clamp(28px, 4.4vw, 44px)",
          lineHeight: 1.1,
          margin: "12px 0 8px",
          textWrap: "balance",
        }}
      >
        {t("dashboard.compareTitle")}
      </h2>
      <p style={{ fontSize: 17.5, lineHeight: 1.6, color: "var(--fg-soft)", maxWidth: 600, marginBottom: 14, textWrap: "pretty" }}>
        {t("dashboard.compareIntro", { count: total.toLocaleString(t("dateLocale") || "no-NO") })}
      </p>

      {/* Rarity box */}
      <div
        style={{
          border: "1px solid var(--border-soft)",
          background: "var(--gold-alpha-12)",
          borderLeft: "2px solid var(--gold)",
          padding: "26px 28px",
          margin: "26px 0 40px",
          display: "flex",
          gap: 26,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: "var(--mono)",
            fontWeight: 600,
            fontSize: "clamp(48px, 10vw, 76px)",
            lineHeight: 1,
            color: "var(--gold)",
          }}
        >
          {rarity}%
        </span>
        <p style={{ flex: "1 1 240px", fontSize: 18, lineHeight: 1.55, color: "var(--fg-soft)", textWrap: "pretty" }}>
          {t("dashboard.rarityBlock", { name: arch.name, status: rarityStatus, description: rarityDesc }) || (
            <>
              deler din kjernekode <strong style={{ color: "var(--fg)" }}>{arch.name}</strong>. Det er {rarityStatus}{" "}
              profilene — {rarityDesc}
            </>
          )}
        </p>
      </div>

      {/* Distribution list */}
      <h3 className="kk-label" style={{ color: "var(--accent)", marginBottom: 18 }}>
        {t("dashboard.commonDistTitle") || "Slik fordeler kjernekodene seg"}
      </h3>
      <ArchetypeDistribution activeKey={arch.key} run={seen} />

      {/* Spectrums */}
      <h3 className="kk-label" style={{ color: "var(--accent)", margin: "44px 0 22px" }}>
        {t("dashboard.spectrumsTitle") || "Hvor du ligger på spekteret"}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
        {KK_AXES.map((ax) => (
          <SpectrumRow key={ax.id} axis={ax} pos={arch.pos[ax.id]} run={seen} />
        ))}
      </div>
      <p
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10.5,
          letterSpacing: "0.06em",
          color: "var(--dim)",
          marginTop: 16,
          display: "flex",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        <span>
          <span
            style={{
              display: "inline-block",
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: "var(--gold)",
              marginRight: 6,
              verticalAlign: "middle",
            }}
          />
          {t("dashboard.axisTitle")}
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: 9,
              height: 9,
              borderRadius: "50%",
              border: "1px solid var(--dim)",
              marginRight: 6,
              verticalAlign: "middle",
            }}
          />
          {t("dashboard.axisAverageTitle")}
        </span>
      </p>

      {/* Common themes */}
      <h3 className="kk-label" style={{ color: "var(--accent)", margin: "44px 0 18px" }}>
        {t("dashboard.commonThemes")}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {myThemes.map((tInfo) => (
          <div key={tInfo.theme} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontSize: 16, color: "var(--fg)" }}>{tInfo.theme}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--accent-bright)", whiteSpace: "nowrap" }}>
                {t("dashboard.pctShareTheme", { pct: tInfo.pct })}
              </span>
            </div>
            <span
              style={{
                display: "block",
                height: 6,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  width: (seen ? tInfo.pct : 0) + "%",
                  background: "var(--accent)",
                  opacity: 0.5,
                  transition: "width 0.9s cubic-bezier(0.22,1,0.36,1)",
                }}
              />
            </span>
          </div>
        ))}
      </div>

      {/* Avoided areas */}
      <div style={{ marginTop: 40, borderTop: "1px solid var(--border)", paddingTop: 26 }}>
        <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--fg-soft)", textWrap: "pretty" }}>
          {t("dashboard.avoidedStat", {
            pct: KK_POPULATION.mostAvoided.pct,
            name: KK_POPULATION.mostAvoided.name,
          })}
        </p>
      </div>
    </Wrap>
  );
}
