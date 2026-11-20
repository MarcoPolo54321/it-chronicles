import { ALL_COMPONENTS } from '../data/components.js';
import { ADV_ORDERS, ALL_ORDERS, BUILD_TIERS, CLIENT_TIERS, EXTRA_ORDERS, EXTRA_2000S_ORDERS } from '../data/orders.js';
import { chance, pick, randomInt, uid } from '../core/utils.js';
import { advanceDays, advanceHours } from './calendar.js';
import { buyComponent, componentPrice } from './economy.js';
import { addLog, addMoney, addPlayerXp, addSkillXp, getInflation, getVehicle, incomeBonus, maxActiveOrders, reputationBonus, requirementsMet, skillXpBonus, successBonus, workSpeed, skillLevel } from './progression.js';
import { SKILLS } from '../data/progression.js';
import { consumeKnowledgeForOrder } from './knowledge.js';
import { DIAGNOSTIC_CASES } from '../data/v08.js';
import { COMPANY_ORDER_TEMPLATES_V161 } from '../data/v161.js';
import { ORDER_TEST_PROTOCOLS_V13, REPAIR_APPROACHES_V13 } from '../data/v13.js';
import { ensureV08, recordOrderOutcome } from './v08.js';
import { activeAdvertisingBonuses, companyRevenueShare } from '../data/advertising-v162.js';
import { activeCampaignIds, recordAdvertisingLead, recordAdvertisingOrder } from './advertising.js';
import { DIAGNOSTIC_CASES_V166, REFRESH_ORDERS_PENALTY_V166, orderTaskTypeIdV166 } from '../data/v166.js';
import { deadlineForOrderV166, ensureV166, refreshCooldownRemainingV166, reviewTextV166, targetAvailableOrdersV166 } from './v166.js';
import { RELATED_ORDER_SKILLS_V169 } from '../data/v169.js';
import { energyErrorPenalty } from './v169.js';
import { canAcceptAtWorkstationV180, difficultyModeV180, enrichOrderV180, orderWorkModeV180, proposeQuoteV180, registerOrderOutcomeV180 } from './v180.js';
import { applyClientArchetypeV182, clientArchetypeV182, specializationPerkV182 } from './v182.js';

