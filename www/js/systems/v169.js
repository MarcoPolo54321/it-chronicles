import { clamp } from '../core/utils.js';
import { SKILLS } from '../data/progression.js';
import { CAREER_SKILL_MATRIX_V169, LIFESTYLE_PLANS_V169 } from '../data/v169.js';
import { addLog, addMoney, addSkillXp, getInflation, maxEnergy, passiveWorkspaceRecovery } from './progression.js';
import { activityPlan, employeeWorkContribution } from './v08.js';
import { difficultyModeV180, orderWorkModeV180 } from './v180.js';

const BASE_PRICE_SCALE = 0.45;

export function lifestylePlanById(id) {
  return LIFESTYLE_PLANS_V169.find((item) => item.id === id) || LIFESTYLE_PLANS_V169[0];
}

export function lifestyleDailyCost(game, planOrId = null) {
  const plan = typeof planOrId === 'string' ? lifestylePlanById(planOrId) : planOrId || lifestylePlan(game);
  const yearIndex = Math.max(.6, Number(getInflation(game) || BASE_PRICE_SCALE) / BASE_PRICE_SCALE);
  return Math.max(0, Math.round(Number(plan.dailyCost || 0) * yearIndex));
}

// Совместимость со старыми вызовами: значение теперь является дневной, а не месячной ценой.
export function lifestyleMonthlyCost(game, planOrId = null) {
  return lifestyleDailyCost(game, planOrId);
}

export function ensureV169(game) {
  game.lifestyle ||= { planId:'economy', selectedAt:{...game.calendar}, totalSpent:0, lastChargedDay:-1 };
  if (!LIFESTYLE_PLANS_V169.some((item) => item.id === game.lifestyle.planId)) game.lifestyle.planId = 'economy';
  game.lifestyle.totalSpent = Math.max(0, Number(game.lifestyle.totalSpent || 0));
  game.lifestyle.lastChargedDay = Number.isFinite(Number(game.lifestyle.lastChargedDay)) ? Number(game.lifestyle.lastChargedDay) : -1;
  game.skillUsage ||= {};
  const now = Math.max(0, Number(game.calendar?.totalDays || 0));
  for (const meta of SKILLS) {
    const skill = game.skills?.[meta.id] || { level:0, xp:0 };
    const usage = game.skillUsage[meta.id] || {};
    usage.lastUsedDay = Number.isFinite(Number(usage.lastUsedDay)) ? Number(usage.lastUsedDay) : now;
    usage.protectedLevel = Math.max(0, Math.min(Number(skill.level || 0), Number.isFinite(Number(usage.protectedLevel)) ? Number(usage.protectedLevel) : Number(skill.level || 0)));
    usage.lastLevelDecayDay = Number.isFinite(Number(usage.lastLevelDecayDay)) ? Number(usage.lastLevelDecayDay) : now;
    game.skillUsage[meta.id] = usage;
  }
  game.education ||= {};
  if (game.education.active && !game.education.active.ready) {
    game.education.active.daysLeft = 0;
    game.education.active.totalDays = 0;
    game.education.active.ready = true;
  }
  for (const order of game.orders?.active || []) {
    if (order.status === 'working' && orderWorkModeV180(order) !== 'project') {
      order.progressDays = Number(order.totalWorkDays || order.workDays || 0);
    }
  }
  game.parallel ||= { totalOrderProgress:0, totalStudyProgress:0 };
  game.parallel.totalOrderProgress = Math.max(0, Number(game.parallel.totalOrderProgress || 0));
  game.parallel.totalStudyProgress = Math.max(0, Number(game.parallel.totalStudyProgress || 0));
  game.parallel.lastProcessedHour = Number.isFinite(Number(game.parallel.lastProcessedHour))
    ? Number(game.parallel.lastProcessedHour)
    : Number(game.calendar?.totalHours || 0);
  game.parallel.lastMaintenanceDay = Number.isFinite(Number(game.parallel.lastMaintenanceDay))
    ? Number(game.parallel.lastMaintenanceDay)
    : Math.floor(Number(game.calendar?.totalHours || 0) / 24);
  delete game.parallel.lastProcessedDay;
  return game;
}

export function lifestylePlan(game) {
  ensureV169(game);
  return lifestylePlanById(game.lifestyle.planId);
}

export function setLifestylePlan(game, planId) {
  ensureV169(game);
  const plan = LIFESTYLE_PLANS_V169.find((item) => item.id === planId);
  if (!plan) return { ok:false, message:'Вариант питания не найден' };
  const cost = lifestyleDailyCost(game, plan);
  if (cost > 0 && Number(game.player?.cash || 0) < cost) return { ok:false, message:`На питание нужно ${cost.toLocaleString('ru-RU')} ₽` };
  const today = Math.max(0, Math.floor(Number(game.calendar?.totalHours || 0) / 24));
  const samePlanAlreadyPaid = game.lifestyle.planId === plan.id && Number(game.lifestyle.lastChargedDay) === today;
  if (cost > 0 && !samePlanAlreadyPaid) {
    addMoney(game, -cost, `Питание на день: ${plan.name}`);
    game.lifestyle.totalSpent += cost;
  }
  game.lifestyle.planId = plan.id;
  game.lifestyle.selectedAt = { ...game.calendar };
  game.lifestyle.lastChargedDay = today;
  addLog(game, `Питание на день: ${plan.name}. Стоимость ${cost.toLocaleString('ru-RU')} ₽.`, 'info');
  return { ok:true, message:`Питание выбрано: ${plan.name}` };
}

