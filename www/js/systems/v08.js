import { uid, clamp, chance, pick, randomInt } from '../core/utils.js';
import { companyRevenueShare } from '../data/advertising-v162.js';
import { addLog, addMoney, addPlayerXp, addSkillXp, requirementsMet, skillLevel } from './progression.js';
import { pcConflicts, pcPower } from './pc.js';
import { ALL_COMPONENTS } from '../data/components.js';
import { SKILLS } from '../data/progression.js';
import {
  ACTIVITY_PLANS, ADVANCED_SPECIALIZATIONS_V08, CHALLENGES_V08, CITY_POINTS_V08,
  COMPETITORS_V08, CONTRACT_TEMPLATES_V08, DECISION_EVENTS_V08, EMPLOYEE_TEMPLATES_V08,
  ENDINGS_V08, GAME_MODES, STORY_CHAPTERS_V08
} from '../data/v08.js';
import { EMPLOYEE_TRAITS_V13 } from '../data/v13.js';
import { COMPANY_CONTRACT_TEMPLATES_V161, COMPANY_EMPLOYEE_TEMPLATES_V161 } from '../data/v161.js';
import { companyCapacity, ensureV165 } from './v165.js';
import { employeeRoleV180 } from './v180.js';
import { specializationPerkV182 } from './v182.js';


function eventMonthKey(game) {
  return `${Number(game.calendar?.year || 2000)}-${Number(game.calendar?.month || 1)}`;
}

function scheduleMonthlyEvent(game) {
  const key = eventMonthKey(game);
  const currentDay = Math.max(1, Math.min(30, Number(game.calendar?.day || 1)));
  const earliest = currentDay <= 2 ? 3 : Math.min(29, currentDay + 1);
  const latest = Math.max(earliest, 29);
  game.world.eventSchedule = {
    monthKey:key,
    day:randomInt(earliest, latest),
    triggered:Boolean(game.world.activeEvent)
  };
  return game.world.eventSchedule;
}

export const EMPLOYEE_POOL_V161 = [...EMPLOYEE_TEMPLATES_V08, ...COMPANY_EMPLOYEE_TEMPLATES_V161];
export const CONTRACT_POOL_V161 = [...CONTRACT_TEMPLATES_V08, ...COMPANY_CONTRACT_TEMPLATES_V161];

export function ensureV08(game) {
  game.mode ||= { id:'campaign', challengeId:null, completed:false };
  game.activity ||= {};
  game.activity.plan ||= 'balanced';
  game.activity.courseProgress = Number(game.activity.courseProgress||0);
  game.clients ||= { records:{}, repeatOrders:0, referrals:0 };
  game.clients.records ||= {};
  game.business ||= {
    companyReputation:0, marketShare:8, employees:[], contracts:[], contractOffers:[],
    competitors:COMPETITORS_V08.map(item=>({...item,reputation:randomInt(30,80)})), cityLocation:'home', cityBuff:null
  };
  game.business.employees ||= [];
  game.business.contracts ||= [];
  game.business.contractOffers ||= [];
  game.business.competitors ||= COMPETITORS_V08.map(item=>({...item,reputation:50}));
  game.business.companyReputation = Number(game.business.companyReputation||0);
  game.business.marketShare = Number(game.business.marketShare||8);
  game.finance ||= { current:{income:0,expenses:0}, history:[], lifetimeProfit:0 };
  game.finance.current ||= {income:0,expenses:0};
  game.finance.history ||= [];
  game.marketing ||= {};
  game.marketing.analytics ||= {spend:0,leads:0,orders:0,revenue:0,campaignsStarted:0};
  game.world ||= { activeEvent:null, eventHistory:[], monthCounter:0 };
  game.world.eventHistory ||= [];
  if (!game.world.eventSchedule || game.world.eventSchedule.monthKey !== eventMonthKey(game)) scheduleMonthlyEvent(game);
  if (game.world.activeEvent) game.world.eventSchedule.triggered = true;
  delete game.world.nextEventDay;
  game.specialization ||= { active:null, selectedAt:null };
  game.legacy ||= { points:0, careers:0, rewards:[] };
  game.pc ||= {};
  game.pc.test ||= { status:'not-tested', score:0, temperature:0, stability:0, noise:0 };
  game.pc.builds ||= [];
  game.stats ||= {};
  game.stats.loansTaken = Number(game.stats.loansTaken||0);
  game.stats.warrantyReturns = Number(game.stats.warrantyReturns||0);
  game.stats.clientsRetained = Number(game.stats.clientsRetained||0);
  game.stats.contractMonths = Number(game.stats.contractMonths||0);
  return game;
}

