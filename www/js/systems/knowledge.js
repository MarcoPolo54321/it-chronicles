// Временные знания от быстрых материалов. Один игровой месяц = 30 дней.
export const BOOK_COOLDOWN_DAYS = 180;
export const BOOK_KNOWLEDGE_DAYS = 360;

export function ensureKnowledge(game) {
  game.education ||= {};
  game.education.bookKnowledge ||= {};
  return game.education.bookKnowledge;
}

export function knowledgeDay(game) {
  return Math.max(0, Number(game.calendar?.totalDays || 0));
}

export function bookKnowledgeEntry(game, materialId) {
  return ensureKnowledge(game)[materialId] || null;
}

export function bookCooldownDaysRemaining(game, material) {
  const entry = bookKnowledgeEntry(game, material?.id);
  if (!entry) return 0;
  return Math.max(0, Number(entry.cooldownUntilDay || 0) - knowledgeDay(game));
}

export function bookCooldownMonthsRemaining(game, material) {
  return Math.ceil(bookCooldownDaysRemaining(game, material) / 30);
}

function entrySkillAmount(entry, skillId) {
  if (entry?.skills && typeof entry.skills === 'object') {
    return Math.max(0, Number(entry.skills[skillId] || 0));
  }
  return entry?.skillId === skillId ? Math.max(0, Number(entry.amount || 0)) : 0;
}

export function knowledgeBonus(game, skillId) {
  const today = knowledgeDay(game);
  return Object.values(ensureKnowledge(game)).reduce((sum, entry) => {
    if (Number(entry.expiresAtDay || 0) <= today) return sum;
    return sum + entrySkillAmount(entry, skillId);
  }, 0);
}

export function effectiveSkillLevel(game, skillId) {
  return Math.min(20, Math.max(0, Number(game.skills?.[skillId]?.level || 0)) + knowledgeBonus(game, skillId));
}


export function temporaryKnowledgeAmount(game, skillId) {
  return knowledgeBonus(game, skillId);
}

export function consumeKnowledgeForOrder(game, requirements = {}) {
  const costs = Object.fromEntries(Object.entries(requirements || {})
    .map(([skillId, amount]) => [skillId, Math.max(0, Math.ceil(Number(amount || 0)))])
    .filter(([, amount]) => amount > 0));
  for (const [skillId, amount] of Object.entries(costs)) {
    if (effectiveSkillLevel(game, skillId) < amount) {
      return { ok:false, message:`Недостаточно навыка «${skillId}»: нужно ${amount}` };
    }
  }

  const today = knowledgeDay(game);
  const spent = {};
  const shortage = {};
  let totalShortage = 0;
  for (const [skillId, amount] of Object.entries(costs)) {
    let remaining = amount;
    const entries = Object.values(ensureKnowledge(game))
      .filter((entry) => Number(entry.expiresAtDay || 0) > today && entrySkillAmount(entry, skillId) > 0)
      .sort((a, b) => Number(a.expiresAtDay || 0) - Number(b.expiresAtDay || 0));
    let temporary = 0;
    for (const entry of entries) {
      if (remaining <= 0) break;
      entry.skills ||= {};
      const available = Math.max(0, Number(entry.skills[skillId] || 0));
      const used = Math.min(remaining, available);
      if (!used) continue;
      entry.skills[skillId] = Math.max(0, available - used);
      if (entry.skillId === skillId) entry.amount = Math.max(0, Number(entry.amount || 0) - used);
      temporary += used;
      remaining -= used;
    }
    const deficit = Math.max(0, remaining);
    if (deficit > 0) {
      shortage[skillId] = deficit;
      totalShortage += deficit;
    }
    spent[skillId] = { total:amount, temporary, permanent:0, shortage:deficit };
  }
  return { ok:true, spent, shortage, totalShortage, usedTemporaryOnly: totalShortage === 0 };
}

export function grantTemporaryKnowledge(game, material) {
  const skills = Object.fromEntries(
    Object.entries(material?.skillGains || {})
      .map(([skillId, amount]) => [skillId, Math.max(0, Number(amount || 0))])
      .filter(([, amount]) => amount > 0)
  );
  const fallbackSkill = material?.focusSkill || material?.focus;
  if (!Object.keys(skills).length && fallbackSkill) skills[fallbackSkill] = 1;
  if (!Object.keys(skills).length) return null;

  const today = knowledgeDay(game);
  const previous = bookKnowledgeEntry(game, material.id);
  const cooldownDays = Math.max(30, Number(material.cooldownMonths || 6) * 30);
  const knowledgeDays = Math.max(cooldownDays, Number(material.knowledgeMonths || 12) * 30);
  const primarySkill = material.focusSkill || material.focus || Object.keys(skills)[0];
  const entry = {
    materialId: material.id,
    bookId: material.id,
    name: material.name,
    skillId: primarySkill,
    amount: Math.max(1, Number(skills[primarySkill] || 1)),
    skills,
    learnedAtDay: today,
    cooldownUntilDay: today + cooldownDays,
    expiresAtDay: today + knowledgeDays,
    timesRead: Number(previous?.timesRead || 0) + 1
  };
  ensureKnowledge(game)[material.id] = entry;
  return entry;
}

// Совместимость со старыми сохранениями и вызовами до v0.16.7.
export function grantBookKnowledge(game, book) {
  return grantTemporaryKnowledge(game, book);
}

export function activeKnowledgeEntries(game) {
  const today = knowledgeDay(game);
  return Object.values(ensureKnowledge(game)).filter((entry) => Number(entry.expiresAtDay || 0) > today && Object.values(entry.skills || {}).some((amount) => Number(amount || 0) > 0));
}

export function processExpiredKnowledge(game) {
  const today = knowledgeDay(game);
  const expired = [];
  const knowledge = ensureKnowledge(game);
  for (const [id, entry] of Object.entries(knowledge)) {
    if (Number(entry.expiresAtDay || 0) > today) continue;
    expired.push(entry);
    delete knowledge[id];
  }
  return expired;
}
