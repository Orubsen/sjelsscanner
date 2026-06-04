import { useState, useEffect, useCallback } from "react";
import { parseLlmJson, parseApiResponse } from "./jsonUtils.js";
import { buildReportPlainText, downloadReportPdf, reportPdfFilename } from "./reportExport.js";
import {
  STORAGE_KEY,
  MAX_QUESTIONS,
  MIN_QUESTIONS_SUGGEST,
  META_CALL_LIMIT,
  BRAND,
  CATEGORIES,
  FRAMEWORK_LABELS,
  FRAMEWORK_ORDER,
} from "./analysisConfig.js";
import { SYSTEM_PROMPT } from "./systemPrompt.js";
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
import { saveParticipantToServer } from "./participantApi.js";

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

function ProgressBar({ current, maxQuestions }) {
  const pct = Math.min((current / maxQuestions) * 100, 100);
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, color: "var(--dim)", letterSpacing: 2 }}>
        <span>DATAINNSAMLING</span>
        <span>{current} SPØRSMÅL · MAKS {maxQuestions}</span>
      </div>
      <div style={{ height: 2, background: "var(--surface)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", transition: "width 0.6s ease", boxShadow: "0 0 8px var(--accent)" }} />
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
  const covered = new Set(coveredCategoryIds || []);
  return (
    <div style={{ marginBottom: 20, padding: 12, border: "1px solid var(--border)", background: "var(--surface)" }}>
      <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--dim)", fontFamily: "var(--mono)", marginBottom: 8 }}>
        KATEGORIDEKNING ({covered.size}/{CATEGORIES.length})
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {CATEGORIES.map((c) => (
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
          {analysisReady ? "◆ Klar for analyse: " : "○ "}{readinessNote}
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
  outline: "none",
};

function IntroScreen({ onStart, savedSession, onResume, onDiscard, initialParticipant, isStarting }) {
  const [glitch, setGlitch] = useState(false);
  const [name, setName] = useState(initialParticipant?.name || "");
  const [age, setAge] = useState(
    initialParticipant?.age != null ? String(initialParticipant.age) : ""
  );
  const [email, setEmail] = useState(initialParticipant?.email || "");
  const [consent, setConsent] = useState(Boolean(initialParticipant?.id));
  const [touched, setTouched] = useState(false);

  const validation = validateParticipant({ name, age, email });
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
    <div className="layout-shell layout-shell--intro" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 32, textAlign: "center", width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
      <IntroBrandMark />
      <div className="type-mono-sm" style={{ marginBottom: 16, fontSize: 11, letterSpacing: 4, color: "var(--accent-dim)", fontFamily: "var(--mono)" }}>
        PSYKOANALYTISK SYSTEM v2.4.1
      </div>
      <h1 className="type-display-title" style={{ fontSize: "clamp(2rem, 6vw, 4rem)", fontFamily: "var(--display)", fontWeight: 900, letterSpacing: -2, lineHeight: 1, marginBottom: 8, color: "var(--fg)" }}>
        <GlitchText text="SJELS" active={glitch} /><br />
        <span style={{ color: "var(--accent)" }}>
          <GlitchText text="SCANNER" active={glitch} />
        </span>
      </h1>
      <div style={{ width: 60, height: 1, background: "var(--accent)", margin: "24px auto", boxShadow: "0 0 10px var(--accent)" }} />
      <p className="layout-narrow type-body-sm" style={{ maxWidth: 480, width: "100%", color: "var(--dim)", fontSize: 13, lineHeight: 1.8, marginBottom: 8, fontFamily: "var(--mono)" }}>
        {BRAND.tagline}<br />
        Utviklet av {BRAND.company}. · {BRAND.product}
      </p>
      <p className="layout-narrow type-mono-sm" style={{ maxWidth: 480, width: "100%", color: "var(--dim-2)", fontSize: 11, lineHeight: 1.8, marginBottom: 24, fontFamily: "var(--mono)" }}>
        Velg det alternativet som ligner mest på deg. Systemet er designet for å identifisere selvbedrag.
      </p>

      <div className="layout-narrow" style={{ maxWidth: 420, width: "100%", marginBottom: 32, textAlign: "left" }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--accent)", fontFamily: "var(--mono)", marginBottom: 12 }}>
          FØR VI STARTER
        </div>
        <label style={{ display: "block", fontSize: 10, color: "var(--dim-2)", fontFamily: "var(--mono)", letterSpacing: 1, marginBottom: 6 }}>
          NAVN
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="Fornavn og etternavn"
          className="type-intro-field"
          style={{ ...introFieldStyle, marginBottom: touched && validation.errors.name ? 4 : 12 }}
        />
        {touched && validation.errors.name && (
          <p style={{ fontSize: 10, color: "#f87171", fontFamily: "var(--mono)", marginBottom: 12 }}>{validation.errors.name}</p>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 10, color: "var(--dim-2)", fontFamily: "var(--mono)", letterSpacing: 1, marginBottom: 6 }}>
              ALDER
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
              E-POST
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="din@epost.no"
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
          <span>
            Jeg samtykker til at Sjelsscanner lagrer navn, alder og e-post for denne kartleggingen (personvern i tråd med GDPR).
          </span>
        </label>
        {touched && !consent && (
          <p style={{ fontSize: 10, color: "#f87171", fontFamily: "var(--mono)", marginTop: 8 }}>
            Du må samtykke til lagring for å starte.
          </p>
        )}
      </div>

      <details style={{ maxWidth: 480, width: "100%", marginBottom: 32, textAlign: "left" }}>
        <summary style={{ fontSize: 10, letterSpacing: 2, color: "var(--dim)", fontFamily: "var(--mono)", cursor: "pointer" }}>
          HVOR KOMMER SPØRSMÅLENE FRA?
        </summary>
        <p style={{ marginTop: 12, fontSize: 11, color: "var(--dim-2)", fontFamily: "var(--mono)", lineHeight: 1.7 }}>
          Spørsmålene lages underveis av Sjelsscanner — ikke hentet fra en fast testbok eller quiz. For hver person
          velger systemet neste spørsmål ut fra det du allerede har svart, med utgangspunkt i etablerte psykologiske
          rammeverk og{" "}
          <strong style={{ color: "var(--fg-soft)", fontWeight: 600 }}>15 tematiske områder</strong> (bl.a. barndom,
          tilknytning, grenser og skyggesiden). Du får ett spørsmål om gangen med fire alternativer; antall spørsmål
          tilpasses individuelt, vanligvis mellom {MIN_QUESTIONS_SUGGEST} og {MAX_QUESTIONS}.
        </p>
      </details>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, maxWidth: 480, width: "100%", marginBottom: 48 }}>
        {["Big Five", "Tilknytningsteori", "Forsvarsmekanismer", "Jungian arketyper", "Freudiansk analyse", "ACE-forskning"].map(f => (
          <div key={f} style={{ padding: "8px 4px", border: "1px solid var(--border)", fontSize: 10, color: "var(--dim)", letterSpacing: 1, textAlign: "center", fontFamily: "var(--mono)" }}>
            {f.toUpperCase()}
          </div>
        ))}
      </div>

      {savedSession && (
        <div style={{ maxWidth: 480, width: "100%", marginBottom: 24, padding: 16, border: "1px solid var(--accent-dim)", background: "rgba(129,140,248,0.05)" }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--accent)", fontFamily: "var(--mono)", marginBottom: 8 }}>
            PÅBEGYNT ANALYSE FUNNET
          </div>
          <p style={{ fontSize: 12, color: "var(--fg-soft)", fontFamily: "var(--mono)", marginBottom: 12, lineHeight: 1.6 }}>
            Spørsmål {savedSession.questionNumber} · {savedSession.covered}/{savedSession.totalCategories} kategorier dekket
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={onResume} style={{ ...btnSmall, borderColor: "var(--accent)", color: "var(--accent)" }}>FORTSETT</button>
            <button onClick={onDiscard} style={btnSmall}>START PÅ NYTT</button>
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
        {isStarting ? "LAGRER OG STARTER…" : savedSession ? "NY ANALYSE" : "INITIER ANALYSE"}
      </button>

      <p style={{ marginTop: 24, fontSize: 10, color: "var(--dim-2)", fontFamily: "var(--mono)", letterSpacing: 1, maxWidth: 420, lineHeight: 1.6 }}>
        ⚠ Ikke diagnose eller behandling. Antall spørsmål tilpasses individuelt (opp til {MAX_QUESTIONS}).
      </p>
    </div>
  );
}

function AskBox({ onAskOpinion, onRephrase, isLoading, opinion, onCloseOpinion, askError, onClearAskError, metaRemaining }) {
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
            ◆ PSYKOLOGENS MENING
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
          SPØR PSYKOLOGEN
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
          placeholder="Hva mener du om...?"
          style={{ width: "100%", boxSizing: "border-box", background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg)", padding: "10px 12px", fontFamily: "var(--body)", fontSize: 13, outline: "none", marginBottom: 10 }}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={() => { setMode(null); onClearAskError?.(); }} style={{ ...btnSmall, padding: "6px 14px", fontSize: 10 }}>AVBRYT</button>
          <button onClick={handleAsk} disabled={input.trim().length < 3 || isLoading}
            style={{
              background: input.trim().length >= 3 && !isLoading ? "var(--accent)" : "transparent",
              border: "1px solid var(--accent-dim)",
              color: input.trim().length >= 3 && !isLoading ? "#000" : "var(--dim)",
              padding: "6px 14px", fontSize: 10, letterSpacing: 2, cursor: "pointer", fontFamily: "var(--mono)"
            }}>{isLoading ? "VENTER..." : "SPØR"}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => { onClearAskError?.(); setMode("opinion"); }} disabled={isLoading || metaRemaining <= 0} style={btnSmall}>◆ Spør psykologen</button>
        <button onClick={onRephrase} disabled={isLoading || metaRemaining <= 0} style={btnSmall}>↻ Omformuler spørsmålet</button>
      </div>
      {metaRemaining <= 0 && (
        <p style={{ marginTop: 8, fontSize: 10, color: "var(--dim-2)", fontFamily: "var(--mono)" }}>
          Maks {META_CALL_LIMIT} ekstra forespørsler per analyse er brukt opp.
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
  const [questionReady, setQuestionReady] = useState(false);
  const [hoveredOption, setHoveredOption] = useState(null);
  const [skipTypewriter, setSkipTypewriter] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState("");

  useEffect(() => { setQuestionReady(false); setSkipTypewriter(false); }, [question]);

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
      <ProgressBar current={questionNumber} maxQuestions={maxQuestions} />
      <CategoryProgress coveredCategoryIds={coveredCategoryIds} analysisReady={analysisReady} readinessNote={readinessNote} />

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "var(--accent)", fontFamily: "var(--mono)", padding: "3px 8px", border: "1px solid var(--accent-dim)" }}>
            {category ? category.toUpperCase() : "ANALYSE"}
          </div>
          <div style={{ fontSize: 10, color: "var(--dim-2)", fontFamily: "var(--mono)", letterSpacing: 2 }}>
            SPM {questionNumber}
          </div>
        </div>

        <div className="type-question-text" style={{ fontSize: "clamp(15px, 2.5vw, 18px)", lineHeight: 1.7, color: "var(--fg-soft)", fontFamily: "var(--body)", minHeight: 60 }}>
          {isLoading && !question ? (
            <span style={{ color: "var(--dim)", fontFamily: "var(--mono)", fontSize: 13 }}>
              PROSESSERER<span style={{ animation: "blink 1s infinite" }}>...</span>
            </span>
          ) : skipTypewriter ? (
            <span>{question}</span>
          ) : (
            <Typewriter text={question} speed={16} onDone={() => setQuestionReady(true)} />
          )}
        </div>
        {question && !questionReady && !isLoading && (
          <button type="button" onClick={() => { setSkipTypewriter(true); setQuestionReady(true); }} style={{ ...btnSmall, marginTop: 8, fontSize: 10 }}>
            VIS HELE SPØRSMÅLET
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
          E — Ingen passer helt · skriv eget svar
        </button>
      </div>

      {customMode && (
        <div style={{ marginTop: 12, padding: 14, border: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--dim)", fontFamily: "var(--mono)", marginBottom: 8 }}>EGET SVAR</div>
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            rows={3}
            placeholder="Beskriv kort det som passer best for deg..."
            style={{ width: "100%", boxSizing: "border-box", background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg)", padding: 10, fontFamily: "var(--body)", fontSize: 13, resize: "vertical" }}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" onClick={() => setCustomMode(false)} style={{ ...btnSmall, fontSize: 10 }}>AVBRYT</button>
            <button type="button" onClick={submitCustom} disabled={customText.trim().length < 3 || isLoading} style={{ ...btnSmall, borderColor: "var(--accent)", color: "var(--accent)", fontSize: 10 }}>SEND SVAR</button>
          </div>
        </div>
      )}

      <AskBox onAskOpinion={onAskOpinion} onRephrase={onRephrase} isLoading={isLoading} opinion={opinion} onCloseOpinion={onCloseOpinion} askError={askError} onClearAskError={onClearAskError} metaRemaining={metaRemaining} />

      {error && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #f87171", background: "rgba(248,113,113,0.08)", color: "#fecaca", fontFamily: "var(--mono)", fontSize: 12 }}>
          {error}
          <button onClick={() => { onClearError?.(); onForceAnalysis?.(); }} style={{ marginLeft: 12, background: "transparent", border: "1px solid #f87171", color: "#fecaca", padding: "2px 8px", cursor: "pointer" }}>
            Prøv analyse igjen
          </button>
        </div>
      )}

      {showAnalysisButton && !isLoading && (
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px dashed var(--border)", textAlign: "center" }}>
          <p style={{ fontSize: 11, color: analysisReady ? "var(--accent)" : "var(--dim)", fontFamily: "var(--mono)", marginBottom: 12, letterSpacing: 1 }}>
            {analysisReady
              ? "PSYKOLOGEN VURDERER AT DET ER NOK DATA FOR ANALYSE"
              : `DU KAN BE OM ANALYSE (MIN. ${MIN_QUESTIONS_SUGGEST} SPØRSMÅL)`}
          </p>
          <button onClick={onForceAnalysis} style={{
            background: "transparent", border: "1px solid var(--accent)", color: "var(--accent)",
            padding: "10px 24px", fontSize: 11, letterSpacing: 2, cursor: "pointer",
            fontFamily: "var(--mono)", transition: "all 0.2s", textTransform: "uppercase"
          }}
            onMouseEnter={e => { e.target.style.background = "var(--accent)"; e.target.style.color = "#000"; }}
            onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "var(--accent)"; }}
          >
            ▶ FÅ ANALYSEN NÅ
          </button>
        </div>
      )}
    </div>
  );
}

function AnalyzingScreen({ error, onClearError, onForceAnalysis, analyzingStatus, answerCount }) {
  const phases = ["KOMPRIMERER SVAR", "KARTLEGGER MØNSTRE", "IDENTIFISERER SPENNINGER", "BYGGER RAMMEVERK", "GENERERER RAPPORT"];
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPhase((p) => Math.min(p + 1, phases.length - 1)), 2200);
    return () => clearInterval(t);
  }, []);
  const label = analyzingStatus || phases[phase];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 32 }}>
      <div style={{ width: 1, height: 60, background: "linear-gradient(to bottom, transparent, var(--accent))", marginBottom: 32 }} />
      <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: 3, color: "var(--accent)", marginBottom: 12, textAlign: "center" }}>
        {label}<span style={{ animation: "blink 0.8s infinite" }}>_</span>
      </div>
      {answerCount > 0 && (
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--dim)", marginBottom: 24 }}>
          Behandler {answerCount} strukturerte svar
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
              Prøv igjen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalysisScreen({ analysis, analysisData, structuredAnswers, participant, onRestart }) {
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
      await navigator.clipboard.writeText(raw || exportText || "No analysis content.");
    } catch (_) {
      // ignore clipboard errors
    }
  };

  const downloadPdf = async () => {
    if (!exportText || pdfBusy) return;
    setPdfBusy(true);
    try {
      await downloadReportPdf(data, raw, reportPdfFilename(), participant);
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
          ANALYSE KOMPLETT
        </div>
        <h2 style={{ fontFamily: "var(--display)", fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 900, letterSpacing: -1, color: "var(--fg)" }}>
          PSYKOANALYTISK<br /><span style={{ color: "var(--accent)" }}>RAPPORT</span>
        </h2>
        <p style={{ marginTop: 12, fontSize: 11, color: "var(--dim)", fontFamily: "var(--mono)" }}>
          {BRAND.name} · {BRAND.product}
        </p>
        <div style={{ width: 40, height: 1, background: "var(--accent)", margin: "24px auto" }} />
      </div>

      <div style={{ marginBottom: 32, padding: 14, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 12, lineHeight: 1.7, color: "var(--dim)", fontFamily: "var(--mono)" }}>
        ⚠ Dette er ikke diagnose, behandling eller klinisk vurdering av helsepersonell. Rapporten er en strukturert AI-kartlegging basert på dine svar.
      </div>

      {data?.short_summary && (
        <div style={{ marginBottom: 32, padding: 16, border: "1px solid var(--accent-dim)", background: "rgba(129,140,248,0.06)" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: 2, color: "var(--accent)", marginBottom: 10 }}>KORTVERSJON</div>
          <p style={{ color: "var(--fg-soft)", lineHeight: 1.8, fontSize: 14, fontFamily: "var(--body)" }}>{data.short_summary}</p>
          <button type="button" onClick={() => navigator.clipboard.writeText(data.short_summary)} style={{ ...btnSmall, marginTop: 12, fontSize: 10 }}>
            Kopier kortversjon
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
            Helhetsrapport
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rammeverk")}
            style={{ ...tabStyle, ...(activeTab === "rammeverk" ? activeTabStyle : {}) }}
          >
            Etter rammeverk
          </button>
        </div>
      )}

      {showHelhetsrapport && (
        <>
          {data?.overall_insight && (
            <div style={{ marginBottom: 40, padding: 16, background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: 2, color: "var(--accent)", marginBottom: 10 }}>
                OVERORDNET INNSIKT
              </div>
              <div style={{ color: "var(--fg-soft)", lineHeight: 1.8, fontSize: 14, fontFamily: "var(--body)", whiteSpace: "pre-line" }}>
                {data.overall_insight}
              </div>
            </div>
          )}

          {data?.conflicts?.length > 0 && (
            <div style={{ marginBottom: 32, padding: 14, border: "1px solid var(--border)", background: "var(--surface)" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: 2, color: "var(--accent)", marginBottom: 8 }}>SPENNINGER I SVARENE</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: "var(--fg-soft)", fontSize: 13, lineHeight: 1.7, fontFamily: "var(--body)" }}>
                {data.conflicts.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}

          {data?.clinical_followup && (
            <div style={{ marginBottom: 40, padding: 16, border: "1px dashed var(--border)", background: "rgba(140,118,88,0.06)" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: 2, color: "var(--bronze, #8c7658)", marginBottom: 8 }}>KLINISK VIDERE UTFORSKING</div>
              <p style={{ color: "var(--fg-soft)", lineHeight: 1.8, fontSize: 14, fontFamily: "var(--body)", margin: 0 }}>{data.clinical_followup}</p>
            </div>
          )}

          {data?.key_themes?.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: 2, color: "var(--accent)", marginBottom: 12 }}>
                NØKKELTEMAER
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
                        <div><span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--accent)" }}>Observasjon · </span><span style={{ color: "var(--fg-soft)", fontSize: 14, lineHeight: 1.8, fontFamily: "var(--body)" }}>{s.observation}</span></div>
                      )}
                      {s.interpretation && (
                        <div><span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--dim)" }}>Tolkning · </span><span style={{ color: "var(--fg-soft)", fontSize: 14, lineHeight: 1.8, fontFamily: "var(--body)" }}>{s.interpretation}</span></div>
                      )}
                      {s.uncertainty && (
                        <div><span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--dim-2)" }}>Usikkerhet · </span><span style={{ color: "var(--dim)", fontSize: 13, lineHeight: 1.7, fontFamily: "var(--body)" }}>{s.uncertainty}</span></div>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: "var(--fg-soft)", lineHeight: 1.9, fontSize: 14, fontFamily: "var(--body)", whiteSpace: "pre-line" }}>
                      {s.raw || "(ingen innhold under denne overskriften)"}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ color: "var(--fg-soft)", lineHeight: 1.8, fontSize: 14, fontFamily: "var(--body)", marginBottom: 32 }}>
                Rapporten manglet forventede ##-seksjoner. Se råtekst nedenfor.
              </div>
            )
          ) : (
            <div style={{ color: "#fecaca", marginBottom: 32 }}>Ingen rapporttekst mottatt. Start på nytt eller prøv å generere analysen igjen.</div>
          )}
        </>
      )}

      {activeTab === "rammeverk" && hasFrameworks && (
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 3, height: 20, background: "var(--accent)", flexShrink: 0 }} />
            <h3 style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: 2, color: "var(--accent)", fontWeight: 400 }}>
              RAMMEVERK-OPPSUMMERINGER
            </h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {FRAMEWORK_ORDER.filter(fw => data.frameworks[fw]).concat(
              Object.keys(data.frameworks).filter(fw => !FRAMEWORK_ORDER.includes(fw))
            ).map(fw => {
              const info = data.frameworks[fw];
              const patterns = info?.key_patterns ?? info?.key_traits;
              const evidence = info?.evidence_from_answers ?? info?.evidence;
              return (
                <div key={fw} style={{ padding: 14, background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent)", marginBottom: 6, letterSpacing: 1 }}>
                    {(FRAMEWORK_LABELS[fw] || fw).toUpperCase()}
                  </div>
                  {info && typeof info === "object" ? (
                    <>
                      {info.summary && <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 6, color: "var(--fg-soft)" }}>{info.summary}</div>}
                      {Array.isArray(patterns) && patterns.length > 0 && (
                        <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 4 }}>
                          Nøkkelmønstre: {patterns.join(", ")}
                        </div>
                      )}
                      {evidence && (
                        <div style={{ fontSize: 12, marginTop: 4, color: "var(--fg-soft)", lineHeight: 1.6 }}>
                          Belegg: {evidence}
                        </div>
                      )}
                      {info.quote && (
                        <blockquote style={{ margin: "10px 0 0", padding: "8px 10px", borderLeft: "2px solid var(--accent)", background: "rgba(129,140,248,0.05)", fontSize: 12, color: "var(--fg-soft)", fontStyle: "italic", lineHeight: 1.6 }}>
                          «{info.quote}»
                          {info.question_index != null && (
                            <span style={{ display: "block", marginTop: 6, fontStyle: "normal", fontFamily: "var(--mono)", fontSize: 10, color: "var(--dim)" }}>
                              — spm. {info.question_index}
                            </span>
                          )}
                        </blockquote>
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
          KOPIER RÅTEKST
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
          {pdfBusy ? "GENERERER PDF…" : "LAST NED SOM PDF"}
        </button>
        <button onClick={() => setShowRaw(!showRaw)} style={{
          background: "transparent", border: "1px solid var(--border)", color: "var(--dim)",
          padding: "8px 18px", fontSize: 11, letterSpacing: 1, cursor: "pointer",
          fontFamily: "var(--mono)"
        }}>
          {showRaw ? "SKJUL" : "VIS"} RÅTEKST
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

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <button onClick={onRestart} style={{
          background: "transparent", border: "1px solid var(--border)", color: "var(--dim)",
          padding: "12px 32px", fontSize: 11, letterSpacing: 2, cursor: "pointer",
          fontFamily: "var(--mono)", transition: "all 0.2s"
        }}
          onMouseEnter={e => { e.target.style.borderColor = "var(--accent)"; e.target.style.color = "var(--accent)"; }}
          onMouseLeave={e => { e.target.style.borderColor = "var(--border)"; e.target.style.color = "var(--dim)"; }}
        >
          NY ANALYSE
        </button>
      </div>
    </div>
  );
}

export default function App() {
  let initial = loadState();

  if (initial?.phase === "analyzing" && !initial?.analysis && !initial?.analysisData) {
    initial = {
      ...initial,
      phase: "questions",
      analysisData: null,
      error: "Analysen ble avbrutt. Prøv «Få analysen nå» eller svar på flere spørsmål.",
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

  const callClaude = useCallback(async (messages, options = {}) => {
    const {
      structuredAnswers = [],
      maxTokens = 2048,
      skipPrepare = false,
      participant: participantCtx = null,
    } = options;

    const requestOnce = async (apiMessages, allowRetry) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(new Error("Analysis request timed out after 90s")),
        90000
      );

      try {
        const prepared = skipPrepare
          ? apiMessages
          : prepareMessagesForApi(apiMessages, structuredAnswers, participantCtx);

        const response = await fetch("/api/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gemini-3.5-flash",
            max_tokens: maxTokens,
            system: SYSTEM_PROMPT,
            messages: prepared,
          }),
          signal: controller.signal,
        });

        const data = await parseApiResponse(response);

        if (!response.ok) {
          const msg =
            (typeof data?.error === "string" ? data.error : data?.error?.message) ||
            `HTTP ${response.status}`;
          throw new Error(`Backend error: ${msg}`);
        }

        const text = data.content?.find((b) => b.type === "text")?.text || "";
        if (!text.trim()) throw new Error("Empty response from analyst");

        try {
          return parseLlmJson(text);
        } catch (parseErr) {
          if (!allowRetry) throw parseErr;
          return requestOnce(
            [
              ...apiMessages,
              {
                role: "user",
                content:
                  "[SYSTEM: Forrige svar var ugyldig eller avkuttet JSON. Returner KUN ett gyldig JSON-objekt på én linje, uten markdown. Bruk \\n for linjeskift i strenger. For neste steg: type question med question, category, questionNumber, options (4 stk).]",
              },
            ],
            false
          );
        }
      } catch (err) {
        const isTimeout =
          err?.name === "AbortError" ||
          /timed out|timeout/i.test(String(err?.message || ""));
        if (isTimeout) {
          throw new Error("Forespørselen tok for lang tid. Prøv igjen.");
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    return requestOnce(messages, true);
  }, []);

  const finishAnalysis = useCallback((analysisResult, historyToUse, rawResult) => {
    setConversationHistory([
      ...historyToUse,
      { role: "user", content: "[Generer full analyse]" },
      { role: "assistant", content: JSON.stringify(rawResult) },
    ]);
    setAnalyzingStatus("Rapport klar");
    setTimeout(() => {
      setAnalysis(analysisResult.analysis);
      setAnalysisData(analysisResult);
      setPhase("result");
      setAnalyzingStatus("");
    }, 1200);
  }, []);

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
      setAnalyzingStatus("Steg 1/2: Komprimerer svar…");
      try {
        const step1 = await callClaude(buildStep1Messages(structuredAnswers, participant), {
          structuredAnswers,
          maxTokens: 4096,
          skipPrepare: true,
          participant,
        });
        setAnalyzingStatus("Steg 2/2: Genererer rapport…");
        let result = await callClaude(
          buildStep2Messages(structuredAnswers, step1, historyToUse, participant),
          { structuredAnswers, maxTokens: 8192, skipPrepare: true, participant }
        );
        let analysisResult = normalizeAnalysis(result);
        if (!analysisResult.analysis) {
          const retry = await callClaude(
            [
              ...buildStep2Messages(structuredAnswers, step1, historyToUse, participant),
              { role: "assistant", content: JSON.stringify(result) },
              {
                role: "user",
                content:
                  "[KRITISK: Returner full analysis JSON nå. Obligatorisk: frameworks med quote og question_index, short_summary, conflicts, clinical_followup, analysis med ## og Observasjon/Tolkning/Usikkerhet.]",
              },
            ],
            { structuredAnswers, maxTokens: 8192, skipPrepare: true, participant }
          );
          result = retry;
          analysisResult = normalizeAnalysis(retry);
        }
        if (analysisResult.analysis) {
          finishAnalysis(analysisResult, historyToUse, result);
        } else {
          setPhase("questions");
          setError(
            "Analysen ble ikke generert. Prøv igjen eller svar på noen flere spørsmål."
          );
        }
      } catch (e) {
        console.error(e);
        setPhase("questions");
        const msg = e?.message?.includes("timed out")
          ? "Analysen tok for lang tid. Sjekk nettverket og prøv igjen."
          : e?.message || "Analyse feilet.";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [callClaude, structuredAnswers, finishAnalysis, participant]
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
    const check = validateParticipant(participantInfo);
    if (!check.valid) {
      setError("Fyll inn navn, alder og gyldig e-post før du starter.");
      return;
    }
    if (!consent) {
      setError("Du må samtykke til lagring av opplysningene før du starter.");
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
      const ctx = buildParticipantContext(saved.participant);
      const initMessages = [
        {
          role: "user",
          content: `${ctx}\n\nStart analysen. Still spørsmål 1 med 4 alternativer. Maks ${MAX_QUESTIONS} spørsmål totalt — antall før analyse vurderes individuelt. Tilpass språk til deltakerens alder.`,
        },
      ];
      const result = await callClaude(initMessages, {
        participant: saved.participant,
        skipPrepare: true,
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
        setError("Kunne ikke starte analysen (ugyldig svar fra modellen). Prøv igjen.");
      }
    } catch (e) {
      console.error(e);
      setPhase("intro");
      setError(
        e?.message?.includes("Lagring")
          ? e.message
          : e?.message || "Kunne ikke starte analysen. Sjekk API-nøkkel og nettverk."
      );
    }
    setIsLoading(false);
  }, [callClaude, applyMetaFromResult]);

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
        buildAnswerUserMessage(questionNumber, currentCategory, answerText) +
        "\n\n" +
        buildQuestionContextMessage(questionNumber);

      if (mustForceAnalysis(questionNumber)) {
        messageContent += `\n\n[SYSTEM: Dette er svar på spm ${questionNumber}/${MAX_QUESTIONS}. Generer analysis NÅ — ikke flere spørsmål.]`;
      }

      const newHistory = [...conversationHistory, { role: "user", content: messageContent }];
      try {
        const result = await callClaude(newHistory, {
          structuredAnswers: nextStructured,
          participant,
        });
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
          setError("Uventet svar fra psykologen. Du kan fortsette eller be om analyse.");
        }
      } catch (e) {
        console.error(e);
        const detail = e?.message || "";
        setError(
          /timed out|timeout/i.test(detail)
            ? "Forespørselen tok for lang tid. Prøv igjen."
            : detail.includes("JSON") || detail.includes("lese svar")
              ? detail.startsWith("Kunne ikke")
                ? detail
                : `Kunne ikke lese svar (${detail}).`
              : detail || "Kunne ikke hente svar fra psykologen."
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
        setAskError(`Maks ${META_CALL_LIMIT} ekstra forespørsler per analyse.`);
        return;
      }
      clearError();
      setAskError("");
      setIsLoading(true);
      setMetaUsageCount((c) => c + 1);
      const askMessage = `[META-SPØRSMÅL – ikke svar på aktivt spørsmål. JSON opinion-format]: ${userQuestion}`;
      const tempHistory = [...conversationHistory, { role: "user", content: askMessage }];
      try {
        const result = await callClaude(tempHistory, { structuredAnswers, participant });
        const text = result?.opinion || result?.text || result?.message;
        if (text && result?.type !== "question") {
          setOpinion(String(text));
        } else {
          setAskError("Kunne ikke hente psykologens svar. Prøv igjen.");
        }
      } catch (e) {
        console.error(e);
        setAskError(e?.message || "Kunne ikke generere svar. Prøv igjen.");
      }
      setIsLoading(false);
    },
    [conversationHistory, callClaude, metaUsageCount, structuredAnswers, participant]
  );

  const handleRephrase = useCallback(async () => {
    if (metaUsageCount >= META_CALL_LIMIT) return;
    clearError();
    setIsLoading(true);
    setOpinion("");
    setMetaUsageCount((c) => c + 1);
    const askMessage = `[Omformuler spm ${questionNumber} enklere. rephrase-format, samme kategori, 4 nye alternativer.]`;
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
        body { background: var(--bg); color: var(--fg); min-height: 100vh; padding-bottom: 44px; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .cursor { animation: blink 1s infinite; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--bg); }
        ::-webkit-scrollbar-thumb { background: var(--border); }
        input::placeholder { color: var(--dim-2); }
        button:disabled { opacity: 0.4; }
      `}</style>
      <ScanlineOverlay />
      <BrandWatermark />
      <BrandHeader />
      <BrandFooter company={BRAND.company} />
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