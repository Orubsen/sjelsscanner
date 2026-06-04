export const MIN_PARTICIPANT_AGE = 16;
export const MAX_PARTICIPANT_AGE = 99;

export const EMPTY_PARTICIPANT = { name: "", age: "", email: "" };

export function validateParticipant(raw) {
  const name = String(raw?.name ?? "").trim();
  const ageNum = parseInt(String(raw?.age ?? "").trim(), 10);
  const email = String(raw?.email ?? "").trim().toLowerCase();
  const errors = {};

  if (name.length < 2) errors.name = "Skriv minst 2 tegn.";
  if (!Number.isFinite(ageNum) || ageNum < MIN_PARTICIPANT_AGE || ageNum > MAX_PARTICIPANT_AGE) {
    errors.age = `Alder må være ${MIN_PARTICIPANT_AGE}–${MAX_PARTICIPANT_AGE}.`;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Ugyldig e-postadresse.";
  }

  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    errors,
    normalized: valid ? { name, age: ageNum, email } : null,
  };
}

/** Guidance for the model — wording and life-stage framing, not different categories. */
export function getAgeGuidance(age) {
  const a = Number(age);
  if (!Number.isFinite(a)) return "Tilpass språk til voksen deltaker.";
  if (a < 20) {
    return "Deltaker er ung voksen (under 20). Bruk klart, respektfullt språk uten nedlatende tone. Eksempler og alternativer kan knyttes til skole, venner, familie og tidlig identitetsutforskning — ikke barnespråk.";
  }
  if (a < 30) {
    return "Deltaker er 20–29. Tilpass formuleringer til tidlig voksenliv: studier, karrierestart, partnerskap, autonomi vs. tilhørighet.";
  }
  if (a < 45) {
    return "Deltaker er 30–44. Tilpass til etablert voksenliv: arbeid, relasjoner, ansvar, langsiktige mønstre.";
  }
  if (a < 60) {
    return "Deltaker er 45–59. Tilpass til midtliv: erfaring, prioriteringer, relasjons- og karrieremønstre over tid.";
  }
  return "Deltaker er 60+. Respekter livserfaring; unngå forenkling. Formuler alternativer som kan gjelde langvarige mønstre, helse og livsfase — aldri aldersdiskriminerende eller nedlatende.";
}

export function buildParticipantContext(participant) {
  const { valid, normalized } = validateParticipant(participant);
  if (!valid || !normalized) return "";
  return (
    `[DELTAKER]\nNavn: ${normalized.name}\nAlder: ${normalized.age}\nE-post: ${normalized.email}\n\n[ALDERSJUSTERING]\n${getAgeGuidance(normalized.age)}\nTilpass spørsmålstekst og de fire svaralternativene til alder og livssituasjon. Behold samme 15 kategorier og psykoanalytisk dybde.`
  );
}