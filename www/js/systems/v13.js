import { ALL_COMPONENTS } from '../data/components.js';
import {
  AUTOMATION_RULES_V13, CHALLENGES_V13, CHAPTER_REWARDS_V13, DEPARTMENTS_V13,
  EMPLOYEE_TRAITS_V13, ERA_VISUAL_THEMES_V13, LEGACY_REWARDS_V13, MARKET_EVENTS_V13
} from '../data/v13.js';
import { chance, clamp, pick, randomInt, uid } from '../core/utils.js';
import { addLog, addMoney, addSkillXp, getInflation, getLocation, getVehicle } from './progression.js';
import { buyComponent } from './economy.js';
import { chapterStatus, employeeTemplate, ensureV08 } from './v08.js';

const LOCATION_RANK = {
  home: 0, garage: 1, dorm_room: 1,
  small_workshop: 2, studio: 2,
  workshop: 3, one_room: 3,
  service_center: 4, two_room: 4,
  tech_hub: 5, campus: 5
};

function emptyRestockRules() {
  return {
    therm: 4,
    air: 3,
    win98_cd: 2,
    paste_brush: 2,
    sata_c: 2,
    ide_c: 2
  };
}

export function ensureV13(game) {
  ensureV08(game);
  game.version = Math.max(13, Number(game.version || 0));
  game.stability ||= {
    backupCount: 0,
    lastBackupAt: null,
    lastHealthyAt: new Date().toISOString(),
    recoveryCount: 0,
    warnings: [],
    sessionErrors: []
  };
  game.stability.warnings ||= [];
  game.stability.sessionErrors ||= [];

  game.market ||= {
    priceIndex: 1,
    categoryMultipliers: {},
    activeEvent: null,
    history: [],
    restockRules: emptyRestockRules(),
    totalSpeculationProfit: 0
  };
  game.market.categoryMultipliers ||= {};
  game.market.history ||= [];
  game.market.restockRules ||= emptyRestockRules();

  game.business ||= {};
  game.business.departments ||= [];
  game.business.automation ||= Object.fromEntries(AUTOMATION_RULES_V13.map(rule => [rule.id, false]));
  game.business.employeeEvents ||= [];
  game.business.activeEmployeeEvent ||= null;
  game.business.qualityScore = Number(game.business.qualityScore || 50);
  game.business.brandAwareness = Number(game.business.brandAwareness || 0);

  game.orders ||= {};
  game.orders.reviews ||= [];
  game.orders.guarantees ||= [];
  game.orders.qualityHistory ||= [];
  game.orders.autoProcurement = Boolean(game.orders.autoProcurement);

  game.campaign ||= {
    rewardedChapters: [],
    chapterTransitions: [],
    endingSeen: false,
    completedAt: null
  };
  game.campaign.rewardedChapters ||= [];
  game.campaign.chapterTransitions ||= [];

  game.replay ||= {
    challengeId: game.mode?.challengeId || null,
    challengeCompleted: false,
    challengeReward: null,
    legacyUpgrades: {},
    appliedLegacySignature: '',
    newGamePlusUnlocked: false
  };
  game.replay.legacyUpgrades ||= {};

  game.audio ||= {
    enabled: true,
    master: .7,
    ui: .65,
    ambience: .45,
    music: .35,
    vibration: true
  };
  game.visual ||= {
    eraThemes: true,
    reducedMotion: false,
    roomAnimations: true
  };
  game.diagnostics ||= {
    tutorialCompleted: false,
    hintsUsed: 0,
    lastRecommendedAction: null
  };

  game.stats ||= {};
  game.stats.repairedFleaItems = Number(game.stats.repairedFleaItems || 0);
  game.stats.fleaRepairRevenue = Number(game.stats.fleaRepairRevenue || 0);
  game.stats.reviewsPositive = Number(game.stats.reviewsPositive || 0);
  game.stats.reviewsNegative = Number(game.stats.reviewsNegative || 0);
  game.stats.testsCompleted = Number(game.stats.testsCompleted || 0);
  game.stats.departmentsOpened = Number(game.stats.departmentsOpened || 0);
  game.stats.employeeTrainings = Number(game.stats.employeeTrainings || 0);

  for (const employee of game.business.employees || []) {
    if (!employee.traitId) employee.traitId = pick(EMPLOYEE_TRAITS_V13).id;
    employee.experience = Number(employee.experience || 0);
    employee.training = Number(employee.training || 0);
    employee.errors = Number(employee.errors || 0);
    employee.completedOrders = Number(employee.completedOrders || 0);
  }

  applyLegacyBonuses(game);
  return game;
}

