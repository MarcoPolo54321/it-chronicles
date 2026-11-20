import { ALL_LOCATIONS } from '../data/economy.js';
import { SKILLS } from '../data/progression.js';
import { DIFFICULTY_MODES_V180, EMPLOYEE_ROLES_V180, HISTORICAL_CHAINS_V180, QUOTE_STRATEGIES_V180, WORKSTATIONS_V180 } from '../data/v180.js';
import { chance, clamp, uid } from '../core/utils.js';
import { addLog, skillLevel } from './progression.js';
import { clientArchetypeV182, specializationPerkV182 } from './v182.js';

const SKILL_IDS = SKILLS.map((item)=>item.id);

export function ensureV180(game){
  game.mode ||= { id:'campaign' };
  game.mode.difficultyId ||= game.v18?.difficultyId || 'normal';
  game.reputationBySkill ||= Object.fromEntries(SKILL_IDS.map((id)=>[id,0]));
  for(const id of SKILL_IDS) game.reputationBySkill[id]=Number(game.reputationBySkill[id]||0);
  game.v18 ||= {};
  game.v18.difficultyId = game.mode.difficultyId;
  game.v18.notifications = Array.isArray(game.v18.notifications) ? game.v18.notifications : [];
  game.v18.notificationReadAt = Number(game.v18.notificationReadAt||0);
  game.v18.warranties ||= { active:[], claims:[], history:[] };
  game.v18.warranties.active = Array.isArray(game.v18.warranties.active) ? game.v18.warranties.active : [];
  game.v18.warranties.claims = Array.isArray(game.v18.warranties.claims) ? game.v18.warranties.claims : [];
  game.v18.warranties.history = Array.isArray(game.v18.warranties.history) ? game.v18.warranties.history : [];
  game.v18.history ||= { seen:[], demand:{} };
  game.v18.history.seen = Array.isArray(game.v18.history.seen) ? game.v18.history.seen : [];
  game.v18.history.demand ||= {};
  game.v18.stats ||= { quotesAccepted:0, quotesRejected:0, warrantyClaims:0, projectsCompleted:0 };
  game.v18.lastProcessedDay = Number(game.v18.lastProcessedDay ?? game.calendar?.totalDays ?? 0);
  game.clients ||= { records:{}, repeatOrders:0, referrals:0 };
  game.clients.records ||= {};
  for(const client of Object.values(game.clients.records)){
    client.trust = Number(client.trust ?? 40);
    client.orders = Number(client.orders||0);
    client.history = Array.isArray(client.history) ? client.history : [];
    client.averageRating = Number(client.averageRating||0);
    client.priceSensitivity = Number(client.priceSensitivity ?? (0.78 + Math.random()*.42));
    client.preference ||= client.tierId === 'student' ? 'economy' : ['small_biz','medium_biz','corporation'].includes(client.tierId) ? 'reliable' : 'standard';
  }
  for(const employee of game.business?.employees||[]){
    employee.roleId ||= inferEmployeeRole(employee);
    employee.fatigue = clamp(Number(employee.fatigue||0),0,100);
  }
  for(const order of [...(game.orders?.available||[]),...(game.orders?.active||[])]) enrichOrderV180(order);
  return game.v18;
}

export function difficultyModeV180(game){
  ensureV180(game);
  return DIFFICULTY_MODES_V180.find((item)=>item.id===game.mode.difficultyId) || DIFFICULTY_MODES_V180[1];
}

export function setDifficultyV180(game,id){
  const found=DIFFICULTY_MODES_V180.find((item)=>item.id===id);
  if(!found)return{ok:false,message:'Режим сложности не найден'};
  ensureV180(game);
  game.mode.difficultyId=found.id;
  game.v18.difficultyId=found.id;
  pushNotificationV180(game,{type:'system',title:'Сложность изменена',text:`Выбран режим «${found.name}».`});
  return{ok:true,message:`Сложность: ${found.name}`};
}

export function orderWorkModeV180(order){
  if(order?.workMode)return order.workMode;
  return order?.businessType || order?.onSite || ['hard','epic'].includes(order?.difficulty) || order?.orderType==='corporate' ? 'project' : 'quick';
}

export function stationForOrderV180(order){
  if(order?.stationId)return order.stationId;
  const name=`${order?.name||''} ${order?.taskTypeId||''}`.toLowerCase();
  if(order?.isBuild || /сбор|апгрейд|компьютер/.test(name))return'assembly';
  if(/сет|wi.?fi|роут|модем|сервер|dns|интернет/.test(name))return'network';
  if(/диагност|восстанов|данн/.test(name))return'diagnostic';
  return'repair';
}

