import { SKILLS } from '../data/progression.js';
import { ALL_LOCATIONS, ALL_VEHICLES, UPGRADES } from '../data/economy.js';
import { heroAvatarById } from '../data/avatars.js';
import { uid } from './utils.js';
import { careerJobByBranchTier, CAREER_BRANCHES_V162 } from '../data/v162.js';
import { applyStarterBackgroundBonuses, starterBackgroundById } from '../data/backgrounds-v165.js';

export const SAVE_VERSION = 19;
export const PROFILE_LIMIT = 10;
export const AVATAR_BONUS_VERSION = 1;
export const STARTER_BACKGROUND_BONUS_VERSION = 1;

function applyAvatarBonuses(skills, avatarId) {
  const avatar = heroAvatarById(avatarId);
  for (const item of avatar.bonuses || []) {
    if (!skills[item.skill]) continue;
    skills[item.skill].level = Math.max(0, Number(skills[item.skill].level || 0)) + Math.max(0, Number(item.amount || 0));
  }
  return skills;
}

function baseSkills(specialization, avatarId = 'classic') {
  const skills = Object.fromEntries(SKILLS.map((skill) => [skill.id, { level: 0, xp: 0 }]));
  skills.hardware.level = 1;
  skills.software.level = 1;
  applyStarterBackgroundBonuses(skills, specialization);
  return applyAvatarBonuses(skills, avatarId);
}

function baseUpgrades() {
  return Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.id, 0]));
}

