import { ALL_COMPONENTS, PC_SLOTS } from '../data/components.js';
import { BANK, ALL_LOCATIONS, ALL_VEHICLES, ENTERTAINMENT, UPGRADES } from '../data/economy.js';
import { ALL_EDUCATION, EXTRA_EDUCATION, SKILLS, ACHIEVEMENTS, ACH_GRADES } from '../data/progression.js';
import { WORKSPACE_GROUPS, WORKSPACE_ITEMS, workspaceAsset, workspaceBonuses, workspaceBonusText, workspaceCurrentTier, workspaceLevel, workspaceNextTier, workspaceRoomAsset, workspaceRoomStage } from '../data/workspace.js';
const REMOVED_POST_2010_ACHIEVEMENTS = new Set(['g4','g5','g6','g7','g8','g9','j6','j7']);
const ACTIVE_ACHIEVEMENTS = ACHIEVEMENTS.filter((item) => !REMOVED_POST_2010_ACHIEVEMENTS.has(item.id));
import { HERO_AVATARS, heroAvatarById, heroAvatarEra, heroAvatarFile } from '../data/avatars.js';
import { formatDate, formatMoney, escapeHtml, normalizedText } from '../core/utils.js';
import { availableComponents, componentPrice, componentSellPrice } from '../systems/economy.js';
import { EDUCATION_QUEUE_LIMIT, availableEducation, educationById, educationCost, educationDays, educationMarketStatusV167, educationPlayerXp, educationRequirements, isLongEducation, isTemporaryMaterial } from '../systems/education.js';
import { missingOrderItems, orderByUid, orderCartTotal, orderItemDetails } from '../systems/orders.js';
import { compatiblePartsForSlot, pcConflicts, pcPower, pcTier, pcSlotHint } from '../systems/pc.js';
import { JOB_POOL, currentSalary, salaryForJob, getEra, getInflation, getJob, getLocation, getVehicle, getWealthTier, jobRequirements, maxActiveOrders, maxEnergy, netWorth, requirementsMet, workSpeed, skillLevel } from '../systems/progression.js';
import { creditStatus, loanLimit } from '../systems/economy.js';
import { activityLabel } from '../systems/simulation.js';
import { fleaCooldown } from '../systems/flea-market.js';
import { ACTIVITY_PLANS, ADVANCED_SPECIALIZATIONS_V08, CITY_POINTS_V08, CONTRACT_TEMPLATES_V08, DECISION_EVENTS_V08, EMPLOYEE_TEMPLATES_V08 } from '../data/v08.js';
import { AUTOMATION_RULES_V13, CHALLENGES_V13, DEPARTMENTS_V13, EMPLOYEE_TRAITS_V13, LEGACY_REWARDS_V13, ORDER_TEST_PROTOCOLS_V13, REPAIR_APPROACHES_V13 } from '../data/v13.js';
import { EMPLOYEE_POOL_V161, activityPlan, advancedSpecialization, chapterStatus, challengeById, employeeForOrder, employeeTemplate, endingSummary, ensureV08, gameModeById, recommendedAction, refreshContractOffers } from '../systems/v08.js';
import { companyRequirement, ensureV160, exactEffectText } from '../systems/v160.js';
import { playerXpNeeded, skillXpNeeded } from '../core/game.js';
import { automationRuleById, challengeStatusV13, currentEraVisual, departmentById, departmentRequirement, diagnosticReport, employeeTrait, ensureV13, hasDepartment, marketPriceMultiplier } from '../systems/v13.js';
import { monthName, newsForDate } from '../data/news.js';
import { activeKnowledgeEntries, bookCooldownMonthsRemaining, knowledgeBonus } from '../systems/knowledge.js';
import { BUSINESS_TYPES_V161, businessTypeById } from '../data/v161.js';
import { CAREER_BRANCHES_V162, careerJobByBranchTier } from '../data/v162.js';
import { acceptPromotion, careerBranchState, careerCurrentBranch, ensureCareerV162, promotionStatus } from '../systems/career.js';
import { ADVERTISING_CATALOG_V162, ADVERTISING_DURATIONS_V162, advertisingPrice, advertisingRequirements, advertisingSummary, ensureAdvertisingV162 } from '../systems/advertising.js';
import { STARTER_BACKGROUNDS_V163, starterBackgroundById } from '../data/backgrounds-v165.js';
import { BUSINESS_STAGES_V165, EMPLOYEE_TRAINING_PROGRAMS_V165, FINANCE_CATEGORY_LABELS_V165 } from '../data/v165.js';
import { businessStage, businessStageRequirement, companyCapacity, employeeSkillSummary, employeeTrainingPrice, ensureV165, clientTypeInfo, orderInfluenceBreakdown } from '../systems/v165.js';
import { contextualTip, ensureQualityState, ledgerEntries, latestFinancialReport, validateGameState } from '../core/quality.js';
import { ORDER_TASK_TYPES_V166, orderTaskTypeV166 } from '../data/v166.js';
import { orderDeadlineProgressV166, refreshCooldownRemainingV166, targetAvailableOrdersV166 } from '../systems/v166.js';
import { LIFESTYLE_PLANS_V169 } from '../data/v169.js';
import { energyErrorPenalty, energyPerformanceFactor, lifestyleDailyCost, lifestylePlan } from '../systems/v169.js';
import { AD_CATEGORY_ASSETS_V180, DIFFICULTY_MODES_V180, EMPLOYEE_ROLES_V180, QUOTE_STRATEGIES_V180 } from '../data/v180.js';
import { employeeRoleV180, ensureV180, orderWorkModeV180, quoteOptionsV180, reputationRowsV180, stationForOrderV180, unreadNotificationsV180, v180HomeSummary, workstationStatusV180 } from '../systems/v180.js';
import { clientArchetypeV182, ensureV182, feedbackReportV182, recoveryStatusV182, releaseGoalsV182, releaseReadinessReportV182, specializationPerkV182 } from '../systems/v182.js';
import { AD_AUDIENCE_HINTS_V182 } from '../data/v182.js';

const skillMeta = Object.fromEntries(SKILLS.map((skill) => [skill.id, skill]));
const componentMeta = Object.fromEntries(ALL_COMPONENTS.map((component) => [component.id, component]));

const SKILL_GUIDANCE = {
  hardware:{ title:'Железо', steps:['Выполняйте заказы на сборку, апгрейд и замену комплектующих.', 'Покупайте и улучшайте монитор, компьютер, клавиатуру и мышь в мастерской.', 'Проходите книги и курсы по сборке ПК, электронике и радиотехнике.'], tip:'Лучше всего растёт от практических заказов и профильного обучения.' },
  software:{ title:'Софт', steps:['Берите заказы на установку Windows, драйверов и программ.', 'Изучайте книги по ОС, DOS, Linux и проходите софтовые курсы.', 'Собирайте собственный ПК и чаще работайте с настройкой системы.'], tip:'Если не хватает софта — идите в обучение и берите задания на настройку ОС.' },
  networking:{ title:'Сети', steps:['Проходите книги и курсы по сетям, DNS, Wi‑Fi и администрированию.', 'Берите заказы, где фигурируют модемы, интернет, роутеры и локальные сети.', 'Следите за карточками навыков: часть сетевого опыта приходит из курсов и YouTube/форумов.'], tip:'Для быстрого старта по сетям подойдут «Компьютерные сети», «Сетевой администратор» и сетевые заявки.' },
  repair:{ title:'Ремонт', steps:['Чините неисправные находки с барахолки и сложные ремонтные заказы.', 'Изучайте книги по пайке и ремонту ноутбуков.', 'Развивайте инструменты и рабочее место — это помогает чаще работать с ремонтом.'], tip:'Ремонт качается медленнее, но особенно полезен для дорогих поломок и барахолки.' },
  data:{ title:'Данные', steps:['Берите задачи по восстановлению данных и работе с дисками.', 'Проходите книги, курсы и ролики по RAID, бэкапам и восстановлению.', 'Следите за эпохой: часть профильного обучения откроется позже по годам.'], tip:'Если ветка кажется пустой — проверьте новые годы и обучение, навыки данных раскрываются чуть позже.' },
  security:{ title:'Безопасность', steps:['Учитесь на курсах и форумах по защите Windows и ИБ.', 'Берите заказы на вирусы, аудит и проблемные офисные машины.', 'Держите хороший баланс софта и сетей: они помогают развивать безопасность.'], tip:'ИБ растёт от событий с вредоносным ПО, специальных заказов и профильного обучения.' },
  communication:{ title:'Общение', steps:['Обслуживайте клиентов, закрывайте заказы и читайте книги/лекции по переговорам.', 'Проходите языки, лекции и курсы, связанные с сервисом и общением.', 'Работайте без провалов — это тоже усиливает клиентский сервис.'], tip:'Общение помогает лучше продавать, удерживать клиентов и открывать карьерные ветки.' },
  management:{ title:'Управление', steps:['Развивайте бизнес, сотрудников и сложные карьерные роли.', 'Читайте бизнес-книги, лекции и проходите курсы по менеджменту.', 'Выполняйте больше заказов и наращивайте мастерскую — игра поощряет управленческий рост.'], tip:'Управление особенно полезно в поздней игре, когда появляется команда и отделы.' }
};

function avatarImage(avatarId, alt = 'Аватар героя', className = 'avatar-image', year = 2000) {
  const era = heroAvatarEra(year);
  return `<img class="${className}" src="${heroAvatarFile(avatarId, year)}" alt="${escapeHtml(alt)}" data-avatar-era="${era.id}">`;
}

function avatarBonusItems(avatar) {
  return (avatar?.bonuses || []).map((item) => ({
    ...item,
    meta: skillMeta[item.skill] || { name:item.skill, icon:'+' }
  }));
}

function avatarBonusChips(avatar, className = 'avatar-bonus-list') {
  const items = avatarBonusItems(avatar);
  return `<div class="${className}">${items.map((item) => `<span><i class="setup-skill-icon">${skillIconMarkup(item.skill, item.meta.name)}</i><strong>+${item.amount}</strong> ${escapeHtml(item.meta.name)}</span>`).join('')}</div>`;
}

function backgroundBonusChips(backgroundId, className = 'background-bonus-list') {
  const background = starterBackgroundById(backgroundId);
  return `<div class="${className}">${(background.bonuses || []).map((item) => { const meta=skillMeta[item.skill]||{name:item.skill,icon:'+'}; return `<span><i class="setup-skill-icon">${skillIconMarkup(item.skill, meta.name)}</i><strong>+${item.amount}</strong> ${escapeHtml(meta.name)}</span>`; }).join('')}</div>`;
}

function skillGuide(skillId) {
  return SKILL_GUIDANCE[skillId] || { title:'Навык', steps:['Пробуйте профильные заказы и обучение.'], tip:'Подсказка появится позже.' };
}

function employeeEventChoices(event, employee) {
  if (event?.type === 'raise') return [
    { value:'accept', label:'Повысить зарплату на 15%', desc:`зарплата ${formatMoney(employee?.salary||0)} → ${formatMoney(Math.round(Number(employee?.salary||0)*1.15))} · мотивация +16` },
    { value:'decline', label:'Отказать', desc:'мотивация −18 · если станет ниже 25 — риск ухода 35%' }
  ];
  if (event?.type === 'training') {
    const cost = Math.round(Number(employee?.salary || 0) * .7);
    return [
      { value:'accept', label:'Оплатить обучение', desc:`−${formatMoney(cost)} · квалификация +0,65 · мотивация +8` },
      { value:'decline', label:'Не сейчас', desc:'прямой эффект: 0' }
    ];
  }
  return [
    { value:'support', label:'Поддержать сотрудника', desc:'мотивация +5 · качество компании −2' },
    { value:'decline', label:'Ввести строгий контроль', desc:'мотивация −8 · ошибки +1 · качество компании +2' }
  ];
}

function decisionEffectiveSkillV182(game,id){
  const perk=specializationPerkV182(game);
  return skillLevel(game,id)+(id==='security'&&perk.skill==='security'?Number(perk.eventBonus||0):0);
}
function decisionChoiceRequirements(game, choice) {
  const rows = Object.entries(choice?.reqSkills || {}).map(([id, level]) => {
    const current = decisionEffectiveSkillV182(game,id);
    return `${skillMeta[id]?.name || id} ${current}/${level}`;
  });
  return rows.length ? `Нужно: ${rows.join(' · ')}` : '';
}
function decisionChoiceHint(game, choice) {
  const parts=[exactEffectText(choice?.effect || {})];
  const requirements=decisionChoiceRequirements(game,choice);
  if(requirements)parts.push(requirements);
  return parts.filter(Boolean).join(' · ');
}
function decisionChoiceAvailable(game, choice) {
  if (choice?.reqSkills && Object.entries(choice.reqSkills).some(([id,level])=>decisionEffectiveSkillV182(game,id)<Number(level||0))) return false;
  const effect=choice?.effect || {};
  if (Number(effect.cash || 0) < 0 && Number(game.player?.cash || 0) < Math.abs(Number(effect.cash || 0))) return false;
  if (Number(effect.energy || 0) < 0 && Number(game.player?.energy || 0) < Math.abs(Number(effect.energy || 0))) return false;
  return true;
}

const WORKSPACE_SCENE_LAYOUT = {
  poster:{ left:7, top:7, width:14 },
  lamp:{ left:8, top:36, width:12 },
  books:{ left:6, top:72, width:12 },
  notebook:{ left:20, top:74, width:12 },
  stationery:{ left:31, top:72, width:10 },
  monitor:{ left:33, top:41, width:22 },
  keyboard:{ left:39, top:63, width:18 },
  mouse:{ left:58, top:66, width:10 },
  mug:{ left:23, top:62, width:8 },
  floppies:{ left:18, top:58, width:8 },
  speakers:{ left:23, top:44, width:9 },
  clock:{ left:59, top:18, width:8 },
  computer:{ left:69, top:34, width:16 },
  printer:{ left:74, top:66, width:14 },
  plant:{ left:83, top:72, width:10 },
  chair:{ left:47, top:76, width:14 }
};


function retroIcon(kind, label = '') {
  const icons = {
    money: '<path d="M7 3v18M7 3h6a5 5 0 0 1 0 10H7M5 13h12M5 17h9"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="1"/><path d="M9 9h6v6H9zM3 8h3M3 12h3M3 16h3M18 8h3M18 12h3M18 16h3M8 3v3M12 3v3M16 3v3M8 18v3M12 18v3M16 18v3"/>',
    gpu: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="10" cy="12" r="4"/><path d="M16 9h3M16 12h3M16 15h3M5 18v2M8 18v2"/>',
    ram: '<rect x="3" y="8" width="18" height="8" rx="1"/><path d="M6 10h2v4H6zM10 10h2v4h-2zM14 10h2v4h-2zM18 10h1v4h-1M6 16v2M9 16v2M12 16v2M15 16v2M18 16v2"/>',
    storage: '<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="10" r="4"/><circle cx="12" cy="10" r="1"/><path d="M9 17h6"/>',
    mb: '<rect x="4" y="4" width="16" height="16" rx="1"/><rect x="7" y="7" width="6" height="6"/><path d="M15 7h2v8h-2M7 15h10M7 18h5M4 9H2M4 15H2M20 8h2M20 14h2"/>',
    psu: '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="10" cy="12" r="4"/><path d="M16 9h2M16 12h2M16 15h2"/>',
    case: '<rect x="6" y="2" width="12" height="20" rx="2"/><circle cx="12" cy="6" r="1"/><path d="M9 11h6M9 14h6M9 17h6"/>',
    cool: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 4c2 2 2 4 0 6M20 12c-2 2-4 2-6 0M12 20c-2-2-2-4 0-6M4 12c2-2 4-2 6 0"/>',
    periph: '<rect x="3" y="5" width="18" height="11" rx="1"/><path d="M8 20h8M12 16v4"/>',
    cons: '<path d="M8 3h8v5l3 5a5 5 0 0 1-4 8H9a5 5 0 0 1-4-8l3-5zM8 8h8M8 14h8"/>',
    tool: '<path d="M14 4a5 5 0 0 0-6 6L3 15l6 6 5-5a5 5 0 0 0 6-6l-4 3-3-3z"/>',
    virus: '<circle cx="12" cy="12" r="6"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3M9 11h1M14 11h1M10 15h4"/>',
    windows: '<path d="M4 5l7-1v8H4zM13 4l7-1v9h-7zM4 14h7v7l-7-1zM13 14h7v8l-7-1z"/>',
    dust: '<path d="M4 16c3-5 6-7 10-5 3 1 5 0 6-3M4 20c4-4 8-5 12-3M7 8h1M11 5h1M16 7h1"/>',
    network: '<circle cx="5" cy="17" r="2"/><circle cx="19" cy="17" r="2"/><circle cx="12" cy="6" r="2"/><path d="M7 16l4-8M17 16l-4-8M7 17h10"/>',
    repair: '<path d="M14 4a5 5 0 0 0-6 6L3 15l6 6 5-5a5 5 0 0 0 6-6l-4 3-3-3z"/>',
    build: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5M16 17h1"/>',
    hint: '<path d="M9 18h6M10 22h4M8 14a7 7 0 1 1 8 0c-1 1-1 2-1 3H9c0-1 0-2-1-3z"/>'
  };
  const path = icons[kind] || icons.tool;
  return `<svg class="retro-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${path}</svg>${label ? `<span class="sr-only">${escapeHtml(label)}</span>` : ''}`;
}

function rubleIcon() { return retroIcon('money', 'Рубли'); }
const TOOL_ASSETS_V161 = {
  tool_screw_basic:'./assets/workspace/catalog/ws_screwdrivers/1.webp',
  tool_screw_set:'./assets/workspace/catalog/ws_pro_screwdrivers/1.webp',
  tool_tweezer:'./assets/workspace/catalog/ws_tweezers/1.webp',
  tool_anti_mat:'./assets/workspace/catalog/ws_antistatic_mat/1.webp',
  tool_multimeter:'./assets/workspace/catalog/ws_multimeter/1.webp',
  tool_solder_iron:'./assets/workspace/catalog/ws_soldering/1.webp',
  tool_osc_analog:'./assets/workspace/catalog/ws_oscilloscope/1.webp',
  tool_crimper:'./assets/workspace/catalog/ws_crimper/1.webp'
};
const TAB_ICON_ASSETS_V168 = {
  home:'./assets/ui-v168/menu/main.webp',
  orders:'./assets/ui-v168/menu/orders.webp',
  workshop:'./assets/ui-v168/menu/workshop.webp',
  flea:'./assets/ui-v171/flea/baraholka.webp',
  rest:'./assets/ui-v168/menu/rest.webp',
  education:'./assets/ui-v168/menu/education.webp',
  more:'./assets/ui-v168/menu/more.webp'
};
const MORE_ICON_ASSETS_V168 = {
  notifications:'./assets/ui-v181/menu/notifications_center.webp?v=182',
  workshop:'./assets/ui-v168/menu/workshop.webp',
  development:'./assets/ui-v168/menu/development.webp',
  hero:'./assets/ui-v168/menu/development.webp',
  jobs:'./assets/ui-v168/menu/jobs.webp',
  skills:'./assets/ui-v168/menu/skills.webp',
  rest:'./assets/ui-v168/menu/rest.webp',
  property:'./assets/ui-v168/menu/property.webp',
  finance:'./assets/ui-v168/menu/finance.webp',
  bank:'./assets/ui-v168/menu/bank.webp',
  business:'./assets/ui-v168/menu/business.webp',
  advertising:'./assets/ui-v168/menu/advertising.webp',
  achievements:'./assets/ui-v168/menu/achievements.webp',
  log:'./assets/ui-v168/menu/log.webp',
  settings:'./assets/ui-v168/menu/settings.webp',
  flea:'./assets/ui-v171/flea/baraholka.webp',
  'quick-save':'./assets/ui-v169/special/save.webp'
};
const SKILL_ICON_ASSETS_V168 = {
  hardware:'./assets/ui-v169/skills/hardware.webp',
  software:'./assets/ui-v169/skills/software.webp',
  networking:'./assets/ui-v169/skills/networking.webp',
  repair:'./assets/ui-v169/skills/repair.webp',
  security:'./assets/ui-v169/skills/security.webp',
  data:'./assets/ui-v169/skills/data.webp',
  communication:'./assets/ui-v169/skills/communication.webp',
  management:'./assets/ui-v169/skills/management.webp'
};
const EDUCATION_ICON_ASSETS_V168 = {
  hardware:'./assets/ui-v168/education/hardware_2.webp',
  software:'./assets/ui-v168/education/software_2.webp',
  networking:'./assets/ui-v168/education/networking_2.webp',
  repair:'./assets/ui-v168/education/repair_2.webp',
  security:'./assets/ui-v168/education/security_2.webp',
  data:'./assets/ui-v168/education/data_2.webp',
  communication:'./assets/ui-v168/education/communication_2.webp',
  management:'./assets/ui-v168/education/management_2.webp'
};
const UNIVERSITY_ICON_ASSETS_V169 = {
  hardware:['./assets/ui-v169/universities/hardware_1.webp','./assets/ui-v169/universities/hardware_2.webp'],
  software:['./assets/ui-v169/universities/software_1.webp','./assets/ui-v169/universities/software_2.webp'],
  networking:['./assets/ui-v169/universities/networking_1.webp','./assets/ui-v169/universities/networking_2.webp'],
  repair:['./assets/ui-v169/universities/repair_1.webp','./assets/ui-v169/universities/repair_2.webp'],
  security:['./assets/ui-v169/universities/security_1.webp','./assets/ui-v169/universities/security_2.webp'],
  data:['./assets/ui-v169/universities/data_1.webp','./assets/ui-v169/universities/data_2.webp'],
  communication:['./assets/ui-v169/universities/communication_1.webp','./assets/ui-v169/universities/communication_2.webp'],
  management:['./assets/ui-v169/universities/management_1.webp','./assets/ui-v169/universities/management_2.webp']
};

