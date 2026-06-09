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
  buildStep1Messages,
  buildStep2Messages,
  prepareMessagesForApi,
  getSavedSessionSummary,
  parseSectionBlocks,
} from "./sessionHelpers.js";
import { BrandWatermark, BrandHeader, BrandFooter, IntroBrandMark } from "./BrandChrome.jsx";
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
  const { t, brand, locale, frameworkList } = useI18n();
  const [glitch, setGlitch] = useState(false);
  const [name, setName] = useState(initialParticipant?.name || "");
  const [age, setAge] = useState(
    initialParticipant?.age != null ? String(initialParticipant.age) : ""
  );
  const [email, setEmail] = useState(initialParticipant?.email || "");
  const [consent, setConsent] = useState(Boolean(initialParticipant?.id));
  const [touched, setTouched] = useState(false);

  const validation = validateParticipant({ name, age, email }, locale);
  const canStart = validation.valid && consent;

  useEffect(() => {
    const t = setInterval(() => { setGlitch(true); setTimeout(() => setGlitch(false), 500); }, 4000);
    return () => clearInterval(t);
  }, []);

  const handleStart = () => {
    setTouched(true);
    if (!canStart) return;
    onStart(validation.normalized, consent);
  };

  return (
    <div className="layout-shell layout-shell--intro" style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 32, textAlign: "center", width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
      <div style={{ position: "absolute", top: 16, left: 16, zIndex: 10, pointerEvents: "auto" }}>
        <LanguageSwitcher />
      </div>
      <IntroBrandMark />
      <div className="type-mono-sm" style={{ marginBottom: 16, fontSize: 11, letterSpacing: 4, color: "var(--accent-dim)", fontFamily: "var(--mono)" }}>
        {t("intro.version")}
      </div>
      <h1 className="type-display-title" style={{ fontSize: "clamp(2rem, 6vw, 4rem)", fontFamily: "var(--display)", fontWeight: 900, letterSpacing: -2, lineHeight: 1, marginBottom: 8, color: "var(--fg)" }}>
        <GlitchText text={t("intro.titleLine1")} active={glitch} /><br />
        <span style={{ color: "var(--accent)" }}>
          <GlitchText text={t("intro.titleLine2")} active={glitch} />
        </span>
      </h1>
      <div style={{ width: 60, height: 1, background: "var(--accent)", margin: "24px auto", boxShadow: "0 0 10px var(--accent)" }} />
      <p className="layout-narrow type-body-sm" style={{ maxWidth: 480, width: "100%", color: "var(--dim)", fontSize: 13, lineHeight: 1.8, marginBottom: 8, fontFamily: "var(--mono)" }}>
        {brand.tagline}<br />
        {t("brand.developedBy", { company: brand.company, product: brand.product })}
      </p>
      <p className="layout-narrow type-mono-sm" style={{ maxWidth: 480, width: "100%", color: "var(--dim-2)", fontSize: 11, lineHeight: 1.8, marginBottom: 16, fontFamily: "var(--mono)" }}>
        {t("intro.hint")}
      </p>

      <div className="layout-narrow" style={{ maxWidth: 420, width: "100%", marginBottom: 32, textAlign: "left" }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--accent)", fontFamily: "var(--mono)", marginBottom: 12 }}>
          {t("intro.beforeStart")}
        </div>
        <label style={{ display: "block", fontSize: 10, color: "var(--dim-2)", fontFamily: "var(--mono)", letterSpacing: 1, marginBottom: 6 }}>
          {t("intro.name")}
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder={t("intro.namePlaceholder")}
          className="type-intro-field"
          style={{ ...introFieldStyle, marginBottom: touched && validation.errors.name ? 4 : 12 }}
        />
        {touched && validation.errors.name && (
          <p style={{ fontSize: 10, color: "#f87171", fontFamily: "var(--mono)", marginBottom: 12 }}>{validation.errors.name}</p>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 10, color: "var(--dim-2)", fontFamily: "var(--mono)", letterSpacing: 1, marginBottom: 6 }}>
              {t("intro.age")}
            </label>
            <input
              type="number"
              min={MIN_PARTICIPANT_AGE}
              max={MAX_PARTICIPANT_AGE}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder={`${MIN_PARTICIPANT_AGE}–${MAX_PARTICIPANT_AGE}`}
              className="type-intro-field"
              style={{ ...introFieldStyle, marginBottom: touched && validation.errors.age ? 4 : 0 }}
            />
            {touched && validation.errors.age && (
              <p style={{ fontSize: 10, color: "#f87171", fontFamily: "var(--mono)", marginTop: 4 }}>{validation.errors.age}</p>
            )}
          </div>
          <div>
            <label style={{ display: "block", fontSize: 10, color: "var(--dim-2)", fontFamily: "var(--mono)", letterSpacing: 1, marginBottom: 6 }}>
              {t("intro.email")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder={t("intro.emailPlaceholder")}
              className="type-intro-field"
              style={{ ...introFieldStyle, marginBottom: touched && validation.errors.email ? 4 : 0 }}
            />
            {touched && validation.errors.email && (
              <p style={{ fontSize: 10, color: "#f87171", fontFamily: "var(--mono)", marginTop: 4 }}>{validation.errors.email}</p>
            )}
          </div>
        </div>
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            marginTop: 16,
            cursor: "pointer",
            fontSize: 11,
            color: "var(--dim)",
            fontFamily: "var(--mono)",
            lineHeight: 1.6,
          }}
        >
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            style={{ marginTop: 3, accentColor: "var(--accent)" }}
          />
          <ConsentDetails />
        </label>
        {touched && !consent && (
          <p style={{ fontSize: 10, color: "#f87171", fontFamily: "var(--mono)", marginTop: 8 }}>
            {t("consent.required")}
          </p>
        )}
      </div>

      <details style={{ maxWidth: 480, width: "100%", marginBottom: 32, textAlign: "left" }}>
        <summary style={{ fontSize: 10, letterSpacing: 2, color: "var(--dim)", fontFamily: "var(--mono)", cursor: "pointer" }}>
          {t("intro.questionsFromTitle")}
        </summary>
        <p style={{ marginTop: 12, fontSize: 11, color: "var(--dim-2)", fontFamily: "var(--mono)", lineHeight: 1.7 }}>
          {t("intro.questionsFromBody", { minQ: MIN_QUESTIONS_SUGGEST, maxQ: MAX_QUESTIONS })}
        </p>
      </details>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, maxWidth: 480, width: "100%", marginBottom: 48 }}>
        {(frameworkList || []).map(f => (
          <div key={f} style={{ padding: "8px 4px", border: "1px solid var(--border)", fontSize: 10, color: "var(--dim)", letterSpacing: 1, textAlign: "center", fontFamily: "var(--mono)" }}>
            {f.toUpperCase()}
          </div>
        ))}
      </div>

      {savedSession && (
        <div style={{ maxWidth: 480, width: "100%", marginBottom: 24, padding: 16, border: "1px solid var(--accent-dim)", background: "rgba(129,140,248,0.05)" }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--accent)", fontFamily: "var(--mono)", marginBottom: 8 }}>
            {t("intro.savedSessionTitle")}
          </div>
          <p style={{ fontSize: 12, color: "var(--fg-soft)", fontFamily: "var(--mono)", marginBottom: 12, lineHeight: 1.6 }}>
            {t("intro.savedSessionBody", {
              n: savedSession.questionNumber,
              covered: savedSession.covered,
              total: savedSession.totalCategories,
            })}
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={onResume} style={{ ...btnSmall, borderColor: "var(--accent)", color: "var(--accent)" }}>{t("intro.continue")}</button>
            <button onClick={onDiscard} style={btnSmall}>{t("intro.startFresh")}</button>
          </div>
        </div>
      )}

      <button
        onClick={handleStart}
        disabled={!canStart || isStarting}
        style={{
        background: "transparent", border: "1px solid var(--accent)", color: "var(--accent)",
        padding: "14px 40px", fontSize: 12, letterSpacing: 3, cursor: canStart && !isStarting ? "pointer" : "not-allowed",
        fontFamily: "var(--mono)", transition: "all 0.2s", textTransform: "uppercase",
        opacity: canStart && !isStarting ? 1 : 0.45,
      }}
        onMouseEnter={e => { if (!canStart || isStarting) return; e.target.style.background = "var(--accent)"; e.target.style.color = "#000"; }}
        onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "var(--accent)"; }}
      >
        {isStarting ? t("intro.saving") : savedSession ? t("intro.newAnalysis") : t("intro.start")}
      </button>

      <div className="layout-narrow" style={{ maxWidth: 480, width: "100%", marginTop: 24 }}>
        <EstimatedTimeNote />
        <CrisisHelpBox compact />
        <ContactRosten style={{ marginBottom: 12 }} />
        <p style={{ fontSize: 10, color: "var(--dim-2)", fontFamily: "var(--mono)", letterSpacing: 1, lineHeight: 1.6 }}>
          {t("intro.disclaimer", { maxQ: MAX_QUESTIONS })}
        </p>
      </div>
    </div>
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
    <div className="layout-shell layout-shell--question" style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", boxSizing: "border-box" }}>
      <div style={{ marginBottom: 16 }}>
        <LanguageSwitcher compact />
      </div>
      <ProgressBar current={questionNumber} maxQuestions={maxQuestions} coveredCategoryIds={coveredCategoryIds} />
      <CrisisHelpBox compact style={{ marginBottom: 20 }} />
      <CategoryProgress coveredCategoryIds={coveredCategoryIds} analysisReady={analysisReady} readinessNote={readinessNote} />

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "var(--accent)", fontFamily: "var(--mono)", padding: "3px 8px", border: "1px solid var(--accent-dim)" }}>
            {category ? category.toUpperCase() : t("question.categoryFallback")}
          </div>
          <div style={{ fontSize: 10, color: "var(--dim-2)", fontFamily: "var(--mono)", letterSpacing: 2 }}>
            {t("question.questionShort")} {questionNumber}
          </div>
        </div>

        <div className="type-question-text" style={{ fontSize: "clamp(15px, 2.5vw, 18px)", lineHeight: 1.7, color: "var(--fg-soft)", fontFamily: "var(--body)", minHeight: 60 }}>
          {isLoading && !question ? (
            <span style={{ color: "var(--accent)", fontFamily: "var(--mono)", fontSize: 13, letterSpacing: 0.5 }}>
              {processingLabel}
            </span>
          ) : skipTypewriter ? (
            <span>{question}</span>
          ) : (
            <Typewriter text={question} speed={16} onDone={() => setQuestionReady(true)} />
          )}
        </div>
        {isLoading && question && (
          <p
            style={{
              marginTop: 12,
              fontFamily: "var(--mono)",
              fontSize: 12,
              color: "var(--accent)",
              letterSpacing: 0.5,
              lineHeight: 1.6,
              animation: "blink 1.2s infinite",
            }}
          >
            {processingLabel}
          </p>
        )}
        {question && !questionReady && !isLoading && (
          <button type="button" onClick={() => { setSkipTypewriter(true); setQuestionReady(true); }} style={{ ...btnSmall, marginTop: 8, fontSize: 10 }}>
            {t("question.showFull")}
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, opacity: questionReady && !isLoading ? 1 : 0.4, transition: "opacity 0.3s" }}>
        {options && options.map((opt, i) => (
          <button
            key={i}
            onClick={() => questionReady && !isLoading && onAnswer(opt)}
            disabled={!questionReady || isLoading}
            onMouseEnter={() => setHoveredOption(i)}
            onMouseLeave={() => setHoveredOption(null)}
            className="type-option-btn"
            style={{
              textAlign: "left",
              background: hoveredOption === i ? "rgba(129,140,248,0.08)" : "var(--surface)",
              border: hoveredOption === i ? "1px solid var(--accent)" : "1px solid var(--border)",
              color: "var(--fg-soft)", padding: "14px 16px",
              fontFamily: "var(--body)", fontSize: 14, lineHeight: 1.5,
              cursor: questionReady && !isLoading ? "pointer" : "default",
              transition: "all 0.15s", display: "flex", alignItems: "flex-start", gap: 12,
            }}
          >
            <span style={{
              fontSize: 10, fontFamily: "var(--mono)",
              color: hoveredOption === i ? "var(--accent)" : "var(--dim-2)",
              letterSpacing: 1, marginTop: 3, minWidth: 16, transition: "color 0.15s"
            }}>
              {String.fromCharCode(65 + i)}
            </span>
            <span style={{ flex: 1 }}>{opt}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => questionReady && !isLoading && setCustomMode(true)}
          disabled={!questionReady || isLoading}
          style={{
            textAlign: "left",
            background: "var(--surface)",
            border: "1px dashed var(--border)",
            color: "var(--dim)",
            padding: "14px 16px",
            fontFamily: "var(--mono)",
            fontSize: 12,
            cursor: questionReady && !isLoading ? "pointer" : "default",
          }}
        >
          {t("question.customOption")}
        </button>
      </div>

      {customMode && (
        <div style={{ marginTop: 12, padding: 14, border: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--dim)", fontFamily: "var(--mono)", marginBottom: 8 }}>{t("question.customTitle")}</div>
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            rows={3}
            placeholder={t("question.customPlaceholder")}
            style={{ width: "100%", boxSizing: "border-box", background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg)", padding: 10, fontFamily: "var(--body)", fontSize: 13, resize: "vertical" }}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" onClick={() => setCustomMode(false)} style={{ ...btnSmall, fontSize: 10 }}>{t("question.cancel")}</button>
            <button type="button" onClick={submitCustom} disabled={customText.trim().length < 3 || isLoading} style={{ ...btnSmall, borderColor: "var(--accent)", color: "var(--accent)", fontSize: 10 }}>{t("question.sendAnswer")}</button>
          </div>
        </div>
      )}

      <AskBox onAskOpinion={onAskOpinion} onRephrase={onRephrase} isLoading={isLoading} opinion={opinion} onCloseOpinion={onCloseOpinion} askError={askError} onClearAskError={onClearAskError} metaRemaining={metaRemaining} />

      {error && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #f87171", background: "rgba(248,113,113,0.08)", color: "#fecaca", fontFamily: "var(--mono)", fontSize: 12 }}>
          {error}
          <button onClick={() => { onClearError?.(); onForceAnalysis?.(); }} style={{ marginLeft: 12, background: "transparent", border: "1px solid #f87171", color: "#fecaca", padding: "2px 8px", cursor: "pointer" }}>
            {t("question.retryAnalysis")}
          </button>
        </div>
      )}

      {showAnalysisButton && !isLoading && (
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px dashed var(--border)", textAlign: "center" }}>
          <p style={{ fontSize: 11, color: analysisReady ? "var(--accent)" : "var(--dim)", fontFamily: "var(--mono)", marginBottom: 12, letterSpacing: 1 }}>
            {analysisReady
              ? t("question.readyForAnalysis")
              : t("question.canRequestAnalysis", { min: MIN_QUESTIONS_SUGGEST })}
          </p>
          <button onClick={onForceAnalysis} style={{
            background: "transparent", border: "1px solid var(--accent)", color: "var(--accent)",
            padding: "10px 24px", fontSize: 11, letterSpacing: 2, cursor: "pointer",
            fontFamily: "var(--mono)", transition: "all 0.2s", textTransform: "uppercase"
          }}
            onMouseEnter={e => { e.target.style.background = "var(--accent)"; e.target.style.color = "#000"; }}
            onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "var(--accent)"; }}
          >
            {t("question.getAnalysisNow")}
          </button>
        </div>
      )}
    </div>
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
  const label = analyzingStatus || phases[phase];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 32 }}>
      <div style={{ width: 1, height: 60, background: "linear-gradient(to bottom, transparent, var(--accent))", marginBottom: 32 }} />
      <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: 3, color: "var(--accent)", marginBottom: 12, textAlign: "center" }}>
        {label}<span style={{ animation: "blink 0.8s infinite" }}>_</span>
      </div>
      {answerCount > 0 && (
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--dim)", marginBottom: 24 }}>
          {t("analyzing.processingAnswers", { count: answerCount })}
        </div>
      )}
      <div style={{ display: "flex", gap: 6 }}>
        {phases.map((_, i) => (
          <div key={i} style={{ width: 6, height: 6, background: i <= phase ? "var(--accent)" : "var(--border)", transition: "background 0.3s", boxShadow: i <= phase ? "0 0 6px var(--accent)" : "none" }} />
        ))}
      </div>

      {error && (
        <div style={{ marginTop: 32, maxWidth: 420, textAlign: "center", color: "#fecaca", fontFamily: "var(--mono)", fontSize: 12 }}>
          {error}
          <div style={{ marginTop: 12 }}>
            <button onClick={() => { onClearError?.(); onForceAnalysis?.(); }} style={{ background: "transparent", border: "1px solid #f87171", color: "#fecaca", padding: "6px 14px", cursor: "pointer" }}>
              {t("analyzing.retry")}
            </button>
          </div>
        </div>
      )}
    </div>
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

  const tabStyle = {
    background: "transparent",
    border: "1px solid var(--border)",
    color: "var(--dim)",
    padding: "8px 18px",
    fontSize: 11,
    letterSpacing: 1,
    cursor: "pointer",
    fontFamily: "var(--mono)",
    transition: "all 0.2s",
  };
  const activeTabStyle = {
    borderColor: "var(--accent)",
    color: "var(--accent)",
    background: "rgba(129,140,248,0.08)",
  };

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
    <div className="layout-shell layout-shell--report" style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px", opacity: visible ? 1 : 0, transition: "opacity 0.8s ease", width: "100%", boxSizing: "border-box" }}>
      <div style={{ textAlign: "center", marginBottom: 64 }}>
        <div style={{ fontSize: 10, letterSpacing: 4, color: "var(--accent)", fontFamily: "var(--mono)", marginBottom: 16 }}>
          {t("report.complete")}
        </div>
        <h2 style={{ fontFamily: "var(--display)", fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 900, letterSpacing: -1, color: "var(--fg)" }}>
          {t("report.titleLine1")}<br /><span style={{ color: "var(--accent)" }}>{t("report.titleLine2")}</span>
        </h2>
        <p style={{ marginTop: 12, fontSize: 11, color: "var(--dim)", fontFamily: "var(--mono)" }}>
          {brand.name} · {brand.product}
        </p>
        <div style={{ width: 40, height: 1, background: "var(--accent)", margin: "24px auto" }} />
      </div>

      <div style={{ marginBottom: 32, padding: 14, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 12, lineHeight: 1.7, color: "var(--dim)", fontFamily: "var(--mono)" }}>
        {t("report.disclaimer")}
      </div>

      {data?.short_summary && (
        <div style={{ marginBottom: 32, padding: 16, border: "1px solid var(--accent-dim)", background: "rgba(129,140,248,0.06)" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: 2, color: "var(--accent)", marginBottom: 10 }}>{t("report.shortSummary")}</div>
          <p style={{ color: "var(--fg-soft)", lineHeight: 1.8, fontSize: 14, fontFamily: "var(--body)" }}>{data.short_summary}</p>
          <button type="button" onClick={() => navigator.clipboard.writeText(data.short_summary)} style={{ ...btnSmall, marginTop: 12, fontSize: 10 }}>
            {t("report.copyShort")}
          </button>
        </div>
      )}

      {hasFrameworks && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setActiveTab("helhetsrapport")}
            style={{ ...tabStyle, ...(activeTab === "helhetsrapport" ? activeTabStyle : {}) }}
          >
            {t("report.tabFull")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rammeverk")}
            style={{ ...tabStyle, ...(activeTab === "rammeverk" ? activeTabStyle : {}) }}
          >
            {t("report.tabFrameworks")}
          </button>
        </div>
      )}

      {showHelhetsrapport && (
        <>
          {data?.overall_insight && (
            <div style={{ marginBottom: 40, padding: 16, background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: 2, color: "var(--accent)", marginBottom: 10 }}>
                {t("report.overallInsight")}
              </div>
              <div style={{ color: "var(--fg-soft)", lineHeight: 1.8, fontSize: 14, fontFamily: "var(--body)", whiteSpace: "pre-line" }}>
                {data.overall_insight}
              </div>
            </div>
          )}

          {data?.conflicts?.length > 0 && (
            <div style={{ marginBottom: 32, padding: 14, border: "1px solid var(--border)", background: "var(--surface)" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: 2, color: "var(--accent)", marginBottom: 8 }}>{t("report.conflicts")}</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: "var(--fg-soft)", fontSize: 13, lineHeight: 1.7, fontFamily: "var(--body)" }}>
                {data.conflicts.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}

          {data?.clinical_followup && (
            <div style={{ marginBottom: 40, padding: 16, border: "1px dashed var(--border)", background: "rgba(140,118,88,0.06)" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: 2, color: "var(--bronze, #8c7658)", marginBottom: 8 }}>{t("report.clinicalFollowup")}</div>
              <p style={{ color: "var(--fg-soft)", lineHeight: 1.8, fontSize: 14, fontFamily: "var(--body)", margin: 0 }}>{data.clinical_followup}</p>
            </div>
          )}

          {data?.key_themes?.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: 2, color: "var(--accent)", marginBottom: 12 }}>
                {t("report.keyThemes")}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {data.key_themes.map((theme, i) => (
                  <span key={i} style={{
                    fontSize: 12, fontFamily: "var(--mono)", padding: "6px 10px",
                    border: "1px solid var(--border)", color: "var(--fg-soft)", background: "var(--surface)"
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
                <div key={i} style={{ marginBottom: 48, paddingBottom: 48, borderBottom: i < sections.length - 1 ? "1px solid var(--border)" : "none" }}>
                  {s.title && (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                      <div style={{ width: 3, height: 20, background: "var(--accent)", flexShrink: 0 }} />
                      <h3 style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: 2, color: "var(--accent)", fontWeight: 400 }}>
                        {s.title.toUpperCase()}
                      </h3>
                    </div>
                  )}
                  {s.observation || s.interpretation || s.uncertainty ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {s.observation && (
                        <div><span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--accent)" }}>{t("report.observation")}</span><span style={{ color: "var(--fg-soft)", fontSize: 14, lineHeight: 1.8, fontFamily: "var(--body)" }}>{s.observation}</span></div>
                      )}
                      {s.interpretation && (
                        <div><span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--dim)" }}>{t("report.interpretation")}</span><span style={{ color: "var(--fg-soft)", fontSize: 14, lineHeight: 1.8, fontFamily: "var(--body)" }}>{s.interpretation}</span></div>
                      )}
                      {s.uncertainty && (
                        <div><span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--dim-2)" }}>{t("report.uncertainty")}</span><span style={{ color: "var(--dim)", fontSize: 13, lineHeight: 1.7, fontFamily: "var(--body)" }}>{s.uncertainty}</span></div>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: "var(--fg-soft)", lineHeight: 1.9, fontSize: 14, fontFamily: "var(--body)", whiteSpace: "pre-line" }}>
                      {s.raw || t("report.noSectionContent")}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ color: "var(--fg-soft)", lineHeight: 1.8, fontSize: 14, fontFamily: "var(--body)", marginBottom: 32 }}>
                {t("report.missingSections")}
              </div>
            )
          ) : (
            <div style={{ color: "#fecaca", marginBottom: 32 }}>{t("report.noReportText")}</div>
          )}
        </>
      )}

      {activeTab === "rammeverk" && hasFrameworks && (
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 3, height: 20, background: "var(--accent)", flexShrink: 0 }} />
            <h3 style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: 2, color: "var(--accent)", fontWeight: 400 }}>
              {t("report.frameworkSummaries")}
            </h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {Object.keys(data.frameworks).map((fw) => {
              const info = data.frameworks[fw];
              return (
                <div key={fw} style={{ padding: 14, background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent)", marginBottom: 6, letterSpacing: 1 }}>
                    {(frameworkLabels[fw] || fw).toUpperCase()}
                  </div>
                  {info && typeof info === "object" ? (
                    <>
                      {info.summary && <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 6, color: "var(--fg-soft)" }}>{info.summary}</div>}
                      {Array.isArray(info.key_patterns) && info.key_patterns.length > 0 && (
                        <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 4 }}>
                          {t("report.keyPatterns")}{info.key_patterns.join(", ")}
                        </div>
                      )}
                      {info.evidence_from_answers && (
                        <div style={{ fontSize: 12, marginTop: 4, color: "var(--fg-soft)", lineHeight: 1.6 }}>
                          {t("report.evidence")}{info.evidence_from_answers}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: 13, color: "var(--fg-soft)" }}>{String(info)}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
        <button onClick={copyReport} style={{
          background: "transparent", border: "1px solid var(--border)", color: "var(--dim)",
          padding: "8px 18px", fontSize: 11, letterSpacing: 1, cursor: "pointer",
          fontFamily: "var(--mono)"
        }}>
          {t("report.copyRaw")}
        </button>
        <button
          type="button"
          onClick={downloadPdf}
          disabled={pdfBusy || !exportText}
          style={{
            background: "transparent", border: "1px solid var(--border)", color: "var(--dim)",
            padding: "8px 18px", fontSize: 11, letterSpacing: 1, cursor: pdfBusy ? "wait" : "pointer",
            fontFamily: "var(--mono)", opacity: pdfBusy ? 0.6 : 1,
          }}
        >
          {pdfBusy ? t("report.generatingPdf") : t("report.downloadPdf")}
        </button>
        <button onClick={() => setShowRaw(!showRaw)} style={{
          background: "transparent", border: "1px solid var(--border)", color: "var(--dim)",
          padding: "8px 18px", fontSize: 11, letterSpacing: 1, cursor: "pointer",
          fontFamily: "var(--mono)"
        }}>
          {showRaw ? t("report.hideRaw") : t("report.showRaw")} {t("report.rawText")}
        </button>
      </div>

      {showRaw && raw && (
        <pre style={{
          whiteSpace: "pre-wrap", fontFamily: "var(--mono)", fontSize: 12, color: "var(--fg-soft)",
          background: "var(--surface)", padding: 16, border: "1px solid var(--border)", overflowX: "auto", marginBottom: 32
        }}>
          {raw}
        </pre>
      )}

      <div style={{ marginTop: 40, marginBottom: 24 }}>
        <CrisisHelpBox compact />
        <ContactRosten style={{ marginTop: 12 }} />
      </div>

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <button onClick={onRestart} style={{
          background: "transparent", border: "1px solid var(--border)", color: "var(--dim)",
          padding: "12px 32px", fontSize: 11, letterSpacing: 2, cursor: "pointer",
          fontFamily: "var(--mono)", transition: "all 0.2s"
        }}
          onMouseEnter={e => { e.target.style.borderColor = "var(--accent)"; e.target.style.color = "var(--accent)"; }}
          onMouseLeave={e => { e.target.style.borderColor = "var(--border)"; e.target.style.color = "var(--dim)"; }}
        >
          {t("report.newAnalysis")}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const { t, locale, systemPrompt } = useI18n();
  let initial = loadState();

  if (initial?.phase === "analyzing" && !initial?.analysis && !initial?.analysisData) {
    initial = {
      ...initial,
      phase: "questions",
      analysisData: null,
      error: null,
    };
  }

  const [phase, setPhase] = useState(initial?.phase || "intro");
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
      participant: participantCtx = null,
    } = options;

    const requestOnce = async (apiMessages, retriesLeft = 2, retryKind = "json") => {
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
            model: "gemini-2.5-flash",
            max_tokens: maxTokens,
            json_mode: jsonMode,
            json_schema: jsonMode ? "question" : undefined,
            temperature: jsonMode ? 0.35 : undefined,
            system: systemPrompt,
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
            return requestOnce(
              [
                ...apiMessages,
                {
                  role: "user",
                  content: apiT(locale, "api.invalidJsonRetry"),
                },
              ],
              retriesLeft - 1,
              "incomplete"
            );
          } else {
            console.log("[DIAG] Alle retries brukt opp – kaster feil til bruker.");
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

        const tryParse = () => parseLlmJson(text);

        try {
          const parsed = tryParse();
          // [DIAG] Logger det parsede spørsmålsobjektet etter parsing
          console.log("[DIAG] Parsed result:", JSON.stringify(parsed, null, 2));
          return parsed;
        } catch (parseErr) {
          if (retriesLeft <= 0) throw parseErr;
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
    (analysisResult, historyToUse, rawResult) => {
      setConversationHistory([
        ...historyToUse,
        { role: "user", content: apiT(locale, "api.generateAnalysis") },
        { role: "assistant", content: JSON.stringify(rawResult) },
      ]);
      setAnalyzingStatus(t("analyzing.reportReady"));
      if (participant?.id) {
        markParticipantAnalysisComplete(participant.id, structuredAnswers.length);
      }
      setTimeout(() => {
        setAnalysis(analysisResult.analysis);
        setAnalysisData(analysisResult);
        setPhase("result");
        setAnalyzingStatus("");
      }, 1200);
    },
    [participant?.id, structuredAnswers.length, locale, t]
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
    async (historyToUse) => {
      clearError();
      setIsLoading(true);
      setOpinion("");
      setPhase("analyzing");
      setAnalyzingStatus(t("analyzing.step1"));
      try {
        const step1 = await callClaude(buildStep1Messages(structuredAnswers, participant, locale), {
          structuredAnswers,
          maxTokens: 512,
          skipPrepare: true,
          participant,
        });
        setAnalyzingStatus(t("analyzing.step2"));
        let result = await callClaude(
          buildStep2Messages(structuredAnswers, step1, historyToUse, participant, locale),
          { structuredAnswers, maxTokens: 512, skipPrepare: true, participant }
        );
        let analysisResult = normalizeAnalysis(result);
        if (!analysisResult.analysis) {
          const retry = await callClaude(
            [
              ...buildStep2Messages(structuredAnswers, step1, historyToUse, participant, locale),
              { role: "assistant", content: JSON.stringify(result) },
              {
                role: "user",
                content: apiT(locale, "api.analysisRetry"),
              },
            ],
            { structuredAnswers, maxTokens: 512, skipPrepare: true, participant }
          );
          result = retry;
          analysisResult = normalizeAnalysis(retry);
        }
        if (analysisResult.analysis) {
          finishAnalysis(analysisResult, historyToUse, result);
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
      // analysis flow (step1 + step2) instead of trying another LLM call with the force
      // prompt. This avoids the heavy call that often times out near 50 questions.
      if (mustForceAnalysis(questionNumber)) {
        setConversationHistory(newHistory);
        await triggerAnalysis(newHistory);
        return;
      }

      try {
        const result = await callClaude(newHistory, callOptions);
        const analysisResult = normalizeAnalysis(result);
        const updatedHistory = [
          ...newHistory,
          { role: "assistant", content: JSON.stringify(result) },
        ];
        applyMetaFromResult(result);

        if (analysisResult.analysis) {
          setPhase("analyzing");
          finishAnalysis(analysisResult, updatedHistory, result);
          return;
        }

        if (result.type === "question" && result.question) {
          if (
            result.question === currentQuestion &&
            canSuggestAnalysis(questionNumber, true)
          ) {
            await triggerAnalysis(updatedHistory);
            return;
          }
          const nextNum = result.questionNumber || questionNumber + 1;
          if (nextNum > MAX_QUESTIONS) {
            await triggerAnalysis(updatedHistory);
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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;1,400&family=Crimson+Pro:ital,wght@0,300;0,400;1,300;1,400&family=Bebas+Neue&display=swap');
        :root {
          --bg: #080a0f; --surface: #0d1117; --border: #1c2230;
          --fg: #e2e8f0; --fg-soft: #a8b4c4;
          --dim: #4a5568; --dim-2: #2d3748;
          --accent: #818cf8; --accent-dim: rgba(129,140,248,0.3);
          --mono: 'IBM Plex Mono', monospace;
          --body: 'Crimson Pro', serif;
          --display: 'Bebas Neue', sans-serif;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: var(--bg); color: var(--fg); min-height: 100vh; padding-bottom: 64px; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--bg); }
        ::-webkit-scrollbar-thumb { background: var(--border); }
        input::placeholder { color: var(--dim-2); }
        button:disabled { opacity: 0.4; }
      `}</style>
      <ScanlineOverlay />
      <BrandWatermark />
      <BrandHeader />
      <BrandFooter />
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
