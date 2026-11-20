import { addLog, addMoney, skillLevel } from './progression.js';
import { advanceHours } from './calendar.js';
import { CLIENT_ARCHETYPES_V182, RELEASE_BALANCE_V182, RELEASE_GOALS_V182, SPECIALIZATION_PERKS_V182 } from '../data/v182.js';

function clamp(value,min,max){return Math.max(min,Math.min(max,Number(value)||0));}
function hashString(value=''){
  let hash=2166136261;
  for(const char of String(value)){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}
  return Math.abs(hash>>>0);
}

export function ensureV182(game){
  game.v182 ||= {
    releaseCandidate:true,
    tutorial:{dismissed:false},
    recovery:{lastDay:-999,uses:0},
    reports:[],
    feedback:{lastCreatedAt:null},
    stats:{emergencyJobs:0,deadEndsPrevented:0}
  };
  game.v182.tutorial ||= {dismissed:false};
  game.v182.recovery ||= {lastDay:-999,uses:0};
  game.v182.reports = Array.isArray(game.v182.reports)?game.v182.reports:[];
  game.v182.feedback ||= {lastCreatedAt:null};
  game.v182.stats ||= {emergencyJobs:0,deadEndsPrevented:0};
  game.v182.stats.emergencyJobs=Number(game.v182.stats.emergencyJobs||0);
  game.v182.stats.deadEndsPrevented=Number(game.v182.stats.deadEndsPrevented||0);
  game.clients ||= {records:{},repeatOrders:0,referrals:0};
  game.clients.records ||= {};
  for(const client of Object.values(game.clients.records))applyClientArchetypeV182(client);
  return game.v182;
}

export function clientArchetypeV182(client){
  if(!client)return CLIENT_ARCHETYPES_V182[0];
  const found=CLIENT_ARCHETYPES_V182.find((item)=>item.id===client.archetypeId);
  if(found)return found;
  const tier=String(client.tierId||'home');
  const allowed=tier==='student'
    ? ['economical','impatient','loyal']
    : tier==='home'
      ? ['economical','loyal','referrer','demanding']
      : tier==='freelancer'
        ? ['demanding','impatient','referrer']
        : ['corporate','demanding','referrer'];
  const id=allowed[hashString(client.id||client.name)%allowed.length];
  return CLIENT_ARCHETYPES_V182.find((item)=>item.id===id)||CLIENT_ARCHETYPES_V182[0];
}

export function applyClientArchetypeV182(client){
  if(!client)return client;
  const archetype=clientArchetypeV182(client);
  client.archetypeId=archetype.id;
  client.archetypeName=archetype.name;
  client.archetypeDesc=archetype.desc;
  if(!client.archetypeAppliedV182){
    client.priceSensitivity=Number(client.priceSensitivity??1)*Number(archetype.priceSensitivity||1);
    client.payMult=Number(client.payMult||1)*Number(archetype.payMult||1);
    client.patience=Math.max(3,Math.round(Number(client.patience||8)*Number(archetype.patienceMult||1)));
    client.archetypeAppliedV182=true;
  }
  return client;
}

export function specializationPerkV182(game){
  const id=game.specialization?.active||game.career?.currentBranchId||game.profile?.specialization||'hardware';
  return SPECIALIZATION_PERKS_V182[id]||SPECIALIZATION_PERKS_V182.hardware;
}

export function releaseGoalsV182(game){
  ensureV182(game);
  const completed={
    accept_order:Number(game.orders?.active?.length||0)>0||Number(game.orders?.history?.length||0)>0,
    finish_order:Number(game.stats?.ordersDone||0)>0,
    buy_item:Number(game.stats?.itemsBought||0)>0,
    study:Number(game.stats?.studiesCompleted||0)>0||Object.keys(game.education?.completed||{}).length>0,
    advertise:Number(game.marketing?.analytics?.campaignsStarted||0)>0,
    rest:Number(game.stats?.daysRested||0)>0
  };
  return RELEASE_GOALS_V182.map((goal)=>({...goal,done:Boolean(completed[goal.id])}));
}

export function recoveryStatusV182(game){
  ensureV182(game);
  const day=Number(game.calendar?.totalDays||0);
  const cooldown=Math.max(0,RELEASE_BALANCE_V182.emergencyCooldownDays-(day-Number(game.v182.recovery.lastDay||-999)));
  const noOrders=!(game.orders?.available?.length||0)&&!(game.orders?.active?.length||0);
  const lowCash=Number(game.player?.cash||0)<RELEASE_BALANCE_V182.emergencyCashThreshold;
  const lowEnergy=Number(game.player?.energy||0)<RELEASE_BALANCE_V182.emergencyEnergyThreshold;
  return{available:cooldown<=0&&(lowCash||lowEnergy||noOrders),cooldown,lowCash,lowEnergy,noOrders};
}