export function gameModeById(id){ return GAME_MODES.find(item=>item.id===id)||GAME_MODES[0]; }
export function challengeById(id){ return CHALLENGES_V08.find(item=>item.id===id)||null; }
export function activityPlan(game){ ensureV08(game); return ACTIVITY_PLANS.find(item=>item.id===game.activity.plan)||ACTIVITY_PLANS[0]; }
export function setActivityPlan(game,id){
  ensureV08(game);
  const plan=ACTIVITY_PLANS.find(item=>item.id===id);
  if(!plan) return {ok:false,message:'Режим не найден'};
  game.activity.plan=id;
  addLog(game,`Распорядок изменён: ${plan.name}.`,'info');
  return {ok:true,message:plan.name};
}

export function advancedSpecialization(game){
  ensureV08(game);
  return ADVANCED_SPECIALIZATIONS_V08.find(item=>item.id===game.specialization.active)||null;
}
export function specializationBonus(game,key){ return Number(advancedSpecialization(game)?.bonus?.[key]||0); }
export function selectAdvancedSpecialization(game,id){
  ensureV08(game);
  const item=ADVANCED_SPECIALIZATIONS_V08.find(entry=>entry.id===id);
  if(!item) return {ok:false,message:'Специализация не найдена'};
  if(game.player.level<item.reqLevel) return {ok:false,message:`Нужен уровень ${item.reqLevel}`};
  if(game.specialization.active && game.specialization.active!==id) return {ok:false,message:'Основная специализация уже выбрана'};
  game.specialization.active=id;
  game.specialization.selectedAt={...game.calendar};
  addLog(game,`Выбрана специализация: ${item.name}.`,'success');
  return {ok:true,message:item.name};
}

export function currentChapter(game){
  return STORY_CHAPTERS_V08.find(ch=>game.calendar.year>=ch.from && game.calendar.year<=ch.to)||STORY_CHAPTERS_V08.at(-1);
}
export function chapterStatus(game){
  const chapter=currentChapter(game);
  const goals=chapter.goals.map(goal=>{const value=Math.max(0,Number(goal.value(game)||0));return {...goal,value,done:value>=goal.target};});
  return {chapter,goals,done:goals.filter(g=>g.done).length,total:goals.length};
}

export function recommendedAction(game){
  ensureV08(game);
  if(game.player.energy<20) return {icon:'',title:'Пора отдохнуть',text:'Низкая энергия увеличивает риск ошибок.',action:'nav-rest'};
  const active=game.orders.active||[];
  if(active.some(o=>o.status==='diagnosis')) return {icon:'?',title:'Провести диагностику',text:'Один из принятых заказов ждёт решения.',action:'open-active-orders'};
  if(active.some(o=>o.status==='repair')) return {icon:'',title:'Запустить подготовленный заказ',text:'Материалы и навыки можно проверить в карточке.',action:'open-active-orders'};
  if(!active.length) return {icon:'▤',title:'Выбрать новый заказ',text:'Свободные рабочие места не приносят доход.',action:'open-orders'};
  if(!game.education.active && !game.education.university) return {icon:'▧',title:'Добавить обучение',text:'Работа и обучение могут идти параллельно.',action:'open-education'};
  if(!game.business.opened && game.player.level>=5) return {icon:'▣',title:'Открыть свою компанию',text:'После открытия можно нанимать сотрудников и развивать отделы.',action:'open-business'};
  if(game.business.opened && (game.business.employees||[]).length===0) return {icon:'▣',title:'Нанять ученика',text:'Сотрудник сможет выполнять часть заказов.',action:'open-business'};
  return {icon:'',title:'Процессы настроены',text:'Проверьте контракты, клиентов и финансовый результат.',action:'open-business'};
}