export function enrichOrderV180(order){
  if(!order)return order;
  order.workMode = orderWorkModeV180(order);
  order.stationId = stationForOrderV180(order);
  order.projectStage ||= order.workMode==='project' ? (order.status==='available'?'request':order.status==='quotation'?'quote':order.status==='diagnosis'?'diagnosis':order.status==='solution'?'estimate':order.status==='repair'?'procurement':order.status==='working'?'work':order.status==='testing'?'testing':'request') : 'quick';
  return order;
}

export function workstationCapacityV180(game){
  ensureV180(game);
  const locationId=game.property?.locationId||'home';
  const map={
    home:{diagnostic:1,repair:1,assembly:0,network:0},
    dorm_room:{diagnostic:1,repair:1,assembly:1,network:0},
    studio:{diagnostic:1,repair:2,assembly:1,network:1},
    one_room:{diagnostic:2,repair:2,assembly:2,network:1},
    two_room:{diagnostic:2,repair:3,assembly:2,network:2}
  };
  const base={...(map[locationId]||map.home)};
  const location=ALL_LOCATIONS.find((item)=>item.id===locationId);
  const extra=Math.max(0,Math.floor((Number(location?.maxOrders||2)-2)/3));
  base.repair+=extra;
  if(skillLevel(game,'hardware')>=2)base.assembly=Math.max(1,base.assembly);
  if(skillLevel(game,'networking')>=2)base.network=Math.max(1,base.network);
  if(game.business?.departments?.includes('repair'))base.repair+=1;
  if(game.business?.departments?.includes('network'))base.network+=1;
  const perk=specializationPerkV182(game);
  if(Number(perk.capacityBonus||0)>0)base.repair+=Number(perk.capacityBonus||0);
  return base;
}

export function workstationUsageV180(game){
  ensureV180(game);
  const usage={diagnostic:0,repair:0,assembly:0,network:0};
  for(const order of game.orders?.active||[]){
    const station=stationForOrderV180(order);
    if(usage[station]!=null)usage[station]+=1;
  }
  return usage;
}

export function workstationStatusV180(game){
  const capacity=workstationCapacityV180(game);
  const usage=workstationUsageV180(game);
  return WORKSTATIONS_V180.map((meta)=>({ ...meta, capacity:capacity[meta.id]||0, used:usage[meta.id]||0, free:Math.max(0,(capacity[meta.id]||0)-(usage[meta.id]||0)) }));
}

export function canAcceptAtWorkstationV180(game,order){
  const station=stationForOrderV180(order);
  const row=workstationStatusV180(game).find((item)=>item.id===station);
  if(!row || row.capacity<=0)return{ok:false,station,message:`Нет рабочего места: ${row?.name||station}. Улучшите помещение или профильный навык.`};
  if(row.used>=row.capacity)return{ok:false,station,message:`Все места «${row.name}» заняты: ${row.used}/${row.capacity}.`};
  return{ok:true,station,row};
}

export function quoteOptionsV180(game,order){
  ensureV180(game);
  const client=game.clients.records?.[order?.client?.id] || order?.client || {};
  const difficulty=difficultyModeV180(game);
  const base=Math.max(1,Number(order?.reward||0));
  const materials=Math.max(0,Number(order?.estimatedMaterialCost||0));
  return QUOTE_STRATEGIES_V180.map((strategy)=>{
    const price=Math.max(materials+1,Math.round(base*strategy.priceMult));
    const archetype=clientArchetypeV182(client);
    const perk=specializationPerkV182(game);
    const sensitivity=Number(client.priceSensitivity||1);
    const trust=Number(client.trust||40);
    const communication=skillLevel(game,'communication');
    const acceptance=clamp(.68 + strategy.acceptance + trust*.0025 + communication*.015 + Number(archetype.acceptanceBonus||0) + Number(perk.quoteBonus||0) - Math.max(0,strategy.priceMult-1)*sensitivity*.34 + (difficulty.clientTolerance-1),.08,.97);
    return{...strategy,price,acceptance,materialBudget:Math.round(materials*strategy.materialMult)};
  });
}

