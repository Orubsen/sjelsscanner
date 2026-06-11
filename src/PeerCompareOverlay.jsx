import { useState } from "react";
import { useI18n } from "./i18n/I18nContext.jsx";
import { KK_AXES } from "./archetypes.js";
import { Avatar } from "./FriendsModule.jsx";

/* 15 star map positions (matching the main star map layout) */
const SOC_STAR_POS = [
  { x: 8, y: 34 }, { x: 17, y: 16 }, { x: 29, y: 27 }, { x: 24, y: 56 },
  { x: 37, y: 68 }, { x: 46, y: 42 }, { x: 43, y: 14 }, { x: 57, y: 25 },
  { x: 65, y: 50 }, { x: 56, y: 74 }, { x: 73, y: 68 }, { x: 81, y: 38 },
  { x: 75, y: 14 }, { x: 89, y: 22 }, { x: 91, y: 60 },
];

/* Dual-marker spectrum: user vs friend on a single axis */
function PcSpectrum({ axis, mine, theirs, friendName }) {
  const { t } = useI18n();
  const leftLabel = t("dashboard.axes." + axis.id + "Left") || axis.left;
  const rightLabel = t("dashboard.axes." + axis.id + "Right") || axis.right;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.08em", color: "var(--fg-soft)" }}>
        <span>{leftLabel}</span><span>{rightLabel}</span>
      </div>
      <div style={{ position: "relative", height: 2, background: "var(--border-soft)", margin: "12px 0" }}>
        <span title={friendName} style={{ position: "absolute", top: "50%", left: theirs + "%", transform: "translate(-50%,-50%)", width: 12, height: 12, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 10px var(--accent)" }}></span>
        <span title="Deg" style={{ position: "absolute", top: "50%", left: mine + "%", transform: "translate(-50%,-50%)", width: 14, height: 14, borderRadius: "50%", background: "var(--gold)", boxShadow: "0 0 12px var(--gold)" }}></span>
      </div>
    </div>
  );
}

/* Locked row placeholder when one of the participants hides the section */
function LockedRow({ label, who }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, border: "1px dashed var(--border-soft)", padding: "16px 18px", color: "var(--dim)" }}>
      <span aria-hidden="true" style={{ fontSize: 15 }}>🔒</span>
      <span style={{ fontSize: 15, lineHeight: 1.5 }}><strong style={{ color: "var(--fg-soft)" }}>{label}</strong> — {who}</span>
    </div>
  );
}

function SectionShell({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, borderTop: "1px solid var(--border)", paddingTop: 26 }}>
      <span className="kk-label" style={{ color: "var(--accent)" }}>{label}</span>
      {children}
    </div>
  );
}