export function departmentById(id) {
  return DEPARTMENTS_V13.find(item => item.id === id) || null;
}

export function automationRuleById(id) {
  return AUTOMATION_RULES_V13.find(item => item.id === id) || null;
}

export function employeeTrait(id) {
  return EMPLOYEE_TRAITS_V13.find(item => item.id === id) || EMPLOYEE_TRAITS_V13[0];
}

export function hasDepartment(game, id) {
  ensureV13(game);
  return game.business.departments.includes(id);
}

export function departmentRequirement(game, department) {
  const location = getLocation(game);
  const vehicle = getVehicle(game);
  if (game.player.level < department.reqLevel) return { ok:false, reason:`Нужен уровень ${department.reqLevel}` };
  if (department.reqLocation && (LOCATION_RANK[location.id] || 0) < (LOCATION_RANK[department.reqLocation] || 0)) {
    return { ok:false, reason:`Нужно помещение уровня «${department.reqLocation}»` };
  }
  if (department.reqVehicle) {
    const validVehicles = department.reqVehicle === 'van' ? ['van','branded_van','fleet','minivan','van_service'] : [department.reqVehicle];
    const availableVehicle = validVehicles.includes(vehicle.id) || validVehicles.some(id => game.property.ownedVehicles.includes(id));
    if (!availableVehicle) return { ok:false, reason:'Нужен подходящий служебный транспорт' };
  }
  return { ok:true, reason:'' };
}

export function openDepartment(game, id) {
  ensureV13(game);
  if(!game.business.opened)return {ok:false,message:'Сначала откройте свою компанию'};
  const department = departmentById(id);
  if (!department) return { ok:false, message:'Отдел не найден' };
  if (hasDepartment(game, id)) return { ok:false, message:'Отдел уже открыт' };
  const requirement = departmentRequirement(game, department);
  if (!requirement.ok) return { ok:false, message:requirement.reason };
  const cost = Math.max(1,Math.round(Number(department.cost||0)*getInflation(game)));
  if (game.player.cash < cost) return { ok:false, message:`Нужно ${cost.toLocaleString('ru-RU')} руб.` };
  addMoney(game, -cost, `Открытие отдела: ${department.name}`);
  game.business.departments.push(id);
  game.business.companyReputation += 8;
  game.stats.departmentsOpened += 1;
  addLog(game, `Открыт отдел «${department.name}».`, 'success');
  return { ok:true, message:`Открыт отдел: ${department.name}` };
}

export function toggleAutomationRule(game, id) {
  ensureV13(game);
  const rule = automationRuleById(id);
  if (!rule) return { ok:false, message:'Правило не найдено' };
  if (rule.department && !hasDepartment(game, rule.department)) {
    return { ok:false, message:`Сначала откройте отдел: ${departmentById(rule.department)?.name || rule.department}` };
  }
  game.business.automation[id] = !game.business.automation[id];
  return { ok:true, message:`${rule.name}: ${game.business.automation[id] ? 'включено' : 'выключено'}` };
}

export function setRestockRule(game, componentId, quantity) {
  ensureV13(game);
  const component = ALL_COMPONENTS.find(item => item.id === componentId);
  if (!component) return { ok:false, message:'Компонент не найден' };
  game.market.restockRules[componentId] = clamp(Math.floor(Number(quantity) || 0), 0, 20);
  return { ok:true, message:`Минимальный остаток «${component.name}»: ${game.market.restockRules[componentId]}` };
}

export function marketPriceMultiplier(game, componentOrCategory) {
  ensureV13(game);
  const category = typeof componentOrCategory === 'string' ? componentOrCategory : componentOrCategory?.cat;
  return Number(game.market.categoryMultipliers?.[category] || 1) * Number(game.market.priceIndex || 1);
}

function startMarketEvent(game) {
  const candidates = MARKET_EVENTS_V13.filter(event => game.calendar.year >= event.from && game.calendar.year <= event.to);
  if (!candidates.length) return;
  const event = structuredClone(pick(candidates));
  game.market.activeEvent = { ...event, monthsLeft:event.duration, startedAt:{...game.calendar} };
  game.market.categoryMultipliers = { ...event.categories };
  game.market.history.unshift({ id:event.id, name:event.name, startedAt:{...game.calendar}, desc:event.desc });
  game.market.history = game.market.history.slice(0, 24);
  addLog(game, `Рынок: ${event.name}. ${event.desc}`, 'warning');
}

