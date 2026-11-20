import { WORKSPACE_ITEMS, workspaceLevel, workspaceNextTier, workspaceState } from '../data/workspace.js';
import { addLog, addMoney, getInflation } from './progression.js';

export function workspaceUpgradeStatus(game, itemId) {
  const item = WORKSPACE_ITEMS.find((entry) => entry.id === itemId);
  if (!item) return { ok:false, reason:'Улучшение не найдено' };
  const level = workspaceLevel(game, itemId);
  const next = workspaceNextTier(game, itemId);
  if (!next) return { ok:false, maxed:true, reason:'Достигнут максимальный уровень', item, level };
  if (game.calendar.year < next.fromYear) return { ok:false, reason:`Доступно с ${next.fromYear} года`, item, level, next };
  if (game.player.level < next.reqLevel) return { ok:false, reason:`Нужен уровень ${next.reqLevel}`, item, level, next };
  const cost = Math.round(next.cost * getInflation(game));
  if (game.player.cash < cost) return { ok:false, reason:'Недостаточно денег', cost, item, level, next };
  return { ok:true, cost, item, level, next };
}

export function buyWorkspaceUpgrade(game, itemId) {
  const status = workspaceUpgradeStatus(game, itemId);
  if (!status.ok) return { ok:false, message:status.reason };
  addMoney(game, -status.cost, `Рабочее место: ${status.next.name}`);
  const state = workspaceState(game);
  state.items[itemId] = status.level + 1;
  state.totalSpent = Number(state.totalSpent || 0) + status.cost;
  addLog(game, `${status.item.name}: установлен уровень ${status.level + 1} — ${status.next.name}.`, 'success');
  return { ok:true, message:`${status.item.name}: ${status.next.name}` };
}
