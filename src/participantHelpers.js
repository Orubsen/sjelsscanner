import { getValidationMessages, getAgeGuidance as getAgeGuidanceI18n, buildParticipantContext as buildParticipantContextI18n } from "./i18n/apiMessages.js";

export const MIN_PARTICIPANT_AGE = 16;
export const MAX_PARTICIPANT_AGE = 99;

export const EMPTY_PARTICIPANT = { name: "", age: "", email: "" };

export function validateParticipant(raw, locale = "nb") {
  const name = String(raw?.name ?? "").trim();
  const ageNum = parseInt(String(raw?.age ?? "").trim(), 10);
  const email = String(raw?.email ?? "").trim().toLowerCase();
  const errors = {};
  const msg = getValidationMessages(locale);

  if (name.length < 2) errors.name = msg.nameMin;
  if (!Number.isFinite(ageNum) || ageNum < MIN_PARTICIPANT_AGE || ageNum > MAX_PARTICIPANT_AGE) {
    errors.age = msg.ageRange
      .replace("{min}", String(MIN_PARTICIPANT_AGE))
      .replace("{max}", String(MAX_PARTICIPANT_AGE));
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = msg.emailInvalid;
  }

  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    errors,
    normalized: valid ? { name, age: ageNum, email } : null,
  };
}

export function getAgeGuidance(age, locale = "nb") {
  return getAgeGuidanceI18n(age, locale);
}

export function buildParticipantContext(participant, locale = "nb") {
  const { valid, normalized } = validateParticipant(participant, locale);
  if (!valid || !normalized) return "";
  return buildParticipantContextI18n(normalized, locale);
}