function updateMarket(game) {
  const active = game.market.activeEvent;
  if (active) {
    active.monthsLeft -= 1;
    if (active.monthsLeft <= 0) {
      addLog(game, `Рынок стабилизировался после события «${active.name}».`, 'info');
      game.market.activeEvent = null;
      game.market.categoryMultipliers = {};
    }
  } else if (chance(.18)) {
    startMarketEvent(game);
  }
  game.market.priceIndex = clamp(1 + Math.sin((game.world.monthCounter || 0) / 5) * .025 + randomInt(-2,2) / 100, .92, 1.15);
}

function autoRestock(game) {
  if (!game.business.automation.restock || !hasDepartment(game, 'warehouse')) return;
  for (const [id, minimum] of Object.entries(game.market.restockRules || {})) {
    const owned = Number(game.inventory[id] || 0);
    const missing = Math.max(0, Number(minimum || 0) - owned);
    if (!missing) continue;
    const component = ALL_COMPONENTS.find(item => item.id === id);
    if (!component || component.fromYear > game.calendar.year) continue;
    const result = buyComponent(game, id, Math.min(5, missing));
    if (!result.ok) {
      addLog(game, `Автозакупка остановлена: ${result.message}`, 'warning');
      break;
    }
  }
}

function autoAssign(game) {
  const employees = game.business.employees || [];
  const orders = game.orders.active || [];
  const expensiveThreshold = 20000;
  for (const order of orders) {
    if (order.status !== 'working' || order.assignedEmployeeId) continue;
    if (game.business.automation.expensive_player && Number(order.reward || 0) >= expensiveThreshold) continue;
    const primarySkill = Object.keys(order.skills || {})[0] || '';
    let employee = null;
    if (game.business.automation.simple_apprentice && order.difficulty === 'easy') {
      employee = employees.find(item => !item.currentOrderUid && item.templateId === 'apprentice');
    }
    if (!employee && game.business.automation.network_sysadmin && ['networking','software','security'].includes(primarySkill)) {
      employee = employees.find(item => !item.currentOrderUid && item.templateId === 'sysadmin');
    }
    if (employee) {
      employee.currentOrderUid = order.uid;
      order.assignedEmployeeId = employee.id;
      addLog(game, `Автоматизация: ${employee.name} получил заказ «${order.name}».`, 'info');
    }
  }
}

function prioritizeWarranty(game) {
  if (!game.business.automation.warranty_priority) return;
  game.orders.available.sort((a,b) => (a.orderType === 'warranty' ? -1 : 0) - (b.orderType === 'warranty' ? -1 : 0));
}

function departmentMonthlyCost(game) {
  let total = 0;
  for (const id of game.business.departments || []) total += Math.round(Number(departmentById(id)?.monthly || 0) * getInflation(game));
  if (total > 0) addMoney(game, -total, 'Содержание отделов');
  return total;
}

function createEmployeeEvent(game) {
  if (!game.business.opened) return;
  if (game.business.activeEmployeeEvent || !(game.business.employees || []).length || !chance(.16)) return;
  const candidates=(game.business.employees||[]).filter((employee)=>Number(employee.completedOrders||0)>=2||Number(employee.level||1)<4||Number(employee.errors||0)>0||employee.currentOrderUid);
  if(!candidates.length)return;
  const employee = pick(candidates);
  const trait = employeeTrait(employee.traitId);
  const canRaise=Number(employee.completedOrders||0)>=3&&Number(employee.morale||0)>=65;
  const canTraining=Number(employee.level||1)<5;
  const canMistake=Number(employee.errors||0)>0||Boolean(employee.currentOrderUid);
  const pool=[...(canRaise?['raise']:[]),...(canTraining?['training']:[]),...(canMistake?['mistake']:[])];
  if(!pool.length)return;
  const weightedRisk=Math.min(.85,.35+Number(trait.eventRisk||0));
  const type=canMistake&&chance(weightedRisk)?'mistake':pick(pool);
  const event = type === 'raise'
    ? { id:uid('emp-event'), type, employeeId:employee.id, title:`${employee.name} просит повышение`, text:'Сотрудник считает, что вырос профессионально и хочет пересмотра зарплаты.' }
    : type === 'training'
      ? { id:uid('emp-event'), type, employeeId:employee.id, title:`Обучение для ${employee.name}`, text:'Появилось место на отраслевом интенсиве. Можно оплатить обучение сотрудника.' }
      : { id:uid('emp-event'), type, employeeId:employee.id, title:`Ошибка сотрудника`, text:'Клиент пожаловался на невнимательность. Нужно решить, как отреагировать.' };
  game.business.activeEmployeeEvent = event;
}

