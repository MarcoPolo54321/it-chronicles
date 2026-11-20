import { ALL_COMPONENTS, PC_SLOTS } from '../data/components.js';
import { addLog } from './progression.js';

export function installedPart(game, slotId) {
  return game.pc.slots?.[slotId] || null;
}

function boardSocket(board) {
  return board?.mbSocket || board?.socket || null;
}

function estimatedWatts(slots) {
  return Number(slots.cpu?.tdp || 50) + Number(slots.gpu?.tdp || slots.gpu?.watts || 80) + 100;
}

export function pcSlotHint(game, slotId) {
  const slots = game.pc.slots || {};
  if (slotId === 'mb') return 'Начните с материнской платы — она определяет сокет процессора и тип памяти.';
  if (slotId === 'cpu' && !slots.mb) return 'Сначала установите материнскую плату.';
  if (slotId === 'ram' && !slots.mb) return 'Сначала установите материнскую плату, чтобы определить тип памяти.';
  if (slotId === 'cool' && !slots.cpu) return 'Сначала установите процессор.';
  if (['gpu', 'storage'].includes(slotId) && !slots.mb) return 'Сначала установите материнскую плату.';
  if (slotId === 'psu' && !slots.cpu && !slots.gpu) return 'Блок питания лучше выбирать после процессора и видеокарты.';
  return '';
}

export function compatiblePartsForSlot(game, slotId) {
  const slot = PC_SLOTS.find((item) => item.id === slotId);
  const hint = pcSlotHint(game, slotId);
  if (!slot || (slotId !== 'mb' && hint)) return [];
  const slots = game.pc.slots || {};
  return ALL_COMPONENTS.filter((part) => {
    if (part.cat !== slot.cat || (game.inventory[part.id] || 0) <= 0) return false;
    if (slotId === 'mb') {
      if (slots.cpu?.socket && boardSocket(part) !== slots.cpu.socket) return false;
      if (slots.ram?.ramType && part.ramType && part.ramType !== slots.ram.ramType) return false;
    }
    if (slotId === 'cpu' && slots.mb && part.socket && boardSocket(slots.mb) && part.socket !== boardSocket(slots.mb)) return false;
    if (slotId === 'ram' && slots.mb?.ramType && part.ramType && part.ramType !== slots.mb.ramType) return false;
    if (slotId === 'psu') {
      const required = estimatedWatts({ ...slots, psu: part });
      if (part.watts && Number(part.watts) < required) return false;
    }
    return true;
  });
}

function validationError(game, slotId, part) {
  const hint = pcSlotHint(game, slotId);
  if (hint && slotId !== 'mb') return hint;
  const slots = { ...(game.pc.slots || {}), [slotId]: part };
  const cpu = slots.cpu;
  const board = slots.mb;
  const ram = slots.ram;
  const psu = slots.psu;
  if (cpu && board && cpu.socket && boardSocket(board) && cpu.socket !== boardSocket(board)) return `Нужен процессор под сокет ${boardSocket(board)}`;
  if (ram && board && ram.ramType && board.ramType && ram.ramType !== board.ramType) return `Нужна память ${board.ramType}`;
  if (psu?.watts && Number(psu.watts) < estimatedWatts(slots)) return `Нужен блок питания не слабее ${estimatedWatts(slots)} W`;
  return '';
}

export function installPcPart(game, slotId, partId) {
  const slot = PC_SLOTS.find((item) => item.id === slotId);
  const part = ALL_COMPONENTS.find((item) => item.id === partId);
  if (!slot || !part || part.cat !== slot.cat) return { ok: false, message: 'Компонент не подходит к слоту' };
  if ((game.inventory[partId] || 0) <= 0) return { ok: false, message: 'Компонента нет на складе' };
  const error = validationError(game, slotId, part);
  if (error) return { ok: false, message: error };

  const oldPart = game.pc.slots[slotId];
  if (oldPart) game.inventory[oldPart.id] = (game.inventory[oldPart.id] || 0) + 1;
  game.inventory[partId] -= 1;
  if (game.inventory[partId] <= 0) delete game.inventory[partId];
  game.pc.slots[slotId] = structuredClone(part);
  game.pc.assembled = false;
  addLog(game, `${part.name} установлен в раздел «Сборка ПК».`, 'info');
  return { ok: true, message: part.name };
}

export function removePcPart(game, slotId) {
  const part = game.pc.slots[slotId];
  if (!part) return { ok: false, message: 'Слот пуст' };
  game.inventory[part.id] = (game.inventory[part.id] || 0) + 1;
  delete game.pc.slots[slotId];
  game.pc.assembled = false;
  return { ok: true, message: 'Компонент возвращён на склад' };
}

export function pcConflicts(game) {
  const slots = game.pc.slots || {};
  const errors = [];
  for (const slot of PC_SLOTS.filter((item) => item.required)) {
    if (!slots[slot.id]) errors.push(`Не установлен обязательный компонент: ${slot.name}`);
  }
  const cpu = slots.cpu;
  const board = slots.mb;
  const ram = slots.ram;
  const psu = slots.psu;
  if (cpu && board && cpu.socket && boardSocket(board) && cpu.socket !== boardSocket(board)) errors.push(`Несовместимый сокет: ${cpu.socket} и ${boardSocket(board)}`);
  if (ram && board && ram.ramType && board.ramType && ram.ramType !== board.ramType) errors.push(`Несовместимая память: ${ram.ramType} и ${board.ramType}`);
  if (psu) {
    const required = estimatedWatts(slots);
    const available = Number(psu.watts || 0);
    if (available && available < required) errors.push(`Слабый блок питания: нужно примерно ${required} W, доступно ${available} W`);
  }
  return errors;
}

export function pcPower(game) {
  return Math.max(0, Object.values(game.pc.slots || {}).reduce((sum, part) => sum + Number(part.pcPower || 0), 0));
}

export function pcTier(game) {
  const power = pcPower(game);
  if (power >= 24) return { name: 'Монстр эпохи', icon: 'MAX', bonus: 0.4 };
  if (power >= 17) return { name: 'Рабочая станция', icon: 'PRO', bonus: 0.3 };
  if (power >= 11) return { name: 'Игровой ПК', icon: 'GAME', bonus: 0.2 };
  if (power >= 7) return { name: 'Домашний ПК', icon: 'HOME', bonus: 0.12 };
  if (power >= 4) return { name: 'Офисный ПК', icon: 'PC', bonus: 0.06 };
  return { name: 'Набор деталей', icon: 'BOX', bonus: 0 };
}

export function assemblePc(game) {
  const errors = pcConflicts(game);
  if (errors.length) return { ok: false, message: errors[0], errors };
  game.pc.assembled = true;
  const tier = pcTier(game);
  addLog(game, `Собран собственный ПК: ${tier.name}.`, 'success');
  return { ok: true, message: tier.name };
}
