import { ALL_COMPONENTS } from '../data/components.js';
import { ALL_LOCATIONS, ALL_VEHICLES, BANK, ENTERTAINMENT } from '../data/economy.js';
import { addLog, addMoney, addPlayerXp, currentSalary, discount, getInflation, getJob, getLocation, getVehicle, maxEnergy } from './progression.js';
import { clamp, randomInt, uid } from '../core/utils.js';
import { addProfessionXp, ensureCareerV162 } from './career.js';
import { restEnergyBonus } from './v169.js';
import { SPECIALIZATION_PERKS_V182 } from '../data/v182.js';

export function componentPrice(game, component) {
  const age = Math.max(0, game.calendar.year - (component.toYear || game.calendar.year));
  const obsoleteDiscount = component.toYear && game.calendar.year > component.toYear ? Math.max(0.45, 1 - age * 0.1) : 1;
  const marketMultiplier = Number(game.market?.categoryMultipliers?.[component.cat] || 1) * Number(game.market?.priceIndex || 1);
  const specializationId=game.specialization?.active||game.career?.currentBranchId||game.profile?.specialization||'hardware';
  const specializationDiscount=specializationId==='hardware'?1-Number(SPECIALIZATION_PERKS_V182.hardware.costDiscount||0):1;
  return Math.max(1, Math.round(component.buyBase * getInflation(game) * discount(game) * obsoleteDiscount * marketMultiplier * specializationDiscount));
}

export function componentSellPrice(game, component) {
  return Math.max(1, Math.round(componentPrice(game, component) * (component.sell || 0.3)));
}

export function availableComponents(game, category = null) {
  return ALL_COMPONENTS.filter((component) => {
    if (category && category !== 'all' && component.cat !== category) return false;
    if (component.fromYear > game.calendar.year) return false;
    if (component.toYear && game.calendar.year > component.toYear + 2) return false;
    return true;
  });
}

export function buyComponent(game, id, quantity = 1) {
  const component = ALL_COMPONENTS.find((item) => item.id === id);
  if (!component) return { ok: false, message: 'Товар не найден' };
  const count = Math.max(1, Math.min(20, Number(quantity) || 1));
  const total = componentPrice(game, component) * count;
  if (game.player.cash < total) return { ok: false, message: `Нужно ${total.toLocaleString('ru-RU')} ₽` };
  addMoney(game, -total, `Покупка: ${component.name} ×${count}`);
  game.inventory[id] = (game.inventory[id] || 0) + count;
  game.stats.itemsBought += count;
  return { ok: true, message: `${component.name} добавлен на склад` };
}

export function sellComponent(game, id, quantity = 1) {
  const component = ALL_COMPONENTS.find((item) => item.id === id);
  const count = Math.max(1, Math.min(game.inventory[id] || 0, Number(quantity) || 1));
  if (!component || count <= 0) return { ok: false, message: 'На складе нет этого товара' };
  const total = componentSellPrice(game, component) * count;
  game.inventory[id] -= count;
  if (game.inventory[id] <= 0) delete game.inventory[id];
  addMoney(game, total, `Продажа: ${component.name} ×${count}`);
  return { ok: true, message: `Продано за ${total.toLocaleString('ru-RU')} ₽` };
}

export function monthlyExpenses(game) {
  const location = getLocation(game);
  const vehicle = getVehicle(game);
  const familyExpense = game.family.partner ? Math.round(2500 * getInflation(game) + game.family.children * 1800 * getInflation(game)) : 0;
  return Math.round(((location.monthlyCostBase || 0) + (vehicle.monthlyCostBase || 0)) * getInflation(game) + familyExpense);
}

export function dailyVehicleExpense(game) {
  const vehicle = getVehicle(game);
  return Math.max(0, Math.round(Number(vehicle.dailyCostBase || 0) * getInflation(game)));
}

export function processVehicleDay(game) {
  const cost = dailyVehicleExpense(game);
  if (cost <= 0) return 0;
  addMoney(game, -cost, `Эксплуатация транспорта: ${getVehicle(game).name}`, { silent:true });
  game.property.vehicleDailySpent = Math.max(0, Number(game.property.vehicleDailySpent || 0)) + cost;
  return cost;
}