const BUSINESS_ICON_ASSETS_V168 = {
  service_repair:{1:'./assets/ui-v169/business/repair_1.webp',3:'./assets/ui-v169/business/repair_3.webp',5:'./assets/ui-v169/business/repair_5.webp'},
  pc_builder:{1:'./assets/ui-v169/business/hardware_1.webp',3:'./assets/ui-v169/business/hardware_3.webp',5:'./assets/ui-v169/business/hardware_5.webp'},
  network_admin:{1:'./assets/ui-v169/business/networking_1.webp',3:'./assets/ui-v169/business/networking_3.webp',5:'./assets/ui-v169/business/networking_5.webp'},
  isp:{1:'./assets/ui-v169/business/networking_1.webp',3:'./assets/ui-v169/business/networking_3.webp',5:'./assets/ui-v169/business/networking_5.webp'},
  web_studio:{1:'./assets/ui-v169/business/software_1.webp',3:'./assets/ui-v169/business/software_3.webp',5:'./assets/ui-v169/business/software_5.webp'},
  software_shop:{1:'./assets/ui-v169/business/software_1.webp',3:'./assets/ui-v169/business/software_3.webp',5:'./assets/ui-v169/business/software_5.webp'},
  web_support:{1:'./assets/ui-v169/business/security_1.webp',3:'./assets/ui-v169/business/security_3.webp',5:'./assets/ui-v169/business/security_5.webp'},
  training_center:{1:'./assets/ui-v169/business/communication_1.webp',3:'./assets/ui-v169/business/communication_3.webp',5:'./assets/ui-v169/business/communication_5.webp'},
  it_outsource:{1:'./assets/ui-v169/business/management_1.webp',3:'./assets/ui-v169/business/management_3.webp',5:'./assets/ui-v169/business/management_5.webp'},
  data_recovery:{1:'./assets/ui-v169/business/data_1.webp',3:'./assets/ui-v169/business/data_3.webp',5:'./assets/ui-v169/business/data_5.webp'}
};
const COMPONENT_ICON_ASSETS_V168 = {
  tool_wrist:'./assets/ui-v168/consumables/anti_static_wrist.webp',
  therm:'./assets/ui-v168/consumables/thermal_paste.webp',
  therm_paste:'./assets/ui-v168/consumables/thermal_paste.webp',
  air:'./assets/ui-v168/consumables/compressed_air.webp',
  alco:'./assets/ui-v168/consumables/isopropyl.webp',
  ide_c:'./assets/ui-v168/consumables/ide_cable.webp',
  paste_brush:'./assets/ui-v168/consumables/cleaning_brush.webp',
  win98_cd:'./assets/ui-v168/consumables/windows_98.webp',
  win2k_cd:'./assets/ui-v168/consumables/windows_2000.webp',
  winxp_cd:'./assets/ui-v168/consumables/windows_xp.webp',
  winxp_pro_cd:'./assets/ui-v168/consumables/windows_xp.webp',
  av_drweb:'./assets/ui-v168/consumables/drweb.webp',
  av_kasper:'./assets/ui-v169/special/kaspersky.webp',
  screen_cloth:'./assets/ui-v169/special/screen_cloth.webp'
};
const REST_STATUS_ASSETS_V171 = {
  money:'./assets/ui-v171/stats/money.webp',
  energy:'./assets/ui-v171/stats/energy.webp',
  reputation:'./assets/ui-v171/stats/reputation.webp',
  level:'./assets/ui-v171/stats/level.webp',
  mood:'./assets/ui-v171/stats/mood.webp',
  fun:'./assets/ui-v171/stats/fun.webp',
  health:'./assets/ui-v171/stats/health.webp'
};
const UI_V181_METRIC_ASSETS = {
  revenue:'./assets/ui-v181/metrics/revenue.webp?v=182',
  adOrders:'./assets/ui-v181/metrics/ad_orders.webp?v=182',
  spent:'./assets/ui-v181/metrics/spent.webp?v=182',
  active:'./assets/ui-v181/metrics/active.webp?v=182',
  loans:'./assets/ui-v181/metrics/loans.webp?v=182',
  deposits:'./assets/ui-v181/metrics/deposits.webp?v=182',
  careerIncome:'./assets/ui-v181/metrics/career_income.webp?v=182',
  notifications:'./assets/ui-v181/menu/notifications_center.webp?v=182'
};
const ORDER_ACTION_ASSETS_V183 = {
  accept:'./assets/ui-v183/order_actions/accept_order.webp?v=183',
  diagnosis:'./assets/ui-v183/order_actions/diagnosis.webp?v=183',
  repair:'./assets/ui-v183/order_actions/repair_strategy.webp?v=183',
  refresh:'./assets/ui-v183/order_actions/refresh_orders.webp?v=183',
  quality:'./assets/ui-v183/order_actions/quality_control.webp?v=183',
  start:'./assets/ui-v183/order_actions/start_work.webp?v=183',
  lowEnergy:'./assets/ui-v183/order_actions/low_energy.webp?v=183',
  materials:'./assets/ui-v183/order_actions/materials.webp?v=183'
};
const ACHIEVEMENT_CATEGORY_ASSETS_V173 = {
  orders:'./assets/ui-v168/menu/orders.webp',
  money:'./assets/ui-v171/stats/money.webp',
  skills:'./assets/ui-v169/skills/hardware.webp',
  edu:'./assets/ui-v168/menu/education.webp',
  property:'./assets/ui-v168/menu/property.webp',
  career:'./assets/ui-v168/menu/jobs.webp',
  era:'./assets/app-icon.png',
  rep:'./assets/ui-v171/stats/reputation.webp',
  level:'./assets/ui-v171/stats/level.webp',
  special:'./assets/ui-v168/menu/achievements.webp'
};
const BOOK_ICON_ASSETS_V171 = {
  hardware:'./assets/ui-v171/education/books_hardware.webp',
  software:'./assets/ui-v171/education/books_software.webp',
  networking:'./assets/ui-v171/education/books_networking.webp',
  repair:'./assets/ui-v171/education/books_repair.webp',
  security:'./assets/ui-v171/education/books_security.webp',
  data:'./assets/ui-v171/education/books_software.webp',
  communication:'./assets/ui-v171/education/books_communication.webp',
  management:'./assets/ui-v171/education/books_communication.webp'
};
const DECISION_EVENT_ASSETS_V171 = {
  power_cut:'./assets/ui-v171/events/decision/power_cut.webp',
  employee_raise:'./assets/ui-v171/events/decision/employee_raise.webp',
  big_client:'./assets/ui-v171/events/decision/big_client.webp',
  inspection:'./assets/ui-v171/events/decision/inspection.webp',
  internet_outage:'./assets/ui-v171/events/decision/internet_outage.webp',
  small_flood:'./assets/ui-v171/events/decision/small_flood.webp',
  vehicle_breakdown:'./assets/ui-v171/events/decision/vehicle_breakdown.webp',
  inheritance_phone:'./assets/ui-v171/events/decision/inheritance_phone.webp',
  small_inheritance:'./assets/ui-v171/events/decision/small_inheritance.webp',
  recommendation:'./assets/ui-v171/events/decision/recommendation.webp',
  racket_visit:'./assets/ui-v171/events/decision/racket_visit.webp',
  broken_window:'./assets/ui-v171/events/decision/broken_window.webp',
  street_pressure:'./assets/ui-v171/events/decision/street_pressure.webp',
  stolen_tools:'./assets/ui-v171/events/decision/stolen_tools.webp'
};
const TEAM_EVENT_ASSETS_V171 = {
  raise:'./assets/ui-v171/events/team/raise.webp',
  training:'./assets/ui-v171/events/team/training.webp',
  mistake:'./assets/ui-v171/events/team/mistake.webp'
};
const MARKET_EVENT_ASSETS_V171 = {
  crisis_2008:'./assets/ui-v171/events/market/crisis_2008.webp',
  clearance:'./assets/ui-v171/events/market/clearance.webp',
  currency_jump:'./assets/ui-v171/events/market/currency_jump.webp'
};
const FLEA_ASSETS_V171 = {
  hero:'./assets/ui-v171/flea/baraholka.webp',
  market:'./assets/ui-v171/flea/radiomarket.webp',
  trash:'./assets/ui-v171/flea/old_tech.webp',
  boards:'./assets/ui-v171/flea/boards.webp'
};
const COMPONENT_CATEGORY_ASSETS_V171 = {
  cpu:'./assets/ui-v171/components/cpu.webp',
  gpu:'./assets/ui-v171/components/gpu.webp',
  mb:'./assets/ui-v171/components/mb.webp',
  ram:'./assets/ui-v171/components/ram.webp',
  storage:'./assets/ui-v171/components/storage.webp',
  psu:'./assets/ui-v171/components/psu.webp',
  case:'./assets/ui-v171/components/case.webp',
  cool:'./assets/ui-v171/components/cool.webp',
  periph:'./assets/ui-v171/components/monitor.webp'
};
const COMPONENT_SPECIFIC_ASSETS_V171 = {
  net_wifi_router:'./assets/ui-v171/components/wifi_router.webp',
  net_wifi_n:'./assets/ui-v171/components/wifi_router.webp',
  net_switch:'./assets/ui-v171/components/switch.webp',
  net_nic_1g:'./assets/ui-v171/components/network_card.webp',
  usb_stick_1g:'./assets/ui-v171/components/usb_flash.webp',
  usb_stick_8g:'./assets/ui-v171/components/usb_flash.webp',
  tool_usb_flash:'./assets/ui-v171/components/usb_flash.webp',
  kb_ps2:'./assets/ui-v171/components/keyboard.webp',
  kb_usb_basic:'./assets/ui-v171/components/keyboard.webp',
  mon_crt15:'./assets/ui-v171/components/monitor.webp',
  mon_crt17:'./assets/ui-v171/components/monitor.webp',
  mon_crt19:'./assets/ui-v171/components/monitor.webp',
  mon_lcd15:'./assets/ui-v171/components/monitor.webp',
  mon_lcd17:'./assets/ui-v171/components/monitor.webp',
  mon_lcd19_sq:'./assets/ui-v171/components/monitor.webp',
  mon_lcd22:'./assets/ui-v171/components/monitor.webp',
  mon_24_fhd:'./assets/ui-v171/components/monitor.webp'
};

function imageIcon(path, alt = '', className = 'illustrated-icon') {
  return path ? `<img src="${path}" alt="${escapeHtml(String(alt || ''))}" class="${className}" loading="lazy">` : '';
}
function tabIconMarkup(id, fallback) {
  return TAB_ICON_ASSETS_V168[id] ? imageIcon(TAB_ICON_ASSETS_V168[id], fallback, 'nav-icon-image') : escapeHtml(String(fallback));
}
function moreIconMarkup(id, fallback) {
  return MORE_ICON_ASSETS_V168[id] ? imageIcon(MORE_ICON_ASSETS_V168[id], fallback, 'menu-icon-image') : escapeHtml(String(fallback));
}
function actionIconMarkup(path, alt = '') {
  return imageIcon(path, alt, 'action-button-icon');
}
function skillIconMarkup(skillId, label, mode = 'skill') {
  const path = mode === 'education' ? EDUCATION_ICON_ASSETS_V168[skillId] : SKILL_ICON_ASSETS_V168[skillId];
  return path ? imageIcon(path, label, mode === 'education' ? 'education-icon-image' : 'skill-icon-image') : `<span>${escapeHtml(String(label || skillId || '•'))}</span>`;
}
function businessStageIconPath(typeId, stage = 1) {
  const pack = BUSINESS_ICON_ASSETS_V168[typeId];
  if (!pack) return '';
  if (stage >= 5) return pack[5] || pack[3] || pack[1] || '';
  if (stage >= 3) return pack[3] || pack[1] || '';
  return pack[1] || '';
}
function businessTypeIconMarkup(typeId, label, stage = 1, className = 'company-type-icon-image') {
  return imageIcon(businessStageIconPath(typeId, stage), label, className);
}
function stableAssetVariant(value = '') {
  let hash = 0;
  for (const char of String(value || '')) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return Math.abs(hash) % 2;
}
function educationFocus(item) {
  const gains = Object.entries(item?.skillGains || {});
  return item?.focusSkill || item?.focus || (gains.sort((a,b)=>Number(b[1])-Number(a[1]))[0]?.[0]) || 'software';
}
function educationIllustration(item) {
  const focus = educationFocus(item);
  if (item?.type === 'university') {
    const variants = UNIVERSITY_ICON_ASSETS_V169[focus] || UNIVERSITY_ICON_ASSETS_V169.software;
    return imageIcon(variants[stableAssetVariant(item.id || item.name)], item.name || focus, 'education-icon-image university-icon-image');
  }
  if (item?.type === 'college') return skillIconMarkup(focus, item.name || focus, 'education');
  if (item?.type === 'book') {
    const asset = BOOK_ICON_ASSETS_V171[focus];
    return asset ? imageIcon(asset, item.name || focus, 'education-icon-image') : skillIconMarkup(focus, item.name || focus, 'education');
  }
  if (item?.type === 'youtube') return imageIcon('./assets/ui-v171/education/youtube.webp', item.name || 'YouTube', 'education-icon-image');
  return skillIconMarkup(focus, item.name || focus, 'skill');
}
function componentArt(component) {
  const id = String(component?.id || '');
  const name = String(component?.name || '').toLowerCase();
  const exact = COMPONENT_SPECIFIC_ASSETS_V171[id] || COMPONENT_ICON_ASSETS_V168[id] || TOOL_ASSETS_V161[id];
  let asset = exact;
  if (!asset) {
    if (/wi[ -]?fi|роутер/.test(name)) asset = './assets/ui-v171/components/wifi_router.webp';
    else if (/свитч|switch/.test(name)) asset = './assets/ui-v171/components/switch.webp';
    else if (/сетев|nic|ethernet|lan/.test(name)) asset = './assets/ui-v171/components/network_card.webp';
    else if (/usb|флеш/.test(name)) asset = './assets/ui-v171/components/usb_flash.webp';
    else if (/клав|keyboard/.test(name)) asset = './assets/ui-v171/components/keyboard.webp';
    else if (/монитор|monitor|lcd|элт/.test(name)) asset = './assets/ui-v171/components/monitor.webp';
    else asset = COMPONENT_CATEGORY_ASSETS_V171[component?.cat];
  }
  return asset ? `<img class="component-art-image" src="${asset}?v=171" alt="${escapeHtml(component?.name||'Инструмент')}" loading="lazy">` : retroIcon(component?.cat || 'tool', component?.name || 'Предмет');
}
function orderArt(order) {
  const type=orderTaskTypeV166(order);
  return `<img class="order-type-image" src="./assets/orders/types/${type.icon}?v=167" alt="${escapeHtml(type.name)}" loading="lazy">`;
}

function iconForTab(id) {
  const fallback = {
    home: 'HOME',
    orders: 'ORD',
    workshop: 'WORK',
    growth: 'DEV',
    career: 'JOB',
    rest: 'REST',
    education: 'EDU',
    more: 'MORE'
  }[id] || 'IT';
  return tabIconMarkup(id, fallback);
}

function progress(value, max, tone = '') {
  const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0));
  return `<div class="progress ${tone}"><span style="width:${pct}%"></span></div>`;
}

function chip(text, tone = '') {
  return `<span class="chip ${tone}">${text}</span>`;
}

function stat(label, value, icon, tone = '') {
  return `<article class="metric"><span class="metric-icon">${icon}</span><div><small>${label}</small><strong class="${tone}">${value}</strong></div></article>`;
}
function metricImageIcon(path, alt = '') {
  return imageIcon(path, alt, 'metric-inline-image');
}
function previousMonthInfo(year, month) {
  const currentYear = Number(year || 2000);
  const currentMonth = Number(month || 1);
  return currentMonth > 1 ? { year: currentYear, month: currentMonth - 1 } : { year: currentYear - 1, month: 12 };
}

function emptyState(icon, title, text) {
  return `<div class="empty-state"><span>${icon}</span><h3>${title}</h3><p>${text}</p></div>`;
}

function pageHeader(kicker, title, subtitle = '') {
  return `<header class="page-heading"><p class="eyebrow">${kicker}</p><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</header>`;
}

function sectionNav(items, active, scope) {
  return `<div class="section-tabs ${scope}-tabs">${items.map(([id, label]) => `<button class="${active === id ? 'active' : ''}" data-action="section-tab" data-scope="${scope}" data-value="${id}">${label}</button>`).join('')}</div>`;
}

export function renderProfiles(profiles, ui) {
  const created=profiles.map((profile,index)=>({profile,index})).filter(item=>item.profile);
  const firstEmpty=profiles.findIndex(profile=>!profile);
  const cards=[...created];
  if(firstEmpty>=0)cards.push({profile:null,index:firstEmpty});
  return `<main class="entry-shell">
    <button class="theme-fab" data-action="toggle-theme" aria-label="Переключить тему">ТЕМА</button>
    <section class="entry-card panel">
      <div class="boot-mark"><span></span><b>VERSION 0.18.3</b></div>
      <div class="entry-brand"><img src="./assets/app-icon.png" alt="" class="entry-icon"><div><p class="eyebrow">РЕТРО-СИМУЛЯТОР КАРЬЕРЫ</p><h1>Хроники<br><em>Айтишника</em></h1></div></div>
      <p class="lead">Начни в 2000-м с дискет, Windows 98 и ремонта домашних ПК. Развивай навыки, мастерскую и бизнес до финала 2010 года.</p>
      <div class="profile-list-title"><strong>Карьеры</strong><small>${created.length} из 10 создано</small></div>
      <div class="profile-list">
        ${cards.map(({profile,index})=>{
          if(!profile)return `<button class="profile-slot empty" data-action="new-profile" data-index="${index}"><span class="plus">＋</span><span><strong>Создать карьеру</strong><small>Откроется следующий свободный слот</small></span></button>`;
          const avatar=heroAvatarById(profile.profile.avatar);
          return `<article class="profile-slot panel-soft"><div class="avatar avatar-image-wrap">${avatarImage(profile.profile.avatar,avatar.name,'avatar-image',profile.calendar?.year||2000)}</div><div class="profile-copy"><strong>${escapeHtml(profile.profile.name)}</strong><small>Слот ${index+1} · ${profile.calendar.year} год · ур. ${profile.player.level} · ${formatMoney(profile.player.cash)}</small></div><div class="profile-actions"><button class="icon-btn primary" data-action="open-profile" data-index="${index}" aria-label="Продолжить">Открыть</button><button class="icon-btn danger" data-action="delete-profile" data-index="${index}" aria-label="Удалить">×</button></div></article>`;
        }).join('')}
      </div>
      <p class="version-note">Игра работает локально · интернет не требуется · можно создать до 10 карьер</p>
    </section>
  </main>`;
}

export function renderSetup(ui) {
  const selectedBackground=starterBackgroundById(ui.specialization||'hardware');
  const selectedBackgroundIndex=Math.max(0,STARTER_BACKGROUNDS_V163.findIndex(item=>item.id===selectedBackground.id));
  const selectedAvatar=heroAvatarById(ui.avatar||'classic');
  const selectedAvatarIndex=Math.max(0,HERO_AVATARS.findIndex(item=>item.id===selectedAvatar.id));
  return `<main class="entry-shell">
    <button class="theme-fab" data-action="toggle-theme" aria-label="Переключить тему">ТЕМА</button>
    <section class="entry-card panel setup-card">
      <button class="icon-btn back" data-action="back-profiles">←</button>
      <p class="eyebrow">НОВАЯ КАРЬЕРА · СЛОТ ${ui.setupSlot+1}</p><h2>Создание персонажа</h2>
      <label class="field"><span>Имя айтишника</span><input id="playerName" maxlength="20" placeholder="Например: Алекс" autocomplete="off" value="${escapeHtml(ui.playerName||'')}"></label>
      <div class="field-title">Стартовый профессиональный бэкграунд</div>
      <section class="background-picker panel-soft" aria-label="Выбор профессионального бэкграунда">
        <button class="avatar-picker-arrow" data-action="previous-background" aria-label="Предыдущий бэкграунд">‹</button>
        <div class="background-picker-card"><div><strong>${escapeHtml(selectedBackground.name)}</strong><small>${escapeHtml(selectedBackground.desc)}</small>${backgroundBonusChips(selectedBackground.id,'background-picker-bonuses')}<span>${selectedBackgroundIndex+1} из ${STARTER_BACKGROUNDS_V163.length}</span></div></div>
        <button class="avatar-picker-arrow" data-action="next-background" aria-label="Следующий бэкграунд">›</button>
      </section>
      <div class="field-title">Профиль героя и стартовые бонусы</div>
      <section class="avatar-picker panel-soft" aria-label="Выбор профиля героя"><button class="avatar-picker-arrow" data-action="previous-avatar" aria-label="Предыдущий герой">‹</button><div class="avatar-picker-card">${avatarImage(selectedAvatar.id,selectedAvatar.name,'avatar-picker-image',2000)}<div class="avatar-picker-copy"><strong>${escapeHtml(selectedAvatar.name)}</strong><small>${escapeHtml(selectedAvatar.desc)}</small>${avatarBonusChips(selectedAvatar,'avatar-picker-bonuses')}<span>${selectedAvatarIndex+1} из ${HERO_AVATARS.length}</span></div></div><button class="avatar-picker-arrow" data-action="next-avatar" aria-label="Следующий герой">›</button></section>
      <p class="avatar-picker-hint">Профессиональный бэкграунд и профиль героя — независимые бонусы: оба набора складываются.</p>
      <div class="field-title">Сложность карьеры</div>
      <div class="difficulty-picker">${DIFFICULTY_MODES_V180.map((item)=>`<button class="panel-soft ${item.id===(ui.difficultyId||'normal')?'active':''}" data-action="select-difficulty" data-value="${item.id}"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.desc)}</small></button>`).join('')}</div>
      <button class="button primary full setup-start-button" data-action="create-profile">Начать в 2000 году</button>
    </section>
  </main>`;
}

function renderHeader(game, ui) {
  const era = getEra(game);
  const energyMax = maxEnergy(game);
  return `<header class="app-header">
    <div class="brand"><span class="status-light"></span><div><small>${formatDate(game.calendar)} · ${String(Math.floor(Number(game.calendar.hour||0))).padStart(2,'0')}:00</small><strong>${era.name}</strong></div></div>
    <div class="header-metrics">
      <span class="money-pill"><i class="header-metric-media">${imageIcon(REST_STATUS_ASSETS_V171.money,'Деньги','header-metric-icon')}</i><b>${Math.round(game.player.cash / 1000)}K</b></span>
      <span class="activity-pill"><b>${activityLabel(game)}</b></span>
      <span class="energy-pill"><i class="header-metric-media">${imageIcon(REST_STATUS_ASSETS_V171.energy,'Энергия','header-metric-icon')}</i><b>${Math.round(game.player.energy)}/${energyMax}</b></span>
      <button class="icon-btn theme-toggle theme-toggle-v181" data-action="toggle-theme" aria-label="Переключить тему"><i>${imageIcon('./assets/ui-v168/menu/settings.webp?v=181','Тема','header-metric-icon')}</i></button>
    </div>
  </header>`;
}

function renderBottomNav(ui) {
  const items = [
    ['home', 'Главная', 'main-tab', 'home'],
    ['orders', 'Заказы', 'main-tab', 'orders'],
    ['rest', 'Отдых', 'main-tab', 'rest'],
    ['education', 'Учёба', 'main-tab', 'education'],
    ['more', 'Ещё', 'main-tab', 'more']
  ];
  const isActive = (id) => id === ui.tab;
  const button = ([id, label, action, value]) =>
    `<button class="${isActive(id) ? 'active' : ''}" data-tour="nav-${id}" data-action="${action}" ${value ? `data-value="${value}"` : ''}><span class="nav-icon-wrap">${iconForTab(id)}</span><small>${label}</small></button>`;
  return `<nav class="bottom-nav">${items.map(button).join('')}</nav>`;
}

function goalRow(done, title, description) {
  return `<div class="goal-row ${done ? 'done' : ''}"><span>${done ? 'OK' : '...'}</span><div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(description)}</small></div></div>`;
}

function homeGoals(game) {
  return [
    [game.stats.ordersDone >= 5, 'Первые клиенты', `${Math.min(5, game.stats.ordersDone)}/5 заказов`],
    [skillLevel(game,'networking') >= 1, 'Освоить сети', `ур. ${skillLevel(game,'networking')}/1`],
    [Boolean(game.inventory.tool_multimeter), 'Купить мультиметр', 'Инструмент для диагностики'],
    [game.pc.assembled, 'Собрать собственный ПК', game.pc.assembled ? pcTier(game).name : 'Компоненты и совместимость'],
    [game.property.locationId !== 'home', 'Съехать от родителей', getLocation(game).name]
  ];
}

function renderReleaseGoalsV182(game){
  const goals=releaseGoalsV182(game);
  const completed=goals.filter((goal)=>goal.done).length;
  if(completed===goals.length)return'';
  return `<section class="panel content-card release-onboarding-v182"><div class="section-title"><div><p class="eyebrow">ПЕРВЫЕ 30 МИНУТ</p><h3>Освойте основной цикл</h3></div><span>${completed}/${goals.length}</span></div><p class="muted">Небольшие задачи знакомят с заказами, покупками, обучением, рекламой и отдыхом. Они не блокируют игру.</p><div class="release-goal-list">${goals.map((goal,index)=>`<button class="${goal.done?'done':''}" data-action="starter-goal" data-value="${goal.target}" ${goal.done?'disabled':''}><span>${goal.done?'OK':String(index+1).padStart(2,'0')}</span><div><strong>${escapeHtml(goal.title)}</strong><small>${escapeHtml(goal.desc)}</small></div></button>`).join('')}</div></section>`;
}

function renderRecoveryV182(game){
  const state=recoveryStatusV182(game);
  if(!state.available)return'';
  const title=state.lowEnergy?'Бесплатное восстановление':'Экстренная подработка';
  const text=state.lowEnergy?'Если энергия закончилась и продолжать невозможно, герой может один раз за неделю бесплатно выспаться.':'Если деньги или доступные заказы закончились, можно выполнить простую подработку без покупки материалов.';
  return `<section class="panel content-card recovery-card-v182"><div><p class="eyebrow">ЗАЩИТА ОТ ТУПИКА</p><h3>${title}</h3><p>${text}</p></div><button class="button primary" data-action="emergency-recovery">Использовать</button></section>`;
}

function splitNewsHeadline(headline) {
  const text = String(headline || '').trim();
  const match = text.match(/^(.+?[!?])(?:\s+|$)(.*)$/s);
  return match ? { lead:match[1], detail:match[2] } : { lead:text, detail:'' };
}

function renderEraNews(game) {
  const newsMonth = game.campaign?.calendarFrozen ? Number(game.campaign.sandboxNewsMonth || game.calendar.month) : game.calendar.month;
  const newsYear = game.campaign?.calendarFrozen ? 2010 : game.calendar.year;
  const previous = previousMonthInfo(newsYear, newsMonth);
  const currentHeadlines = newsForDate(newsYear, newsMonth).slice(0, 3);
  const previousHeadlines = newsForDate(previous.year, previous.month).slice(0, 3);
  const dateLabel = `${monthName(newsMonth)} ${newsYear}${game.campaign?.calendarFrozen ? ' · архив по кругу' : ''}`;
  const totalCount = currentHeadlines.length + previousHeadlines.length;
  if (!totalCount) {
    return `<section class="panel content-card era-news-card era-news-empty">
      <div class="era-feed-icon">▤</div>
      <div><p class="eyebrow">ЛЕНТА ЭПОХИ</p><h3>${escapeHtml(dateLabel)}</h3><p class="muted">Для этого месяца заголовки пока не подготовлены.</p></div>
    </section>`;
  }
  const renderItems = (items, startIndex, kind) => items.map((headline, index) => {
    const parts = splitNewsHeadline(headline);
    return `<article class="era-news-item ${kind}">
      <span class="era-news-index">${String(startIndex + index).padStart(2, '0')}</span>
      <div><strong>${escapeHtml(parts.lead)}</strong>${parts.detail ? `<p>${escapeHtml(parts.detail)}</p>` : ''}</div>
    </article>`;
  }).join('');
  const previousBlock = previousHeadlines.length ? `<div class="era-news-column"><div class="era-news-subhead"><b>Из прошлого месяца</b><small>${monthName(previous.month)} ${previous.year}</small></div><div class="era-news-list">${renderItems(previousHeadlines, 1, 'archive')}</div></div>` : '';
  const currentBlock = currentHeadlines.length ? `<div class="era-news-column current"><div class="era-news-subhead"><b>Новый месяц</b><small>${monthName(newsMonth)} ${newsYear}</small></div><div class="era-news-list">${renderItems(currentHeadlines, previousHeadlines.length + 1, 'fresh')}</div></div>` : '';
  return `<section class="panel content-card era-news-card">
    <div class="section-title era-news-head">
      <div><p class="eyebrow">ЛЕНТА ЭПОХИ</p><h3>${escapeHtml(dateLabel)}</h3></div>
      
    </div>
    <div class="era-news-columns">${previousBlock}${currentBlock}</div>
  </section>`;
}

