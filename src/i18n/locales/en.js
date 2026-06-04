/** English UI and API message strings */
export const en = {
  brand: {
    name: "Røsten",
    product: "Soul Scanner",
    company: "RØSTEN ENT",
    tagline: "Surgical psychoanalytic mapping — not a personality test.",
    developedBy: "Developed by {company}. · {product}",
    contactEmail: "kontakt@xn--rubenrsten-5cb.no",
    websiteUrl: "https://rubenrøsten.no",
    websiteLabel: "rubenrøsten.no",
    siteUrl: "https://sjelescanner.netlify.app",
    rightsReserved: "All rights reserved.",
  },
  frameworks: {
    attachment: "Attachment",
    defense_mechanisms: "Defense mechanisms",
    jungian_archetypes: "Jungian archetypes",
    freudian_analysis: "Freudian analysis",
    ace_impact: "ACE impact",
  },
  frameworkList: [
    "Big Five",
    "Attachment theory",
    "Defense mechanisms",
    "Jungian archetypes",
    "Freudian analysis",
    "ACE research",
  ],
  crisis: {
    title: "NEED HELP NOW?",
    intro:
      "Soul Scanner does not replace crisis support or treatment. If you are in acute distress or crisis:",
    lines: [
      { label: "Mental Helse – Helpline (Norway)", value: "116 123", href: "tel:116123" },
      { label: "Emergency medical services (Norway)", value: "113", href: "tel:113" },
    ],
  },
  estimatedMinutes: { min: 15, max: 30 },
  estimatedTime: {
    label: "ESTIMATED TIME · ",
    text: "approx. {min}–{max} minutes (depending on how many questions before analysis).",
  },
  contact: { label: "CONTACT · " },
  consent: {
    body:
      "I consent to {product} storing my name, age and email with {company} (Netlify, EU/US depending on hosting). My answers are sent to Google Gemini to generate questions and the report — not for any purpose other than this assessment. I have read the privacy notice. Processing in line with GDPR.",
    privacyLink: "privacy notice",
    required: "You must consent to storage to start.",
  },
  validation: {
    nameMin: "Enter at least 2 characters.",
    ageRange: "Age must be {min}–{max}.",
    emailInvalid: "Invalid email address.",
  },
  ageGuidance: {
    default: "Adapt language for an adult participant.",
    under20:
      "Participant is a young adult (under 20). Use clear, respectful language without a condescending tone. Examples and options may relate to school, friends, family and early identity exploration — not childish wording.",
    age20_29:
      "Participant is 20–29. Adapt wording to early adulthood: studies, career start, partnership, autonomy vs. belonging.",
    age30_44:
      "Participant is 30–44. Adapt to established adult life: work, relationships, responsibility, long-term patterns.",
    age45_59:
      "Participant is 45–59. Adapt to midlife: experience, priorities, relationship and career patterns over time.",
    age60plus:
      "Participant is 60+. Respect life experience; avoid oversimplification. Frame options around long-standing patterns, health and life stage — never ageist or condescending.",
  },
  footer: {
    privacy: "Privacy",
    contact: "Contact",
    crisis: "Crisis 116 123",
  },
  lang: { label: "Language" },
  intro: {
    version: "PSYCHOANALYTIC SYSTEM v2.4.1",
    titleLine1: "SOUL",
    titleLine2: "SCANNER",
    hint: "Choose the option that fits you best. The system is designed to surface self-deception.",
    beforeStart: "BEFORE WE START",
    name: "NAME",
    age: "AGE",
    email: "EMAIL",
    namePlaceholder: "First and last name",
    emailPlaceholder: "you@email.com",
    questionsFromTitle: "WHERE DO THE QUESTIONS COME FROM?",
    questionsFromBody:
      "Questions are generated on the fly by Soul Scanner — not taken from a fixed test booklet or quiz. For each person the system chooses the next question from what you have already answered, using established psychological frameworks and 15 thematic areas (e.g. childhood, attachment, boundaries and the shadow side). You get one question at a time with four options; the number of questions is tailored individually, usually between {minQ} and {maxQ}.",
    savedSessionTitle: "IN-PROGRESS SESSION FOUND",
    savedSessionBody: "Question {n} · {covered}/{total} categories covered",
    continue: "CONTINUE",
    startFresh: "START OVER",
    saving: "SAVING AND STARTING…",
    newAnalysis: "NEW SESSION",
    start: "START ASSESSMENT",
    disclaimer:
      "⚠ Not diagnosis or treatment. Number of questions is tailored individually (up to {maxQ}).",
  },
  progress: {
    dataCollection: "DATA COLLECTION",
    progress: "PROGRESS",
    questionShort: "Q",
    categoryCoverage: "CATEGORY COVERAGE",
    readyPrefix: "◆ Ready for analysis: ",
    pendingPrefix: "○ ",
  },
  question: {
    categoryFallback: "ANALYSIS",
    questionShort: "Q",
    processing: "PROCESSING",
    showFull: "SHOW FULL QUESTION",
    customOption: "E — None fit well · write your own answer",
    customTitle: "CUSTOM ANSWER",
    customPlaceholder: "Briefly describe what fits you best...",
    cancel: "CANCEL",
    sendAnswer: "SUBMIT ANSWER",
    psychologistOpinion: "◆ PSYCHOLOGIST'S VIEW",
    askPsychologist: "ASK THE PSYCHOLOGIST",
    askPlaceholder: "What do you think about...?",
    waiting: "WAITING...",
    ask: "ASK",
    askBtn: "◆ Ask the psychologist",
    rephraseBtn: "↻ Rephrase question",
    metaLimit: "Maximum {limit} extra requests per session used up.",
    retryAnalysis: "Try analysis again",
    readyForAnalysis: "THE PSYCHOLOGIST CONSIDERS THERE IS ENOUGH DATA FOR ANALYSIS",
    canRequestAnalysis: "YOU MAY REQUEST ANALYSIS (MIN. {min} QUESTIONS)",
    getAnalysisNow: "▶ GET ANALYSIS NOW",
  },
  analyzing: {
    phases: [
      "COMPRESSING ANSWERS",
      "MAPPING PATTERNS",
      "IDENTIFYING TENSIONS",
      "BUILDING FRAMEWORKS",
      "GENERATING REPORT",
    ],
    processingAnswers: "Processing {count} structured answers",
    retry: "Try again",
    step1: "Step 1/2: Compressing answers…",
    step2: "Step 2/2: Generating report…",
    reportReady: "Report ready",
  },
  report: {
    complete: "ANALYSIS COMPLETE",
    titleLine1: "PSYCHOANALYTIC",
    titleLine2: "REPORT",
    disclaimer:
      "⚠ This is not diagnosis, treatment or assessment by healthcare professionals. The report is structured AI mapping based on your answers.",
    shortSummary: "SHORT SUMMARY",
    copyShort: "Copy short summary",
    tabFull: "Full report",
    tabFrameworks: "By framework",
    overallInsight: "OVERALL INSIGHT",
    conflicts: "TENSIONS IN ANSWERS",
    clinicalFollowup: "CLINICAL FOLLOW-UP",
    keyThemes: "KEY THEMES",
    frameworkSummaries: "FRAMEWORK SUMMARIES",
    keyPatterns: "Key patterns: ",
    evidence: "Evidence: ",
    questionRef: "— Q {n}",
    observation: "Observation · ",
    interpretation: "Interpretation · ",
    uncertainty: "Uncertainty · ",
    noSectionContent: "(no content under this heading)",
    missingSections:
      "The report lacked expected ## sections. See raw text below.",
    noReportText: "No report text received. Start over or try generating the analysis again.",
    copyRaw: "COPY RAW TEXT",
    downloadPdf: "DOWNLOAD PDF",
    generatingPdf: "GENERATING PDF…",
    showRaw: "SHOW",
    hideRaw: "HIDE",
    rawText: "RAW TEXT",
    newAnalysis: "NEW SESSION",
    noCopyContent: "No report content.",
    pdfFilenamePrefix: "Rosten-Soul-Scanner-report",
  },
  errors: {
    analysisInterrupted:
      "Analysis was interrupted. Try «Get analysis now» or answer more questions.",
    requestTimeout: "The request took too long. Try again.",
    analysisTimeout: "Analysis took too long. Check your network and try again.",
    analysisFailed: "Analysis failed.",
    analysisNotGenerated:
      "Analysis was not generated. Try again or answer a few more questions.",
    fillParticipant: "Enter name, age and a valid email before starting.",
    consentRequired: "You must consent to storage before starting.",
    startFailed: "Could not start the session (invalid model response). Try again.",
    startNetwork: "Could not start the session. Check API key and network.",
    unexpectedResponse: "Unexpected response from the psychologist. You can continue or request analysis.",
    couldNotRead: "Could not read response ({detail}).",
    fetchFailed: "Could not fetch response from the psychologist.",
    opinionFailed: "Could not get the psychologist's response. Try again.",
    generateFailed: "Could not generate response. Try again.",
    metaLimit: "Maximum {limit} extra requests per session.",
  },
  privacy: {
    title: "PRIVACY NOTICE",
    back: "← BACK TO {product}",
    updated: "Last updated",
    sections: {
      controller: {
        title: "DATA CONTROLLER",
        body:
          "{company} ({name}) is the data controller for personal data you provide in {product}. Contact:",
      },
      data: {
        title: "DATA WE COLLECT",
        items: [
          "Name, age and email (when you start the assessment)",
          "Your answers and the generated report (stored locally in the browser during the session)",
          "Technical data via hosting (Netlify), e.g. IP address in server logs",
        ],
      },
      purpose: {
        title: "PURPOSE AND LEGAL BASIS",
        body:
          "We process data to run the assessment you request, store registration for follow-up, and improve the service. Legal basis: your consent (GDPR Art. 6(1)(a)) and legitimate interest in secure operation.",
      },
      gemini: {
        title: "GOOGLE GEMINI (AI)",
        body:
          "Questions and answers are sent to Google Gemini (Google's API) to generate the next question and the psychoanalytic report. Google may process data under its terms. We do not send data to other AI providers for this service. Do not submit sensitive personal data you do not want shared with the AI system.",
      },
      storage: {
        title: "STORAGE AND HOSTING",
        body:
          "Name, age and email are stored in Netlify Blobs (hosted by Netlify). Session data (questions/answers in progress) is stored primarily on your device until you end the session or clear browser data. When analysis is complete, registration is marked complete in our system.",
      },
      retention: {
        title: "HOW LONG WE KEEP DATA",
        body:
          "Participant registrations are kept until you request deletion or we perform routine cleanup. Contact us by email to delete your data.",
      },
      rights: {
        title: "YOUR RIGHTS",
        body:
          "You may request access, rectification, erasure, restriction, portability and withdraw consent. Complaints may be sent to the Norwegian Data Protection Authority. Contact us first at",
      },
      notHealthcare: {
        title: "NOT HEALTHCARE",
        body: "{product} is not diagnosis, treatment or emergency help. In a crisis, use the numbers below.",
      },
    },
    footerScanner: "Scanner",
    footerPrivacy: "Privacy",
  },
  admin: {
    title: "ADMIN",
    backScanner: "← SCANNER",
    refresh: "REFRESH",
    refreshing: "LOADING…",
    exportCsv: "EXPORT CSV",
    logout: "LOG OUT",
    passwordLabel: "ADMIN PASSWORD",
    login: "LOG IN",
    checking: "CHECKING…",
    loginFailed: "Login failed.",
    fetchFailed: "Could not fetch participants.",
    count: "{n} registration",
    countPlural: "{n} registrations",
    countSuffix: " (newest first)",
    empty: "No participants stored yet.",
    cols: {
      name: "Name",
      age: "Age",
      email: "Email",
      registered: "Registered",
      completed: "Completed",
      id: "ID",
    },
    yes: "Yes",
    no: "No",
  },
  api: {
    noAnswersYet: "(no structured answers yet)",
    answerLine: "#{index} [{category}] Question: {question}\nAnswer: {answer}{custom}",
    customSuffix: " (custom answer)",
    answerMsg: "[Answer to Q {n} ({category}): {text}]",
    unknownCategory: "unknown category",
    contextMsg:
      "[Context from app: This is answer #{n}. Max {max} questions total. At least {min} before analysis may be suggested. Assess coverage of all 15 categories individually this turn.]",
    sessionMsg:
      "[SESSION] {n} answers recorded. Next step: ask question {next} (JSON type question). Covered category ids: [{covered}].",
    noneCovered: "none",
    structuredAnswers: "STRUCTURED ANSWERS:",
    participantBlock:
      "[PARTICIPANT]\nName: {name}\nAge: {age}\nEmail: {email}\n\n[AGE ADJUSTMENT]\n{guidance}\nAdapt question text and the four answer options to age and life situation. Keep the same 15 categories and psychoanalytic depth.",
    invalidJsonRetry:
      "[SYSTEM: Previous response was invalid or truncated JSON. Return ONLY one valid JSON object on one line, no markdown. Use \\n for line breaks in strings. Next step: type question with question, category, questionNumber, options (4 items).]",
    forceAnalysis:
      "[SYSTEM: This is answer to Q {n}/{max}. Generate analysis NOW — no more questions.]",
    generateAnalysis: "[Generate full analysis]",
    startSession:
      "Start the assessment. Ask question 1 with 4 options. Max {max} questions total — number before analysis is assessed individually. Adapt language to the participant's age.",
    metaOpinion: "[META-QUESTION – not an answer to the active question. JSON opinion format]: {q}",
    metaRephrase:
      "[Rephrase Q {n} more simply. rephrase format, same category, 4 new options.]",
    analysisRetry:
      "[CRITICAL: Return full analysis JSON now. Required: frameworks with quote and question_index, short_summary, conflicts, clinical_followup, analysis with ## and Observation/Interpretation/Uncertainty.]",
  },
  dateLocale: "en-GB",
  htmlLang: "en",
};