export function proposeQuoteV180(game,orderUid,strategyId){
  ensureV180(game);
  const order=game.orders.active.find((item)=>item.uid===orderUid);
  if(!order||order.status!=='quotation')return{ok:false,message:'Смета для этого заказа недоступна'};
  const option=quoteOptionsV180(game,order).find((item)=>item.id===strategyId);
  if(!option)return{ok:false,message:'Вариант сметы не найден'};
  const accepted=chance(option.acceptance);
  const client=game.clients.records?.[order.client?.id];
  order.quote={...option,accepted,createdAt:{...game.calendar}};
  if(!accepted){
    game.orders.active=game.orders.active.filter((item)=>item.uid!==orderUid);
    order.status='quote-rejected';
    order.projectStage='closed';
    game.orders.history.unshift({...order,finishedAt:{...game.calendar}});
    if(client)client.trust=Math.max(0,Number(client.trust||40)-2);
    game.v18.stats.quotesRejected+=1;
    pushNotificationV180(game,{type:'client',title:'Клиент отказался от сметы',text:`${order.client?.name||'Клиент'} не согласовал «${option.name}» по заказу «${order.name}».`,target:'orders'});
    return{ok:true,accepted:false,message:'Клиент отказался от предложенной сметы'};
  }
  order.reward=option.price;
  order.quoteQuality=option.quality;
  order.quoteWarrantyRisk=option.warrantyRisk;
  order.status='diagnosis';
  order.projectStage='diagnosis';
  game.v18.stats.quotesAccepted+=1;
  if(client){client.preference=option.id;client.trust=Math.min(100,Number(client.trust||40)+1);}
  pushNotificationV180(game,{type:'client',title:'Смета согласована',text:`${order.client?.name||'Клиент'} принял «${option.name}»: ${option.price.toLocaleString('ru-RU')} ₽.`,target:'orders'});
  return{ok:true,accepted:true,message:`Смета согласована: ${option.price.toLocaleString('ru-RU')} ₽`};
}

export function inferEmployeeRole(employee){
  const text=`${employee?.templateId||''} ${employee?.name||''}`.toLowerCase();
  if(/network|сеть|admin/.test(text))return'networker';
  if(/sales|manager|продаж/.test(text))return'seller';
  if(/учен|trainee/.test(text))return'trainee';
  if(/assembl|сбор/.test(text))return'assembler';
  return'repair_master';
}

export function employeeRoleV180(employee){
  return EMPLOYEE_ROLES_V180.find((item)=>item.id===(employee?.roleId||inferEmployeeRole(employee))) || EMPLOYEE_ROLES_V180[0];
}

export function setEmployeeRoleV180(game,employeeId,roleId){
  ensureV180(game);
  const employee=game.business?.employees?.find((item)=>item.id===employeeId);
  const role=EMPLOYEE_ROLES_V180.find((item)=>item.id===roleId);
  if(!employee||!role)return{ok:false,message:'Сотрудник или роль не найдены'};
  if(employee.currentOrderUid)return{ok:false,message:'Нельзя менять роль, пока сотрудник занят заказом'};
  employee.roleId=role.id;
  pushNotificationV180(game,{type:'employee',title:'Роль сотрудника изменена',text:`${employee.name}: ${role.name}.`,target:'business'});
  return{ok:true,message:`Новая роль: ${role.name}`};
}

export function pushNotificationV180(game,{type='info',title='Уведомление',text='',target='home',important=false,sourceKey=null}={}){
  ensureV180(game);
  if(sourceKey){
    const existing=game.v18.notifications.find((item)=>item.sourceKey===sourceKey);
    if(existing)return existing;
  }
  const entry={id:uid('notice'),type,title,text,target,important,sourceKey,createdDay:Number(game.calendar?.totalDays||0),at:{...game.calendar},read:false};
  game.v18.notifications.unshift(entry);
  game.v18.notifications=game.v18.notifications.slice(0,80);
  return entry;
}


export function syncNotificationsV180(game){
  ensureV180(game);
  const decision=game.world?.activeEvent;
  if(decision){
    pushNotificationV180(game,{type:'decision',title:'Требуется решение',text:'Открыто сюжетное событие. Выберите вариант действия.',target:'home',important:true,sourceKey:`decision:${decision.id||decision.eventId}`});
  }
  const employee=game.business?.activeEmployeeEvent;
  if(employee){
    pushNotificationV180(game,{type:'employee',title:employee.title||'Событие сотрудника',text:employee.text||'Команда ждёт решения.',target:'business',important:true,sourceKey:`employee:${employee.id}`});
  }
  const market=game.market?.activeEvent;
  if(market){
    pushNotificationV180(game,{type:'market',title:market.name||'Событие рынка',text:market.desc||'Изменились цены на комплектующие.',target:'business',sourceKey:`market:${market.id}:${market.startedAt?.year||game.calendar.year}:${market.startedAt?.month||game.calendar.month}`});
  }
  return game.v18.notifications;
}

