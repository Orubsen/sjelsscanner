import { useState, useEffect, useRef, useCallback } from "react";

const SYSTEM_PROMPT = `Du er en avansert psykoanalytisk AI. Du gjennomfører en dyptgående psykoanalyse ved å stille nøye utvalgte spørsmål, ett om gangen.

REGLER DU ALDRI BRYTER:
- Du lyver ikke, synser ikke og spekulerer ikke
- Du er ikke snill, empatisk eller støttende i tone – du er nøytral og presis
- Du gir aldri ros eller validering som ikke er faktabasert
- Du baserer ALT på det brukeren faktisk sier
- Du bruker etablerte psykologiske rammeverk: Big Five, tilknytningsteori, kognitive forsvarsmekanismer, Jungian arketyper, Freudiansk analyse, ACE-forskning, og atferdspsykologi

DU SVARER ALLTID KUN MED GYLDIG JSON – ingen tekst utenfor JSON-blokken.

FORMAT FOR SPØRSMÅL:
{"type":"question","question":"[ditt spørsmål her]","category":"[kategori]","questionNumber":[nummer]}

FORMAT FOR ANALYSE (etter minst 15 spørsmål og nok data):
{"type":"analysis","analysis":"[full analyse her]"}

SPØRSMÅLSKATEGORIER (dekk alle):
1. Tidlig barndom og primære omsorgspersoner
2. Tilknytningsstil og nære relasjoner
3. Selvbilde vs. andres oppfatning
4. Konflikt- og stresshåndtering
5. Kontrollbehov og beslutningstaking
6. Frykt, unngåelsesatferd og triggere
7. Ambisjon, motivasjon og indre drivkraft
8. Skyld, skam og selvkritikk
9. Grenser – eller mangel på dem
10. Repeternde mønstre i relasjoner
11. Forholdet til autoritet og regler
12. Selvdestruksjon vs. selvbevaring
13. Drømmer, fantasier og uoppfylte behov
14. Forholdet til kropp og kontroll
15. Det du aldri ville sagt høyt

INSTRUKSJONER FOR SPØRSMÅL:
- Still ett spørsmål om gangen
- Bygg på tidligere svar for å grave dypere
- Spør gjerne oppfølgingsspørsmål hvis svaret er vagt
- Bruk konkrete, direkte formuleringer
- Unngå ledende spørsmål
- Still minst 15 spørsmål, gjerne 20+ for presis analyse
- Inkluder noen spørsmål med scenario-basert tilnærming og noen introspektive

NÅR DU HAR NOK DATA (etter 15+ spørsmål), lever EN komplett analyse strukturert slik:
## DOMINERENDE PERSONLIGHETSPROFIL
[med belegg fra svarene]

## IDENTIFISERTE FORSVARSMEKANISMER
[spesifikke eksempler fra svarene]

## TILKNYTNINGSSTIL OG OPPRINNELSE
[sannsynlig stil med begrunnelse]

## KJERNESÅR OG KOMPENSERENDE ATFERD
[konkrete mønstre]

## UBEVISSTE MØNSTRE OG SELVSABOTASJE
[mønstre identifisert]

## SKYGGESIDEN
[det som undertrykkes eller fornektes]

## PROGNOSE
Uten behandling: [realistisk forløp]
Med bevisst endring: [hva som er mulig]

## UBEHAGELIGE SANNHETER
[konkrete, ubehagelige observasjoner basert på data]`;

const glitchChars = "!@#$%^&*()_+-=[]{}|;':\",./<>?\\`~01";

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
    setDisplayed("");
    setDone(false);
    if (!text) return;
    let i = 0;
    const interval = setInterval(() => {
      if (i >= text.length) {
        setDone(true);
        clearInterval(interval);
        onDone?.();
        return;
      }
      setDisplayed(text.slice(0, i + 1));
      i++;
    }, speed);
    return () => clearInterval(interval);
  }, [text]);
  return <span>{displayed}{!done && <span className="cursor">█</span>}</span>;
}

function ProgressBar({ current, total }) {
  const pct = Math.min((current / total) * 100, 100);
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, color: "var(--dim)", letterSpacing: 2 }}>
        <span>DATAINNSAMLING</span>
        <span>{current}/{total} INPUT</span>
      </div>
      <div style={{ height: 2, background: "var(--surface)", position: "relative", overflow: "hidden" }}>
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

