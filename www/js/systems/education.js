import { ALL_EDUCATION, EXTRA_EDUCATION } from '../data/progression.js';
import { EXTRA_EDUCATION_V06 } from '../data/content-v06.js';
import { EXTRA_EDUCATION_V07, LONG_PROGRAM_OVERRIDES_V07 } from '../data/content-v07.js';
import { SKILL_BOOKS_V15 } from '../data/books-v15.js';
import { EDUCATION_V153 } from '../data/education-v153.js';
import { ADVERTISING_V153 } from '../data/advertising-v153.js';
import { uid } from '../core/utils.js';
import { addLog, addMoney, addPlayerXp, educationSpeedBonus, getInflation, requirementsMet } from './progression.js';
import { bookCooldownDaysRemaining, bookCooldownMonthsRemaining, grantTemporaryKnowledge } from './knowledge.js';
import { protectSkillLevels } from './v169.js';

const normalizeEducation = (item) => {
  const override = LONG_PROGRAM_OVERRIDES_V07[item.id] || {};
  const next = { ...item, ...override };
  next.focus ||= next.focusSkill || Object.entries(next.skillGains || {}).sort((a,b)=>Number(b[1])-Number(a[1]))[0]?.[0] || 'communication';
  next.educationKind ||= ['university','college'].includes(next.type) ? 'formal' : next.type === 'advertising' ? 'advertising' : 'quick';
  if (['university', 'college'].includes(next.type)) {
    next.durationDays = next.type === 'college' ? 360 : 1800;
    next.academicYears = next.type === 'college' ? 1 : 5;
    next.skillGains = { ...(next.skillGains || {}) };
  } else {
    next.durationDays = 0;
    next.academicYears = 0;
    if (next.type !== 'advertising') {
      next.temporaryKnowledge = true;
      next.repeatCount = 999;
      next.cooldownMonths = Math.max(1, Number(next.cooldownMonths || 6));
      next.knowledgeMonths = Math.max(next.cooldownMonths, Number(next.knowledgeMonths || 12));
    }
  }
  return next;
};

const REPLACED_TYPES_V152 = new Set(['course','lecture','college','university','forum','advertising']);
const keepLegacyEducation = (items) => items.filter((item) => item.type !== 'book' && !REPLACED_TYPES_V152.has(item.type)).map(normalizeEducation);
export const EDUCATION_POOL = [
  ...SKILL_BOOKS_V15.map(normalizeEducation),
  ...keepLegacyEducation(ALL_EDUCATION),
  ...keepLegacyEducation(EXTRA_EDUCATION),
  ...keepLegacyEducation(EXTRA_EDUCATION_V06),
  ...keepLegacyEducation(EXTRA_EDUCATION_V07),
  ...EDUCATION_V153.map(normalizeEducation),
  ...ADVERTISING_V153.map(normalizeEducation)
].filter((item) => Number(item.fromYear || 2000) <= 2010);
export const EDUCATION_QUEUE_LIMIT = 6;
export const EDUCATION_WEEKLY_OFFER_COUNT = 16;
export const EDUCATION_MARKET_HOURS = 24 * 7;
export const isLongEducation = (item) => ['university', 'college'].includes(item?.type);
export const isTemporaryMaterial = (item) => !isLongEducation(item) && item?.type !== 'advertising' && item?.educationKind !== 'formal';
export const isTemporaryBook = isTemporaryMaterial;

export function educationById(id) { return EDUCATION_POOL.find((entry) => entry.id === id) || null; }

export function educationPlayerXp(item) {
  if (!item) return 0;
  if (item.type==='college') return 800 + Math.max(1,Number(item.rating||1))*25;
  if (item.type==='university') return 4000 + Math.max(1,Number(item.rating||1))*20;
  const rating=Number(item.rating || 1);
  if (item.type==='forum') return 25 + rating*12;
  if (item.type==='book') return 35 + Math.max(0,rating)*8;
  if (item.type==='advertising') return 25;
  return 55 + rating*18;
}


