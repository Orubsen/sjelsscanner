import { useI18n } from "./I18nContext.jsx";

const wrapStyle = {
  display: "inline-flex",
  gap: 4,
  alignItems: "center",
  fontFamily: "var(--mono)",
  fontSize: 10,
  letterSpacing: 1,
};

const btnBase = {
  background: "transparent",
  border: "1px solid var(--border)",
  color: "var(--dim)",
  padding: "4px 8px",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: "inherit",
  letterSpacing: "inherit",
  transition: "all 0.15s",
};

export function LanguageSwitcher({ style = {}, compact = false }) {
  const { locale, setLocale, locales, t } = useI18n();

  return (
    <div style={{ ...wrapStyle, ...style }} role="group" aria-label={t("lang.label")}>
      {!compact && (
        <span style={{ color: "var(--dim-2)", marginRight: 4 }}>{t("lang.label")}</span>
      )}
      {locales.map((opt) => {
        const active = locale === opt.code;
        return (
          <button
            key={opt.code}
            type="button"
            title={opt.label}
            onClick={() => setLocale(opt.code)}
            style={{
              ...btnBase,
              borderColor: active ? "var(--accent)" : "var(--border)",
              color: active ? "var(--accent)" : "var(--dim)",
              background: active ? "rgba(129,140,248,0.1)" : "transparent",
            }}
          >
            {opt.short}
          </button>
        );
      })}
    </div>
  );
}