import { ALL_JOBS, SKILLS, WEALTH_TIERS } from '../data/progression.js';
import { EXTRA_JOBS_V06, EXTRA_CORP_JOBS_V14 } from '../data/content-v06.js';
import { workspaceBonuses } from '../data/workspace.js';
import { ALL_LOCATIONS, ALL_VEHICLES, UPGRADES } from '../data/economy.js';
import { ERAS } from '../data/eras.js';
import { playerXpNeeded, skillXpNeeded } from '../core/game.js';
import { clamp, uid } from '../core/utils.js';
import { effectiveSkillLevel } from './knowledge.js';
import { CAREER_JOBS_V162 } from '../data/v162.js';
import { activeAdvertisingBonuses } from '../data/advertising-v162.js';
import { ensureQualityState, recordFinanceEntry, recordSkillEntry, recordXpEntry } from '../core/quality.js';

// The v0.16.2 career system uses eight persistent branches. Legacy jobs are
// intentionally excluded from the visible pool, but old saves are mapped by ensureCareerV162.
export const JOB_POOL = [...CAREER_JOBS_V162];

export function addLog(game, text, type = 'info') {
  game.log.unshift({ id: uid('log'), at: new Date().toISOString(), type, text });
  game.log = game.log.slice(0, 80);
}

export function addMoney(game, amount, source = 'Операция', options = {}) {
  const value = Number(amount || 0);
  ensureQualityState(game);
  game.player.cash += value;
  if (value > 0) game.finance.current.income = Number(game.finance.current.income||0) + value;
  if (value < 0) game.finance.current.expenses = Number(game.finance.current.expenses||0) + Math.abs(value);
  if (value > 0) {
    game.stats.earned += value;
    game.bank.yearlyIncome += value;
    game.bank.totalIncome += value;
  } else if (value < 0) {
    game.stats.spent += Math.abs(value);
  }
  recordFinanceEntry(game,value,source);
  if (!options.silent) addLog(game, `${source}: ${value >= 0 ? '+' : '−'}${Math.abs(Math.round(value)).toLocaleString('ru-RU')} ₽`, value >= 0 ? 'success' : 'warning');
}

export function addPlayerXp(game, amount, source = 'other', label = '') {
  const gained = Math.max(0, Math.round(Number(amount) || 0));
  if (!gained) return 0;
  game.progression ||= { xpFromWork:0, xpFromStudy:0, xpFromOther:0, lastXp:[] };
  const key = source === 'work' ? 'xpFromWork' : source === 'study' ? 'xpFromStudy' : 'xpFromOther';
  game.progression[key] = Number(game.progression[key] || 0) + gained;
  game.progression.lastXp ||= [];
  game.progression.lastXp.unshift({ source, amount:gained, label:String(label || (source === 'work' ? 'Работа' : source === 'study' ? 'Учёба' : 'Событие')), at:{...game.calendar} });
  game.progression.lastXp = game.progression.lastXp.slice(0,12);
  game.player.xp += gained;
  const levelsBefore = game.player.level;
  while (game.player.xp >= playerXpNeeded(game.player.level)) {
    game.player.xp -= playerXpNeeded(game.player.level);
    game.player.level += 1;
    game.player.energy = maxEnergy(game);
    addLog(game, `Новый уровень персонажа: ${game.player.level}. Энергия восстановлена.`, 'success');
  }
  if (label) addLog(game, `${label}: +${gained} XP персонажа${game.player.level > levelsBefore ? ` · новый уровень ${game.player.level}` : ''}.`, 'success');
  recordXpEntry(game,gained,source,label);
  return gained;
}

export function addSkillXp(game, skillId, amount) {
  const skill = game.skills[skillId];
  if (!skill) return;
  game.skillUsage ||= {};
  const now = Number(game.calendar?.totalDays || 0);
  const usage = game.skillUsage[skillId] ||= { lastUsedDay:now, protectedLevel:0, lastLevelDecayDay:now };
  usage.lastUsedDay = now;
  const before = Number(skill.level || 0);
  const gained = Math.max(0, Number(amount || 0));
  skill.xp += gained;
  while (skill.level < 100 && skill.xp >= skillXpNeeded(Math.max(1, skill.level))) {
    skill.xp -= skillXpNeeded(Math.max(1, skill.level));
    skill.level += 1;
    const meta = SKILLS.find((item) => item.id === skillId);
    addLog(game, `${meta?.name || skillId}: уровень ${skill.level}`, 'success');
  }
  recordSkillEntry(game,skillId,gained,before,Number(skill.level||0));
}

