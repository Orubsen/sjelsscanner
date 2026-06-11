import { useState } from "react";
import { useI18n } from "./i18n/I18nContext.jsx";
import {
  KK_STAR_POS,
  KK_AREA_NAMES,
  KK_ACHIEVEMENTS,
  kkLevel,
  kkEarned,
  kkRelTime,
} from "./archetypes.js";

const ptsFor = (covered) => (covered || []).map((id) => KK_STAR_POS[id - 1]).filter(Boolean);

/* Dynamic SVG Sigil Mark based on star coordinates */
export function SigilMark({ points, gold, size = 116 }) {
  const pts = points && points.length ? points : [{ x: 40, y: 40 }, { x: 60, y: 55 }];
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const minx = Math.min(...xs), maxx = Math.max(...xs);
  const miny = Math.min(...ys), maxy = Math.max(...ys);
  const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
  const scale = 60 / Math.max(maxx - minx, maxy - miny, 1);
  const norm = pts.map((p) => ({ x: 50 + (p.x - cx) * scale, y: 50 + (p.y - cy) * scale }));
  
  const stroke = gold ? "var(--gold)" : "var(--accent)";
  const node = gold ? "#e8cf9e" : "var(--accent-bright)";
  
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ overflow: "visible" }}>
      <circle cx="50" cy="50" r="46" fill="none" stroke={stroke} strokeWidth="0.5" opacity="0.28"></circle>
      <polyline points={norm.map((p) => p.x + "," + p.y).join(" ")} fill="none" stroke={stroke} strokeWidth="1" opacity="0.55"></polyline>
      {norm.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4.5" fill={node} opacity="0.18"></circle>
          <circle cx={p.x} cy={p.y} r="1.9" fill={node}></circle>
        </g>
      ))}
    </svg>
  );
}

