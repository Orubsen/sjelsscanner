import { jsPDF } from "jspdf";

const LOGO_SRC = "/rosten-logo.svg";

/** Premium paper + clinical ink palette */
const C = {
  paper: [248, 246, 241],
  paperEdge: [235, 230, 222],
  ink: [26, 32, 44],
  inkSoft: [72, 82, 100],
  inkMuted: [120, 128, 142],
  accent: [99, 102, 241],
  accentSoft: [230, 228, 252],
  bronze: [140, 118, 88],
  rule: [200, 195, 186],
  boxBg: [252, 251, 248],
};

const MARGIN = 20;
const FOOTER_H = 14;
const LOGO_HEADER_MM = 14;
const LOGO_COVER_MM = 38;
/** Space below logo + separator before body text */
const HEADER_H = LOGO_HEADER_MM + 14;
const BODY_SIZE = 10.5;
const BODY_LINE = 5.8;
const BOX_PAD = 6;

const FRAMEWORK_LABELS = {
  attachment: "Tilknytning",
  defense_mechanisms: "Forsvarsmekanismer",
  jungian_archetypes: "Jungianske arketyper",
  freudian_analysis: "Freudiansk analyse",
  ace_impact: "ACE-påvirkning",
};

const FRAMEWORK_ORDER = [
  "attachment",
  "defense_mechanisms",
  "jungian_archetypes",
  "freudian_analysis",
  "ace_impact",
];

let cachedLogoDataUrl = null;

function frameworkKeys(frameworks) {
  if (!frameworks || typeof frameworks !== "object") return [];
  return FRAMEWORK_ORDER.filter((fw) => frameworks[fw]).concat(
    Object.keys(frameworks).filter((fw) => !FRAMEWORK_ORDER.includes(fw))
  );
}

export function reportPdfFilename(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `Røsten-Sjelsscanner-rapport-${dd}-${mm}-${yyyy}.pdf`;
}

function rasterizeSvgToPng(svgText, size = 512) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Kunne ikke laste logo"));
    };
    img.src = objectUrl;
  });
}

async function loadLogoDataUrl() {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  const res = await fetch(LOGO_SRC);
  if (!res.ok) throw new Error("Logo-fil ikke funnet");
  const svgText = await res.text();
  cachedLogoDataUrl = await rasterizeSvgToPng(svgText);
  return cachedLogoDataUrl;
}

function setFill(doc, rgb) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}

function setDraw(doc, rgb) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}

function setInk(doc, soft = false, muted = false) {
  if (muted) doc.setTextColor(C.inkMuted[0], C.inkMuted[1], C.inkMuted[2]);
  else if (soft) doc.setTextColor(C.inkSoft[0], C.inkSoft[1], C.inkSoft[2]);
  else doc.setTextColor(C.ink[0], C.ink[1], C.ink[2]);
}

function lineHeightMm(doc, fontSize) {
  const factor = typeof doc.getLineHeightFactor === "function" ? doc.getLineHeightFactor() : 1.15;
  return (fontSize * 0.352778) * factor;
}

function measureWrappedText(doc, text, maxWidth, fontSize, fontStyle = "normal") {
  doc.setFont("helvetica", fontStyle);
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(String(text).trim(), maxWidth);
  const lh = lineHeightMm(doc, fontSize);
  return { lines, lineHeight: lh, height: lines.length * lh + 1 };
}

function printLines(doc, lines, x, startY, lineHeight) {
  let ty = startY;
  for (const line of lines) {
    doc.text(line, x, ty);
    ty += lineHeight;
  }
  return ty;
}

function pageSize(doc) {
  return {
    w: doc.internal.pageSize.getWidth(),
    h: doc.internal.pageSize.getHeight(),
  };
}

function paintPaper(doc) {
  const { w, h } = pageSize(doc);
  setFill(doc, C.paper);
  doc.rect(0, 0, w, h, "F");
}

