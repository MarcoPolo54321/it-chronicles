import { REFRESH_ORDERS_PENALTY_V166, deterministicReviewTextV166, orderTaskTypeIdV166 } from '../data/v166.js';
import { clamp } from '../core/utils.js';
import { ORDER_DEADLINES_V169 } from '../data/v169.js';

export function ensureV166(game) {
  game.orders ||= {available:[],active:[],history:[]};
  game.orders.available = Array.isArray(game.orders.available) ? game.orders.available : [];
  game.orders.active = Array.isArray(game.orders.active) ? game.orders.active : [];
  game.orders.history = Array.isArray(game.orders.history) ? game.orders.history : [];
  game.orders.refreshMeta ||= {count:0,lastRefreshTotalHours:-9999,discarded:0};
  game.orders.refreshMeta.count = Number(game.orders.refreshMeta.count||0);
  game.orders.refreshMeta.lastRefreshTotalHours = Number(game.orders.refreshMeta.lastRefreshTotalHours??-9999);
  game.orders.refreshMeta.discarded = Number(game.orders.refreshMeta.discarded||0);
  game.orders.reviews = Array.isArray(game.orders.reviews) ? game.orders.reviews : [];
  const firstMigration=!game.orders.v166Migrated;
  for (const order of [...game.orders.available,...game.orders.active,...game.orders.history]) {
    if (!order) continue;
    order.taskTypeId ||= orderTaskTypeIdV166(order);
    if (order.status !== 'available') {
      if(firstMigration && ['diagnosis','solution','repair','working','testing'].includes(order.status)){
        order.deadlineDays=Math.max(Number(order.deadlineDays||0),deadlineForOrderV166(order));
        order.acceptedAt ||= {...game.calendar};
        order.acceptedAtTotalHours ??= Number(game.calendar?.totalHours||0);
      }
      order.initialDeadlineDays = Math.max(1,Number(order.initialDeadlineDays||order.deadlineDays||deadlineForOrderV166(order)));
    }
  }
  game.orders.v166Migrated=true;
  return game;
}

export function targetAvailableOrdersV166(game) {
  const level=Math.max(1,Number(game.player?.level||1));
  let target=5;
  if(level>=4) target+=1;
  if(level>=7) target+=1;
  if(level>=10) target+=1;
  const personalAds=(game.marketing?.activeCampaigns||[]).filter(item=>item.scope==='personal'&&Number(item.daysLeft||0)>0).length;
  if(personalAds>0) target+=1;
  if(game.business?.opened && (game.business.stage||1)>=2) target+=1;
  return clamp(target,5,10);
}

export function deadlineForOrderV166(order) {
  if(order.orderType==='urgent') {
    const source=String(order.uid||order.templateId||order.name||'urgent');
    const hash=[...source].reduce((sum,char)=>((sum*31)+char.charCodeAt(0))>>>0,7);
    return ORDER_DEADLINES_V169.urgent.min + (hash % (ORDER_DEADLINES_V169.urgent.max - ORDER_DEADLINES_V169.urgent.min + 1));
  }
  if(order.orderType==='warranty') return ORDER_DEADLINES_V169.warranty;
  if(order.orderType==='corporate'||order.businessType) return ORDER_DEADLINES_V169.corporate;
  return ORDER_DEADLINES_V169.standard[order.difficulty] || ORDER_DEADLINES_V169.standard.easy;
}

export function refreshCooldownRemainingV166(game) {
  ensureV166(game);
  const elapsed=Number(game.calendar?.totalHours||0)-Number(game.orders.refreshMeta.lastRefreshTotalHours||-9999);
  return Math.max(0,REFRESH_ORDERS_PENALTY_V166.cooldownHours-elapsed);
}

export function reviewTextV166(order,stars) {
  return deterministicReviewTextV166(order,stars);
}

export function orderDeadlineProgressV166(order) {
  const total=Math.max(1,Number(order.initialDeadlineDays||order.deadlineDays||7));
  const left=Math.max(0,Number(order.deadlineDays||0));
  return {total,left,used:Math.max(0,total-left),ratio:clamp(left/total,0,1)};
}