export function processLifestyleDay(game) {
  ensureV169(game);
  const today = Math.max(0, Math.floor(Number(game.calendar?.totalHours || 0) / 24));
  const plan = lifestylePlan(game);
  if (Number(game.lifestyle.lastChargedDay) === today) return { cost:0, plan, alreadyCharged:true };
  const cost = lifestyleDailyCost(game, plan);
  if (cost > 0 && Number(game.player?.cash || 0) < cost) {
    const fallback = lifestylePlanById('economy');
    game.lifestyle.planId = fallback.id;
    game.lifestyle.lastChargedDay = today;
    addLog(game, `Не хватило денег на «${plan.name}». Сегодня герой питается из домашних запасов.`, 'warning');
    return { cost:0, plan:fallback, downgraded:true };
  }
  if (cost > 0) {
    addMoney(game, -cost, `Питание на день: ${plan.name}`);
    game.lifestyle.totalSpent += cost;
  }
  game.lifestyle.lastChargedDay = today;
  return { cost, plan };
}

// Старый месячный вызов сохранён как безопасная заглушка для совместимости сохранений.
export function processLifestyleMonth(game) {
  ensureV169(game);
  return { cost:0, plan:lifestylePlan(game), migratedToDaily:true };
}

export function restEnergyBonus(game) {
  return Math.max(0, Math.round(Number(lifestylePlan(game).energyRecovery || 0) * 4));
}

export function protectSkillLevels(game, gains = {}) {
  ensureV169(game);
  for (const skillId of Object.keys(gains || {})) {
    const skill = game.skills?.[skillId];
    const usage = game.skillUsage?.[skillId];
    if (!skill || !usage) continue;
    usage.protectedLevel = Math.max(Number(usage.protectedLevel || 0), Number(skill.level || 0));
    usage.lastUsedDay = Number(game.calendar?.totalDays || 0);
  }
}

export function energyPerformanceFactor(energy) {
  const value = Number(energy || 0);
  if (value <= 0) return 0;
  if (value < 10) return .4;
  if (value < 25) return .65;
  if (value < 50) return .82;
  if (value < 75) return .93;
  return 1;
}

export function energyErrorPenalty(energy) {
  const value = Number(energy || 0);
  if (value < 10) return .24;
  if (value < 25) return .14;
  if (value < 50) return .06;
  return 0;
}

function orderDailyEnergy(order) {
  if (order?.assignedEmployeeId) return 0;
  const difficulty = String(order?.difficulty || 'easy');
  if (difficulty === 'epic' || order?.orderType === 'corporate') return 4;
  if (difficulty === 'hard') return 3;
  if (difficulty === 'medium') return 2;
  return 1.25;
}

function processCareerSkills(game, resting, dayFraction) {
  if (resting || game.business?.opened || !game.career?.jobId || dayFraction <= 0) return 0;
  const branchId = game.career?.currentBranchId || 'hardware';
  const matrix = CAREER_SKILL_MATRIX_V169[branchId] || CAREER_SKILL_MATRIX_V169.hardware;
  const tier = Math.max(1, Number(game.career?.branches?.[branchId]?.tier || 1));
  const tierFactor = 1 + Math.max(0, tier - 1) * .08;
  let total = 0;
  for (const [skillId, xp] of Object.entries(matrix)) {
    const gained = Number(xp || 0) * tierFactor * dayFraction;
    addSkillXp(game, skillId, gained);
    total += gained;
  }
  return total;
}

function processSkillDecay(game, dayIndex) {
  ensureV169(game);
  const now = Math.max(Number(game.calendar?.totalDays || 0), Number(dayIndex || 0));
  for (const meta of SKILLS) {
    const skill = game.skills?.[meta.id];
    const usage = game.skillUsage?.[meta.id];
    if (!skill || !usage) continue;
    const idleDays = Math.max(0, now - Number(usage.lastUsedDay || 0));
    if (idleDays <= 60) continue;
    if (Number(skill.xp || 0) > 0) skill.xp = Math.max(0, Number(skill.xp || 0) - (idleDays > 180 ? 2 : 1));
    const protectedLevel = Math.max(0, Number(usage.protectedLevel || 0));
    if (idleDays >= 180 && now - Number(usage.lastLevelDecayDay || 0) >= 90 && Number(skill.level || 0) > protectedLevel) {
      skill.level = Math.max(protectedLevel, Number(skill.level || 0) - 1);
      skill.xp = 0;
      usage.lastLevelDecayDay = now;
      addLog(game, `${meta.name}: навык снизился из-за долгого простоя.`, 'warning');
    }
  }
}