export function employeeTemplate(id){ return EMPLOYEE_POOL_V161.find(item=>item.id===id)||null; }
export function hireEmployee(game,templateId){
  ensureV08(game); ensureV165(game);
  if(!game.business.opened)return {ok:false,message:'Сначала откройте свою компанию'};
  const t=employeeTemplate(templateId);
  if(!t) return {ok:false,message:'Кандидат не найден'};
  if(t.businessTypes?.length && !t.businessTypes.includes(game.business.typeId)) return {ok:false,message:'Этот специалист не подходит выбранному направлению компании'};
  if(game.player.level<t.reqLevel) return {ok:false,message:`Нужен уровень ${t.reqLevel}`};
  const capacity=companyCapacity(game).employees+(advancedSpecialization(game)?.id==='entrepreneur'?1:0);
  if(game.business.employees.length>=capacity) return {ok:false,message:`На текущем этапе доступно сотрудников: ${capacity}`};
  const hiring=Math.round(t.salary*.5);
  if(game.player.cash<hiring) return {ok:false,message:`На оформление нужно ${hiring.toLocaleString('ru-RU')} руб.`};
  addMoney(game,-hiring,`Найм: ${t.name}`);
  const trait=pick(EMPLOYEE_TRAITS_V13);
  game.business.employees.push({id:uid('emp'),templateId:t.id,name:t.name,level:1,morale:75,currentOrderUid:null,hiredAt:{...game.calendar},salary:t.salary,traitId:trait.id,experience:0,training:0,errors:0,completedOrders:0});
  game.business.companyReputation+=2;
  return {ok:true,message:`Нанят: ${t.name}`};
}
export function fireEmployee(game,employeeId){
  ensureV08(game);
  const emp=game.business.employees.find(e=>e.id===employeeId);
  if(!emp) return {ok:false,message:'Сотрудник не найден'};
  for(const order of game.orders.active||[]) if(order.assignedEmployeeId===employeeId) delete order.assignedEmployeeId;
  game.business.employees=game.business.employees.filter(e=>e.id!==employeeId);
  addLog(game,`${emp.name} покинул команду.`,'warning');
  return {ok:true,message:'Сотрудник уволен'};
}
export function assignEmployee(game,employeeId,orderUid){
  ensureV08(game);
  if(!game.business.opened)return {ok:false,message:'Сначала откройте свою компанию'};
  const emp=game.business.employees.find(e=>e.id===employeeId);
  const order=game.orders.active.find(o=>o.uid===orderUid);
  if(!emp||!order) return {ok:false,message:'Сотрудник или заказ не найден'};
  if(order.status!=='working') return {ok:false,message:'Сначала запустите заказ в работу'};
  if(emp.currentOrderUid && emp.currentOrderUid!==orderUid) return {ok:false,message:'Сотрудник уже занят'};
  const old=game.business.employees.find(e=>e.id===order.assignedEmployeeId);
  if(old) old.currentOrderUid=null;
  emp.currentOrderUid=orderUid;
  order.assignedEmployeeId=employeeId;
  addLog(game,`${emp.name} назначен на заказ «${order.name}».`,'info');
  return {ok:true,message:'Сотрудник назначен'};
}
export function employeeForOrder(game,order){ ensureV08(game); return game.business.employees.find(e=>e.id===order.assignedEmployeeId)||null; }
export function employeeWorkContribution(game,order){
  const emp=employeeForOrder(game,order); if(!emp) return null;
  const t=employeeTemplate(emp.templateId);
  const trait=EMPLOYEE_TRAITS_V13.find(item=>item.id===emp.traitId)||EMPLOYEE_TRAITS_V13[0];
  const repairDepartment=game.business?.departments?.includes('repair')?{speed:.18,quality:.06}:{speed:0,quality:0};
  const role=employeeRoleV180(emp);
  const fatiguePenalty=Math.max(0,Number(emp.fatigue||0)-45)/180;
  return {
    speed:Math.max(.15,Number(t?.speed||.5)*(1+Number(emp.level||1)*.03+Number(trait.speed||0)+repairDepartment.speed+Number(role.speed||0)-fatiguePenalty)),
    quality:Number(t?.quality||0)+Number(trait.quality||0)+repairDepartment.quality+Number(role.quality||0)-fatiguePenalty*.35,
    employee:emp,
    role
  };
}