function IntroScreen({ onStart }) {
  const [glitch, setGlitch] = useState(false);
  useEffect(() => {
    const t = setInterval(() => { setGlitch(true); setTimeout(() => setGlitch(false), 500); }, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 32, textAlign: "center" }}>
      <div style={{ marginBottom: 16, fontSize: 11, letterSpacing: 4, color: "var(--accent-dim)", fontFamily: "var(--mono)" }}>
        PSYKOANALYTISK SYSTEM v2.4.1
      </div>
      <h1 style={{ fontSize: "clamp(2rem, 6vw, 4rem)", fontFamily: "var(--display)", fontWeight: 900, letterSpacing: -2, lineHeight: 1, marginBottom: 8, color: "var(--fg)" }}>
        <GlitchText text="SJELS" active={glitch} />
        <br />
        <span style={{ color: "var(--accent)" }}>
          <GlitchText text="SCANNER" active={glitch} />
        </span>
      </h1>
      <div style={{ width: 60, height: 1, background: "var(--accent)", margin: "24px auto", boxShadow: "0 0 10px var(--accent)" }} />
      <p style={{ maxWidth: 480, color: "var(--dim)", fontSize: 13, lineHeight: 1.8, marginBottom: 8, fontFamily: "var(--mono)" }}>
        Dette er ikke en personlighetstest.<br />
        Dette er en kirurgisk analyse av hvem du faktisk er.
      </p>
      <p style={{ maxWidth: 480, color: "var(--dim-2)", fontSize: 11, lineHeight: 1.8, marginBottom: 48, fontFamily: "var(--mono)" }}>
        Systemet vil stille deg 15–25 spørsmål basert på etablerte psykologiske rammeverk. Svar ærlig. Systemet er designet for å identifisere selvbedrag.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, maxWidth: 480, width: "100%", marginBottom: 48 }}>
        {["Big Five", "Tilknytningsteori", "Forsvarsmekanismer", "Jungian arketyper", "Freudiansk analyse", "ACE-forskning"].map(f => (
          <div key={f} style={{ padding: "8px 4px", border: "1px solid var(--border)", fontSize: 10, color: "var(--dim)", letterSpacing: 1, textAlign: "center", fontFamily: "var(--mono)" }}>
            {f.toUpperCase()}
          </div>
        ))}
      </div>

      <button onClick={onStart} style={{
        background: "transparent", border: "1px solid var(--accent)", color: "var(--accent)",
        padding: "14px 40px", fontSize: 12, letterSpacing: 3, cursor: "pointer",
        fontFamily: "var(--mono)", transition: "all 0.2s", textTransform: "uppercase",
        position: "relative", overflow: "hidden"
      }}
        onMouseEnter={e => { e.target.style.background = "var(--accent)"; e.target.style.color = "#000"; }}
        onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "var(--accent)"; }}
      >
        INITIER ANALYSE
      </button>

      <p style={{ marginTop: 24, fontSize: 10, color: "var(--dim-2)", fontFamily: "var(--mono)", letterSpacing: 1 }}>
        ⚠ ADVARSEL: BRUTAL ÆRLIGHET ER STANDARD
      </p>
    </div>
  );
}