function processMaintenance(game) {
  const dayIndex = Math.floor(Number(game.calendar?.totalHours || 0) / 24);
  if (dayIndex <= Number(game.parallel.lastMaintenanceDay || 0)) return;
  game.parallel.lastMaintenanceDay = dayIndex;
  processSkillDecay(game, dayIndex);
}

function processWorkingOrders(game, speedFactor, resting, dayFraction) {
  const plan = activityPlan(game);
  let progress = 0;
  for (const order of game.orders?.active || []) {
    if (order.status !== 'working') continue;
    const delegated = employeeWorkContribution(game, order);
    const base = delegated ? Number(delegated.speed || 1) : resting ? 0 : Number(plan.work || 1);
    const lifestyleSpeed = Number(lifestylePlan(game).speedBonus || 0);
    const gained = Math.max(0, base * (delegated ? 1 : speedFactor) * (1 + lifestyleSpeed) * dayFraction);
    order.progressDays = Number(order.progressDays || 0) + gained;
    order.progressUpdatedAt = { ...game.calendar };
    progress += gained;
  }
  game.parallel.totalOrderProgress += progress;
  return progress;
}

function processEducationStreams(game, speedFactor, resting, dayFraction) {
  const plan = activityPlan(game);
  let progress = 0;
  if (game.education?.active && !game.education.active.ready && !resting && speedFactor > 0) {
    const gained = Math.max(0, Number(plan.study || 1) * speedFactor * (1 + Number(lifestylePlan(game).speedBonus || 0)) * dayFraction);
    game.education.active.daysLeft -= gained;
    progress += gained;
    if (game.education.active.daysLeft <= 0) {
      game.education.active.daysLeft = 0;
      game.education.active.ready = true;
    }
  }
  if (game.education?.university && !game.education.university.ready) {
    const gained = dayFraction;
    game.education.university.daysLeft -= gained;
    progress += gained;
    if (game.education.university.daysLeft <= 0) {
      game.education.university.daysLeft = 0;
      game.education.university.ready = true;
    }
  }
  game.parallel.totalStudyProgress += progress;
  return progress;
}

export function processParallelHours(game, hours, options = {}) {
  ensureV169(game);
  const elapsedHours = Math.max(0, Number(hours || 0));
  if (!elapsedHours) return { processed:false };
  const dayFraction = elapsedHours / 24;
  processLifestyleDay(game);
  const resting = Boolean(options.resting);
  const speedFactor = energyPerformanceFactor(game.player?.energy);
  const orders = processWorkingOrders(game, speedFactor, resting, dayFraction);
  const study = processEducationStreams(game, speedFactor, resting, dayFraction);
  const careerXp = processCareerSkills(game, resting, dayFraction);

  const activeOrders = (game.orders?.active || []).filter((order) => order.status === 'working');
  const employed = Boolean(game.career?.jobId && !game.business?.opened);
  const quickStudy = Boolean(game.education?.active && !game.education.active.ready);
  const longStudy = Boolean(game.education?.university && !game.education.university.ready);
  const activity = activityPlan(game);
  const workspace = passiveWorkspaceRecovery(game);

  const difficulty = difficultyModeV180(game);
  const dailyEnergyCost = resting ? 0 : (1.25 + (employed ? 3.25 : 0)
    + activeOrders.reduce((sum, order) => sum + orderDailyEnergy(order), 0)
    + (quickStudy ? 0 : 0) + (longStudy ? .75 : 0)) * Number(activity.energy || 1) * Number(difficulty.energyCost || 1);
  const energyCost = dailyEnergyCost * dayFraction;
  game.player.energy = clamp(Number(game.player.energy || 0) - energyCost, 0, maxEnergy(game));

  if (!resting) {
    game.player.mood = clamp(Number(game.player.mood || 0) + (Number(lifestylePlan(game).moodRecovery || 0) + Number(workspace.mood || 0) - .35) * dayFraction, 0, 100);
    game.player.fun = clamp(Number(game.player.fun || 0) + (Number(lifestylePlan(game).funRecovery || 0) + Number(workspace.fun || 0) - .25) * dayFraction, 0, 100);
    game.player.health = clamp(Number(game.player.health || 0) + (Number(lifestylePlan(game).healthRecovery || 0) + Number(workspace.health || 0)) * dayFraction, 0, 100);
  }
  if (game.player.energy < 15) game.player.health = clamp(game.player.health - .15 * dayFraction, 0, 100);
  game.parallel.lastProcessedHour = Number(game.calendar?.totalHours || 0);
  processMaintenance(game);

  return { processed:true, hours:elapsedHours, orders, study, careerXp, energyCost, recovery:0, speedFactor };
}

export function processParallelDay(game, options = {}) {
  return processParallelHours(game, 24, options);
}