const ORDER_POOL = [...COMPANY_ORDER_TEMPLATES_V161, ...ALL_ORDERS, ...EXTRA_ORDERS, ...ADV_ORDERS, ...EXTRA_2000S_ORDERS];
const DIFFICULTY_RANK = { easy:1, medium:2, hard:3, epic:4 };
const LABOR_BASE_V166 = { easy:120, medium:280, hard:550, epic:1100 };
function shuffled(items=[]) {
  const copy=[...items];
  for(let i=copy.length-1;i>0;i-=1){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy;
}
function materialCostForOrder(game,order) {
  return (order.items||[]).filter(item=>item.use!==false).reduce((sum,item)=>{
    const component=ALL_COMPONENTS.find(part=>part.id===item.id);
    return sum+(component?componentPrice(game,component)*Number(item.q||1):0);
  },0);
}
function applyOrderEconomics(game,order) {
  const materials=Math.max(0,Math.round(materialCostForOrder(game,order)));
  const labor=Math.max(30,Math.round((LABOR_BASE_V166[order.difficulty]||180)*getInflation(game)*(order.onSite?1.2:1)));
  const floor=materials+labor;
  const margin=Math.max(10,randomInt(Math.max(10,Math.round(labor*.15)),Math.max(15,Math.round(labor*.65))));
  const target=floor+margin;
  order.reward=Math.max(floor,Math.min(Math.max(0,Number(order.reward||0)),target));
  if(order.reward===floor) order.reward=target;
  order.estimatedMaterialCost=materials;
  order.serviceFee=labor;
  order.estimatedProfit=Math.max(0,Math.round(order.reward-materials));
  return order;
}
function caseForOrder(order) {
  const typeId=orderTaskTypeIdV166(order);
  const pool=DIAGNOSTIC_CASES_V166[typeId]||DIAGNOSTIC_CASES.default||[];
  const diagnostic=structuredClone(pick(pool));
  if(diagnostic?.choices) diagnostic.choices=shuffled(diagnostic.choices);
  return diagnostic;
}
function candidateGap(game,template) {
  const gaps=Object.entries(template.skills||{}).map(([id,required])=>Math.max(0,Number(required||0)-skillLevel(game,id)));
  return gaps.length?Math.max(...gaps):0;
}
function chooseCandidateV166(game,candidates,slot,target) {
  const ratio=(slot+1)/Math.max(1,target);
  const desired=ratio<=.60?'ready':ratio<=.85?'near':'stretch';
  const pools={
    ready:candidates.filter(item=>candidateGap(game,item)<=0),
    near:candidates.filter(item=>candidateGap(game,item)>0&&candidateGap(game,item)<=2),
    stretch:candidates.filter(item=>candidateGap(game,item)>2)
  };
  const pool=pools[desired].length?pools[desired]:candidates;
  return pool[Math.floor(Math.random()*pool.length)];
}

function scaledOrderSkills(game,template) {
  const primary={...(template.skills||{})};
  const yearStage=Math.max(0,Math.floor((Number(game.calendar?.year||2000)-2000)/3));
  const rank=DIFFICULTY_RANK[template.diff||'easy']||1;
  const minimum={};
  for (const [id,required] of Object.entries(primary)) minimum[id]=Math.max(1,Number(required||0)+Math.floor(yearStage/2));
  const main=Object.entries(primary).sort((a,b)=>Number(b[1])-Number(a[1]))[0]?.[0];
  if(main && rank>=2){
    for(const related of RELATED_ORDER_SKILLS_V169[main]||[]){
      if(minimum[related]==null) minimum[related]=Math.max(1,Math.min(4,rank-1+Math.floor(yearStage/3)));
    }
  }
  const recommended=Object.fromEntries(Object.entries(minimum).map(([id,value])=>[id,Math.min(12,Number(value)+2+Math.floor(yearStage/2))]));
  return {minimum,recommended};
}

function premiumReach(game, scope='personal') { return Math.max(0, Number(activeAdvertisingBonuses(game,scope).premiumBonus || 0)); }
function weightedCandidateIndex(game, candidates) {
  const weights = candidates.map((template) => {
    const scope=template.businessType?'company':'personal';
    const premium = premiumReach(game,scope);
    const rank = DIFFICULTY_RANK[template.diff || 'easy'] || 1;
    const clientBoost = ['medium_biz','corporate','enterprise'].includes(template.clientTier) ? 1.7 : template.clientTier === 'small_biz' ? 1.25 : 1;
    return Math.max(1, 10 + premium * 150 * rank * clientBoost);
  });
  const total = weights.reduce((sum, value) => sum + value, 0);
  let cursor = Math.random() * total;
  for (let index = 0; index < weights.length; index += 1) {
    cursor -= weights[index];
    if (cursor <= 0) return index;
  }
  return Math.max(0, candidates.length - 1);
}

function orderClient(game, template) {
  ensureV08(game);
  const tier = CLIENT_TIERS.find((item) => item.id === template.clientTier) || CLIENT_TIERS[0];
  const records = Object.values(game.clients.records || {}).filter(client => client.tierId === tier.id);
  const returning = records.length && chance(Math.min(.62, .18 + records.length * .04)) ? pick(records) : null;
  if (returning) {
    const returningArchetype=clientArchetypeV182(returning);
    return applyClientArchetypeV182({ ...returning, tierName:tier.name, icon:'CL', message:pick(tier.msgs||['Снова нужна помощь']), payMult:Number(tier.payMult||1)*(1+Number(returning.trust||40)*.0025)*Number(returningArchetype.payMult||1), returning:true });
  }
  const id=uid('client');
  const client=applyClientArchetypeV182({ id, tierId:tier.id, tierName:tier.name, icon:'CL', name:pick(tier.names||['Клиент']), message:pick(tier.msgs||['Нужна помощь с компьютером']), patience:tier.patience||8, payMult:tier.payMult||1, trust:40, orders:0, firstYear:game.calendar.year, lastYear:game.calendar.year, history:[], averageRating:0, priceSensitivity:Number((.78+Math.random()*.42).toFixed(2)), preference:tier.id==='student'?'economy':['small_biz','medium_biz','corporation'].includes(tier.id)?'reliable':'standard' });
  game.clients.records[id]={...client};
  return client;
}

function rewardFor(game, template, client) {
  const range = template.rewardBase || [template.reward || 200, template.reward || 500];
  const marketReward = Number(game.market?.activeEvent?.reward || 1);
  const scope=template.businessType?'company':'personal';
  const perk=specializationPerkV182(game);
  const primarySkill=Object.entries(template.skills||{}).sort((a,b)=>Number(b[1])-Number(a[1]))[0]?.[0];
  const specIncome=primarySkill===perk.skill ? 1+Number(perk.incomeBonus||0) : 1;
  const gross=randomInt(range[0], range[1]) * getInflation(game) * .45 * client.payMult * (1 + incomeBonus(game,scope)) * marketReward * difficultyModeV180(game).income * specIncome;
  const net=scope==='company'?gross*companyRevenueShare(game):gross;
  return Math.max(30, Math.round(net));
}

function templateAvailable(game, template) {
  if ((template.fromYear || 2000) > game.calendar.year) return false;
  if (template.toYear && game.calendar.year > template.toYear) return false;
  if (template.businessType && (!game.business?.opened || game.business.typeId !== template.businessType)) return false;
  const scope=template.businessType?'company':'personal';
  if ((template.minRep || 0) > game.player.reputation + 120 + Math.round(premiumReach(game,scope) * 650)) return false;
  return true;
}

function createStandardOrder(game, template) {
  const client = orderClient(game, template);
  const skillProfile = scaledOrderSkills(game, template);
  const order = {
    uid: uid('order'),
    templateId: template.id,
    name: template.name,
    icon: template.icon || '',
    description: client.message,
    client,
    difficulty: template.diff || 'easy',
    reward: rewardFor(game, template, client),
    energy: template.energy || 8,
    workDays: Math.max(1, Math.ceil((template.time || 2) / workSpeed(game))),
    skills: skillProfile.minimum,
    recommendedSkills: skillProfile.recommended,
    skillXp: template.skillXP || {},
    items: template.items || [],
    xp: template.xp || 10,
    reputation: template.rep || 2,
    baseChance: template.chance ?? 0.9,
    onSite: Boolean(template.onSite),
    status: 'available',
    deadlineDays: Math.max(3, client.patience * 2),
    diagnosis: null,
    diagnosticCase: null,
    orderType: template.orderType || (template.onSite ? 'onsite' : template.diff === 'epic' ? 'corporate' : chance(.16) ? 'urgent' : 'standard'),
    createdAt: { ...game.calendar },
    businessType: template.businessType || null,
    advertisingCampaignIds: activeCampaignIds(game,template.businessType?'company':'personal')
  };
  if(order.advertisingCampaignIds.length)recordAdvertisingLead(game,order.advertisingCampaignIds);
  order.taskTypeId = orderTaskTypeIdV166(order);
  order.diagnosticCase = caseForOrder(order);
  const premium = premiumReach(game,order.businessType?'company':'personal');
  const rank = DIFFICULTY_RANK[order.difficulty] || 1;
  if (order.orderType === 'standard' && premium > 0 && chance(Math.min(.32, premium * .55))) {
    order.orderType = rank >= 3 ? 'corporate' : 'urgent';
  }
  if (order.orderType === 'urgent') { order.reward = Math.round(order.reward * 1.2); }
  if (order.orderType === 'corporate') { order.reward = Math.round(order.reward * 1.2); order.reputation += 2; }
  return enrichOrderV180(applyOrderEconomics(game,order));
}

function compatibleBuildParts(game, tier) {
  const available = ALL_COMPONENTS.filter((part) => part.fromYear <= game.calendar.year && (!part.toYear || part.toYear >= game.calendar.year - 1));
  const tierRange = [[1, 1], [1, 2], [2, 3], [3, 4], [4, 5]][tier.tier - 1] || [1, 2];
  const byTier = (cat) => available.filter((part) => part.cat === cat && (part.tier || 1) >= tierRange[0] && (part.tier || 1) <= tierRange[1]);
  const cpu = pick(byTier('cpu'));
  if (!cpu) return null;
  const boards = byTier('mb').filter((part) => part.mbSocket === cpu.socket || part.socket === cpu.socket);
  const mb = pick(boards.length ? boards : available.filter((part) => part.cat === 'mb' && (part.mbSocket === cpu.socket || part.socket === cpu.socket)));
  if (!mb) return null;
  const ram = pick(byTier('ram').filter((part) => !mb.ramType || part.ramType === mb.ramType));
  const storage = pick(byTier('storage'));
  const psu = pick(byTier('psu'));
  if (!ram || !storage || !psu) return null;
  const gpu = pick(byTier('gpu'));
  const casePart = pick(byTier('case'));
  const cool = pick(byTier('cool'));
  return [cpu, mb, ram, storage, psu, gpu, casePart, cool].filter(Boolean);
}

function createBuildOrder(game) {
  const possible = BUILD_TIERS.filter((tier) => game.player.reputation >= tier.minRep && requirementsMet(game, tier.skillReq));
  const tier = possible.length ? pick(possible) : BUILD_TIERS[0];
  const parts = compatibleBuildParts(game, tier);
  if (!parts) return null;
  const template = {
    id: tier.id,
    name: tier.name,
    icon: tier.icon,
    diff: tier.diff,
    clientTier: tier.tier >= 4 ? 'medium_biz' : tier.tier >= 3 ? 'small_biz' : 'home',
    rewardBase: [Math.round(parts.reduce((sum, part) => sum + part.buyBase, 0) * 1.2), Math.round(parts.reduce((sum, part) => sum + part.buyBase, 0) * 1.5)],
    energy: tier.energyBase,
    time: tier.timeBase,
    skills: tier.skillReq,
    skillXP: { hardware: tier.repBase },
    xp: tier.repBase * 2,
    rep: Math.round(tier.repBase / 4),
    chance: 0.88 - (tier.tier - 1) * 0.07,
    items: parts.map((part) => ({ id: part.id, q: 1, use: true }))
  };
  const order = createStandardOrder(game, template);
  order.isBuild = true;
  order.description = `Нужно подобрать и собрать совместимую конфигурацию уровня «${tier.name}».`;
  return order;
}

function createRecoveryOrderV182(game){
  const template={
    id:'v182_recovery_gig',name:'Срочная домашняя настройка',icon:'',diff:'easy',clientTier:'home',
    rewardBase:[320,520],energy:6,time:1,skills:{},skillXP:{communication:8,software:8},xp:10,rep:1,chance:.98,items:[]
  };
  const order=createStandardOrder(game,template);
  order.description='Простая заявка без покупки материалов. Подходит, чтобы восстановиться после неудачной серии.';
  order.recoveryOrder=true;
  order.orderType='standard';
  order.workMode='quick';
  order.stationId='diagnostic';
  return order;
}

export function refreshOrders(game, force = false) {
  ensureV166(game);
  ensureV08(game);
  const target=targetAvailableOrdersV166(game);
  for(const order of [...game.orders.available,...game.orders.active]){
    order.taskTypeId=orderTaskTypeIdV166(order);
    applyOrderEconomics(game,order);
    if(order.status==='diagnosis'&&(!order.diagnosticCase?.story||!order.diagnosticCase?.evidence))order.diagnosticCase=caseForOrder(order);
  }
  if (!force && game.orders.available.length >= Math.max(3,target-1)) return;
  const existing=new Set([...game.orders.available,...game.orders.active].map(order=>order.templateId));
  const candidates=ORDER_POOL.filter(template=>templateAvailable(game,template)&&!existing.has(template.id));
  let guard=0;
  while(game.orders.available.length<target&&candidates.length&&guard<100){
    guard+=1;
    const template=chooseCandidateV166(game,candidates,game.orders.available.length,target);
    const index=candidates.indexOf(template);
    if(index>=0)candidates.splice(index,1);
    const order=createStandardOrder(game,template);
    if(order)game.orders.available.push(order);
  }
  if(game.orders.available.length<target&&skillLevel(game,'hardware')>=2){
    const build=createBuildOrder(game);
    if(build)game.orders.available.push(build);
  }
  const hasReady=game.orders.available.some((item)=>candidateGap(game,item)<=0&&missingOrderItems(game,item).length===0);
  const needsSafetyNet=Number(game.player?.cash||0)<1200||(!hasReady&&!game.orders.active.length);
  if(needsSafetyNet&&!game.orders.available.some((item)=>item.templateId==='v182_recovery_gig'))game.orders.available.unshift(createRecoveryOrderV182(game));
  game.orders.available=game.orders.available.slice(0,10);
}

export function manualRefreshOrders(game) {
  ensureV166(game);
  const cooldown=refreshCooldownRemainingV166(game);
  if(cooldown>0)return {ok:false,message:`Новые заявки можно запросить через ${Math.ceil(cooldown)} ч.`};
  const discarded=game.orders.available.length;
  game.orders.available=[];
  game.player.reputation=Math.max(0,Number(game.player.reputation||0)-REFRESH_ORDERS_PENALTY_V166.reputation);
  game.orders.refreshMeta.count+=1;
  game.orders.refreshMeta.discarded+=discarded;
  advanceHours(game,REFRESH_ORDERS_PENALTY_V166.hours,{activity:'productive',reason:'Поиск новых заявок'});
  game.orders.refreshMeta.lastRefreshTotalHours=Number(game.calendar.totalHours||0);
  refreshOrders(game,true);
  addLog(game,`Вы отказались от ${discarded} заявок: репутация −${REFRESH_ORDERS_PENALTY_V166.reputation}, прошло ${REFRESH_ORDERS_PENALTY_V166.hours} ч.`,'warning');
  return {ok:true,message:`Заявки обновлены · −${REFRESH_ORDERS_PENALTY_V166.reputation} репутации · ${REFRESH_ORDERS_PENALTY_V166.hours} ч.`};
}

export function acceptOrder(game, orderUid) {
  if (game.orders.active.length >= maxActiveOrders(game)) {
    const limit = maxActiveOrders(game);
    return {
      ok: false,
      code: 'NO_WORKSPACE',
      message: `Общий лимит активных заказов исчерпан: ${game.orders.active.length}/${limit}. Завершите заказ или улучшите помещение.`
    };
  }
  const order = game.orders.available.find((item) => item.uid === orderUid);
  if (!order) return { ok: false, message: 'Заказ уже недоступен' };
  enrichOrderV180(order);
  const stationCheck=canAcceptAtWorkstationV180(game,order);
  if(!stationCheck.ok)return{ok:false,code:'NO_WORKSPACE',message:stationCheck.message};
  if (order.onSite && !getVehicle(game).canVisit) return { ok: false, message: 'Для выездного заказа нужен транспорт' };
  order.status = orderWorkModeV180(order)==='project' ? 'quotation' : 'diagnosis';
  order.projectStage = order.status==='quotation' ? 'quote' : 'diagnosis';
  order.acceptedAt = { ...game.calendar };
  order.acceptedAtTotalHours = Number(game.calendar.totalHours || 0);
  order.deadlineDays = deadlineForOrderV166(order);
  order.initialDeadlineDays = order.deadlineDays;
  game.orders.available = game.orders.available.filter((item) => item.uid !== orderUid);
  game.orders.active.push(order);
  addLog(game, `Принят заказ «${order.name}» от ${order.client.name}.`, 'info');
  refreshOrders(game);
  return { ok: true, message: order.status==='quotation' ? 'Проект принят. Согласуйте смету с клиентом.' : 'Заказ принят' , needsQuote:order.status==='quotation' };
}

export function diagnoseOrder(game, orderUid, choiceId = null) {
  const order = game.orders.active.find((item) => item.uid === orderUid);
  if (!order || order.status !== 'diagnosis') return { ok: false, message: 'Диагностика недоступна' };
  if (!choiceId) return { ok:false, code:'NEED_DIAGNOSIS_CHOICE', message:'Выберите диагностическое действие' };
  const diagnosisPerk=specializationPerkV182(game);
  const diagnosisPrimary=Object.entries(order.skills||{}).sort((a,b)=>Number(b[1])-Number(a[1]))[0]?.[0];
  const diagnosisEnergy=Math.max(1,Math.round(4*difficultyModeV180(game).energyCost*(diagnosisPrimary===diagnosisPerk.skill?1-Number(diagnosisPerk.energyDiscount||0):1)));
  if (game.player.energy < diagnosisEnergy) return { ok: false, message: 'Недостаточно энергии' };
  const diagnostic = order.diagnosticCase || caseForOrder(order);
  const choice = diagnostic.choices.find(item=>item.id===choiceId);
  if(!choice) return {ok:false,message:'Вариант диагностики не найден'};
  game.player.energy -= diagnosisEnergy;
  const skillTotal = Object.keys(order.skills).reduce((sum, id) => sum + skillLevel(game,id), 0);
  const skillAssist = Math.min(.18, skillTotal*.015);
  const fatiguePenalty = energyErrorPenalty(game.player.energy);
  const quality = choice.correct
    ? Math.max(.1, Math.min(1,.78+skillAssist+Math.random()*.08-fatiguePenalty))
    : Math.max(.05, Math.min(.58,.24+skillAssist+Math.random()*.12-fatiguePenalty*.7));
  order.diagnosis = { quality, fatiguePenalty, correct:Boolean(choice.correct), choiceId, text:`${choice.why} ${choice.correct?'Причина определена верно.':'Это правдоподобный, но неверный первый шаг: возрастёт риск повторной поломки и снижения оценки.'}` };
  order.diagnosisPenalty = choice.correct ? 0 : .14;
  order.status = 'solution';
  order.projectStage = order.workMode==='project' ? 'estimate' : 'quick';
  addLog(game, `Диагностика «${order.name}»: ${order.diagnosis.text}`, choice.correct ? 'success' : 'warning');
  return { ok: true, message: order.diagnosis.text, correct:choice.correct };
}

export function chooseRepairApproach(game, orderUid, approachId) {
  const order = game.orders.active.find(item => item.uid === orderUid);
  if (!order || order.status !== 'solution') return { ok:false, message:'Сначала завершите диагностику' };
  const approach = REPAIR_APPROACHES_V13.find(item => item.id === approachId);
  if (!approach) return { ok:false, message:'Подход к ремонту не найден' };
  const extraCost = Math.max(0, Math.round(Number(order.reward || 0) * Number(approach.cost || 0) * .22));
  if (extraCost > 0 && game.player.cash < extraCost) return { ok:false, message:`На премиальные материалы нужно ${extraCost.toLocaleString('ru-RU')} руб.` };
  if (extraCost > 0) addMoney(game, -extraCost, `Подготовка ремонта: ${approach.name}`);
  const riskMap={economy:.18,balanced:.07,careful:.025,premium:.015};
  const reviewPenaltyMap={economy:.8,balanced:.1,careful:-.2,premium:-.35};
  order.repairApproach = { ...approach, extraCost, failureRisk:riskMap[approach.id]??.07, reviewPenalty:reviewPenaltyMap[approach.id]??0 };
  order.workDays = Math.max(1, Math.ceil(Number(order.workDays || 1) / Math.max(.5, Number(approach.speed || 1))));
  if (approach.id === 'economy') order.reward = Math.round(order.reward * 1.04);
  order.status = 'repair';
  order.projectStage = order.workMode==='project' ? 'procurement' : 'quick';
  addLog(game, `Для заказа «${order.name}» выбран подход: ${approach.name}.`, 'info');
  return { ok:true, message:`Выбрано: ${approach.name}` };
}

export function orderByUid(game, orderUid) {
  return [...game.orders.available, ...game.orders.active].find((item) => item.uid === orderUid) || null;
}

export function orderItemDetails(game, order) {
  return (order?.items || []).map((requirement) => {
    const component = ALL_COMPONENTS.find((item) => item.id === requirement.id);
    const required = Number(requirement.q || 1);
    const inventoryOwned = Number(game.inventory[requirement.id] || 0);
    const alreadyConsumed = Boolean(order?.materialsConsumed && requirement.use !== false);
    const owned = alreadyConsumed ? required : inventoryOwned;
    return {
      ...requirement,
      component,
      required,
      owned,
      missing: alreadyConsumed ? 0 : Math.max(0, required - inventoryOwned),
      consumable: requirement.use !== false,
      alreadyConsumed
    };
  }).filter((item) => item.component);
}

export function missingOrderItems(game, order) {
  return orderItemDetails(game, order).filter((item) => item.missing > 0).map((item) => ({ ...item, id: item.component.id, q: item.missing }));
}

export function orderCartTotal(game, order) {
  return missingOrderItems(game, order).reduce((sum, item) => sum + componentPrice(game, item.component) * item.missing, 0);
}

export function buyMissingOrderItems(game, orderUid) {
  const order = orderByUid(game, orderUid);
  if (!order) return { ok: false, message: 'Заказ не найден' };
  const missing = missingOrderItems(game, order);
  if (!missing.length) return { ok: true, message: 'Все материалы уже на складе' };
  const total = orderCartTotal(game, order);
  if (game.player.cash < total) return { ok: false, message: `Для корзины нужно ${total.toLocaleString('ru-RU')} руб.` };
  for (const item of missing) {
    const result = buyComponent(game, item.id, item.missing);
    if (!result.ok) return result;
  }
  addLog(game, `Куплены материалы для заказа «${order.name}».`, 'success');
  return { ok: true, message: `Корзина куплена: ${missing.length} поз.` };
}

export function completeOrder(game, orderUid) {
  const order = game.orders.active.find((item) => item.uid === orderUid);
  if (!order || !['repair', 'queued', 'working'].includes(order.status)) return { ok: false, message: 'Сначала выполните диагностику' };
  if (!requirementsMet(game, order.skills)) return { ok: false, message: 'Недостаточно навыков' };
  const missing = missingOrderItems(game, order);
  if (missing.length) return { ok: false, code: 'MISSING_ITEMS', message: `Не хватает: ${missing.map((item) => `${item.component.name} ×${item.missing}`).join(', ')}` };

  order.status = 'working';
  order.progressDays = 0;
  order.totalWorkDays = orderWorkModeV180(order)==='project' ? Math.max(2,Number(order.workDays||2)) : 0;
  order.projectStage = orderWorkModeV180(order)==='project' ? 'work' : 'quick';
  game.activity ||= {};
  game.activity.resting = false;
  game.activity.idleDays = 0;
  game.activity.idlePromptShownAt = 0;
  game.activity.lastMessage = `Работа: ${order.name}`;

  // Крупные проекты выполняются во времени. Быстрые заказы завершают ремонтный этап сразу.
  let result={ok:true,message:`Проект запущен: ${order.totalWorkDays} дн.`,needsTest:false};
  if(orderWorkModeV180(order)!=='project'){
    result = finishOrderWork(game, orderUid);
    if (!result.ok) return result;
  }
  if (!order.knowledgeConsumed) {
    const consumed = consumeKnowledgeForOrder(game, order.skills || {});
    if (!consumed.ok) return { ok:false, code:'MISSING_KNOWLEDGE', message:consumed.message };
    order.knowledgeConsumed = consumed.spent;
    order.knowledgeShortage = consumed.shortage || {};
    order.knowledgeShortageTotal = Number(consumed.totalShortage || 0);
    const names = Object.fromEntries(SKILLS.map((item) => [item.id, item.name]));
    const spentText = Object.entries(consumed.spent).map(([id, row]) => `${names[id] || id} −${row.total}`).join(' · ');
    addLog(game, `Заказ «${order.name}»: израсходованы знания — ${spentText}.`, 'warning');
    if (order.knowledgeShortageTotal > 0) {
      const penalty = Math.min(0.2, order.knowledgeShortageTotal * 0.04);
      const rewardPenalty = Math.min(0.15, order.knowledgeShortageTotal * 0.03);
      order.repairResult ||= {};
      order.repairResult.baseProbability = Math.max(0.05, Number(order.repairResult.baseProbability || order.baseChance || 0.8) - penalty);
      order.reward = Math.max(0, Math.round(Number(order.reward || 0) * (1 - rewardPenalty)));
      const shortageText = Object.entries(order.knowledgeShortage).map(([id, amount]) => `${names[id] || id} −${amount}`).join(' · ');
      addLog(game, `Для заказа «${order.name}» не хватило быстрых знаний: ${shortageText}. Шанс успеха и оплата немного снижены.`, 'info');
    }
  }
  const names = Object.fromEntries(SKILLS.map((item) => [item.id, item.name]));
  const spentText = Object.entries(order.knowledgeConsumed || {}).map(([id, row]) => `${names[id] || id} −${row.total}`).join(' · ');
  const shortageText = Object.entries(order.knowledgeShortage || {}).map(([id, amount]) => `${names[id] || id} −${amount}`).join(' · ');
  return orderWorkModeV180(order)==='project'
    ? { ...result, message:`Проект запущен на ${order.totalWorkDays} дн. ${spentText ? `Израсходовано: ${spentText}.` : ''}` }
    : { ...result, message:`Ремонт выполнен моментально. ${spentText ? `Израсходовано: ${spentText}. ` : ''}${shortageText ? `Быстрых знаний не хватило: ${shortageText}. ` : ''}Выберите протокол тестирования.` };
}

export function finishOrderWork(game, orderUid) {
  const order = game.orders.active.find(item => item.uid === orderUid);
  if (!order || order.status !== 'working') return { ok:false, message:'Работа не запущена' };
  const missing = missingOrderItems(game, order);
  if (missing.length && !order.materialsConsumed) {
    order.status = 'repair';
    return { ok:false, message:'Материалы закончились до завершения работы' };
  }
  if (!order.materialsConsumed) {
    for (const item of order.items || []) {
      if (item.use === false) continue;
      game.inventory[item.id] -= item.q || 1;
      if (game.inventory[item.id] <= 0) delete game.inventory[item.id];
    }
    order.materialsConsumed = true;
  }

  const targetSkills=order.recommendedSkills||order.skills||{};
  const skillAdvantage = Object.entries(targetSkills).reduce((sum, [id, required]) => sum + Math.max(-4, Math.min(4, skillLevel(game,id) - required)), 0);
  const diagnosticBonus = Number(order.diagnosis?.quality || 0) * .1;
  const approachBonus = Number(order.repairApproach?.quality || 0) + Number(order.quoteQuality || 0);
  const employee = game.business?.employees?.find(item => item.id === order.assignedEmployeeId);
  const employeeBonus = employee ? Math.min(.18, Number(employee.level || 1) * .015 + .03) : 0;
  const fatiguePenalty = employee ? 0 : energyErrorPenalty(game.player.energy);
  const perk=specializationPerkV182(game);
  const primarySkill=Object.entries(targetSkills).sort((a,b)=>Number(b[1])-Number(a[1]))[0]?.[0];
  const specializationBonus=primarySkill===perk.skill?Number(perk.orderBonus||0):0;
  const toolBonus=successBonus(game);
  const diagnosisPenalty=Number(order.diagnosisPenalty||0);
  const approachRisk=Number(order.repairApproach?.failureRisk||0);
  const baseProbability=Math.max(.08,Math.min(.97, order.baseChance + skillAdvantage * .025 + diagnosticBonus + approachBonus + toolBonus + employeeBonus + specializationBonus - fatiguePenalty - diagnosisPenalty - approachRisk));
  order.repairResult = {
    baseProbability,
    skillAdvantage,
    fatiguePenalty,
    finishedAt:{...game.calendar},
    breakdown:[
      {id:'base',label:'Базовая сложность',value:Number(order.baseChance||0)},
      {id:'skills',label:'Навыки героя',value:skillAdvantage*.025},
      {id:'diagnosis',label:'Диагностика',value:diagnosticBonus-diagnosisPenalty},
      {id:'approach',label:'Подход и смета',value:approachBonus-approachRisk},
      {id:'tools',label:'Инструменты и рабочее место',value:toolBonus},
      {id:'employee',label:'Помощь сотрудника',value:employeeBonus},
      {id:'specialization',label:`Специализация: ${perk.name}`,value:specializationBonus},
      {id:'fatigue',label:'Усталость и низкая энергия',value:-fatiguePenalty}
    ]
  };
  order.status = 'testing';
  order.projectStage = 'testing';
  order.progressDays = order.totalWorkDays || order.workDays || 1;
  addLog(game, `Ремонт «${order.name}» завершён. Требуется контрольное тестирование.`, 'info');
  return { ok:true, message:'Ремонт завершён — выберите протокол тестирования', needsTest:true };
}

function finalizeTestedOrder(game, order, succeeded, quality, protocol) {
  if (succeeded) {
    addMoney(game, order.reward, `Заказ: ${order.name}`);
    if(order.advertisingCampaignIds?.length)recordAdvertisingOrder(game,order.advertisingCampaignIds,order.reward);
    const outcomePerk=specializationPerkV182(game);
    const outcomePrimary=Object.entries(order.skills||{}).sort((a,b)=>Number(b[1])-Number(a[1]))[0]?.[0];
    const specializationReputation=outcomePrimary===outcomePerk.skill?Number(outcomePerk.reputationBonus||0):0;
    game.player.reputation += Math.max(1, Math.round(order.reputation * (1 + reputationBonus(game,order.businessType?'company':'personal') + specializationReputation)));
    const playerXpGained=Math.round(order.xp * (1 + skillXpBonus(game)));
    addPlayerXp(game, playerXpGained, 'work', `Заказ «${order.name}»`);
    order.awardedPlayerXp=playerXpGained;
    const fallbackSkillXp = Object.fromEntries(Object.entries(order.skills || {}).map(([skillId,required]) => [skillId, Math.max(12, Number(required || 1) * 6)]));
    const skillRewards = { ...fallbackSkillXp, ...(order.skillXp || {}) };
    order.awardedSkillXp = {};
    for (const [skillId, xp] of Object.entries(skillRewards)) {
      const gained = Math.round(Number(xp || 0) * (1 + skillXpBonus(game)));
      addSkillXp(game, skillId, gained);
      order.awardedSkillXp[skillId] = gained;
    }
    game.stats.ordersDone += 1;
    game.stats.streak += 1;
    game.stats.bestStreak = Math.max(game.stats.bestStreak, game.stats.streak);
    if (order.difficulty === 'epic') game.stats.epicDone += 1;
    if (order.isBuild) game.pc.buildsCompleted += 1;
    order.status = 'completed';
    order.projectStage = 'closed';
    addLog(game, `Заказ «${order.name}» прошёл тестирование и выдан клиенту.`, 'success');
  } else {
    game.player.reputation = Math.max(0, game.player.reputation - Math.max(2, Math.round(order.reputation / 2)));
    game.stats.ordersFailed += 1;
    game.stats.streak = 0;
    order.status = 'failed';
    order.projectStage = 'closed';
    addLog(game, `Тестирование выявило проблему в заказе «${order.name}». Клиент недоволен.`, 'danger');
  }

  order.quality = quality;
  order.testProtocol = protocol.id;
  order.testedAt = { ...game.calendar };
  const hasTimedDeadline = order.orderType === 'warranty' || order.orderType === 'corporate';
  const usedDays=hasTimedDeadline ? Math.max(0,Number(order.initialDeadlineDays||7)-Number(order.deadlineDays||0)) : 0;
  const deadlineRatio=hasTimedDeadline ? Number(order.deadlineDays||0)/Math.max(1,Number(order.initialDeadlineDays||7)) : 1;
  const diagnosisScore=order.diagnosis?.correct?.35:-.75;
  const deadlineScore=hasTimedDeadline ? (deadlineRatio>.45?.35:deadlineRatio>.15?0:-.55) : .15;
  const approachPenalty=Number(order.repairApproach?.reviewPenalty||0);
  const randomMood=(Math.random()-.5)*.6;
  const clientStrictness=Number(clientArchetypeV182(order.client).reviewStrictness||0);
  const rawStars=succeeded?2.25+quality*2.15+diagnosisScore+deadlineScore-approachPenalty-clientStrictness+randomMood:1+Math.random()*.7;
  const stars=Math.max(1,Math.min(5,Math.round(rawStars)));
  const review = {
    id:uid('review'), orderUid:order.uid, clientId:order.client?.id,
    clientName:order.client?.name || 'Клиент', stars,
    text:reviewTextV166(order,stars),
    usedDays,
    at:{...game.calendar}
  };
  game.orders.reviews ||= [];
  game.orders.reviews.unshift(review);
  game.orders.reviews = game.orders.reviews.slice(0, 100);
  game.orders.qualityHistory ||= [];
  game.orders.qualityHistory.unshift({ orderUid:order.uid, quality, stars, at:{...game.calendar} });
  game.orders.qualityHistory = game.orders.qualityHistory.slice(0, 100);
  if (stars >= 4) game.stats.reviewsPositive = Number(game.stats.reviewsPositive || 0) + 1;
  else game.stats.reviewsNegative = Number(game.stats.reviewsNegative || 0) + 1;
  game.stats.testsCompleted = Number(game.stats.testsCompleted || 0) + 1;

  recordOrderOutcome(game, order, succeeded);
  registerOrderOutcomeV180(game,order,succeeded,stars);
  if (order.assignedEmployeeId) {
    const emp = game.business?.employees?.find(item => item.id === order.assignedEmployeeId);
    if (emp) {
      emp.currentOrderUid = null;
      emp.completedOrders = Number(emp.completedOrders || 0) + 1;
      emp.experience = Number(emp.experience || 0) + (succeeded ? 12 : 4);
      if (succeeded) {
        emp.level = Math.min(10, Number(emp.level || 1) + .08);
        emp.morale = Math.min(100, Number(emp.morale || 75) + 2);
      } else {
        emp.errors = Number(emp.errors || 0) + 1;
        emp.morale = Math.max(0, Number(emp.morale || 75) - 6);
      }
    }
  }
  order.actualMaterialCost=Number(order.estimatedMaterialCost||materialCostForOrder(game,order));
  order.actualProfit=succeeded?Math.max(0,Math.round(Number(order.reward||0)-order.actualMaterialCost-Number(order.repairApproach?.extraCost||0)-Number(protocol.cost||0))):0;
  game.orders.active = game.orders.active.filter(item => item.uid !== order.uid);
  game.orders.history.unshift({ ...order, review, finishedAt:{...game.calendar} });
  game.orders.history = game.orders.history.slice(0, 120);
  refreshOrders(game, true);
  const skillNames = Object.fromEntries(SKILLS.map(item => [item.id,item.name]));
  const xpText = succeeded ? Object.entries(order.awardedSkillXp || {}).map(([id,xp]) => `${skillNames[id] || id} +${xp} XP`).join(' · ') : '';
  return { ok:true, message:succeeded ? `Заказ выполнен. Уровень: +${order.awardedPlayerXp||0} XP · ${xpText || 'профессиональный опыт получен'} · отзыв ${stars}/5` : 'Тест выявил неисправность', succeeded, stars };
}

export function testOrder(game, orderUid, protocolId) {
  const order = game.orders.active.find(item => item.uid === orderUid);
  if (!order || order.status !== 'testing') return { ok:false, message:'Заказ ещё не готов к тестированию' };
  const protocol = ORDER_TEST_PROTOCOLS_V13.find(item => item.id === protocolId);
  if (!protocol) return { ok:false, message:'Протокол тестирования не найден' };
  const testingPerk=specializationPerkV182(game);
  const testingPrimary=Object.entries(order.skills||{}).sort((a,b)=>Number(b[1])-Number(a[1]))[0]?.[0];
  const testingEnergy=Math.max(1,Math.round(Number(protocol.energy||0)*(testingPrimary===testingPerk.skill?1-Number(testingPerk.energyDiscount||0):1)));
  if (game.player.energy < testingEnergy) return { ok:false, message:'Недостаточно энергии для теста' };
  if (protocol.cost > 0 && game.player.cash < protocol.cost) return { ok:false, message:`Для теста нужно ${protocol.cost.toLocaleString('ru-RU')} руб.` };
  game.player.energy -= testingEnergy;
  if (protocol.cost > 0) addMoney(game, -protocol.cost, `Тестирование: ${protocol.name}`);
  const probability = Math.min(.995, Number(order.repairResult?.baseProbability || order.baseChance || .8) + Number(protocol.quality || 0));
  const succeeded = chance(probability);
  const quality = Math.max(0, Math.min(1, probability + (succeeded ? randomInt(0,8)/100 : -randomInt(15,35)/100)));
  const clientType=clientArchetypeV182(order.client);
  order.qualityReport={
    probability,
    quality,
    succeeded,
    protocol:{id:protocol.id,name:protocol.name,value:Number(protocol.quality||0)},
    clientType:{id:clientType.id,name:clientType.name,desc:clientType.desc},
    factors:[...(order.repairResult?.breakdown||[]),{id:'testing',label:`Тестирование: ${protocol.name}`,value:Number(protocol.quality||0)}]
  };
  return finalizeTestedOrder(game, order, succeeded, quality, protocol);
}

export function abandonOrder(game, orderUid) {
  const order = game.orders.active.find((item) => item.uid === orderUid);
  if (!order) return { ok: false, message: 'Заказ не найден' };
  game.orders.active = game.orders.active.filter((item) => item.uid !== orderUid);
  const review={id:uid('review'),orderUid:order.uid,clientId:order.client?.id,clientName:order.client?.name||'Клиент',stars:1,text:'Мастер принял устройство, а потом отказался. Пришлось срочно искать другой сервис.',at:{...game.calendar}};
  game.orders.history.unshift({ ...order, status: 'abandoned', review, finishedAt: { ...game.calendar } });
  game.player.reputation = Math.max(0, game.player.reputation - 2);
  game.stats.ordersFailed += 1;
  game.stats.streak = 0;
  addLog(game, `Вы отказались от заказа «${order.name}».`, 'warning');
  refreshOrders(game, true);
  return { ok: true, message: 'Заказ отменён' };
}
