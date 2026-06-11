import { useState } from "react";
import { useI18n } from "./i18n/I18nContext.jsx";
import { kkBuildContext } from "./archetypes.js";
import {
  LevelBadge,
  NotificationFeed,
  AchievementsSection,
  ProgressConstellation,
  SigilMark,
} from "./AccountComponents.jsx";
import { CompareSection } from "./CompareSection.jsx";
import { FriendsModule } from "./FriendsModule.jsx";

/* Archive analysis card containing notes and reflections */
function AnalysisCard({ analysis, onAddNote, onNewAnalysis }) {
  const { t } = useI18n();
  const [noteOpen, setNoteOpen] = useState(!!analysis.note);
  const [draft, setDraft] = useState(analysis.note || "");
  const a = analysis;

  const archName = t("archetypes." + a.archetypeKey + ".name") || a.archetype;
  const archSubtitle = t("archetypes." + a.archetypeKey + ".subtitle") || a.subtitle;

  const ptsFor = (covered) => {
    const KK_STAR_POS = [
      { x: 8, y: 34 }, { x: 17, y: 16 }, { x: 29, y: 27 }, { x: 24, y: 56 },
      { x: 37, y: 68 }, { x: 46, y: 42 }, { x: 43, y: 14 }, { x: 57, y: 25 },
      { x: 65, y: 50 }, { x: 56, y: 74 }, { x: 73, y: 68 }, { x: 81, y: 38 },
      { x: 75, y: 14 }, { x: 89, y: 22 }, { x: 91, y: 60 },
    ];
    return (covered || []).map((id) => KK_STAR_POS[id - 1]).filter(Boolean);
  };

  return (
    <div className="kk-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <SigilMark points={ptsFor(a.covered)} size={56} />
          <div>
            <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.18em", color: "var(--accent)" }}>{a.code}</span>
            <h3 style={{ fontFamily: "var(--mono)", fontWeight: 600, fontSize: 22, letterSpacing: "0.04em", margin: "4px 0 0" }}>
              {archName}{" "}
              <span style={{ fontFamily: "var(--display)", fontStyle: "italic", fontWeight: 500, fontSize: 17, color: "var(--fg-soft)", letterSpacing: 0 }}>
                · {archSubtitle}
              </span>
            </h3>
          </div>
        </div>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.08em", color: "var(--dim)" }}>{a.dateLabel}</span>
      </div>

      <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--fg-soft)", textWrap: "pretty" }}>{a.summary}</p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {a.themes.map((themeVal) => (
          <span
            key={themeVal}
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.06em",
              border: "1px solid var(--border-soft)",
              color: "var(--accent-bright)",
              background: "var(--accent-alpha-08)",
              padding: "5px 11px",
            }}
          >
            {themeVal}
          </span>
        ))}
      </div>

      {noteOpen && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, borderLeft: "2px solid var(--gold)", paddingLeft: 14 }}>
          <span className="kk-label" style={{ color: "var(--gold)" }}>
            {t("dashboard.reflections")}
          </span>
          <textarea
            className="kk-field"
            rows="2"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("dashboard.notePlaceholder")}
            style={{ resize: "vertical" }}
          />
          <button
            className="kk-btn-ghost"
            style={{ padding: "8px 16px", alignSelf: "flex-start", fontSize: 11 }}
            onClick={() => onAddNote(a.id, draft)}
          >
            {t("dashboard.saveNote")}
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
        {!noteOpen && (
          <button className="kk-link-act" onClick={() => setNoteOpen(true)}>
            {t("dashboard.addNoteLink")}
          </button>
        )}
        <button className="kk-link-act" onClick={() => onNewAnalysis(a)}>
          {t("dashboard.startDeeper")}
        </button>
        <button className="kk-link-act">
          {t("dashboard.downloadPdfLink")}
        </button>
      </div>
    </div>
  );
}

