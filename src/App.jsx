import { useState, useEffect, useCallback } from "react";
import { parseLlmJson, parseApiResponse } from "./jsonUtils.js";
import { buildReportPlainText, downloadReportPdf } from "./reportExport.js";
import {
  STORAGE_KEY,
  MAX_QUESTIONS,
  MIN_QUESTIONS_SUGGEST,
  META_CALL_LIMIT,
  FRAMEWORK_ORDER,
} from "./analysisConfig.js";
import { useI18n } from "./i18n/I18nContext.jsx";
import { LanguageSwitcher } from "./i18n/LanguageSwitcher.jsx";
import { apiT } from "./i18n/apiMessages.js";
import { getAnalysisSystemPrompt } from "./i18n/systemPrompts.js";
import {
  normalizeAnalysis,
  formatStructuredAnswersForApi,
  buildAnswerUserMessage,
  buildQuestionContextMessage,
  recordAnswer,
  createAnswerEntry,
  applyQuestionMeta,
  canSuggestAnalysis,
  mustForceAnalysis,
  buildStep2Messages,
  buildDirectAnalysisMessages,
  prepareMessagesForApi,
  getSavedSessionSummary,
  parseSectionBlocks,
} from "./sessionHelpers.js";
import { BrandHeader, BrandFooter, IntroBrandMark, ParticleField } from "./BrandChrome.jsx";
import Landing from "./Landing.jsx";
import {
  EMPTY_PARTICIPANT,
  validateParticipant,
  buildParticipantContext,
  MIN_PARTICIPANT_AGE,
  MAX_PARTICIPANT_AGE,
} from "./participantHelpers.js";
import { saveParticipantToServer, markParticipantAnalysisComplete } from "./participantApi.js";
import { computeSessionProgressPercent } from "./sessionProgress.js";
import {
  EstimatedTimeNote,
  CrisisHelpBox,
  CrisisBox,
  ContactRosten,
  ConsentDetails,
} from "./SiteExtras.jsx";

const loadState = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("sjelsscanner_state_v1");
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return null;
};

const clearState = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("sjelsscanner_state_v1");
  } catch (e) {}
};

const glitchChars = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~01";

function GlitchText({ text, active }) {
  const [displayed, setDisplayed] = useState(text);
  useEffect(() => {
    if (!active) { setDisplayed(text); return; }
    let frame = 0;
    const interval = setInterval(() => {
      if (frame > 6) { setDisplayed(text); clearInterval(interval); return; }
      setDisplayed(text.split("").map((c, i) =>
        i < frame * 3 ? c : glitchChars[Math.floor(Math.random() * glitchChars.length)]
      ).join(""));
      frame++;
    }, 60);
    return () => clearInterval(interval);
  }, [text, active]);
  return <span>{displayed}</span>;
}

function Typewriter({ text, speed = 18, onDone }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed(""); setDone(false);
    if (!text) {
      onDone?.();
      return;
    }
    let i = 0;
    const interval = setInterval(() => {
      if (i >= text.length) { setDone(true); clearInterval(interval); onDone?.(); return; }
      setDisplayed(text.slice(0, i + 1));
      i++;
    }, speed);
    return () => clearInterval(interval);
  }, [text]);
  return <span>{displayed}{!done && <span className="cursor">█</span>}</span>;
}

function ProgressBar({ current, maxQuestions, coveredCategoryIds }) {
  const { t } = useI18n();
  const questionPct = Math.min(100, (current / maxQuestions) * 100);
  const overallPct = computeSessionProgressPercent(current, coveredCategoryIds);
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, color: "var(--dim)", letterSpacing: 2, flexWrap: "wrap", gap: 8 }}>
        <span>{t("progress.dataCollection")}</span>
        <span>
          {t("progress.progress")} {overallPct}% · {t("progress.questionShort")} {current}/{maxQuestions}
        </span>
      </div>
      <div style={{ height: 2, background: "var(--surface)", overflow: "hidden", marginBottom: 6 }}>
        <div
          style={{
            height: "100%",
            width: `${overallPct}%`,
            background: "var(--accent)",
            transition: "width 0.6s ease",
            boxShadow: "0 0 8px var(--accent)",
          }}
        />
      </div>
      <div style={{ height: 1, background: "var(--surface)", overflow: "hidden", opacity: 0.6 }}>
        <div style={{ height: "100%", width: `${questionPct}%`, background: "var(--dim-2)", transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

function ScanlineOverlay() {
  return (
    <div style={{
      position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1000,
      backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
    }} />
  );
}

const btnSmall = {
  background: "transparent", border: "1px solid var(--border)", color: "var(--dim)",
  padding: "8px 14px", fontSize: 11, letterSpacing: 1, cursor: "pointer",
  fontFamily: "var(--mono)", transition: "all 0.2s",
};

function CategoryProgress({ coveredCategoryIds, analysisReady, readinessNote }) {
  const { t, categories } = useI18n();
  const covered = new Set(coveredCategoryIds || []);
  return (
    <div style={{ marginBottom: 20, padding: 12, border: "1px solid var(--border)", background: "var(--surface)" }}>
      <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--dim)", fontFamily: "var(--mono)", marginBottom: 8 }}>
        {t("progress.categoryCoverage")} ({covered.size}/{categories.length})
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {categories.map((c) => (
          <span
            key={c.id}
            title={c.name}
            style={{
              fontSize: 9,
              fontFamily: "var(--mono)",
              padding: "3px 6px",
              border: `1px solid ${covered.has(c.id) ? "var(--accent)" : "var(--border)"}`,
              color: covered.has(c.id) ? "var(--accent)" : "var(--dim-2)",
              background: covered.has(c.id) ? "rgba(129,140,248,0.08)" : "transparent",
            }}
          >
            {covered.has(c.id) ? "✓" : "·"} {c.id}
          </span>
        ))}
      </div>
      {readinessNote && (
        <div style={{ marginTop: 8, fontSize: 11, color: analysisReady ? "var(--accent)" : "var(--dim)", fontFamily: "var(--mono)", lineHeight: 1.5 }}>
          {analysisReady ? t("progress.readyPrefix") : t("progress.pendingPrefix")}{readinessNote}
        </div>
      )}
    </div>
  );
}

const introFieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  color: "var(--fg)",
  padding: "10px 12px",
  fontFamily: "var(--body)",
  fontSize: 13,
};

