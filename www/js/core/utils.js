export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const chance = (probability) => Math.random() < probability;
export const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
export const pick = (items) => items[Math.floor(Math.random() * items.length)];
export const deepClone = (value) => structuredClone(value);

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function formatMoney(value) {
  return `${Math.round(value || 0).toLocaleString('ru-RU')} руб.`;
}

export function formatDate(calendar) {
  return `${String(calendar.day).padStart(2, '0')}.${String(calendar.month).padStart(2, '0')}.${calendar.year}`;
}

const EMOJI_PATTERN = /[\u{1F000}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;

export function stripEmoji(value) {
  return String(value ?? '')
    .replace(EMOJI_PATTERN, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function escapeHtml(value) {
  return stripEmoji(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function normalizedText(value) {
  return String(value ?? '').trim().toLocaleLowerCase('ru-RU');
}

export function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}
