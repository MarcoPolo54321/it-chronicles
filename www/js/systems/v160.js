import { clamp } from '../core/utils.js';
import { addLog, addMoney, getInflation, requirementsMet, skillLevel } from './progression.js';
import { BUSINESS_TYPES_V161, businessTypeById } from '../data/v161.js';

export const CAMPAIGN_END_YEAR = 2010;
export const CAMPAIGN_END_DATE = Object.freeze({ year:2010, month:12, day:30 });
export const COMPANY_LOGOS = Object.freeze([
  { id:'chip', icon:'▣', name:'Микросхема' },
  { id:'monitor', icon:'▤', name:'Монитор' },
  { id:'wrench', icon:'', name:'Инструмент' },
  { id:'network', icon:'', name:'Сеть' },
  { id:'shield', icon:'◇', name:'Щит' }
]);

export function ensureV160(game) {
  game.calendar ||= { year:2000, month:1, day:1, hour:0, totalDays:0, totalHours:0 };
  game.calendar.hour = Number(game.calendar.hour || 0);
  game.calendar.totalHours = Number(game.calendar.totalHours || Number(game.calendar.totalDays || 0) * 24);
  game.campaign ||= {};
  game.campaign.endYear = CAMPAIGN_END_YEAR;
  game.campaign.finished = Boolean(game.campaign.finished);
  game.campaign.endChoice ||= null;
  game.campaign.calendarFrozen = Boolean(game.campaign.calendarFrozen);
  game.campaign.sandboxHours = Number(game.campaign.sandboxHours || 0);
  game.campaign.sandboxNewsMonth = clamp(Number(game.campaign.sandboxNewsMonth || game.calendar.month || 1),1,12);
  game.business ||= {};
  game.business.employees ||= [];
  game.business.departments ||= [];
  game.business.opened = Boolean(game.business.opened || game.business.employees.length || game.business.departments.length);
  game.business.name ||= game.business.opened ? 'Компьютерный сервис' : '';
  game.business.logo ||= 'chip';
  game.business.typeId ||= game.business.opened ? 'service_repair' : null;
  game.business.foundedAt ||= game.business.opened ? { ...game.calendar } : null;
  game.business.previousJobId ||= null;
  if (game.calendar.year > CAMPAIGN_END_YEAR) {
    Object.assign(game.calendar,{...CAMPAIGN_END_DATE,hour:12});
    game.campaign.finished = true;
    game.mode.completed = true;
  }
  if(game.campaign.finished&&!game.campaign.endChoice){game.activity||={};game.activity.mode='paused';}
  return game;
}

export function campaignAtEnd(game) {
  ensureV160(game);
  return game.campaign.finished || game.calendar.year > CAMPAIGN_END_YEAR || (game.calendar.year===CAMPAIGN_END_YEAR && game.calendar.month===12 && game.calendar.day>=30 && game.calendar.hour>=12);
}

export function markCampaignFinished(game) {
  ensureV160(game);
  if (game.campaign.finished) return false;
  Object.assign(game.calendar,{...CAMPAIGN_END_DATE,hour:12});
  game.campaign.finished = true;
  game.campaign.completedAt ||= { ...game.calendar };
  game.mode.completed = true;
  game.replay ||= {};
  game.replay.newGamePlusUnlocked = true;
  game.activity ||= {};
  game.activity.mode = 'paused';
  addLog(game,'Кампания 2000–2010 завершена. Выберите Новую игру+ или свободный режим в замороженном 2010 году.','success');
  return true;
}

export function continueFrozen2010(game) {
  ensureV160(game);
  game.campaign.finished = true;
  game.campaign.endChoice = 'continue';
  game.campaign.calendarFrozen = true;
  game.campaign.sandboxNewsMonth = Number(game.calendar.month || 12);
  game.activity.mode = 'idle';
  addLog(game,'Свободный режим включён: календарь остановлен в 2010 году, заказы и развитие продолжаются.','success');
  return { ok:true, message:'Свободный режим 2010 включён' };
}

export function companyRequirement(game, typeId = null) {
  ensureV160(game);
  if (game.business.opened) return { ok:false, reason:'Компания уже открыта' };
  const type = BUSINESS_TYPES_V161.find(item=>item.id===typeId);
  if (!type) return { ok:false, reason:'Выберите направление компании' };
  if (game.player.level < type.reqLevel) return { ok:false, reason:`Нужен уровень персонажа ${type.reqLevel}` };
  if (game.player.reputation < type.reqRep) return { ok:false, reason:`Нужно ${type.reqRep} репутации` };
  const missing = Object.entries(type.reqSkills || {}).filter(([id,level])=>skillLevel(game,id)<level);
  if (missing.length) {
    const names={hardware:'Железо',software:'Софт',networking:'Сети',repair:'Ремонт',security:'Безопасность',data:'Данные',communication:'Общение',management:'Управление'};
    return { ok:false, reason:`Не хватает: ${missing.map(([id,level])=>`${names[id]||id} ${skillLevel(game,id)}/${level}`).join(', ')}` };
  }
  const cost = Math.max(1, Math.round(Number(type.cost || 0) * getInflation(game)));
  if (game.player.cash < cost) return { ok:false, reason:`Нужно ${cost.toLocaleString('ru-RU')} ₽`, cost, type };
  return { ok:true, reason:'Все требования выполнены', type, cost };
}