function renderHome(game) {
  ensureV180(game);
  ensureV182(game);
  const v18 = v180HomeSummary(game);
  const specializationPerk=specializationPerkV182(game);
  const era = getEra(game);
  const wealth = getWealthTier(game);
  const goals = homeGoals(game);
  const completeGoals = goals.filter(([done]) => done).length;
  const marketEvent = game.market?.activeEvent;
  const avatar = heroAvatarById(game.profile?.avatar || 'classic');
  const eraLabel = heroAvatarEra(game.calendar.year).label;
  return `<section class="screen home-screen-v142">
    <article class="home-dashboard panel" style="--era:${era.color || '#46e6d6'}">
      <div class="home-profile-main">
        <div class="career-avatar">${avatarImage(avatar.id, avatar.name, 'career-portrait', game.calendar.year)}<span>${escapeHtml(eraLabel)}</span></div>
        <div class="home-profile-copy">
          <p class="eyebrow">ПРОФИЛЬ АЙТИШНИКА</p>
          <h2>${escapeHtml(game.profile.name)}</h2>
          <div class="home-profile-badges"><span class="bevel-badge profession-badge">Профессия: ${escapeHtml(avatar.name)}</span><span class="bevel-badge home-background-label">Бэкграунд: ${escapeHtml(starterBackgroundById(game.profile?.specialization).name)}</span></div>
          <p>${escapeHtml(era.desc)}</p>
          ${backgroundBonusChips(game.profile?.specialization,'home-background-bonuses')}${avatarBonusChips(avatar, 'home-profile-bonuses')}
        </div>
        <div class="home-year-card"><small>${escapeHtml(era.name)}</small><b>${game.calendar.year}</b><span>${escapeHtml(era.os)} · ${String(Math.floor(Number(game.calendar.hour||0))).padStart(2,'0')}:00</span></div>
      </div>
      <div class="home-metrics">
        <div><span>${imageIcon(REST_STATUS_ASSETS_V171.money,'Деньги','home-metric-image')}</span><small>Деньги</small><strong>${formatMoney(game.player.cash)}</strong></div>
        <div><span>${imageIcon(REST_STATUS_ASSETS_V171.energy,'Энергия','home-metric-image')}</span><small>Энергия</small><strong class="${game.player.energy < 25 ? 'danger-text' : ''}">${Math.round(game.player.energy)}%</strong></div>
        <div><span>${imageIcon(REST_STATUS_ASSETS_V171.reputation,'Репутация','home-metric-image')}</span><small>Репутация</small><strong>${game.player.reputation}</strong></div>
        <div><span>${imageIcon(REST_STATUS_ASSETS_V171.level,'Уровень','home-metric-image')}</span><small>Уровень</small><strong>${game.player.level}</strong><em>${Math.round(game.player.xp)}/${playerXpNeeded(game.player.level)} XP</em></div>
      </div>
    </article>
    ${renderReleaseGoalsV182(game)}
    ${renderRecoveryV182(game)}
    <section class="panel content-card specialization-perk-v182"><div><p class="eyebrow">СПЕЦИАЛИЗАЦИЯ</p><h3>${escapeHtml(specializationPerk.name)}</h3><p>${escapeHtml(specializationPerk.desc)}</p></div></section>
    <section class="today-dashboard panel">
      <div class="section-title"><div><p class="eyebrow">СЕГОДНЯ</p><h3>Мастерская и ближайшие дела</h3></div><button class="button secondary small" data-action="open-notifications">Уведомления ${v18.unread?`· ${v18.unread}`:''}</button></div>
      <div class="today-metrics"><span><b>Крупные проекты</b>${v18.projects}</span><span><b>Свободные места</b>${v18.free}</span><span><b>Новые уведомления</b>${v18.unread}</span><span><b>Активные гарантии</b>${game.v18?.warranties?.active?.length||0}</span></div>
      <div class="station-mini-grid">${v18.stations.map((row)=>`<div class="${row.free?'ok':'full'}"><strong>${escapeHtml(row.short)}</strong><span>${row.used}/${row.capacity}</span><small>${row.free?`свободно ${row.free}`:'занято'}</small></div>`).join('')}</div>
      <div class="upcoming-list">${v18.nearest?`<p><b>Ближайший срок:</b> ${escapeHtml(v18.nearest.name)} · ${Math.max(0,Number(v18.nearest.deadlineDays||0))} дн.</p>`:'<p><b>Сроки:</b> срочных гарантийных и корпоративных заказов нет.</p>'}${v18.deposit?`<p><b>Вклад:</b> ${escapeHtml(v18.deposit.name||'Накопительный счёт')} · ${Math.max(0,Number(v18.deposit.daysLeft||0))} дн.</p>`:'<p><b>Вклады:</b> ближайших выплат нет.</p>'}</div>
    </section>
    <section class="xp-source-strip panel"><span><b>XP за работу</b>${Math.round(game.progression?.xpFromWork||0)}</span><span><b>XP за учёбу</b>${Math.round(game.progression?.xpFromStudy||0)}</span><span><b>До уровня</b>${Math.max(0,playerXpNeeded(game.player.level)-Math.round(game.player.xp))}</span></section>
    ${marketEvent ? `<section class="market-alert panel"><b>Рынок: ${escapeHtml(marketEvent.name)}</b><span>${escapeHtml(marketEvent.desc)} · осталось ${marketEvent.monthsLeft} мес.</span></section>` : ''}
    ${(()=>{const tip=contextualTip(game);return tip?`<section class="panel content-card contextual-tip"><div><p class="eyebrow">ПОДСКАЗКА</p><h3>${escapeHtml(tip.title)}</h3><p>${escapeHtml(tip.text)}</p></div><div class="button-row compact"><button class="button secondary small" data-action="open-tip-target" data-value="${tip.target}">Перейти</button><button class="button ghost small" data-action="dismiss-tip" data-id="${tip.id}">Скрыть</button></div></section>`:''})()}
    ${(()=>{const plan=activityPlan(game);const hint=recommendedAction(game);return `<section class="panel content-card planner-card"><div class="section-title"><div><p class="eyebrow">ПЛАН ДНЯ</p><h3>${escapeHtml(plan.name)}</h3></div><button class="hint-action" data-action="smart-hint" data-target="${hint.action}">Что делать?</button></div><p class="muted">${escapeHtml(plan.desc)}</p><div class="plan-grid">${ACTIVITY_PLANS.map(item=>`<button class="${item.id===plan.id?'active':''}" data-action="activity-plan" data-value="${item.id}"><strong>${escapeHtml(item.name)}</strong><small>Работа ×${item.work} · учёба ×${item.study}</small></button>`).join('')}</div><div class="smart-hint"><b>${escapeHtml(hint.title)}</b><span>${escapeHtml(hint.text)}</span></div></section>`})()}
    <section class="panel content-card status-card">
      <div class="section-title"><div><p class="eyebrow">СОСТОЯНИЕ</p><h3>${escapeHtml(wealth.name)}</h3></div><span>${formatMoney(netWorth(game, ALL_COMPONENTS))}</span></div>
      <div class="status-grid">
        <div><small>Доход</small><strong>${formatMoney(currentSalary(game))}</strong></div>
        <div><small>Скорость</small><strong>x${workSpeed(game).toFixed(2)}</strong></div>
        <div><small>Заказы</small><strong>${game.stats.ordersDone || 0}</strong></div>
        <div><small>Учёба</small><strong>${Object.keys(game.education.completed || {}).length}</strong></div>
      </div>
    </section>
    <section class="panel content-card goals-card">
      <div class="section-title"><div><p class="eyebrow">БЛИЖАЙШИЕ ЦЕЛИ</p><h3>Прогресс по старту</h3></div><span>${completeGoals}/${goals.length}</span></div>
      ${goals.map(([done, title, desc]) => goalRow(done, title, desc)).join('')}
    </section>
    ${renderEraNews(game)}
  </section>`;
}

function requirementChips(game, order) {
  const skills = Object.entries(order.skills || {}).map(([id, level]) => {
    const current = skillLevel(game,id);
    return chip(`Мин. ${skillMeta[id]?.name || id} ${current}/${level}`, current >= level ? 'ok' : 'danger');
  });
  for (const [id, level] of Object.entries(order.recommendedSkills || {})) {
    const minimum=Number(order.skills?.[id]||0);
    if (Number(level)<=minimum) continue;
    const current=skillLevel(game,id);
    skills.push(chip(`Рек. ${skillMeta[id]?.name || id} ${current}/${level}`, current>=level?'ok':'warning'));
  }
  const missing = missingOrderItems(game, order);
  if (missing.length) skills.push(chip(`Не хватает ${missing.length} поз.`, 'danger'));
  if (order.onSite) skills.push(chip('Выезд'));
  return skills.join('');
}

function orderResources(game, order) {
  const details = orderItemDetails(game, order);
  if (!details.length) return `<div class="resource-box ready"><strong>Материалы</strong><p>Дополнительные детали и инструменты не требуются.</p></div>`;
  const rows = details.map((item) => `<div class="resource-row ${item.missing ? 'missing' : 'ready'}"><span class="resource-art">${componentArt(item.component)}</span><div><strong>${escapeHtml(item.component.name)}</strong><small>${item.consumable ? 'Будет израсходовано' : 'Инструмент останется на складе'}</small></div><b>${item.owned}/${item.required}</b></div>`).join('');
  const missing = details.some((item) => item.missing > 0);
  return `<div class="resource-box ${missing ? 'needs-items' : 'ready'}"><div class="resource-title"><strong>${missing ? 'Что нужно докупить' : 'Материалы готовы'}</strong>${missing ? `<button class="hint-button" data-action="order-materials" data-long-action="order-materials" data-id="${order.uid}" aria-label="Подсказка по материалам">${retroIcon('hint')}</button>` : chip('Готово', 'ok')}</div>${rows}${missing ? '<p class="resource-tip">Нажмите лампочку. Долгое нажатие тоже откроет помощник закупки.</p>' : ''}</div>`;
}

function orderStatusLabel(order) {
  return order.status === 'quotation' ? 'Согласование сметы'
    : order.status === 'diagnosis' ? 'Диагностика'
      : order.status === 'solution' ? 'Выбор решения'
        : order.status === 'repair' ? 'Закупка и подготовка'
          : order.status === 'working' ? 'Работа'
            : order.status === 'testing' ? 'Проверка'
              : order.status;
}

function orderStageLabel(order) {
  const map={request:'Заявка',quote:'Смета',diagnosis:'Диагностика',estimate:'Решение',procurement:'Закупка',work:'Работа',testing:'Проверка',closed:'Закрыт',quick:'Быстрый заказ'};
  return map[order.projectStage] || orderStatusLabel(order);
}

function orderCard(game, order, mode) {
  const workMode=orderWorkModeV180(order);
  const isProject=workMode==='project';
  const working = order.status === 'working';
  const testing = order.status === 'testing';
  const clientInfo = clientTypeInfo(order);
  const taskType = orderTaskTypeV166(order);
  const influence = orderInfluenceBreakdown(game, order);
  const progressValue = Number(order.progressDays || 0);
  const progressMax = Math.max(1,Number(order.totalWorkDays || order.workDays || 1));
  const station=workstationStatusV180(game).find((row)=>row.id===stationForOrderV180(order));
  const clientRecord=game.clients?.records?.[order.client?.id] || order.client || {};
  const trust=Math.round(Number(clientRecord.trust||40));
  const returning=Boolean(order.client?.returning || Number(clientRecord.orders||0)>0);
  const statusAction = order.status === 'quotation'
    ? `<button class="button primary small action-button-with-icon" data-action="open-quote" data-id="${order.uid}">${actionIconMarkup(ORDER_ACTION_ASSETS_V183.accept,'Смета')}<span>Согласовать смету</span></button>`
    : order.status === 'diagnosis'
      ? `<button class="button primary small action-button-with-icon" data-action="diagnose-order" data-id="${order.uid}">${actionIconMarkup(ORDER_ACTION_ASSETS_V183.diagnosis,'Диагностика')}<span>Диагностика</span></button>`
      : order.status === 'solution'
        ? `<button class="button primary small action-button-with-icon" data-action="open-repair-approach" data-id="${order.uid}">${actionIconMarkup(ORDER_ACTION_ASSETS_V183.repair,'Выбор решения')}<span>Выбрать решение</span></button>`
        : order.status === 'testing'
          ? `<button class="button primary small action-button-with-icon" data-action="open-order-test" data-id="${order.uid}">${actionIconMarkup(ORDER_ACTION_ASSETS_V183.quality,'Тестирование')}<span>Провести тест</span></button>`
          : order.status === 'working'
            ? chip(isProject?'Проект выполняется':'В работе', 'ok')
            : `<button class="button primary small action-button-with-icon" data-action="complete-order" data-id="${order.uid}">${actionIconMarkup(ORDER_ACTION_ASSETS_V183.start,'Запуск работы')}<span>Начать</span></button>`;
  const mainAction = mode === 'available'
    ? `<button class="button primary small action-button-with-icon" data-action="accept-order" data-id="${order.uid}">${actionIconMarkup(ORDER_ACTION_ASSETS_V183.accept,'Принять заказ')}<span>Принять</span></button>`
    : mode === 'active'
      ? `${statusAction}<button class="button ghost small" data-action="abandon-order" data-id="${order.uid}">Отказаться</button>`
      : '';
  const deadlineLabel = order.orderType === 'warranty' || order.orderType === 'corporate' ? `${Math.max(0, Number(order.deadlineDays || 0))} дн.` : 'Без срока';
  const profit=Math.max(0,Number(order.reward||0)-Number(order.estimatedMaterialCost||0)-Number(order.repairApproach?.extraCost||0));
  const details = `
    <details class="order-details" data-persist-key="order-details-${order.uid}">
      <summary>Подробности заказа</summary>
      <div class="order-details-body">
        ${(()=>{const archetype=clientArchetypeV182(clientRecord);return `<div class="client-type-strip"><span>CL</span><div><strong>${escapeHtml(clientInfo.name)} · ${escapeHtml(archetype.name)} · доверие ${trust}/100</strong><small>${returning?'Постоянный клиент':'Новый клиент'} · ${escapeHtml(archetype.desc)} · главное: ${escapeHtml(clientInfo.priority)}</small></div></div>`})()}
        <div class="order-influence"><span><b>Навыки</b>${influence.skillEffect >= 0 ? '+' : ''}${influence.skillEffect}%</span><span><b>Инструменты</b>+${Math.round(influence.toolEffect)}%</span><span><b>Диагностика</b>${influence.diagnosisEffect ? `+${influence.diagnosisEffect}%` : 'не проведена'}</span></div>
        <div class="chip-row">${chip(isProject?'Крупный проект':'Быстрый заказ',isProject?'warning':'ok')}${chip(station?.name||'Рабочее место')}${order.orderType && order.orderType !== 'standard' ? chip(order.orderType === 'urgent' ? 'Срочно' : order.orderType === 'warranty' ? 'Гарантия' : order.orderType === 'corporate' ? 'Корпоративный' : 'Выезд', order.orderType === 'urgent' || order.orderType === 'warranty' ? 'danger' : '') : ''}${chip(`+${Math.round(order.xp || 0)} XP`, 'ok')}${requirementChips(game, order)}</div>
        ${order.quote ? `<div class="quote-summary"><strong>${escapeHtml(order.quote.name)}</strong><p>${formatMoney(order.quote.price)} · принят клиентом · гарантийный риск ${Math.max(0,Math.round(Number(order.quoteWarrantyRisk||0)*100))}%</p></div>` : ''}
        ${orderResources(game, order)}
        ${order.diagnosis ? `<div class="diagnosis"><strong>Диагностика</strong><p>${escapeHtml(order.diagnosis.text)}</p></div>` : ''}
        ${order.repairApproach ? `<div class="repair-summary"><strong>${escapeHtml(order.repairApproach.name)}</strong><p>${escapeHtml(order.repairApproach.desc)}</p></div>` : ''}
      </div>
    </details>`;
  return `<article class="order-card order-card-v180 panel" data-tour="order-card">
    <div class="order-head compact"><span class="order-icon">${orderArt(order)}</span><div><h3>${escapeHtml(order.name)}</h3><p>${escapeHtml(taskType.name)} · ${escapeHtml(order.client?.name || 'Клиент')}</p></div><span class="reward">${formatMoney(order.reward)}</span></div>
    <p class="order-desc compact">${escapeHtml(order.description || '')}</p>
    <div class="order-summary-grid"><span><b>Расходы</b>${formatMoney(Number(order.estimatedMaterialCost || 0))}</span><span><b>Ожидаемая прибыль</b>${formatMoney(profit)}</span><span><b>Срок</b>${deadlineLabel}</span></div>
    ${mode === 'active' ? `<div class="deadline-strip compact"><div><b>${orderStageLabel(order)}</b><span>${isProject?'Проект проходит этапы: смета, диагностика, закупка, работа и тестирование.':'Быстрый заказ завершается сразу после запуска и требует итогового теста.'}</span></div></div>` : ''}
    ${working ? `<div class="work-progress compact"><div><strong>${employeeForOrder(game, order) ? `Делегировано: ${escapeHtml(employeeForOrder(game, order).name)}` : 'Работа выполняется'}</strong><span>${Math.round(progressValue*24)}/${Math.round(progressMax*24)} ч.</span></div>${progress(progressValue, progressMax, 'accent')}</div>` : ''}
    ${testing ? `<div class="testing-ready"><b>Работа завершена</b><span>Проведите итоговый тест перед выдачей.</span></div>` : ''}
    ${details}
    <div class="order-footer compact"><span>${isProject?`Крупный проект · этап: ${escapeHtml(orderStageLabel(order))}`:'Быстрый заказ'} · знания: ${Object.entries(order.skills || {}).map(([id,level]) => `${escapeHtml(skillMeta[id]?.name || id)} −${level}`).join(' · ') || 'не требуются'}</span><div class="button-row compact">${mainAction}</div></div>
  </article>`;
}

function renderOrders(game, ui) {
  const sub=ui.ordersSection;
  let content='';
  if(sub==='available')content=game.orders.available.length?game.orders.available.map(order=>orderCard(game,order,'available')).join(''):emptyState('NET','Нет новых заявок','Новые заявки появятся после обновления или продвижения времени.');
  if(sub==='active')content=game.orders.active.length?game.orders.active.map(order=>orderCard(game,order,'active')).join(''):emptyState('WORK','Нет активных заказов','Примите заявку, проведите диагностику, выберите решение и запустите работу.');
  if(sub==='history')content=game.orders.history.length?game.orders.history.slice(0,60).map(order=>{
    const review=order.review; const status=order.status==='completed'?'Выполнен':order.status==='failed'?'Провален':order.status==='expired'?'Клиент забрал устройство':order.status==='abandoned'?'Отменён':'Закрыт';
    const profit=Number(order.actualProfit||0); const days=review?.usedDays??Math.max(0,Number(order.initialDeadlineDays||0)-Number(order.deadlineDays||0));
    const report=order.qualityReport;
    const breakdown=report?.factors?.length?`<details class="quality-breakdown-v182"><summary>Почему получился такой результат · ${Math.round(Number(report.probability||0)*100)}%</summary><div>${report.factors.map((factor)=>`<span><b>${escapeHtml(factor.label)}</b><strong class="${Number(factor.value||0)>=0?'success-text':'danger-text'}">${Number(factor.value||0)>=0?'+':''}${Math.round(Number(factor.value||0)*100)}%</strong></span>`).join('')}</div></details>`:'';
    return `<article class="history-order panel"><div class="history-order-head"><span>${orderArt(order)}</span><div><strong>${escapeHtml(order.name)}</strong><small>${escapeHtml(status)} · ${escapeHtml(order.client?.name||'Клиент')} · ${days||0} дн.</small></div><b class="${order.status==='completed'?'success-text':'danger-text'}">${order.status==='completed'?`+${formatMoney(profit)}`:'−'}</b></div>${review?`<div class="history-review"><span>${review.stars}/5</span><p>«${escapeHtml(review.text)}»</p></div>`:''}${breakdown}</article>`;
  }).join(''):emptyState('LOG','История пуста','Завершённые, проваленные и просроченные заказы появятся здесь.');
  const cooldown=Math.ceil(refreshCooldownRemainingV166(game));
  const refreshBlock=sub==='available'?`<section class="refresh-orders-panel panel"><div class="refresh-orders-copy"><div class="refresh-orders-media">${imageIcon(ORDER_ACTION_ASSETS_V183.refresh,'Обновление заявок','refresh-orders-image')}</div><div><p class="eyebrow">НОВЫЙ ПОТОК КЛИЕНТОВ</p><h3>Обновить заявки</h3><p>Текущие заявки будут отклонены. Штраф: −1 репутация и 6 игровых часов. Следующее обновление — через 24 часа.</p><small>Сейчас доступно ${game.orders.available.length}/${targetAvailableOrdersV166(game)} заявок${cooldown>0?` · ожидание ${cooldown} ч.`:''}</small></div></div><button class="button secondary action-button-with-icon" data-action="refresh-orders" ${cooldown>0?'disabled':''}>${actionIconMarkup(ORDER_ACTION_ASSETS_V183.refresh,'Обновить заявки')}<span>${cooldown>0?`Доступно через ${cooldown} ч.`:'Обновить заявки'}</span></button></section>`:'';
  return `<section class="screen">${pageHeader('РАБОЧАЯ ОЧЕРЕДЬ','Заказы',`Активно ${game.orders.active.length}/${maxActiveOrders(game)}`)}${sectionNav([['available',`Заявки ${game.orders.available.length}`],['active',`В работе ${game.orders.active.length}`],['history','История']],sub,'orders')}<div class="stack">${content}</div>${refreshBlock}</section>`;
}

function shopToolbar(ui) {
  const categories = [
    ['all', 'Все'], ['cpu', 'CPU'], ['gpu', 'GPU'], ['ram', 'RAM'],
    ['storage', 'Диски'], ['mb', 'Платы'], ['psu', 'БП'], ['case', 'Корпус'],
    ['cool', 'Охлажд.'], ['periph', 'Периф.'], ['cons', 'Расходн.'], ['tool', 'Инструм.']
  ];
  return `<div class="shop-controls" data-tour="workshop-filters"><label class="search-field"><span></span><input id="shopSearch" value="${escapeHtml(ui.shopQuery)}" placeholder="Поиск по магазину"></label>
  <div class="shop-category-tabs">${categories.map(([id, name]) => `<button class="${ui.shopCategory === id ? 'active' : ''}" data-action="shop-category" data-value="${id}">${name}</button>`).join('')}</div></div>`;
}

function renderShop(game, ui) {
  const query = normalizedText(ui.shopQuery);
  const all = availableComponents(game, ui.shopCategory).filter((component) => !query || normalizedText(`${component.name} ${component.socket || ''} ${component.ramType || ''}`).includes(query));
  const pageSize = 8;
  const pages = Math.max(1, Math.ceil(all.length / pageSize));
  const page = Math.min(ui.shopPage, pages);
  const items = all.slice((page - 1) * pageSize, page * pageSize);
  return `${shopToolbar(ui)}<div class="shop-summary"><span>${all.length} товаров · страница ${page}/${pages}</span><span>${game.market?.activeEvent?`Рынок: ${escapeHtml(game.market.activeEvent.name)}`:`Скидка ${(game.property.upgrades.supply || 0) * 4}%`}</span></div><div class="catalog-grid">${items.map((component) => {
    const price = componentPrice(game, component);
    const owned = game.inventory[component.id] || 0;
    return `<article class="product-card panel"><div class="product-icon">${componentArt(component)}</div><div class="product-copy"><h3>${escapeHtml(component.name)}</h3><p>${[component.socket || component.mbSocket, component.ramType, component.watts ? `${component.watts} W` : ''].filter(Boolean).join(' · ') || `Уровень ${component.tier || 1}`}</p><div class="product-meta"><strong>${formatMoney(price)}</strong>${owned ? chip(` ${owned}`, 'ok') : ''}</div></div><div class="buy-actions"><button data-action="buy-item" data-id="${component.id}" data-qty="1">Купить 1</button><button data-action="buy-item" data-id="${component.id}" data-qty="5">Купить 5</button></div></article>`;
  }).join('')}</div><div class="pagination"><button data-action="shop-page" data-value="${Math.max(1, page - 1)}" ${page <= 1 ? 'disabled' : ''}>←</button><span>${page} / ${pages}</span><button data-action="shop-page" data-value="${Math.min(pages, page + 1)}" ${page >= pages ? 'disabled' : ''}>→</button></div>`;
}

function renderInventory(game) {
  const items = Object.entries(game.inventory).filter(([, quantity]) => quantity > 0).map(([id, quantity]) => ({ component: componentMeta[id], quantity })).filter((item) => item.component).sort((a, b) => a.component.cat.localeCompare(b.component.cat));
  return items.length ? `<div class="inventory-list">${items.map(({ component, quantity }) => `<article class="inventory-row panel"><span class="product-icon">${componentArt(component)}</span><div><h3>${escapeHtml(component.name)}</h3><p>${component.cat.toUpperCase()} · продажа ${formatMoney(componentSellPrice(game, component))}</p></div><strong>×${quantity}</strong><button class="button ghost small" data-action="sell-item" data-id="${component.id}" data-qty="1">Продать</button></article>`).join('')}</div>` : emptyState('BOX', 'Склад пуст', 'Купленные детали и расходники появятся здесь.');
}

function workspaceArt(itemId, level = 0, next = false) {
  const item = WORKSPACE_ITEMS.find(entry => entry.id === itemId);
  const shownLevel = next ? Math.min((level || 0) + 1, item?.tiers?.length || 1) : Math.max(1, level || 1);
  return `<img class="workspace-art tier-${level} ${level ? '' : 'unowned'}" src="${workspaceAsset(itemId, shownLevel)}" alt="" loading="lazy">`;
}

function renderRoomScene(game, context = 'workspace') {
  const stage = workspaceRoomStage(game);
  const labels = ['Комната у родителей','Рабочее место 2000 года','Домашняя мастерская эпохи XP','Оснащённое место специалиста','Лучшее рабочее место 2010 года'];
  const bonuses = workspaceBonuses(game);
  const owned = WORKSPACE_ITEMS.filter(item => workspaceLevel(game,item.id)>0).sort((a,b)=>workspaceLevel(game,b.id)-workspaceLevel(game,a.id));
  return `<section class="workspace-scene panel">
    <div class="room-caption"><div><p class="eyebrow">${context==='pc'?'СБОРКА ПК И РАБОЧЕЕ МЕСТО':'РАБОЧЕЕ МЕСТО'}</p><h3>${labels[stage]}</h3></div><span>развитие ${stage+1}/5</span></div>
    <div class="workspace-reference-frame v15-room"><img class="room-base" src="${workspaceRoomAsset(game)}" alt="Рабочее место: ${labels[stage]}" loading="eager"><div class="room-era-stamp">${game.calendar.year}<small>${game.calendar.year<2010?'НУЛЕВЫЕ':'ФИНАЛ 2010'}</small></div></div>
    <div class="workspace-scene-stats"><span>Скорость <b>+${Math.round(bonuses.workSpeed*100)}%</b></span><span>Доход <b>+${Math.round(bonuses.income*100)}%</b></span><span>Успех <b>+${Math.round(bonuses.success*100)}%</b></span><span>Учёба <b>+${Math.round(bonuses.educationSpeed*100)}%</b></span></div>
    <div class="workspace-owned-strip v15-owned">${owned.length ? owned.slice(0,8).map(item=>{const level=workspaceLevel(game,item.id);const current=workspaceCurrentTier(game,item.id);return `<button data-action="scene-info" data-message="${escapeHtml(item.name)} · ${escapeHtml(current?.name||'')} · уровень ${level}/${item.tiers.length}"><span>${workspaceArt(item.id,level)}</span><small>${escapeHtml(item.name)}</small><em>${level}/${item.tiers.length}</em></button>`;}).join('') : '<p>Купите первое улучшение — рабочее место начнёт меняться визуально.</p>'}</div>
  </section>`;
}

