// v0.15.3: education is grouped by professional direction rather than source type.
// Quick materials take one in-game day. Formal education keeps realistic campaign scale:
// one year for a technical college and five years for a university.

import { EDUCATION_V152, EDUCATION_V152_ADJACENCY } from './education-v152.js';

export const EDUCATION_SKILL_IDS = ['hardware','software','networking','repair','security','data','communication','management'];

function relation(focus, skill) {
  if (focus === skill) return 1;
  return Number(EDUCATION_V152_ADJACENCY?.[focus]?.[skill] || 0);
}

function universityGains(item) {
  const rating = Math.max(1, Number(item.rating || 1));
  return Object.fromEntries(EDUCATION_SKILL_IDS.map((skill) => {
    if (skill === item.focus) return [skill, rating];
    // A 48/50 university gives roughly 31–38 points in other areas.
    const value = Math.round(rating * (0.64 + relation(item.focus, skill) * 0.18));
    return [skill, Math.max(1, value)];
  }));
}

function collegeGains(item) {
  const rating = Math.max(1, Number(item.rating || 1));
  return Object.fromEntries(EDUCATION_SKILL_IDS.map((skill) => {
    if (skill === item.focus) return [skill, rating];
    const value = Math.round(rating * (0.45 + relation(item.focus, skill) * 0.25));
    return [skill, Math.max(1, value)];
  }));
}

function quickGains(item) {
  const rating = Math.max(1, Number(item.rating || 1));
  const main = item.type === 'lecture' ? Math.max(2, Math.round(rating * 0.72)) : rating;
  const gains = { [item.focus]: main };
  for (const skill of EDUCATION_SKILL_IDS) {
    if (skill === item.focus) continue;
    const rel = relation(item.focus, skill);
    if (rel < 0.25) continue;
    const value = item.type === 'forum'
      ? Math.max(1, Math.round(rating * rel * 0.22))
      : Math.max(1, Math.round(rating * rel * 0.28));
    if (value > 0) gains[skill] = value;
  }
  return gains;
}

function upgrade(item) {
  const formal = item.type === 'college' || item.type === 'university';
  const skillGains = item.type === 'university'
    ? universityGains(item)
    : item.type === 'college'
      ? collegeGains(item)
      : quickGains(item);
  return {
    ...item,
    educationKind: formal ? 'formal' : 'quick',
    durationDays: item.type === 'college' ? 360 : item.type === 'university' ? 1800 : 1,
    academicYears: item.type === 'college' ? 1 : item.type === 'university' ? 5 : 0,
    condensedOneDay: !formal,
    skillGains,
    desc: String(item.desc || '').replace(/\s+/g, ' ').trim()
  };
}

export const EDUCATION_V153 = EDUCATION_V152.map(upgrade);
export const EDUCATION_V153_COUNTS = {
  quick: EDUCATION_V153.filter((item) => item.educationKind === 'quick').length,
  colleges: EDUCATION_V153.filter((item) => item.type === 'college').length,
  universities: EDUCATION_V153.filter((item) => item.type === 'university').length,
  total: EDUCATION_V153.length
};