function QuestionScreen({ question, category, questionNumber, totalExpected, onAnswer, isLoading }) {
  const [answer, setAnswer] = useState("");
  const [questionReady, setQuestionReady] = useState(false);
  const textRef = useRef(null);

  useEffect(() => { setAnswer(""); setQuestionReady(false); }, [question]);
  useEffect(() => { if (questionReady && textRef.current) textRef.current.focus(); }, [questionReady]);

  const handleSubmit = () => {
    if (answer.trim().length < 3) return;
    onAnswer(answer.trim());
    setAnswer("");
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <ProgressBar current={questionNumber} total={totalExpected} />

      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "var(--accent)", fontFamily: "var(--mono)", padding: "3px 8px", border: "1px solid var(--accent-dim)" }}>
            {category ? category.toUpperCase() : "ANALYSE"}
          </div>
          <div style={{ fontSize: 10, color: "var(--dim-2)", fontFamily: "var(--mono)", letterSpacing: 2 }}>
            SPM {questionNumber}
          </div>
        </div>

        <div style={{ fontSize: "clamp(15px, 2.5vw, 18px)", lineHeight: 1.7, color: "var(--fg-soft)", fontFamily: "var(--body)", minHeight: 80 }}>
          {isLoading ? (
            <span style={{ color: "var(--dim)", fontFamily: "var(--mono)", fontSize: 13 }}>
              PROSESSERER<span style={{ animation: "blink 1s infinite" }}>...</span>
            </span>
          ) : (
            <Typewriter text={question} speed={20} onDone={() => setQuestionReady(true)} />
          )}
        </div>
      </div>

      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: 12, left: 16, fontSize: 11, color: "var(--accent-dim)", fontFamily: "var(--mono)", pointerEvents: "none" }}>
          &gt;_
        </div>
        <textarea
          ref={textRef}
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleSubmit(); }}
          placeholder="Skriv svaret ditt her..."
          rows={4}
          style={{
            width: "100%", boxSizing: "border-box", background: "var(--surface)",
            border: "1px solid var(--border)", color: "var(--fg)", padding: "12px 16px 12px 36px",
            fontFamily: "var(--body)", fontSize: 14, lineHeight: 1.6, resize: "none",
            outline: "none", transition: "border-color 0.2s",
          }}
          onFocus={e => e.target.style.borderColor = "var(--accent)"}
          onBlur={e => e.target.style.borderColor = "var(--border)"}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
        <span style={{ fontSize: 10, color: "var(--dim-2)", fontFamily: "var(--mono)" }}>
          CTRL+ENTER FOR Å SENDE
        </span>
        <button
          onClick={handleSubmit}
          disabled={answer.trim().length < 3 || isLoading}
          style={{
            background: answer.trim().length >= 3 && !isLoading ? "var(--accent)" : "transparent",
            border: "1px solid var(--border)", color: answer.trim().length >= 3 && !isLoading ? "#000" : "var(--dim)",
            padding: "10px 28px", fontSize: 11, letterSpacing: 2, cursor: answer.trim().length >= 3 && !isLoading ? "pointer" : "default",
            fontFamily: "var(--mono)", transition: "all 0.2s", textTransform: "uppercase"
          }}
        >
          SEND →
        </button>
      </div>
    </div>
  );
}

function AnalyzingScreen() {
  const phases = ["KOMPRIMERER SVAR", "KARTLEGGER MØNSTRE", "IDENTIFISERER FORSVARSMEKANISMER", "BEREGNER TILKNYTNINGSPROFIL", "GENERERER ANALYSE"];
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPhase(p => Math.min(p + 1, phases.length - 1)), 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 32 }}>
      <div style={{ width: 1, height: 60, background: "linear-gradient(to bottom, transparent, var(--accent))", marginBottom: 32 }} />
      <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: 3, color: "var(--accent)", marginBottom: 32 }}>
        {phases[phase]}<span style={{ animation: "blink 0.8s infinite" }}>_</span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {phases.map((_, i) => (
          <div key={i} style={{ width: 6, height: 6, background: i <= phase ? "var(--accent)" : "var(--border)", transition: "background 0.3s", boxShadow: i <= phase ? "0 0 6px var(--accent)" : "none" }} />
        ))}
      </div>
    </div>
  );
}

