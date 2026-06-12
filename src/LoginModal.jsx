import { useState } from "react";
import { useI18n } from "./i18n/I18nContext.jsx";

/* Demo login modal simulating Google Single Sign-In */
export function LoginModal({ context, onClose, onLogin }) {
  const { t } = useI18n();
  const [stage, setStage] = useState("pick"); // pick | connecting
  
  const acct = { name: "Ruben Røsten", email: "ruben.rosten@gmail.com" };
  const reason = context === "save"
    ? t("dashboard.loginReasonSave")
    : t("dashboard.loginReasonTrack");

  const choose = () => {
    setStage("connecting");
    setTimeout(() => onLogin(acct), 1100);
  };

  return (
    <div className="kk-modal-veil" onClick={onClose}>
      <div className="kk-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.2em", color: "var(--dim)" }}>GOOGLE</span>
          <button onClick={onClose} aria-label="Lukk" style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>
        <h3 style={{ fontFamily: "var(--display)", fontStyle: "italic", fontWeight: 600, fontSize: 26, margin: "4px 0 6px" }}>
          {t("dashboard.loginTitle")}
        </h3>
        <p style={{ fontSize: 15, color: "var(--fg-soft)", lineHeight: 1.5, marginBottom: 22 }}>
          for å fortsette til <strong style={{ color: "var(--fg)" }}>Kjernekoden</strong> {reason}.
        </p>

        {stage === "pick" ? (
          <button className="kk-acct-pick" onClick={choose}>
            <span aria-hidden="true" style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              width: 38, height: 38, borderRadius: "50%", background: "var(--accent)", color: "#0b081a",
              fontFamily: "var(--body)", fontSize: 18, fontWeight: 600,
            }}>{acct.name[0]}</span>
            <span style={{ display: "flex", flexDirection: "column", textAlign: "left", minWidth: 0, marginLeft: 14 }}>
              <span style={{ fontSize: 16, color: "var(--fg)" }}>{acct.name}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)" }}>{acct.email}</span>
            </span>
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 4px", color: "var(--fg-soft)" }}>
            <span className="kk-spin" aria-hidden="true"></span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.1em" }}>
              {t("dashboard.connecting")}
            </span>
          </div>
        )}

        <p style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.04em", color: "var(--dim-2)", marginTop: 22, lineHeight: 1.6 }}>
          {t("dashboard.loginHint")}
        </p>
      </div>
    </div>
  );
}