export function createNewGame(profile = {}) {
  const specialization = profile.specialization || 'hardware';
  const avatarId = heroAvatarById(profile.avatar || 'classic').id;
  const now = new Date().toISOString();
  const careerBranchId = CAREER_BRANCHES_V162.some((item)=>item.id===specialization) ? specialization : 'hardware';
  const firstCareerJob = careerJobByBranchTier(careerBranchId,1);
  const skills = baseSkills(specialization, avatarId);
  return {
    version: SAVE_VERSION,
    id: uid('career'),
    createdAt: now,
    updatedAt: now,
    profile: {
      name: profile.name?.trim() || 'Новичок',
      specialization,
      avatar: avatarId,
      avatarBonusVersion: AVATAR_BONUS_VERSION,
      backgroundBonusVersion: STARTER_BACKGROUND_BONUS_VERSION
    },
    calendar: { year: 2000, month: 1, day: 1, hour: 0, totalDays: 0, totalHours: 0 },
    player: {
      cash: 3000,
      reputation: 0,
      energy: 82,
      mood: 75,
      health: 100,
      fun: 80,
      level: 1,
      xp: 0
    },
    progression: { xpFromWork:0, xpFromStudy:0, xpFromOther:0, lastXp:[] },
    skills,
    skillUsage: Object.fromEntries(Object.entries(skills).map(([id, skill]) => [id, { lastUsedDay:0, protectedLevel:Number(skill.level||0), lastLevelDecayDay:0 }])),
    inventory: {
      tool_screw_basic: 1,
      therm: 2,
      air: 1,
      win98_cd: 1,
      paste_brush: 1
    },
    orders: { available: [], active: [], history: [] },
    activity: { mode: 'idle', plan: 'balanced', resting: false, idleDays: 0, idlePromptShownAt: 0, lastMessage: '', tickMs: 4200, courseProgress: 0 },
    lifestyle: { planId:'economy', selectedAt:{ year:2000, month:1, day:1 }, totalSpent:0 },
    parallel: { lastProcessedHour:0, lastMaintenanceDay:0, totalOrderProgress:0, totalStudyProgress:0 },
    education: { active: null, queue: [], university: null, completed: {}, degreeSalaryBonus: 0, bookKnowledge: {}, marketV167: null },
    marketing: { orderBonus: 0, rewardBonus: 0, reputationBonus: 0, premiumBonus: 0, activeCampaigns:[], campaignsCompleted: 0, v162Migrated:true, analytics:{ spend:0, leads:0, orders:0, revenue:0, campaignsStarted:0 } },
    workspace: { items: {}, totalSpent: 0 },
    fleaMarket: { scrap: 0, offers: [], lastFinds: [], brokenItems: [], cooldowns: {}, totalFinds: 0 },
    career: { jobId:firstCareerJob?.id||'v162_hardware_1', currentBranchId:careerBranchId, branches:{}, pendingPromotion:null, startedYear:2000, totalSalary:0, v162Migrated:true },
    mode: { id: profile.mode || 'campaign', challengeId: profile.challengeId || null, completed:false, difficultyId:profile.difficultyId || 'normal' },
    clients: { records:{}, repeatOrders:0, referrals:0 },
    reputationBySkill: Object.fromEntries(SKILLS.map((skill)=>[skill.id,0])),
    v18: { difficultyId:profile.difficultyId || 'normal', notifications:[], notificationReadAt:0, warranties:{active:[],claims:[],history:[]}, history:{seen:[],demand:{}}, stats:{quotesAccepted:0,quotesRejected:0,warrantyClaims:0,projectsCompleted:0}, lastProcessedDay:0 },
    v182: { releaseCandidate:true, tutorial:{dismissed:false}, recovery:{lastDay:-999,uses:0}, reports:[], feedback:{lastCreatedAt:null}, stats:{emergencyJobs:0,deadEndsPrevented:0} },
    business: { opened:false, typeId:null, name:'', logo:'chip', foundedAt:null, previousJobId:null, companyReputation:0, marketShare:8, employees:[], contracts:[], contractOffers:[], competitors:[], cityLocation:'home', cityBuff:null },
    finance: { current:{income:0,expenses:0}, history:[], lifetimeProfit:0 },
    world: { activeEvent:null, eventHistory:[], monthCounter:0 },
    specialization: { active:null, selectedAt:null },
    legacy: { points:Number(profile.legacyPoints||0), careers:Number(profile.legacyCareers||0), rewards:Array.isArray(profile.legacyRewards)?profile.legacyRewards:[] },
    stability: { backupCount:0, lastBackupAt:null, lastHealthyAt:now, recoveryCount:0, warnings:[], sessionErrors:[] },
    market: { priceIndex:1, categoryMultipliers:{}, activeEvent:null, history:[], restockRules:{therm:4,air:3,win98_cd:2,paste_brush:2,sata_c:2,ide_c:2}, totalSpeculationProfit:0 },
    campaign: { rewardedChapters:[], chapterTransitions:[], endingSeen:false, completedAt:null, endYear:2010, finished:false, endChoice:null, calendarFrozen:false, sandboxHours:0, sandboxNewsMonth:1 },
    replay: { challengeId:profile.challengeId||null, challengeCompleted:false, challengeReward:null, legacyUpgrades:{}, appliedLegacySignature:'', newGamePlusUnlocked:false },
    audio: { enabled:true, master:.62, ui:.65, ambience:.45, music:.42, vibration:true, radioEnabled:true },
    visual: { eraThemes:true, reducedMotion:false, roomAnimations:true },
    diagnostics: { tutorialCompleted:false, hintsUsed:0, lastRecommendedAction:null },
    property: {
      locationId: 'home',
      ownedLocations: ['home'],
      vehicleId: 'none',
      ownedVehicles: ['none'],
      upgrades: baseUpgrades()
    },
    pc: { slots: {}, assembled: false, name: 'Домашний ПК', buildsCompleted: 0, test:{status:'not-tested',score:0,temperature:0,stability:0,noise:0}, builds:[] },
    bank: {
      deposits: [],
      loans: [],
      yearlyIncome: 0,
      totalIncome: 0,
      taxDebt: 0,
      selfEmployed: false,
      selfEmployedYear: null
    },
    family: { partner: null, partnerSince: null, children: 0, relation: 0 },
    achievements: [],
    stats: {
      ordersDone: 0,
      ordersFailed: 0,
      earned: 0,
      spent: 0,
      streak: 0,
      bestStreak: 0,
      epicDone: 0,
      daysRested: 0,
      itemsBought: 0,
      studiesCompleted: 0,
      fleaFinds: 0
    },
    settings: {
      themeMode: 'dark',
      animations: true,
      compactMode: false,
      autosave: true,
      onboardingSeen: false
    },
    log: [
      { id: uid('log'), at: now, type: 'info', text: 'Карьера началась. На дворе 2000 год.' }
    ]
  };
}