export function processMonth(game) {
  ensureCareerV162(game);
  const salary = currentSalary(game);
  if (salary > 0) {
    const job = getJob(game);
    addMoney(game, salary, `Зарплата: ${job?.name || 'работа'}`);
    game.career.totalSalary = Number(game.career.totalSalary || 0) + salary;
    const tier = Number(job?.careerTier || 1);
    const workXp = 35 + tier * 25;
    addPlayerXp(game, workXp, 'work', `Месяц работы: ${job?.name || 'работа'}`);
    addProfessionXp(game, 45 + tier * 25, `Опыт в профессии «${job?.name || 'работа'}»`);
  }
  const expenses = monthlyExpenses(game);
  if (expenses > 0) addMoney(game, -expenses, 'Ежемесячные расходы');

  for (const deposit of [...game.bank.deposits]) {
    deposit.daysLeft -= 30;
    if (deposit.daysLeft <= 0) {
      addMoney(game, deposit.payout, `Вклад «${deposit.name}» закрыт`);
      game.bank.deposits = game.bank.deposits.filter((item) => item.id !== deposit.id);
    }
  }
  for (const loan of game.bank.loans) {
    loan.daysLeft -= 30;
    if (loan.daysLeft <= 0 && !loan.overdue) {
      loan.overdue = true;
      loan.repay = Math.round(loan.repay * 1.1);
      game.player.reputation = Math.max(0, game.player.reputation - 10);
      addLog(game, `Просрочка кредита «${loan.name}». Долг увеличен на 10%.`, 'danger');
    }
  }
}

export function processYearTaxes(game) {
  // Налоговая механика удалена в 0.17.3. Поле сохраняется только для совместимости старых сохранений.
  game.bank.yearlyIncome = 0;
  game.bank.taxDebt = 0;
  game.bank.selfEmployed = false;
}

export function openDeposit(game, rateId, amount) {
  const rate = BANK.depositRates.find((item) => item.id === rateId);
  const value = Math.floor(Number(amount));
  if (!rate || !Number.isFinite(value) || value < rate.minAmount) return { ok: false, message: 'Некорректная сумма вклада' };
  if (game.player.cash < value) return { ok: false, message: 'Недостаточно денег' };
  addMoney(game, -value, `Открытие вклада «${rate.name}»`);
  game.bank.deposits.push({ id: uid('deposit'), rateId, name: rate.name, amount: value, payout: Math.round(value * (1 + rate.rate)), daysLeft: rate.termDays });
  return { ok: true, message: 'Вклад открыт' };
}

export function creditStatus(game, rate) {
  if (!rate) return { ok: false, limit: 0, reason: 'Кредитная программа не найдена' };
  const months = Math.floor((game.calendar.totalDays || 0) / 30);
  const requiredMonths = Math.max(2, Number(rate.minMonths || 0));
  const averageIncome = months > 0 ? Math.floor((game.bank.totalIncome || 0) / months) : 0;
  const minimumIncome = rate.id === 'l1' ? 3000 : rate.id === 'l2' ? 15000 : 50000;
  if ((game.bank.loans || []).length > 0) return { ok: false, limit: 0, months, averageIncome, reason: 'Сначала погасите действующий кредит' };
  if (months < requiredMonths) return { ok: false, limit: 0, months, averageIncome, reason: `Нужна история дохода: ${requiredMonths} мес. (${months}/${requiredMonths})` };
  if (averageIncome < minimumIncome) return { ok: false, limit: 0, months, averageIncome, reason: `Средний доход должен быть от ${minimumIncome.toLocaleString('ru-RU')} руб./мес.` };
  const incomeLimit = Math.floor(averageIncome * Math.max(1, Number(rate.incomeMultiplier || 1)));
  const hardCap = Math.max(1000, Number(rate.baseMax || incomeLimit));
  const limit = Math.max(0, Math.min(hardCap, incomeLimit));
  return { ok: limit > 0, limit, months, averageIncome, reason: limit > 0 ? '' : 'Кредитный лимит пока не рассчитан' };
}

export function takeLoan(game, rateId, amount) {
  const rate = BANK.loanRates.find((item) => item.id === rateId);
  const status = creditStatus(game, rate);
  const value = Math.floor(Number(amount));
  if (!status.ok) return { ok: false, message: status.reason };
  if (!Number.isFinite(value) || value <= 0 || value > status.limit) return { ok: false, message: `Доступный лимит: ${status.limit.toLocaleString('ru-RU')} руб.` };
  game.player.cash += value;
  addLog(game, `Кредит «${rate.name}»: +${value.toLocaleString('ru-RU')} руб.`, 'info');
  game.bank.loans.push({ id: uid('loan'), rateId, name: rate.name, amount: value, repay: Math.round(value * (1 + rate.rate)), daysLeft: rate.termDays, overdue: false });
  game.stats.loansTaken = Number(game.stats.loansTaken||0) + 1;
  return { ok: true, message: 'Кредит получен' };
}