function IntroScreen({ onStart, savedSession, onResume, onDiscard, initialParticipant, isStarting }) {
  const { t, locale } = useI18n();
  const [name, setName] = useState(initialParticipant?.name || "");
  const [age, setAge] = useState(initialParticipant?.age != null ? String(initialParticipant.age) : "");
  const [email, setEmail] = useState(initialParticipant?.email || "");
  const [consent, setConsent] = useState(Boolean(initialParticipant?.id));
  const [touched, setTouched] = useState(false);
  const [google, setGoogle] = useState(null); // null | "connecting" | {name, email}

  const viaGoogle = google && google !== "connecting";
  const effName = viaGoogle ? google.name : name;
  const effEmail = viaGoogle ? google.email : email;
  const validation = validateParticipant({ name: effName, age, email: effEmail }, locale);
  const canStart = validation.valid && consent;

  const connectGoogle = () => {
    setGoogle("connecting");
    setTimeout(() => setGoogle({ name: "Ruben Røsten", email: "ruben@eksempel.no" }), 1100);
  };

  const handleStart = () => {
    setTouched(true);
    if (!canStart || isStarting) return;
    onStart(validation.normalized, consent);
  };

  return (
    <section style={{
      position: "relative", zIndex: 1, minHeight: "100vh",
      display: "flex", flexDirection: "column", justifyContent: "center",
      maxWidth: 560, margin: "0 auto", padding: "110px var(--pad-x) 80px",
    }}>
      <div style={{ position: "absolute", top: 72, right: "var(--pad-x)", zIndex: 10 }}>
        <LanguageSwitcher />
      </div>
      <IntroBrandMark />
      <span className="kk-label kk-rise kk-rise-1" style={{ color: "var(--accent)", marginBottom: 14 }}>
        {t("intro.beforeStart")}
      </span>
      <p className="kk-rise kk-rise-1" style={{
        fontFamily: "var(--body)", fontSize: 18.5, lineHeight: 1.6,
        color: "var(--fg-soft)", marginBottom: 34, textWrap: "pretty",
      }}>
        {t("intro.hint")}
      </p>

      {savedSession && (
        <div className="kk-rise kk-rise-2" style={{
          border: "1px solid var(--border-soft)", background: "var(--accent-alpha-08)",
          padding: "16px 18px", marginBottom: 28, display: "flex", flexDirection: "column", gap: 10,
        }}>
          <span className="kk-label" style={{ color: "var(--accent)" }}>{t("intro.savedSessionTitle")}</span>
          <p style={{ fontSize: 16, color: "var(--fg-soft)", fontFamily: "var(--body)", lineHeight: 1.5 }}>
            {t("intro.savedSessionBody", {
              n: savedSession.questionNumber,
              covered: savedSession.covered,
              total: savedSession.totalCategories,
            })}
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="kk-btn-primary" style={{ padding: "10px 22px", fontSize: 12 }} onClick={onResume}>
              {t("intro.continue")}
            </button>
            <button className="kk-btn-ghost" style={{ padding: "10px 18px", fontSize: 11 }} onClick={onDiscard}>
              {t("intro.startFresh")}
            </button>
          </div>
        </div>
      )}

      <div className="kk-rise kk-rise-2" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {!viaGoogle ? (
          <>
            <button
              className="kk-btn-ghost"
              style={{ justifyContent: "center", gap: 12, padding: "14px 20px", color: "var(--fg)" }}
              onClick={connectGoogle}
              disabled={google === "connecting"}
            >
              <span aria-hidden="true" style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 20, height: 20, borderRadius: "50%", border: "1px solid var(--fg-soft)",
                fontFamily: "var(--body)", fontSize: 13, fontWeight: 600,
              }}>G</span>
              {google === "connecting" ? "KOBLER TIL GOOGLE…" : "FORTSETT MED GOOGLE"}
            </button>
            <div className="kk-divider">
              <span className="kk-label">ELLER</span>
            </div>
            <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span className="kk-label">{t("intro.name")}</span>
              <input
                className="kk-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder={t("intro.namePlaceholder")}
              />
              {touched && validation.errors?.name && (
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--error)" }}>
                  {validation.errors.name}
                </span>
              )}
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 18 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span className="kk-label">{t("intro.age")}</span>
                <input
                  className="kk-field"
                  type="number"
                  min={MIN_PARTICIPANT_AGE}
                  max={MAX_PARTICIPANT_AGE}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="—"
                />
                {touched && validation.errors?.age && (
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--error)" }}>
                    {validation.errors.age}
                  </span>
                )}
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span className="kk-label">{t("intro.email")}</span>
                <input
                  className="kk-field"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder={t("intro.emailPlaceholder")}
                />
                {touched && validation.errors?.email && (
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--error)" }}>
                    {validation.errors.email}
                  </span>
                )}
              </label>
            </div>
          </>
        ) : (
          <>
            <div style={{
              display: "flex", alignItems: "center", gap: 14,
              border: "1px solid var(--border-soft)", background: "var(--accent-alpha-08)", padding: "14px 18px",
            }}>
              <span aria-hidden="true" style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                width: 34, height: 34, borderRadius: "50%", background: "var(--surface-2)",
                border: "1px solid var(--border)", fontFamily: "var(--body)", fontSize: 16, fontWeight: 600,
              }}>{google.name[0]}</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 16.5, color: "var(--fg)" }}>{google.name}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.06em", color: "var(--dim)" }}>
                  {google.email} · PÅLOGGET VIA GOOGLE
                </span>
              </div>
              <button onClick={() => setGoogle(null)} style={{
                marginLeft: "auto", background: "none", border: "none", cursor: "pointer",
                fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.14em", color: "var(--accent)",
              }}>BYTT</button>
            </div>
            <label style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 140 }}>
              <span className="kk-label">{t("intro.age")}</span>
              <input
                className="kk-field"
                type="number"
                min={MIN_PARTICIPANT_AGE}
                max={MAX_PARTICIPANT_AGE}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="—"
              />
            </label>
          </>
        )}

        <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", marginTop: 4 }}>
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            style={{ accentColor: "var(--accent)", marginTop: 4, width: 16, height: 16 }}
          />
          <span style={{ fontSize: 16, lineHeight: 1.5, color: "var(--fg-soft)" }}>
            <ConsentDetails />
          </span>
        </label>
        {touched && !consent && (
          <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--error)" }}>
            {t("consent.required")}
          </p>
        )}

        <div style={{ display: "flex", gap: 14, marginTop: 14, flexWrap: "wrap" }}>
          <button className="kk-btn-primary" onClick={handleStart} disabled={isStarting}>
            {isStarting ? t("intro.saving") : savedSession ? t("intro.newAnalysis") : t("intro.start")}&ensp;▸
          </button>
        </div>
        <p style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.08em", color: "var(--dim)", marginTop: 8 }}>
          ⚠ {t("intro.disclaimer", { maxQ: MAX_QUESTIONS })}
        </p>
        <div style={{ marginTop: 24 }}><CrisisBox /></div>
      </div>
    </section>
  );
}

function AskBox({ onAskOpinion, onRephrase, isLoading, opinion, onCloseOpinion, askError, onClearAskError, metaRemaining }) {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [mode, setMode] = useState(null);

  const handleAsk = () => {
    if (input.trim().length < 3) return;
    onAskOpinion(input.trim());
    setInput("");
    setMode(null);
  };

  if (opinion) {
    return (
      <div style={{ marginTop: 20, padding: 16, border: "1px solid var(--accent-dim)", background: "rgba(129,140,248,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--accent)", fontFamily: "var(--mono)" }}>
            {t("question.psychologistOpinion")}
          </div>
          <button onClick={onCloseOpinion} style={{ background: "transparent", border: "none", color: "var(--dim)", cursor: "pointer", fontSize: 14, fontFamily: "var(--mono)" }}>✕</button>
        </div>
        <div style={{ color: "var(--fg-soft)", fontSize: 13, lineHeight: 1.7, fontFamily: "var(--body)" }}>
          {opinion}
        </div>
      </div>
    );
  }

  if (mode === "opinion") {
    return (
      <div style={{ marginTop: 20, padding: 14, border: "1px solid var(--border)", background: "var(--surface)" }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--dim)", fontFamily: "var(--mono)", marginBottom: 10 }}>
          {t("question.askPsychologist")}
        </div>
        {askError && (
          <div style={{ marginBottom: 10, padding: 8, border: "1px solid #f87171", color: "#fecaca", fontSize: 12, fontFamily: "var(--mono)" }}>
            {askError}
          </div>
        )}
        <input
          autoFocus value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleAsk(); if (e.key === "Escape") { setMode(null); onClearAskError?.(); } }}
          placeholder={t("question.askPlaceholder")}
          style={{ width: "100%", boxSizing: "border-box", background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg)", padding: "10px 12px", fontFamily: "var(--body)", fontSize: 13, marginBottom: 10 }}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={() => { setMode(null); onClearAskError?.(); }} style={{ ...btnSmall, padding: "6px 14px", fontSize: 10 }}>{t("question.cancel")}</button>
          <button onClick={handleAsk} disabled={input.trim().length < 3 || isLoading}
            style={{
              background: input.trim().length >= 3 && !isLoading ? "var(--accent)" : "transparent",
              border: "1px solid var(--accent-dim)",
              color: input.trim().length >= 3 && !isLoading ? "#000" : "var(--dim)",
              padding: "6px 14px", fontSize: 10, letterSpacing: 2, cursor: "pointer", fontFamily: "var(--mono)"
            }}>{isLoading ? t("question.waiting") : t("question.ask")}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => { onClearAskError?.(); setMode("opinion"); }} disabled={isLoading || metaRemaining <= 0} style={btnSmall}>{t("question.askBtn")}</button>
        <button onClick={onRephrase} disabled={isLoading || metaRemaining <= 0} style={btnSmall}>{t("question.rephraseBtn")}</button>
      </div>
      {metaRemaining <= 0 && (
        <p style={{ marginTop: 8, fontSize: 10, color: "var(--dim-2)", fontFamily: "var(--mono)" }}>
          {t("question.metaLimit", { limit: META_CALL_LIMIT })}
        </p>
      )}
    </div>
  );
}