function renderPc(game) {
  const purchasedComputer=Math.min(6,workspaceLevel(game,'computer'));
  const customScore=Math.min(10,Math.max(0,Math.round(pcPower(game)/10)));
  const comparison=`<section class="panel content-card pc-balance-card"><div class="section-title"><div><p class="eyebrow">ДВА ПУТИ</p><h3>Покупной ПК и собственная сборка</h3></div></div><p>Готовый системный блок ограничен мощностью <b>6/10</b>. Собранный вручную ПК может достичь <b>10/10</b> и даёт максимальный бонус.</p><div class="status-grid"><div><small>Покупной ПК</small><strong>${purchasedComputer}/6</strong></div><div><small>Своя сборка</small><strong>${customScore}/10</strong></div></div></section>`;
  const conflicts = pcConflicts(game);
  const tier = pcTier(game);
  return `${renderRoomScene(game, 'pc')}${comparison}<section class="pc-guide panel"><p class="eyebrow">ПОРЯДОК СБОРКИ</p><div><span>1</span>Материнская плата</div><div><span>2</span>Процессор и память</div><div><span>3</span>Накопитель, видеокарта и БП</div><p>Игра показывает только совместимые детали и не позволит установить ошибочную.</p></section><section class="pc-summary panel" style="--pc-tone:${game.pc.assembled ? '#76ff9d' : '#f7b955'}"><div><p class="eyebrow">СОБСТВЕННАЯ СИСТЕМА</p><h3>${escapeHtml(tier.name)}</h3><p>Мощность ${pcPower(game)} · бонус к скорости ${Math.round(tier.bonus * 100)}%</p></div><span class="pc-state">${game.pc.assembled ? 'READY' : 'BUILD'}</span></section>${conflicts.length ? `<div class="alert danger"><strong>Что осталось исправить</strong>${conflicts.map((error) => `<p>• ${escapeHtml(error)}</p>`).join('')}</div>` : ''}<div class="pc-slots">${PC_SLOTS.map((slot) => {
    const part = game.pc.slots[slot.id];
    const hint = pcSlotHint(game, slot.id);
    const compatible = compatiblePartsForSlot(game, slot.id);
    const blocked = !part && ((slot.id !== 'mb' && Boolean(hint)) || compatible.length === 0);
    return `<article class="pc-slot panel ${part ? 'filled' : ''} ${blocked ? 'blocked' : ''}"><span>${slot.required ? '*' : ''} ${slot.name}</span><div>${part ? `<strong>${componentArt(part)} ${escapeHtml(part.name)}</strong><small>${part.socket || part.mbSocket || part.ramType || 'Установлено'}</small>` : `<strong>${blocked ? 'Пока недоступно' : 'Выберите компонент'}</strong><small>${escapeHtml(hint || (compatible.length ? `${compatible.length} совместимых деталей на складе` : 'Купите подходящую деталь'))}</small>`}</div><button class="icon-btn" data-action="choose-pc-part" data-slot="${slot.id}" ${blocked ? 'disabled' : ''}>+</button>${part ? `<button class="icon-btn danger" data-action="remove-pc-part" data-slot="${slot.id}">×</button>` : ''}</article>`;
  }).join('')}</div><button class="button primary full" data-action="assemble-pc">Проверить и собрать ПК</button>`;
}

function workspaceUpgradeCard(game, item) {
  const level = workspaceLevel(game, item.id);
  const current = workspaceCurrentTier(game, item.id);
  const next = workspaceNextTier(game, item.id);
  const max = item.tiers.length;
  const cost = next ? Math.round(next.cost * getInflation(game)) : 0;
  const locked = next && (game.calendar.year < next.fromYear || game.player.level < next.reqLevel || game.player.cash < cost);
  const reason = !next ? 'МАКС' : game.calendar.year < next.fromYear ? `с ${next.fromYear}` : game.player.level < next.reqLevel ? `ур. ${next.reqLevel}` : game.player.cash < cost ? 'мало ₽' : formatMoney(cost);
  return `<article class="workspace-upgrade-card panel ${level?'owned':''}">
    <div class="workspace-card-art">${workspaceArt(item.id, level, Boolean(next))}</div>
    <div class="workspace-card-copy"><div class="workspace-card-title"><h3>${escapeHtml(item.name)}</h3><span>${level}/${max}</span></div>
      <strong>${current ? escapeHtml(current.name) : 'Первое улучшение'}</strong>
      <div class="workspace-levels" style="--levels:${max}">${Array.from({length:max},(_,i)=>`<i class="${i<level?'active':''}"></i>`).join('')}</div>
      <small>${next ? `${escapeHtml(next.name)} · ${workspaceBonusText(next.bonus)}` : 'Максимальный уровень'}</small>
    </div>
    ${next ? `<button class="button primary small" data-action="buy-workspace" data-id="${item.id}" ${locked?'disabled':''}>${escapeHtml(reason)}</button>` : chip('МАКС','ok')}
  </article>`;
}

function renderInfrastructure(game) {
  return `<div class="workspace-upgrade-list">${UPGRADES.map((upgrade) => {
    const level=game.property.upgrades[upgrade.id]||0;
    const cost=Math.round(upgrade.baseCost*Math.pow(upgrade.mult,level)*getInflation(game));
    return `<article class="workspace-upgrade-card panel"><div class="workspace-card-art infrastructure-art">${escapeHtml(String(upgrade.icon||'UP'))}</div><div class="workspace-card-copy"><div class="workspace-card-title"><h3>${escapeHtml(upgrade.name)}</h3><span>${level}/${upgrade.max}</span></div><strong>${escapeHtml(upgrade.desc)}</strong>${progress(level,upgrade.max,'accent')}</div>${level>=upgrade.max?chip('МАКС','ok'):`<button class="button primary small" data-action="buy-upgrade" data-id="${upgrade.id}">${formatMoney(cost)}</button>`}</article>`;
  }).join('')}</div>`;
}

function renderWorkspace(game, ui) {
  const groups = [...WORKSPACE_GROUPS.filter(group=>group.id!=='tools').map(group=>[group.id,group.name]),['infra','Инфраструктура']];
  const active = ui.workspaceGroup || 'core';
  const items = WORKSPACE_ITEMS.filter(item=>item.group===active);
  const activeMeta = WORKSPACE_GROUPS.find(group=>group.id===active);
  const bonuses=workspaceBonuses(game);
  return `${renderRoomScene(game,'workspace')}
    <section class="workspace-set panel ${bonuses.setLevel?'ready':''}"><div><p class="eyebrow">БАЗОВЫЙ КОМПЛЕКТ</p><h3>${bonuses.setLevel?`Комплект уровня ${bonuses.setLevel}`:'Соберите четыре основных предмета'}</h3><p>Монитор, клавиатура и мышь развиваются по эпохе. Покупной компьютер ограничен уровнем 6/10; собственная сборка может стать сильнее.</p></div><strong>${bonuses.setLevel?`+${Math.round(bonuses.setLevel*1.2)}% скорость`:'0/4'}</strong></section>
    <div class="workspace-group-tabs">${groups.map(([id,label])=>`<button class="${active===id?'active':''}" data-action="workspace-group" data-value="${id}">${label}</button>`).join('')}</div>
    ${activeMeta?`<p class="workspace-group-desc">${escapeHtml(activeMeta.desc)}</p>`:''}
    ${active==='infra'?renderInfrastructure(game):`<div class="workspace-upgrade-list">${items.map(item=>workspaceUpgradeCard(game,item)).join('')}</div>`}`;
}


function renderFleaMarket(game) {
  const flea = game.fleaMarket || { scrap:0, offers:[], lastFinds:[], brokenItems:[] };
  const modes = [
    ['trash', 'Старая техника', 'Искать простые предметы и расходники. Большинство находок неисправны.', 8],
    ['boards', 'Списанные платы', 'Получить шанс на компонент, который почти наверняка потребует ремонта.', 12],
    ['market', 'Радиорынок', 'Осмотреть рабочие, неисправные и непроверенные предложения.', 4]
  ];
  const offers = (flea.offers || []).map((offer) => ({ ...offer, component:componentMeta[offer.componentId] })).filter((offer) => offer.component);
  const broken = (flea.brokenItems || []).map((item) => ({ ...item, component:componentMeta[item.componentId] })).filter((item) => item.component);
  const conditionName = (condition) => condition === 'working' ? 'рабочее' : condition === 'broken' ? 'неисправное' : 'не проверено';
  const conditionTone = (condition) => condition === 'working' ? 'ok' : condition === 'broken' ? 'danger' : '';
  return `<section class="flea-intro panel"><div><p class="eyebrow">БАРАХОЛКА НУЛЕВЫХ</p><h3>Дешёвая техника с реальным риском</h3><p>Ценная находка часто оказывается неисправной. Ремонт выполняется как игровая проверка навыка: можно восстановить деталь или потерять деньги и сам предмет.</p></div><img class="flea-hero-illustration" src="${FLEA_ASSETS_V171.hero}" alt="Барахолка" loading="lazy"><div class="scrap-counter"><span>ЛОМ</span><strong>${flea.scrap || 0}</strong><button class="button secondary small" data-action="flea-sell-scrap" ${(flea.scrap || 0) ? '' : 'disabled'}>Сдать</button></div></section>
  <div class="flea-actions">${modes.map(([id,title,desc,energy]) => { const cooldown=fleaCooldown(game,id); const modeAsset = id === 'trash' ? FLEA_ASSETS_V171.trash : id === 'boards' ? FLEA_ASSETS_V171.boards : FLEA_ASSETS_V171.market; return `<button class="flea-action panel" data-action="flea-search" data-value="${id}" ${cooldown ? 'disabled' : ''}>${imageIcon(modeAsset, title, 'rest-icon-image')}<div><strong>${title}</strong><small>${desc}</small><b>${cooldown ? `через ${cooldown} дн.` : `энергия ${energy}`}</b></div></button>`; }).join('')}</div>
  <section class="panel content-card"><div class="section-title"><div><p class="eyebrow">НЕИСПРАВНЫЕ НАХОДКИ</p><h3>${broken.length ? `${broken.length} предметов ждут решения` : 'Ремонтный стол пуст'}</h3></div></div>${broken.length ? `<div class="broken-list">${broken.map((entry) => {
    const repairSkill = skillLevel(game,'repair');
    const hardware = skillLevel(game,'hardware');
    const approx = Math.max(18, Math.min(90, Math.round((.28 + repairSkill*.055 + hardware*.018 - Number(entry.component.tier || 1)*.035) * 100)));
    return `<article class="broken-card"><span class="product-icon">${componentArt(entry.component)}</span><div><strong>${escapeHtml(entry.component.name)}</strong><small>Ремонт ${formatMoney(entry.repairCost)} · примерный шанс ${approx}%</small><p>Попытка ремонта может уничтожить предмет. Навык ремонта и инструменты повышают шанс.</p></div><div class="button-column"><button class="button primary small" data-action="flea-repair" data-id="${entry.id}">Ремонт</button><button class="button ghost small" data-action="flea-salvage" data-id="${entry.id}">В лом</button></div></article>`;
  }).join('')}</div>` : '<p class="muted">Неисправные находки и покупки с радиорынка появятся здесь.</p>'}</section>
  <section class="panel content-card"><div class="section-title"><div><p class="eyebrow">ПРЕДЛОЖЕНИЯ РЫНКА</p><h3>${offers.length ? `${offers.length} предложений` : 'Рынок пока не осмотрен'}</h3></div></div>${offers.length ? `<div class="flea-offers">${offers.map((offer) => `<article><span class="product-icon">${componentArt(offer.component)}</span><div><strong>${escapeHtml(offer.component.name)}</strong><small>${offer.component.cat.toUpperCase()} · ${conditionName(offer.condition)}</small><div class="chip-row">${chip(conditionName(offer.condition), conditionTone(offer.condition))}</div></div><button class="button primary small" data-action="flea-buy" data-id="${offer.id}">${formatMoney(offer.price)}</button></article>`).join('')}</div>` : '<p class="muted">Нажмите «Радиорынок», чтобы получить случайный набор предложений.</p>'}</section>
  <section class="panel content-card"><div class="section-title"><div><p class="eyebrow">ПОСЛЕДНИЕ НАХОДКИ</p><h3>История барахолки</h3></div></div>${(flea.lastFinds || []).length ? `<div class="flea-history">${flea.lastFinds.map((entry) => `<div><span>${entry.componentId && componentMeta[entry.componentId] ? componentArt(componentMeta[entry.componentId]) : 'LOG'}</span><p>${escapeHtml(entry.text)}</p></div>`).join('')}</div>` : '<p class="muted">Пока ничего не найдено.</p>'}</section>`;
}

function renderToolsShop(game) {
  const tools = WORKSPACE_ITEMS.filter((item) => item.group === 'tools');
  return `<section class="panel content-card tools-shop-intro"><div class="section-title"><div><p class="eyebrow">ИНСТРУМЕНТЫ МАСТЕРА</p><h3>Оснащение для ремонта, сетей и диагностики</h3></div><span>${tools.filter((item)=>workspaceLevel(game,item.id)>0).length}/${tools.length}</span></div><p class="muted">Здесь находятся кримпер RJ-45, мультиметр, паяльник, антистатический коврик, пинцет, осциллограф и наборы отвёрток. Купленные инструменты остаются частью рабочего места.</p></section><div class="workspace-upgrade-list tools-shop-list">${tools.map((item)=>workspaceUpgradeCard(game,item)).join('')}</div>`;
}

function renderWorkshop(game, ui) {
  const sub = ui.workshopSection === 'flea' ? 'workspace' : ui.workshopSection;
  const map = { workspace:()=>renderWorkspace(game,ui), tools:()=>renderToolsShop(game), shop:()=>renderShop(game,ui), inventory:()=>renderInventory(game), pc:()=>renderPc(game) };
  return `<section class="screen workshop-screen">${pageHeader('ОБОРУДОВАНИЕ','Мастерская',`Скорость работы ×${workSpeed(game).toFixed(2)}`)}${sectionNav([['workspace','Место'],['tools','Инструменты'],['shop','Комплектующие'],['inventory','Склад'],['pc','Сборка ПК']],sub,'workshop')}${(map[sub]||map.workspace)()}</section>`;
}

function renderFleaPage(game) {
  return `<div class="subpage-head"><button class="icon-btn" data-action="more-home">←</button><div>${pageHeader('РЕТРО-РЫНОК','Барахолка','Поиск, ремонт и перепродажа старой техники')}</div></div>${renderFleaMarket(game)}`;
}

function renderSkills(game) {
  return `<div class="skill-list">${SKILLS.map((meta) => {
    const skill = game.skills[meta.id];
    const need = Math.floor(50 * Math.pow(1.3, Math.max(0, skill.level - 1)));
    const guide = skillGuide(meta.id);
    const temporary = knowledgeBonus(game,meta.id);
    const total = skillLevel(game,meta.id);
    return `<article class="skill-card panel" style="--skill:${meta.color}"><span class="skill-card-icon">${skillIconMarkup(meta.id, meta.name)}</span><div><div class="skill-title"><h3>${meta.name}</h3><b>ур. ${total}</b></div><p>${meta.desc}</p>${temporary?`<div class="chip-row">${chip(`Временные знания +${temporary}`,'warning')}</div>`:''}${progress(skill.xp, need)}<small>${skill.xp}/${need} XP · постоянный ур. ${skill.level}</small><div class="skill-help-inline"><strong>Как качать:</strong><span>${escapeHtml(guide.steps[0])}</span></div><button class="button ghost small skill-help-btn" data-action="show-skill-help" data-id="${meta.id}">Показать все способы</button></div></article>`;
  }).join('')}</div>`;
}


function calendarAfterDays(calendar, days) {
  let total=(calendar.year*360)+(calendar.month-1)*30+(calendar.day-1)+Math.max(0,Number(days)||0);
  return { year:Math.floor(total/360), month:Math.floor((total%360)/30)+1, day:(total%30)+1 };
}
function academicYearsLabel(years) {
  const n=Math.max(1,Number(years)||1);
  return `${n} ${n===1?'игровой год':n<5?'игровых года':'игровых лет'}`;
}

function educationDurationLabel(item) {
  if (item?.type === 'college') return '1 игровой год';
  if (item?.type === 'university') return '5 игровых лет';
  return 'Моментально';
}
function remainingEducationLabel(entry) {
  const days=Math.max(0,Number(entry?.daysLeft||0));
  if (days <= 1) return 'Остался 1 игровой день.';
  const years=Math.floor(days/360);
  const months=Math.ceil((days%360)/30);
  if (years>0) return `Осталось примерно ${years} ${years===1?'год':'года'}${months?` и ${months} мес.`:''}`;
  return `Осталось примерно ${months} мес.`;
}

function educationGainInfo(item) {
  const gains = item.skillGains || {};
  const focus = item.focus || item.focusSkill || Object.keys(gains)[0] || 'communication';
  const main = Number(gains[focus] || 0);
  const other = Object.entries(gains).filter(([id,value]) => id !== focus && Number(value) > 0).map(([,value]) => Number(value));
  const min = other.length ? Math.min(...other) : 0;
  const max = other.length ? Math.max(...other) : 0;
  return { focus, main, min, max, meta:skillMeta[focus] || {name:focus,icon:'EDU'} };
}

function renderEducation(game, ui) {
  game.education.queue ||= [];
  const selectedKind = ui.educationKind || 'quick';
  const selectedSkill = ui.educationSkill || 'hardware';
  const selectedFormalType = ui.educationFormalType === 'university' ? 'university' : 'college';
  const marketStatus = educationMarketStatusV167(game);
  const prepared = availableEducation(game)
    .filter((item) => item.type !== 'advertising')
    .filter((item) => (item.educationKind || (isLongEducation(item) ? 'formal' : 'quick')) === selectedKind)
    .filter((item) => selectedKind !== 'formal' || item.type === selectedFormalType)
    .filter((item) => item.focus === selectedSkill || item.focusSkill === selectedSkill)
    .map((item, index) => ({ item, index, check: educationRequirements(game, item) }))
    .filter(({ item, check }) => selectedKind !== 'quick' || check.ok)
    .sort((a, b) => Number(!a.check.ok) - Number(!b.check.ok) || a.index - b.index);
  const pageSize = selectedKind === 'quick' ? 8 : 24;
  const pages = Math.max(1, Math.ceil(prepared.length / pageSize));
  const page = Math.max(1, Math.min(Number(ui.educationPage || 1), pages));
  const all = prepared.slice((page - 1) * pageSize, page * pageSize);
  const active = game.education.active;
  const activeItem = active ? educationById(active.id) : null;
  const university = game.education.university;
  const queue = game.education.queue || [];
  const activeBlock = '';
  const universityBlock = university ? `<section class="university-progress panel"><div><p class="eyebrow">${university.type === 'college' ? 'ТЕХНИКУМ / КОЛЛЕДЖ' : 'ВЫСШЕЕ ОБРАЗОВАНИЕ'}</p><h3>${educationIllustration(educationById(university.id) || university)}<span>${escapeHtml(university.name)}</span></h3><p>${university.ready ? 'Результат обучения готов.' : remainingEducationLabel(university)}</p>${progress(university.totalDays - university.daysLeft, university.totalDays, 'accent')}</div><strong>Постоянный прирост по всем направлениям · ${university.type === 'college' ? '+1000' : '+5000'} XP</strong></section>` : '';
  const studyQueue = queue.filter((entry) => educationById(entry.id)?.type !== 'advertising');
  const queueBlock = '';
  const knowledgeCount = activeKnowledgeEntries(game).length;
  const kindTabs = [['quick', 'Быстрые материалы'], ['formal', 'Долгое образование']];
  const formalTypeTabs = [['college','Техникумы и ПТУ'],['university','ВУЗы']];
  const skillTabs = SKILLS.map((skill) => [skill.id, skill.name]);
  const marketDays = Math.max(1, Math.ceil(marketStatus.hoursLeft / 24));
  const marketBanner = selectedKind === 'quick' ? `<section class="education-market-v167 panel"><div><p class="eyebrow">ВИТРИНА НЕДЕЛИ</p><h3>${marketStatus.offerCount} материалов в витрине</h3><p>Книги, форумы, курсы и другие быстрые источники обновляются раз в 7 игровых дней. Недоступные материалы скрыты.</p></div><strong>Обновление через ${marketDays} дн.</strong></section>` : '';
  const empty = selectedKind === 'quick'
    ? emptyState('EDU', 'Материалы обновляются', 'В каждой недельной витрине предусмотрены материалы по восьми направлениям.')
    : emptyState('UNI', 'Программ пока нет', 'Они появятся по мере развития героя и наступления подходящего года.');
  return `${universityBlock}${activeBlock}${queueBlock}${marketBanner}<section class="education-explainer panel"><strong>Постоянное образование и временные материалы</strong><p>Техникум длится 1 игровой год и навсегда повышает навыки. ВУЗ длится 5 игровых лет и даёт более сильный постоянный прирост. Быстрые материалы изучаются моментально и дают расходуемые единицы навыков. Заказы списывают временные единицы знаний. Если их не хватает, постоянный навык сохраняется, но снижаются шанс качественного выполнения и оплата. Повторное изучение открывается через 6 месяцев.</p>${knowledgeCount ? `<small>Сейчас действует временных знаний: ${knowledgeCount}</small>` : ''}</section><div class="education-kind-tabs">${kindTabs.map(([id, label]) => `<button class="${selectedKind === id ? 'active' : ''}" data-action="education-kind" data-value="${id}">${label}</button>`).join('')}</div>${selectedKind === 'formal' ? `<div class="education-kind-tabs formal-type-tabs">${formalTypeTabs.map(([id,label])=>`<button class="${selectedFormalType===id?'active':''}" data-action="education-formal-type" data-value="${id}">${label}</button>`).join('')}</div>` : ''}<div class="education-skill-filters">${skillTabs.map(([id, label]) => `<button class="${selectedSkill === id ? 'active' : ''}" data-action="education-skill" data-value="${id}">${skillIconMarkup(id,label)}<span>${escapeHtml(label)}</span></button>`).join('')}</div>${all.length ? `<div class="education-list">${all.map(({ item, check }) => {
    const completed = Number(game.education.completed[item.id] || 0);
    const temporary = isTemporaryMaterial(item);
    const repeatCount = Number(item.repeatCount || 1);
    const maxed = !temporary && completed >= repeatCount;
    const cost = educationCost(game, item);
    const formal = isLongEducation(item);
    const queuedCount = queue.filter((entry) => entry.id === item.id).length + (active?.id === item.id ? 1 : 0) + (university?.id === item.id ? 1 : 0);
    const label = formal ? 'Поступить' : 'Изучить сразу';
    const gain = educationGainInfo(item);
    const gainText = temporary
      ? `${gain.meta.name} +${Math.max(1, gain.main || 1)} временно`
      : gain.max ? `${gain.meta.name} +${gain.main} постоянно · остальные +${gain.min}–${gain.max}` : `${gain.meta.name} +${gain.main} постоянно`;
    return `<article class="education-card panel ${!check.ok && !maxed ? 'locked-education' : ''}"><span class="education-icon">${educationIllustration(item)}</span><div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.desc || '')}</p><div class="chip-row">${chip(educationDurationLabel(item))}${chip(cost ? formatMoney(cost) : 'Бесплатно')}${chip(gainText, formal ? 'ok' : '')}${temporary ? chip('12 мес.', 'warning') : chip('Навсегда', 'ok')}${chip(`+${educationPlayerXp(item)} XP`, 'ok')}${completed ? chip(`пройдено ${completed}`) : ''}${queuedCount ? chip(`в плане ${queuedCount}`, 'warning') : ''}</div></div><button class="button primary small" data-action="start-education" data-id="${item.id}" ${!check.ok ? 'disabled' : ''}>${maxed ? 'Пройдено' : !check.ok ? escapeHtml(check.reason) : label}</button></article>`;
  }).join('')}</div>` : empty}<div class="pagination education-pagination"><button data-action="education-page" data-value="${Math.max(1, page - 1)}" ${page <= 1 ? 'disabled' : ''}>←</button><span>${prepared.length} материалов · ${page}/${pages}</span><button data-action="education-page" data-value="${Math.min(pages, page + 1)}" ${page >= pages ? 'disabled' : ''}>→</button></div>`;
}

