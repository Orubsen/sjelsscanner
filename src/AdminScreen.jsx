import { useState, useCallback, useEffect } from "react";
import "./theme.css";
import {
  ADMIN_TOKEN_KEY,
  verifyAdminPassword,
  fetchParticipantsList,
  participantsToCsv,
  downloadCsv,
} from "./participantApi.js";
import { useI18n } from "./i18n/I18nContext.jsx";
import { LanguageSwitcher } from "./i18n/LanguageSwitcher.jsx";

const btn = {
  background: "transparent",
  border: "1px solid var(--border)",
  color: "var(--dim)",
  padding: "8px 16px",
  fontSize: 10,
  letterSpacing: 2,
  cursor: "pointer",
  fontFamily: "var(--mono)",
};

const btnPrimary = {
  ...btn,
  borderColor: "var(--accent)",
  color: "var(--accent)",
};

function formatDate(iso, dateLocale) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(dateLocale || "nb-NO", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function AdminScreen() {
  const { t, dateLocale } = useI18n();
  const [token, setToken] = useState(() => sessionStorage.getItem(ADMIN_TOKEN_KEY) || "");
  const [password, setPassword] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadList = useCallback(async (adminToken) => {
    setLoading(true);
    setError("");
    try {
      const list = await fetchParticipantsList(adminToken);
      setRows(list);
    } catch (e) {
      setError(e?.message || t("admin.fetchFailed"));
      if (/401|ugyldig|manglende|invalid/i.test(String(e?.message))) {
        sessionStorage.removeItem(ADMIN_TOKEN_KEY);
        setToken("");
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (token) loadList(token);
  }, [token, loadList]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // K2 – verifyAdminPassword returnerer nå et sesjonstoken fra serveren,
      // ikke råpassordet. Vi lagrer tokenet, ikke passordet.
      const sessionToken = await verifyAdminPassword(password);
      sessionStorage.setItem(ADMIN_TOKEN_KEY, sessionToken);
      setToken(sessionToken);
      setPassword("");
    } catch (err) {
      setError(err?.message || t("admin.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken("");
    setRows([]);
    setPassword("");
  };

  const handleExport = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`sjelsscanner-deltakere-${stamp}.csv`, participantsToCsv(rows));
  };

  const countLabel =
    rows.length === 1
      ? t("admin.count", { n: rows.length })
      : t("admin.countPlural", { n: rows.length });

  const colKeys = ["name", "age", "email", "registered", "completed", "id"];

  return (
    <div className="app-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Crimson+Pro:wght@400&display=swap');
        :root {
          --bg: #080a0f; --surface: #0d1117; --border: #1c2230;
          --fg: #e2e8f0; --fg-soft: #a8b4c4;
          --dim: #4a5568; --dim-2: #2d3748;
          --accent: #818cf8;
          --mono: 'IBM Plex Mono', monospace;
          --body: 'Crimson Pro', serif;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: var(--bg); color: var(--fg); min-height: 100vh; }
        input { font-family: var(--body); }
      `}</style>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 500, letterSpacing: 3, color: "var(--accent)", margin: 0 }}>
              {t("admin.title")}
            </h1>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <LanguageSwitcher compact />
            <a href="/" style={{ ...btn, textDecoration: "none", display: "inline-block" }}>
              {t("admin.backScanner")}
            </a>
            {token && (
              <>
                <button type="button" style={btn} onClick={() => loadList(token)} disabled={loading}>
                  {loading ? t("admin.refreshing") : t("admin.refresh")}
                </button>
                <button type="button" style={btnPrimary} onClick={handleExport} disabled={!rows.length}>
                  {t("admin.exportCsv")}
                </button>
                <button type="button" style={btn} onClick={handleLogout}>
                  {t("admin.logout")}
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 20, padding: 12, border: "1px solid #f87171", color: "#fecaca", fontSize: 12, fontFamily: "var(--mono)" }}>
            {error}
          </div>
        )}

        {!token ? (
          <form
            onSubmit={handleLogin}
            style={{ maxWidth: 360, padding: 24, border: "1px solid var(--border)", background: "var(--surface)" }}
          >
            <label style={{ display: "block", fontSize: 10, letterSpacing: 2, color: "var(--dim)", fontFamily: "var(--mono)", marginBottom: 8 }}>
              {t("admin.passwordLabel")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                color: "var(--fg)",
                padding: "10px 12px",
                fontSize: 14,
                marginBottom: 16,
              }}
            />
            <button
              type="submit"
              disabled={!password || loading}
              style={{ ...btnPrimary, width: "100%", padding: "12px", opacity: password && !loading ? 1 : 0.5 }}
            >
              {loading ? t("admin.checking") : t("admin.login")}
            </button>
          </form>
        ) : (
          <>
            <p style={{ marginBottom: 16, fontSize: 12, color: "var(--dim)", fontFamily: "var(--mono)" }}>
              {countLabel}{t("admin.countSuffix")}
            </p>
            <div style={{ overflowX: "auto", border: "1px solid var(--border)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--mono)", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: "var(--surface)", textAlign: "left" }}>
                    {colKeys.map((key) => (
                      <th
                        key={key}
                        style={{
                          padding: "10px 12px",
                          borderBottom: "1px solid var(--border)",
                          color: "var(--accent)",
                          letterSpacing: 1,
                          fontWeight: 500,
                        }}
                      >
                        {t(`admin.cols.${key}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} style={{ padding: 24, color: "var(--dim)", textAlign: "center" }}>
                        {t("admin.empty")}
                      </td>
                    </tr>
                  )}
                  {rows.map((r) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 12px", color: "var(--fg-soft)" }}>{r.name || "—"}</td>
                      <td style={{ padding: "10px 12px" }}>{r.age ?? "—"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <a href={`mailto:${r.email}`} style={{ color: "var(--accent)", textDecoration: "none" }}>
                          {r.email || "—"}
                        </a>
                      </td>
                      <td style={{ padding: "10px 12px", color: "var(--dim)" }}>{formatDate(r.createdAt, dateLocale)}</td>
                      <td style={{ padding: "10px 12px", color: r.analysisCompleted ? "var(--accent)" : "var(--dim-2)" }}>
                        {r.analysisCompleted ? t("admin.yes") : t("admin.no")}
                      </td>
                      <td style={{ padding: "10px 12px", color: "var(--dim-2)", fontSize: 9 }}>{r.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}