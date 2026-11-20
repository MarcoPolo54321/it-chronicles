// v0.16.2: time-limited advertising that runs independently from work and study.
import { ADVERTISING_V153 } from './advertising-v153.js';

export const AD_DURATIONS_V162 = Object.freeze([
  {id:'week',name:'1 неделя',days:7,priceMultiplier:1},
  {id:'month',name:'1 месяц',days:30,priceMultiplier:3.4},
  {id:'year',name:'1 год',days:360,priceMultiplier:30}
]);

export const AD_PLACEMENTS_V162 = ADVERTISING_V153.map((item)=>({
  ...item,
  id:item.id.replace('v153_ad_','v162_ad_'),
  baseCost:Number(item.cost||0),
  cost:undefined,
  type:'advertising-placement',
  educationKind:undefined,
  repeatCount:undefined,
  durationDays:undefined,
  strength:Math.max(1,Math.round(Number(item.marketingGains?.orderBonus||0)*260))
}));

export function advertisingPlacementById(id){return AD_PLACEMENTS_V162.find((item)=>item.id===id)||null;}
export function advertisingDurationById(id){return AD_DURATIONS_V162.find((item)=>item.id===id)||AD_DURATIONS_V162[0];}

export function activeAdvertisingBonuses(game,scope='personal'){
  const list=(game?.marketing?.activeCampaigns||[]).filter((item)=>item.scope===scope&&Number(item.daysLeft||0)>0);
  const totals=list.reduce((acc,item)=>{
    for(const[key,value]of Object.entries(item.bonuses||{}))acc[key]=Number(acc[key]||0)+Number(value||0);
    return acc;
  },{});
  if(scope==='company')return {
    orderBonus:Math.min(.25,Number(totals.orderBonus||0)),
    premiumBonus:Math.min(.25,Number(totals.premiumBonus||0)),
    reputationBonus:Math.min(.12,Number(totals.reputationBonus||0)),
    incomeBonus:Math.min(.15,Number(totals.incomeBonus||0)),
    campaigns:list.length
  };
  return {
    orderBonus:Math.min(.20,Number(totals.orderBonus||0)),
    rewardBonus:Math.min(.12,Number(totals.rewardBonus||0)),
    premiumBonus:Math.min(.20,Number(totals.premiumBonus||0)),
    reputationBonus:Math.min(.10,Number(totals.reputationBonus||0)),
    campaigns:list.length
  };
}

// Hidden balance rule: company revenue is converted to net player profit at 35–50%.
export function companyRevenueShare(game){
  const ad=activeAdvertisingBonuses(game,'company');
  return Math.min(.50,.35+Number(ad.incomeBonus||0));
}