/* Shareable core code card */
export function CoreCodeCard({ analysis, gold }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const a = analysis;

  const archName = t("archetypes." + a.archetypeKey + ".name") || a.archetype;
  const archSubtitle = t("archetypes." + a.archetypeKey + ".subtitle") || a.subtitle;
  const archLine = t("archetypes." + a.archetypeKey + ".line") || a.line;

  const shareText = t("dashboard.cardSharedText", {
    archetype: archName,
    subtitle: archSubtitle,
    line: archLine,
    code: a.code,
  }) || `Kjernekoden kalte meg ${archName} — «${archSubtitle}».\n«${archLine}»\n${a.code} · kjernekoden`;

  const copy = () => {
    try {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (e) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const share = () => {
    if (navigator.share) {
      navigator.share({ title: "Min Kjernekode", text: shareText }).catch(() => {});
    } else {
      copy();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="kk-corecard">
        <div className="kk-corecard-bg" aria-hidden="true"></div>
        <div style={{ position: "relative", display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}>
          <SigilMark points={ptsFor(a.covered)} gold={gold} />
          <div style={{ flex: "1 1 200px", minWidth: 0 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.26em", color: gold ? "var(--gold)" : "var(--accent)" }}>
              {t("dashboard.yourCoreCode")}
            </span>
            <h3 style={{ fontFamily: "var(--mono)", fontWeight: 600, fontSize: "clamp(30px, 6vw, 44px)", letterSpacing: "0.04em", lineHeight: 1, margin: "10px 0 4px", color: "var(--fg)" }}>
              {archName}
            </h3>
            <span style={{ fontFamily: "var(--display)", fontStyle: "italic", fontSize: 20, color: "var(--fg-soft)" }}>{archSubtitle}</span>
            <p style={{ fontFamily: "var(--display)", fontStyle: "italic", fontWeight: 500, fontSize: 18.5, lineHeight: 1.45, color: "var(--fg)", margin: "16px 0 0", textWrap: "pretty" }}>
              «{archLine}»
            </p>
            <span style={{ display: "inline-block", marginTop: 14, fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.2em", color: "var(--dim)" }}>
              {a.code} · {t("brand.product").toUpperCase()}
            </span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button className="kk-btn-ghost" style={{ padding: "11px 20px" }} onClick={share}>{t("dashboard.shareCard")}</button>
        <button className="kk-btn-ghost" style={{ padding: "11px 20px" }} onClick={copy}>{copied ? t("dashboard.copiedText") : t("dashboard.copyText")}</button>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.06em", color: "var(--dim-2)" }}>{t("dashboard.screenshotHint") || "Eller ta et skjermbilde av kortet."}</span>
      </div>
    </div>
  );
}

/* Interactive constellation diagram */
export function ProgressConstellation({ covered }) {
  const { categories } = useI18n();
  const areaNames = categories?.map(c => c.name) || KK_AREA_NAMES;
  return (
    <div style={{ position: "relative", height: 200, border: "1px solid var(--border)", background: "var(--surface)", overflow: "hidden" }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden="true">
        <polyline points={ptsFor(covered).map((p) => p.x + "," + p.y).join(" ")} fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.3" vectorEffect="non-scaling-stroke"></polyline>
      </svg>
      {KK_STAR_POS.map((p, i) => {
        const lit = covered.includes(i + 1);
        return (
          <span key={i} title={areaNames[i]} style={{
            position: "absolute", left: p.x + "%", top: p.y + "%", transform: "translate(-50%,-50%)",
            width: lit ? 8 : 4, height: lit ? 8 : 4, borderRadius: "50%",
            background: lit ? "var(--accent-bright)" : "var(--dim-2)",
            boxShadow: lit ? "0 0 10px var(--accent)" : "none",
          }}></span>
        );
      })}
    </div>
  );
}

/* Level badge component */
export function LevelBadge({ ctx }) {
  const { t } = useI18n();
  const lv = kkLevel(ctx);
  
  // translate titles
  const levelTitles = [
    t("dashboard.levelTitles.0") || "Nyankommet",
    t("dashboard.levelTitles.1") || "Utforsker",
    t("dashboard.levelTitles.2") || "Kartlegger",
    t("dashboard.levelTitles.3") || "Dykker",
    t("dashboard.levelTitles.4") || "Innvidd",
    t("dashboard.levelTitles.5") || "Speiler",
    t("dashboard.levelTitles.6") || "Sjelegransker",
  ];
  const levelTitle = levelTitles[Math.min(lv.level - 1, levelTitles.length - 1)];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", border: "1px solid var(--border-soft)", background: "var(--surface)", padding: "16px 22px", marginBottom: 36 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 150 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.18em", color: "var(--gold)" }}>
          {t("dashboard.selfInsightPrefix") || "SELVINNSIKT"} · {t("dashboard.levelLabel") || "NIVÅ"} {lv.level}
        </span>
        <span style={{ fontFamily: "var(--display)", fontStyle: "italic", fontWeight: 600, fontSize: 23, color: "var(--fg)" }}>{levelTitle}</span>
      </div>
      <div style={{ flex: "1 1 200px", minWidth: 160 }}>
        <span style={{ display: "block", height: 6, background: "var(--surface-2)", border: "1px solid var(--border)", position: "relative", overflow: "hidden" }}>
          <span style={{ position: "absolute", inset: 0, width: lv.progress + "%", background: "var(--gold)", opacity: 0.85 }}></span>
        </span>
        <span style={{ display: "block", fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.04em", color: "var(--dim)", marginTop: 7 }}>
          {ctx.streak > 0 && <span style={{ color: "var(--accent-bright)" }}>☼ {ctx.streak} {t("dashboard.streakDaysSuffix") || "dager på rad"}</span>}
          {ctx.streak > 0 && " · "}
          {t("dashboard.levelHint") || "Kartlegg ett område til for neste nivå"}
        </span>
      </div>
    </div>
  );
}

/* Notification feed component */
export function NotificationFeed({ notifications, onAcceptCompare, onDeclineCompare, onMarkAllRead, people }) {
  const { t, locale } = useI18n();
  const list = (notifications || []).slice().sort((a, b) => b.ts - a.ts);
  const unread = list.filter((n) => !n.read).length;

  const NOTIF_ICON = {
    analysis_updated: { i: "⟳", c: "var(--accent)" },
    achievement: { i: "✦", c: "var(--gold)" },
    compare_request: { i: "⟷", c: "var(--accent-bright)" },
    compare_accepted: { i: "✓", c: "var(--ok)" },
    streak: { i: "☼", c: "var(--gold)" },
    friend_accepted: { i: "＋", c: "var(--accent)" },
  };

  const getNotifText = (n, name) => {
    switch (n.type) {
      case "analysis_updated": return t("dashboard.notifAnalysisUpdated") || "oppdaterte analysen sin";
      case "compare_request": return t("dashboard.notifCompareRequest") || "vil sammenligne analysen med deg";
      case "compare_accepted": return t("dashboard.notifCompareAccepted") || "godtok sammenligningen";
      case "friend_accepted": return t("dashboard.notifFriendAccepted") || "godtok venneforespørselen din";
      default: return n.text || "";
    }
  };

  if (list.length === 0) return null;
  
  return (
    <div style={{ marginBottom: 44 }}>
      <div style={{ display: "flex", alignItems: "center", justifySpaceBetween: "space-between", gap: 14, marginBottom: 16, flexWrap: "wrap", justifyContent: "space-between" }}>
        <h2 className="kk-label" style={{ color: "var(--accent)" }}>
          {t("dashboard.notificationsTitle") || "Varsler"}{" "}
          {unread > 0 && <span style={{ color: "var(--gold)" }}>· {unread} {t("dashboard.newNotifsCount") || "nye"}</span>}
        </h2>
        {unread > 0 && <button className="kk-link-act" onClick={onMarkAllRead}>{t("dashboard.markAllRead") || "Merk alle som lest"}</button>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", border: "1px solid var(--border)", background: "var(--surface)" }}>
        {list.map((n, idx) => {
          const who = people[n.who];
          const ic = NOTIF_ICON[n.type] || NOTIF_ICON.achievement;
          const text = getNotifText(n, who?.name);
          return (
            <div key={n.id} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
              borderTop: idx === 0 ? "none" : "1px solid var(--border)",
              background: n.read ? "transparent" : "var(--accent-alpha-08)",
            }}>
              <span aria-hidden="true" style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                width: 30, height: 30, borderRadius: "50%", border: "1px solid var(--border)",
                fontSize: 14, color: ic.c, background: "var(--bg-2)",
              }}>{ic.i}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 15.5, color: "var(--fg-soft)", lineHeight: 1.45 }}>
                  {who && <strong style={{ color: "var(--fg)" }}>{who.name}</strong>} {text}
                </span>
                <span style={{ display: "block", fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.04em", color: "var(--dim)", marginTop: 2 }}>
                  {kkRelTime(n.ts, locale)}
                </span>
              </div>
              {n.type === "compare_request" && (
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button className="kk-btn-primary" style={{ padding: "7px 13px", fontSize: 10.5 }} onClick={() => onAcceptCompare(n.who)}>{t("dashboard.accept")}</button>
                  <button className="kk-btn-ghost" style={{ padding: "7px 13px", fontSize: 10.5 }} onClick={() => onDeclineCompare(n.who)}>{t("dashboard.decline")}</button>
                </div>
              )}
              {!n.read && n.type !== "compare_request" && (
                <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--gold)", flexShrink: 0 }}></span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Achievements Section */
export function AchievementsSection({ ctx }) {
  const { t } = useI18n();
  const earnedIds = new Set(kkEarned(ctx).map((a) => a.id));
  const earnedCount = earnedIds.size;
  
  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
        <h2 className="kk-label" style={{ color: "var(--gold)" }}>{t("dashboard.achievementsTitle") || "Prestasjoner"}</h2>
        <span style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.08em", color: "var(--fg-soft)" }}>
          {earnedCount} / {KK_ACHIEVEMENTS.length} {t("dashboard.unlockedCount") || "LÅST OPP"}
        </span>
      </div>
      <div className="kk-ach-grid">
        {KK_ACHIEVEMENTS.map((a) => {
          const got = earnedIds.has(a.id);
          const hidden = a.secret && !got;
          
          const achName = t("dashboard.achievements." + a.id + ".name") || a.name;
          const achDesc = t("dashboard.achievements." + a.id + ".desc") || a.desc;

          return (
            <div key={a.id} style={{
              border: "1px solid " + (got ? "var(--gold-soft)" : "var(--border)"),
              background: got ? "var(--gold-alpha-12)" : "var(--surface)",
              padding: "16px 16px", display: "flex", flexDirection: "column", gap: 8,
              opacity: got ? 1 : 0.62,
            }}>
              <span aria-hidden="true" style={{ fontSize: 22, color: got ? "var(--gold)" : "var(--dim)" }}>{hidden ? "✦" : a.icon}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 12.5, letterSpacing: "0.04em", color: got ? "var(--fg)" : "var(--fg-soft)" }}>
                {hidden ? (t("dashboard.achievementSecretTitle") || "Skjult prestasjon") : achName}
              </span>
              <span style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--dim)" }}>
                {hidden ? (t("dashboard.achievementSecretDesc") || "Fortsett å kartlegge for å avdekke denne.") : achDesc}
              </span>
              {got && <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: "0.14em", color: "var(--gold)", marginTop: 2 }}>
                {t("dashboard.unlockedBadge") || "✓ LÅST OPP"}
              </span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