function QuestionScreen({
  question, category, options, questionNumber, maxQuestions,
  coveredCategoryIds, analysisReady, readinessNote,
  onAnswer, onCustomAnswer, onAskOpinion, onRephrase, onForceAnalysis,
  isLoading, opinion, onCloseOpinion, askError, onClearAskError,
  error, onClearError, metaRemaining,
}) {
  const { t, processingLines } = useI18n();
  const [questionReady, setQuestionReady] = useState(false);
  const [hoveredOption, setHoveredOption] = useState(null);
  const [skipTypewriter, setSkipTypewriter] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState("");
  const [processingIndex, setProcessingIndex] = useState(0);

  const lines = processingLines?.length ? processingLines : [t("question.processing")];
  const processingLabel = lines[processingIndex % lines.length];

  useEffect(() => { setQuestionReady(false); setSkipTypewriter(false); }, [question]);

  useEffect(() => {
    if (!isLoading) {
      setProcessingIndex(0);
      return;
    }
    const id = setInterval(
      () => setProcessingIndex((i) => (i + 1) % lines.length),
      2800
    );
    return () => clearInterval(id);
  }, [isLoading, lines.length, questionNumber]);

  useEffect(() => {
    if (!question || isLoading) return;
    const ms = Math.min(5000, Math.max(600, question.length * 18));
    const t = setTimeout(() => setQuestionReady(true), ms);
    return () => clearTimeout(t);
  }, [question, isLoading]);

  const showAnalysisButton = canSuggestAnalysis(questionNumber, analysisReady);

  const submitCustom = () => {
    if (customText.trim().length < 3) return;
    onCustomAnswer(customText.trim());
    setCustomText("");
    setCustomMode(false);
  };

  return (
    <section style={{
      position: "relative", zIndex: 1, minHeight: "100vh",
      maxWidth: 720, margin: "0 auto", padding: "110px var(--pad-x) 80px",
      display: "flex", flexDirection: "column", justifyContent: "center",
    }}>
      <div style={{ marginBottom: 16 }}>
        <LanguageSwitcher compact />
      </div>
      <ProgressBar current={questionNumber} maxQuestions={maxQuestions} coveredCategoryIds={coveredCategoryIds} />
      <CategoryProgress coveredCategoryIds={coveredCategoryIds} analysisReady={analysisReady} readinessNote={readinessNote} />

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
          <span style={{
            fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.18em",
            color: "var(--bg)", background: "var(--accent)", padding: "4px 10px", fontWeight: 600,
          }}>
            {t("question.questionShort")} {String(questionNumber).padStart(2, "0")}
          </span>
          {category && (
            <span className="kk-label" style={{ color: "var(--gold)" }}>{category}</span>
          )}
        </div>

        <h2 style={{
          fontFamily: "var(--display)", fontStyle: "italic", fontWeight: 500,
          fontSize: "clamp(22px, 3.5vw, 30px)", lineHeight: 1.45,
          marginBottom: 34, textWrap: "pretty", minHeight: "3.6em", color: "var(--fg)",
        }}>
          {isLoading && !question ? (
            <span style={{ color: "var(--accent)", fontFamily: "var(--mono)", fontSize: 14, letterSpacing: 0.5, fontStyle: "normal" }}>
              {processingLabel}
            </span>
          ) : skipTypewriter ? (
            <span>{question}</span>
          ) : (
            <Typewriter text={question} speed={16} onDone={() => setQuestionReady(true)} />
          )}
        </h2>
        {isLoading && question && (
          <p style={{ marginTop: 12, fontFamily: "var(--mono)", fontSize: 12, color: "var(--accent)", letterSpacing: 0.5, lineHeight: 1.6, animation: "blink 1.2s infinite" }}>
            {processingLabel}
          </p>
        )}
        {question && !questionReady && !isLoading && (
          <button type="button" onClick={() => { setSkipTypewriter(true); setQuestionReady(true); }} className="kk-btn-ghost" style={{ padding: "6px 14px", fontSize: 10, marginTop: 8 }}>
            {t("question.showFull")}
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, opacity: questionReady && !isLoading ? 1 : 0.4, transition: "opacity 0.3s" }}>
        {options && options.map((opt, i) => (
          <button
            key={i}
            className="kk-option"
            onClick={() => questionReady && !isLoading && onAnswer(opt)}
            disabled={!questionReady || isLoading}
          >
            <span className="kk-option-key">{"ABCD"[i]} —</span>
            <span>{opt}</span>
          </button>
        ))}
        <button
          type="button"
          className="kk-option"
          onClick={() => questionReady && !isLoading && setCustomMode(true)}
          disabled={!questionReady || isLoading}
          style={{ borderStyle: "dashed", color: "var(--fg-soft)" }}
        >
          <span className="kk-option-key" style={{ color: "var(--gold)" }}>E —</span>
          <span>{t("question.customOption")}</span>
        </button>
      </div>

      {customMode && (
        <div style={{ marginTop: 12, border: "1px dashed var(--gold-soft)", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="kk-label" style={{ color: "var(--gold)" }}>{t("question.customTitle")}</span>
          <textarea
            className="kk-field"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            rows={3}
            placeholder={t("question.customPlaceholder")}
            style={{ resize: "vertical" }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="kk-btn-primary" style={{ padding: "10px 22px", fontSize: 12 }} disabled={customText.trim().length < 3 || isLoading} onClick={submitCustom}>
              {t("question.sendAnswer")}
            </button>
            <button type="button" className="kk-btn-ghost" style={{ padding: "10px 18px" }} onClick={() => setCustomMode(false)}>
              {t("question.cancel")}
            </button>
          </div>
        </div>
      )}

      <AskBox onAskOpinion={onAskOpinion} onRephrase={onRephrase} isLoading={isLoading} opinion={opinion} onCloseOpinion={onCloseOpinion} askError={askError} onClearAskError={onClearAskError} metaRemaining={metaRemaining} />

      {error && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid var(--error)", background: "rgba(248,113,113,0.08)", color: "var(--error-soft)", fontFamily: "var(--mono)", fontSize: 12 }}>
          {error}
          <button onClick={() => { onClearError?.(); onForceAnalysis?.(); }} style={{ marginLeft: 12, background: "transparent", border: "1px solid var(--error)", color: "var(--error-soft)", padding: "2px 8px", cursor: "pointer", fontFamily: "var(--mono)" }}>
            {t("question.retryAnalysis")}
          </button>
        </div>
      )}

      {showAnalysisButton && !isLoading && (
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px dashed var(--border)", textAlign: "center" }}>
          <p style={{ fontSize: 11, color: analysisReady ? "var(--accent)" : "var(--dim)", fontFamily: "var(--mono)", marginBottom: 12, letterSpacing: 1 }}>
            {analysisReady ? t("question.readyForAnalysis") : t("question.canRequestAnalysis", { min: MIN_QUESTIONS_SUGGEST })}
          </p>
          <button className="kk-btn-primary" onClick={onForceAnalysis}>
            {t("question.getAnalysisNow")}
          </button>
        </div>
      )}
    </section>
  );
}

function AnalyzingScreen({ error, onClearError, onForceAnalysis, analyzingStatus, answerCount }) {
  const { t, analyzingPhases } = useI18n();
  const phases = analyzingPhases || [];
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase((p) => Math.min(p + 1, phases.length - 1)), 2200);
    return () => clearInterval(id);
  }, [phases.length]);
  return (
    <section style={{
      position: "relative", zIndex: 1, minHeight: "100vh", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 28px",
    }}>
      <img src="/rosten-logo.svg" alt="" style={{ width: 52, height: 52, marginBottom: 36, filter: "drop-shadow(0 0 24px var(--accent-alpha-25))" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: "var(--mono)", fontSize: 13, letterSpacing: "0.18em" }}>
        {phases.map((p, i) => (
          <div key={p} style={{
            display: "flex", alignItems: "center", gap: 14,
            color: i < phase ? "var(--dim)" : i === phase ? "var(--accent-bright)" : "var(--dim-2)",
            transition: "color 0.4s",
          }}>
            <span style={{ width: 16, textAlign: "center" }}>
              {i < phase ? "✓" : i === phase ? "▍" : "·"}
            </span>
            {p}
          </div>
        ))}
      </div>
      {answerCount > 0 && (
        <span className="kk-label" style={{ marginTop: 36 }}>
          {t("analyzing.processingAnswers", { count: answerCount })}
        </span>
      )}
      {error && (
        <div style={{ marginTop: 32, maxWidth: 420, textAlign: "center", color: "var(--error-soft)", fontFamily: "var(--mono)", fontSize: 12 }}>
          {error}
          <div style={{ marginTop: 12 }}>
            <button onClick={() => { onClearError?.(); onForceAnalysis?.(); }} className="kk-btn-ghost" style={{ padding: "6px 18px" }}>
              {t("analyzing.retry")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function AnalysisScreen({ analysis, analysisData, structuredAnswers, participant, onRestart }) {
  const { t, brand, frameworkLabels } = useI18n();
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("helhetsrapport");
  const [showRaw, setShowRaw] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  const data = analysisData || (analysis ? { analysis } : null);
  const raw = (analysis || data?.analysis || "").trim();
  const hasFrameworks = data?.frameworks && typeof data.frameworks === "object" && Object.keys(data.frameworks).length > 0;
  const showHelhetsrapport = activeTab === "helhetsrapport" || !hasFrameworks;

  // Prefer structured data from LLM if present (sections or frameworks)
  let sections = [];
  if (data?.sections && Array.isArray(data.sections)) {
    sections = data.sections.map(s => ({ title: s.title || "", content: s.content || "" }));
  } else {
    // More tolerant split (handles \r\n and slight header variations)
    sections = raw.split(/\r?\n##\s*/).filter(Boolean).map((s, i) => {
      if (i === 0 && !s.startsWith("#")) return { title: null, ...parseSectionBlocks(s) };
      const lines = s.split(/\r?\n/);
      const content = lines.slice(1).join("\n").trim();
      return { title: lines[0].replace(/^#+ /, "").trim(), ...parseSectionBlocks(content) };
    });
  }

  const exportText = buildReportPlainText(data, raw);

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(raw || exportText || t("report.noCopyContent"));
    } catch (_) {
      // ignore clipboard errors
    }
  };

  const downloadPdf = async () => {
    if (!exportText || pdfBusy) return;
    setPdfBusy(true);
    try {
      const stamp = new Date();
      const dd = String(stamp.getDate()).padStart(2, "0");
      const mm = String(stamp.getMonth() + 1).padStart(2, "0");
      const yyyy = stamp.getFullYear();
      const pdfName = `${t("report.pdfFilenamePrefix")}-${dd}-${mm}-${yyyy}.pdf`;
      await downloadReportPdf(data, raw, pdfName, participant, frameworkLabels);
    } catch (e) {
      console.error(e);
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <section style={{
      position: "relative", zIndex: 1, maxWidth: 760, margin: "0 auto",
      padding: "120px var(--pad-x) 90px", opacity: visible ? 1 : 0, transition: "opacity 0.8s ease",
    }}>
      <span className="kk-label kk-rise" style={{ color: "var(--ok, #6ee7b7)" }}>✓ {t("report.complete")}</span>
      <h1 className="kk-rise kk-rise-1" style={{
        fontFamily: "var(--mono)", fontWeight: 600, lineHeight: 1.05,
        fontSize: "clamp(34px, 8vw, 56px)", margin: "18px 0 14px",
      }}>
        <span className="kk-shimmer">{t("report.titleLine1")}</span><br />
        <span className="kk-shimmer-accent">{t("report.titleLine2")}</span>
      </h1>
      <p className="kk-rise kk-rise-2" style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.08em", color: "var(--dim)", marginBottom: 36, lineHeight: 1.7 }}>
        {t("report.disclaimer")}
      </p>

      {data?.short_summary && (
        <div className="kk-rise kk-rise-2" style={{
          borderLeft: "2px solid var(--gold)", background: "var(--surface)",
          padding: "24px 28px", marginBottom: 40,
        }}>
          <span className="kk-label" style={{ color: "var(--gold)" }}>
            {t("report.shortSummary")}{participant?.name ? ` · ${participant.name.split(" ")[0]}` : ""}
          </span>
          <p style={{ fontFamily: "var(--display)", fontStyle: "italic", fontWeight: 500, fontSize: "clamp(21px, 3vw, 24px)", lineHeight: 1.55, marginTop: 12, textWrap: "pretty" }}>
            {data.short_summary}
          </p>
        </div>
      )}

      {hasFrameworks && (
        <div className="kk-rise kk-rise-3" style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 36 }}>
          {[["helhetsrapport", t("report.tabFull")], ["rammeverk", t("report.tabFrameworks")]].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setActiveTab(id)} style={{
              background: "none", border: "none", cursor: "pointer",
              fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.16em",
              padding: "12px 22px",
              color: activeTab === id ? "var(--accent-bright)" : "var(--dim)",
              borderBottom: activeTab === id ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: -1, transition: "color 0.2s",
            }}>{label}</button>
          ))}
        </div>
      )}

      {showHelhetsrapport && (
        <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
          {data?.overall_insight && (
            <div>
              <h2 className="kk-label" style={{ color: "var(--accent)", marginBottom: 18 }}>{t("report.overallInsight")}</h2>
              <div style={{ color: "var(--fg-soft)", lineHeight: 1.8, fontSize: 18.5, fontFamily: "var(--body)", whiteSpace: "pre-line" }}>
                {data.overall_insight}
              </div>
            </div>
          )}

          {data?.conflicts?.length > 0 && (
            <div>
              <h2 className="kk-label" style={{ color: "var(--accent)", marginBottom: 18 }}>{t("report.conflicts")}</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {data.conflicts.map((c, i) => (
                  <div key={i} style={{ display: "flex", gap: 16, border: "1px solid var(--border)", background: "var(--surface)", padding: "16px 20px" }}>
                    <span style={{ fontFamily: "var(--mono)", color: "var(--gold)", fontSize: 13 }}>⇄</span>
                    <p style={{ fontSize: 17.5, lineHeight: 1.6, color: "var(--fg-soft)", textWrap: "pretty", margin: 0 }}>{c}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data?.clinical_followup && (
            <div>
              <h2 className="kk-label" style={{ color: "var(--accent)", marginBottom: 18 }}>{t("report.clinicalFollowup")}</h2>
              <p style={{ color: "var(--fg-soft)", lineHeight: 1.8, fontSize: 17.5, fontFamily: "var(--body)", margin: 0 }}>{data.clinical_followup}</p>
            </div>
          )}

          {data?.key_themes?.length > 0 && (
            <div>
              <h2 className="kk-label" style={{ color: "var(--accent)", marginBottom: 18 }}>{t("report.keyThemes")}</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {data.key_themes.map((theme, i) => (
                  <span key={i} style={{
                    fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.08em",
                    border: "1px solid var(--border-soft, var(--border))", color: "var(--accent-bright)",
                    background: "var(--accent-alpha-08)", padding: "7px 14px",
                  }}>
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          {raw ? (
            sections.length > 0 ? (
              sections.map((s, i) => (
                <div key={i}>
                  {s.title && (
                    <h2 className="kk-label" style={{ color: "var(--accent)", marginBottom: 18 }}>
                      {s.title.toUpperCase()}
                    </h2>
                  )}
                  {s.observation || s.interpretation || s.uncertainty ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {s.observation && (
                        <p style={{ fontSize: 18.5, lineHeight: 1.65, textWrap: "pretty", margin: 0 }}>
                          <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, letterSpacing: "0.14em", color: "var(--dim)" }}>{t("report.observation").toUpperCase()} · </span>
                          <span style={{ color: "var(--fg-soft)" }}>{s.observation}</span>
                        </p>
                      )}
                      {s.interpretation && (
                        <p style={{ fontSize: 18.5, lineHeight: 1.65, textWrap: "pretty", margin: 0 }}>
                          <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, letterSpacing: "0.14em", color: "var(--dim)" }}>{t("report.interpretation").toUpperCase()} · </span>
                          <span style={{ color: "var(--fg-soft)" }}>{s.interpretation}</span>
                        </p>
                      )}
                      {s.uncertainty && (
                        <p style={{ fontSize: 17, lineHeight: 1.6, textWrap: "pretty", margin: 0 }}>
                          <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, letterSpacing: "0.14em", color: "var(--dim-2)" }}>{t("report.uncertainty").toUpperCase()} · </span>
                          <span style={{ color: "var(--dim)" }}>{s.uncertainty}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: "var(--fg-soft)", lineHeight: 1.9, fontSize: 17.5, fontFamily: "var(--body)", whiteSpace: "pre-line" }}>
                      {s.raw || t("report.noSectionContent")}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ color: "var(--fg-soft)", lineHeight: 1.8, fontSize: 17.5, fontFamily: "var(--body)" }}>
                {t("report.missingSections")}
              </div>
            )
          ) : (
            <div style={{ color: "var(--error-soft)", fontFamily: "var(--mono)", fontSize: 12 }}>{t("report.noReportText")}</div>
          )}
        </div>
      )}

      {activeTab === "rammeverk" && hasFrameworks && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {Object.keys(data.frameworks).map((fw) => {
            const info = data.frameworks[fw];
            return (
              <div key={fw} className="kk-card">
                <h3 style={{ fontFamily: "var(--mono)", fontSize: 13, letterSpacing: "0.2em", color: "var(--accent-bright)", marginBottom: 14 }}>
                  {(frameworkLabels[fw] || fw).toUpperCase()}
                </h3>
                {info && typeof info === "object" ? (
                  <>
                    {info.summary && (
                      <p style={{ fontSize: 17.5, lineHeight: 1.6, color: "var(--fg-soft)", marginBottom: 14, textWrap: "pretty", margin: "0 0 14px 0" }}>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.14em", color: "var(--dim)" }}>{t("report.keyPatterns").toUpperCase()} · </span>
                        {info.summary}
                      </p>
                    )}
                    {Array.isArray(info.key_patterns) && info.key_patterns.length > 0 && (
                      <p style={{ fontSize: 17.5, lineHeight: 1.6, color: "var(--fg-soft)", marginBottom: 14, textWrap: "pretty", margin: "0 0 14px 0" }}>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.14em", color: "var(--dim)" }}>{t("report.keyPatterns").toUpperCase()} · </span>
                        {info.key_patterns.join(", ")}
                      </p>
                    )}
                    {info.evidence_from_answers && (
                      <p style={{ fontSize: 17, fontStyle: "italic", color: "var(--gold)", lineHeight: 1.55, margin: 0 }}>
                        {info.evidence_from_answers}
                      </p>
                    )}
                  </>
                ) : (
                  <p style={{ fontSize: 17.5, color: "var(--fg-soft)", margin: 0 }}>{String(info)}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", gap: 14, marginTop: 56, flexWrap: "wrap" }}>
        <button type="button" className="kk-btn-primary" onClick={downloadPdf} disabled={pdfBusy || !exportText} style={{ opacity: pdfBusy ? 0.6 : 1, cursor: pdfBusy ? "wait" : "pointer" }}>
          {pdfBusy ? t("report.generatingPdf") : t("report.downloadPdf")}
        </button>
        <button type="button" className="kk-btn-ghost" onClick={copyReport}>
          {t("report.copyRaw")}
        </button>
        <button type="button" className="kk-btn-ghost" onClick={() => setShowRaw(!showRaw)}>
          {showRaw ? t("report.hideRaw") : t("report.showRaw")} {t("report.rawText")}
        </button>
        <button type="button" className="kk-btn-ghost" onClick={onRestart}>
          {t("report.newAnalysis")}
        </button>
      </div>

      {showRaw && raw && (
        <pre style={{
          whiteSpace: "pre-wrap", fontFamily: "var(--mono)", fontSize: 12, color: "var(--fg-soft)",
          background: "var(--surface)", padding: 16, border: "1px solid var(--border)", overflowX: "auto", marginTop: 24,
        }}>
          {raw}
        </pre>
      )}

      <div style={{ marginTop: 40 }}><CrisisBox /></div>
      <BrandFooter />
    </section>
  );
}

export default function App() {
  const { t, locale, systemPrompt } = useI18n();
  let initial = loadState();

  // Reset any in-flight analysis phase to "questions" on reload — the analysis call
  // is gone so there's no point staying in these transient states.
  if (
    (initial?.phase === "analyzing" || initial?.phase === "ready_for_analysis") &&
    !initial?.analysis &&
    !initial?.analysisData
  ) {
    initial = {
      ...initial,
      phase: "questions",
      analysisData: null,
      error: null,
    };
  }

  const [phase, setPhase] = useState(initial?.phase || "landing");
  const [conversationHistory, setConversationHistory] = useState(initial?.conversationHistory || []);
  const [structuredAnswers, setStructuredAnswers] = useState(initial?.structuredAnswers || []);
  const [coveredCategoryIds, setCoveredCategoryIds] = useState(initial?.coveredCategoryIds || []);
  const [analysisReady, setAnalysisReady] = useState(initial?.analysisReady || false);
  const [readinessNote, setReadinessNote] = useState(initial?.readinessNote || "");
  const [currentQuestion, setCurrentQuestion] = useState(initial?.currentQuestion || "");
  const [currentCategory, setCurrentCategory] = useState(initial?.currentCategory || "");
  const [currentOptions, setCurrentOptions] = useState(initial?.currentOptions || []);
  const [questionNumber, setQuestionNumber] = useState(initial?.questionNumber || 0);
  const [analysis, setAnalysis] = useState(initial?.analysis || "");
  const [analysisData, setAnalysisData] = useState(initial?.analysisData || null);
  const [isLoading, setIsLoading] = useState(false);
  const [analyzingStatus, setAnalyzingStatus] = useState("");
  const [opinion, setOpinion] = useState("");
  const [askError, setAskError] = useState("");
  const [error, setError] = useState(initial?.error || null);
  const [metaUsageCount, setMetaUsageCount] = useState(initial?.metaUsageCount || 0);
  const [participant, setParticipant] = useState(
    initial?.participant?.name ? initial.participant : EMPTY_PARTICIPANT
  );

  const savedSession =
    (initial?.phase === "questions" || (initial?.questionNumber > 0 && initial?.phase !== "result"))
      ? getSavedSessionSummary(initial)
      : null;
  const metaRemaining = META_CALL_LIMIT - metaUsageCount;

  const clearError = () => setError(null);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          phase,
          conversationHistory,
          structuredAnswers,
          coveredCategoryIds,
          analysisReady,
          readinessNote,
          currentQuestion,
          currentCategory,
          currentOptions,
          questionNumber,
          analysis,
          analysisData,
          metaUsageCount,
          participant,
        })
      );
    } catch (e) {}
  }, [
    phase,
    conversationHistory,
    structuredAnswers,
    coveredCategoryIds,
    analysisReady,
    readinessNote,
    currentQuestion,
    currentCategory,
    currentOptions,
    questionNumber,
    analysis,
    analysisData,
    metaUsageCount,
    participant,
  ]);

  useEffect(() => {
    if (phase === "questions" && initial?.phase === "analyzing" && !analysis && !analysisData && !error) {
      setError(t("errors.analysisInterrupted"));
    }
  }, []);

  const callClaude = useCallback(async (messages, options = {}) => {
    const {
      structuredAnswers = [],
      maxTokens = 2048,
      skipPrepare = false,
      jsonMode = false,
      analysisMode = false,
      participant: participantCtx = null,
    } = options;

    const requestOnce = async (apiMessages, retriesLeft = 2, retryKind = "json", retryAttempt = 0) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(new Error("Analysis request timed out after 180s")),
        180000
      );

      try {
        const prepared = skipPrepare
          ? apiMessages
          : prepareMessagesForApi(apiMessages, structuredAnswers, participantCtx, locale);

        const response = await fetch("/api/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            max_tokens: maxTokens,
            json_mode: jsonMode || analysisMode,
            json_schema: jsonMode ? "question" : undefined,
            temperature: (jsonMode || analysisMode) ? 0.35 : undefined,
            // System prompt routing:
            // - analysisMode=true → send dedicated analysis system prompt (has ANALYSIS FORMAT,
            //   no MAPPING PHASE restrictions). Used for step1/step2 analysis calls.
            // - jsonMode=true (question mode) → send question-mode system prompt (has MAPPING PHASE
            //   rules, QUESTION FORMAT, ANALYSIS FORMAT). Used for normal question turns.
            // - skipPrepare && !jsonMode && !analysisMode → omit system prompt entirely.
            //   (Legacy path, currently unused but kept as safety net.)
            system: analysisMode
              ? getAnalysisSystemPrompt(locale)
              : (skipPrepare && !jsonMode) ? undefined : systemPrompt,
            // Let the server know how many answers exist so it can fire auto_analysis_trigger
            // even when Gemini's truncated JSON omits the analysis_ready field.
            question_count: structuredAnswers.length,
            // Tell the server which retry attempt this is. The server uses this to reduce
            // temperature (→ 0) for more deterministic schema adherence on retries.
            retry_attempt: retryAttempt,
            // Request the ANALYSIS_RESPONSE_SCHEMA on the server for analysis calls.
            // The schema enforces "analysis" (10 ## sections) and "frameworks" (5 keys)
            // which Gemini otherwise replaces with custom fields like forensic_flags.
            analysis_schema: analysisMode ? true : undefined,
            messages: prepared,
          }),
          signal: controller.signal,
        });

        const data = await parseApiResponse(response);

        // Server signaliserte at Gemini returnerte ufullstendig svar (t.d. manglande options
        // eller ugyldig JSON som ikkje kan parses). Prøv automatisk på nytt i staden for å
        // vise feil til brukaren. Begge 502-stiane i gemini.js set retry:true for å utløyse dette.
        if (response.status === 502 && data?.retry === true) {
          console.log("[DIAG] 502+retry signal mottatt. retriesLeft=", retriesLeft, "| error=", data?.error);
          if (retriesLeft > 0) {
            console.log("[DIAG] Starter retry. retriesLeft etter:", retriesLeft - 1);

            // For incomplete_response (missing options): retry WITHOUT appending a
            // retry message. The incompleteOptionsRetry message contains JSON examples
            // with escaped quotes that cause Gemini to exit JSON-schema mode and output
            // unparseable text on the next attempt. The server already handles schema
            // enforcement; passing retry_attempt signals it to use temperature=0.
            //
            // For invalid_json: append invalidJsonRetry which explicitly tells Gemini
            // to output plain JSON with no surrounding text — this is the most common
            // cause of parse failure and the message targets it precisely.
            if (data?.error === "incomplete_response") {
              return requestOnce(
                apiMessages,
                retriesLeft - 1,
                "incomplete",
                retryAttempt + 1
              );
            } else {
              return requestOnce(
                [
                  ...apiMessages,
                  { role: "user", content: apiT(locale, "api.invalidJsonRetry") },
                ],
                retriesLeft - 1,
                "json",
                retryAttempt + 1
              );
            }
          } else {
            console.log("[DIAG] Alle retries brukt opp – kaster feil til bruker.");
          }
        }

        // TILTAK 2 (klientsiden): 413 = serveren slo fast at analysen ble trunkert
        // (MAX_TOKENS). Prøv på nytt med truncatedRetry-melding i stedet for å kaste.
        if (response.status === 413 && data?.retry === true) {
          console.warn("[TRUNKERT] 413 MAX_TOKENS – analyse trunkert, retry igjen:", retriesLeft - 1);
          if (retriesLeft > 0) {
            return requestOnce(
              [...apiMessages, { role: "user", content: apiT(locale, "api.truncatedRetry") }],
              retriesLeft - 1,
              "truncated",
              retryAttempt + 1
            );
          }
          if (analysisMode && data?.partial) {
            console.warn("[RECOVERY] Bruker delvis parset JSON fra server etter 413.");
            return data.partial;
          }
        }

        if (!response.ok) {
          const msg =
            (typeof data?.error === "string" ? data.error : data?.error?.message) ||
            `HTTP ${response.status}`;
          throw new Error(`Backend error: ${msg}`);
        }

        const text = data.content?.find((b) => b.type === "text")?.text || "";
        if (!text.trim()) throw new Error("Empty response from analyst");

        // [DIAG] Logger råteksten frå Gemini før parsing
        console.log("[DIAG] RAW Gemini text (length=" + text.length + "):", text);

        // TILTAK 1: Tidlig retry for trunkerte analyseresponser.
        // repairJson/parseLlmJson aksepterer avkortet JSON ved å lukke {}-par,
        // men analyseteksten blir avskåret midt i en setning. Kast her og trigger
        // retry i stedet for å sende en halvferdig analyse til brukeren.
        // Defence-in-depth: dekker tilfeller der serveren returnerer 200 med
        // truncated:true (f.eks. eldre versjon før Tiltak 2 ble deployet).
        const isTruncated = data?.truncated === true || data?.finishReason === "MAX_TOKENS";
        if (isTruncated && analysisMode) {
          console.error(
            "[TRUNKERT] Analyse-respons trunkert. Råtekst-lengde:", text.length,
            "– siste 300 tegn:", text.slice(-300)
          );
          if (retriesLeft > 0) {
            return requestOnce(
              [...apiMessages, { role: "user", content: apiT(locale, "api.truncatedRetry") }],
              retriesLeft - 1,
              "truncated",
              retryAttempt + 1
            );
          }
          console.warn("[RECOVERY] Analysen ble avkortet etter alle forsøk. Bruker tilgjengelig råtekst.");
          return {
            type: "analysis",
            analysis: text,
            short_summary: "Klinisk rapport (delvis avkortet)",
            overall_insight: "Rapporten ble avkortet pga. lengdebegrensning, men tilgjengelig tekst er bevart.",
            key_themes: [],
            conflicts: [],
            clinical_followup: "",
            frameworks: null
          };
        }

        const tryParse = () => parseLlmJson(text);

        try {
          const parsed = tryParse();
          // [DIAG] Logger det parsede spørsmålsobjektet etter parsing
          console.log("[DIAG] Parsed result:", JSON.stringify(parsed, null, 2));
          return parsed;
        } catch (parseErr) {
          if (retriesLeft <= 0) {
            if (analysisMode) {
              console.warn("[RECOVERY] Kunne ikke parse analyse-JSON etter alle forsøk. Bruker råtekst.");
              return {
                type: "analysis",
                analysis: text,
                short_summary: "Klinisk rapport (råtekst)",
                overall_insight: "Rapporten ble gjenopprettet fra råtekst på grunn av en formateringsfeil.",
                key_themes: [],
                conflicts: [],
                clinical_followup: "",
                frameworks: null
              };
            }
            throw parseErr;
          }
          const isTruncated =
            data?.truncated || data?.finishReason === "MAX_TOKENS";
          const retryKey = isTruncated
            ? "api.truncatedRetry"
            : /Unterminated string|Unexpected end of JSON/i.test(
                  String(parseErr?.message || "")
                )
              ? "api.invalidJsonRetry"
              : "api.invalidJsonRetry";
          return requestOnce(
            [
              ...apiMessages,
              {
                role: "user",
                content: apiT(locale, retryKey),
              },
            ],
            retriesLeft - 1,
            isTruncated ? "truncated" : "json"
          );
        }
      } catch (err) {
        const isTimeout =
          err?.name === "AbortError" ||
          /timed out|timeout/i.test(String(err?.message || ""));
        if (isTimeout) {
          throw new Error(t("errors.requestTimeout"));
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    return requestOnce(messages, 2);
  }, [locale, systemPrompt, t]);

  const finishAnalysis = useCallback(
    (analysisResult, historyToUse, rawResult, answersToUse = structuredAnswers) => {
      setConversationHistory([
        ...historyToUse,
        { role: "user", content: apiT(locale, "api.generateAnalysis") },
        { role: "assistant", content: JSON.stringify(rawResult) },
      ]);
      setAnalyzingStatus(t("analyzing.reportReady"));
      if (participant?.id) {
        markParticipantAnalysisComplete(participant.id, answersToUse.length);
      }
      setTimeout(() => {
        setAnalysis(analysisResult.analysis);
        setAnalysisData(analysisResult);
        setPhase("result");
        setAnalyzingStatus("");
      }, 1200);
    },
    [participant?.id, structuredAnswers, locale, t]
  );

  const applyMetaFromResult = useCallback(
    (result) => {
      const meta = applyQuestionMeta(
        { coveredCategoryIds, analysisReady, readinessNote },
        result
      );
      setCoveredCategoryIds(meta.coveredCategoryIds);
      setAnalysisReady(meta.analysisReady);
      setReadinessNote(meta.readinessNote);
    },
    [coveredCategoryIds, analysisReady, readinessNote]
  );

  const triggerAnalysis = useCallback(
    async (historyToUse, answersToUse = structuredAnswers) => {
      clearError();
      setIsLoading(true);
      setOpinion("");
      setPhase("analyzing");
      // Single-step analysis: skip step1 (which conflicted with the analysis system
      // prompt and produced corrupted summaries). Go directly to the full analysis
      // call with ANALYSIS_RESPONSE_SCHEMA enforcing "analysis" and "frameworks".
      setAnalyzingStatus(t("analyzing.step2"));
      try {
        let result = await callClaude(
          buildDirectAnalysisMessages(answersToUse, historyToUse, participant, locale),
          // 6000 tokens: 13 ## sections (Observasjon/Tolkning/Usikkerhet) + 5 frameworks
          // fits comfortably in ~4000-5500 tokens. Cap at 6000 to stay well within
          // Netlify Pro's 26-second function timeout. 8192 caused 504s with the
          // expanded system prompt (Winnicott/Kohut/Bion + 3 new sections).
          { structuredAnswers: answersToUse, maxTokens: 6000, skipPrepare: true, analysisMode: true, participant }
        );
        let analysisResult = normalizeAnalysis(result);
        if (!analysisResult.analysis) {
          const retry = await callClaude(
            [
              ...buildDirectAnalysisMessages(answersToUse, historyToUse, participant, locale),
              { role: "assistant", content: JSON.stringify(result) },
              {
                role: "user",
                content: apiT(locale, "api.analysisRetry"),
              },
            ],
            { structuredAnswers: answersToUse, maxTokens: 6000, skipPrepare: true, analysisMode: true, participant }
          );
          result = retry;
          analysisResult = normalizeAnalysis(retry);
        }
        if (analysisResult.analysis) {
          finishAnalysis(analysisResult, historyToUse, result, answersToUse);
        } else {
          setPhase("questions");
          setError(t("errors.analysisNotGenerated"));
        }
      } catch (e) {
        console.error(e);
        setPhase("questions");
        const msg = e?.message?.includes("timed out")
          ? t("errors.analysisTimeout")
          : e?.message || t("errors.analysisFailed");
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [callClaude, structuredAnswers, finishAnalysis, participant, locale, t]
  );

  const resetSessionState = () => {
    setConversationHistory([]);
    setStructuredAnswers([]);
    setCoveredCategoryIds([]);
    setAnalysisReady(false);
    setReadinessNote("");
    setCurrentQuestion("");
    setCurrentCategory("");
    setCurrentOptions([]);
    setQuestionNumber(0);
    setAnalysis("");
    setAnalysisData(null);
    setOpinion("");
    setMetaUsageCount(0);
    setAnalyzingStatus("");
  };

  const startAnalysis = useCallback(async (participantInfo, consent = false) => {
    const check = validateParticipant(participantInfo, locale);
    if (!check.valid) {
      setError(t("errors.fillParticipant"));
      return;
    }
    if (!consent) {
      setError(t("errors.consentRequired"));
      return;
    }
    clearState();
    resetSessionState();
    clearError();
    setIsLoading(true);
    setPhase("intro");
    try {
      const saved = await saveParticipantToServer(check.normalized, { consent: true });
      setParticipant({ ...saved.participant, id: saved.id });
      setPhase("questions");
      const ctx = buildParticipantContext(saved.participant, locale);
      const initMessages = [
        {
          role: "user",
          content: `${ctx}\n\n${apiT(locale, "api.startSession", { max: MAX_QUESTIONS })}`,
        },
      ];
      const result = await callClaude(initMessages, {
        participant: saved.participant,
        skipPrepare: true,
        jsonMode: true,
        maxTokens: 1024,
      });
      if (result.type === "question" && result.question) {
        setCurrentQuestion(result.question);
        setCurrentCategory(result.category || "");
        setCurrentOptions(result.options || []);
        setQuestionNumber(result.questionNumber || 1);
        applyMetaFromResult(result);
        setConversationHistory([
          { role: "user", content: initMessages[0].content },
          { role: "assistant", content: JSON.stringify(result) },
        ]);
      } else {
        setError(t("errors.startFailed"));
      }
    } catch (e) {
      console.error(e);
      setPhase("intro");
      setError(
        e?.message?.includes("Lagring")
          ? e.message
          : e?.message || t("errors.startNetwork")
      );
    }
    setIsLoading(false);
  }, [callClaude, applyMetaFromResult, locale, t]);

  const submitAnswer = useCallback(
    async (answerText, isCustom = false) => {
      // TILTAK 3: Lås mot ny innsending når analysen allerede er i gang.
      // Dekker race-condition der bruker klikker mens auto-trigger er i fly.
      if (phase === "ready_for_analysis" || phase === "analyzing" || phase === "result") return;
      clearError();
      setIsLoading(true);
      setOpinion("");

      const entry = createAnswerEntry({
        index: questionNumber,
        question: currentQuestion,
        category: currentCategory,
        answer: answerText,
        isCustom,
      });
      const nextStructured = recordAnswer(structuredAnswers, entry);
      setStructuredAnswers(nextStructured);

      let messageContent =
        buildAnswerUserMessage(questionNumber, currentCategory, answerText, locale) +
        "\n\n" +
        buildQuestionContextMessage(questionNumber, locale);

      let callOptions = {
        structuredAnswers: nextStructured,
        participant,
        jsonMode: true,
        maxTokens: 1024,
      };

      if (mustForceAnalysis(questionNumber)) {
        messageContent += `\n\n${apiT(locale, "api.forceAnalysis", { n: questionNumber, max: MAX_QUESTIONS })}`;
        // When forcing analysis at max questions, do NOT use question schema.
        // Let the model return the analysis JSON as instructed in the force prompt.
        callOptions.jsonMode = false;
      }

      const newHistory = [...conversationHistory, { role: "user", content: messageContent }];

      // For the final answer at max questions, short-circuit directly to the dedicated
      // analysis flow instead of trying another LLM call with the force prompt.
      // This avoids the heavy call that often times out near 50 questions.
      if (mustForceAnalysis(questionNumber)) {
        setConversationHistory(newHistory);
        await triggerAnalysis(newHistory, nextStructured);
        return;
      }

      try {
        const result = await callClaude(newHistory, callOptions);

        // Gemini signalled analysis_ready without providing question options.
        // Honour its intent by triggering the analysis flow directly.
        if (result?.type === "auto_analysis_trigger") {
          setConversationHistory(newHistory);
          await triggerAnalysis(newHistory, nextStructured);
          return;
        }

        const analysisResult = normalizeAnalysis(result);
        const updatedHistory = [
          ...newHistory,
          { role: "assistant", content: JSON.stringify(result) },
        ];
        applyMetaFromResult(result);

        if (analysisResult.analysis) {
          setPhase("analyzing");
          finishAnalysis(analysisResult, updatedHistory, result, nextStructured);
          return;
        }

        if (result.type === "question" && result.question) {
          // Auto-trigger analysis as soon as LLM signals readiness, instead of
          // waiting for the user to click "FÅ ANALYSEN NÅ".
          if (
            result.analysis_ready &&
            canSuggestAnalysis(questionNumber, result.analysis_ready)
          ) {
            // TILTAK 3: Sett "ready_for_analysis" SYNKRONT før await
            // slik at UI-et låses umiddelbart og nye svar ikke kan sendes
            // inn mens analysen er i flyt. triggerAnalysis overstyrer med
            // "analyzing" med en gang den starter.
            setPhase("ready_for_analysis");
            setConversationHistory(updatedHistory);
            await triggerAnalysis(updatedHistory, nextStructured);
            return;
          }
          // Fallback: if the model returned the exact same question again
          // (loop/degenerate), force analysis to avoid an infinite cycle.
          if (
            result.question === currentQuestion &&
            canSuggestAnalysis(questionNumber, true)
          ) {
            setPhase("ready_for_analysis");
            setConversationHistory(updatedHistory);
            await triggerAnalysis(updatedHistory, nextStructured);
            return;
          }
          const nextNum = result.questionNumber || questionNumber + 1;
          if (nextNum > MAX_QUESTIONS) {
            await triggerAnalysis(updatedHistory, nextStructured);
            return;
          }
          setConversationHistory(updatedHistory);
          setCurrentQuestion(result.question);
          setCurrentCategory(result.category || "");
          setCurrentOptions(result.options || []);
          setQuestionNumber(nextNum);
        } else {
          setConversationHistory(updatedHistory);
          setError(t("errors.unexpectedResponse"));
        }
      } catch (e) {
        console.error(e);
        const detail = e?.message || "";
        setError(
          /timed out|timeout/i.test(detail)
            ? t("errors.requestTimeout")
            : detail.includes("JSON") || detail.includes("lese svar")
              ? detail.startsWith("Kunne ikke") || detail.startsWith("Could not")
                ? detail
                : t("errors.couldNotRead", { detail })
              : detail || t("errors.fetchFailed")
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      phase,
      conversationHistory,
      structuredAnswers,
      callClaude,
      questionNumber,
      currentQuestion,
      currentCategory,
      triggerAnalysis,
      applyMetaFromResult,
      finishAnalysis,
      participant,
      locale,
      t,
    ]
  );

  const handleAnswer = useCallback((answer) => submitAnswer(answer, false), [submitAnswer]);
  const handleCustomAnswer = useCallback(
    (text) => submitAnswer(text, true),
    [submitAnswer]
  );

  const handleAskOpinion = useCallback(
    async (userQuestion) => {
      if (metaUsageCount >= META_CALL_LIMIT) {
        setAskError(t("errors.metaLimit", { limit: META_CALL_LIMIT }));
        return;
      }
      clearError();
      setAskError("");
      setIsLoading(true);
      setMetaUsageCount((c) => c + 1);
      const askMessage = apiT(locale, "api.metaOpinion", { q: userQuestion });
      const tempHistory = [...conversationHistory, { role: "user", content: askMessage }];
      try {
        const result = await callClaude(tempHistory, { structuredAnswers, participant });
        const text = result?.opinion || result?.text || result?.message;
        if (text && result?.type !== "question") {
          setOpinion(String(text));
        } else {
          setAskError(t("errors.opinionFailed"));
        }
      } catch (e) {
        console.error(e);
        setAskError(e?.message || t("errors.generateFailed"));
      }
      setIsLoading(false);
    },
    [conversationHistory, callClaude, metaUsageCount, structuredAnswers, participant, locale, t]
  );

  const handleRephrase = useCallback(async () => {
    if (metaUsageCount >= META_CALL_LIMIT) return;
    clearError();
    setIsLoading(true);
    setOpinion("");
    setMetaUsageCount((c) => c + 1);
    const askMessage = apiT(locale, "api.metaRephrase", { n: questionNumber });
    const tempHistory = [...conversationHistory, { role: "user", content: askMessage }];
    try {
      const result = await callClaude(tempHistory, { structuredAnswers, participant });
      applyMetaFromResult(result);
      if (result.type === "rephrase" || result.type === "question") {
        setCurrentQuestion(result.question);
        setCurrentOptions(result.options || []);
        if (result.category) setCurrentCategory(result.category);
      }
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  }, [
    conversationHistory,
    callClaude,
    questionNumber,
    metaUsageCount,
    applyMetaFromResult,
    structuredAnswers,
    locale,
  ]);

  const resumeSession = () => {
    clearError();
    const saved = loadState();
    setPhase(saved?.phase === "result" ? "result" : "questions");
  };

  const discardAndStart = () => {
    clearState();
    resetSessionState();
    setParticipant(EMPTY_PARTICIPANT);
    clearError();
    setPhase("intro");
  };

  const restart = () => {
    clearState();
    clearError();
    resetSessionState();
    setParticipant(EMPTY_PARTICIPANT);
    setPhase("intro");
  };

  return (
    <div className="app-root">
      <ParticleField mode="partikler" intensity={1} />
      <BrandHeader
        onLogo={() => setPhase("landing")}
        right={
          phase === "landing" ? (
            <button className="kk-btn-ghost" style={{ padding: "9px 18px", fontSize: 11 }} onClick={() => setPhase("intro")}>
              START&ensp;▸
            </button>
          ) : (
            <span className="kk-label">{({
              intro: "Registrering",
              questions: "Datainnsamling",
              ready_for_analysis: "Datainnsamling",
              analyzing: "Analyse",
              result: "Rapport",
            })[phase] || ""}</span>
          )
        }
      />
      {phase === "landing" && <Landing onStart={() => { setPhase("intro"); window.scrollTo(0, 0); }} />}
      {phase === "intro" && (
        <IntroScreen
          onStart={startAnalysis}
          savedSession={savedSession}
          onResume={resumeSession}
          onDiscard={discardAndStart}
          initialParticipant={participant?.name ? participant : null}
          isStarting={isLoading && phase === "intro"}
        />
      )}
      {phase === "questions" && (
        <QuestionScreen
          question={currentQuestion}
          category={currentCategory}
          options={currentOptions}
          questionNumber={questionNumber}
          maxQuestions={MAX_QUESTIONS}
          coveredCategoryIds={coveredCategoryIds}
          analysisReady={analysisReady}
          readinessNote={readinessNote}
          onAnswer={handleAnswer}
          onCustomAnswer={handleCustomAnswer}
          onAskOpinion={handleAskOpinion}
          onRephrase={handleRephrase}
          onForceAnalysis={() => triggerAnalysis(conversationHistory)}
          isLoading={isLoading}
          opinion={opinion}
          onCloseOpinion={() => setOpinion("")}
          askError={askError}
          onClearAskError={() => setAskError("")}
          error={error}
          onClearError={clearError}
          metaRemaining={metaRemaining}
        />
      )}
      {phase === "ready_for_analysis" && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", minHeight: "70vh", gap: 20,
        }}>
          <div style={{
            fontSize: 10, letterSpacing: 4, color: "var(--accent)",
            fontFamily: "var(--mono)", textTransform: "uppercase",
          }}>
            Analyseberedskap nådd
          </div>
          <div style={{
            fontSize: 11, letterSpacing: 2, color: "var(--dim)",
            fontFamily: "var(--mono)",
          }}>
            Starter analyse…
          </div>
        </div>
      )}
      {phase === "analyzing" && (
        <AnalyzingScreen
          error={error}
          onClearError={clearError}
          onForceAnalysis={() => triggerAnalysis(conversationHistory)}
          analyzingStatus={analyzingStatus}
          answerCount={structuredAnswers.length}
        />
      )}
      {phase === "result" && (
        <AnalysisScreen
          analysis={analysis}
          analysisData={analysisData}
          structuredAnswers={structuredAnswers}
          participant={participant?.name ? participant : null}
          onRestart={restart}
        />
      )}
    </div>
  );
}