function renderJobs(game) {
  ensureCareerV162(game);
  const current = getJob(game);
  const currentBranch = careerCurrentBranch(game);
  const currentState = currentBranch ? careerBranchState(game, currentBranch.id) : null;
  const promotion = promotionStatus(game);
  const ledger = game.progression || {};
  const currentTitle = game.business?.opened ? `Владелец: ${businessTypeById(game.business.typeId).name}` : current?.name || 'Безработный';
  const salary = currentSalary(game);
  const branchCard = (branch, compact = false) => {
    const state = careerBranchState(game, branch.id);
    const active = !game.business?.opened && game.career.currentBranchId === branch.id;
    const job = state?.tier ? careerJobByBranchTier(branch.id, state.tier) : careerJobByBranchTier(branch.id, 1);
    const saved = Boolean(state?.tier);
    return `<article class="career-branch-card panel ${active ? 'selected-card' : ''} ${compact ? 'compact' : ''}" style="--branch:${branch.color}"><div class="career-branch-head">${skillIconMarkup(branch.id, branch.name)}<div><h3>${escapeHtml(branch.name)}</h3><small>${saved ? `Ступень ${state.tier} · ${Math.round(state.xp)} проф. XP` : 'Новая специальность · первая должность'}</small></div></div><strong>${escapeHtml(job?.name || 'Первая должность')}</strong><em>${formatMoney(salaryForJob(game, job))}/мес.</em><button class="button career-choice-button ${active ? 'secondary' : 'primary'} small" data-action="switch-career-branch" data-value="${branch.id}" ${active || game.business?.opened ? 'disabled' : ''}>${active ? 'Текущая ветка' : saved ? 'Вернуться' : 'Начать с нуля'}</button></article>`;
  };
  const currentBranchCard = currentBranch ? branchCard(currentBranch) : '';
  const otherBranchCards = CAREER_BRANCHES_V162.filter((branch) => branch.id !== currentBranch?.id).map((branch) => branchCard(branch, true)).join('');
  const ladder = currentBranch ? currentBranch.jobs.map((job) => {
    const reached = Number(currentState?.bestTier || 0) >= job.careerTier;
    const isCurrent = current?.id === job.id && !game.business?.opened;
    const next = job.careerTier === Number(currentState?.tier || 0) + 1;
    const check = jobRequirements(game, job);
    return `<article class="career-step ${isCurrent ? 'active' : ''} ${reached ? 'reached' : ''}"><span>${job.careerTier}</span><div><strong>${escapeHtml(job.name)}</strong><small>${escapeHtml(job.desc)}</small><div class="chip-row">${chip(`${formatMoney(salaryForJob(game, job))}/мес.`, 'ok')}${chip(`ур. ${job.reqLevel}`)}${chip(`${job.professionXpRequired} проф. XP`)}${next && !check.ok ? chip(check.reason, 'danger') : ''}</div></div>${isCurrent ? chip('Сейчас', 'ok') : reached ? chip('Пройдено') : ''}</article>`;
  }).join('') : '';
  const promotionBlock = !game.business?.opened && currentBranch ? `<section class="promotion-card panel ${promotion.available ? 'available' : ''}"><div><p class="eyebrow">СЛЕДУЮЩАЯ ДОЛЖНОСТЬ</p><h3>${promotion.next ? escapeHtml(promotion.next.name) : 'Верхняя ступень ветки'}</h3><p>${promotion.available ? 'Требования выполнены. Можно принять повышение.' : escapeHtml(promotion.reason)}</p></div>${promotion.available ? '<button class="button primary" data-action="accept-promotion">Принять повышение</button>' : chip(promotion.reason, 'warning')}</section>` : '';
  return `<section class="current-job panel"><div><p class="eyebrow">ОСНОВНАЯ РАБОТА</p><h3>${escapeHtml(currentTitle)}</h3><p>${game.business?.opened ? 'Работа по найму недоступна, пока вы управляете собственной компанией.' : escapeHtml(current?.desc || 'Основной работы пока нет.')}</p></div><div class="salary-display"><small>Ежемесячная зарплата</small><strong>${game.business?.opened ? '—' : formatMoney(salary)}</strong><em>${game.business?.opened ? 'своя фирма' : 'выплачивается каждый месяц'}</em></div></section>
  <section class="panel content-card xp-explainer compact"><div class="section-title"><div><p class="eyebrow">ОПЫТ КАРЬЕРЫ</p><h3>Общий уровень и профессия</h3></div><b>${Math.round(game.player.xp)}/${playerXpNeeded(game.player.level)} XP</b></div><div class="status-grid"><div><small>Работа</small><strong>${Math.round(ledger.xpFromWork || 0)} XP</strong></div><div><small>Учёба</small><strong>${Math.round(ledger.xpFromStudy || 0)} XP</strong></div><div><small>${escapeHtml(currentBranch?.name || 'Профессия')}</small><strong>${Math.round(currentState?.xp || 0)} проф. XP</strong></div><div><small>Уровень</small><strong>${game.player.level}</strong></div></div></section>
  ${promotionBlock}
  <h3 class="subheading">Текущее направление</h3>
  <div class="career-current-v167">${currentBranchCard}</div>
  ${otherBranchCards ? `<details class="career-switcher panel" data-persist-key="career-switcher"><summary>Сменить карьерное направление</summary><p class="muted">Прогресс прежней специальности сохранится. В новой ветке старт начинается с первой должности.</p><div class="career-branch-grid">${otherBranchCards}</div></details>` : ''}
  ${currentBranch ? `<details class="career-ladder panel" data-persist-key="career-ladder-${currentBranch.id}"><summary>Пять ступеней: ${escapeHtml(currentBranch.name)}</summary><div class="career-step-list">${ladder}</div></details>` : ''}`;
}

function renderGrowth(game, ui) {
  return `<section class="screen">${pageHeader('ОБУЧЕНИЕ','Учёба','Быстрые материалы и полноценное образование по восьми направлениям')}${renderEducation(game,ui)}</section>`;
}

function renderSkillsPage(game) {
  return `<div class="subpage-head"><button class="icon-btn" data-action="more-home">←</button><div>${pageHeader('РАЗВИТИЕ','Навыки','Опыт персонажа и профессиональные направления')}</div></div>${renderSkills(game)}`;
}
function renderJobsPage(game) {
  return `<div class="subpage-head"><button class="icon-btn" data-action="more-home">←</button><div>${pageHeader('КАРЬЕРА','Постоянная работа','Зарплата, стаж и доступные вакансии')}</div></div>${renderJobs(game)}`;
}

function renderDevelopment(game) {
  ensureQualityState(game);
  ensureCareerV162(game);
  ensureV165(game);
  const avatar = heroAvatarById(game.profile?.avatar || 'classic');
  const background = starterBackgroundById(game.profile?.specialization);
  const avatarBonuses = Object.fromEntries((avatar.bonuses || []).map((item) => [item.skill, Number(item.amount || 0)]));
  const backgroundBonuses = Object.fromEntries((background.bonuses || []).map((item) => [item.skill, Number(item.amount || 0)]));
  const skillRows = SKILLS.map((meta) => {
    const raw = game.skills?.[meta.id] || { level: 0, xp: 0 };
    const base = ['hardware', 'software'].includes(meta.id) ? 1 : 0;
    const starter = base + Number(avatarBonuses[meta.id] || 0) + Number(backgroundBonuses[meta.id] || 0);
    const permanent = Math.max(0, Number(raw.level || 0) - starter);
    const temporary = knowledgeBonus(game, meta.id);
    const needed = skillXpNeeded(Math.max(1, Number(raw.level || 0)));
    return `<article class="development-skill-row">${skillIconMarkup(meta.id, meta.name)}<div><div class="development-skill-line"><strong>${escapeHtml(meta.name)}</strong><span>ур. ${skillLevel(game, meta.id)}</span></div>${progress(Number(raw.xp || 0), needed, 'accent')}<small>постоянный ${Math.round(raw.level || 0)}${temporary ? ` · временно +${temporary}` : ''}</small></div></article>`;
  }).join('');
  const branches = CAREER_BRANCHES_V162.map((branch) => {
    const state = careerBranchState(game, branch.id);
    const job = careerJobByBranchTier(branch.id, state.tier);
    return `<article class="profession-progress">${skillIconMarkup(branch.id, branch.name)}<div><strong>${escapeHtml(branch.name)}</strong><small>${escapeHtml(job?.name || 'Стартовая ступень')} · ступень ${state.tier}/5</small>${progress(state.xp || 0, Math.max(1, 250 * state.tier), 'positive')}</div><b>${Math.round(state.xp || 0)} XP</b></article>`;
  }).join('');
  const recent = (game.progression?.lastXp || []).slice(0, 8).map((item) => `<div><span>${item.source === 'work' ? 'WORK' : item.source === 'study' ? 'EDU' : 'XP'}</span><p><b>+${item.amount} XP</b> ${escapeHtml(item.label || 'Опыт')}</p></div>`).join('');
  return `<div class="subpage-head"><button class="icon-btn" data-action="more-home">←</button><div>${pageHeader('ПРОГРЕСС', 'База героя', 'Уровень, восемь навыков и профессиональный опыт')}</div></div>
  <section class="development-hero development-hero-v167 panel"><div>${avatarImage(avatar.id, avatar.name, 'profile-icon-image', game.calendar.year)}<div><p class="eyebrow">УРОВЕНЬ ГЕРОЯ</p><h2>${escapeHtml(game.profile.name)} · ${game.player.level}</h2><p>${Math.round(game.player.xp)}/${playerXpNeeded(game.player.level)} XP</p></div></div>${progress(game.player.xp, playerXpNeeded(game.player.level), 'accent')}<div class="development-reputation compact"><span><b>Репутация</b>${Math.round(game.player.reputation)}</span><span><b>Компания</b>${Math.round(game.business?.companyReputation || 0)}</span><span><b>Работа</b>${Math.round(game.progression?.xpFromWork || 0)} XP</span><span><b>Учёба</b>${Math.round(game.progression?.xpFromStudy || 0)} XP</span></div></section>
  <section class="panel content-card development-base-v167"><div class="section-title"><div><p class="eyebrow">ВОСЕМЬ НАПРАВЛЕНИЙ</p><h3>Текущие навыки</h3></div></div><div class="development-skill-list-v167">${skillRows}</div></section>
  <details class="panel development-details-v167" data-persist-key="development-branches"><summary>Профессиональные ветки</summary><div class="profession-progress-list">${branches}</div></details>
  <details class="panel development-details-v167" data-persist-key="development-xp"><summary>Последние начисления опыта</summary><div class="recent-xp-list">${recent || '<p class="muted">Новые начисления появятся после работы или учёбы.</p>'}</div></details>`;
}

function renderFinanceReport(game, ui) {
  ensureQualityState(game);
  const reports=game.finance.history||[];
  const index=Math.max(0,Math.min(Number(ui.financeReportIndex||0),Math.max(0,reports.length-1)));
  const report=reports[index];
  const current=game.finance.current||{income:0,expenses:0,details:[]};
  const categoryRows=report?Object.entries(report.groups||{}).sort((a,b)=>(b[1].income+b[1].expenses)-(a[1].income+a[1].expenses)).map(([id,row])=>`<article><div><strong>${escapeHtml(FINANCE_CATEGORY_LABELS_V165[id]||id)}</strong><small>${row.entries} операций</small></div><span class="success-text">+${formatMoney(row.income||0)}</span><span class="danger-text">−${formatMoney(row.expenses||0)}</span></article>`).join(''):'';
  const details=report?(report.details||[]).slice(0,30).map(item=>`<div class="finance-detail-row"><span>${String(item.at?.day||1).padStart(2,'0')}.${String(item.at?.month||1).padStart(2,'0')}</span><p>${escapeHtml(item.source)}</p><b class="${item.amount>=0?'success-text':'danger-text'}">${item.amount>=0?'+':'−'}${formatMoney(Math.abs(item.amount))}</b></div>`).join(''):'';
  return `<div class="subpage-head"><button class="icon-btn" data-action="more-home">←</button><div>${pageHeader('ФИНАНСЫ','Месячный отчёт','Зарплата, заказы, реклама, офис, сотрудники и банковские операции')}</div></div>
  <section class="panel current-month-card"><div><p class="eyebrow">ТЕКУЩИЙ МЕСЯЦ</p><h3>${monthName(game.calendar.month)} ${game.calendar.year}</h3></div><span><b>Доход</b>+${formatMoney(current.income||0)}</span><span><b>Расход</b>−${formatMoney(current.expenses||0)}</span><strong class="${(current.income||0)-(current.expenses||0)<0?'danger-text':'success-text'}">${formatMoney((current.income||0)-(current.expenses||0))}</strong></section>
  ${report?`<section class="panel finance-report-card"><div class="section-title"><div><p class="eyebrow">ЗАКРЫТЫЙ МЕСЯЦ</p><h2>${monthName(report.month)} ${report.year}</h2></div><strong class="${report.profit<0?'danger-text':'success-text'}">${report.profit>=0?'+':'−'}${formatMoney(Math.abs(report.profit))}</strong></div><div class="finance-report-metrics"><span><b>На начало</b>${formatMoney(report.openingCash)}</span><span><b>Доход</b>${formatMoney(report.income)}</span><span><b>Расход</b>${formatMoney(report.expenses)}</span><span><b>На конец</b>${formatMoney(report.closingCash)}</span></div><div class="finance-category-list">${categoryRows}</div></section><section class="panel content-card"><div class="section-title"><div><p class="eyebrow">ОПЕРАЦИИ</p><h3>Подробная расшифровка</h3></div></div><div class="finance-detail-list">${details}</div></section><div class="pagination"><button data-action="finance-report" data-value="${Math.min(reports.length-1,index+1)}" ${index>=reports.length-1?'disabled':''}>← старее</button><span>${index+1}/${reports.length}</span><button data-action="finance-report" data-value="${Math.max(0,index-1)}" ${index<=0?'disabled':''}>новее →</button></div>`:emptyState('RUB','Закрытых месяцев ещё нет','Первый отчёт появится при переходе к следующему месяцу.')}`;
}

function renderProperty(game) {
  return `<div class="subpage-head"><button class="icon-btn" data-action="more-home">←</button><div>${pageHeader('АКТИВЫ', 'Жильё и транспорт', 'Качество жизни, скорость выездов и статус')}</div></div><h3 class="subheading">Жильё</h3><div class="property-list">${ALL_LOCATIONS.filter((item) => item.fromYear <= game.calendar.year).map((location) => {
    const owned = game.property.ownedLocations.includes(location.id);
    const active = game.property.locationId === location.id;
    const locked = game.player.level < Number(location.reqLevel || 1);
    return `<article class="property-card property-card-visual panel ${active ? 'selected-card' : ''} ${locked ? 'locked-card' : ''}">${location.asset?`<img class="property-preview" src="${location.asset}" alt="${escapeHtml(location.name)}" loading="lazy">`:`<span>${location.icon}</span>`}<div><h3>${location.name}</h3><p>${location.desc}</p><div class="chip-row">${chip(`уровень ${location.reqLevel || 1}`, locked ? 'danger' : 'ok')}${chip(` ${location.maxOrders}`)}${chip(` +${Math.round((location.workSpeedBonus || 0) * 100)}%`)}${location.monthlyCostBase ? chip(`${formatMoney(Math.round(location.monthlyCostBase * getInflation(game)))}/мес.`) : ''}</div></div><button class="button ${active ? 'secondary' : 'primary'} small" data-action="buy-location" data-id="${location.id}" ${locked ? 'disabled' : ''}>${active ? 'Активно' : locked ? `Нужен ур. ${location.reqLevel}` : owned || location.type !== 'buy' ? 'Переехать' : formatMoney(Math.round((location.cost || 0) * getInflation(game)))}</button></article>`;
  }).join('')}</div><h3 class="subheading">Транспорт</h3><div class="property-list">${ALL_VEHICLES.filter((item) => item.fromYear <= game.calendar.year).map((vehicle) => {
    const owned = game.property.ownedVehicles.includes(vehicle.id);
    const active = game.property.vehicleId === vehicle.id;
    const locked = game.player.level < Number(vehicle.reqLevel || 1);
    const dailyCost = Math.round(Number(vehicle.dailyCostBase || 0) * getInflation(game));
    return `<article class="property-card property-card-visual panel ${active ? 'selected-card' : ''} ${locked ? 'locked-card' : ''}">${vehicle.asset?`<img class="property-preview" src="${vehicle.asset}" alt="${escapeHtml(vehicle.name)}" loading="lazy">`:`<span>${vehicle.icon}</span>`}<div><h3>${vehicle.name}</h3><p>${vehicle.desc}</p><div class="chip-row">${vehicle.speedBonus?chip(`скорость +${Math.round(vehicle.speedBonus*100)}%`,'ok'):''}${vehicle.repBonus?chip(`статус +${Math.round(vehicle.repBonus*100)}%`):''}${vehicle.extraOrderSlots?chip(`+${vehicle.extraOrderSlots} активн. заказа`,'ok'):''}${dailyCost ? chip(`${formatMoney(dailyCost)}/день`,'warning') : ''}${vehicle.monthlyCostBase ? chip(`${formatMoney(Math.round(vehicle.monthlyCostBase * getInflation(game)))}/мес.`) : ''}</div></div><button class="button ${active ? 'secondary' : 'primary'} small" data-action="buy-vehicle" data-id="${vehicle.id}" ${locked ? 'disabled' : ''}>${active ? 'Активно' : locked ? `Нужен ур. ${vehicle.reqLevel}` : owned ? 'Выбрать' : formatMoney(Math.round((vehicle.cost || 0) * getInflation(game)))}</button></article>`;
  }).join('')}</div>`;
}

function renderBank(game) {
  return `<div class="subpage-head"><button class="icon-btn" data-action="more-home">←</button><div>${pageHeader('ФИНАНСЫ', 'Банк', 'Вклады, накопительные счета и кредитные программы')}</div></div><div class="metrics-grid">${stat('Свободные деньги', formatMoney(game.player.cash), imageIcon(REST_STATUS_ASSETS_V171.money,'Деньги','metric-inline-image'))}${stat('Доход за карьеру', formatMoney(game.bank.totalIncome||0), metricImageIcon(UI_V181_METRIC_ASSETS.careerIncome,'Доход за карьеру'))}${stat('Вкладов', game.bank.deposits.length, metricImageIcon(UI_V181_METRIC_ASSETS.deposits,'Вклады'))}${stat('Кредитов', game.bank.loans.length, metricImageIcon(UI_V181_METRIC_ASSETS.loans,'Кредиты'))}</div><h3 class="subheading">Вклады и накопления</h3><div class="bank-grid">${BANK.depositRates.map((rate) => `<article class="bank-card panel"><h3>${escapeHtml(rate.name)}</h3><p>${Math.round(rate.rate * 100)}% за ${rate.termDays} дн. · от ${formatMoney(rate.minAmount)}</p><label class="inline-field"><input id="deposit_${rate.id}" type="number" min="${rate.minAmount}" placeholder="Сумма"><button class="button primary small" data-action="open-deposit" data-id="${rate.id}">Открыть</button></label></article>`).join('')}</div>${game.bank.deposits.length ? `<div class="active-finance">${game.bank.deposits.map((deposit) => `<div><span>${escapeHtml(deposit.name)}</span><strong>${formatMoney(deposit.amount)} → ${formatMoney(deposit.payout)}</strong><small>${deposit.daysLeft} дн.</small></div>`).join('')}</div>` : ''}<h3 class="subheading">Кредиты</h3><div class="credit-note panel"><strong>Как получить кредит</strong><p>Нужна история доходов, достаточный средний заработок и отсутствие другого действующего кредита.</p></div><div class="bank-grid">${BANK.loanRates.map((rate) => {
    const status = creditStatus(game, rate);
    return `<article class="bank-card panel ${status.ok ? '' : 'locked-credit'}"><h3>${escapeHtml(rate.name)}</h3><p>${Math.round(rate.rate * 100)}% · ${status.ok ? `лимит ${formatMoney(status.limit)}` : escapeHtml(status.reason)}</p><label class="inline-field"><input id="loan_${rate.id}" type="number" placeholder="Сумма" ${status.ok ? '' : 'disabled'}><button class="button warning small" data-action="take-loan" data-id="${rate.id}" ${status.ok ? '' : 'disabled'}>${status.ok ? 'Взять' : 'Закрыто'}</button></label></article>`;
  }).join('')}</div>${game.bank.loans.length ? `<div class="active-finance">${game.bank.loans.map((loan) => `<div><span>${escapeHtml(loan.name)}${loan.overdue ? ' · ПРОСРОЧКА' : ''}</span><strong>${formatMoney(loan.repay)}</strong><button class="button danger small" data-action="repay-loan" data-id="${loan.id}">Погасить</button></div>`).join('')}</div>` : ''}`;
}

function renderRest(game) {
  const current=lifestylePlan(game);
  const lifestyleCards=LIFESTYLE_PLANS_V169.map((item)=>{
    const active=current.id===item.id;
    const cost=lifestyleDailyCost(game,item);
    return `<button class="rest-card lifestyle-plan-card panel ${active?'selected-card':''}" data-action="lifestyle-plan" data-id="${item.id}">${item.asset?imageIcon(item.asset,item.name,'rest-icon-image'):`<span>${item.icon}</span>`}<div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.desc)}</p><small>Бонус к отдыху +${Math.round((item.energyRecovery||0)*4)} энергии · настроение ${Number(item.moodRecovery||0)>=0?'+':''}${item.moodRecovery||0}/день${item.speedBonus?` · скорость +${Math.round(item.speedBonus*100)}%`:''}</small></div><b>${cost?`${formatMoney(cost)}/день`:'Бесплатно'}${active?'<em>Выбрано</em>':''}</b></button>`;
  }).join('');
  const productivity=Math.round(energyPerformanceFactor(game.player.energy)*100);
  const errorRisk=Math.round(energyErrorPenalty(game.player.energy)*100);
  const fatiguePanel=`<section class="panel content-card fatigue-status ${errorRisk?'warning-card':''}"><div class="section-title"><div><p class="eyebrow">ВЛИЯНИЕ УСТАЛОСТИ</p><h3>${errorRisk?'Герой устаёт и чаще ошибается':'Рабочее состояние нормальное'}</h3></div><span>${productivity}% скорости</span></div><p class="muted">Текущий дополнительный риск ошибки: ${errorRisk}%. При нулевой энергии заказы и быстрое обучение останавливаются до ручного отдыха.</p></section>`;
  return `<div class="subpage-head"><button class="icon-btn" data-action="more-home">←</button><div>${pageHeader('ВОССТАНОВЛЕНИЕ', 'Отдых', 'Энергия постоянно убывает; восстановить её можно только действиями в этом разделе')}</div></div><div class="vital-cards">${stat('Энергия', `${Math.round(game.player.energy)}%`, imageIcon(REST_STATUS_ASSETS_V171.energy, 'Энергия', 'rest-icon-image'))}${stat('Настроение', `${Math.round(game.player.mood)}%`, imageIcon(REST_STATUS_ASSETS_V171.mood, 'Настроение', 'rest-icon-image'))}${stat('Развлечения', `${Math.round(game.player.fun)}%`, imageIcon(REST_STATUS_ASSETS_V171.fun, 'Развлечения', 'rest-icon-image'))}${stat('Здоровье', `${Math.round(game.player.health)}%`, imageIcon(REST_STATUS_ASSETS_V171.health, 'Здоровье', 'rest-icon-image'))}</div>${fatiguePanel}<section class="panel content-card"><div class="section-title"><div><p class="eyebrow">ПИТАНИЕ НА ОДИН ДЕНЬ</p><h3>${escapeHtml(current.name)}</h3></div><span>${lifestyleDailyCost(game,current)?`${formatMoney(lifestyleDailyCost(game,current))}/день`:'без расходов'}</span></div><div class="rest-list lifestyle-plan-list">${lifestyleCards}</div></section><h3 class="subheading">Разовый отдых</h3><button class="rest-card panel" data-action="rest" data-id="sleep">${imageIcon('./assets/ui-v171/rest/sleep.webp', 'Полноценный сон', 'rest-icon-image')}<div><h3>Полноценный сон</h3><p>1 день · восстанавливает энергию и настроение</p></div><b>Бесплатно</b></button><div class="rest-list">${ENTERTAINMENT.map((item) => `<button class="rest-card panel" data-action="rest" data-id="${item.id}">${item.asset ? imageIcon(item.asset, item.name, 'rest-icon-image') : `<span>${item.icon}</span>`}<div><h3>${item.name}</h3><p>${item.desc}</p><small>Настроение +${item.mood || 0} · отдых +${item.fun || 0}${item.health ? ` · здоровье +${item.health}` : ''}</small></div><b>${item.cost ? formatMoney(Math.round(item.cost * getInflation(game))) : 'Бесплатно'}</b></button>`).join('')}</div>`;
}

function achievementCategoryIcon(category, label) {
  const asset = ACHIEVEMENT_CATEGORY_ASSETS_V173[category];
  return asset ? imageIcon(asset, label, 'achievement-category-image') : '';
}

function renderAchievements(game) {
  const categoryNames={orders:'Заказы',money:'Финансы',skills:'Навыки',edu:'Учёба',property:'Имущество',career:'Карьера',era:'Эпохи',rep:'Репутация',level:'Уровни',special:'Особые'};
  const byCategory = Object.groupBy ? Object.groupBy(ACTIVE_ACHIEVEMENTS, (item) => item.cat) : ACTIVE_ACHIEVEMENTS.reduce((acc, item) => ((acc[item.cat] ||= []).push(item), acc), {});
  const opened=game.achievements.filter((id)=>!REMOVED_POST_2010_ACHIEVEMENTS.has(id)).length;
  return `<div class="subpage-head"><button class="icon-btn" data-action="more-home">←</button><div>${pageHeader('ПРОГРЕСС', 'Достижения', `${opened}/${ACTIVE_ACHIEVEMENTS.length} открыто`)}</div></div>${progress(opened, ACTIVE_ACHIEVEMENTS.length, 'accent')}<div class="achievement-sections">${Object.entries(byCategory).map(([category, achievements]) => { const categoryLabel=categoryNames[category]||category; return `<section><h3>${achievementCategoryIcon(category,categoryLabel)}<span>${escapeHtml(categoryLabel)}</span></h3><div class="achievement-grid">${achievements.map((achievement) => {
    const unlocked = game.achievements.includes(achievement.id);
    const grade = ACH_GRADES[achievement.grade || 'bronze'] || ACH_GRADES.bronze;
    return `<article class="achievement ${unlocked ? 'unlocked' : 'locked'} panel" style="--medal:${grade.color}"><div><strong>${escapeHtml(unlocked ? achievement.name : 'Скрытое достижение')}</strong><small>${escapeHtml(unlocked ? achievement.desc : 'Продолжайте развивать карьеру')}</small></div></article>`;
  }).join('')}</div></section>`; }).join('')}</div>`;
}

