import { ALL_COMPONENTS } from '../data/components.js';
import { chance, pick, randomInt, uid } from '../core/utils.js';
import { addLog, addMoney, getInflation, skillLevel } from './progression.js';

function ensureFlea(game) {
  game.fleaMarket ||= { scrap:0, offers:[], lastFinds:[], brokenItems:[], cooldowns:{}, totalFinds:0 };
  game.fleaMarket.cooldowns ||= {};
  game.fleaMarket.offers ||= [];
  game.fleaMarket.lastFinds ||= [];
  game.fleaMarket.brokenItems ||= [];
  return game.fleaMarket;
}

function availableParts(game, categories, maxTier = 2, maxPrice = 15000) {
  return ALL_COMPONENTS.filter((item) => categories.includes(item.cat)
    && (item.fromYear || 2000) <= game.calendar.year
    && (!item.toYear || item.toYear >= game.calendar.year - 2)
    && (item.tier || 1) <= maxTier
    && (item.buyBase || 0) <= maxPrice);
}

const MODES = {
  trash: { days:3, energy:8, label:'Поиск старой техники' },
  boards: { days:4, energy:12, label:'Разбор списанных плат' },
  market: { days:5, energy:4, label:'Поход на радиорынок' }
};

export function fleaCooldown(game, mode) {
  const flea = ensureFlea(game);
  const until = Number(flea.cooldowns[mode] || 0);
  return Math.max(0, until - Number(game.calendar.totalDays || 0));
}

function setCooldown(game, mode) {
  ensureFlea(game).cooldowns[mode] = Number(game.calendar.totalDays || 0) + MODES[mode].days;
}

function recordFind(game, text, component = null) {
  const flea = ensureFlea(game);
  flea.lastFinds.unshift({ id:uid('find'), text, componentId:component?.id || null, day:game.calendar.totalDays, date:{...game.calendar} });
  flea.lastFinds = flea.lastFinds.slice(0, 12);
}

function brokenChanceFor(component, source) {
  const tier = Number(component?.tier || 1);
  const price = Number(component?.buyBase || 0);
  const base = source === 'market' ? .48 : source === 'boards' ? .82 : .72;
  return Math.min(.94, base + Math.max(0, tier - 1) * .04 + (price > 6000 ? .06 : 0));
}

function createBrokenItem(game, component, source, paid = 0) {
  const flea = ensureFlea(game);
  const tier = Number(component.tier || 1);
  const repairCost = Math.max(80, Math.round((component.buyBase || 300) * getInflation(game) * (.05 + tier * .025)));
  const item = {
    id:uid('broken'), componentId:component.id, source, paid,
    repairCost, attempts:0, foundAt:{...game.calendar}
  };
  flea.brokenItems.unshift(item);
  flea.totalFinds += 1;
  game.stats.fleaFinds = Number(game.stats.fleaFinds || 0) + 1;
  recordFind(game, `${source}: найдено неисправное «${component.name}»`, component);
  addLog(game, `${source}: «${component.name}» требует ремонта.`, 'warning');
  return { ok:true, message:`Найдено неисправное: ${component.name}` };
}

function receiveWorkingComponent(game, component, source) {
  game.inventory[component.id] = Number(game.inventory[component.id] || 0) + 1;
  game.fleaMarket.totalFinds += 1;
  game.stats.fleaFinds = Number(game.stats.fleaFinds || 0) + 1;
  recordFind(game, `${source}: рабочая находка «${component.name}»`, component);
  addLog(game, `${source}: найдено рабочее «${component.name}».`, 'success');
  return { ok:true, message:`Рабочая находка: ${component.name}` };
}

function findResult(game, component, sourceKey, label) {
  if (!component) return { ok:true, message:'Подходящих находок в этой эпохе нет' };
  return chance(brokenChanceFor(component, sourceKey))
    ? createBrokenItem(game, component, label)
    : receiveWorkingComponent(game, component, label);
}

export function searchFleaMarket(game, mode) {
  const config = MODES[mode];
  if (!config) return { ok:false, message:'Неизвестный раздел барахолки' };
  const cooldown = fleaCooldown(game, mode);
  if (cooldown > 0) return { ok:false, message:`Можно повторить через ${cooldown} дн.` };
  if (game.player.energy < config.energy) return { ok:false, message:`Нужно ${config.energy} энергии` };
  game.player.energy -= config.energy;
  setCooldown(game, mode);
  const flea = ensureFlea(game);

  if (mode === 'market') {
    const candidates = availableParts(game, ['cpu','gpu','ram','storage','mb','periph','tool','cons'], 3, 30000);
    const shuffled = [...candidates].sort(() => Math.random() - .5).slice(0, 7);
    flea.offers = shuffled.map((component) => {
      const conditionRoll = Math.random();
      const condition = conditionRoll < .46 ? 'broken' : conditionRoll < .72 ? 'unknown' : 'working';
      const factor = condition === 'broken' ? randomInt(14, 28) / 100 : condition === 'unknown' ? randomInt(28, 45) / 100 : randomInt(48, 68) / 100;
      return { id:uid('offer'), componentId:component.id, condition, price:Math.max(50, Math.round((component.buyBase || 100) * getInflation(game) * factor)) };
    });
    recordFind(game, `Радиорынок: найдено предложений ${flea.offers.length}`);
    addLog(game, `Радиорынок обновлён: ${flea.offers.length} предложений разного состояния.`, 'info');
    return { ok:true, message:`На рынке найдено ${flea.offers.length} предложений` };
  }

  flea.scrap += randomInt(1, mode === 'boards' ? 3 : 2);
  const hasSolder = Boolean(game.inventory.tool_solder_iron);
  const successChance = mode === 'boards' ? (hasSolder ? .74 : .48) : .52;
  if (!chance(successChance)) {
    recordFind(game, `${config.label}: только лом и провода`);
    addLog(game, `${config.label}: пригодных деталей не найдено.`, 'warning');
    return { ok:true, message:'Полезных деталей нет, но добавлен электронный лом' };
  }
  const categories = mode === 'boards' ? ['cpu','ram','mb','storage'] : ['ram','storage','periph','cons'];
  const component = pick(availableParts(game, categories, mode === 'boards' ? 2 : 1, mode === 'boards' ? 12000 : 5000));
  return findResult(game, component, mode, config.label);
}