export function openCompany(game, name, logo='chip', typeId=null) {
  ensureV160(game);
  const req=companyRequirement(game,typeId);
  if(!req.ok)return {ok:false,message:req.reason};
  const type=req.type||businessTypeById(typeId);
  const companyName=String(name||'').trim();
  if(companyName.length<2)return {ok:false,message:'Введите название компании'};
  const openingCost = Number(req.cost || Math.round(Number(type.cost || 0) * getInflation(game)));
  addMoney(game,-openingCost,`Регистрация компании «${companyName}»`);
  game.business.previousJobId=game.career?.jobId||null;
  if(game.career)game.career.jobId=null;
  game.business.opened=true;
  game.business.typeId=type.id;
  game.business.name=companyName.slice(0,40);
  game.business.logo=COMPANY_LOGOS.some(item=>item.id===logo)?logo:'chip';
  game.business.foundedAt={...game.calendar};
  game.business.companyReputation=Math.max(10,Number(game.business.companyReputation||0));
  game.business.branchLevel=1;
  game.business.stage=1;
  game.business.stageUpgrades=[{stage:1,name:'Работа на дому',cost:openingCost,at:{...game.calendar}}];
  addLog(game,`Открыта компания «${game.business.name}» — направление «${type.name}». Работа по найму прекращена.`, 'success');
  return {ok:true,message:`Компания «${game.business.name}» открыта: ${type.name}`};
}

export function applyNewGamePlusBackground(next, old) {
  ensureV160(next); ensureV160(old);
  next.player.cash = Math.max(175000, Math.round(Number(old.player.cash||0)*.08));
  next.player.reputation = Math.max(80, Math.round(Number(old.player.reputation||0)*.22));
  next.player.level = Math.max(8, Math.min(15, 5 + Math.round(Number(old.player.level||1)*.3)));
  next.player.xp = 0;
  for (const [id,skill] of Object.entries(next.skills)) {
    const oldLevel=Number(old.skills?.[id]?.level||0);
    skill.level=Math.max(skill.level,Math.min(18,Math.floor(oldLevel*.25)));
    skill.xp=0;
  }
  next.property.locationId='dorm_room';
  if(!next.property.ownedLocations.includes('dorm_room'))next.property.ownedLocations.push('dorm_room');
  next.property.vehicleId='old_lada';
  if(!next.property.ownedVehicles.includes('old_lada'))next.property.ownedVehicles.push('old_lada');
  Object.assign(next.workspace.items,{monitor:4,computer:6,keyboard:4,mouse:4,ws_screwdrivers:1,ws_multimeter:1,ws_soldering:1});
  next.inventory.tool_multimeter=Math.max(1,Number(next.inventory.tool_multimeter||0));
  next.career.currentBranchId='hardware';
  next.career.branches||={};
  next.career.branches.hardware={tier:2,bestTier:2,xp:180,jobId:'v162_hardware_2',monthsWorked:0,promotionNotifiedTier:2};
  next.career.jobId='v162_hardware_2';
  next.career.startedYear=2000;
  next.career.v162Migrated=true;
  next.campaign.endChoice='new-game-plus';
  next.replay.newGamePlusUnlocked=true;
  addLog(next,'Новая игра+: сохранён профессиональный бэкграунд, хороший автомобиль, гараж и сильный стартовый компьютер.','success');
  return next;
}

export function exactEffectText(effect={}) {
  const parts=[];
  if(effect.cash)parts.push(`${effect.cash>0?'+':''}${Math.round(effect.cash).toLocaleString('ru-RU')} ₽`);
  if(effect.energy)parts.push(`энергия ${effect.energy>0?'+':''}${effect.energy}`);
  if(effect.mood)parts.push(`настроение ${effect.mood>0?'+':''}${effect.mood}`);
  const reputation=Number(effect.reputation ?? effect.rep ?? 0);
  if(reputation)parts.push(`репутация ${reputation>0?'+':''}${reputation}`);
  if(effect.company)parts.push(`репутация компании ${effect.company>0?'+':''}${effect.company}`);
  if(effect.deadlines)parts.push(`сроки заказов ${effect.deadlines>0?'+':''}${effect.deadlines} дн.`);
  if(effect.employeeMorale)parts.push(`мотивация команды ${effect.employeeMorale>0?'+':''}${effect.employeeMorale}`);
  return parts.join(' · ') || 'Без прямого числового эффекта';
}