export function unreadNotificationsV180(game){
  ensureV180(game);
  return game.v18.notifications.filter((item)=>!item.read).length;
}

export function markNotificationsReadV180(game){
  ensureV180(game);
  for(const item of game.v18.notifications)item.read=true;
  game.v18.notificationReadAt=Number(game.calendar?.totalDays||0);
  return{ok:true,message:'Уведомления отмечены прочитанными'};
}

export function dismissNotificationV180(game,id){
  ensureV180(game);
  const before=game.v18.notifications.length;
  game.v18.notifications=game.v18.notifications.filter((item)=>item.id!==id);
  return{ok:game.v18.notifications.length<before,message:'Уведомление удалено'};
}

function primaryOrderSkills(order){
  return Object.entries(order?.skills||{}).sort((a,b)=>Number(b[1])-Number(a[1])).map(([id])=>id);
}

export function registerOrderOutcomeV180(game,order,succeeded,stars=0){
  ensureV180(game);
  const client=game.clients.records?.[order.client?.id];
  if(client){
    client.orders=Number(client.orders||0)+1;
    client.lastYear=game.calendar.year;
    client.history.unshift({orderUid:order.uid,name:order.name,succeeded,stars,at:{...game.calendar},quoteId:order.quote?.id||null});
    client.history=client.history.slice(0,20);
    const ratings=client.history.filter((item)=>item.stars).map((item)=>item.stars);
    client.averageRating=ratings.length?ratings.reduce((sum,value)=>sum+value,0)/ratings.length:0;
    const archetype=clientArchetypeV182(client);
    const perk=specializationPerkV182(game);
    client.trust=clamp(Number(client.trust||40)+(succeeded?Math.max(1,stars-2)+Number(archetype.trustGain||0)+Number(perk.trustBonus||0):-8),0,100);
    if(client.orders>1)game.clients.repeatOrders=Number(game.clients.repeatOrders||0)+1;
    if(succeeded&&stars>=5&&chance(Math.min(.65,.25+Number(archetype.referralBonus||0)))){game.clients.referrals=Number(game.clients.referrals||0)+1;pushNotificationV180(game,{type:'client',title:'Новая рекомендация',text:`${client.name} порекомендовал мастерскую знакомому.`,target:'business'});}
  }
  for(const id of primaryOrderSkills(order))game.reputationBySkill[id]=Math.max(0,Number(game.reputationBySkill[id]||0)+(succeeded?Math.max(1,stars-2):-2));
  if(succeeded){
    if(order.workMode==='project')game.v18.stats.projectsCompleted+=1;
    if(order.orderType==='warranty') return;
    const approachRisk=Number(order.quoteWarrantyRisk||0)+Number(order.repairApproach?.failureRisk||0);
    const quality=Number(order.quality||.75);
    const difficulty=difficultyModeV180(game);
    const perk=specializationPerkV182(game);
    const risk=clamp((.13 + approachRisk + Math.max(0,.78-quality)*.35 + Number(perk.warrantyRisk||0))*difficulty.warrantyRisk,.015,.55);
    const days=order.quote?.id==='premium'?120:order.quote?.id==='reliable'?90:60;
    game.v18.warranties.active.push({
      id:uid('warranty'),orderUid:order.uid,name:order.name,client:structuredClone(order.client),createdDay:Number(game.calendar.totalDays||0),expiresDay:Number(game.calendar.totalDays||0)+days,risk,claimed:false,
      snapshot:{templateId:order.templateId,difficulty:order.difficulty,skills:structuredClone(order.skills||{}),recommendedSkills:structuredClone(order.recommendedSkills||{}),items:structuredClone(order.items||[]),xp:Math.max(8,Math.round(Number(order.xp||10)*.35)),reputation:1,baseChance:Math.min(.98,Number(order.baseChance||.85)+.05),taskTypeId:order.taskTypeId,stationId:order.stationId}
    });
  }
}

function createWarrantyOrder(game,warranty){
  const s=warranty.snapshot||{};
  return{
    uid:uid('order'),templateId:`warranty_${warranty.orderUid}`,name:`Гарантийный возврат: ${warranty.name}`,icon:'',description:'Клиент сообщил, что проблема повторилась в гарантийный период.',client:structuredClone(warranty.client),difficulty:s.difficulty||'medium',reward:0,energy:8,workDays:1,
    skills:structuredClone(s.skills||{}),recommendedSkills:structuredClone(s.recommendedSkills||{}),skillXp:{},items:structuredClone(s.items||[]),xp:s.xp||8,reputation:s.reputation||1,baseChance:s.baseChance||.9,onSite:false,status:'available',deadlineDays:14,diagnosis:null,diagnosticCase:null,
    orderType:'warranty',createdAt:{...game.calendar},businessType:null,advertisingCampaignIds:[],taskTypeId:s.taskTypeId||'repair',workMode:'quick',stationId:s.stationId||'repair',warrantyId:warranty.id
  };
}