export function refreshContractOffers(game){
  ensureV08(game);
  const owned=new Set(game.business.contracts.map(c=>c.templateId));
  game.business.contractOffers=CONTRACT_POOL_V161.filter(t=>t.fromYear<=game.calendar.year && (!t.businessType || t.businessType===game.business.typeId) && t.minRep<=game.player.reputation+game.business.companyReputation && !owned.has(t.id)).slice(0,4);
  return game.business.contractOffers;
}
export function signContract(game,templateId){
  ensureV08(game);
  const t=CONTRACT_POOL_V161.find(item=>item.id===templateId);
  if(!t) return {ok:false,message:'Контракт не найден'};
  if(t.fromYear>game.calendar.year||t.minRep>game.player.reputation+game.business.companyReputation) return {ok:false,message:'Репутации пока недостаточно'};
  if(!requirementsMet(game,t.skills)) return {ok:false,message:'Недостаточно профессиональных навыков'};
  ensureV165(game);
  const contractLimit=companyCapacity(game).contracts;
  if(contractLimit<=0) return {ok:false,message:'Корпоративные контракты откроются после расширения компании'};
  if(game.business.contracts.length>=contractLimit) return {ok:false,message:`Лимит контрактов на текущем этапе: ${contractLimit}`};
  if(game.business.contracts.some(c=>c.templateId===t.id)) return {ok:false,message:'Контракт уже активен'};
  game.business.contracts.push({id:uid('contract'),templateId:t.id,name:t.name,monthly:t.monthly,monthsLeft:t.months,load:t.load,startedAt:{...game.calendar},failures:0});
  game.business.companyReputation+=5;
  refreshContractOffers(game);
  return {ok:true,message:`Подписан контракт: ${t.name}`};
}
export function cancelContract(game,id){
  ensureV08(game);
  const c=game.business.contracts.find(x=>x.id===id); if(!c)return {ok:false,message:'Контракт не найден'};
  game.business.contracts=game.business.contracts.filter(x=>x.id!==id);
  game.business.companyReputation=Math.max(0,game.business.companyReputation-6);
  return {ok:true,message:'Контракт расторгнут'};
}

export function visitCityPoint(game,id){
  ensureV08(game);
  const p=CITY_POINTS_V08.find(item=>item.id===id); if(!p)return {ok:false,message:'Место не найдено'};
  if(game.player.energy<p.energy)return {ok:false,message:'Недостаточно энергии для поездки'};
  game.player.energy-=p.energy; game.business.cityLocation=id;
  game.business.cityBuff={id,daysLeft:7};
  if(id==='club'){game.player.reputation+=5; game.clients.referrals+=1;}
  if(id==='business')refreshContractOffers(game);
  if(id==='dump')game.fleaMarket.scrap=Number(game.fleaMarket.scrap||0)+randomInt(1,3);
  addLog(game,`Поездка: ${p.name}. ${p.bonus}`,'info');
  return {ok:true,message:p.bonus};
}