export function resolveEmployeeEvent(game, choiceId) {
  ensureV13(game);
  const event = game.business.activeEmployeeEvent;
  if (!event) return { ok:false, message:'Событие уже закрыто' };
  const employee = game.business.employees.find(item => item.id === event.employeeId);
  if (!employee) { game.business.activeEmployeeEvent = null; return { ok:false, message:'Сотрудник уже не работает' }; }
  let message = '';
  if (event.type === 'raise') {
    if (choiceId === 'accept') {
      employee.salary = Math.round(employee.salary * 1.15);
      employee.morale = clamp(employee.morale + 16, 0, 100);
      message = `Зарплата повышена на 15% до ${employee.salary.toLocaleString('ru-RU')} ₽; мотивация +16.`;
    } else {
      employee.morale = clamp(employee.morale - 18, 0, 100);
      message = 'Повышение отклонено: мотивация −18; при низкой мотивации риск ухода 35%.';
      if (employee.morale < 25 && chance(.35)) {
        game.business.employees = game.business.employees.filter(item => item.id !== employee.id);
        message += ' Сотрудник уволился.';
      }
    }
  } else if (event.type === 'training') {
    if (choiceId === 'accept') {
      const cost = Math.max(500,Math.round(employee.salary * .7 * getInflation(game)));
      if (game.player.cash < cost) return { ok:false, message:`На обучение нужно ${cost.toLocaleString('ru-RU')} руб.` };
      addMoney(game, -cost, `Обучение сотрудника: ${employee.name}`);
      employee.level = Number(employee.level || 1) + .65;
      employee.training += 1;
      employee.morale = clamp(employee.morale + 8, 0, 100);
      game.stats.employeeTrainings += 1;
      message = `Обучение оплачено: −${cost.toLocaleString('ru-RU')} ₽; квалификация +0,65; мотивация +8.`;
    } else message = 'Обучение отклонено: деньги и показатели без изменений.';
  } else {
    if (choiceId === 'support') {
      employee.morale = clamp(employee.morale + 5, 0, 100);
      game.business.qualityScore = clamp(game.business.qualityScore - 2, 0, 100);
      message = 'Поддержка: мотивация +5; качество компании −2.';
    } else {
      employee.morale = clamp(employee.morale - 8, 0, 100);
      employee.errors += 1;
      game.business.qualityScore = clamp(game.business.qualityScore + 2, 0, 100);
      message = 'Строгий контроль: мотивация −8; ошибки +1; качество компании +2.';
    }
  }
  game.business.employeeEvents.unshift({ ...event, choiceId, message, at:{...game.calendar} });
  game.business.employeeEvents = game.business.employeeEvents.slice(0, 30);
  game.business.activeEmployeeEvent = null;
  addLog(game, message, 'info');
  return { ok:true, message };
}

export function trainEmployee(game, employeeId) {
  ensureV13(game);
  if(!game.business.opened)return {ok:false,message:'Сначала откройте свою компанию'};
  const employee = game.business.employees.find(item => item.id === employeeId);
  if (!employee) return { ok:false, message:'Сотрудник не найден' };
  const cost = Math.max(2000, Math.round(employee.salary * .55));
  if (game.player.cash < cost) return { ok:false, message:`Нужно ${cost.toLocaleString('ru-RU')} руб.` };
  addMoney(game, -cost, `Повышение квалификации: ${employee.name}`);
  employee.level = Number(employee.level || 1) + .4;
  employee.training += 1;
  employee.morale = clamp(employee.morale + 6, 0, 100);
  game.stats.employeeTrainings += 1;
  return { ok:true, message:`${employee.name} повысил квалификацию` };
}

export function employeeEffectiveStats(game, employee) {
  const template = employeeTemplate(employee.templateId) || {};
  const trait = employeeTrait(employee.traitId);
  const mentorBonus = (game.business.employees || []).some(item => employeeTrait(item.traitId).id === 'mentor') ? .04 : 0;
  const departmentBonus = hasDepartment(game, 'repair') ? DEPARTMENTS_V13.find(item => item.id === 'repair').bonus : {};
  return {
    speed: Math.max(.2, Number(template.speed || .5) * (1 + Number(employee.level || 1) * .03 + Number(trait.speed || 0) + mentorBonus + Number(departmentBonus.work || 0))),
    quality: Number(template.quality || 0) + Number(trait.quality || 0) + Number(departmentBonus.quality || 0),
    trust: Number(trait.trust || 0),
    cost: Number(trait.cost || 0)
  };
}

