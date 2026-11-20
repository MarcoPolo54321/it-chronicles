import { uid } from '../core/utils.js';
import { AD_DURATIONS_V162, AD_PLACEMENTS_V162, activeAdvertisingBonuses, advertisingDurationById, advertisingPlacementById } from '../data/advertising-v162.js';
import { addLog, addMoney, getInflation } from './progression.js';

export function ensureAdvertisingV162(game){
  game.marketing||={};
  game.marketing.activeCampaigns||=[];
  game.marketing.analytics||={spend:0,leads:0,orders:0,revenue:0,campaignsStarted:0};
  game.marketing.reports=Array.isArray(game.marketing.reports)?game.marketing.reports:[];
  game.marketing.campaignsCompleted=Number(game.marketing.campaignsCompleted||0);
  if(!game.marketing.v162Migrated){
    // Old campaigns were permanent educational bonuses. Reset only those bonuses;
    // company-type perks now live in the business system instead.
    game.marketing.orderBonus=0;
    game.marketing.rewardBonus=0;
    game.marketing.reputationBonus=0;
    game.marketing.premiumBonus=0;
    game.marketing.v162Migrated=true;
  }
  return game.marketing;
}

export function advertisingPrice(game,placement,scope='personal',durationId='week'){
  const duration=advertisingDurationById(durationId);
  const scopeMultiplier=scope==='company'?5:1;
  return Math.max(100,Math.round(Number(placement?.baseCost||0)*duration.priceMultiplier*scopeMultiplier*getInflation(game)));
}

export function advertisingRequirements(game,placement,scope='personal',durationId='week'){
  ensureAdvertisingV162(game);
  if(!placement)return{ok:false,reason:'Площадка не найдена'};
  if(Number(placement.fromYear||2000)>game.calendar.year)return{ok:false,reason:`Доступно с ${placement.fromYear} года`};
  if(scope==='company'&&!game.business?.opened)return{ok:false,reason:'Сначала откройте компанию'};
  if(game.player.level<Number(placement.reqLevel||1))return{ok:false,reason:`Нужен уровень ${placement.reqLevel}`};
  const price=advertisingPrice(game,placement,scope,durationId);
  if(game.player.cash<price)return{ok:false,reason:`Нужно ${price.toLocaleString('ru-RU')} ₽`};
  return{ok:true,reason:'',price};
}

function campaignBonuses(placement,scope){
  const gains=placement.marketingGains||{};
  if(scope==='company')return {
    orderBonus:Number((Number(gains.orderBonus||0)*1.15).toFixed(4)),
    premiumBonus:Number((Number(gains.premiumBonus||0)*1.10).toFixed(4)),
    reputationBonus:Number((Number(gains.reputationBonus||0)*.7).toFixed(4)),
    incomeBonus:Number((.018+Number(placement.strength||1)*.012).toFixed(4))
  };
  return {
    orderBonus:Number(gains.orderBonus||0),
    rewardBonus:Number(gains.rewardBonus||0),
    premiumBonus:Number(gains.premiumBonus||0),
    reputationBonus:Number(gains.reputationBonus||0)
  };
}

export function startAdvertisingCampaign(game,placementId,scope='personal',durationId='week'){
  const placement=advertisingPlacementById(placementId);
  const duration=advertisingDurationById(durationId);
  const check=advertisingRequirements(game,placement,scope,durationId);
  if(!check.ok)return{ok:false,message:check.reason};
  addMoney(game,-check.price,`${scope==='company'?'Реклама компании':'Личная реклама'}: ${placement.name}`);
  const marketing=ensureAdvertisingV162(game);
  const existing=marketing.activeCampaigns.find((item)=>item.placementId===placement.id&&item.scope===scope);
  if(existing){
    existing.daysLeft=Math.min(720,Number(existing.daysLeft||0)+duration.days);
    existing.totalDays=existing.daysLeft;
    existing.durationId=duration.id;
    existing.bonuses=campaignBonuses(placement,scope);
    existing.lastExtendedAt={...game.calendar};
    existing.price=Number(existing.price||0)+check.price;
    existing.stats||={leads:0,orders:0,revenue:0};
  }else{
    marketing.activeCampaigns.push({
      id:uid('ad'),placementId:placement.id,name:placement.name,category:placement.category,
      scope,durationId:duration.id,daysLeft:duration.days,totalDays:duration.days,
      bonuses:campaignBonuses(placement,scope),startedAt:{...game.calendar},price:check.price,
      stats:{leads:0,orders:0,revenue:0}
    });
  }
  marketing.analytics.spend=Number(marketing.analytics.spend||0)+check.price;
  marketing.analytics.campaignsStarted=Number(marketing.analytics.campaignsStarted||0)+1;
  addLog(game,`${scope==='company'?'Реклама компании':'Личная реклама'} запущена: ${placement.name} на ${duration.name.toLowerCase()}.`,'success');
  return{ok:true,message:`Реклама активна: ${duration.name}`};
}