/* Dashboard screen ("Min side") */
export function AccountScreen({
  account,
  saved,
  onAddNote,
  onNewAnalysis,
  onDeleteAll,
  onLogout,
  onStart,
  premium,
  social,
  onActivatePremium,
  onCompare,
  onRequestCompare,
  onAcceptCompare,
  onDeclineCompare,
  onToggleFollow,
  onAccept,
  onDecline,
  onSendRequest,
  onOpenPrivacy,
  onMarkAllRead,
}) {
  const { t } = useI18n();
  
  const list = saved.slice().sort((a, b) => b.ts - a.ts);
  const union = Array.from(new Set(list.flatMap((a) => a.covered))).sort((a, b) => a - b);
  const newest = list[0], prev = list[1];
  
  const ctx = kkBuildContext({ saved: list, premium, social });

  let delta = null;
  if (newest && prev) {
    const grew = newest.covered.length - prev.covered.length;
    const newThemes = newest.themes.filter((theme) => !prev.themes.includes(theme));
    const archetypeShift = newest.archetypeKey !== prev.archetypeKey;
    
    const newestArchName = t("archetypes." + newest.archetypeKey + ".name") || newest.archetype;
    const prevArchName = t("archetypes." + prev.archetypeKey + ".name") || prev.archetype;

    delta = {
      grew,
      newThemes,
      archetypeShift,
      from: prevArchName,
      to: newestArchName,
    };
  }

  const greeting = t("dashboard.greeting", { name: (account?.name || "").split(" ")[0] }) || `Godt å se deg igjen, ${(account?.name || "").split(" ")[0]}.`;

  return (
    <section
      data-screen-label="App — min side"
      style={{
        position: "relative",
        zIndex: 1,
        maxWidth: 860,
        margin: "0 auto",
        padding: "120px var(--pad-x) 90px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <span className="kk-label kk-rise" style={{ color: "var(--accent)" }}>
            {t("dashboard.title")}
          </span>
          <h1
            className="kk-rise kk-rise-1"
            style={{
              fontFamily: "var(--display)",
              fontStyle: "italic",
              fontWeight: 600,
              fontSize: "clamp(34px, 6vw, 52px)",
              lineHeight: 1.05,
              margin: "10px 0 0",
            }}
          >
            {greeting}
          </h1>
        </div>
        <button className="kk-btn-ghost" style={{ padding: "10px 18px", fontSize: 11 }} onClick={onLogout}>
          {t("dashboard.logout")}
        </button>
      </div>
      <p
        className="kk-rise kk-rise-2"
        style={{
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: "0.06em",
          color: "var(--dim)",
          marginBottom: 44,
          lineHeight: 1.7,
        }}
      >
        {t("dashboard.privacyNote")}
      </p>

      {/* Level badge */}
      <LevelBadge ctx={ctx} />

      {/* Notifications */}
      {social && (
        <NotificationFeed
          notifications={social.notifications}
          onAcceptCompare={onAcceptCompare}
          onDeclineCompare={onDeclineCompare}
          onMarkAllRead={onMarkAllRead}
          people={KK_PEOPLE}
        />
      )}

      {/* Constellation mapping */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <h2 className="kk-label" style={{ color: "var(--accent)" }}>
            {t("dashboard.constellation")}
          </h2>
          <span style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.08em", color: "var(--fg-soft)" }}>
            {t("dashboard.areasMapped", { count: union.length })}
          </span>
        </div>
        <ProgressConstellation covered={union} />
        <p style={{ fontSize: 15.5, color: "var(--fg-soft)", lineHeight: 1.6, marginTop: 14, textWrap: "pretty" }}>
          {t("dashboard.remainingAreas", { count: 15 - union.length })}
        </p>
      </div>

      {/* Achievements */}
      <AchievementsSection ctx={ctx} />

      {/* Development since last report */}
      {delta && (
        <div
          style={{
            marginBottom: 48,
            border: "1px solid var(--border-soft)",
            background: "var(--gold-alpha-12)",
            padding: "22px 26px",
            borderLeft: "2px solid var(--gold)",
          }}
        >
          <span className="kk-label" style={{ color: "var(--gold)" }}>
            {t("dashboard.developmentSinceLast")}
          </span>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
            {delta.archetypeShift && (
              <li style={{ fontSize: 17, color: "var(--fg-soft)", lineHeight: 1.5 }}>
                {t("dashboard.archetypeShift", { from: delta.from, to: delta.to })}
              </li>
            )}
            {delta.grew > 0 && (
              <li style={{ fontSize: 17, color: "var(--fg-soft)", lineHeight: 1.5 }}>
                {t("dashboard.grewCount", { count: delta.grew })}
              </li>
            )}
            {delta.newThemes.length > 0 && (
              <li style={{ fontSize: 17, color: "var(--fg-soft)", lineHeight: 1.5 }}>
                {t("dashboard.newThemes", { themes: delta.newThemes.join(", ") })}
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Population comparison details */}
      {newest && (
        <div style={{ marginBottom: 48, borderTop: "1px solid var(--border)", paddingTop: 40 }}>
          <CompareSection archetypeKey={newest.archetypeKey || "vokteren"} themes={newest.themes} embedded={true} />
        </div>
      )}

      {/* Friends and social module */}
      {social && (
        <FriendsModule
          premium={premium}
          social={social}
          onActivatePremium={onActivatePremium}
          onCompare={onCompare}
          onRequestCompare={onRequestCompare}
          onAcceptCompare={onAcceptCompare}
          onDeclineCompare={onDeclineCompare}
          onToggleFollow={onToggleFollow}
          onAccept={onAccept}
          onDecline={onDecline}
          onSendRequest={onSendRequest}
          onOpenPrivacy={onOpenPrivacy}
        />
      )}

      {/* Archive and saved reports list */}
      <h2 className="kk-label" style={{ color: "var(--accent)", marginBottom: 18 }}>
        {t("dashboard.savedAnalyses", { count: list.length })}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {list.map((archiveItem) => (
          <AnalysisCard key={archiveItem.id} analysis={archiveItem} onAddNote={onAddNote} onNewAnalysis={onNewAnalysis} />
        ))}
      </div>

      {/* New Analysis button & data controls */}
      <div style={{ display: "flex", gap: 14, marginTop: 36, flexWrap: "wrap" }}>
        <button className="kk-btn-primary" onClick={onStart}>
          {t("dashboard.startNew")}
        </button>
      </div>

      <div style={{ marginTop: 56, borderTop: "1px solid var(--border)", paddingTop: 26, display: "flex", flexDirection: "column", gap: 14 }}>
        <span className="kk-label" style={{ color: "var(--dim)" }}>
          {t("dashboard.myData")}
        </span>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <button className="kk-link-act">{t("dashboard.downloadAll")}</button>
          <button
            className="kk-link-act"
            style={{ color: "var(--error)" }}
            onClick={() => {
              if (confirm(t("dashboard.deleteConfirm"))) onDeleteAll();
            }}
          >
            {t("dashboard.deleteAll")}
          </button>
        </div>
      </div>
    </section>
  );
}