function processWarranties(game){
  const now=Number(game.calendar?.totalDays||0);
  const active=[];
  for(const warranty of game.v18.warranties.active){
    if(warranty.claimed){game.v18.warranties.history.unshift(warranty);continue;}
    if(now>=Number(warranty.expiresDay||0)){game.v18.warranties.history.unshift({...warranty,status:'expired'});continue;}
    if(now>Number(warranty.createdDay||0)+3 && chance(Number(warranty.risk||0)/Math.max(14,Number(warranty.expiresDay||0)-now))){
      warranty.claimed=true;
      game.v18.warranties.claims.unshift({...warranty,claimedAt:{...game.calendar}});
      game.v18.stats.warrantyClaims+=1;
      if(!(game.orders.available||[]).some((order)=>order.warrantyId===warranty.id))game.orders.available.unshift(createWarrantyOrder(game,warranty));
      pushNotificationV180(game,{type:'warranty',title:'Гарантийный возврат',text:`${warranty.client?.name||'Клиент'} вернул заказ «${warranty.name}». Ремонт бесплатный и ограничен сроком.`,target:'orders',important:true});
      addLog(game,`Гарантийный возврат: ${warranty.name}.`,'warning');
      game.v18.warranties.history.unshift(warranty);
      continue;
    }
    active.push(warranty);
  }
  game.v18.warranties.active=active;
  game.v18.warranties.history=game.v18.warranties.history.slice(0,80);
}

function applyHistoricalEvent(game,event){
  const fx=event.effects||{};
  const repMap={hardwareRep:'hardware',softwareRep:'software',networkingRep:'networking',repairRep:'repair',securityRep:'security',dataRep:'data',managementRep:'management'};
  for(const[key,id]of Object.entries(repMap))if(fx[key])game.reputationBySkill[id]=Number(game.reputationBySkill[id]||0)+Number(fx[key]);
  for(const[key,value]of Object.entries(fx))if(key.endsWith('Demand'))game.v18.history.demand[key.replace('Demand','')]=Number(value||0);
  pushNotificationV180(game,{type:'history',title:event.title,text:event.text,target:'home'});
  addLog(game,`Историческая цепочка: ${event.title}. ${event.text}`,'info');
}

export function processV180Day(game){
  ensureV180(game);
  const day=Number(game.calendar?.totalDays||0);
  if(day<=Number(game.v18.lastProcessedDay||0))return;
  const diff=difficultyModeV180(game);
  const perk=specializationPerkV182(game);
  const fatigueMult=Math.max(.5,1+Number(perk.employeeFatigue||0));
  for(const employee of game.business?.employees||[]){
    const busy=Boolean(employee.currentOrderUid);
    employee.fatigue=clamp(Number(employee.fatigue||0)+(busy?4*diff.employeeFatigue*fatigueMult:-3),0,100);
    if(employee.fatigue>85)employee.morale=clamp(Number(employee.morale||75)-1,0,100);
  }
  processWarranties(game);
  for(const event of HISTORICAL_CHAINS_V180){
    if(event.year===game.calendar.year&&event.month===game.calendar.month&&game.calendar.day===1&&!game.v18.history.seen.includes(event.id)){
      game.v18.history.seen.push(event.id);applyHistoricalEvent(game,event);
    }
  }
  game.v18.lastProcessedDay=day;
}

export function v180HomeSummary(game){
  ensureV180(game);
  const projects=(game.orders?.active||[]).filter((order)=>orderWorkModeV180(order)==='project').length;
  const status=workstationStatusV180(game);
  const free=status.reduce((sum,row)=>sum+row.free,0);
  const nearest=(game.orders?.active||[]).filter((order)=>['warranty','corporate'].includes(order.orderType)).sort((a,b)=>Number(a.deadlineDays||999)-Number(b.deadlineDays||999))[0];
  const deposits=(game.bank?.deposits||[]).sort((a,b)=>Number(a.daysLeft||999)-Number(b.daysLeft||999))[0];
  return{projects,free,unread:unreadNotificationsV180(game),nearest,deposit:deposits,stations:status};
}

export function reputationRowsV180(game){
  ensureV180(game);
  return SKILLS.map((meta)=>({id:meta.id,name:meta.name,value:Number(game.reputationBySkill[meta.id]||0)}));
}
