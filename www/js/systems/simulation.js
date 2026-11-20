import { advanceHours } from './calendar.js';
import { completeEducation, completeUniversity } from './education.js';
import { finishOrderWork, refreshOrders } from './orders.js';
import { passiveWorkspaceRecovery } from './progression.js';
import { ensureV08 } from './v08.js';
import { ensureV13, runV13Automation } from './v13.js';
import { ensureV160 } from './v160.js';

function ensureActivity(game) {
  game.activity ||= {};
  game.activity.mode ||= 'idle';
  game.activity.resting = Boolean(game.activity.resting || game.activity.mode === 'rest');
  game.activity.idleDays = Number(game.activity.idleDays || 0);
  game.activity.idlePromptShownAt = Number(game.activity.idlePromptShownAt || 0);
  game.activity.lastMessage ||= '';
  game.activity.tickMs ||= 4200;
  game.activity.energyWarningShown = Boolean(game.activity.energyWarningShown);
  if (Number(game.player?.energy || 0) > 35) game.activity.energyWarningShown = false;
  return game.activity;
}

function workingOrders(game) {
  return game.orders.active.filter((item) => item.status === 'working');
}

function studyStreams(game) {
  return {
    course: Boolean(game.education.active && !game.education.active.ready),
    university: Boolean(game.education.university && !game.education.university.ready)
  };
}

function isStudying(game) {
  const streams = studyStreams(game);
  return streams.course || streams.university;
}

function syncMode(game) {
  const activity = ensureActivity(game);
  if (activity.mode === 'paused') return 'paused';
  if (activity.resting) return (activity.mode = 'rest');
  const work = workingOrders(game).length > 0 || Boolean(game.career?.jobId && !game.business?.opened);
  const study = isStudying(game);
  activity.mode = work && study ? 'work-study' : work ? 'work' : study ? 'study' : 'idle';
  return activity.mode;
}

export function activityLabel(game) {
  const mode = syncMode(game);
  return mode === 'work-study' ? 'Работа + учёба' : mode === 'work' ? 'Работа' : mode === 'study' ? 'Учёба' : mode === 'rest' ? 'Отдых' : mode === 'paused' ? 'Пауза' : 'Свободное время';
}

export function chooseActivity(game, mode) {
  const activity = ensureActivity(game);
  if (mode === 'work' && !workingOrders(game).length) return { ok:false, message:'Сначала запустите подготовленный заказ' };
  if (mode === 'study' && !isStudying(game)) return { ok:false, message:'Сначала выберите обучение' };
  activity.resting = false;
  activity.idleDays = 0;
  activity.idlePromptShownAt = 0;
  syncMode(game);
  activity.lastMessage = 'Активность продолжится автоматически';
  return { ok:true, message:activity.lastMessage };
}

export function resetIdleReminder(game) {
  const activity = ensureActivity(game);
  activity.idleDays = 0;
  activity.idlePromptShownAt = 0;
}

function energyWarning(game, activity) {
  const energy = Number(game.player?.energy || 0);
  if (energy > 35) {
    activity.energyWarningShown = false;
    return false;
  }
  if (energy <= 20 && !activity.energyWarningShown) {
    activity.energyWarningShown = true;
    return true;
  }
  return false;
}

function applyWorkspaceRecovery(game, factor = 1) {
  const bonus = passiveWorkspaceRecovery(game);
  game.player.mood = Math.min(100, game.player.mood + bonus.mood * factor);
  game.player.fun = Math.min(100, game.player.fun + bonus.fun * factor);
  game.player.health = Math.min(100, game.player.health + bonus.health * factor);
}

export function processSimulationTick(game) {
  ensureV08(game);
  ensureV13(game);
  ensureV160(game);
  runV13Automation(game);
  const activity = ensureActivity(game);
  if (activity.mode === 'paused') return { changed:false };

  const orders = workingOrders(game);
  const streams = studyStreams(game);
  const studying = streams.course || streams.university;

  if (activity.resting) {
    activity.resting = false;
    syncMode(game);
  }

  if (game.player.energy <= 0) {
    const message = 'Энергия на нуле — работа и учёба остановлены. Откройте раздел «Отдых».';
    const changed = activity.lastMessage !== message;
    activity.mode = 'idle';
    activity.lastMessage = message;
    return { changed, message, energyWarning:energyWarning(game, activity) };
  }

  const employed = Boolean(game.career?.jobId);
  if (!orders.length && !studying && !employed) {
    advanceHours(game, 12, { activity:'idle' });
    applyWorkspaceRecovery(game);
    activity.idleDays += 1;
    activity.mode = 'idle';
    activity.lastMessage = `Свободное время: ${activity.idleDays}/7 дн.`;
    if (activity.idleDays >= 7 && activity.idleDays - activity.idlePromptShownAt >= 7) {
      activity.idlePromptShownAt = activity.idleDays;
      return { changed:true, idlePrompt:true, energyWarning:energyWarning(game, activity), message:'Хорош бездельничать — пора выбрать работу или обучение.' };
    }
    return { changed:true, message:activity.lastMessage, energyWarning:energyWarning(game, activity) };
  }

  activity.idleDays = 0;
  activity.idlePromptShownAt = 0;

  advanceHours(game, 12, { activity:'productive' });

  const messages = [];
  for (const order of [...orders]) {
    if (!game.orders.active.some((item) => item.uid === order.uid)) continue;
    if (order.progressDays >= (order.totalWorkDays || order.workDays || 1)) {
      const result = finishOrderWork(game, order.uid);
      messages.push(result.message);
    }
  }
  if (orders.length && !messages.length) messages.push(`В работе: ${orders.length} заказов`);
  if (messages.length) refreshOrders(game, true);

  if (game.education.active?.ready) {
    const result = completeEducation(game);
    messages.push(result.ok ? result.message : 'Ошибка завершения обучения');
  } else if (streams.course && game.education.active) {
    messages.push(`Курс: ${game.education.active.daysLeft} дн.`);
  }

  if (game.education.university?.ready) {
    const result = completeUniversity(game);
    messages.push(result.ok ? result.message : 'Ошибка завершения вуза');
  } else if (streams.university && game.education.university) {
    messages.push(`${game.education.university.type === 'college' ? 'Техникум' : 'Вуз'}: ${game.education.university.daysLeft} дн.`);
  }

  syncMode(game);
  activity.lastMessage = messages.join(' · ') || 'Смена 12 часов завершена';
  return { changed:true, message:activity.lastMessage, energyWarning:energyWarning(game, activity) };
}