export function getEra(game) {
  const years = Object.keys(ERAS).map(Number).sort((a, b) => a - b);
  let selected = ERAS[years[0]];
  let startYear = years[0];
  for (const year of years) {
    if (game.calendar.year >= year) {
      selected = ERAS[year];
      startYear = year;
    }
  }
  return { ...selected, startYear };
}

const USD_RUB_2000_2010 = Object.freeze({
  2000:28.12, 2001:29.17, 2002:31.35, 2003:30.69, 2004:28.81,
  2005:28.29, 2006:27.19, 2007:26.33, 2008:24.48, 2009:31.73, 2010:30.37
});

export function getInflation(game) {
  const year = Math.max(2000, Math.min(2010, Number(game?.calendar?.year || 2000)));
  const usdRate = Number(USD_RUB_2000_2010[year] || USD_RUB_2000_2010[2000]);
  // Базовые цены игры дополнительно снижены до 45% и затем корректируются
  // по среднегодовому курсу доллара для каждого года кампании.
  return 0.45 * (usdRate / USD_RUB_2000_2010[2000]);
}

export function getLocation(game) {
  return ALL_LOCATIONS.find((item) => item.id === game.property.locationId) || ALL_LOCATIONS[0];
}

export function getVehicle(game) {
  return ALL_VEHICLES.find((item) => item.id === game.property.vehicleId) || ALL_VEHICLES[0];
}

export function getJob(game) {
  return JOB_POOL.find((item) => item.id === game.career.jobId) || null;
}

export function getWealthTier(game) {
  const wealth = netWorth(game);
  return [...WEALTH_TIERS].reverse().find((tier) => wealth >= tier.min) || WEALTH_TIERS[0];
}

export function maxEnergy(game) {
  const coffee = game.property.upgrades.coffee || 0;
  return 100 + coffee * 12 + Math.round(workspaceBonuses(game).energyMax || 0);
}

export function maxActiveOrders(game) {
  const location = getLocation(game);
  const benches = game.property.upgrades.bench || 0;
  const legacy = Number(game.replay?.legacyOrderSlots || 0);
  const departments = game.business?.departments || [];
  const departmentSlots = (departments.includes('reception') ? 2 : 0) + (departments.includes('field') ? 2 : 0);
  const vehicleSlots = Math.max(0, Number(getVehicle(game).extraOrderSlots || 0));
  return Math.max(5, (location.maxOrders || 5) + benches + legacy + departmentSlots) + vehicleSlots;
}

export function workSpeed(game) {
  const location = getLocation(game);
  const vehicle = getVehicle(game);
  const tools = game.property.upgrades.tools || 0;
  const pcBonus = game.pc.assembled ? Math.min(0.4, getPcPower(game) * 0.07) : 0;
  const workspace = workspaceBonuses(game);
  const spec = game.specialization?.active;
  const specBonus = spec === 'hardware_master' ? .12 : spec === 'universal' ? .05 : 0;
  const departmentBonus = game.business?.departments?.includes('repair') ? .18 : 0;
  return 1 + (location.workSpeedBonus || 0) + (vehicle.speedBonus || 0) + tools * 0.15 + pcBonus + (workspace.workSpeed || 0) + specBonus + departmentBonus;
}

export function discount(game) {
  const warehouseBonus = game.business?.departments?.includes('warehouse') ? .05 : 0;
  return clamp(1 - (game.property.upgrades.supply || 0) * 0.04 - warehouseBonus, 0.60, 1);
}

export function successBonus(game) {
  const spec = game.specialization?.active;
  const specBonus = spec === 'security' ? .10 : spec === 'hardware_master' ? .07 : spec === 'universal' ? .05 : 0;
  const qualityDepartment = game.business?.departments?.includes('repair') ? .06 : 0;
  return (game.property.upgrades.diagnostic || 0) * 0.05 + (workspaceBonuses(game).success || 0) + specBonus + qualityDepartment;
}

export function incomeBonus(game, scope = 'personal') {
  const spec = game.specialization?.active;
  const specBonus = spec === 'entrepreneur' ? .08 : spec === 'data_recovery' ? .06 : spec === 'universal' ? .04 : 0;
  const corporateBonus = scope === 'company' && game.business?.departments?.includes('corporate') ? .08 : 0;
  const advertising = activeAdvertisingBonuses(game, scope);
  return Math.min(.35, (workspaceBonuses(game).income || 0) + Number(advertising.rewardBonus || 0) + specBonus + corporateBonus);
}

