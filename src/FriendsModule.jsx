import { useState } from "react";
import { useI18n } from "./i18n/I18nContext.jsx";
import { KK_PEOPLE, kkArchByKey } from "./archetypes.js";

/* Avatar component representing a user or friend */
export function Avatar({ person, size = 40, gold }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: "50%",
        background: gold ? "var(--gold)" : "var(--surface-2)",
        color: gold ? "#0b081a" : "var(--fg)",
        border: "1px solid var(--border)",
        fontFamily: "var(--body)",
        fontSize: size * 0.42,
        fontWeight: 600,
      }}
    >
      {person.initial}
    </span>
  );
}

/* Premium lock wall */
export function PremiumGate({ onActivate }) {
  const { t } = useI18n();
  return (
    <div style={{ position: "relative", border: "1px solid var(--border-soft)", overflow: "hidden", background: "var(--surface)" }}>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.5,
          background:
            "radial-gradient(ellipse 60% 80% at 80% 10%, var(--gold-alpha-12), transparent 60%), radial-gradient(ellipse 50% 70% at 10% 100%, var(--accent-alpha-15), transparent 60%)",
        }}
      />
      <div style={{ position: "relative", padding: "34px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.24em", color: "var(--gold)" }}>
          ◆ {t("dashboard.premiumHeading") || "KJERNEKODEN PREMIUM"}
        </span>
        <h3 style={{ fontFamily: "var(--display)", fontStyle: "italic", fontWeight: 600, fontSize: "clamp(24px, 3.4vw, 32px)", lineHeight: 1.15, margin: 0, textWrap: "balance" }}>
          {t("dashboard.premiumTitle") || "Sammenlign analysen din med folk du stoler på."}
        </h3>
        <p style={{ fontSize: 16.5, lineHeight: 1.6, color: "var(--fg-soft)", maxWidth: 520, textWrap: "pretty" }}>
          {t("dashboard.premiumDesc") || "Legg til venner, følg utviklingen deres, og still din kjernekode side om side med deres."}
        </p>
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 9, margin: "4px 0 8px" }}>
          {(t("dashboard.premiumBulletPoints") || [
            "Sammenlign hele analysen — eller bare utvalgte deler",
            "Venner og forespørsler på Min side",
            "Følg andres utvikling over tid",
            "Full kontroll på personvern, del for del"
          ]).map((bullet) => (
            <li key={bullet} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 15.5, color: "var(--fg-soft)" }}>
              <span style={{ color: "var(--gold)", flexShrink: 0 }}>✦</span>
              {bullet}
            </li>
          ))}
        </ul>
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <button className="kk-btn-primary" onClick={onActivate} style={{ background: "var(--gold)", borderColor: "var(--gold)", color: "#0b081a" }}>
            {t("dashboard.premiumActivateBtn") || "AKTIVER PREMIUM"}
          </button>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.06em", color: "var(--dim)" }}>
            {t("dashboard.premiumDemoHint") || "Demo — aktiveres uten betaling"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* Privacy Modal to select default shared segments */
export function PrivacyModal({ sharing, onSave, onClose }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState({ ...sharing });
  const toggle = (id) => setDraft((d) => ({ ...d, [id]: !d[id] }));

  const SHARE_SECTIONS = [
    { id: "kjernekode", label: t("dashboard.privacySections.kjernekode") || "Kjernekode", desc: t("dashboard.privacySections.kjernekodeDesc") || "Arketype og kjernesetning" },
    { id: "sammendrag", label: t("dashboard.privacySections.sammendrag") || "Sammendrag", desc: t("dashboard.privacySections.sammendragDesc") || "Den korte oppsummeringen" },
    { id: "temaer", label: t("dashboard.privacySections.temaer") || "Temaer", desc: t("dashboard.privacySections.temaerDesc") || "Dine gjennomgående mønstre" },
    { id: "spekter", label: t("dashboard.privacySections.spekter") || "Spekteret", desc: t("dashboard.privacySections.spekterDesc") || "Hvor du ligger på de fire aksene" },
    { id: "konstellasjon", label: t("dashboard.privacySections.konstellasjon") || "Konstellasjon", desc: t("dashboard.privacySections.konstellasjonDesc") || "Hvilke områder du har kartlagt" },
    { id: "spenninger", label: t("dashboard.privacySections.spenninger") || "Spenninger", desc: t("dashboard.privacySections.spenningerDesc") || "Indre motsetninger", sensitive: true },
    { id: "usagt", label: t("dashboard.privacySections.usagt") || "Det du aldri ville sagt høyt", desc: t("dashboard.privacySections.usagtDesc") || "Det mest sårbare", sensitive: true },
  ];

  const sharedCount = SHARE_SECTIONS.filter((s) => draft[s.id]).length;

  return (
    <div className="kk-modal-veil" onClick={onClose}>
      <div className="kk-modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(520px, 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.2em", color: "var(--accent)" }}>
            {t("dashboard.privacySetting").toUpperCase()}
          </span>
          <button onClick={onClose} aria-label="Lukk" style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>
        <h3 style={{ fontFamily: "var(--display)", fontStyle: "italic", fontWeight: 600, fontSize: 25, margin: "4px 0 6px" }}>
          {t("dashboard.privacyModalTitle")}
        </h3>
        <p style={{ fontSize: 15, color: "var(--fg-soft)", lineHeight: 1.5, marginBottom: 20 }}>
          {t("dashboard.privacyModalHint")}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 20 }}>
          {SHARE_SECTIONS.map((s) => (
            <label
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 4px",
                cursor: "pointer",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 16, color: "var(--fg)" }}>
                  {s.label}
                  {s.sensitive && (
                    <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: "0.1em", color: "var(--gold)", marginLeft: 6, verticalAlign: "middle" }}>
                      {t("dashboard.sensitiveLabel")}
                    </span>
                  )}
                </span>
                <span style={{ display: "block", fontSize: 13, color: "var(--dim)" }}>{s.desc}</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={!!draft[s.id]}
                onClick={() => toggle(s.id)}
                className={"kk-switch" + (draft[s.id] ? " is-on" : "")}
              >
                <span className="kk-switch-knob"></span>
              </button>
            </label>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.06em", color: "var(--dim)" }}>
            {t("dashboard.privacyModalCount", { count: sharedCount, total: SHARE_SECTIONS.length })}
          </span>
          <button className="kk-btn-primary" onClick={() => onSave(draft)}>
            {t("dashboard.saveBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Timeline component for following friend's archetypes history */
export function FollowTimeline({ person }) {
  const { t } = useI18n();
  if (!person.publicDevelopment) {
    return (
      <p style={{ fontFamily: "var(--mono)", fontSize: 11.5, letterSpacing: "0.04em", color: "var(--dim)", lineHeight: 1.6 }}>
        {t("dashboard.notSharedDevelopment", { name: person.name.split(" ")[0] })}
      </p>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {person.timeline.map((pt, i) => {
        const arch = kkArchByKey(pt.archetypeKey);
        const last = i === person.timeline.length - 1;
        const archName = t("archetypes." + pt.archetypeKey + ".name") || arch.name;
        return (
          <div key={i} style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)", width: 64, flexShrink: 0 }}>{pt.dateLabel}</span>
            <span style={{ width: 9, height: 9, borderRadius: "50%", flexShrink: 0, background: last ? "var(--gold)" : "var(--accent)", boxShadow: last ? "0 0 10px var(--gold)" : "none" }}></span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 13, letterSpacing: "0.04em", color: "var(--fg)" }}>{archName}</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)", marginLeft: "auto" }}>
              {t("dashboard.timelineCovered", { count: pt.coveredCount })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* Friend card component */
export function FriendCard({ person, following, compareState, onCompare, onRequestCompare, onAcceptCompare, onDeclineCompare, onToggleFollow }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const arch = kkArchByKey(person.archetypeKey);
  const showsArchetype = person.sharing.kjernekode;
  const first = person.name.split(" ")[0];

  const CompareControl = () => {
    if (compareState === "mutual") {
      return (
        <button className="kk-btn-ghost" style={{ padding: "9px 16px", fontSize: 11 }} onClick={() => onCompare(person.id)}>
          {t("dashboard.compareBtn")}
        </button>
      );
    }
    if (compareState === "sent") {
      return (
        <button className="kk-btn-ghost" style={{ padding: "9px 16px", fontSize: 11, opacity: 0.6, cursor: "default" }} disabled>
          {t("dashboard.waitingForFriend", { name: first.toUpperCase() })}
        </button>
      );
    }
    if (compareState === "incoming") {
      return (
        <div style={{ display: "flex", gap: 8 }}>
          <button className="kk-btn-primary" style={{ padding: "9px 14px", fontSize: 11 }} onClick={() => onAcceptCompare(person.id)}>
            {t("dashboard.accept")}
          </button>
          <button className="kk-btn-ghost" style={{ padding: "9px 14px", fontSize: 11 }} onClick={() => onDeclineCompare(person.id)}>
            {t("dashboard.decline")}
          </button>
        </div>
      );
    }
    return (
      <button className="kk-btn-ghost" style={{ padding: "9px 16px", fontSize: 11 }} onClick={() => onRequestCompare(person.id)}>
        {t("dashboard.requestCompare")}
      </button>
    );
  };

  const archName = t("archetypes." + person.archetypeKey + ".name") || arch.name;

  return (
    <div className="kk-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <Avatar person={person} size={44} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: "block", fontSize: 17, color: "var(--fg)" }}>{person.name}</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.06em", color: "var(--accent)" }}>
            {showsArchetype ? archName : t("dashboard.hiddenArchetype")} · {person.dateLabel}
          </span>
        </div>
        <CompareControl />
      </div>
      {compareState === "incoming" && (
        <p style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.04em", color: "var(--gold)" }}>
          {t("dashboard.friendWantsCompare", { name: first })}
        </p>
      )}
      {compareState === "none" && (
        <p style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.04em", color: "var(--dim)" }}>
          {t("dashboard.comparePrivacyWarning")}
        </p>
      )}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
        <button className="kk-link-act" onClick={() => setOpen((o) => !o)}>
          {open ? t("dashboard.hideDevelopment") : t("dashboard.followDevelopment")}
        </button>
        {person.publicDevelopment && (
          <button className="kk-link-act" onClick={() => onToggleFollow(person.id)} style={{ color: following ? "var(--gold)" : "var(--fg-soft)" }}>
            {following ? t("dashboard.following") : t("dashboard.follow")}
          </button>
        )}
      </div>
      {open && <div style={{ paddingTop: 4 }}><FollowTimeline person={person} /></div>}
    </div>
  );
}

/* Whole friends/social module */
export function FriendsModule({ premium, social, onActivatePremium, onCompare, onRequestCompare, onAcceptCompare, onDeclineCompare, onToggleFollow, onAccept, onDecline, onSendRequest, onOpenPrivacy }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [sent, setSent] = useState(null);

  if (!premium) {
    return (
      <div style={{ marginBottom: 48 }}>
        <h2 className="kk-label" style={{ color: "var(--gold)", marginBottom: 18 }}>
          {t("dashboard.socialSectionTitle") || "Venner & sammenligning"}
        </h2>
        <PremiumGate onActivate={onActivatePremium} />
      </div>
    );
  }

  const friends = social.friendIds.map((id) => KK_PEOPLE[id]).filter(Boolean);
  const requests = social.requestsIn.map((id) => KK_PEOPLE[id]).filter(Boolean);
  const sharedCount = Object.keys(social.sharing || {}).filter((k) => social.sharing[k]).length;

  const doSearch = () => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const hit = Object.values(KK_PEOPLE).find(
      (p) =>
        (p.code.toLowerCase() === q || p.name.toLowerCase().includes(q)) &&
        !social.friendIds.includes(p.id) &&
        !social.requestsIn.includes(p.id)
    );
    if (hit) {
      onSendRequest(hit.id);
      setSent(hit.name);
      setQuery("");
    } else {
      setSent("__none__");
    }
  };

  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
        <h2 className="kk-label" style={{ color: "var(--gold)" }}>
          ◆ {t("dashboard.socialSectionTitle") || "Venner & sammenligning"}{" "}
          <span style={{ color: "var(--dim)" }}>· {t("dashboard.premiumLabel")}</span>
        </h2>
        <button className="kk-link-act" onClick={onOpenPrivacy}>
          ⚙ {t("dashboard.privacySetting")} · {sharedCount}/7 {t("dashboard.sharesSharedLabel") || "deler delt"}
        </button>
      </div>

      {/* Requests received */}
      {requests.length > 0 && (
        <div style={{ marginBottom: 22, border: "1px solid var(--border-soft)", background: "var(--accent-alpha-08)", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="kk-label" style={{ color: "var(--accent)" }}>
            {t("dashboard.friendRequests", { count: requests.length })}
          </span>
          {requests.map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <Avatar person={p} size={36} />
              <span style={{ fontSize: 16, color: "var(--fg)", flex: 1, minWidth: 0 }}>{p.name}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="kk-btn-primary" style={{ padding: "8px 16px", fontSize: 11 }} onClick={() => onAccept(p.id)}>
                  {t("dashboard.accept")}
                </button>
                <button className="kk-btn-ghost" style={{ padding: "8px 16px", fontSize: 11 }} onClick={() => onDecline(p.id)}>
                  {t("dashboard.decline")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add friend input */}
      <div style={{ marginBottom: 22, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            className="kk-field"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSent(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
            placeholder={t("dashboard.requestPlaceholder")}
            style={{ flex: "1 1 240px" }}
          />
          <button className="kk-btn-ghost" onClick={doSearch}>
            {t("dashboard.sendRequest")}
          </button>
        </div>
        {sent === "__none__" && (
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)" }}>
            {t("dashboard.searchNotFound")}
          </span>
        )}
        {sent && sent !== "__none__" && (
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ok)" }}>
            {t("dashboard.requestSent", { name: sent })}
          </span>
        )}
      </div>

      {/* Friend cards list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {friends.length === 0 && (
          <p style={{ fontSize: 15.5, color: "var(--dim)" }}>
            {t("dashboard.noFriends")}
          </p>
        )}
        {friends.map((p) => (
          <FriendCard
            key={p.id}
            person={p}
            following={social.followingIds.includes(p.id)}
            compareState={(social.compare && social.compare[p.id]) || "none"}
            onCompare={onCompare}
            onRequestCompare={onRequestCompare}
            onAcceptCompare={onAcceptCompare}
            onDeclineCompare={onDeclineCompare}
            onToggleFollow={onToggleFollow}
          />
        ))}
      </div>
    </div>
  );
}