function parseAnalysisSections(raw) {
  const text = (raw || "").trim();
  if (!text) return [];
  const parts = text.split(/\r?\n##\s*/).filter(Boolean);
  return parts.map((s, i) => {
    if (i === 0 && !/^#/.test(s.trim())) {
      return { title: null, content: s.trim() };
    }
    const lines = s.split(/\r?\n/);
    return {
      title: lines[0].replace(/^#+\s*/, "").trim(),
      content: lines.slice(1).join("\n").trim(),
    };
  });
}

/** Plain-text report for clipboard */
export function buildReportPlainText(data, raw) {
  const lines = [];
  const date = new Date().toLocaleDateString("nb-NO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  lines.push("RØSTEN — SJELSSCANNER · PSYKOANALYTISK RAPPORT");
  lines.push(`Generert: ${date}`);
  lines.push("");

  if (data?.short_summary) {
    lines.push("KORTVERSJON");
    lines.push(data.short_summary);
    lines.push("");
  }

  if (data?.overall_insight) {
    lines.push("OVERORDNET INNSIKT");
    lines.push(data.overall_insight);
    lines.push("");
  }

  if (data?.key_themes?.length) {
    lines.push("NØKKELTEMAER");
    lines.push(data.key_themes.join(" · "));
    lines.push("");
  }

  if (data?.conflicts?.length) {
    lines.push("SPENNINGER I SVARENE");
    data.conflicts.forEach((c) => lines.push(`- ${c}`));
    lines.push("");
  }

  if (data?.clinical_followup) {
    lines.push("KLINISK VIDERE UTFORSKING");
    lines.push(data.clinical_followup);
    lines.push("");
  }

  const body = (raw || data?.analysis || "").trim();
  if (body) {
    lines.push("HELHETSRAPPORT");
    lines.push(body);
    lines.push("");
  }

  const fws = data?.frameworks;
  for (const fw of frameworkKeys(fws)) {
    const info = fws[fw];
    lines.push("");
    lines.push((FRAMEWORK_LABELS[fw] || fw).toUpperCase());
    if (info && typeof info === "object") {
      if (info.summary) lines.push(info.summary);
      const patterns = info.key_patterns ?? info.key_traits;
      if (Array.isArray(patterns) && patterns.length) {
        lines.push(`Nøkkelmønstre: ${patterns.join(", ")}`);
      }
      const evidence = info.evidence_from_answers ?? info.evidence;
      if (evidence) lines.push(`Belegg fra svar: ${evidence}`);
    } else if (info) lines.push(String(info));
  }

  return lines.join("\n").trim() || "Ingen rapportinnhold.";
}

function drawCoverPage(doc, logoDataUrl, dateLabel, participant) {
  const { w, h } = pageSize(doc);
  paintPaper(doc);

  setDraw(doc, C.bronze);
  doc.setLineWidth(0.35);
  doc.rect(14, 14, w - 28, h - 28, "S");
  doc.setLineWidth(0.15);
  setDraw(doc, C.rule);
  doc.rect(18, 18, w - 36, h - 36, "S");

  const cx = w / 2;
  let y = 52;

  if (logoDataUrl) {
    const lw = LOGO_COVER_MM;
    doc.addImage(logoDataUrl, "PNG", cx - lw / 2, y, lw, lw);
    y += lw + 14;
  } else {
    y += 20;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setInk(doc, false, true);
  doc.text("KONFIDENSIELL KLINISK VURDERING", cx, y, { align: "center" });
  y += 12;

  setDraw(doc, C.bronze);
  doc.setLineWidth(0.5);
  doc.line(cx - 42, y, cx + 42, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  setInk(doc);
  doc.text("PSYKOANALYTISK", cx, y, { align: "center" });
  y += 11;
  doc.setFontSize(22);
  doc.setTextColor(C.accent[0], C.accent[1], C.accent[2]);
  doc.text("RAPPORT", cx, y, { align: "center" });
  setInk(doc);
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  setInk(doc, true);
  doc.text("Røsten · Sjelsscanner", cx, y, { align: "center" });
  y += 10;

  const participantName = String(participant?.name || "").trim();
  if (participantName) {
    doc.setFontSize(11);
    setInk(doc);
    doc.text(participantName, cx, y, { align: "center" });
    y += 7;
    if (participant?.age) {
      doc.setFontSize(9);
      setInk(doc, true);
      doc.text(`Alder: ${participant.age}`, cx, y, { align: "center" });
      y += 8;
    }
  }

  setDraw(doc, C.rule);
  doc.setLineWidth(0.2);
  doc.line(cx - 50, y, cx + 50, y);
  y += 8;

  doc.setFontSize(10);
  setInk(doc, false, true);
  doc.text(dateLabel, cx, y, { align: "center" });
  y += 18;

  const blurb =
    "Denne rapporten er generert ut fra strukturert datainnsamling og etablerte psykologiske rammeverk. Den er ment som en seriøs, faktabasert vurdering — ikke som diagnose eller erstatning for faglig behandling.";
  doc.setFontSize(9.5);
  setInk(doc, true);
  const blurbLines = doc.splitTextToSize(blurb, w - 70);
  doc.text(blurbLines, cx, y, { align: "center" });

  const methods = [
    "Big Five",
    "Tilknytningsteori",
    "Forsvarsmekanismer",
    "Jungianske arketyper",
    "Freudiansk analyse",
    "ACE-forskning",
  ];
  y = h - 48;
  setDraw(doc, C.rule);
  doc.line(40, y, w - 40, y);
  y += 6;
  doc.setFontSize(7.5);
  setInk(doc, false, true);
  doc.text("METODOLOGISKE RAMMEVERK", cx, y, { align: "center" });
  y += 5;
  doc.text(methods.join("  ·  "), cx, y, { align: "center" });
}

function drawRunningHeader(doc, logoDataUrl) {
  const { w } = pageSize(doc);
  const top = MARGIN;
  const logoX = w - MARGIN - LOGO_HEADER_MM;
  const ruleEndX = logoX - 4;

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", logoX, top, LOGO_HEADER_MM, LOGO_HEADER_MM);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  setInk(doc);
  doc.text("RØSTEN · SJELSSCANNER", MARGIN, top + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setInk(doc, false, true);
  doc.text("Psykoanalytisk rapport", MARGIN, top + 9);

  const ruleY = top + LOGO_HEADER_MM + 2;
  setDraw(doc, C.accent);
  doc.setLineWidth(0.45);
  doc.line(MARGIN, ruleY, ruleEndX, ruleY);
}

function drawRunningFooter(doc, pageIndex, totalPages) {
  const { w, h } = pageSize(doc);
  const y = h - FOOTER_H + 2;

  setDraw(doc, C.rule);
  doc.setLineWidth(0.15);
  doc.line(MARGIN, y - 3, w - MARGIN, y - 3);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setInk(doc, false, true);
  doc.text("Konfidensiell — kun for mottaker", MARGIN, y + 2);
  doc.text(`© ${new Date().getFullYear()} RØSTEN ENT`, w / 2, y + 2, { align: "center" });
  doc.text(`Side ${pageIndex} av ${totalPages}`, w - MARGIN, y + 2, { align: "right" });
}

function createLayout(doc, logoDataUrl, startPageIndex = 2) {
  const { w, h } = pageSize(doc);
  const contentLeft = MARGIN;
  const contentRight = w - MARGIN;
  const contentWidth = contentRight - contentLeft;
  const contentTop = MARGIN + HEADER_H;
  const contentBottom = h - FOOTER_H - 4;

  let pageIndex = startPageIndex;
  let y = contentTop;

  const newContentPage = () => {
    doc.addPage();
    pageIndex += 1;
    paintPaper(doc);
    drawRunningHeader(doc, logoDataUrl);
    y = contentTop;
  };

  const ensureSpace = (neededMm) => {
    if (y + neededMm > contentBottom) {
      newContentPage();
    }
  };

  const writeParagraph = (text, opts = {}) => {
    const {
      fontSize = BODY_SIZE,
      lineHeight = BODY_LINE,
      indent = 0,
      soft = false,
      italic = false,
    } = opts;
    if (!text?.trim()) return;

    doc.setFont("helvetica", italic ? "italic" : "normal");
    doc.setFontSize(fontSize);
    setInk(doc, soft);

    const lines = doc.splitTextToSize(text.trim(), contentWidth - indent);
    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, contentLeft + indent, y);
      y += lineHeight;
    }
    y += 2;
    setInk(doc);
  };

  const writeSectionTitle = (title) => {
    if (!title) return;
    ensureSpace(18);
    y += 4;

    setFill(doc, C.accent);
    doc.rect(contentLeft, y - 3, 2.5, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(C.accent[0], C.accent[1], C.accent[2]);
    doc.text(title.toUpperCase(), contentLeft + 6, y + 3);
    setInk(doc);
    y += 10;

    setDraw(doc, C.rule);
    doc.setLineWidth(0.12);
    doc.line(contentLeft, y, contentRight, y);
    y += 6;
  };

  const writeMajorPart = (label) => {
    ensureSpace(22);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setInk(doc, false, true);
    doc.text(label, contentLeft, y);
    y += 5;
    setDraw(doc, C.bronze);
    doc.setLineWidth(0.35);
    doc.line(contentLeft, y, contentLeft + 36, y);
    y += 8;
    setInk(doc);
  };

  const drawFilledBox = (boxY, boxH, variant = "insight") => {
    if (variant === "insight") {
      setFill(doc, C.accentSoft);
      setDraw(doc, C.accent);
      doc.setLineWidth(0.2);
      doc.roundedRect(contentLeft, boxY, contentWidth, boxH, 2, 2, "FD");
    } else {
      setFill(doc, C.boxBg);
      setDraw(doc, C.rule);
      doc.setLineWidth(0.15);
      doc.roundedRect(contentLeft, boxY, contentWidth, boxH, 2, 2, "FD");
      setFill(doc, C.bronze);
      doc.rect(contentLeft, boxY, 1.2, boxH, "F");
    }
  };

  const writeInsightBox = (title, body) => {
    if (!body?.trim()) return;
    const textX = contentLeft + BOX_PAD;
    const innerW = contentWidth - BOX_PAD * 2;

    const titleM = measureWrappedText(doc, title, innerW, 8, "bold");
    const bodyM = measureWrappedText(doc, body, innerW, BODY_SIZE, "normal");
    const boxH = BOX_PAD + titleM.height + 3 + bodyM.height + BOX_PAD + 2;
    const maxPageBody = contentBottom - contentTop - 16;

    if (boxH > maxPageBody) {
      writeSectionTitle(title);
      writeParagraph(body, { soft: true });
      y += 4;
      return;
    }

    const spaceLeft = contentBottom - y;
    if (boxH > spaceLeft) {
      newContentPage();
    }

    ensureSpace(boxH + 6);
    const boxY = y;
    drawFilledBox(boxY, boxH, "insight");

    let ty = boxY + BOX_PAD;
    doc.setTextColor(C.accent[0], C.accent[1], C.accent[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    ty = printLines(doc, titleM.lines, textX, ty, titleM.lineHeight) + 3;

    setInk(doc, true);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(BODY_SIZE);
    printLines(doc, bodyM.lines, textX, ty, bodyM.lineHeight);

    y = boxY + boxH + 8;
    setInk(doc);
  };

  const writeThemeTags = (themes) => {
    if (!themes?.length) return;
    writeSectionTitle("Nøkkeltemaer");
    ensureSpace(12);
    let x = contentLeft;
    const tagH = 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    for (const theme of themes) {
      const label = String(theme);
      const tw = doc.getTextWidth(label) + 6;
      if (x + tw > contentRight) {
        x = contentLeft;
        y += tagH + 3;
        ensureSpace(tagH + 3);
      }
      setFill(doc, C.boxBg);
      setDraw(doc, C.rule);
      doc.setLineWidth(0.12);
      doc.roundedRect(x, y - 5, tw, tagH, 1.5, 1.5, "FD");
      setInk(doc, true);
      doc.text(label, x + 3, y);
      x += tw + 3;
    }
    y += tagH + 8;
    setInk(doc);
  };

  const writeFrameworkCard = (label, info) => {
    const parts = [];
    if (info?.summary) parts.push(info.summary);
    const patterns = info?.key_patterns ?? info?.key_traits;
    if (Array.isArray(patterns) && patterns.length) {
      parts.push(`Nøkkelmønstre: ${patterns.join(", ")}`);
    }
    const evidence = info?.evidence_from_answers ?? info?.evidence;
    if (evidence) parts.push(`Belegg fra svar: ${evidence}`);
    const body = parts.join("\n\n") || (info ? String(info) : "");
    if (!body.trim()) return;

    const textX = contentLeft + BOX_PAD + 3;
    const innerW = contentWidth - BOX_PAD * 2 - 4;
    const maxPageBody = contentBottom - contentTop - 20;

    const titleM = measureWrappedText(doc, label.toUpperCase(), innerW, 7.5, "bold");
    const bodyM = measureWrappedText(doc, body, innerW, BODY_SIZE, "normal");
    const boxH = BOX_PAD + titleM.height + 3 + bodyM.height + BOX_PAD + 2;

    if (boxH > maxPageBody) {
      writeSectionTitle(label);
      writeParagraph(body, { soft: true });
      y += 4;
      return;
    }

    const spaceLeft = contentBottom - y;
    if (boxH > spaceLeft) {
      newContentPage();
    }

    const boxY = y;
    drawFilledBox(boxY, boxH, "framework");

    let ty = boxY + BOX_PAD;
    setInk(doc, false, true);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    ty = printLines(doc, titleM.lines, textX, ty, titleM.lineHeight) + 3;

    setInk(doc, true);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(BODY_SIZE);
    printLines(doc, bodyM.lines, textX, ty, bodyM.lineHeight);

    y = boxY + boxH + 8;
    setInk(doc);
  };

  return {
    contentLeft,
    contentWidth,
    newContentPage,
    ensureSpace,
    writeParagraph,
    writeSectionTitle,
    writeMajorPart,
    writeInsightBox,
    writeThemeTags,
    writeFrameworkCard,
    getPageIndex: () => pageIndex,
  };
}

export async function downloadReportPdf(
  data,
  raw,
  filename = reportPdfFilename(),
  participant = null,
  frameworkLabelsOverride = null
) {
  const labels = frameworkLabelsOverride || FRAMEWORK_LABELS;
  const logoDataUrl = await loadLogoDataUrl().catch(() => null);
  const dateLabel = new Date().toLocaleDateString("nb-NO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  drawCoverPage(doc, logoDataUrl, dateLabel, participant);

  doc.addPage();
  paintPaper(doc);
  drawRunningHeader(doc, logoDataUrl);

  const L = createLayout(doc, logoDataUrl, 2);

  L.writeMajorPart("Sammendrag");

  if (data?.overall_insight) {
    L.writeInsightBox("Overordnet innsikt", data.overall_insight);
  }

  if (data?.key_themes?.length) {
    L.writeThemeTags(data.key_themes);
  }

  const sections = parseAnalysisSections(raw || data?.analysis || "");
  if (sections.length) {
    L.newContentPage();
    L.writeMajorPart("Helhetsrapport");

    for (const sec of sections) {
      if (sec.title) {
        L.writeSectionTitle(sec.title);
      }
      L.writeParagraph(sec.content, { soft: true });
      L.ensureSpace(4);
    }
  }

  const fws = data?.frameworks;
  const fwKeys = frameworkKeys(fws);
  if (fwKeys.length) {
    L.newContentPage();
    L.writeMajorPart("Rammeverk — kliniske perspektiver");

    for (const fw of fwKeys) {
      L.writeFrameworkCard(labels[fw] || fw, fws[fw]);
    }
  }

  const totalPages = doc.getNumberOfPages();
  for (let p = 2; p <= totalPages; p++) {
    doc.setPage(p);
    drawRunningFooter(doc, p, totalPages);
  }

  doc.save(filename);
}