export function buyFleaOffer(game, offerId) {
  const flea = ensureFlea(game);
  const offer = flea.offers.find((item) => item.id === offerId);
  if (!offer) return { ok:false, message:'Предложение уже исчезло' };
  const component = ALL_COMPONENTS.find((item) => item.id === offer.componentId);
  if (!component) return { ok:false, message:'Деталь не найдена' };
  if (game.player.cash < offer.price) return { ok:false, message:'Недостаточно денег' };
  addMoney(game, -offer.price, `Барахолка: ${component.name}`);
  flea.offers = flea.offers.filter((item) => item.id !== offerId);

  const actuallyBroken = offer.condition === 'broken' || (offer.condition === 'unknown' && chance(.62));
  if (actuallyBroken) return createBrokenItem(game, component, 'Радиорынок', offer.price);
  recordFind(game, `Куплено рабочее на радиорынке: ${component.name}`, component);
  game.inventory[component.id] = Number(game.inventory[component.id] || 0) + 1;
  return { ok:true, message:`Куплено рабочее: ${component.name}` };
}

export function repairFleaItem(game, brokenId) {
  const flea = ensureFlea(game);
  const item = flea.brokenItems.find((entry) => entry.id === brokenId);
  if (!item) return { ok:false, message:'Неисправная деталь не найдена' };
  const component = ALL_COMPONENTS.find((entry) => entry.id === item.componentId);
  if (!component) return { ok:false, message:'Компонент не найден' };
  if (game.player.cash < item.repairCost) return { ok:false, message:`На попытку ремонта нужно ${item.repairCost.toLocaleString('ru-RU')} руб.` };
  addMoney(game, -item.repairCost, `Попытка ремонта: ${component.name}`);
  item.attempts += 1;
  const repairSkill = skillLevel(game,'repair');
  const hardwareSkill = skillLevel(game,'hardware');
  const hasSolder = Boolean(game.inventory.tool_solder_iron);
  const probability = Math.max(.18, Math.min(.9, .28 + repairSkill * .055 + hardwareSkill * .018 + (hasSolder ? .08 : 0) - Number(component.tier || 1) * .035));
  flea.brokenItems = flea.brokenItems.filter((entry) => entry.id !== brokenId);
  if (chance(probability)) {
    game.inventory[component.id] = Number(game.inventory[component.id] || 0) + 1;
    game.stats.repairedFleaItems = Number(game.stats.repairedFleaItems || 0) + 1;
    game.stats.fleaRepairRevenue = Number(game.stats.fleaRepairRevenue || 0) + Math.round((component.buyBase || 0) * getInflation(game) * (component.sell || .3));
    recordFind(game, `Ремонт успешен: ${component.name}`, component);
    addLog(game, `Удалось восстановить «${component.name}».`, 'success');
    return { ok:true, message:`Ремонт успешен: ${component.name}` };
  }
  flea.scrap += Math.max(1, Number(component.tier || 1));
  recordFind(game, `Ремонт не удался: ${component.name} разобрано на лом`, component);
  addLog(game, `Ремонт «${component.name}» не удался. Деталь потеряна.`, 'danger');
  return { ok:false, message:'Ремонт не удался: деталь потеряна, часть лома сохранена' };
}

export function salvageFleaItem(game, brokenId) {
  const flea = ensureFlea(game);
  const item = flea.brokenItems.find((entry) => entry.id === brokenId);
  if (!item) return { ok:false, message:'Деталь не найдена' };
  const component = ALL_COMPONENTS.find((entry) => entry.id === item.componentId);
  flea.brokenItems = flea.brokenItems.filter((entry) => entry.id !== brokenId);
  const scrap = Math.max(1, Number(component?.tier || 1));
  flea.scrap += scrap;
  return { ok:true, message:`Разобрано на лом: +${scrap}` };
}

export function sellScrap(game) {
  const flea = ensureFlea(game);
  if (flea.scrap <= 0) return { ok:false, message:'Электронного лома пока нет' };
  const amount = Math.round(flea.scrap * 45 * getInflation(game));
  addMoney(game, amount, 'Продажа электронного лома');
  const count = flea.scrap;
  flea.scrap = 0;
  return { ok:true, message:`Продано ${count} ед. лома за ${amount.toLocaleString('ru-RU')} руб.` };
}