export function checkChapterRewards(game) {
  ensureV13(game);
  const chapter = chapterStatus(game);
  if (!chapter || game.campaign.rewardedChapters.includes(chapter.id)) return null;
  const complete = chapter.goals.every(goal => goal.value >= goal.target);
  if (!complete) return null;
  const reward = CHAPTER_REWARDS_V13.find(item => item.id === chapter.id);
  if (!reward) return null;
  game.campaign.rewardedChapters.push(chapter.id);
  addMoney(game, reward.reward.cash, `Награда главы: ${chapter.title}`);
  game.player.reputation += reward.reward.reputation;
  game.legacy.points = Number(game.legacy.points || 0) + reward.reward.legacy;
  game.campaign.chapterTransitions.push({ id:chapter.id, year:game.calendar.year, reward:reward.text });
  addLog(game, `Глава завершена: ${chapter.title}. ${reward.text}`, 'success');
  return { chapter, reward };
}

export function challengeStatusV13(game) {
  ensureV13(game);
  const id = game.mode?.challengeId || game.replay.challengeId;
  const challenge = CHALLENGES_V13.find(item => item.id === id) || CHALLENGES_V13[0];
  let progress = 0;
  let target = 1;
  let completed = false;
  switch (challenge.id) {
    case 'million_2010': progress = Math.min(1_000_000, game.player.cash); target = 1_000_000; completed = game.calendar.year <= 2010 && game.player.cash >= target; break;
    case 'no_credit': progress = Math.min(2010, game.calendar.year); target = 2010; completed = game.calendar.year >= 2010 && Number(game.stats.loansTaken || 0) === 0; break;
    case 'perfect_service': progress = game.stats.ordersDone; target = 100; completed = progress >= target && game.stats.ordersFailed <= 5; break;
    case 'service_five_years': progress = LOCATION_RANK[game.property.locationId] || 0; target = LOCATION_RANK.service_center; completed = game.calendar.year <= 2005 && progress >= target; break;
    case 'solo_master': progress = game.stats.ordersDone; target = 150; completed = progress >= target && game.business.employees.length === 0; break;
    case 'academic_path': progress = Number(game.stats.studiesCompleted || 0); target = 15; completed = Boolean(game.education.degreeSalaryBonus > 0) && progress >= target; break;
    case 'no_job_business': progress = LOCATION_RANK[game.property.locationId] || 0; target = LOCATION_RANK.service_center; completed = progress >= target && (!game.career.jobId || game.career.jobId === 'student'); break;
    case 'flea_legend': progress = Number(game.stats.repairedFleaItems || 0); target = 30; completed = progress >= target && Number(game.stats.fleaRepairRevenue || 0) >= 200000; break;
    default: break;
  }
  if (completed && !game.replay.challengeCompleted) {
    game.replay.challengeCompleted = true;
    if (game.mode?.id === 'challenge') game.mode.completed = true;
    game.replay.challengeReward = challenge.reward;
    game.legacy.points = Number(game.legacy.points || 0) + 3;
    game.legacy.rewards ||= [];
    if (!game.legacy.rewards.includes(challenge.reward)) game.legacy.rewards.push(challenge.reward);
    addLog(game, `Испытание выполнено: ${challenge.name}. Награда: ${challenge.reward}.`, 'success');
  }
  return { challenge, progress, target, completed };
}

export function buyLegacyUpgrade(game, id) {
  ensureV13(game);
  const item = LEGACY_REWARDS_V13.find(entry => entry.id === id);
  if (!item) return { ok:false, message:'Улучшение наследия не найдено' };
  const level = Number(game.replay.legacyUpgrades[id] || 0);
  if (level >= item.max) return { ok:false, message:'Достигнут максимальный уровень' };
  if (Number(game.legacy.points || 0) < item.cost) return { ok:false, message:`Нужно ${item.cost} очк. наследия` };
  game.legacy.points -= item.cost;
  game.replay.legacyUpgrades[id] = level + 1;
  game.replay.appliedLegacySignature = '';
  applyLegacyBonuses(game);
  return { ok:true, message:`Открыто наследие: ${item.name} ${level + 1}/${item.max}` };
}