/* Detailed Peer-to-Peer comparison overlay */
export function PeerCompareOverlay({ me, friend, mySharing, onClose }) {
  const { t } = useI18n();
  const [scopeMode, setScopeMode] = useState("full"); // full | velg
  const [scope, setScope] = useState({ ...mySharing });

  const effMine = (id) => (scopeMode === "full" ? !!mySharing[id] : !!scope[id]);
  const theirs = (id) => !!friend.sharing[id];

  const firstFriend = friend.name.split(" ")[0];
  const sameArch = me.archetypeKey === friend.archetypeKey;

  // themes comparison
  const shared = me.themes.filter((tVal) => friend.themes.includes(tVal));
  const mineOnly = me.themes.filter((tVal) => !friend.themes.includes(tVal));
  const theirsOnly = friend.themes.filter((tVal) => !me.themes.includes(tVal));
  
  // constellation mapping
  const overlapAreas = me.covered.filter((c) => friend.covered.includes(c));

  // share sections metadata
  const SHARE_SECTIONS = [
    { id: "kjernekode", label: t("dashboard.privacySections.kjernekode") || "Kjernekode", desc: t("dashboard.privacySections.kjernekodeDesc") || "Arketype og kjernesetning" },
    { id: "sammendrag", label: t("dashboard.privacySections.sammendrag") || "Sammendrag", desc: t("dashboard.privacySections.sammendragDesc") || "Den korte oppsummeringen" },
    { id: "temaer", label: t("dashboard.privacySections.temaer") || "Temaer", desc: t("dashboard.privacySections.temaerDesc") || "Dine gjennomgående mønstre" },
    { id: "spekter", label: t("dashboard.privacySections.spekter") || "Spekteret", desc: t("dashboard.privacySections.spekterDesc") || "Hvor du ligger på de fire aksene" },
    { id: "konstellasjon", label: t("dashboard.privacySections.konstellasjon") || "Konstellasjon", desc: t("dashboard.privacySections.konstellasjonDesc") || "Hvilke områder du har kartlagt" },
    { id: "spenninger", label: t("dashboard.privacySections.spenninger") || "Spenninger", desc: t("dashboard.privacySections.spenningerDesc") || "Indre motsetninger", sensitive: true },
    { id: "usagt", label: t("dashboard.privacySections.usagt") || "Det du aldri ville sagt høyt", desc: t("dashboard.privacySections.usagtDesc") || "Det mest sårbare", sensitive: true },
  ];

  const renderSection = (sec) => {
    const id = sec.id;
    if (!effMine(id) && !theirs(id)) return null;
    if (effMine(id) && !theirs(id)) {
      return (
        <LockedRow
          key={id}
          label={sec.label}
          who={t("dashboard.lockedRowFriend", { name: firstFriend }) || `${firstFriend} deler ikke denne delen`}
        />
      );
    }
    if (!effMine(id) && theirs(id)) {
      return (
        <LockedRow
          key={id}
          label={sec.label}
          who={t("dashboard.lockedRowMe") || "du holder denne privat i denne sammenligningen"}
        />
      );
    }

    if (id === "kjernekode") {
      return (
        <SectionShell key={id} label={sec.label}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="kk-pc-cols">
            {[me, friend].map((p, i) => (
              <div key={i} style={{ border: "1px solid var(--border)", background: "var(--surface)", padding: "16px 18px" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.16em", color: i === 0 ? "var(--gold)" : "var(--accent)" }}>
                  {i === 0 ? t("dashboard.axisTitle") : firstFriend.toUpperCase()}
                </span>
                <h4 style={{ fontFamily: "var(--mono)", fontWeight: 600, fontSize: 20, letterSpacing: "0.04em", margin: "6px 0 4px", color: "var(--fg)" }}>
                  {t("archetypes." + p.archetypeKey + ".name") || p.arch.name}
                </h4>
                <span style={{ fontFamily: "var(--display)", fontStyle: "italic", fontSize: 15, color: "var(--fg-soft)" }}>
                  {t("archetypes." + p.archetypeKey + ".subtitle") || p.arch.subtitle}
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 16, color: "var(--fg-soft)", lineHeight: 1.5 }}>
            {sameArch ? (
              <span>{t("dashboard.compareSameArchetype")}</span>
            ) : (
              <span>{t("dashboard.compareDifferentArchetype")}</span>
            )}
          </p>
        </SectionShell>
      );
    }
    if (id === "sammendrag") {
      return (
        <SectionShell key={id} label={sec.label}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[me, friend].map((p, i) => (
              <div key={i} style={{ borderLeft: "2px solid " + (i === 0 ? "var(--gold)" : "var(--accent)"), paddingLeft: 14 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em", color: "var(--dim)" }}>
                  {i === 0 ? t("dashboard.axisTitle") : firstFriend.toUpperCase()}
                </span>
                <p style={{ fontSize: 16, lineHeight: 1.6, color: "var(--fg-soft)", marginTop: 4, textWrap: "pretty" }}>{p.summary}</p>
              </div>
            ))}
          </div>
        </SectionShell>
      );
    }
    if (id === "temaer") {
      return (
        <SectionShell key={id} label={sec.label}>
          {shared.length > 0 && (
            <div>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.06em", color: "var(--gold)" }}>
                {t("dashboard.compareSharedThemes") || "DELTE TEMAER"} · {shared.length}
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {shared.map((themeName) => (
                  <span key={themeName} style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "#0b081a", background: "var(--gold)", padding: "5px 11px" }}>
                    {themeName}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 6 }} className="kk-pc-cols">
            {[
              [t("dashboard.compareOnlyMe") || "Bare deg", mineOnly, "var(--gold)"],
              [(t("dashboard.compareOnlyFriend") || "Bare {name}").replace("{name}", firstFriend), theirsOnly, "var(--accent)"]
            ].map(([title, arr, col]) => (
              <div key={title}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.06em", color: col }}>{title.toUpperCase()}</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 8 }}>
                  {arr.length ? (
                    arr.map((themeName) => (
                      <span key={themeName} style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent-bright)", border: "1px solid var(--border-soft)", padding: "4px 9px" }}>
                        {themeName}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: 13, color: "var(--dim)" }}>—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionShell>
      );
    }
    if (id === "spekter") {
      return (
        <SectionShell key={id} label={sec.label}>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {KK_AXES.map((ax) => (
              <PcSpectrum key={ax.id} axis={ax} mine={me.pos[ax.id]} theirs={friend.pos[ax.id]} friendName={firstFriend} />
            ))}
          </div>
          <p style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.06em", color: "var(--dim)", display: "flex", gap: 18, flexWrap: "wrap" }}>
            <span>
              <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: "var(--gold)", marginRight: 6, verticalAlign: "middle" }} />
              {t("dashboard.axisTitle")}
            </span>
            <span>
              <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: "var(--accent)", marginRight: 6, verticalAlign: "middle" }} />
              {firstFriend.toUpperCase()}
            </span>
          </p>
        </SectionShell>
      );
    }
    if (id === "konstellasjon") {
      return (
        <SectionShell key={id} label={sec.label}>
          <div style={{ position: "relative", height: 180, border: "1px solid var(--border)", background: "var(--surface)", overflow: "hidden" }}>
            {SOC_STAR_POS.map((p, i) => {
              const n = i + 1;
              const mineHas = me.covered.includes(n);
              const theirHas = friend.covered.includes(n);
              if (!mineHas && !theirHas) {
                return (
                  <span key={i} style={{ position: "absolute", left: p.x + "%", top: p.y + "%", transform: "translate(-50%,-50%)", width: 4, height: 4, borderRadius: "50%", background: "var(--dim-2)" }} />
                );
              }
              const bothLight = mineHas && theirHas;
              return (
                <span
                  key={i}
                  style={{
                    position: "absolute",
                    left: p.x + "%",
                    top: p.y + "%",
                    transform: "translate(-50%,-50%)",
                    width: bothLight ? 11 : 8,
                    height: bothLight ? 11 : 8,
                    borderRadius: "50%",
                    background: bothLight ? "var(--gold)" : mineHas ? "var(--gold-soft)" : "var(--accent)",
                    boxShadow: bothLight ? "0 0 12px var(--gold)" : "none",
                  }}
                />
              );
            })}
          </div>
          <p style={{ fontSize: 16, color: "var(--fg-soft)", lineHeight: 1.5 }}>
            {t("dashboard.compareConstellationOverlap", { count: overlapAreas.length }) || (
              <>
                Dere har begge kartlagt <strong style={{ color: "var(--gold)" }}>{overlapAreas.length}</strong> av de samme områdene.
              </>
            )}
          </p>
        </SectionShell>
      );
    }
    
    // sensitive sections
    return (
      <SectionShell key={id} label={sec.label}>
        <p style={{ fontSize: 16, color: "var(--fg-soft)", lineHeight: 1.6, textWrap: "pretty" }}>
          {t("dashboard.compareSharedEvidence")}
        </p>
      </SectionShell>
    );
  };

  return (
    <div className="kk-overlay">
      <div className="kk-overlay-inner">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Avatar person={me} size={42} gold />
            <span style={{ fontFamily: "var(--mono)", fontSize: 18, color: "var(--dim)" }}>⟷</span>
            <Avatar person={friend} size={42} />
            <div>
              <span style={{ display: "block", fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.18em", color: "var(--accent)" }}>
                {t("dashboard.compareHeaderTitle") || "SAMMENLIGNING"}
              </span>
              <span style={{ display: "block", fontSize: 16, color: "var(--fg)" }}>
                {t("dashboard.compareHeader", { name: friend.name })}
              </span>
            </div>
          </div>
          <button className="kk-btn-ghost" style={{ padding: "9px 18px", fontSize: 11 }} onClick={onClose}>
            {t("dashboard.closeBtn")}
          </button>
        </div>

        {/* Scope selector */}
        <div style={{ border: "1px solid var(--border-soft)", background: "var(--surface)", padding: "18px 20px", marginBottom: 30 }}>
          <span className="kk-label" style={{ color: "var(--gold)" }}>
            {t("dashboard.compareScopeTitle")}
          </span>
          <div style={{ display: "flex", gap: 8, margin: "14px 0 0", flexWrap: "wrap" }}>
            {[["full", t("dashboard.compareScopeFull")], ["velg", t("dashboard.compareScopeSelect")]].map(([v, l]) => (
              <button key={v} onClick={() => setScopeMode(v)} className={"kk-seg" + (scopeMode === v ? " is-on" : "")}>
                {l}
              </button>
            ))}
          </div>
          {scopeMode === "velg" && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
              {SHARE_SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setScope((sc) => ({ ...sc, [s.id]: !sc[s.id] }))}
                  className={"kk-chip-toggle" + (scope[s.id] ? " is-on" : "")}
                >
                  {scope[s.id] ? "✓ " : ""}
                  {s.label}
                </button>
              ))}
            </div>
          )}
          <p style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.04em", color: "var(--dim)", marginTop: 14, lineHeight: 1.6 }}>
            {t("dashboard.comparePrivacyInfo", { name: firstFriend })}
          </p>
        </div>

        {/* Rendered shared sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          {SHARE_SECTIONS.map((sec) => renderSection(sec))}
        </div>
      </div>
    </div>
  );
}