const DISPLAY_TERM_RU = {
  hardware:'Железо', software:'Софт', networking:'Сети', repair:'Ремонт', security:'Безопасность',
  data:'Данные', communication:'Общение', management:'Управление', orders:'Заказы', money:'Финансы',
  skills:'Навыки', education:'Учёба', property:'Имущество', career:'Карьера', reputation:'Репутация',
  experience:'Опыт', study:'Учёба', work:'Работа', business:'Бизнес', employee:'Сотрудники', employees:'Сотрудники',
  quick:'Быстрое обучение', formal:'Длительное обучение', advertising:'Реклама', outcome:'Результат', monthly_report:'Отчёт за месяц'
};
function localizeLedgerText(value = '') {
  return String(value).replace(/\b(hardware|software|networking|repair|security|data|communication|management|orders|money|skills|education|property|career|reputation|experience|study|work|business|employee|employees|quick|formal|advertising|outcome|monthly_report)\b/gi, (match) => DISPLAY_TERM_RU[match.toLowerCase()] || match);
}

function renderLog(game, ui) {
  ensureQualityState(game);
  const filter=ui.ledgerFilter||'all';
  const filters=[
    ['all','Все'],['money','Деньги'],['xp','Опыт'],['skill','Навыки'],
    ['outcome','Результаты'],['business','Компания'],['employee','Сотрудники'],['monthly_report','Месяцы']
  ];
  const entries=ledgerEntries(game,filter).slice(0,120);
  const kindLabel={gain:'Получено',loss:'Потеряно',mixed:'Изменение',info:'Событие'};
  const structured=entries.map(entry=>{
    const amount=Number(entry.amount||0);
    const amountText=amount?`${amount>=0?'+':'−'}${entry.unit==='₽'?formatMoney(Math.abs(amount)):`${Math.abs(amount)} ${escapeHtml(entry.unit)}`}`:'';
    return `<article class="ledger-row panel ${escapeHtml(entry.kind)}"><span class="ledger-kind">${kindLabel[entry.kind]||'Событие'}</span><div><strong>${escapeHtml(localizeLedgerText(entry.label))}</strong><small>${String(entry.at?.day||1).padStart(2,'0')}.${String(entry.at?.month||1).padStart(2,'0')}.${entry.at?.year||game.calendar.year}${entry.details?` · ${escapeHtml(localizeLedgerText(entry.details))}`:''}</small></div>${amountText?`<b class="${amount>=0?'success-text':'danger-text'}">${amountText}</b>`:''}</article>`;
  }).join('');
  const oldLog=game.log.slice(0,80).map((entry) => `<article class="log-entry ${entry.type}"><span>${new Date(entry.at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span><p>${escapeHtml(entry.text)}</p></article>`).join('');
  return `<div class="subpage-head"><button class="icon-btn" data-action="more-home">←</button><div>${pageHeader('СИСТЕМА', 'Награды и бонусы', 'Деньги, опыт, навыки, решения и последствия')}</div></div>
  <div class="ledger-filters">${filters.map(([id,label])=>`<button class="${filter===id?'active':''}" data-action="ledger-filter" data-value="${id}">${label}</button>`).join('')}</div>
  <section class="ledger-summary panel"><span><b>Записей</b>${game.quality.ledger.length}</span><span><b>Получений</b>${game.quality.ledger.filter(item=>item.kind==='gain').length}</span><span><b>Потерь</b>${game.quality.ledger.filter(item=>item.kind==='loss').length}</span><span><b>Изменений</b>${game.quality.ledger.filter(item=>item.kind==='mixed').length}</span></section>
  <div class="ledger-list">${structured||emptyState('LOG','Записей пока нет','Выполните заказ, купите предмет, пройдите обучение или примите решение.')}</div>
  <details class="system-log panel"><summary>Технический журнал игры</summary><div class="log-list">${oldLog}</div></details>`;
}
function renderSettings(game, ui) {
  ensureV13(game);
  const report = diagnosticReport(game);
  return `<div class="subpage-head"><button class="icon-btn" data-action="more-home">←</button><div>${pageHeader('ПАРАМЕТРЫ', 'Настройки', 'Интерфейс, звук, резервные копии и диагностика')}</div></div>
  <section class="profile-banner panel">${avatarImage(game.profile.avatar, game.profile.name, 'profile-icon-image', game.calendar.year)}<div><h3>${escapeHtml(game.profile.name)}</h3><p>${game.calendar.year} год · ${game.stats.ordersDone} заказов · ур. ${game.player.level}</p></div></section>
  <div class="settings-list panel">
    <button data-action="toggle-theme"><span><strong>Тема оформления</strong><small>Сейчас включена ${ui.theme === 'light' ? 'светлая' : 'тёмная'} тема</small></span><b>ТЕМА</b></button>
    <label><span><strong>Анимации интерфейса</strong><small>Плавные переходы между состояниями</small></span><input type="checkbox" id="settingAnimations" ${game.settings.animations ? 'checked' : ''}></label>
    <label><span><strong>Уменьшить движение</strong><small>Отключить декоративные переходы и пульсации</small></span><input type="checkbox" id="settingReducedMotion" ${game.visual.reducedMotion ? 'checked' : ''}></label>
    <label><span><strong>Интерфейс эпохи</strong><small>Менять детали оформления вместе с годом</small></span><input type="checkbox" id="settingEraThemes" ${game.visual.eraThemes ? 'checked' : ''}></label>
    <label><span><strong>Звуки</strong><small>Стилизованные сигналы интерфейса</small></span><input type="checkbox" id="settingAudio" ${game.audio.enabled ? 'checked' : ''}></label>
    <label><span><strong>Фоновая музыка</strong><small>Ретро-микс включён в сборку и играет во время карьеры</small></span><input type="checkbox" id="settingRadio" ${game.audio.radioEnabled ? 'checked' : ''}></label>
    <label><span><strong>Виброотклик</strong><small>Короткая вибрация при долгом нажатии</small></span><input type="checkbox" id="settingVibration" ${game.audio.vibration ? 'checked' : ''}></label>
    <label class="volume-setting"><span><strong>Громкость</strong><small>${Math.round(game.audio.master*100)}%</small></span><input type="range" id="settingVolume" min="0" max="100" value="${Math.round(game.audio.master*100)}"></label>
    <label><span><strong>Компактный режим</strong><small>Меньше отступов и больше элементов на экране</small></span><input type="checkbox" id="settingCompact" ${game.settings.compactMode ? 'checked' : ''}></label>
    <button data-action="tutorial-open"><span><strong>Повторить обучение</strong><small>Снова показать подсказки по основным разделам</small></span><b>?</b></button>
  </div>
  <h3 class="subheading">Сложность карьеры</h3>
  <section class="difficulty-settings panel">${DIFFICULTY_MODES_V180.map((mode)=>`<button class="${game.mode?.difficultyId===mode.id?'active':''}" data-action="set-difficulty" data-value="${mode.id}"><strong>${escapeHtml(mode.name)}</strong><small>${escapeHtml(mode.desc)}</small></button>`).join('')}</section>
  <h3 class="subheading">Сохранение и восстановление</h3>
  <div class="settings-list panel">
    <button data-action="quick-save"><span><strong>Сохранить сейчас</strong><small>Записать текущий прогресс</small></span><b>${imageIcon('./assets/ui-v169/special/save.webp','Сохранить','settings-action-icon')}</b></button>
    <button data-action="create-backup"><span><strong>Создать резервную копию</strong><small>Копий создано: ${game.stability.backupCount || 0}${game.stability.lastBackupAt ? ` · последняя ${new Date(game.stability.lastBackupAt).toLocaleString('ru-RU')}` : ''}</small></span><b>＋</b></button>
    <button data-action="restore-backup"><span><strong>Восстановить последнюю копию</strong><small>Вернуть последнее безопасное состояние профилей</small></span><b>↶</b></button>
    <button data-action="export-save"><span><strong>Экспорт сохранения</strong><small>JSON-файл для переноса между устройствами</small></span><b>↗</b></button>
    <button data-action="import-save-open"><span><strong>Импорт сохранения</strong><small>Вставить ранее экспортированный JSON</small></span><b>↙</b></button>
    <button data-action="quality-check-save"><span><strong>Проверить сохранение</strong><small>${game.quality?.saveHealth?.status==='repaired'?'Последняя проверка исправила ошибки':game.quality?.saveHealth?.status==='warning'?'Найдены предупреждения':'Структура профиля исправна'}</small></span><b></b></button>
    <button data-action="show-diagnostics"><span><strong>Диагностический отчёт</strong><small>${report.warnings.length ? `${report.warnings.length} предупрежд.` : 'Критических предупреждений нет'}</small></span><b>≡</b></button>
    <button data-action="release-readiness"><span><strong>Проверка перед открытым тестом</strong><small>Проверить структуру профиля, календарь, заказы и ошибки сессии</small></span><b>RC</b></button>
    <button data-action="feedback-report"><span><strong>Сообщить о проблеме</strong><small>Сформировать технический текст для отправки разработчику</small></span><b>!</b></button>
    <button data-action="switch-profile"><span><strong>Выбор профиля</strong><small>Вернуться к слотам сохранений</small></span><b>IT</b></button>
  </div>
  <button class="button danger full" data-action="reset-current-profile">Удалить текущую карьеру</button>
  <p class="version-note">Хроники Айтишника · версия 0.18.3 · автор: Ивасик</p>`;
}

function renderAdvertising(game, ui) {
  ensureAdvertisingV162(game);
  ensureQualityState(game);
  const scope=ui.advertisingScope||'personal';
  const durationId=ui.advertisingDuration||'week';
  const campaigns=ADVERTISING_CATALOG_V162;
  const pageSize=15;
  const pages=Math.max(1,Math.ceil(campaigns.length/pageSize));
  const page=Math.max(1,Math.min(Number(ui.advertisingPage||1),pages));
  const shown=campaigns.slice((page-1)*pageSize,page*pageSize);
  const marketing=game.marketing||{};
  const analytics=marketing.analytics||{};
  const summary=advertisingSummary(game,scope);
  const active=(marketing.activeCampaigns||[]).filter((item)=>item.scope===scope&&item.daysLeft>0);
  const reports=(marketing.reports||[]).filter(item=>item.scope===scope).slice(0,12);
  const scopeTabs=[['personal','Личная реклама'],['company','Реклама компании']];
  return `<div class="subpage-head"><button class="icon-btn" data-action="more-home">←</button><div>${pageHeader('ПРОДВИЖЕНИЕ','Реклама','Кампании работают параллельно и получают измеримый результат')}</div></div>
  <section class="panel content-card advertising-note"><strong>Независимая рекламная кампания</strong><p>Реклама не занимает время героя. Каждая заявка запоминает источник, а после завершения кампании игра показывает затраты, лиды, заказы, выручку и итоговую прибыль.</p><div class="ad-audience-guide-v182">${Object.entries(AD_AUDIENCE_HINTS_V182).map(([category,hint])=>`<span><b>${escapeHtml(category)}</b><small>${escapeHtml(hint.audience)} · ${escapeHtml(hint.feature)}</small></span>`).join('')}</div></section>
  <div class="advertising-scope-tabs">${scopeTabs.map(([id,label])=>`<button class="${scope===id?'active':''}" data-action="advertising-scope" data-value="${id}" ${id==='company'&&!game.business?.opened?'disabled':''}>${label}${id==='company'&&!game.business?.opened?' · закрыто':''}</button>`).join('')}</div>
  <div class="advertising-duration-tabs">${ADVERTISING_DURATIONS_V162.map((duration)=>`<button class="${durationId===duration.id?'active':''}" data-action="advertising-duration" data-value="${duration.id}">${duration.name}</button>`).join('')}</div>
    <div class="metrics-grid">${stat('Активно',active.length,metricImageIcon(UI_V181_METRIC_ASSETS.active,'Активно'))}${stat('Потрачено',formatMoney(analytics.spend||0),metricImageIcon(UI_V181_METRIC_ASSETS.spent,'Потрачено'))}${stat('Заказов от рекламы',analytics.orders||0,metricImageIcon(UI_V181_METRIC_ASSETS.adOrders,'Заказы от рекламы'))}${stat('Выручка',formatMoney(analytics.revenue||0),metricImageIcon(UI_V181_METRIC_ASSETS.revenue,'Выручка'))}</div>
  ${active.length?`<section class="active-ad-list panel"><div class="section-title"><div><p class="eyebrow">АКТИВНЫЕ КАМПАНИИ</p><h3>${scope==='company'?'Компания':'Личные услуги'}</h3></div></div>${active.map((item)=>`<div><strong>${escapeHtml(item.name)}</strong><span>${item.daysLeft} дн. · лидов ${item.stats?.leads||0} · заказов ${item.stats?.orders||0}</span>${progress(item.totalDays-item.daysLeft,item.totalDays,'accent')}</div>`).join('')}</section>`:''}
  ${reports.length?`<section class="panel content-card ad-report-section"><div class="section-title"><div><p class="eyebrow">ЗАВЕРШЁННЫЕ КАМПАНИИ</p><h3>Отчёт об эффективности</h3></div><span>${reports.length} последних</span></div><div class="ad-report-list">${reports.map(report=>`<article><div><strong>${escapeHtml(report.name)}</strong><small>Лиды ${report.leads} · заказы ${report.orders} · конверсия ${report.leads?Math.round(report.orders/report.leads*100):0}% · клиент ${report.orders?formatMoney(Math.round(report.price/report.orders)):'—'} · ROI ${report.price?Math.round(report.profit/report.price*100):0}%</small></div><span><b>Затраты</b>${formatMoney(report.price)}</span><span><b>Выручка</b>${formatMoney(report.revenue)}</span><strong class="${report.profit>=0?'success-text':'danger-text'}">${report.profit>=0?'+':'−'}${formatMoney(Math.abs(report.profit))}</strong></article>`).join('')}</div></section>`:''}
  <div class="advertising-list">${shown.map((item)=>{const check=advertisingRequirements(game,item,scope,durationId);const price=advertisingPrice(game,item,scope,durationId);const gains=item.marketingGains||{};return `<article class="education-card advertising-card panel ${!check.ok?'locked-education':''}"><span class="education-icon ad-category-icon">${AD_CATEGORY_ASSETS_V180[item.category] ? imageIcon(AD_CATEGORY_ASSETS_V180[item.category], item.category, 'advertising-source-image') : 'AD'}</span><div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.desc)}</p>${AD_AUDIENCE_HINTS_V182[item.category]?`<small class="ad-audience-line-v182">Аудитория: ${escapeHtml(AD_AUDIENCE_HINTS_V182[item.category].audience)} · ${escapeHtml(AD_AUDIENCE_HINTS_V182[item.category].feature)}</small>`:''}<div class="chip-row">${chip(item.category||'Реклама')}${chip(ADVERTISING_DURATIONS_V162.find(d=>d.id===durationId)?.name||'1 неделя')}${chip(formatMoney(price))}${chip(`заказы +${Math.round(Number(gains.orderBonus||0)*1000)/10}%`,'ok')}${chip(`премиум +${Math.round(Number(gains.premiumBonus||0)*1000)/10}%`,'ok')}</div></div><button class="button primary small" data-action="start-advertising" data-id="${item.id}" ${!check.ok?'disabled':''}>${check.ok?'Запустить':escapeHtml(check.reason)}</button></article>`;}).join('')}</div>
  <div class="pagination"><button data-action="advertising-page" data-value="${Math.max(1,page-1)}" ${page<=1?'disabled':''}>←</button><span>${campaigns.length} площадок · ${page}/${pages}</span><button data-action="advertising-page" data-value="${Math.min(pages,page+1)}" ${page>=pages?'disabled':''}>→</button></div>`;
}
function renderHeroHub(game, ui) {
  const section=ui.heroSection||'development';
  const tabs=[['development','Обзор героя'],['jobs','Работа'],['skills','Навыки']];
  const body=section==='jobs' ? renderJobsPage(game) : section==='skills' ? renderSkillsPage(game) : renderDevelopment(game);
  return `<div class="subpage-head"><button class="icon-btn" data-action="more-home">←</button><div>${pageHeader('ГЕРОЙ И КАРЬЕРА','Развитие','Уровень, навыки, профессия и постоянная работа')}</div></div><div class="hero-hub-tabs">${tabs.map(([id,label])=>`<button class="${section===id?'active':''}" data-action="hero-section" data-value="${id}">${escapeHtml(label)}</button>`).join('')}</div><div class="hero-hub-content">${body}</div>`;
}

function renderMoreHome(game) {
  const menu = [
    {id:'notifications',icon:'!',title:'Центр уведомлений',subtitle:`Непрочитанных ${unreadNotificationsV180(game)}`},
    {id:'hero',icon:'IT',title:'Герой и карьера',subtitle:`Уровень ${game.player.level} · ${getJob(game)?.name||'Безработный'} · навыки`},
    {id:'workshop',icon:'WORK',title:'Мастерская',subtitle:'Место, инструменты, комплектующие и сборка ПК'},
    {id:'flea',icon:'RDK',title:'Барахолка',subtitle:'Поиск, ремонт и перепродажа старой техники'},
    {id:'property',icon:'HOME',title:'Имущество',subtitle:getLocation(game).name},
    {id:'finance',icon:'₽',title:'Месячный отчёт',subtitle:(game.finance.history||[]).length?`${monthName(game.finance.history[0].month)} ${game.finance.history[0].year}`:'Первый отчёт ещё не закрыт'},
    {id:'bank',icon:'BANK',title:'Банк',subtitle:`Вкладов ${game.bank.deposits.length} · кредитов ${game.bank.loans.length}`},
    {id:'business',icon:'▣',title:'Бизнес и город',subtitle:`Команда ${game.business?.employees?.length||0} · доля рынка ${Math.round(game.business?.marketShare||0)}%`},
    {id:'advertising',icon:'AD',title:'Реклама',subtitle:`Активно ${(game.marketing?.activeCampaigns||[]).filter(item=>item.daysLeft>0).length} · работает параллельно`},
    {action:'quick-save',icon:'▥',title:'Сохранить игру',subtitle:'Ручная контрольная точка'},
    {id:'achievements',icon:'ACH',title:'Достижения',subtitle:`${game.achievements.filter((id)=>!REMOVED_POST_2010_ACHIEVEMENTS.has(id)).length}/${ACTIVE_ACHIEVEMENTS.length}`},
    {id:'log',icon:'≡',title:'Награды и бонусы',subtitle:`${game.quality?.ledger?.length||0} записей`},
    {id:'settings',icon:'SET',title:'Настройки',subtitle:'Тема, обучение и профили'}
  ];
  return `${pageHeader('ДОПОЛНИТЕЛЬНО','Ещё','Работа, экономика, отдых и сохранение')}<div class="more-menu">${menu.map((item)=>`<button class="menu-row panel" data-action="${item.action||'more-page'}" ${item.id?`data-value="${item.id}"`:''}><span>${moreIconMarkup(item.id || item.action, item.icon)}</span><div><strong>${item.title}</strong><small>${item.subtitle}</small></div><b>›</b></button>`).join('')}</div>`;
}

function renderNotifications(game, ui) {
  ensureV180(game);
  const filter=ui.notificationFilter||'all';
  const all=game.v18.notifications||[];
  const shown=all.filter((item)=>filter==='unread'?!item.read:filter==='important'?item.important:true);
  const filters=[['all','Все'],['unread','Непрочитанные'],['important','Важные']];
  return `<div class="subpage-head"><button class="icon-btn" data-action="more-home">←</button><div>${pageHeader('ЦЕНТР СОБЫТИЙ','Уведомления','Решения, клиенты, гарантии, рынок и история')}</div></div>
  <div class="notification-toolbar panel"><div>${filters.map(([id,label])=>`<button class="${filter===id?'active':''}" data-action="notification-filter" data-value="${id}">${label}</button>`).join('')}</div><button class="button secondary small" data-action="notifications-read" ${all.some(item=>!item.read)?'':'disabled'}>Прочитать все</button></div>
  <div class="notification-list">${shown.length?shown.map((item)=>`<article class="notification-card panel ${item.read?'read':''} ${item.important?'important':''}"><div><span>${escapeHtml(String(item.type||'INFO').toUpperCase().slice(0,5))}</span><div><strong>${escapeHtml(item.title)}</strong><small>${String(item.at?.day||1).padStart(2,'0')}.${String(item.at?.month||1).padStart(2,'0')}.${item.at?.year||game.calendar.year}</small></div></div><p>${escapeHtml(item.text||'')}</p><div class="button-row compact"><button class="button primary small" data-action="open-notification-target" data-id="${item.id}">Открыть</button><button class="button ghost small" data-action="dismiss-notification" data-id="${item.id}">Убрать</button></div></article>`).join(''):emptyState('INFO','Уведомлений нет','Новые решения, гарантии и события появятся здесь.')}</div>`;
}