export function applyLegacyBonuses(game) {
  game.replay ||= { legacyUpgrades:{}, appliedLegacySignature:'' };
  game.replay.legacyUpgrades ||= {};
  const signature = JSON.stringify(game.replay.legacyUpgrades);
  if (game.replay.appliedLegacySignature === signature) return;
  const previous = game.replay.appliedLegacyApplied || {};
  const levels = game.replay.legacyUpgrades;
  const cashLevel = Number(levels.starter_cash || 0);
  const oldCash = Number(previous.starter_cash || 0);
  if (cashLevel > oldCash) game.player.cash += (cashLevel - oldCash) * 2000;
  const skillLevel = Number(levels.starter_skill || 0);
  const oldSkill = Number(previous.starter_skill || 0);
  if (skillLevel > oldSkill) {
    const id = game.profile.specialization || 'hardware';
    if (game.skills[id]) game.skills[id].level += skillLevel - oldSkill;
  }
  if (Number(levels.rare_tool || 0) && !Number(previous.rare_tool || 0)) {
    game.inventory.tool_multimeter = Math.max(1, Number(game.inventory.tool_multimeter || 0));
    game.inventory.tool_screw_set = Math.max(1, Number(game.inventory.tool_screw_set || 0));
  }
  if (Number(levels.client_book || 0) && !Number(previous.client_book || 0)) {
    game.player.reputation += 10;
  }
  game.replay.legacyOrderSlots = Number(levels.extra_slot || 0);
  game.replay.legacyStudyBonus = Number(levels.fast_study || 0) * .08;
  game.replay.appliedLegacyApplied = { ...levels };
  game.replay.appliedLegacySignature = signature;
}

export function currentEraVisual(game) {
  ensureV13(game);
  return ERA_VISUAL_THEMES_V13.find(item => game.calendar.year >= item.from && game.calendar.year <= item.to) || ERA_VISUAL_THEMES_V13[0];
}

export function processV13Month(game) {
  ensureV13(game);
  updateMarket(game);
  if(game.business.opened){departmentMonthlyCost(game);autoRestock(game);autoAssign(game);prioritizeWarranty(game);createEmployeeEvent(game);}else{game.business.activeEmployeeEvent=null;}
  checkChapterRewards(game);
  challengeStatusV13(game);
  game.stability.lastHealthyAt = new Date().toISOString();
  return { ok:true };
}

export function processV13Year(game) {
  ensureV13(game);
  checkChapterRewards(game);
  challengeStatusV13(game);
  if (game.calendar.year >= 2010 && game.mode.id === 'campaign') {
    game.replay.newGamePlusUnlocked = true;
    game.campaign.completedAt ||= { ...game.calendar };
  }
  return { ok:true };
}

export function runV13Automation(game) {
  ensureV13(game);
  if(!game.business.opened)return;
  autoAssign(game);
  prioritizeWarranty(game);
}

export function diagnosticReport(game) {
  ensureV13(game);
  const activeOrders = game.orders.active || [];
  const warnings = [];
  if (game.player.energy < 20) warnings.push('Низкая энергия');
  if (activeOrders.some(order => order.deadlineDays <= 2)) warnings.push('Есть срочные заказы');
  if (game.business.employees.some(employee => employee.morale < 30)) warnings.push('Низкая мотивация сотрудника');
  if (game.finance.history[0]?.profit < 0) warnings.push('Последний месяц убыточный');
  if (game.market.activeEvent) warnings.push(`Рынок: ${game.market.activeEvent.name}`);
  return {
    version: game.version,
    saveId: game.id,
    updatedAt: game.updatedAt,
    calendar: { ...game.calendar },
    counts: {
      availableOrders: game.orders.available.length,
      activeOrders: activeOrders.length,
      historyOrders: game.orders.history.length,
      employees: game.business.employees.length,
      contracts: game.business.contracts.length,
      departments: game.business.departments.length
    },
    warnings,
    lastLogs: game.log.slice(0, 12).map(entry => ({ type:entry.type, text:entry.text }))
  };
}

export const V13_DATA = {
  AUTOMATION_RULES_V13, CHALLENGES_V13, DEPARTMENTS_V13, EMPLOYEE_TRAITS_V13,
  ERA_VISUAL_THEMES_V13, LEGACY_REWARDS_V13, MARKET_EVENTS_V13
};
