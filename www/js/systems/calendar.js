import { WIFE_NAMES_F } from '../data/economy.js';
import { monthName, newsForDate } from '../data/news.js';
import { chance, clamp, pick, randomInt, uid } from '../core/utils.js';
import { addLog, addMoney, addPlayerXp, maxEnergy } from './progression.js';
import { processMonth, processVehicleDay, processYearTaxes } from './economy.js';
import { processV08Day, processV08Month, processV08Year } from './v08.js';
import { processV13Month, processV13Year } from './v13.js';
import { processExpiredKnowledge } from './knowledge.js';
import { CAMPAIGN_END_YEAR, ensureV160, markCampaignFinished } from './v160.js';
import { processAdvertisingDay } from './advertising.js';
import { closeMonthlyFinancialReport } from '../core/quality.js';
import { processBusinessOfficeMonth } from './v165.js';
import { reviewTextV166 } from './v166.js';
import { processLifestyleDay, processParallelHours } from './v169.js';
import { processV180Day } from './v180.js';

function normalizeCalendar(calendar) {
  while (calendar.day > 30) { calendar.day -= 30; calendar.month += 1; }
  while (calendar.month > 12) { calendar.month -= 12; calendar.year += 1; }
}
function processFamilyYear(game) {
  if (!game.family.partner && game.calendar.year>=2003 && game.player.reputation>=40 && chance(.16)) { game.family.partner=pick(WIFE_NAMES_F); game.family.partnerSince=game.calendar.year; game.family.relation=70; addLog(game,`В вашей жизни появилась ${game.family.partner}.`,'success'); return; }
  if (game.family.partner && game.calendar.year-game.family.partnerSince>=1 && chance(Math.max(.05,.3-game.family.children*.08))) { game.family.children+=1; addLog(game,`Пополнение в семье. Детей: ${game.family.children}.`,'success'); }
}
function processMonthlyNews(game) { const headlines=newsForDate(game.calendar.year,game.calendar.month); if(headlines.length)addLog(game,`Лента эпохи · ${monthName(game.calendar.month)} ${game.calendar.year}: ${pick(headlines)}`,'info'); }
function onNewYear(game) { processYearTaxes(game); processFamilyYear(game); game.player.mood=clamp(game.player.mood+8,0,100); game.player.energy=clamp(game.player.energy+20,0,maxEnergy(game)); }

function processOneDay(game, options={}, changeCalendar=true) {
  const previousMonth=game.calendar.month, previousYear=game.calendar.year;
  if(changeCalendar){ game.calendar.totalDays+=1; game.calendar.day+=1; normalizeCalendar(game.calendar); }
  processLifestyleDay(game);
  if(game.player.mood>60&&game.player.fun>50)game.player.health=clamp(game.player.health+.04,0,100);
  processVehicleDay(game);
  const timedOrders = game.orders.active.filter(order => order.orderType === 'warranty' || order.orderType === 'corporate');
  for(const order of timedOrders)order.deadlineDays-=1;
  const expired=timedOrders.filter(order=>order.deadlineDays<0);
  for(const order of expired){const stars=1;const review={id:uid('review'),orderUid:order.uid,clientId:order.client?.id,clientName:order.client?.name||'Клиент',stars,text:reviewTextV166(order,stars),at:{...game.calendar}};game.stats.ordersFailed+=1;game.stats.streak=0;game.player.reputation=Math.max(0,game.player.reputation-5);game.orders.reviews||=[];game.orders.reviews.unshift(review);game.orders.history.unshift({...order,status:'expired',review,finishedAt:{...game.calendar}});addLog(game,`Клиент забрал «${order.name}»: срок истёк, отзыв ${stars}/5.`,'danger');}
  game.orders.active=game.orders.active.filter(order=>!expired.includes(order));
  processAdvertisingDay(game);
  for(const entry of processExpiredKnowledge(game))addLog(game,`Знания из книги «${entry.name}» забылись. Материал снова доступен для повторения.`,'warning');
  if(changeCalendar && (game.calendar.month!==previousMonth||game.calendar.year!==previousYear) && game.calendar.day===1){processMonth(game);processV13Month(game);processV08Month(game);processBusinessOfficeMonth(game);processMonthlyNews(game);closeMonthlyFinancialReport(game);}
  if(changeCalendar && game.calendar.year!==previousYear && game.calendar.month===1 && game.calendar.day===1){onNewYear(game);processV08Year(game);processV13Year(game);}
  processV08Day(game);
  processV180Day(game);
}

export function advanceHours(game,hours,options={}) {
  ensureV160(game);
  let remaining=Math.max(0,Math.min(24*365,Number(hours)||0)); let advanced=0;
  while(remaining>0){
    const step=Math.min(remaining,24-Number(game.calendar.hour||0));
    game.calendar.hour=Number(game.calendar.hour||0)+step; game.calendar.totalHours=Number(game.calendar.totalHours||0)+step; advanced+=step; remaining-=step;
    processParallelHours(game,step,{resting:options.activity==='rest'});
    if(game.campaign.calendarFrozen){
      game.campaign.sandboxHours+=step;
      while(game.campaign.sandboxHours>=24){game.campaign.sandboxHours-=24;processOneDay(game,options,false);}
      if(Number(game.calendar.totalHours||0)%120===0)game.campaign.sandboxNewsMonth=game.campaign.sandboxNewsMonth%12+1;
      game.calendar.hour=game.calendar.hour%24;
      continue;
    }
    if(game.calendar.hour>=24){
      game.calendar.hour=0;
      if(game.calendar.year===CAMPAIGN_END_YEAR&&game.calendar.month===12&&game.calendar.day>=30){markCampaignFinished(game);break;}
      processOneDay(game,options,true);
      if(game.calendar.year>CAMPAIGN_END_YEAR){markCampaignFinished(game);break;}
    }
  }
  if(options.reason)addLog(game,`${options.reason}: прошло ${advanced} ч.`,'info');
  return advanced;
}
export function advanceDays(game,days,options={}) { return advanceHours(game,Math.max(0,Number(days)||0)*24,options)/24; }