function renderBusiness(game, ui) {
  ensureV08(game);
  ensureV13(game);
  ensureV160(game);
  ensureV165(game);
  if(!game.business.opened){
    const selected=businessTypeById(ui.companyType||'service_repair');
    const req=companyRequirement(game,selected.id);
    const reqSkills=Object.entries(selected.reqSkills||{}).map(([id,level])=>{
      const current=skillLevel(game,id);
      return `<span class="${current>=level?'ok':'missing'}"><b>${escapeHtml(skillMeta[id]?.name||id)}</b><small>${current}/${level}</small></span>`;
    }).join('');
    const typeCards=BUSINESS_TYPES_V161.map(type=>{
      const typeReq=companyRequirement(game,type.id);
      return `<button class="company-type-card ${selected.id===type.id?'active':''}" data-action="company-type" data-value="${type.id}">${businessTypeIconMarkup(type.id, type.name, 1)}<div><strong>${escapeHtml(type.name)}</strong><small>${escapeHtml(type.desc)}</small><em>${typeReq.ok?'Можно открыть':escapeHtml(typeReq.reason)}</em></div></button>`;
    }).join('');
    return `<section class="screen">${pageHeader('СВОЯ КОНТОРА','Компания','Сначала вы работаете в одиночку, затем выбираете собственное направление')}<section class="panel content-card company-launch-card"><p class="eyebrow">ВЫБОР БИЗНЕСА</p><h2>Какую фирму открыть?</h2><p>Компания — отдельная карьерная ветка. После открытия вы увольняетесь с постоянной работы, получаете профильные заказы, нанимаете сотрудников и развиваете отделы.</p><div class="company-type-grid">${typeCards}</div><section class="selected-company-type"><div>${businessTypeIconMarkup(selected.id, selected.name, 1, 'selected-business-icon')}<div><p class="eyebrow">ВЫБРАНО</p><h3>${escapeHtml(selected.name)}</h3><p>${escapeHtml(selected.desc)}</p><small>Клиенты: ${escapeHtml(selected.clients)}</small></div></div><div class="status-grid"><div><small>Уровень</small><strong>${game.player.level}/${selected.reqLevel}</strong></div><div><small>Репутация</small><strong>${game.player.reputation}/${selected.reqRep}</strong></div><div><small>Регистрация</small><strong>${formatMoney(Math.round(Number(selected.cost||0)*getInflation(game)))}</strong></div></div><div class="company-skill-reqs">${reqSkills}</div></section><label class="field"><span>Название компании</span><input id="companyName" maxlength="40" placeholder="Например: КомпМастер"></label><button class="button primary full" data-action="open-company" ${req.ok?'':`disabled title="${escapeHtml(req.reason)}"`}>${req.ok?`Открыть: ${escapeHtml(selected.name)}`:escapeHtml(req.reason)}</button></section></section>`;
  }
  refreshContractOffers(game);
  const section=ui.businessSection||'overview';
  const nav=sectionNav([
    ['overview','Обзор'],['clients','Клиенты'],['employees','Команда'],['departments','Отделы'],
    ['automation','Автоматизация'],['contracts','Контракты'],['warranties','Гарантии'],['market','Рынок'],['city','Город'],['legacy','Итог']
  ],section,'business');
  let body='';
  if(section==='overview'){
    const finance=game.finance.history[0]||{income:0,expenses:0,profit:0};
    const spec=advancedSpecialization(game);
    const chapter=chapterStatus(game);
    const stage=businessStage(game);
    const stageCheck=businessStageRequirement(game);
    const capacity=companyCapacity(game);
    const nextStage=stageCheck.next;
    body=`<section class="panel business-stage-card"><div class="section-title"><div><p class="eyebrow">ЭТАП КОМПАНИИ ${stage?.id||1}/${BUSINESS_STAGES_V165.length}</p><h2>${escapeHtml(stage?.name||'Работа на дому')}</h2></div><span>STAGE</span></div><p>${escapeHtml(stage?.desc||'Начальный этап собственной практики.')}</p><div class="business-capacity"><span><b>Сотрудники</b>${game.business.employees.length}/${capacity.employees}</span><span><b>Контракты</b>${game.business.contracts.length}/${capacity.contracts}</span><span><b>Офис в месяц</b>${formatMoney(Math.round(Number(stage?.monthlyCost||0)*getInflation(game)))}</span><span><b>Потрачено на офис</b>${formatMoney(game.business.officeExpenses||0)}</span></div>${nextStage?`<div class="next-business-stage"><div><strong>Следующий этап: ${escapeHtml(nextStage.name)}</strong><small>Уровень ${nextStage.reqLevel} · репутация компании ${nextStage.reqCompanyRep} · ${formatMoney(Math.round(Number(nextStage.upgradeCost||0)*getInflation(game)))}</small></div><button class="button primary small" data-action="upgrade-business-stage" ${stageCheck.ok?'':`disabled title="${escapeHtml(stageCheck.reason)}"`}>${stageCheck.ok?'Расширить':escapeHtml(stageCheck.reason)}</button></div>`:`<div class="max-stage">Достигнут максимальный этап компании</div>`}</section>
    <div class="metrics-grid">${stat('Репутация компании',Math.round(game.business.companyReputation),'REP')}${stat('Доля рынка',`${Math.round(game.business.marketShare)}%`,'SHARE')}${stat('Качество',`${Math.round(game.business.qualityScore)}%`,'QLT')}${stat('Отделы',game.business.departments.length,'DEP')}</div>
    <section class="panel content-card"><div class="section-title"><div><p class="eyebrow">ПОСЛЕДНИЙ МЕСЯЦ</p><h3>Денежный поток</h3></div><b class="${finance.profit<0?'danger-text':''}">${formatMoney(finance.profit)}</b></div><div class="cashflow"><div><span>Доход</span><strong>${formatMoney(finance.income)}</strong></div><div><span>Расход</span><strong>${formatMoney(finance.expenses)}</strong></div><div><span>Реклама</span><strong>${formatMoney(game.marketing.analytics.spend)}</strong></div><div><span>Контракты</span><strong>${game.business.contracts.length}</strong></div></div></section>
    <section class="panel content-card"><div class="section-title"><div><p class="eyebrow">ГЛАВА КАМПАНИИ</p><h3>${escapeHtml(chapter.title)}</h3></div><span>${chapter.completed}/${chapter.total}</span></div>${progress(chapter.completed,chapter.total,'accent')}<div class="chapter-goals">${chapter.goals.map(goal=>`<div class="${goal.value>=goal.target?'done':''}"><span>${goal.value>=goal.target?'':'○'}</span><b>${escapeHtml(goal.title)}</b><small>${Math.min(goal.target,Math.round(goal.value))}/${goal.target}</small></div>`).join('')}</div></section>
    <section class="panel content-card company-identity"><p class="eyebrow">ВАША КОМПАНИЯ</p><div class="company-identity-head">${businessTypeIconMarkup(game.business.typeId, businessTypeById(game.business.typeId).name, businessStage(game)?.id || 1, 'company-identity-icon')}<div><h2>${escapeHtml(game.business.name||'Компьютерный сервис')}</h2><p><strong>${escapeHtml(businessTypeById(game.business.typeId).name)}</strong> · ${escapeHtml(businessTypeById(game.business.typeId).desc)}</p></div></div><small>Клиенты: ${escapeHtml(businessTypeById(game.business.typeId).clients)} · сотрудников ${game.business.employees.length} · репутация ${Math.round(game.business.companyReputation||0)}</small></section><section class="panel content-card"><div class="section-title"><div><p class="eyebrow">СПЕЦИАЛИЗАЦИЯ</p><h3>${spec?spec.name:'Направление ещё не выбрано'}</h3></div></div>${spec?`<p>${spec.desc}</p>`:`<div class="specialization-grid">${ADVANCED_SPECIALIZATIONS_V08.map(item=>`<button data-action="select-advanced-specialization" data-id="${item.id}" ${game.player.level<item.reqLevel?'disabled':''}><b>IT</b><strong>${escapeHtml(item.name)}</strong><small>${item.desc} · ур. ${item.reqLevel}</small></button>`).join('')}</div>`}</section>
    <section class="panel content-card"><div class="section-title"><div><p class="eyebrow">ЗАГРУЗКА МАСТЕРСКОЙ</p><h3>Рабочие места</h3></div></div><div class="workstation-grid">${workstationStatusV180(game).map(row=>`<article><strong>${escapeHtml(row.name)}</strong><span>${row.used}/${row.capacity}</span><small>Свободно ${row.free}</small>${progress(row.used,Math.max(1,row.capacity),row.free?'accent':'danger')}</article>`).join('')}</div></section>
    <section class="panel content-card"><div class="section-title"><div><p class="eyebrow">РЕПУТАЦИЯ ПО НАПРАВЛЕНИЯМ</p><h3>Профиль мастерской</h3></div></div><div class="reputation-skill-grid">${reputationRowsV180(game).map(row=>`<article>${skillIconMarkup(row.id,row.name)}<div><strong>${escapeHtml(row.name)}</strong>${progress(row.value,Math.max(20,row.value),'positive')}</div><b>${Math.round(row.value)}</b></article>`).join('')}</div></section>`;
  }else if(section==='clients'){
    const clients=Object.values(game.clients.records).sort((a,b)=>(b.trust||0)-(a.trust||0));
    const reviews=(game.orders.reviews||[]).slice(0,15);
    const average=reviews.length?reviews.reduce((sum,item)=>sum+item.stars,0)/reviews.length:0;
    body=`<section class="panel content-card"><div class="section-title"><div><p class="eyebrow">БАЗА КЛИЕНТОВ</p><h3>${clients.length} контактов</h3></div><span>Повторных ${game.clients.repeatOrders}</span></div><div class="client-list">${clients.length?clients.map(c=>`<article><span>${c.icon||'CL'}</span><div><strong>${escapeHtml(c.name)}</strong><small>${escapeHtml(c.tierName||c.tierId)} · заказов ${c.orders||0} · доверие ${Math.round(c.trust||0)}% · средняя оценка ${Number(c.averageRating||0).toFixed(1)} · предпочитает ${escapeHtml(c.preference||'standard')}</small>${progress(c.trust||0,100,'positive')}</div></article>`).join(''):emptyState('CL','Пока нет постоянных клиентов','Качественные заказы создают доверие и рекомендации.')}</div></section>
    <section class="panel content-card"><div class="section-title"><div><p class="eyebrow">ОТЗЫВЫ</p><h3>${average?average.toFixed(1):'—'} из 5</h3></div><span>${reviews.length} последних</span></div><div class="review-list">${reviews.length?reviews.map(review=>`<article><div><b>${escapeHtml(review.clientName)}</b><span>${review.stars}/5</span></div><p>${escapeHtml(review.text)}</p></article>`).join(''):emptyState('','Отзывов пока нет','Проведите ремонт и обязательное тестирование.')}</div></section>`;
  }else if(section==='employees'){
    const capacity=companyCapacity(game);
    const stage=businessStage(game);
    body=`<section class="panel team-capacity-note"><div><p class="eyebrow">ШТАТ КОМПАНИИ</p><h3>${game.business.employees.length}/${capacity.employees} сотрудников</h3><p>${escapeHtml(stage?.name||'Работа на дому')} определяет максимальный размер команды.</p></div><button class="button secondary small" data-action="business-section" data-value="overview">Этап компании</button></section><h3 class="subheading">Кандидаты</h3><div class="employee-list">${EMPLOYEE_POOL_V161.filter(t=>!t.businessTypes?.length||t.businessTypes.includes(game.business.typeId)).map(t=>`<article class="panel"><span>EMP</span><div><h3>${escapeHtml(t.name)}</h3><p>${t.desc}</p><small>${formatMoney(t.salary)}/мес. · нужен ур. ${t.reqLevel}</small></div><button class="button primary small" data-action="hire-employee" data-id="${t.id}" ${game.player.level<t.reqLevel?'disabled':''}>Нанять</button></article>`).join('')}</div>
    <h3 class="subheading">Команда</h3><div class="employee-list">${game.business.employees.length?game.business.employees.map(emp=>{const tmpl=employeeTemplate(emp.templateId);const trait=employeeTrait(emp.traitId);const options=game.orders.active.filter(o=>o.status==='working'&&!o.assignedEmployeeId).slice(0,3);const skills=employeeSkillSummary(emp).slice(0,4);return `<article class="panel employee-detailed"><span>${tmpl?.icon||'EMP'}</span><div><h3>${escapeHtml(emp.name)}</h3><p>${escapeHtml(trait.name)} · роль ${escapeHtml(employeeRoleV180(emp).name)} · уровень ${Number(emp.level||1).toFixed(1)} · мотивация ${Math.round(emp.morale||0)}% · усталость ${Math.round(emp.fatigue||0)}%</p><small>${trait.desc}</small><div class="employee-role-row">${EMPLOYEE_ROLES_V180.map(role=>`<button class="${employeeRoleV180(emp).id===role.id?'active':''}" data-action="set-employee-role" data-id="${emp.id}" data-value="${role.id}" ${emp.currentOrderUid?'disabled':''}>${escapeHtml(role.name)}</button>`).join('')}</div><div class="employee-skill-chips">${skills.map(row=>chip(`${skillMeta[row.id]?.name||row.id} ${row.value}`,'ok')).join('')}</div><div class="employee-stats"><span>Заказов ${emp.completedOrders||0}</span><span>Ошибок ${emp.errors||0}</span><span>Обучений ${emp.training||0}</span><span>Зарплата ${formatMoney(emp.salary||0)}</span></div>${emp.currentOrderUid?`<small>Занят текущим заказом</small>`:`<div class="assign-row">${options.map(o=>`<button data-action="assign-employee" data-id="${emp.id}" data-order="${o.uid}">${escapeHtml(o.name)}</button>`).join('')||'<small>Нет запущенных заказов для делегирования</small>'}</div>`}</div><div class="employee-actions"><button class="button secondary small" data-action="open-employee-training" data-id="${emp.id}">Программы обучения</button><button class="button danger small" data-action="fire-employee" data-id="${emp.id}">Уволить</button></div></article>`}).join(''):emptyState('EMP','Команда не собрана','Начните с ученика и постепенно создайте полноценный сервис.')}</div>`;
  }else if(section==='departments'){
    body=`<div class="department-grid">${DEPARTMENTS_V13.map(department=>{const owned=hasDepartment(game,department.id);const req=departmentRequirement(game,department);return `<article class="panel department-card ${owned?'owned':''}"><div class="department-icon">${escapeHtml(department.id.slice(0,3).toUpperCase())}</div><div><h3>${department.name}</h3><p>${department.desc}</p><small>Открытие ${formatMoney(Math.round(Number(department.cost||0)*getInflation(game)))} · содержание ${formatMoney(Math.round(Number(department.monthly||0)*getInflation(game)))}/мес.</small></div>${owned?chip('Открыт','ok'):`<button class="button primary small" data-action="open-department" data-id="${department.id}" ${req.ok?'':'disabled'}>${req.ok?'Открыть':escapeHtml(req.reason)}</button>`}</article>`}).join('')}</div>`;
  }else if(section==='automation'){
    const restockIds=Object.keys(game.market.restockRules||{});
    body=`<section class="panel content-card"><div class="section-title"><div><p class="eyebrow">ПРАВИЛА</p><h3>Автоматизация сервиса</h3></div><span>${Object.values(game.business.automation).filter(Boolean).length} включено</span></div><div class="automation-list">${AUTOMATION_RULES_V13.map(rule=>{const available=!rule.department||hasDepartment(game,rule.department);const active=Boolean(game.business.automation[rule.id]);return `<button class="automation-row ${active?'active':''}" data-action="toggle-automation" data-id="${rule.id}" ${available?'':'disabled'}><span>AUTO</span><div><strong>${escapeHtml(rule.name)}</strong><small>${available?rule.desc:`Нужен отдел «${departmentById(rule.department)?.name}»`}</small></div><b>${active?'ВКЛ':'ВЫКЛ'}</b></button>`}).join('')}</div></section>
    <section class="panel content-card"><div class="section-title"><div><p class="eyebrow">СКЛАД</p><h3>Минимальные остатки</h3></div></div><div class="restock-grid">${restockIds.map(id=>{const c=componentMeta[id];if(!c)return'';return `<label><span>${componentArt(c)}<b>${escapeHtml(c.name)}</b></span><input id="restock_${id}" type="number" min="0" max="20" value="${game.market.restockRules[id]}"><button data-action="set-restock" data-id="${id}">Сохранить</button></label>`}).join('')}</div></section>`;
  }else if(section==='contracts'){
    const capacity=companyCapacity(game);
    const stage=businessStage(game);
    body=`<section class="panel contract-capacity-card"><div><p class="eyebrow">КОРПОРАТИВНЫЕ ДОГОВОРЫ</p><h3>${game.business.contracts.length}/${capacity.contracts} активных</h3><p>${capacity.contracts?`Этап «${escapeHtml(stage.name)}» разрешает долгосрочное обслуживание компаний.`:'Первые корпоративные контракты откроются после расширения домашней мастерской.'}</p></div></section><h3 class="subheading">Предложения</h3><div class="contract-list">${game.business.contractOffers.length?game.business.contractOffers.map(t=>`<article class="panel"><span>EMP</span><div><h3>${escapeHtml(t.name)}</h3><p>${t.desc}</p><small>${formatMoney(t.monthly)}/мес. · ${t.months} мес. · реп. ${t.minRep}</small></div><button class="button primary small" data-action="sign-contract" data-id="${t.id}">Подписать</button></article>`).join(''):emptyState('CTR','Новых предложений нет','Повышайте репутацию и навыки.')}</div><h3 class="subheading">Активные контракты</h3><div class="contract-list">${game.business.contracts.length?game.business.contracts.map(c=>`<article class="panel"><span>CTR</span><div><h3>${escapeHtml(c.name)}</h3><p>${formatMoney(c.monthly)}/мес. · осталось ${c.monthsLeft} мес. · сбоев ${c.failures}</p></div><button class="button danger small" data-action="cancel-contract" data-id="${c.id}">Расторгнуть</button></article>`).join(''):emptyState('CTR','Контрактов нет','Регулярные контракты дают стабильный доход и обязательства.')}</div>`;
  }else if(section==='warranties'){
    ensureV180(game);
    const active=game.v18.warranties.active||[];
    const claims=game.v18.warranties.claims||[];
    const history=game.v18.warranties.history||[];
    body=`<div class="metrics-grid">${stat('Активно',active.length,'GAR')}${stat('Возвратов',claims.length,'RET')}${stat('Завершено',history.length,'HIS')}${stat('Риск режима',`${Math.round((DIFFICULTY_MODES_V180.find(m=>m.id===game.mode.difficultyId)?.warrantyRisk||1)*100)}%`,'RISK')}</div>
    <section class="panel content-card"><div class="section-title"><div><p class="eyebrow">ДЕЙСТВУЮЩИЕ ГАРАНТИИ</p><h3>${active.length} заказов под наблюдением</h3></div></div><div class="warranty-list">${active.length?active.map(item=>`<article><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.client?.name||'Клиент')} · осталось ${Math.max(0,Number(item.expiresDay||0)-Number(game.calendar.totalDays||0))} дн. · риск ${Math.round(Number(item.risk||0)*100)}%</small></div></article>`).join(''):emptyState('GAR','Активных гарантий нет','После успешного ремонта заказ появится в гарантийном списке.')}</div></section>
    <section class="panel content-card"><div class="section-title"><div><p class="eyebrow">ГАРАНТИЙНЫЕ ВОЗВРАТЫ</p><h3>${claims.length} обращений</h3></div></div><div class="warranty-list">${claims.slice(0,20).map(item=>`<article><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.client?.name||'Клиент')} · возврат зарегистрирован</small></div></article>`).join('')||'<p class="muted">Возвратов пока нет.</p>'}</div></section>`;
  }else if(section==='market'){
    const total=Math.max(1,game.business.marketShare+game.business.competitors.reduce((sum,c)=>sum+c.share,0));
    const multipliers=Object.entries(game.market.categoryMultipliers||{});
    body=`${game.market.activeEvent?`<section class="market-event-card panel"><p class="eyebrow">РЫНОЧНОЕ СОБЫТИЕ</p>${MARKET_EVENT_ASSETS_V171[game.market.activeEvent.id] ? `<img class="market-event-illustration" src="${MARKET_EVENT_ASSETS_V171[game.market.activeEvent.id]}" alt="${escapeHtml(game.market.activeEvent.name)}" loading="lazy">` : ''}<h3>${escapeHtml(game.market.activeEvent.name)}</h3><p>${escapeHtml(game.market.activeEvent.desc)}</p><strong>Осталось ${game.market.activeEvent.monthsLeft} мес.</strong></section>`:''}
    <section class="panel content-card"><div class="section-title"><div><p class="eyebrow">ЦЕНЫ</p><h3>Индекс рынка ${(game.market.priceIndex*100).toFixed(0)}%</h3></div></div><div class="market-multipliers">${multipliers.length?multipliers.map(([cat,mult])=>`<span><b>${cat.toUpperCase()}</b><strong>×${Number(mult).toFixed(2)}</strong></span>`).join(''):'<p class="muted">Рынок стабилен. Категорийных скачков цен нет.</p>'}</div></section>
    <section class="panel content-card"><div class="section-title"><div><p class="eyebrow">КОНКУРЕНЦИЯ</p><h3>Рынок сервисных услуг</h3></div><span>${Math.round(game.business.marketShare)}%</span></div><div class="market-list"><article><strong>Ваша мастерская</strong><div>${progress(game.business.marketShare,total,'positive')}</div><b>${Math.round(game.business.marketShare)}%</b></article>${game.business.competitors.map(c=>`<article><strong>${escapeHtml(c.name)}</strong><small>${c.style}</small><div>${progress(c.share,total)}</div><b>${Math.round(c.share)}%</b></article>`).join('')}</div></section>`;
  }else if(section==='city'){
    body=`<section class="city-map panel"><div class="city-road"></div>${CITY_POINTS_V08.map((p,i)=>`<button class="city-point p${i+1} ${game.business.cityLocation===p.id?'active':''}" data-action="visit-city" data-id="${p.id}"><b>${escapeHtml(p.id.slice(0,3).toUpperCase())}</b><strong>${escapeHtml(p.name)}</strong><small>${p.energy?`−${p.energy} энергии`:'дом'}</small></button>`).join('')}</section><div class="city-description">${CITY_POINTS_V08.map(p=>`<article class="panel"><h3>${p.name}</h3><p>${p.desc}</p><strong>${p.bonus}</strong></article>`).join('')}</div>`;
  }else{
    const summary=endingSummary(game);
    const status=challengeStatusV13(game);
    body=`<section class="ending-card panel"><p class="eyebrow">РЕЖИМ · ${gameModeById(game.mode.id).name}</p><h2>${game.campaign?.finished||game.mode.completed?summary.ending.title:'Карьера продолжается'}</h2><strong>${summary.score.toLocaleString('ru-RU')} очков карьеры</strong><p>Заказы: ${game.stats.ordersDone} · капитал: ${formatMoney(game.player.cash)} · команда: ${game.business.employees.length} · клиентов: ${Object.keys(game.clients.records).length}</p>${game.mode.id==='challenge'?`<div class="challenge-status"><b>${status.challenge.name}</b><span>${status.challenge.desc}</span><strong>${status.completed?'Выполнено':`${Math.round(status.progress)}/${status.target}`}</strong></div>`:''}${game.campaign?.finished||game.mode.completed?`<button class="button primary full" data-action="new-career-plus">Начать Новую карьеру+</button><small>Следующая карьера сохранит купленные улучшения наследия.</small>`:''}</section>
    <section class="panel content-card"><div class="section-title"><div><p class="eyebrow">НАСЛЕДИЕ</p><h3>${game.legacy.points||0} очков</h3></div><span>Карьер ${game.legacy.careers||0}</span></div><div class="legacy-grid">${LEGACY_REWARDS_V13.map(item=>{const level=Number(game.replay.legacyUpgrades[item.id]||0);return `<article><span>LEG</span><div><b>${escapeHtml(item.name)} ${level}/${item.max}</b><small>${item.desc}</small></div><button data-action="buy-legacy" data-id="${item.id}" ${level>=item.max||game.legacy.points<item.cost?'disabled':''}>${level>=item.max?'МАКС':`${item.cost} очк.`}</button></article>`}).join('')}</div></section>
    <section class="panel content-card"><div class="section-title"><div><p class="eyebrow">ИСПЫТАНИЯ</p><h3>Отдельные способы прохождения</h3></div></div><div class="challenge-catalog">${CHALLENGES_V13.map(item=>`<article><b>${item.name}</b><span>${item.desc}</span><small>Награда: ${item.reward}</small></article>`).join('')}</div></section>`;
  }
  return `<div class="subpage-head"><button class="icon-btn" data-action="more-home">←</button><div>${pageHeader('УПРАВЛЕНИЕ','Бизнес и город','Клиенты, команда, отделы, автоматизация и карьера')}</div></div>${nav}${body}`;
}

function renderMore(game, ui) {
  const page = ui.morePage;
  const content = page === 'home' ? renderMoreHome(game)
    : page === 'notifications' ? renderNotifications(game,ui)
    : page === 'hero' ? renderHeroHub(game,ui)
    : page === 'development' ? renderHeroHub(game,{...ui,heroSection:'development'})
    : page === 'finance' ? renderFinanceReport(game,ui)
    : page === 'jobs' ? renderHeroHub(game,{...ui,heroSection:'jobs'})
    : page === 'skills' ? renderHeroHub(game,{...ui,heroSection:'skills'})
    : page === 'property' ? renderProperty(game)
    : page === 'bank' ? renderBank(game)
    : page === 'business' ? renderBusiness(game,ui)
    : page === 'advertising' ? renderAdvertising(game,ui)
    : page === 'workshop' ? renderWorkshop(game,ui)
    : page === 'flea' ? renderFleaPage(game)
    : page === 'rest' ? renderRest(game)
    : page === 'achievements' ? renderAchievements(game)
    : page === 'log' ? renderLog(game,ui)
    : renderSettings(game, ui);
  return `<section class="screen">${content}</section>`;
}