function plannedCount(game, item) {
  const id=item.id;
  const completed = isTemporaryMaterial(item) ? 0 : Number(game.education.completed[id] || 0);
  const active = game.education.active?.id === id ? 1 : 0;
  const queued = (game.education.queue || []).filter((entry) => entry.id === id).length;
  const university = game.education.university?.id === id ? 1 : 0;
  return completed + active + queued + university;
}

export function educationRequirements(game, item) {
  if (!item) return { ok:false, reason:'Программа не найдена' };
  if ((item.fromYear || 2000) > game.calendar.year) return { ok:false, reason:`Доступно с ${item.fromYear} года` };
  if (item.toYear && game.calendar.year > item.toYear) return { ok:false, reason:'Программа больше не проводится' };
  if (game.player.level < Number(item.reqLevel || 1)) return { ok:false, reason:`Нужен уровень персонажа ${item.reqLevel}`, locked:true };
  if (item.reqSkills && !requirementsMet(game, item.reqSkills)) return { ok:false, reason:'Сначала освойте базовый материал', locked:true };
  if (isTemporaryMaterial(item) && bookCooldownDaysRemaining(game,item)>0) return { ok:false, reason:`Повторно через ${bookCooldownMonthsRemaining(game,item)} мес.`, cooldown:true };
  if (isTemporaryMaterial(item) && plannedCount(game,item)>0) return { ok:false, reason:'Книга уже в плане', queued:true };
  if (!isTemporaryMaterial(item) && plannedCount(game, item) >= Number(item.repeatCount || 1)) return { ok:false, reason:'Все уровни уже запланированы или изучены', maxed:true };
  if (isLongEducation(item) && game.education.university) return { ok:false, reason:'Сначала завершите текущее длительное обучение' };
  if (!isLongEducation(item) && game.education.active && (game.education.queue || []).length >= EDUCATION_QUEUE_LIMIT) return { ok:false, reason:`Очередь заполнена: ${EDUCATION_QUEUE_LIMIT}/${EDUCATION_QUEUE_LIMIT}` };
  return { ok:true, reason:'' };
}

function educationClockHours(game) {
  return Math.max(0, Number(game.calendar?.totalHours || (Number(game.calendar?.totalDays || 0) * 24)));
}

function educationWeekKey(game) {
  return Math.floor(educationClockHours(game) / EDUCATION_MARKET_HOURS);
}