export function skillXpBonus(game) {
  return (workspaceBonuses(game).skillXp || 0) + (game.property.upgrades.lib || 0) * 0.12;
}

export function educationSpeedBonus(game) {
  const spec = game.specialization?.active;
  return (workspaceBonuses(game).educationSpeed || 0) + (spec === 'developer' ? .15 : spec === 'universal' ? .05 : 0) + Number(game.replay?.legacyStudyBonus || 0);
}

export function reputationBonus(game, scope = 'personal') {
  const marketingDepartment = scope === 'company' && game.business?.departments?.includes('marketing') ? .05 : 0;
  const advertising = activeAdvertisingBonuses(game, scope);
  return (workspaceBonuses(game).reputation || 0) + Number(advertising.reputationBonus || 0) + (game.property.upgrades.word || 0) * 0.2 + marketingDepartment;
}

export function passiveWorkspaceRecovery(game) {
  const bonus = workspaceBonuses(game);
  return { energy: bonus.energyRegen || 0, mood: bonus.mood || 0, fun: bonus.fun || 0, health: bonus.health || 0 };
}

export function getPcPower(game) {
  return Object.values(game.pc.slots || {}).reduce((total, component) => total + Number(component?.pcPower || 0), 0);
}

export function inventoryValue(game, components) {
  return Object.entries(game.inventory).reduce((total, [id, quantity]) => {
    const component = components.find((item) => item.id === id);
    return total + (component ? Math.round(component.buyBase * getInflation(game) * (component.sell || 0.3)) * quantity : 0);
  }, 0);
}

export function netWorth(game, components = []) {
  const location = getLocation(game);
  const vehicle = getVehicle(game);
  const deposits = game.bank.deposits.reduce((sum, deposit) => sum + deposit.amount, 0);
  const loans = game.bank.loans.reduce((sum, loan) => sum + loan.repay, 0);
  const inventory = components.length ? inventoryValue(game, components) : 0;
  return game.player.cash + (location.value || 0) + (vehicle.value || 0) + deposits + inventory - loans;
}

export function skillLevel(game, skillId) { return effectiveSkillLevel(game, skillId); }

export function requirementsMet(game, requirements = {}) {
  return Object.entries(requirements).every(([id, level]) => skillLevel(game, id) >= level);
}


export function jobRequirements(game, job) {
  if (game.calendar.year < (job.fromYear || 2000)) return { ok: false, reason: `Доступно с ${job.fromYear} года` };
  if (job.toYear && game.calendar.year > job.toYear) return { ok: false, reason: 'Вакансия уже не актуальна' };
  if (game.player.level < (job.reqLevel || 1)) return { ok: false, reason: `Нужен уровень персонажа ${job.reqLevel}` };
  const missing = Object.entries(job.reqSkills || {}).filter(([id,level]) => skillLevel(game,id) < level);
  if (missing.length) {
    const names = Object.fromEntries(SKILLS.map(item=>[item.id,item.name]));
    return { ok:false, reason:`Нужно: ${missing.map(([id,level])=>`${names[id] || id} ${level}`).join(', ')}` };
  }
  return { ok: true, reason: '' };
}

export function salaryForJob(game, job) {
  if (!job) return 0;
  const years = Math.max(0, game.calendar.year - (job.fromYear || game.calendar.year));
  const degreeBonus = Math.min(.35, Number(game.education?.degreeSalaryBonus || 0));
  // Salaries are already nominal for the 2000s. Inflation is not applied a second time,
  // otherwise late-game employment overwhelms all other progression systems.
  return Math.round((Number(job.salary || 0) + years * Number(job.salaryGrowthPerYear || 0)) * (1 + degreeBonus));
}

export function currentSalary(game) {
  return salaryForJob(game, getJob(game));
}

export function buyUpgrade(game, upgradeId) {
  const upgrade = UPGRADES.find((item) => item.id === upgradeId);
  if (!upgrade) return { ok: false, message: 'Улучшение не найдено' };
  const level = game.property.upgrades[upgrade.id] || 0;
  if (level >= upgrade.max) return { ok: false, message: 'Достигнут максимальный уровень' };
  const cost = Math.round(upgrade.baseCost * Math.pow(upgrade.mult, level) * getInflation(game));
  if (game.player.cash < cost) return { ok: false, message: 'Недостаточно денег' };
  addMoney(game, -cost, upgrade.name);
  game.property.upgrades[upgrade.id] = level + 1;
  return { ok: true, message: `${upgrade.name}: уровень ${level + 1}` };
}