function migrateV1(old) {
  const next = createNewGame({
    name: old.profile?.name,
    specialization: old.profile?.specialization
  });
  next.createdAt = old.createdAt || next.createdAt;
  next.calendar.year = old.time?.year || 2000;
  next.calendar.month = old.time?.month || 1;
  next.player.cash = old.stats?.cash ?? 3000;
  next.player.energy = old.stats?.energy ?? 82;
  next.player.reputation = old.stats?.reputation ?? 0;
  next.player.level = old.stats?.level ?? 1;
  next.player.xp = old.stats?.xp ?? 0;
  for (const [id, skill] of Object.entries(old.skills || {})) {
    if (next.skills[id]) {
      next.skills[id].level = skill.level ?? skill.lv ?? 0;
      next.skills[id].xp = skill.xp ?? 0;
    }
  }
  for (const item of old.inventory || []) {
    next.inventory[item.id] = (next.inventory[item.id] || 0) + Number(item.quantity || 0);
  }
  next.log.unshift({ id: uid('log'), at: new Date().toISOString(), type: 'success', text: 'Сохранение версии 0.1 обновлено до 0.2.' });
  return next;
}

export function migrateGame(raw) {
  if (!raw) return null;
  if (!raw.version || raw.version === 1) return migrateV1(raw);
  const game = structuredClone(raw);
  game.version = SAVE_VERSION;
  game.updatedAt = new Date().toISOString();
  game.profile ||= { name:'Новичок', specialization:'hardware', avatar:'classic' };
  game.profile.name = String(game.profile.name || 'Новичок').trim() || 'Новичок';
  game.profile.specialization ||= 'hardware';
  game.profile.avatar = heroAvatarById(String(game.profile.avatar || 'classic')).id;
  game.skills ||= Object.fromEntries(SKILLS.map((skill) => [skill.id, { level: 0, xp: 0 }]));
  for (const skill of SKILLS) game.skills[skill.id] ||= { level: 0, xp: 0 };
  game.skillUsage ||= {};
  for (const skill of SKILLS) game.skillUsage[skill.id] ||= { lastUsedDay:Number(game.calendar?.totalDays||0), protectedLevel:Number(game.skills[skill.id]?.level||0), lastLevelDecayDay:Number(game.calendar?.totalDays||0) };
  game.lifestyle ||= { planId:'economy', selectedAt:{...(game.calendar||{year:2000,month:1,day:1})}, totalSpent:0 };
  game.parallel ||= { lastProcessedHour:Number(game.calendar?.totalHours||0), lastMaintenanceDay:Math.floor(Number(game.calendar?.totalHours||0)/24), totalOrderProgress:0, totalStudyProgress:0 };
  game.parallel.lastProcessedHour = Number.isFinite(Number(game.parallel.lastProcessedHour)) ? Number(game.parallel.lastProcessedHour) : Number(game.calendar?.totalHours||0);
  game.parallel.lastMaintenanceDay = Number.isFinite(Number(game.parallel.lastMaintenanceDay)) ? Number(game.parallel.lastMaintenanceDay) : Math.floor(Number(game.calendar?.totalHours||0)/24);
  delete game.parallel.lastProcessedDay;
  if (Number(game.profile.avatarBonusVersion || 0) < AVATAR_BONUS_VERSION) {
    applyAvatarBonuses(game.skills, game.profile.avatar);
    game.profile.avatarBonusVersion = AVATAR_BONUS_VERSION;
    game.log ||= [];
    game.log.unshift({ id: uid('log'), at: new Date().toISOString(), type: 'success', text: `Стартовые бонусы профиля «${heroAvatarById(game.profile.avatar).name}» применены.` });
  }
  if (Number(game.profile.backgroundBonusVersion || 0) < STARTER_BACKGROUND_BONUS_VERSION) {
    applyStarterBackgroundBonuses(game.skills, game.profile.specialization);
    game.profile.backgroundBonusVersion = STARTER_BACKGROUND_BONUS_VERSION;
    game.log ||= [];
    game.log.unshift({ id: uid('log'), at: new Date().toISOString(), type: 'success', text: `Бонус стартового направления «${starterBackgroundById(game.profile.specialization).name}» применён отдельно от профиля героя.` });
  }
  game.settings ||= { themeMode: 'dark', animations: true, compactMode: false, autosave: true, onboardingSeen: false };
  if (!['dark', 'light'].includes(game.settings.themeMode)) game.settings.themeMode = 'dark';
  if (typeof game.settings.onboardingSeen !== 'boolean') game.settings.onboardingSeen = false;
  game.calendar ||= { year:2000, month:1, day:1, hour:0, totalDays:0, totalHours:0 };
  game.calendar.hour = Number(game.calendar.hour || 0);
  game.calendar.totalHours = Number(game.calendar.totalHours || Number(game.calendar.totalDays || 0) * 24);
  game.family ||= { partner: null, partnerSince: null, children: 0, relation: 0 };
  game.orders ||= { available: [], active: [], history: [] };
  game.activity ||= { mode: 'idle', resting: false, idleDays: 0, idlePromptShownAt: 0, lastMessage: '', tickMs: 4200 };
  game.activity.resting = Boolean(game.activity.resting || game.activity.mode === 'rest');
  game.activity.idleDays = Number(game.activity.idleDays || 0);
  game.activity.idlePromptShownAt = Number(game.activity.idlePromptShownAt || 0);
  if (!['idle', 'work', 'study', 'work-study', 'rest', 'paused'].includes(game.activity.mode)) game.activity.mode = 'idle';
  game.education ||= { active: null, queue: [], university: null, completed: {}, degreeSalaryBonus: 0, bookKnowledge: {}, marketV167: null };
  game.education.queue ||= [];
  game.education.university ||= null;
  game.education.completed ||= {};
  game.education.bookKnowledge ||= {};
  game.education.marketV167 ||= null;
  game.education.degreeSalaryBonus = Math.min(.35, Number(game.education.degreeSalaryBonus || 0));
  game.marketing ||= { orderBonus:0, rewardBonus:0, reputationBonus:0, premiumBonus:0, activeCampaigns:[], campaignsCompleted:0, analytics:{spend:0,leads:0,orders:0,revenue:0,campaignsStarted:0} };
  game.marketing.activeCampaigns ||= [];
  game.marketing.analytics ||= {spend:0,leads:0,orders:0,revenue:0,campaignsStarted:0};
  game.career ||= { jobId:null, startedYear:game.calendar.year, totalSalary:0 };
  game.career.branches ||= {};
  game.career.totalSalary = Number(game.career.totalSalary || 0);
  // v0.7: old builds could save a university as a five-day course.
  // Convert it to exact calendar years while preserving the completed percentage.
  if (game.education.university) {
    const longDays = {
      uni_radio_evening: 360, college_operator_pc: 360,
      college_radio_tech: 720, college_telecom: 720,
      college_programmer: 1080, uni_it_faculty: 1440,
      uni_msu_vmk: 1440, uni_bauman_iu: 1440, uni_spbsu_pm: 1440,
      uni_mipt: 1440, uni_itmo: 1440, uni_mephi_sec: 1440
    };
    const expected = longDays[game.education.university.id] || 1440;
    const oldTotal = Math.max(1, Number(game.education.university.totalDays || game.education.university.daysLeft || 1));
    const oldLeft = Math.max(0, Number(game.education.university.daysLeft || 0));
    if (oldTotal < expected && !game.education.university.ready) {
      const completedShare = Math.max(0, Math.min(1, 1 - oldLeft / oldTotal));
      game.education.university.totalDays = expected;
      game.education.university.daysLeft = Math.max(1, Math.ceil(expected * (1 - completedShare)));
      game.education.university.academicYears = Math.max(1, Math.round(expected / 360));
      game.education.university.ready = false;
    }
  }
  // v0.16.6: быстрые материалы занимают день, техникум — год, ВУЗ — пять лет.
  if (game.education.active && !game.education.active.ready) {
    game.education.active.totalDays = 1;
    game.education.active.daysLeft = Math.min(1, Math.max(1, Number(game.education.active.daysLeft || 1)));
  }
  if (game.education.university && !game.education.university.ready) {
    const expectedDays = game.education.university.type === 'college' ? 360 : 1800;
    const oldTotal = Math.max(1, Number(game.education.university.totalDays || 1));
    const oldLeft = Math.max(0, Number(game.education.university.daysLeft || oldTotal));
    const completedShare = oldTotal > 1 ? Math.max(0, Math.min(1, 1 - oldLeft / oldTotal)) : 0;
    game.education.university.totalDays = expectedDays;
    game.education.university.daysLeft = Math.max(1, Math.ceil(expectedDays * (1 - completedShare)));
    game.education.university.academicYears = game.education.university.type === 'college' ? 1 : 5;
  }
  game.marketing ||= { orderBonus: 0, rewardBonus: 0, reputationBonus: 0, premiumBonus: 0, campaignsCompleted: 0 };
  game.marketing.orderBonus = Number(game.marketing.orderBonus || 0);
  game.marketing.rewardBonus = Number(game.marketing.rewardBonus || 0);
  game.marketing.reputationBonus = Number(game.marketing.reputationBonus || 0);
  game.marketing.premiumBonus = Number(game.marketing.premiumBonus || 0);
  game.marketing.campaignsCompleted = Number(game.marketing.campaignsCompleted || 0);
  game.workspace ||= { items: {}, totalSpent: 0 };
  game.workspace.items ||= {};
  game.workspace.totalSpent = Number(game.workspace.totalSpent || 0);
  game.fleaMarket ||= { scrap: 0, offers: [], lastFinds: [], brokenItems: [], cooldowns: {}, totalFinds: 0 };
  game.fleaMarket.cooldowns ||= {};
  game.fleaMarket.offers ||= [];
  game.fleaMarket.lastFinds ||= [];
  game.fleaMarket.brokenItems ||= [];
  game.property ||= { locationId: 'home', ownedLocations: ['home'], vehicleId: 'none', ownedVehicles: ['none'], upgrades: baseUpgrades() };
  game.property.upgrades ||= baseUpgrades();
  // v0.16.6: старые мастерские и автомобили переводятся в новую линию жилья и транспорта.
  const locationMapV163 = { garage:'dorm_room', small_workshop:'studio', workshop:'one_room', service_center:'two_room', tech_hub:'two_room', campus:'two_room' };
  if (!ALL_LOCATIONS.some((item)=>item.id===game.property.locationId)) game.property.locationId = locationMapV163[game.property.locationId] || 'home';
  game.property.ownedLocations = Array.from(new Set(['home', ...(game.property.ownedLocations || []).map((id)=>locationMapV163[id] || id).filter((id)=>ALL_LOCATIONS.some((item)=>item.id===id))]));
  const vehicleMapV163 = { car_00s:'old_lada', new_car:'old_mercedes', van:'old_lada', branded_van:'old_mercedes', fleet:'old_mercedes' };
  if (!ALL_VEHICLES.some((item)=>item.id===game.property.vehicleId)) game.property.vehicleId = vehicleMapV163[game.property.vehicleId] || 'none';
  game.property.ownedVehicles = Array.from(new Set(['none', ...(game.property.ownedVehicles || []).map((id)=>vehicleMapV163[id] || id).filter((id)=>ALL_VEHICLES.some((item)=>item.id===id))]));
  game.pc ||= { slots: {}, assembled: false, name: 'Домашний ПК', buildsCompleted: 0 };
  game.bank ||= { deposits: [], loans: [], yearlyIncome: 0, totalIncome: 0, taxDebt: 0, selfEmployed: false };
  game.bank.taxDebt = 0;
  game.bank.selfEmployed = false;
  game.bank.selfEmployedYear = null;
  game.achievements ||= [];
  game.stats ||= {};
  game.log ||= [];
  game.mode ||= { id:'campaign', challengeId:null, completed:false };
  game.mode.difficultyId ||= game.v18?.difficultyId || 'normal';
  game.reputationBySkill ||= Object.fromEntries(SKILLS.map((skill)=>[skill.id,0]));
  for (const skill of SKILLS) game.reputationBySkill[skill.id] = Number(game.reputationBySkill[skill.id] || 0);
  game.v18 ||= { difficultyId:game.mode.difficultyId, notifications:[], notificationReadAt:0, warranties:{active:[],claims:[],history:[]}, history:{seen:[],demand:{}}, stats:{quotesAccepted:0,quotesRejected:0,warrantyClaims:0,projectsCompleted:0}, lastProcessedDay:Number(game.calendar?.totalDays||0) };
  game.v18.difficultyId = game.mode.difficultyId;
  game.v18.notifications = Array.isArray(game.v18.notifications) ? game.v18.notifications : [];
  game.v18.warranties ||= {active:[],claims:[],history:[]};
  game.v18.warranties.active = Array.isArray(game.v18.warranties.active) ? game.v18.warranties.active : [];
  game.v18.warranties.claims = Array.isArray(game.v18.warranties.claims) ? game.v18.warranties.claims : [];
  game.v18.warranties.history = Array.isArray(game.v18.warranties.history) ? game.v18.warranties.history : [];
  game.v18.history ||= {seen:[],demand:{}};
  game.v18.history.seen = Array.isArray(game.v18.history.seen) ? game.v18.history.seen : [];
  game.v18.history.demand ||= {};
  game.v18.stats ||= {quotesAccepted:0,quotesRejected:0,warrantyClaims:0,projectsCompleted:0};
  game.v18.lastProcessedDay = Number.isFinite(Number(game.v18.lastProcessedDay)) ? Number(game.v18.lastProcessedDay) : Number(game.calendar?.totalDays||0);
  game.v182 ||= { releaseCandidate:true, tutorial:{dismissed:false}, recovery:{lastDay:-999,uses:0}, reports:[], feedback:{lastCreatedAt:null}, stats:{emergencyJobs:0,deadEndsPrevented:0} };
  game.v182.tutorial ||= {dismissed:false};
  game.v182.recovery ||= {lastDay:-999,uses:0};
  game.v182.reports = Array.isArray(game.v182.reports) ? game.v182.reports : [];
  game.v182.feedback ||= {lastCreatedAt:null};
  game.v182.stats ||= {emergencyJobs:0,deadEndsPrevented:0};
  game.activity.plan ||= 'balanced';
  game.activity.courseProgress = Number(game.activity.courseProgress||0);
  game.clients ||= { records:{}, repeatOrders:0, referrals:0 };
  game.clients.records ||= {};
  game.progression ||= { xpFromWork:0, xpFromStudy:0, xpFromOther:0, lastXp:[] };
  game.progression.xpFromWork = Number(game.progression.xpFromWork || 0);
  game.progression.xpFromStudy = Number(game.progression.xpFromStudy || 0);
  game.progression.xpFromOther = Number(game.progression.xpFromOther || 0);
  game.progression.lastXp = Array.isArray(game.progression.lastXp) ? game.progression.lastXp.slice(0,12) : [];
  game.business ||= { companyReputation:0, marketShare:8, employees:[], contracts:[], contractOffers:[], competitors:[], cityLocation:'home', cityBuff:null };
  game.business.employees ||= []; game.business.contracts ||= []; game.business.contractOffers ||= []; game.business.competitors ||= [];
  game.business.opened = Boolean(game.business.opened || game.business.employees.length || game.business.departments?.length);
  game.business.name ||= game.business.opened ? 'Компьютерный сервис' : '';
  game.business.logo ||= 'chip';
  game.business.typeId ||= game.business.opened ? 'service_repair' : null;
  game.business.foundedAt ||= game.business.opened ? { ...game.calendar } : null;
  game.business.previousJobId ||= null;
  game.finance ||= { current:{income:0,expenses:0}, history:[], lifetimeProfit:0 }; game.finance.current ||= {income:0,expenses:0}; game.finance.history ||= [];
  game.marketing.analytics ||= { spend:0, leads:0, orders:0, revenue:0, campaignsStarted:0 };
  game.world ||= { activeEvent:null, eventHistory:[], monthCounter:0 }; game.world.eventHistory ||= [];
  game.specialization ||= { active:null, selectedAt:null };
  game.legacy ||= { points:0, careers:0, rewards:[] };
  game.pc.test ||= {status:'not-tested',score:0,temperature:0,stability:0,noise:0}; game.pc.builds ||= [];
  game.stats.loansTaken = Number(game.stats.loansTaken||0); game.stats.warrantyReturns=Number(game.stats.warrantyReturns||0); game.stats.clientsRetained=Number(game.stats.clientsRetained||0); game.stats.contractMonths=Number(game.stats.contractMonths||0);
  game.stability ||= { backupCount:0, lastBackupAt:null, lastHealthyAt:new Date().toISOString(), recoveryCount:0, warnings:[], sessionErrors:[] };
  game.market ||= { priceIndex:1, categoryMultipliers:{}, activeEvent:null, history:[], restockRules:{therm:4,air:3,win98_cd:2,paste_brush:2,sata_c:2,ide_c:2}, totalSpeculationProfit:0 };
  game.campaign ||= { rewardedChapters:[], chapterTransitions:[], endingSeen:false, completedAt:null };
  game.campaign.endYear = 2010;
  game.campaign.finished = Boolean(game.campaign.finished);
  game.campaign.endChoice ||= null;
  game.campaign.calendarFrozen = Boolean(game.campaign.calendarFrozen);
  game.campaign.sandboxHours = Number(game.campaign.sandboxHours || 0);
  game.campaign.sandboxNewsMonth = Math.max(1, Math.min(12, Number(game.campaign.sandboxNewsMonth || game.calendar.month || 1)));
  if (game.calendar.year > 2010) { game.calendar.year=2010; game.calendar.month=12; game.calendar.day=30; game.calendar.hour=12; game.campaign.finished=true; game.mode.completed=true; }
  game.replay ||= { challengeId:game.mode?.challengeId||null, challengeCompleted:false, challengeReward:null, legacyUpgrades:{}, appliedLegacySignature:'', newGamePlusUnlocked:false };
  game.audio ||= { enabled:true, master:.62, ui:.65, ambience:.45, music:.42, vibration:true, radioEnabled:true };
  game.visual ||= { eraThemes:true, reducedMotion:false, roomAnimations:true };
  game.audio.radioEnabled = typeof game.audio.radioEnabled === 'boolean' ? game.audio.radioEnabled : true;
  game.diagnostics ||= { tutorialCompleted:false, hintsUsed:0, lastRecommendedAction:null };
  game.business.departments ||= [];
  game.business.automation ||= {};
  game.business.employeeEvents ||= [];
  game.orders.reviews ||= [];
  game.orders.guarantees ||= [];
  game.orders.qualityHistory ||= [];
  return game;
}

export function skillXpNeeded(level) {
  return Math.floor(50 * Math.pow(1.3, Math.max(0, level - 1)));
}

export function playerXpNeeded(level) {
  return Math.floor(100 * Math.pow(1.45, Math.max(0, level - 1)));
}