function renderModal(game, ui) {
  if (!ui.modal) return '';
  if (ui.modal.type === 'quote') {
    const order=orderByUid(game,ui.modal.orderUid);
    if(!order)return '';
    const options=quoteOptionsV180(game,order);
    return `<div class="modal-backdrop"><section class="dialog panel quote-dialog" data-modal-stop><div class="section-title"><div><p class="eyebrow">СМЕТА И СОГЛАСОВАНИЕ</p><h3>${escapeHtml(order.name)}</h3></div><button class="icon-btn" data-action="close-modal">×</button></div><p class="muted">Клиент оценивает цену, доверие и вашу способность объяснить решение. От выбранной сметы зависят прибыль, качество и гарантийный риск.</p><div class="quote-options">${options.map(option=>`<button data-action="propose-quote" data-id="${order.uid}" data-value="${option.id}"><strong>${escapeHtml(option.name)}</strong><b>${formatMoney(option.price)}</b><small>${escapeHtml(option.desc)}</small><span>Материалы ${formatMoney(option.materialBudget)} · согласие ${Math.round(option.acceptance*100)}% · качество ${option.quality>=0?'+':''}${Math.round(option.quality*100)}% · риск ${option.warrantyRisk>=0?'+':''}${Math.round(option.warrantyRisk*100)}%</span></button>`).join('')}</div></section></div>`;
  }
  if (ui.modal.type === 'pc-parts') {
    const slot = PC_SLOTS.find((item) => item.id === ui.modal.slot);
    const parts = compatiblePartsForSlot(game, ui.modal.slot);
    return `<div class="modal-backdrop" data-action="close-modal"><section class="bottom-sheet panel" data-modal-stop><div class="sheet-handle"></div><div class="section-title"><div><p class="eyebrow">СБОРКА ПК</p><h3>${slot?.name || 'Компонент'}</h3></div><button class="icon-btn" data-action="close-modal">×</button></div>${parts.length ? `<div class="part-picker">${parts.map((part) => `<button data-action="install-pc-part" data-slot="${ui.modal.slot}" data-id="${part.id}"><span>${componentArt(part)}</span><div><strong>${escapeHtml(part.name)}</strong><small>${part.socket || part.mbSocket || part.ramType || `ур. ${part.tier}`}</small></div><b>×${game.inventory[part.id]}</b></button>`).join('')}</div>` : emptyState('BOX', 'Подходящих деталей нет', 'Купите компонент нужной категории в магазине.')}</section></div>`;
  }
  if (ui.modal.type === 'tutorial') {
    const steps = [
      { target: '[data-tour="nav-orders"]', title: 'Шаг 1. Заказы', text: 'Здесь появляются заявки. Нажмите сюда, чтобы выбрать первую работу.', position: 'top' },
      { target: '[data-tour="order-card"]', title: 'Шаг 2. Карточка заявки', text: 'В карточке видны оплата, сроки, навыки и полный список нужных материалов.', position: 'bottom' },
      { target: '.hint-button, .resource-box', title: 'Шаг 3. Лампочка-помощник', text: 'Лампочка покажет, чего не хватает, соберёт корзину и проведёт в нужный раздел магазина.', position: 'bottom' },
      { target: '[data-tour="nav-rest"]', title: 'Шаг 4. Отдых', text: 'Здесь герой восстанавливает энергию. При низком заряде риск ошибок в заказах растёт.', position: 'top' },
      { target: '[data-tour="nav-more"]', title: 'Шаг 5. Мастерская в разделе «Ещё»', text: 'Магазин, склад, собственный ПК и улучшения теперь находятся в разделе «Ещё».', position: 'top' },
      { target: '[data-tour="nav-education"]', title: 'Шаг 6. Учёба', text: 'Книги и быстрые материалы изучаются моментально. Полученные знания расходуются при выполнении заказов.', position: 'top' },
      { target: '[data-tour="nav-more"]', title: 'Шаг 7. Раздел «Ещё»', text: 'Здесь находятся развитие героя, финансы, работа, имущество, бизнес и сохранение.', position: 'top' },
      { target: '.more-menu', title: 'Шаг 8. Прозрачный прогресс', text: 'Откройте «Развитие героя», чтобы увидеть источники каждого навыка и профессиональный опыт.', position: 'bottom' },
      { target: '.more-menu', title: 'Шаг 9. Финансовый контроль', text: 'Месячный отчёт показывает зарплату, заказы, рекламу, офис, сотрудников и банковские операции.', position: 'bottom' }
    ];
    const step = Math.max(0, Math.min(steps.length - 1, Number(ui.modal.step || 0)));
    const item = steps[step];
    return `<div class="coach-layer" data-coach-target="${escapeHtml(item.target)}" data-coach-position="${item.position}"><div class="coach-spotlight"></div><section class="coach-card panel"><div class="tutorial-top"><span>${step + 1}/${steps.length}</span><button class="icon-btn" data-action="tutorial-skip">×</button></div><p class="eyebrow">ИНТЕРАКТИВНОЕ ОБУЧЕНИЕ</p><h2>${item.title}</h2><p>${item.text}</p><div class="tutorial-progress">${steps.map((_, index) => `<i class="${index <= step ? 'active' : ''}"></i>`).join('')}</div><div class="button-row"><button class="button ghost" data-action="tutorial-skip">Пропустить</button><button class="button primary" data-action="tutorial-next" data-step="${step}">${step === steps.length - 1 ? 'Закончить' : 'Показать дальше'}</button></div></section></div>`;
  }
  if (ui.modal.type === 'refresh-orders-confirm') {
    return `<div class="modal-backdrop"><section class="dialog panel refresh-confirm-dialog" data-modal-stop><p class="eyebrow">ОТКАЗ ОТ ТЕКУЩИХ ЗАЯВОК</p><h3>Обновить весь список?</h3><p>Будут отклонены ${game.orders.available.length} заявок. Клиенты запомнят отказ.</p><div class="decision-impact"><span><b>Репутация</b>−1</span><span><b>Время</b>6 часов</span><span><b>Повтор</b>через 24 часа</span></div><div class="button-row"><button class="button ghost" data-action="close-modal">Оставить заявки</button><button class="button danger" data-action="confirm-refresh-orders">Обновить</button></div></section></div>`;
  }
  if (ui.modal.type === 'capacity-help') {
    return `<div class="modal-backdrop"><section class="dialog panel capacity-dialog" data-modal-stop>
      <div class="section-title"><div><p class="eyebrow">РАБОЧАЯ ОЧЕРЕДЬ</p><h3>Все места заняты</h3></div><button class="icon-btn" data-action="close-modal">×</button></div>
      <div class="capacity-visual"><span>${game.orders.active.length}</span><b>/</b><span>${maxActiveOrders(game)}</span></div>
      <p>${escapeHtml(ui.modal.message || 'Завершите один из активных заказов.')}</p>
      <div class="capacity-tips"><div>1. Откройте вкладку «В работе».</div><div>2. Проведите диагностику и завершите заказ.</div><div>3. Переезд в лучшее помещение увеличит лимит.</div></div>
      <button class="button primary full" data-action="close-modal">Понятно</button>
    </section></div>`;
  }
  if (ui.modal.type === 'materials-help') {
    const order = orderByUid(game, ui.modal.orderUid);
    if (!order) return '';
    const details = orderItemDetails(game, order);
    const missing = details.filter((item) => item.missing > 0);
    const total = orderCartTotal(game, order);
    return `<div class="modal-backdrop"><section class="dialog panel materials-dialog" data-modal-stop><div class="section-title"><div><p class="eyebrow">ПОМОЩНИК ЗАКУПКИ</p><h3>${escapeHtml(order.name)}</h3></div><button class="icon-btn" data-action="close-modal">×</button></div><p class="muted">Все ресурсы для заказа собраны в одном месте. Инструменты останутся на складе, расходники будут списаны.</p><div class="cart-list">${details.map((item) => `<article class="cart-row ${item.missing ? 'missing' : 'ready'}"><span>${componentArt(item.component)}</span><div><strong>${escapeHtml(item.component.name)}</strong><small>${item.component.cat.toUpperCase()} · на складе ${item.owned}</small></div><b>${item.missing ? `докупить ${item.missing}` : 'готово'}</b></article>`).join('')}</div><div class="cart-total"><span>Корзина</span><strong>${missing.length ? formatMoney(total) : 'Всё куплено'}</strong></div><div class="button-row"><button class="button secondary" data-action="open-order-shop" data-id="${order.uid}" ${missing.length ? '' : 'disabled'}>Показать в магазине</button><button class="button primary" data-action="buy-order-cart" data-id="${order.uid}" ${missing.length ? '' : 'disabled'}>Купить всё</button></div></section></div>`;
  }
  if (ui.modal.type === 'energy-warning') {
    const energy = Math.max(0, Math.round(Number(game.player?.energy || 0)));
    return `<div class="modal-backdrop"><section class="dialog panel energy-warning-dialog" data-modal-stop><p class="eyebrow">НИЗКИЙ ЗАРЯД СИЛ</p><div class="dialog-hero-icon">${imageIcon(ORDER_ACTION_ASSETS_V183.lowEnergy,'Низкий заряд сил','dialog-hero-image')}</div><h3>Энергия подходит к концу</h3><p>У героя осталось <strong>${energy}%</strong> энергии. При усталости работа идёт медленнее, а вероятность ошибок повышается.</p><div class="energy-warning-meter"><i style="width:${energy}%"></i></div><div class="button-row"><button class="button ghost" data-action="close-modal">Продолжить</button><button class="button primary" data-action="energy-go-rest">Перейти к отдыху</button></div></section></div>`;
  }
  if (ui.modal.type === 'idle-reminder') {
    return `<div class="modal-backdrop"><section class="dialog panel idle-dialog" data-modal-stop><p class="eyebrow">7 ДНЕЙ БЕЗ ДЕЛА</p><h3>Хорош бездельничать</h3><p class="muted">У героя нет запущенных заказов и активного обучения. Календарь продолжает идти, поэтому пора выбрать занятие.</p><div class="activity-choice-grid"><button data-action="idle-go-orders"><span>WORK</span><strong>Найти работу</strong><small>Открыть доступные заявки</small></button><button data-action="idle-go-study"><span>EDU</span><strong>Начать учёбу</strong><small>Курсы, лекции, языки и университет</small></button></div><button class="button ghost full" data-action="idle-dismiss">Пока оставить свободное время</button></section></div>`;
  }
  if (ui.modal.type === 'diagnosis') {
    const order=orderByUid(game,ui.modal.orderUid); if(!order)return '';
    const diagnostic=order.diagnosticCase;
    return `<div class="modal-backdrop"><section class="dialog panel diagnosis-dialog" data-modal-stop><div class="section-title"><div><p class="eyebrow">ИНТЕРАКТИВНАЯ ДИАГНОСТИКА</p><h3>${escapeHtml(diagnostic?.title||order.name)}</h3></div><button class="icon-btn" data-action="close-modal">×</button></div><div class="diagnostic-story"><b>Рассказ клиента</b><p>${escapeHtml(diagnostic?.story||order.description)}</p></div><div class="diagnostic-facts"><div><b>Симптомы</b><p>${escapeHtml(diagnostic?.symptoms||diagnostic?.clue||'Требуется уточнение')}</p></div><div><b>Что уже известно</b><p>${escapeHtml(diagnostic?.evidence||'Дополнительных измерений пока нет')}</p></div></div><p class="diagnostic-question">Какое действие должно быть первым?</p><div class="diagnostic-choices">${(diagnostic?.choices||[]).map((choice,index)=>`<button data-action="diagnosis-choice" data-id="${order.uid}" data-value="${choice.id}"><span>${index+1}</span><strong>${escapeHtml(choice.label)}</strong></button>`).join('')}</div><p class="muted">Все варианты правдоподобны, но порядок действий влияет на срок, прибыль, риск возврата и отзыв.</p></section></div>`;
  }
  if (ui.modal.type === 'repair-approach') {
    const order=orderByUid(game,ui.modal.orderUid); if(!order)return '';
    return `<div class="modal-backdrop"><section class="dialog panel repair-approach-dialog" data-modal-stop><div class="section-title"><div><p class="eyebrow">РЕШЕНИЕ</p><h3>${escapeHtml(order.name)}</h3></div><button class="icon-btn" data-action="close-modal">×</button></div><div class="dialog-hero-icon">${imageIcon(ORDER_ACTION_ASSETS_V183.repair,'Выбор стратегии ремонта','dialog-hero-image')}</div><p class="muted">Выберите стратегию ремонта. Она изменит срок, качество, расходы и риск гарантийного возврата.</p><div class="approach-grid">${REPAIR_APPROACHES_V13.map(item=>`<button data-action="choose-repair-approach" data-id="${order.uid}" data-value="${item.id}"><span>${escapeHtml(item.id.slice(0,4).toUpperCase())}</span><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.desc)}</small><em>Скорость ×${item.speed} · качество ${item.quality>=0?'+':''}${Math.round(item.quality*100)}% · ${item.id==='economy'?'высокий риск повторной поломки':item.id==='balanced'?'обычный риск':item.id==='careful'?'низкий риск':'минимальный риск'}</em></div></button>`).join('')}</div></section></div>`;
  }
  if (ui.modal.type === 'order-test') {
    const order=orderByUid(game,ui.modal.orderUid); if(!order)return '';
    return `<div class="modal-backdrop"><section class="dialog panel order-test-dialog" data-modal-stop><div class="section-title"><div><p class="eyebrow">КОНТРОЛЬ КАЧЕСТВА</p><h3>${escapeHtml(order.name)}</h3></div><button class="icon-btn" data-action="close-modal">×</button></div><div class="dialog-hero-icon">${imageIcon(ORDER_ACTION_ASSETS_V183.quality,'Контроль качества','dialog-hero-image')}</div><p class="muted">Тестирование обязательно перед выдачей. Более полный протокол снижает риск возврата и улучшает отзыв.</p><div class="test-protocol-grid">${ORDER_TEST_PROTOCOLS_V13.map(item=>`<button data-action="run-order-test" data-id="${order.uid}" data-value="${item.id}"><span>${escapeHtml(item.id.slice(0,4).toUpperCase())}</span><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.desc)}</small><em>${item.energy} энергии · моментально · ${formatMoney(item.cost)}</em></div></button>`).join('')}</div></section></div>`;
  }
  if (ui.modal.type === 'employee-event') {
    const event=game.business?.activeEmployeeEvent; if(!event)return '';
    const employee=game.business.employees.find(item=>item.id===event.employeeId);
    const positiveValue=event.type==='mistake'?'support':'accept';
    const choices = employeeEventChoices(event, employee).map((item) => ({ ...item, value: item.value === 'accept' ? positiveValue : item.value }));
    const teamAsset = event.type === 'raise' ? TEAM_EVENT_ASSETS_V171.raise : event.type === 'training' ? TEAM_EVENT_ASSETS_V171.training : TEAM_EVENT_ASSETS_V171.mistake;
    return `<div class="modal-backdrop"><section class="dialog panel employee-event-dialog" data-modal-stop><p class="eyebrow">СОБЫТИЕ В КОМАНДЕ</p>${teamAsset ? `<img class="employee-event-illustration" src="${teamAsset}" alt="${escapeHtml(event.title)}" loading="lazy">` : ''}<h3>${escapeHtml(event.title)}</h3><p>${escapeHtml(event.text)}</p><small>${employee?`${escapeHtml(employee.name)} · мотивация ${Math.round(employee.morale)}% · зарплата ${formatMoney(employee.salary)}`:''}</small><div class="decision-choices">${choices.map((item)=>`<button data-action="resolve-employee-event" data-value="${item.value}"><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.desc)}</small></button>`).join('')}</div></section></div>`;
  }
  if (ui.modal.type === 'skill-help') {
    const meta = skillMeta[ui.modal.skillId];
    const guide = skillGuide(ui.modal.skillId);
    if (!meta) return '';
    return `<div class="modal-backdrop"><section class="dialog panel skill-help-dialog" data-modal-stop><div class="section-title"><div><p class="eyebrow">КАК ПРОКАЧАТЬ НАВЫК</p><h3>${skillIconMarkup(ui.modal.skillId,meta.name)}<span>${escapeHtml(meta.name)}</span></h3></div><button class="icon-btn" data-action="close-modal">×</button></div><p class="muted">${escapeHtml(guide.tip)}</p><div class="skill-help-steps">${guide.steps.map((step, index) => `<div><span>${index + 1}</span><p>${escapeHtml(step)}</p></div>`).join('')}</div></section></div>`;
  }
  if (ui.modal.type === 'import') {
    return `<div class="modal-backdrop"><section class="dialog panel import-dialog" data-modal-stop><div class="section-title"><div><p class="eyebrow">ИМПОРТ</p><h3>Вставьте сохранение</h3></div><button class="icon-btn" data-action="close-modal">×</button></div><p class="muted">Перед заменой текущего профиля автоматически создаётся резервная копия.</p><textarea id="importSaveText" placeholder="Вставьте JSON сохранения"></textarea><div class="button-row"><button class="button ghost" data-action="close-modal">Отмена</button><button class="button primary" data-action="import-save-confirm">Проверить и импортировать</button></div></section></div>`;
  }
  if (ui.modal.type === 'diagnostics') {
    const report=ui.modal.report||diagnosticReport(game);
    return `<div class="modal-backdrop"><section class="dialog panel diagnostic-dialog" data-modal-stop><div class="section-title"><div><p class="eyebrow">ДИАГНОСТИКА</p><h3>Состояние профиля</h3></div><button class="icon-btn" data-action="close-modal">×</button></div><div class="diagnostic-metrics"><span><b>Схема</b>${report.version}</span><span><b>Заказы</b>${report.counts.activeOrders}/${report.counts.availableOrders}</span><span><b>Команда</b>${report.counts.employees}</span><span><b>Отделы</b>${report.counts.departments}</span></div>${report.warnings.length?`<div class="diagnostic-warning"><b>Предупреждения</b>${report.warnings.map(item=>`<span>${escapeHtml(item)}</span>`).join('')}</div>`:'<div class="diagnostic-ok">Критических предупреждений нет.</div>'}<textarea readonly>${escapeHtml(JSON.stringify(report,null,2))}</textarea></section></div>`;
  }
  if (ui.modal.type === 'decision-event') {
    const active=game.world?.activeEvent; const event=DECISION_EVENTS_V08.find(item=>item.id===active?.eventId); if(!event)return '';
    const eventAsset = DECISION_EVENT_ASSETS_V171[event.id];
    return `<div class="modal-backdrop"><section class="dialog panel decision-dialog" data-modal-stop><p class="eyebrow">СОБЫТИЕ · ${formatDate(game.calendar)}</p>${eventAsset ? `<img class="decision-event-illustration" src="${eventAsset}" alt="${escapeHtml(event.title)}" loading="lazy">` : ''}<h3>${escapeHtml(event.title)}</h3><p>${escapeHtml(event.text)}</p><div class="decision-choices">${event.choices.map(choice=>{const available=decisionChoiceAvailable(game,choice);return `<button data-action="resolve-event" data-value="${choice.id}" ${available?'':'disabled'}><strong>${escapeHtml(choice.label)}</strong><small>${escapeHtml(decisionChoiceHint(game,choice))}</small></button>`;}).join('')}</div></section></div>`;
  }
  if (ui.modal.type === 'campaign-ending') {
    const summary=endingSummary(game);
    return `<div class="modal-backdrop"><section class="dialog panel campaign-ending-dialog" data-modal-stop><p class="eyebrow">ФИНАЛ · 2010 ГОД</p><h2>Десятилетие завершено</h2><p>Календарь основной кампании остановлен. Итог: ${game.stats.ordersDone} заказов, уровень ${game.player.level}, капитал ${formatMoney(game.player.cash)}, ${summary.score.toLocaleString('ru-RU')} очков карьеры.</p><div class="ending-choice-grid"><button data-action="new-career-plus"><strong>Новая игра+</strong><small>Вернуться в 2000-й с высоким стартовым уровнем, деньгами, автомобилем, гаражом и сильным ПК.</small></button><button data-action="continue-after-2010"><strong>Продолжить в 2010-м</strong><small>Календарь и новые эпохи заморожены; новости 2010 года идут по кругу, старые заказы продолжают приходить.</small></button></div></section></div>`;
  }
  if (ui.modal.type === 'exit-confirm') {
    return `<div class="modal-backdrop"><section class="dialog panel exit-dialog" data-modal-stop><p class="eyebrow">ВЫХОД ИЗ ИГРЫ</p><h3>Хотите ли вы закрыть игру?</h3><p class="muted">Текущий прогресс будет сохранён перед выходом.</p><div class="button-row"><button class="button ghost" data-action="cancel-exit">Остаться</button><button class="button danger" data-action="confirm-exit">Закрыть игру</button></div></section></div>`;
  }
  if (ui.modal.type === 'component-comparison') {
    const component=componentMeta[ui.modal.componentId];
    if(!component)return '';
    const quantity=Math.max(1,Number(ui.modal.qty||1));
    const price=componentPrice(game,component)*quantity;
    const currentId=Object.values(game.pc?.slots||{}).find(componentId=>componentMeta[componentId]?.cat===component.cat);
    const current=currentId?componentMeta[currentId]:null;
    const rows=[
      ['Категория',current?.cat?.toUpperCase()||'—',component.cat.toUpperCase()],
      ['Уровень',current?.tier||0,component.tier||0],
      ['Мощность ПК',current?.pcPower||0,component.pcPower||0],
      ['Энергопотребление',current?.tdp?`${current.tdp} Вт`:'—',component.tdp?`${component.tdp} Вт`:'—'],
      ['Совместимость',current?.socket||current?.ramType||'—',component.socket||component.ramType||'—']
    ];
    return `<div class="modal-backdrop"><section class="dialog panel comparison-dialog" data-modal-stop><div class="section-title"><div><p class="eyebrow">ПЕРЕД ПОКУПКОЙ</p><h3>Сравнение комплектующих</h3></div><button class="icon-btn" data-action="close-modal">×</button></div><div class="comparison-head"><div>${current?componentArt(current):'<span class="empty-comparison">—</span>'}<strong>${escapeHtml(current?.name||'Не установлено')}</strong><small>Текущий ПК</small></div><b>→</b><div>${componentArt(component)}<strong>${escapeHtml(component.name)}</strong><small>Покупка ×${quantity}</small></div></div><div class="comparison-table">${rows.map(([name,a,b])=>`<div><span>${name}</span><b>${escapeHtml(String(a))}</b><strong class="${Number(b)>Number(a)?'success-text':''}">${escapeHtml(String(b))}</strong></div>`).join('')}</div><div class="comparison-total"><span>На складе после покупки</span><b>${Number(game.inventory?.[component.id]||0)+quantity}</b><strong>${formatMoney(price)}</strong></div><div class="button-row"><button class="button ghost" data-action="close-modal">Отмена</button><button class="button primary" data-action="confirm-buy-item" data-id="${component.id}" data-qty="${quantity}" ${game.player.cash<price?'disabled':''}>${game.player.cash<price?'Не хватает денег':'Купить'}</button></div></section></div>`;
  }
  if (ui.modal.type === 'workspace-comparison') {
    const item = WORKSPACE_ITEMS.find((entry) => entry.id === ui.modal.itemId);
    if (!item) return '';
    const level = workspaceLevel(game, item.id);
    const next = workspaceNextTier(game, item.id);
    if (!next) return `<div class="modal-backdrop"><section class="dialog panel workspace-upgrade-v167" data-modal-stop><h3>${escapeHtml(item.name)}</h3><p>Установлен максимальный уровень.</p><button class="button primary full" data-action="close-modal">Понятно</button></section></div>`;
    const cost = Math.round(next.cost * getInflation(game));
    const nextBonus = workspaceBonusText(next.bonus || {});
    const locked = game.calendar.year < next.fromYear || game.player.level < next.reqLevel || game.player.cash < cost;
    return `<div class="modal-backdrop"><section class="dialog panel workspace-upgrade-v167" data-modal-stop><div class="section-title"><div><p class="eyebrow">СЛЕДУЮЩЕЕ УЛУЧШЕНИЕ</p><h3>${escapeHtml(item.name)}</h3></div><button class="icon-btn" data-action="close-modal">×</button></div><img class="workspace-next-image" src="${workspaceAsset(item.id, level + 1)}" alt="${escapeHtml(next.name)}"><div class="workspace-next-info"><strong>${escapeHtml(next.name)}</strong><span>уровень ${level + 1}</span><p>${escapeHtml(nextBonus)}</p></div><div class="comparison-requirements"><span>с ${next.fromYear} года</span><span>уровень героя ${next.reqLevel}</span><strong>${formatMoney(cost)}</strong></div><div class="button-row"><button class="button ghost" data-action="close-modal">Отмена</button><button class="button primary" data-action="confirm-buy-workspace" data-id="${item.id}" ${locked ? 'disabled' : ''}>Улучшить</button></div></section></div>`;
  }

if (ui.modal.type === 'employee-training') {
    ensureV165(game);
    const employee=game.business?.employees?.find(item=>item.id===ui.modal.employeeId);
    if(!employee)return '';
    return `<div class="modal-backdrop"><section class="dialog panel employee-training-dialog" data-modal-stop><div class="section-title"><div><p class="eyebrow">РАЗВИТИЕ СОТРУДНИКА</p><h3>${escapeHtml(employee.name)}</h3></div><button class="icon-btn" data-action="close-modal">×</button></div><img class="employee-event-illustration" src="./assets/ui-v171/education/employee_training.webp" alt="Обучение сотрудника" loading="lazy"><div class="employee-training-summary"><span><b>Уровень</b>${Number(employee.level||1).toFixed(1)}</span><span><b>Мотивация</b>${Math.round(employee.morale||0)}%</span><span><b>Обучений</b>${employee.training||0}</span><span><b>Зарплата</b>${formatMoney(employee.salary||0)}</span></div><div class="training-program-list">${EMPLOYEE_TRAINING_PROGRAMS_V165.map(program=>{const price=employeeTrainingPrice(employee,program,game);return `<article><span>EDU</span><div><strong>${escapeHtml(program.name)}</strong><small>${escapeHtml(program.desc)} · ${program.days} дн. · навыки +${program.skillGain}</small></div><button class="button primary small" data-action="train-employee-program" data-id="${employee.id}" data-value="${program.id}" ${game.player.cash<price?'disabled':''}>${formatMoney(price)}</button></article>`}).join('')}</div><p class="muted">Обучение занимает игровое время, повышает квалификацию, мотивацию и профильные навыки сотрудника.</p></section></div>`;
  }
  if (ui.modal.type === 'save-health') {
    const report=ui.modal.report||validateGameState(game,false);
    return `<div class="modal-backdrop"><section class="dialog panel save-health-dialog" data-modal-stop><div class="section-title"><div><p class="eyebrow">ПРОВЕРКА СОХРАНЕНИЯ</p><h3>${report.issues?.length?'Профиль восстановлен':'Профиль исправен'}</h3></div><button class="icon-btn" data-action="close-modal">×</button></div><div class="save-health-status ${report.issues?.length?'warning':'ok'}"><b>${report.issues?.length?`${report.issues.length} найдено · ${report.repairs?.length||0} исправлено`:'Ошибок структуры не найдено'}</b><small>Контрольная сумма: ${escapeHtml(report.checksum||'—')}</small></div>${report.issues?.length?`<div class="save-issue-list">${report.issues.map(item=>`<span>${escapeHtml(item)}</span>`).join('')}</div>`:''}<p class="muted">Проверены профиль, календарь, показатели героя, заказы, журнал, сотрудники, контракты и числовые значения.</p><button class="button primary full" data-action="close-modal">Готово</button></section></div>`;
  }
  if (ui.modal.type === 'release-readiness') {
    const report=ui.modal.report||releaseReadinessReportV182(game);
    return `<div class="modal-backdrop"><section class="dialog panel release-report-v182" data-modal-stop><div class="section-title"><div><p class="eyebrow">RELEASE CANDIDATE</p><h3>${report.ok?'Профиль готов к тесту':'Нужна проверка'}</h3></div><button class="icon-btn" data-action="close-modal">×</button></div><div class="release-report-metrics"><span><b>Схема</b>${report.saveVersion}</span><span><b>Первые шаги</b>${report.completedGoals}/${report.totalGoals}</span><span><b>Активные заказы</b>${report.activeOrders}</span><span><b>Ошибки сессии</b>${report.errors}</span></div>${report.warnings.length?`<div class="diagnostic-warning"><b>Предупреждения</b>${report.warnings.map((item)=>`<span>${escapeHtml(item)}</span>`).join('')}</div>`:'<div class="diagnostic-ok">Критических ошибок структуры не обнаружено.</div>'}<p class="muted">Это локальная проверка текущего сохранения. Она не отправляет данные в сеть.</p><button class="button primary full" data-action="close-modal">Готово</button></section></div>`;
  }
  if (ui.modal.type === 'feedback-report') {
    const text=ui.modal.text||feedbackReportV182(game,ui.tab||'home');
    return `<div class="modal-backdrop"><section class="dialog panel feedback-report-v182" data-modal-stop><div class="section-title"><div><p class="eyebrow">ОТЧЁТ ТЕСТИРОВАНИЯ</p><h3>Скопируйте и дополните описание</h3></div><button class="icon-btn" data-action="close-modal">×</button></div><textarea readonly id="feedbackReportText">${escapeHtml(text)}</textarea><p class="muted">Игра не отправляет отчёт автоматически. Скопируйте текст и пришлите его разработчику.</p><button class="button primary full" data-action="copy-feedback-report">Скопировать отчёт</button></section></div>`;
  }
  if (ui.modal.type === 'export') {
    return `<div class="modal-backdrop" data-action="close-modal"><section class="dialog panel" data-modal-stop><div class="section-title"><h3>Экспорт сохранения</h3><button class="icon-btn" data-action="close-modal">×</button></div><p class="muted">Скопируйте текст и сохраните его отдельно. Его можно импортировать на другом устройстве.</p><textarea readonly>${escapeHtml(ui.modal.text || JSON.stringify(game, null, 2))}</textarea></section></div>`;
  }
  return '';
}

export function renderGame(game, ui) {
  ensureV182(game);
  ensureCareerV162(game);
  ensureAdvertisingV162(game);
  ensureV08(game);
  ensureV13(game);
  ensureV165(game);
  ensureQualityState(game);
  const screen = ui.tab === 'home' ? renderHome(game) : ui.tab === 'orders' ? renderOrders(game, ui) : ui.tab === 'workshop' ? renderWorkshop(game, ui) : ui.tab === 'rest' ? `<section class="screen">${renderRest(game)}</section>` : (ui.tab === 'education' || ui.tab === 'growth') ? renderGrowth(game, ui) : renderMore(game, ui);
  const era = getEra(game);
  const visual = currentEraVisual(game);
  const noAnimations = !game.settings.animations || game.visual.reducedMotion;
  const eraClass = game.visual.eraThemes ? `era-${visual.id}` : '';
  return `<main class="game-shell ${eraClass} ${game.settings.compactMode ? 'compact' : ''} ${noAnimations ? 'no-animations' : ''} ${ui.silentRefresh ? 'silent-refresh' : ''}" style="--era-accent:${era.color || '#46e6d6'}">${renderHeader(game, ui)}<div class="screen-container">${screen}</div>${renderBottomNav(ui)}${ui.toast ? `<div class="toast ${ui.toast.tone || ''}">${escapeHtml(ui.toast.text)}</div>` : ''}${renderModal(game, ui)}</main>`;
}