function applyEffect(game,effect={}){
  if(effect.cash)addMoney(game,effect.cash,'Событие');
  if(effect.energy)game.player.energy=clamp(game.player.energy+effect.energy,0,100);
  if(effect.mood)game.player.mood=clamp(game.player.mood+effect.mood,0,100);
  if(effect.fun)game.player.fun=clamp(game.player.fun+effect.fun,0,100);
  if(effect.health)game.player.health=clamp(game.player.health+effect.health,0,100);
  if(effect.reputation)game.player.reputation=Math.max(0,game.player.reputation+effect.reputation);
  if(effect.company)game.business.companyReputation=Math.max(0,game.business.companyReputation+effect.company);
  if(effect.deadlines)for(const order of game.orders.active||[])order.deadlineDays+=effect.deadlines;
  if(effect.inventory){game.inventory||={};for(const[id,qty]of Object.entries(effect.inventory))game.inventory[id]=Number(game.inventory[id]||0)+Number(qty||0);}
  if(effect.employeeMorale){
    for(const emp of game.business.employees)emp.morale=clamp(emp.morale+effect.employeeMorale,0,100);
    if(effect.employeeMorale>10&&game.business.employees[0])game.business.employees[0].salary=Math.round(game.business.employees[0].salary*1.15);
  }
}
export function resolveDecisionEvent(game,choiceId){
  ensureV08(game); const active=game.world.activeEvent; if(!active)return {ok:false,message:'Событие уже завершено'};
  const event=DECISION_EVENTS_V08.find(e=>e.id===active.eventId); const choice=event?.choices.find(c=>c.id===choiceId);
  if(!choice)return {ok:false,message:'Вариант не найден'};
  if(choice.reqSkills){
    const perk=specializationPerkV182(game);
    const effective=(id)=>skillLevel(game,id)+(id==='security'&&perk.skill==='security'?Number(perk.eventBonus||0):0);
    const missing=Object.entries(choice.reqSkills).filter(([id,level])=>effective(id)<Number(level||0));
    if(missing.length){
      const names=Object.fromEntries(SKILLS.map(item=>[item.id,item.name]));
      return {ok:false,message:`Не хватает навыков: ${missing.map(([id,level])=>`${names[id]||id} ${effective(id)}/${level}`).join(' · ')}`};
    }
  }
  const effect=choice.effect||{};
  if(Number(effect.cash||0)<0&&Number(game.player?.cash||0)<Math.abs(Number(effect.cash||0)))return {ok:false,message:`Нужно ${Math.abs(Number(effect.cash||0)).toLocaleString('ru-RU')} ₽`};
  if(Number(effect.energy||0)<0&&Number(game.player?.energy||0)<Math.abs(Number(effect.energy||0)))return {ok:false,message:`Нужно ${Math.abs(Number(effect.energy||0))} энергии`};
  applyEffect(game,choice.effect);
  game.world.eventHistory.unshift({eventId:event.id,choiceId,result:choice.result,at:{...game.calendar}});
  game.world.activeEvent=null;
  addLog(game,`${event.title}: ${choice.result}`,'info');
  return {ok:true,message:choice.result};
}

function decisionEventContextV182(game,event){
  const active=game.orders?.active||[];
  const inventory=game.inventory||{};
  const vehicleId=game.property?.vehicleId||'none';
  switch(event?.id){
    case 'power_cut': return active.length>0;
    case 'employee_raise': return Boolean(game.business?.opened&&(game.business?.employees||[]).length);
    case 'big_client': return Number(game.player?.reputation||0)>=35||Number(game.stats?.ordersDone||0)>=8;
    case 'inspection': return Boolean(game.business?.opened);
    case 'internet_outage': return skillLevel(game,'networking')>=1||active.some((order)=>order.stationId==='network'||order.taskTypeId==='network');
    case 'small_flood': return Boolean(game.business?.opened||game.property?.locationId!=='home');
    case 'vehicle_breakdown': return vehicleId!=='none';
    case 'recommendation': return Number(game.stats?.ordersDone||0)>=3;
    case 'racket_visit': case 'broken_window': case 'street_pressure': return Boolean(game.business?.opened||game.property?.locationId!=='home');
    case 'stolen_tools': return Object.keys(inventory).some((id)=>id.startsWith('tool_'));
    default: return true;
  }
}