function stableOfferScore(id, weekKey) {
  let hash = 2166136261;
  const source = `${id}|${weekKey}|v167`;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function ensureEducationMarketV167(game) {
  game.education ||= {};
  const weekKey = educationWeekKey(game);
  const previous = game.education.marketV167;
  const stillCurrent = previous
    && Number(previous.weekKey) === weekKey
    && Array.isArray(previous.offerIds)
    && previous.offerIds.length > 0
    && Number(previous.version || 0) === 169;
  if (stillCurrent) return previous;

  const candidates = EDUCATION_POOL
    .filter((item) => item.type !== 'youtube' && isTemporaryMaterial(item))
    .filter((item) => (item.fromYear || 2000) <= game.calendar.year && (!item.toYear || game.calendar.year <= item.toYear))
    .filter((item) => educationRequirements(game, item).ok)
    .sort((a, b) => stableOfferScore(a.id, weekKey) - stableOfferScore(b.id, weekKey));

  const skillIds=['hardware','software','networking','repair','security','data','communication','management'];
  const selected=[];
  const used=new Set();
  for (const skillId of skillIds) {
    const focused=candidates.filter((item)=>item.focus===skillId && !used.has(item.id)).slice(0,2);
    for (const item of focused) { selected.push(item); used.add(item.id); }
  }
  for (const item of candidates) {
    if (selected.length>=EDUCATION_WEEKLY_OFFER_COUNT) break;
    if (!used.has(item.id)) { selected.push(item); used.add(item.id); }
  }
  const offerIds = selected.slice(0, EDUCATION_WEEKLY_OFFER_COUNT).map((item) => item.id);
  game.education.marketV167 = {
    weekKey,
    offerIds,
    refreshedAtTotalHours: weekKey * EDUCATION_MARKET_HOURS,
    version:169
  };
  return game.education.marketV167;
}

export function educationMarketStatusV167(game) {
  const market = ensureEducationMarketV167(game);
  const elapsed = educationClockHours(game) - Number(market.refreshedAtTotalHours || 0);
  return {
    offerCount: market.offerIds.length,
    hoursLeft: Math.max(1, Math.ceil(EDUCATION_MARKET_HOURS - elapsed)),
    weekKey: market.weekKey
  };
}

export function availableEducation(game) {
  const market = ensureEducationMarketV167(game);
  const offers = new Set(market.offerIds);
  return EDUCATION_POOL.filter((item) => {
    if (item.type === 'youtube') return false;
    if ((item.fromYear || 2000) > game.calendar.year || (item.toYear && game.calendar.year > item.toYear)) return false;
    if (isTemporaryMaterial(item)) return offers.has(item.id);
    return true;
  });
}

export function educationDays(gameOrItem, maybeItem = null) {
  const item = maybeItem || gameOrItem;
  if (item?.type === 'college') return 360;
  if (item?.type === 'university') return 1800;
  return 0;
}
export function educationCost(game, item) { return Math.round(Number(item?.cost || 0) * getInflation(game)); }

function createEnrollment(game, item) {
  const days = educationDays(game, item);
  return { queueId:uid('edu'), id:item.id, name:item.name, icon:item.icon, type:item.type, daysLeft:days, totalDays:days, ready:false, academicYears:Number(item.academicYears||0), enrolledAt:{...game.calendar} };
}
function resetIdle(game, message) { game.activity||={};game.activity.resting=false;game.activity.idleDays=0;game.activity.idlePromptShownAt=0;game.activity.lastMessage=message; }

export function startEducation(game, id) {
  game.education.queue ||= [];
  const item=educationById(id); const check=educationRequirements(game,item);
  if(!check.ok)return {ok:false,message:check.reason};
  const cost=educationCost(game,item); if(game.player.cash<cost)return {ok:false,message:'Недостаточно денег'};
  if(cost>0)addMoney(game,-cost,`${item.type==='advertising'?'Реклама':'Обучение'}: ${item.name}`);
  if(item.type==='advertising'){game.marketing.analytics||={spend:0,leads:0,orders:0,revenue:0,campaignsStarted:0};game.marketing.analytics.spend+=cost;game.marketing.analytics.campaignsStarted+=1;}
  const enrollment=createEnrollment(game,item);
  if(isLongEducation(item)){game.education.university=enrollment;resetIdle(game,`${item.type==='college'?'Техникум':'Вуз'}: ${item.name}`);const years=item.type==='college'?1:5;addLog(game,`Поступление: ${item.name}. Срок обучения — ${years} ${years===1?'игровой год':'игровых лет'}.`,'success');return {ok:true,message:`Обучение начато: ${years===1?'1 игровой год':'5 игровых лет'}.`};}
  applyCompletion(game,item);
  resetIdle(game,`Изучено: ${item.name}`);
  addLog(game,`${item.type==='advertising'?'Рекламная кампания завершена':'Материал изучен моментально'}: ${item.name}`,'success');
  return {ok:true,message:`Материал изучен моментально: получены расходуемые знания · +${educationPlayerXp(item)} XP персонажа`};
}

function addLevels(game,gains={}){for(const[skillId,levels]of Object.entries(gains)){const skill=game.skills[skillId];if(!skill)continue;skill.level=Math.min(100,skill.level+Number(levels||0));skill.xp=0;}protectSkillLevels(game,gains);}
function applyMarketing(game,item){if(!item.marketingGains)return;game.marketing||={orderBonus:0,rewardBonus:0,reputationBonus:0,premiumBonus:0,campaignsCompleted:0};for(const[key,value]of Object.entries(item.marketingGains))game.marketing[key]=Number(game.marketing[key]||0)+Number(value||0);game.marketing.campaignsCompleted=Number(game.marketing.campaignsCompleted||0)+1;game.marketing.analytics||={spend:0,leads:0,orders:0,revenue:0,campaignsStarted:0};game.marketing.analytics.leads+=Math.max(2,Math.round(4+Number(item.marketingGains.orderBonus||0)*45));}

function applyCompletion(game,item){
  if(isTemporaryMaterial(item)){
    game.skillUsage ||= {};
    for (const skillId of Object.keys(item.skillGains||{})) {
      const usage=game.skillUsage[skillId] ||= {lastUsedDay:0,protectedLevel:0,lastLevelDecayDay:0};
      usage.lastUsedDay=Number(game.calendar?.totalDays||0);
    }
    const entry=grantTemporaryKnowledge(game,item);
    if(entry)addLog(game,`Материал изучен: знания действуют ${item.knowledgeMonths || 12} игровых месяцев. Повторное изучение откроется через ${item.cooldownMonths || 6} месяцев.`,'success');
  }else addLevels(game,item.skillGains||{});
  game.education.completed[item.id]=Number(game.education.completed[item.id]||0)+1;
  const completed=game.education.completed[item.id];
  if(item.forumMastery&&completed>=Number(item.repeatCount||1)){const communication=game.skills.communication;if(communication)communication.level=Math.min(100,communication.level+1);game.player.reputation+=12;addLog(game,`Вы стали признанным участником форума «${item.name}»: +1 к общению.`,'success');}
  applyMarketing(game,item);
  if(!isLongEducation(item)){const playerXp=educationPlayerXp(item);if(playerXp)addPlayerXp(game,playerXp,'study',`Учёба: ${item.name}`);item._lastPlayerXp=playerXp;}
  game.stats.studiesCompleted=Number(game.stats.studiesCompleted||0)+1;
}
function startNextQueued(game){game.education.queue||=[];game.education.active=game.education.queue.shift()||null;if(game.education.active)addLog(game,`Автоматически начато: ${game.education.active.name}`,'info');}

export function completeEducation(game){const active=game.education.active;if(!active||!active.ready)return{ok:false,message:'Обучение ещё не завершено'};const item=educationById(active.id);if(!item)return{ok:false,message:'Материал не найден'};applyCompletion(game,item);addLog(game,`${item.type==='advertising'?'Рекламная кампания завершена':'Обучение завершено'}: ${item.name}`,'success');startNextQueued(game);game.activity||={};game.activity.lastMessage=game.education.active?`Следующее обучение: ${game.education.active.name}`:'Очередь обучения завершена';return{ok:true,message:game.education.active?`Начато следующее: ${game.education.active.name}`:`${isTemporaryMaterial(item)?'Временные знания получены':'Навыки повышены'} · +${educationPlayerXp(item)} XP персонажа`};}
export function completeUniversity(game){const active=game.education.university;if(!active||!active.ready)return{ok:false,message:'Долгое обучение ещё продолжается'};const item=educationById(active.id);if(!item)return{ok:false,message:'Учебная программа не найдена'};applyCompletion(game,item);const bonus=item.graduationBonus||{};const playerXp=educationPlayerXp(item);if(playerXp)addPlayerXp(game,playerXp,'study',`Диплом: ${item.name}`);if(bonus.reputation)game.player.reputation+=Number(bonus.reputation||0);if(bonus.salaryBonus)game.education.degreeSalaryBonus=Number(game.education.degreeSalaryBonus||0)+Number(bonus.salaryBonus||0);game.education.university=null;addLog(game,`Получен диплом: ${item.name}. Профильные знания усилены, смежные дисциплины тоже выросли. Зарплатный бонус +${Math.round(Number(bonus.salaryBonus||0)*100)}%.`,'success');return{ok:true,message:`${item.type==='college'?'Техникум окончен':'Вуз окончен'}: знания повышены · +${playerXp} XP персонажа`};}
export function removeQueuedEducation(game,queueId){game.education.queue||=[];const before=game.education.queue.length;game.education.queue=game.education.queue.filter((entry)=>entry.queueId!==queueId);return before===game.education.queue.length?{ok:false,message:'Элемент очереди не найден'}:{ok:true,message:'Обучение удалено из очереди'};}