export function loanLimit(game, rate) {
  return creditStatus(game, rate).limit;
}

export function repayLoan(game, loanId) {
  const loan = game.bank.loans.find((item) => item.id === loanId);
  if (!loan) return { ok: false, message: 'Кредит не найден' };
  if (game.player.cash < loan.repay) return { ok: false, message: 'Недостаточно денег' };
  addMoney(game, -loan.repay, `Погашение: ${loan.name}`);
  game.bank.loans = game.bank.loans.filter((item) => item.id !== loan.id);
  game.stats.loansRepaid = (game.stats.loansRepaid || 0) + 1;
  game.player.reputation += 3;
  return { ok: true, message: 'Кредит погашен' };
}


export function buyLocation(game, id) {
  const location = ALL_LOCATIONS.find((item) => item.id === id);
  if (!location) return { ok: false, message: 'Помещение не найдено' };
  if (game.player.level < (location.reqLevel || 1)) return { ok: false, message: `Нужен уровень ${location.reqLevel}` };
  const cost = Math.round((location.cost || 0) * getInflation(game));
  if (!game.property.ownedLocations.includes(id) && location.type === 'buy') {
    if (game.player.cash < cost) return { ok: false, message: 'Недостаточно денег' };
    addMoney(game, -cost, `Покупка: ${location.name}`);
    game.property.ownedLocations.push(id);
  }
  game.property.locationId = id;
  addLog(game, `Рабочее место: ${location.name}`, 'success');
  return { ok: true, message: location.name };
}

export function buyVehicle(game, id) {
  const vehicle = ALL_VEHICLES.find((item) => item.id === id);
  if (!vehicle) return { ok: false, message: 'Транспорт не найден' };
  if (game.player.level < (vehicle.reqLevel || 1)) return { ok: false, message: `Нужен уровень ${vehicle.reqLevel}` };
  const cost = Math.round((vehicle.cost || 0) * getInflation(game));
  const firstPurchase = !game.property.ownedVehicles.includes(id);
  if (firstPurchase) {
    if (game.player.cash < cost) return { ok: false, message: 'Недостаточно денег' };
    addMoney(game, -cost, `Покупка: ${vehicle.name}`);
    game.property.ownedVehicles.push(id);
    for (const [skillId,amount] of Object.entries(vehicle.skillBonus || {})) {
      if (game.skills?.[skillId]) game.skills[skillId].level = Math.min(100, Number(game.skills[skillId].level||0) + Number(amount||0));
    }
    if (vehicle.skillBonus) addLog(game, `${vehicle.name}: статусный бонус к навыкам применён.`, 'success');
  }
  game.property.vehicleId = id;
  return { ok: true, message: vehicle.name };
}

export function restAction(game, entertainmentId) {
  if (entertainmentId === 'sleep') {
    game.player.energy = clamp(game.player.energy + 55 + restEnergyBonus(game), 0, maxEnergy(game));
    game.player.mood = clamp(game.player.mood + 8, 0, 100);
    game.player.fun = clamp(game.player.fun + 4, 0, 100);
    game.stats.daysRested += 1;
    return { ok: true, days: 1, message: 'Выспались и восстановили силы' };
  }
  const item = ENTERTAINMENT.find((entry) => entry.id === entertainmentId);
  if (!item) return { ok: false, message: 'Вариант отдыха не найден' };
  const cost = Math.round((item.cost || 0) * getInflation(game));
  if (game.player.cash < cost) return { ok: false, message: 'Недостаточно денег' };
  if (cost > 0) addMoney(game, -cost, item.name);
  game.player.fun = clamp(game.player.fun + (item.fun || 0), 0, 100);
  game.player.mood = clamp(game.player.mood + (item.mood || 0), 0, 100);
  game.player.energy = clamp(game.player.energy + (item.energy || 0) + Math.round(restEnergyBonus(game) * .35), 0, maxEnergy(game));
  game.player.health = clamp(game.player.health + (item.health || 0), 0, 100);
  game.stats.daysRested += item.days || 1;
  return { ok: true, days: item.days || 1, message: item.name };
}