function AnalysisScreen({ analysis, onRestart }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  const sections = analysis.split(/\n## /).filter(Boolean).map((s, i) => {
    if (i === 0 && !s.startsWith("#")) return { title: null, content: s };
    const lines = s.split("\n");
    return { title: lines[0].replace(/^#+ /, ""), content: lines.slice(1).join("\n").trim() };
  });

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px", opacity: visible ? 1 : 0, transition: "opacity 0.8s ease" }}>
      <div style={{ textAlign: "center", marginBottom: 64 }}>
        <div style={{ fontSize: 10, letterSpacing: 4, color: "var(--accent)", fontFamily: "var(--mono)", marginBottom: 16 }}>
          ANALYSE KOMPLETT
        </div>
        <h2 style={{ fontFamily: "var(--display)", fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 900, letterSpacing: -1, color: "var(--fg)" }}>
          PSYKOANALYTISK<br /><span style={{ color: "var(--accent)" }}>RAPPORT</span>
        </h2>
        <div style={{ width: 40, height: 1, background: "var(--accent)", margin: "24px auto" }} />
      </div>

      {sections.map((s, i) => (
        <div key={i} style={{ marginBottom: 48, paddingBottom: 48, borderBottom: i < sections.length - 1 ? "1px solid var(--border)" : "none" }}>
          {s.title && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 3, height: 20, background: "var(--accent)", flexShrink: 0 }} />
              <h3 style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: 2, color: "var(--accent)", fontWeight: 400 }}>
                {s.title.toUpperCase()}
              </h3>
            </div>
          )}
          <div style={{ color: "var(--fg-soft)", lineHeight: 1.9, fontSize: 14, fontFamily: "var(--body)", whiteSpace: "pre-line" }}>
            {s.content}
          </div>
        </div>
      ))}

      <div style={{ textAlign: "center", marginTop: 64 }}>
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
  const [phase, setPhase] = useState("intro");
  const [conversationHistory, setConversationHistory] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentCategory, setCurrentCategory] = useState("");
  const [questionNumber, setQuestionNumber] = useState(0);
  const [analysis, setAnalysis] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const totalExpected = 20;

  const callClaude = useCallback(async (messages) => {
    const response = await fetch("/.netlify/functions/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages
      })
    });
    const data = await response.json();
    const text = data.content?.find(b => b.type === "text")?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    return JSON.parse(jsonMatch[0]);
  }, []);

  const startAnalysis = useCallback(async () => {
    setIsLoading(true);
    setPhase("questions");
    try {
      const initMessages = [{ role: "user", content: "Start analysen. Still det første spørsmålet." }];
      const result = await callClaude(initMessages);
      if (result.type === "question") {
        setCurrentQuestion(result.question);
        setCurrentCategory(result.category || "");
        setQuestionNumber(1);
        setConversationHistory([
          { role: "user", content: "Start analysen. Still det første spørsmålet." },
          { role: "assistant", content: JSON.stringify(result) }
        ]);
      }
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  }, [callClaude]);

  const handleAnswer = useCallback(async (answer) => {
    setIsLoading(true);
    const newHistory = [
      ...conversationHistory,
      { role: "user", content: answer }
    ];
    try {
      const result = await callClaude(newHistory);
      const updatedHistory = [...newHistory, { role: "assistant", content: JSON.stringify(result) }];
      setConversationHistory(updatedHistory);

      if (result.type === "analysis") {
        setPhase("analyzing");
        setTimeout(() => {
          setAnalysis(result.analysis);
          setPhase("result");
        }, 9000);
      } else if (result.type === "question") {
        setCurrentQuestion(result.question);
        setCurrentCategory(result.category || "");
        setQuestionNumber(n => n + 1);
      }
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  }, [conversationHistory, callClaude]);

  const restart = () => {
    setPhase("intro");
    setConversationHistory([]);
    setCurrentQuestion("");
    setCurrentCategory("");
    setQuestionNumber(0);
    setAnalysis("");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;1,400&family=Crimson+Pro:ital,wght@0,300;0,400;1,300;1,400&family=Bebas+Neue&display=swap');
        :root {
          --bg: #080a0f;
          --surface: #0d1117;
          --border: #1c2230;
          --fg: #e2e8f0;
          --fg-soft: #a8b4c4;
          --dim: #4a5568;
          --dim-2: #2d3748;
          --accent: #818cf8;
          --accent-dim: rgba(129,140,248,0.3);
          --mono: 'IBM Plex Mono', monospace;
          --body: 'Crimson Pro', serif;
          --display: 'Bebas Neue', sans-serif;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: var(--bg); color: var(--fg); min-height: 100vh; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .cursor { animation: blink 1s infinite; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--bg); }
        ::-webkit-scrollbar-thumb { background: var(--border); }
        textarea::placeholder { color: var(--dim-2); }
      `}</style>
      <ScanlineOverlay />
      {phase === "intro" && <IntroScreen onStart={startAnalysis} />}
      {phase === "questions" && (
        <QuestionScreen
          question={currentQuestion}
          category={currentCategory}
          questionNumber={questionNumber}
          totalExpected={totalExpected}
          onAnswer={handleAnswer}
          isLoading={isLoading}
        />
      )}
      {phase === "analyzing" && <AnalyzingScreen />}
      {phase === "result" && <AnalysisScreen analysis={analysis} onRestart={restart} />}
    </>
  );
}