export function processAdvertisingDay(game){
  const marketing=ensureAdvertisingV162(game);
  const expired=[];
  for(const campaign of marketing.activeCampaigns){
    campaign.daysLeft=Math.max(0,Number(campaign.daysLeft||0)-1);
    if(campaign.daysLeft<=0)expired.push(campaign);
  }
  if(expired.length){
    marketing.activeCampaigns=marketing.activeCampaigns.filter((item)=>item.daysLeft>0);
    marketing.campaignsCompleted+=expired.length;
    for(const item of expired){
      const stats=item.stats||{leads:0,orders:0,revenue:0};
      const report={
        id:item.id,placementId:item.placementId,name:item.name,scope:item.scope,
        durationId:item.durationId,price:Number(item.price||0),
        leads:Number(stats.leads||0),orders:Number(stats.orders||0),revenue:Number(stats.revenue||0),
        profit:Number(stats.revenue||0)-Number(item.price||0),
        startedAt:item.startedAt,finishedAt:{...game.calendar}
      };
      marketing.reports.unshift(report);
      marketing.reports=marketing.reports.slice(0,60);
      addLog(game,`Реклама завершена: ${item.name}. Заказов ${report.orders}, выручка ${report.revenue.toLocaleString('ru-RU')} ₽, итог ${report.profit>=0?'+':''}${report.profit.toLocaleString('ru-RU')} ₽.`,'info');
    }
  }
  return expired;
}

export function activeCampaignIds(game,scope='personal'){
  const marketing=ensureAdvertisingV162(game);
  return marketing.activeCampaigns.filter(item=>item.scope===scope&&item.daysLeft>0).map(item=>item.id);
}

export function recordAdvertisingLead(game,campaignIds=[]){
  const marketing=ensureAdvertisingV162(game);
  for(const id of campaignIds){
    const item=marketing.activeCampaigns.find(c=>c.id===id);
    if(item){item.stats||={leads:0,orders:0,revenue:0};item.stats.leads+=1;}
  }
  marketing.analytics.leads=Number(marketing.analytics.leads||0)+campaignIds.length;
}

export function recordAdvertisingOrder(game,campaignIds=[],revenue=0){
  const marketing=ensureAdvertisingV162(game);
  for(const id of campaignIds){
    const item=marketing.activeCampaigns.find(c=>c.id===id);
    const report=marketing.reports.find(c=>c.id===id);
    const target=item||report;
    if(target){
      target.stats||={leads:Number(target.leads||0),orders:Number(target.orders||0),revenue:Number(target.revenue||0)};
      target.stats.orders+=1;
      target.stats.revenue+=Number(revenue||0);
      if(report){report.orders=target.stats.orders;report.revenue=target.stats.revenue;report.profit=report.revenue-report.price;}
    }
  }
  marketing.analytics.orders=Number(marketing.analytics.orders||0)+campaignIds.length;
  marketing.analytics.revenue=Number(marketing.analytics.revenue||0)+Number(revenue||0);
}

export function advertisingSummary(game,scope='personal'){
  ensureAdvertisingV162(game);
  return activeAdvertisingBonuses(game,scope);
}

export const ADVERTISING_CATALOG_V162=AD_PLACEMENTS_V162;
export const ADVERTISING_DURATIONS_V162=AD_DURATIONS_V162;