export function processV08Day(game){
  ensureV08(game);
  const schedule=game.world.eventSchedule;
  if(game.world.activeEvent||schedule.triggered||Number(game.calendar?.day||1)<Number(schedule.day||1))return {ok:true,created:false};
  const recent=new Set((game.world.eventHistory||[]).slice(0,3).map(item=>item.eventId));
  const year=Number(game.calendar?.year||2000);
  const eligible=DECISION_EVENTS_V08.filter(item=>(!item.businessOnly||game.business?.opened)&&(!item.fromYear||year>=item.fromYear)&&(!item.toYear||year<=item.toYear)&&decisionEventContextV182(game,item));
  const pool=eligible.filter(item=>!recent.has(item.id));
  const event=pick(pool.length?pool:eligible);
  if(!event)return {ok:false,created:false};
  game.world.activeEvent={id:uid('event'),eventId:event.id,createdAt:{...game.calendar}};
  schedule.triggered=true;
  addLog(game,`Событие месяца: ${event.title}`,'warning');
  return {ok:true,created:true,eventId:event.id,scheduledDay:schedule.day};
}

export function processV08Month(game){
  ensureV08(game);
  game.world.monthCounter+=1;
  if(!game.business.opened){ game.business.activeEmployeeEvent=null; return {ok:true}; }

  let payroll=0;
  for(const emp of game.business.employees){ payroll+=Number(emp.salary||employeeTemplate(emp.templateId)?.salary||0); emp.morale=clamp(emp.morale-1,0,100); }
  if(payroll>0)addMoney(game,-payroll,'Зарплаты сотрудников');

  for(const contract of [...game.business.contracts]){
    const t=CONTRACT_POOL_V161.find(x=>x.id===contract.templateId); if(!t)continue;
    const capacity=Math.max(1,game.business.employees.length+1);
    const risk=Math.max(.02,.16-(capacity-contract.load)*.025-game.business.companyReputation*.0002);
    if(chance(risk)){
      contract.failures+=1; game.business.companyReputation=Math.max(0,game.business.companyReputation-4); addLog(game,`Сбой по контракту «${contract.name}»: клиент недоволен.`,'warning');
    }else{
      const bonus=1+game.business.companyReputation*.0015;
      addMoney(game,Math.round(t.monthly*bonus*companyRevenueShare(game)),`Контракт: ${contract.name}`);
      game.business.companyReputation+=1; game.stats.contractMonths+=1;
    }
    contract.monthsLeft-=1;
    if(contract.monthsLeft<=0){ game.business.contracts=game.business.contracts.filter(c=>c.id!==contract.id); addLog(game,`Контракт «${contract.name}» завершён.`,'success'); }
  }

  const playerPower=Math.max(.2,(game.business.companyReputation+game.player.reputation*.5+game.business.employees.length*12)/200);
  for(const rival of game.business.competitors){
    const drift=(rival.strength-playerPower)*randomInt(1,3);
    rival.share=clamp(rival.share+drift,3,45);
    rival.reputation=clamp(rival.reputation+randomInt(-2,3),10,100);
  }
  const rivalShare=game.business.competitors.reduce((s,r)=>s+r.share,0);
  game.business.marketShare=clamp(100-rivalShare,4,60);
  refreshContractOffers(game);

  if(game.business.cityBuff){game.business.cityBuff.daysLeft-=30;if(game.business.cityBuff.daysLeft<=0)game.business.cityBuff=null;}
  return {ok:true};
}

export function processV08Year(game){
  ensureV08(game);
  const challenge=challengeById(game.mode.challengeId);
  if(game.mode.id==='challenge'&&challenge&&!game.mode.completed&&challenge.check(game)){
    game.mode.completed=true; game.legacy.points+=2; game.legacy.rewards.push(challenge.reward); addLog(game,`Испытание выполнено: ${challenge.name}.`,'success');
  }
  if(game.calendar.year>=2010&&game.mode.id==='campaign')game.replay.newGamePlusUnlocked=true;
}