export function emergencyRecoveryV182(game){
  const state=recoveryStatusV182(game);
  if(!state.available)return{ok:false,message:state.cooldown>0?`Экстренная помощь будет доступна через ${state.cooldown} дн.`:'Сейчас экстренная помощь не требуется'};
  const day=Number(game.calendar?.totalDays||0);
  if(state.lowEnergy){
    game.player.energy=clamp(Number(game.player.energy||0)+RELEASE_BALANCE_V182.emergencyRestGain,0,100);
    game.player.mood=clamp(Number(game.player.mood||0)-3,0,100);
    advanceHours(game,12,{activity:'rest',reason:'Экстренное восстановление'});
    game.v182.recovery.lastDay=day;
    game.v182.recovery.uses+=1;
    game.v182.stats.deadEndsPrevented+=1;
    addLog(game,'Экстренное восстановление: бесплатный сон вернул часть энергии.','info');
    return{ok:true,message:`Энергия восстановлена на ${RELEASE_BALANCE_V182.emergencyRestGain}% · прошло 12 ч.`};
  }
  game.player.energy=clamp(Number(game.player.energy||0)-RELEASE_BALANCE_V182.emergencyEnergyCost,0,100);
  addMoney(game,RELEASE_BALANCE_V182.emergencyReward,'Экстренная подработка');
  advanceHours(game,6,{activity:'productive',reason:'Экстренная подработка'});
  game.v182.recovery.lastDay=day;
  game.v182.recovery.uses+=1;
  game.v182.stats.emergencyJobs+=1;
  game.v182.stats.deadEndsPrevented+=1;
  addLog(game,'Экстренная подработка помогла избежать финансового тупика.','success');
  return{ok:true,message:`Подработка завершена: +${RELEASE_BALANCE_V182.emergencyReward.toLocaleString('ru-RU')} ₽ · энергия −${RELEASE_BALANCE_V182.emergencyEnergyCost}`};
}

export function releaseReadinessReportV182(game){
  ensureV182(game);
  const warnings=[];
  if(Number(game.player?.cash||0)<0)warnings.push('Баланс денег отрицательный.');
  if(Number(game.player?.energy||0)<0||Number(game.player?.energy||0)>100)warnings.push('Энергия вне диапазона 0–100.');
  if(!Array.isArray(game.orders?.available)||!Array.isArray(game.orders?.active))warnings.push('Повреждена структура заказов.');
  if((game.orders?.active||[]).some((order)=>!order.uid||!order.status))warnings.push('Есть активный заказ без ID или статуса.');
  if(Number(game.calendar?.year||2000)>2010)warnings.push('Календарь вышел за пределы кампании 2010 года.');
  if((game.v18?.notifications||[]).length>80)warnings.push('Центр уведомлений переполнен.');
  const goals=releaseGoalsV182(game);
  const completed=goals.filter((goal)=>goal.done).length;
  return{
    ok:warnings.length===0,
    warnings,
    completedGoals:completed,
    totalGoals:goals.length,
    year:Number(game.calendar?.year||2000),
    activeOrders:Number(game.orders?.active?.length||0),
    availableOrders:Number(game.orders?.available?.length||0),
    errors:Number(game.stability?.sessionErrors?.length||0),
    saveVersion:Number(game.version||0)
  };
}

export function feedbackReportV182(game,screen='home'){
  const report=releaseReadinessReportV182(game);
  const lastLog=(game.log||[])[0]?.text||'нет';
  const text=[
    'Хроники Айтишника — отчёт открытого теста',
    `Версия игры: 0.18.3`,
    `Схема сохранения: ${game.version}`,
    `Экран: ${screen}`,
    `Игровая дата: ${String(game.calendar?.day||1).padStart(2,'0')}.${String(game.calendar?.month||1).padStart(2,'0')}.${game.calendar?.year||2000} ${String(Math.floor(Number(game.calendar?.hour||0))).padStart(2,'0')}:00`,
    `Игрок: уровень ${game.player?.level||1}, деньги ${Math.round(Number(game.player?.cash||0))} ₽, энергия ${Math.round(Number(game.player?.energy||0))}%`,
    `Заказы: доступно ${report.availableOrders}, активно ${report.activeOrders}, выполнено ${game.stats?.ordersDone||0}`,
    `Последнее событие: ${lastLog}`,
    `Ошибки сессии: ${report.errors}`,
    '',
    'Что произошло:',
    '[опишите проблему здесь]',
    '',
    'Что ожидалось:',
    '[опишите ожидаемый результат здесь]'
  ].join('\n');
  game.v182.feedback.lastCreatedAt=new Date().toISOString();
  return text;
}