export function recordOrderOutcome(game,order,succeeded){
  ensureV08(game);
  const id=order.client?.id;
  if(id&&game.clients.records[id]){
    const client=game.clients.records[id]; client.orders=Number(client.orders||0)+1; client.lastYear=game.calendar.year;
    client.trust=clamp(Number(client.trust||40)+(succeeded?8:-18),0,100);
    if(succeeded&&client.orders>1){game.clients.repeatOrders+=1;game.stats.clientsRetained+=1;}
    if(succeeded&&client.trust>=70&&chance(.22)){game.clients.referrals+=1;game.player.reputation+=2;}
  }
  game.business.companyReputation=Math.max(0,game.business.companyReputation+(succeeded?Math.max(1,Math.round(order.reputation/2)):-4));
  const quality=Number(order.quality ?? order.diagnosis?.quality ?? 0);
  const testReduction=order.testProtocol==='full'?.05:order.testProtocol==='standard'?.02:0;
  const approachRisk=Number(order.repairApproach?.failureRisk||0);
  const diagnosisRisk=order.diagnosis?.correct?0:.12;
  const warrantyRisk=succeeded?Math.max(.015,.14-quality*.16-testReduction+approachRisk+diagnosisRisk):.42;
  if(chance(warrantyRisk)){
    game.stats.warrantyReturns+=1;
    game.orders.guarantees ||= [];
    const warranty={
      ...structuredClone(order),uid:uid('warranty'),name:`Гарантия: ${order.name}`,description:'Клиент вернулся: проблема проявилась снова. Исправление бесплатно.',reward:0,status:'available',deadlineDays:5,workDays:Math.max(1,Math.ceil(order.workDays*.6)),orderType:'warranty',diagnosis:null,repairApproach:null,repairResult:null,testProtocol:null,quality:null,materialsConsumed:false,progressDays:0
    };
    game.orders.guarantees.unshift({sourceOrderUid:order.uid,warrantyUid:warranty.uid,createdAt:{...game.calendar}});
    game.orders.available.unshift(warranty);
  }
}

export function runPcTest(game){
  ensureV08(game);
  const errors=pcConflicts(game);
  if(errors.length){game.pc.test={status:'failed',score:0,temperature:0,stability:0,noise:0,message:errors[0]};return {ok:false,message:errors[0]};}
  if(!game.pc.assembled)return {ok:false,message:'Сначала соберите компьютер'};
  const power=pcPower(game);
  const cooling=Number(game.pc.slots?.cool?.tier||1);
  const psu=Number(game.pc.slots?.psu?.tier||1);
  const temperature=clamp(Math.round(82-power*.7-cooling*6+randomInt(-3,4)),34,92);
  const stability=clamp(Math.round(70+psu*5+cooling*4-randomInt(0,12)),35,100);
  const noise=clamp(Math.round(72-cooling*5+randomInt(-4,5)),18,80);
  const score=Math.max(1,Math.round(power*100*(stability/100)*(temperature>78?.82:1)));
  const status=stability>=75&&temperature<=80?'stable':'warning';
  game.pc.test={status,score,temperature,stability,noise,testedAt:{...game.calendar}};
  if(status==='stable'&&!game.pc.builds.some(b=>b.score===score))game.pc.builds.push({id:uid('build'),name:game.pc.name,score,year:game.calendar.year});
  addLog(game,`Тест ПК: ${score} баллов, ${temperature}°C, стабильность ${stability}%.`,status==='stable'?'success':'warning');
  return {ok:true,message:status==='stable'?'Система стабильна':'Нужна настройка охлаждения или питания'};
}

export function endingSummary(game){
  ensureV08(game);
  const ending=ENDINGS_V08.find(e=>e.check(game))||ENDINGS_V08.at(-1);
  const score=Math.round((game.player.cash||0)/10000+(game.stats.ordersDone||0)*8+(game.business.companyReputation||0)*12+(game.player.level||1)*100);
  return {ending,score,legacyPoints:Math.max(1,Math.floor(score/1500))};
}

export const V08_DATA = { ACTIVITY_PLANS, ADVANCED_SPECIALIZATIONS_V08, CHALLENGES_V08, CITY_POINTS_V08, COMPETITORS_V08, CONTRACT_TEMPLATES_V08:CONTRACT_POOL_V161, EMPLOYEE_TEMPLATES_V08:EMPLOYEE_POOL_V161, ENDINGS_V08, GAME_MODES, DECISION_EVENTS_V08 };
