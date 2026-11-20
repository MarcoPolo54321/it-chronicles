import { createNewGame } from './core/game.js';
import { createProfilesBackup, deleteProfile, exportProfile, getActiveProfileIndex, importProfile, loadProfiles, restoreLatestBackup, saveProfile, saveProfiles, setActiveProfileIndex } from './core/storage.js';
import { advanceDays } from './systems/calendar.js';
import { checkAchievements } from './systems/achievements.js';
import { acceptPromotion, applyForJob, ensureCareerV162, switchCareerBranch } from './systems/career.js';
import { completeEducation, removeQueuedEducation, startEducation } from './systems/education.js';
import { buyComponent, buyLocation, buyVehicle, openDeposit, repayLoan, restAction, sellComponent, takeLoan } from './systems/economy.js';
import { abandonOrder, acceptOrder, buyMissingOrderItems, chooseRepairApproach, completeOrder, diagnoseOrder, manualRefreshOrders, missingOrderItems, orderByUid, refreshOrders, testOrder } from './systems/orders.js';
import { assemblePc, installPcPart, removePcPart } from './systems/pc.js';
import { buyUpgrade, getEra, maxEnergy } from './systems/progression.js';
import { processSimulationTick, resetIdleReminder } from './systems/simulation.js';
import { buyFleaOffer, repairFleaItem, salvageFleaItem, searchFleaMarket, sellScrap } from './systems/flea-market.js';
import { buyWorkspaceUpgrade } from './systems/workspace.js';
import { renderGame, renderProfiles, renderSetup, renderShopResults } from './ui/render.js';
import { HERO_AVATARS, heroAvatarById } from './data/avatars.js';
import { assignEmployee, cancelContract, endingSummary, ensureV08, fireEmployee, hireEmployee, resolveDecisionEvent, runPcTest, selectAdvancedSpecialization, setActivityPlan, signContract, visitCityPoint } from './systems/v08.js';
import { buyLegacyUpgrade, challengeStatusV13, diagnosticReport, ensureV13, openDepartment, resolveEmployeeEvent, setRestockRule, toggleAutomationRule, trainEmployee } from './systems/v13.js';
import { applyNewGamePlusBackground, continueFrozen2010, ensureV160, openCompany } from './systems/v160.js';
import { ensureAdvertisingV162, startAdvertisingCampaign } from './systems/advertising.js';
import { businessStageRequirement, ensureV165, trainEmployeeProgram, upgradeBusinessStage } from './systems/v165.js';
import { actionSnapshot, dismissContextualTip, recordActionDelta, validateGameState } from './core/quality.js';
import { STARTER_BACKGROUNDS_V163 } from './data/backgrounds-v165.js';
import { ensureV166 } from './systems/v166.js';
import { ensureV169, setLifestylePlan } from './systems/v169.js';
import { dismissNotificationV180, ensureV180, markNotificationsReadV180, proposeQuoteV180, setDifficultyV180, setEmployeeRoleV180, syncNotificationsV180 } from './systems/v180.js';
import { emergencyRecoveryV182, ensureV182, feedbackReportV182, releaseReadinessReportV182 } from './systems/v182.js';

const root = document.querySelector('#app');

const ui = {
  mode: 'profiles',
  tab: 'home',
  setupSlot: 0,
  specialization: 'hardware',
  ordersSection: 'available',
  workshopSection: 'workspace',
  workspaceGroup: 'core',
  growthSection: 'skills',
  morePage: 'home',
  heroSection: 'development',
  educationKind: 'quick',
  educationSkill: 'hardware',
  educationFormalType: 'college',
  educationPage: 1,
  advertisingPage: 1,
  advertisingScope: 'personal',
  advertisingDuration: 'week',
  shopCategory: 'all',
  shopQuery: '',
  shopPage: 1,
  modal: null,
  toast: null,
  businessSection: 'overview',
  gameMode: 'campaign',
  challengeId: 'million_2010',
  difficultyId: 'normal',
  notificationFilter: 'all',
  avatar: 'classic',
  playerName: '',
  companyLogo: 'chip',
  companyType: 'service_repair',
  ledgerFilter: 'all',
  financeReportIndex: 0,
  theme: savedTheme()
};

let profiles = loadProfiles();
let activeIndex = getActiveProfileIndex();
let game = null;
let toastTimer = null;
let shopDebounce = null;
let longPressTimer = null;
let longPressTriggered = false;
let pendingActionSnapshot = null;

let allowBrowserExit = false;
let backGuardInstalled = false;
let appPluginInstance;

function capacitorAppPlugin() {
  if (appPluginInstance !== undefined) return appPluginInstance;
  const capacitor = window.Capacitor;
  appPluginInstance = capacitor?.registerPlugin
    ? capacitor.registerPlugin('App')
    : capacitor?.Plugins?.App || null;
  return appPluginInstance;
}

function performExit() {
  if (!persist()) {
    ui.modal = null;
    render(true);
    return;
  }
  allowBrowserExit = true;
  const appPlugin = capacitorAppPlugin();
  if (appPlugin?.exitApp) {
    Promise.resolve(appPlugin.exitApp()).catch(() => {});
    return;
  }
  window.history.back();
  window.setTimeout(() => window.history.back(), 60);
  window.setTimeout(() => window.close(), 140);
}

function requestExit() {
  if (ui.mode === 'game' && game) {
    if (ui.modal?.type === 'exit-confirm') return;
    ui.modal = { type:'exit-confirm', previousModal:ui.modal || null };
    render(true);
    return;
  }
  if (window.confirm('Хотите ли вы закрыть игру?')) performExit();
}

function navigateBack() {
  if (ui.mode === 'setup') {
    ui.mode = 'profiles';
    ui.modal = null;
    render();
    return true;
  }
  if (ui.mode !== 'game' || !game) {
    requestExit();
    return false;
  }
  if (ui.modal) {
    ui.modal = ui.modal.type === 'exit-confirm' ? (ui.modal.previousModal || null) : null;
    render(true);
    return true;
  }
  if (ui.tab === 'more') {
    if (ui.morePage !== 'home') {
      ui.morePage = 'home';
      ui.businessSection = 'overview';
      window.scrollTo(0,0);
      render();
      return true;
    }
    ui.tab = 'home';
    window.scrollTo(0,0);
    render();
    return true;
  }
  if (ui.tab !== 'home') {
    ui.tab = 'home';
    window.scrollTo(0,0);
    render();
    return true;
  }
  requestExit();
  return false;
}

function installBackGuard() {
  if (backGuardInstalled) return;
  backGuardInstalled = true;
  if (window.history?.pushState) {
    window.history.replaceState({ itChroniclesRoot:true }, '', window.location.href);
    window.history.pushState({ itChroniclesBackGuard:true }, '', window.location.href);
    window.addEventListener('popstate', () => {
      if (allowBrowserExit) return;
      window.history.pushState({ itChroniclesBackGuard:true }, '', window.location.href);
      navigateBack();
    });
  }
  const appPlugin = capacitorAppPlugin();
  if (appPlugin?.addListener) {
    Promise.resolve(appPlugin.addListener('backButton', navigateBack)).catch(() => {});
  }
}

let audioContext = null;
let radioPlaylist = [];
let radioIndex = 0;
let appIsActive = document.visibilityState !== 'hidden';
let audioLifecycleInstalled = false;
const radioPlayer = new Audio();
radioPlayer.preload = 'auto';
radioPlayer.loop = false;

function playTone(kind = 'ui') {
  if (!game?.audio?.enabled || Number(game.audio.master || 0) <= 0) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const map = {
      ui:[560,.04], success:[760,.08], error:[190,.12], cash:[640,.07], modem:[980,.14]
    };
    const [frequency,duration] = map[kind] || map.ui;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = kind === 'error' ? 'square' : 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(Math.max(.001, Number(game.audio.master || .7) * Number(game.audio.ui || .65) * .06), audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {
    // Sound is optional; game logic must never depend on it.
  }
}

function setRadioTrack(index = 0) {
  if (!radioPlaylist.length) return;
  radioIndex = ((index % radioPlaylist.length) + radioPlaylist.length) % radioPlaylist.length;
  radioPlayer.src = radioPlaylist[radioIndex];
}

function syncRadioPlayback() {
  if (!game || ui.mode !== 'game') {
    radioPlayer.pause();
    return;
  }
  ensureV13(game);
  const shouldPlay = Boolean(appIsActive && document.visibilityState !== 'hidden' && game.audio.enabled && game.audio.radioEnabled && Number(game.audio.master || 0) > 0 && Number(game.audio.music || 0) > 0 && radioPlaylist.length);
  radioPlayer.volume = Math.max(0, Math.min(1, Number(game.audio.master || 0) * Number(game.audio.music || 0)));
  if (!shouldPlay) {
    radioPlayer.pause();
    return;
  }
  if (!radioPlayer.src) setRadioTrack(radioIndex);
  const maybePromise = radioPlayer.play();
  if (maybePromise && typeof maybePromise.catch === 'function') maybePromise.catch(() => {});
}

async function loadRadioPlaylist() {
  try {
    const response = await fetch('./assets/radio/playlist.json', { cache: 'no-store' });
    const data = await response.json();
    radioPlaylist = Array.isArray(data?.tracks) ? data.tracks.filter(Boolean).map((item) => './assets/radio/' + String(item).replace(/^\.\//, '')) : [];
    if (!radioPlaylist.length) {
      radioPlayer.pause();
      radioPlayer.removeAttribute('src');
      return;
    }
    if (!radioPlayer.src) setRadioTrack(0);
    syncRadioPlayback();
  } catch {
    radioPlaylist = [];
    radioPlayer.pause();
  }
}

radioPlayer.addEventListener('ended', () => {
  if (!radioPlaylist.length) return;
  setRadioTrack(radioPlaylist.length === 1 ? radioIndex : radioIndex + 1);
  syncRadioPlayback();
});

function pauseAudioForBackground() {
  appIsActive = false;
  radioPlayer.pause();
  if (audioContext?.state === 'running') Promise.resolve(audioContext.suspend()).catch(() => {});
}

function resumeAudioFromBackground() {
  appIsActive = true;
  if (audioContext?.state === 'suspended') Promise.resolve(audioContext.resume()).catch(() => {});
  syncRadioPlayback();
}

function installAudioLifecycleGuard() {
  if (audioLifecycleInstalled) return;
  audioLifecycleInstalled = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      persist();
      pauseAudioForBackground();
    } else {
      resumeAudioFromBackground();
    }
  });
  window.addEventListener('pagehide', () => { persist(); pauseAudioForBackground(); });
  window.addEventListener('pageshow', () => { if (document.visibilityState !== 'hidden') resumeAudioFromBackground(); });
  document.addEventListener('freeze', pauseAudioForBackground);
  document.addEventListener('resume', resumeAudioFromBackground);
  const appPlugin = capacitorAppPlugin();
  if (appPlugin?.addListener) {
    Promise.resolve(appPlugin.addListener('appStateChange', ({ isActive }) => {
      if (isActive) resumeAudioFromBackground();
      else { persist(); pauseAudioForBackground(); }
    })).catch(() => {});
    Promise.resolve(appPlugin.addListener('pause', () => { persist(); pauseAudioForBackground(); })).catch(() => {});
    Promise.resolve(appPlugin.addListener('resume', resumeAudioFromBackground)).catch(() => {});
  }
}

window.addEventListener('error', (event) => {
  if (!game) return;
  ensureV13(game);
  game.stability.sessionErrors.unshift({ at:new Date().toISOString(), message:String(event.message || 'Unknown error') });
  game.stability.sessionErrors = game.stability.sessionErrors.slice(0, 20);
});
window.addEventListener('unhandledrejection', (event) => {
  if (!game) return;
  ensureV13(game);
  game.stability.sessionErrors.unshift({ at:new Date().toISOString(), message:String(event.reason?.message || event.reason || 'Promise rejection') });
  game.stability.sessionErrors = game.stability.sessionErrors.slice(0, 20);
});

function savedTheme() {
  try { return localStorage.getItem('itc_theme') === 'light' ? 'light' : 'dark'; }
  catch { return 'dark'; }
}

function applyTheme(theme, save = true) {
  ui.theme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = ui.theme;
  document.documentElement.style.colorScheme = ui.theme;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.content = ui.theme === 'light' ? '#e9dcc1' : '#080a09';
  if (save) {
    try { localStorage.setItem('itc_theme', ui.theme); }
    catch (error) { console.warn('Не удалось запомнить тему', error); }
  }
  if (game) game.settings.themeMode = ui.theme;
}

applyTheme(ui.theme, false);

function persist() {
  return !game || showSaveResult(saveProfile(profiles, activeIndex, game));
}

function showSaveResult(saved) {
  document.getElementById('save-status').hidden = saved;
  return saved;
}

function replaceProfile(index, profile) {
  const nextProfiles = [...profiles];
  if (!showSaveResult(saveProfile(nextProfiles, index, profile))) return false;
  profiles = nextProfiles;
  return true;
}

function positionCoachMark() {
  const layer = root.querySelector('.coach-layer');
  if (!layer) return;
  const target = document.querySelector(layer.dataset.coachTarget || '');
  const spotlight = layer.querySelector('.coach-spotlight');
  if (!target || !spotlight) {
    spotlight.style.display = 'none';
    return;
  }
  const rect = target.getBoundingClientRect();
  const pad = 7;
  spotlight.style.display = '';
  spotlight.style.left = `${Math.max(6, rect.left - pad)}px`;
  spotlight.style.top = `${Math.max(6, rect.top - pad)}px`;
  spotlight.style.width = `${Math.min(window.innerWidth - 12, rect.width + pad * 2)}px`;
  spotlight.style.height = `${Math.min(window.innerHeight - 12, rect.height + pad * 2)}px`;
  layer.dataset.side = rect.top > window.innerHeight * 0.55 ? 'top' : 'bottom';
}


function detailsPersistKey(node, index) {
  return node?.dataset?.persistKey || node?.id || node?.querySelector?.('summary')?.textContent?.trim() || `details-${index}`;
}

function captureDetailsState(container) {
  return new Map([...(container?.querySelectorAll?.('details') || [])].map((node, index) => [detailsPersistKey(node, index), Boolean(node.open)]));
}

function restoreDetailsState(container, state) {
  if (!container || !state?.size) return;
  [...container.querySelectorAll('details')].forEach((node, index) => {
    const key = detailsPersistKey(node, index);
    if (state.has(key)) node.open = Boolean(state.get(key));
  });
}

function render(preserveScroll = false, silent = false) {
  if (game && ui.mode === 'game') { ensureV180(game); ensureV182(game); syncNotificationsV180(game); }
  const scrollY = preserveScroll ? window.scrollY : 0;
  const detailsState = captureDetailsState(root);
  ui.silentRefresh = silent;
  if (ui.mode === 'profiles') root.innerHTML = renderProfiles(profiles, ui);
  else if (ui.mode === 'setup') root.innerHTML = renderSetup(ui);
  else root.innerHTML = renderGame(game, ui);
  restoreDetailsState(root, detailsState);
  requestAnimationFrame(() => {
    if (preserveScroll) window.scrollTo({ top: scrollY, behavior: 'instant' });
    positionCoachMark();
    syncRadioPlayback();
    ui.silentRefresh = false;
  });
}

function refreshLiveIndicators(){
  if(!game||ui.mode!=='game')return;
  const era=getEra(game);
  const brandTime=root.querySelector('.app-header .brand small');
  const brandEra=root.querySelector('.app-header .brand strong');
  const money=root.querySelector('.app-header .money-pill b');
  const energy=root.querySelector('.app-header .energy-pill b');
  if(brandTime)brandTime.textContent=`${String(game.calendar.day||1).padStart(2,'0')}.${String(game.calendar.month||1).padStart(2,'0')}.${game.calendar.year||2000} · ${String(Math.floor(Number(game.calendar.hour||0))).padStart(2,'0')}:00`;
  if(brandEra)brandEra.textContent=era.name;
  if(money)money.textContent=`${Math.round(Number(game.player.cash||0)/1000)}K`;
  if(energy)energy.textContent=`${Math.round(Number(game.player.energy||0))}/${maxEnergy(game)}`;
}

function toast(text, tone = '') {
  ui.toast = { text, tone };
  render(true);
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    ui.toast = null;
    root.querySelector('.toast')?.remove();
  }, 2400);
}

function commit(result, fallback = 'Готово', preserveScroll = true) {
  if (!game) return;
  ensureV180(game);
  ensureV182(game);
  syncNotificationsV180(game);
  const unlocked = checkAchievements(game);
  const message = result?.message || (unlocked.length ? `Достижение: ${unlocked[0].name}` : fallback);
  if (result?.ok !== false) recordActionDelta(game,pendingActionSnapshot,message);
  pendingActionSnapshot = null;
  validateGameState(game,true);
  game.activity ||= {};
  if (Number(game.player?.energy || 0) > 35) game.activity.energyWarningShown = false;
  if (!ui.modal && Number(game.player?.energy || 0) <= 20 && !game.activity.energyWarningShown) {
    game.activity.energyWarningShown = true;
    ui.modal = { type:'energy-warning' };
  }
  persist();
  render(preserveScroll);
  playTone(result?.ok === false ? 'error' : result?.ok ? 'success' : 'ui');
  if (message) toast(message, result?.ok === false ? 'danger' : '');
}

function openProfile(index) {
  const profile = profiles[index];
  if (!profile) return;
  activeIndex = index;
  setActiveProfileIndex(index);
  game = profile;
  ensureV08(game);
  ensureV13(game);
  ensureV160(game);
  ensureCareerV162(game);
  ensureAdvertisingV162(game);
  ensureV165(game);
  ensureV166(game); ensureV169(game); ensureV180(game); ensureV182(game); syncNotificationsV180(game);
  validateGameState(game,true);
  ui.companyType = game.business?.typeId || 'service_repair';
  refreshOrders(game, true);
  applyTheme(game.settings?.themeMode || ui.theme);
  ui.mode = 'game';
  ui.tab = 'home';
  ui.morePage = 'home';
  ui.modal = game.campaign?.finished && !game.campaign?.endChoice ? { type:'campaign-ending' } : (game.settings?.onboardingSeen ? null : { type: 'tutorial', step: 0 });
  persist();
  render();
}

function newProfile(index) {
  ui.setupSlot = index;
  ui.specialization = 'hardware';
  ui.gameMode = 'campaign';
  ui.challengeId = 'million_2010';
  ui.difficultyId = 'normal';
  ui.avatar = 'classic';
  ui.playerName = '';
  ui.mode = 'setup';
  render();
}

function currentInputValue(id) {
  return document.getElementById(id)?.value ?? '';
}

function captureSetupDraft() {
  if (ui.mode !== 'setup') return;
  const input = document.getElementById('playerName');
  if (input) ui.playerName = input.value.slice(0, 20);
}

function renderSetupSelection(button) {
  const restoreFocus = document.activeElement === button;
  render(true);
  if (!restoreFocus) return;
  const replacement = [...root.querySelectorAll('button[data-action]')].find((candidate) =>
    candidate.dataset.action === button.dataset.action && candidate.dataset.value === button.dataset.value);
  replacement?.focus({ preventScroll: true });
}

function cycleSetupAvatar(direction = 1) {
  const currentIndex = HERO_AVATARS.findIndex((item) => item.id === ui.avatar);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = (safeIndex + direction + HERO_AVATARS.length) % HERO_AVATARS.length;
  ui.avatar = HERO_AVATARS[nextIndex].id;
}

function cycleSetupBackground(direction = 1) {
  const currentIndex=STARTER_BACKGROUNDS_V163.findIndex(item=>item.id===ui.specialization);
  const safe=currentIndex>=0?currentIndex:0;
  const next=(safe+direction+STARTER_BACKGROUNDS_V163.length)%STARTER_BACKGROUNDS_V163.length;
  ui.specialization=STARTER_BACKGROUNDS_V163[next].id;
}

function applyTutorialScreen(step) {
  if (step <= 0) ui.tab = 'home';
  else if (step <= 3) {
    ui.tab = 'orders';
    ui.ordersSection = 'available';
  } else if (step <= 5) {
    ui.tab = 'more';
    ui.morePage = 'workshop';
    ui.workshopSection = 'shop';
  } else if (step === 6) {
    ui.tab = 'education';
    ui.growthSection = 'education';
  } else {
    ui.tab = 'more';
    ui.morePage = 'home';
  }
}

function openMaterials(orderUid) {
  ui.modal = { type: 'materials-help', orderUid };
  render(true);
}

function handleAction(action, element) {
  captureSetupDraft();
  const id = element.dataset.id;
  const value = element.dataset.value;
  const index = Number(element.dataset.index);
  pendingActionSnapshot = actionSnapshot(game);

  switch (action) {
    case 'new-profile':
      newProfile(index);
      return;
    case 'open-profile':
      openProfile(index);
      return;
    case 'delete-profile':
      if (window.confirm('Удалить этот профиль без возможности восстановления?')) {
        if (showSaveResult(deleteProfile(profiles, index))) render();
      }
      return;
    case 'back-profiles':
      ui.mode = 'profiles';
      render();
      return;
    case 'select-specialization':
      ui.specialization = value;
      render();
      return;
    case 'select-mode':
      ui.gameMode = value || 'campaign';
      render();
      return;
    case 'select-challenge':
      ui.challengeId = value || 'million_2010';
      render();
      return;
    case 'select-difficulty':
      ui.difficultyId = ['calm','normal','realistic'].includes(value) ? value : 'normal';
      renderSetupSelection(element);
      return;
    case 'select-avatar':
      ui.avatar = heroAvatarById(value || 'classic').id;
      renderSetupSelection(element);
      return;
    case 'previous-background':
      cycleSetupBackground(-1);
      renderSetupSelection(element);
      return;
    case 'next-background':
      cycleSetupBackground(1);
      renderSetupSelection(element);
      return;
    case 'previous-avatar':
      cycleSetupAvatar(-1);
      renderSetupSelection(element);
      return;
    case 'next-avatar':
      cycleSetupAvatar(1);
      renderSetupSelection(element);
      return;
    case 'create-profile': {
      const name = (currentInputValue('playerName') || ui.playerName || '').trim();
      const avatarId = heroAvatarById(ui.avatar || 'classic').id;
      const nextGame = createNewGame({ name: name || 'Новичок', specialization: ui.specialization, mode:'campaign', challengeId:null, avatar: avatarId, difficultyId:ui.difficultyId || 'normal' });
      ensureV160(nextGame);
      ensureCareerV162(nextGame);
      ensureAdvertisingV162(nextGame);
      ensureV165(nextGame);
      ensureV166(nextGame); ensureV169(nextGame); ensureV180(nextGame); ensureV182(nextGame);
      ensureV08(nextGame);
      ensureV13(nextGame);
      nextGame.settings.themeMode = ui.theme;
      refreshOrders(nextGame, true);
      const nextProfiles = [...profiles];
      nextProfiles[ui.setupSlot] = nextGame;
      if (!showSaveResult(saveProfiles(nextProfiles))) return;
      profiles = nextProfiles;
      game = nextGame;
      activeIndex = ui.setupSlot;
      setActiveProfileIndex(activeIndex);
      ui.mode = 'game';
      ui.tab = 'home';
      ui.modal = { type: 'tutorial', step: 0 };
      syncRadioPlayback();
      render();
      return;
    }
    case 'main-tab':
      ui.tab = value;
      if (value === 'more') ui.morePage = 'home';
      ui.modal = null;
      window.scrollTo(0, 0);
      render();
      return;
    case 'section-tab':
      ui[`${element.dataset.scope}Section`] = value;
      window.scrollTo(0,0);
      render();
      return;
    case 'more-page':
      if (['development','jobs','skills'].includes(value)) {
        ui.morePage = 'hero';
        ui.heroSection = value;
      } else {
        ui.morePage = value;
      }
      window.scrollTo(0, 0);
      render();
      return;
    case 'hero-section':
      ui.heroSection = value || 'development';
      window.scrollTo(0,0);
      render();
      return;
    case 'more-home':
      ui.morePage = 'home';
      render();
      return;
    case 'nav-career':
      ui.tab = 'more';
      ui.morePage = 'hero';
      ui.heroSection = 'jobs';
      ui.modal = null;
      window.scrollTo(0, 0);
      render();
      return;
    case 'nav-rest':
      ui.tab = 'rest';
      ui.modal = null;
      window.scrollTo(0, 0);
      render();
      return;
    case 'nav-education':
      ui.tab = 'education';
      ui.growthSection = 'education';
      ui.modal = null;
      window.scrollTo(0,0);
      render();
      return;
    case 'open-tip-target': {
      const target=value||element.dataset.target;
      if(target==='orders'){ui.tab='orders';ui.ordersSection='available';}
      else if(target==='education'){ui.tab='education';ui.growthSection='education';}
      else if(target==='workshop'){ui.tab='more';ui.morePage='workshop';ui.workshopSection='workspace';}
      else if(['development','jobs','skills'].includes(target)){ui.tab='more';ui.morePage='hero';ui.heroSection=target;}
      else {ui.tab='more';ui.morePage=target||'hero';}
      ui.modal=null; window.scrollTo(0,0); render(); return;
    }
    case 'dismiss-tip':
      dismissContextualTip(game,id||value); persist(); render(true); return;
    case 'ledger-filter':
      ui.ledgerFilter=value||'all'; render(true); return;
    case 'finance-report':
      ui.financeReportIndex=Math.max(0,Number(value||0)); render(true); return;
    case 'workspace-group':
      ui.workspaceGroup = value || 'core';
      render(true);
      return;
    case 'toggle-theme':
      applyTheme(ui.theme === 'dark' ? 'light' : 'dark');
      persist();
      if (ui.mode === 'setup') renderSetupSelection(element);
      else render(true);
      return;
    case 'tutorial-next': {
      const next = Number(element.dataset.step || 0) + 1;
      if (next >= 9) {
        game.settings.onboardingSeen = true;
        ui.modal = null;
        ui.tab = 'home';
        persist();
      } else {
        applyTutorialScreen(next);
        ui.modal = { type: 'tutorial', step: next };
      }
      render();
      return;
    }
    case 'tutorial-skip':
      game.settings.onboardingSeen = true;
      ui.modal = null;
      ui.tab = 'home';
      persist();
      render();
      return;
    case 'tutorial-open':
      applyTutorialScreen(0);
      ui.modal = { type: 'tutorial', step: 0 };
      render();
      return;
    case 'scene-info':
      toast(element.dataset.message || 'Предмет появится в комнате после покупки');
      return;
    case 'refresh-orders':
      ui.modal={type:'refresh-orders-confirm'};
      render(true);
      return;
    case 'confirm-refresh-orders':
      ui.modal=null;
      commit(manualRefreshOrders(game));
      return;
    case 'accept-order': {
      const result = acceptOrder(game, id);
      if (result.code === 'NO_WORKSPACE') {
        ui.modal = { type: 'capacity-help', message: result.message };
        render();
        return;
      }
      commit(result);
      return;
    }
    case 'open-quote':
      ui.modal = { type:'quote', orderUid:id };
      render(true);
      return;
    case 'propose-quote':
      ui.modal = null;
      commit(proposeQuoteV180(game,id,value));
      return;
    case 'diagnose-order':
      ui.modal = { type:'diagnosis', orderUid:id };
      render(true);
      return;
    case 'diagnosis-choice': {
      const result = diagnoseOrder(game, id, value);
      ui.modal = result.ok ? { type:'repair-approach', orderUid:id } : null;
      commit(result);
      return;
    }
    case 'open-repair-approach':
      ui.modal = { type:'repair-approach', orderUid:id };
      render(true);
      return;
    case 'choose-repair-approach':
      ui.modal = null;
      commit(chooseRepairApproach(game, id, value));
      return;
    case 'open-order-test':
      ui.modal = { type:'order-test', orderUid:id };
      render(true);
      return;
    case 'run-order-test':
      ui.modal = null;
      commit(testOrder(game, id, value));
      return;
    case 'complete-order': {
      const result = completeOrder(game, id);
      if (result.code === 'MISSING_ITEMS') {
        openMaterials(id);
        return;
      }
      if (result.ok && result.needsTest) ui.modal = { type:'order-test', orderUid:id };
      commit(result);
      return;
    }
    case 'order-materials':
      openMaterials(id);
      return;
    case 'buy-order-cart':
      commit(buyMissingOrderItems(game, id), 'Материалы куплены');
      return;
    case 'open-order-shop': {
      const order = orderByUid(game, id);
      const missing = order ? missingOrderItems(game, order) : [];
      ui.tab = 'more';
      ui.morePage = 'workshop';
      ui.workshopSection = 'shop';
      ui.shopPage = 1;
      ui.shopCategory = missing.length === 1 ? missing[0].component.cat : 'all';
      ui.shopQuery = missing.length === 1 ? missing[0].component.name : '';
      ui.modal = null;
      window.scrollTo(0, 0);
      render();
      return;
    }
    case 'abandon-order':
      if (window.confirm('Отказаться от заказа и потерять репутацию?')) commit(abandonOrder(game, id));
      return;
    case 'buy-item':
      ui.modal={type:'component-comparison',componentId:id,qty:Number(element.dataset.qty||1)};
      render(true);
      return;
    case 'confirm-buy-item':
      ui.modal=null;
      commit(buyComponent(game,id,Number(element.dataset.qty||1)));
      return;
    case 'sell-item':
      commit(sellComponent(game, id, Number(element.dataset.qty || 1)));
      return;
    case 'shop-page':
      ui.shopPage = Number(value) || 1;
      render(true);
      return;
    case 'shop-category':
      ui.shopCategory = value || 'all';
      ui.shopPage = 1;
      render(true);
      return;
    case 'buy-upgrade':
      commit(buyUpgrade(game, id));
      return;
    case 'buy-workspace':
      ui.modal={type:'workspace-comparison',itemId:id};
      render(true);
      return;
    case 'confirm-buy-workspace':
      ui.modal=null;
      commit(buyWorkspaceUpgrade(game,id));
      return;
    case 'choose-pc-part':
      ui.modal = { type: 'pc-parts', slot: element.dataset.slot };
      render(true);
      return;
    case 'install-pc-part':
      commit(installPcPart(game, element.dataset.slot, id));
      ui.modal = null;
      return;
    case 'remove-pc-part':
      commit(removePcPart(game, element.dataset.slot));
      return;
    case 'assemble-pc':
      commit(assemblePc(game));
      return;
    case 'education-kind':
      ui.educationKind = value || 'quick';
      ui.educationPage = 1;
      render(true);
      return;
    case 'education-skill':
      ui.educationSkill = value || 'hardware';
      ui.educationPage = 1;
      render(true);
      return;
    case 'education-formal-type':
      ui.educationFormalType = value === 'university' ? 'university' : 'college';
      ui.educationPage = 1;
      render(true);
      return;
    case 'education-page':
      ui.educationPage = Math.max(1, Number(value || 1));
      render(true);
      return;
    case 'advertising-page':
      ui.advertisingPage = Math.max(1, Number(value || 1));
      render(true);
      return;
    case 'advertising-scope':
      ui.advertisingScope = value === 'company' ? 'company' : 'personal';
      ui.advertisingPage = 1;
      render(true);
      return;
    case 'advertising-duration':
      ui.advertisingDuration = ['week','month','year'].includes(value) ? value : 'week';
      render(true);
      return;
    case 'start-advertising':
      commit(startAdvertisingCampaign(game,id,ui.advertisingScope,ui.advertisingDuration));
      return;
    case 'start-education':
      commit(startEducation(game, id));
      return;
    case 'complete-education':
      commit(completeEducation(game));
      return;
    case 'remove-education-queue':
      commit(removeQueuedEducation(game, id));
      return;
    case 'apply-job':
      commit(applyForJob(game, id));
      return;
    case 'switch-career-branch':
      commit(switchCareerBranch(game,value));
      return;
    case 'accept-promotion':
      commit(acceptPromotion(game));
      return;
    case 'buy-location':
      commit(buyLocation(game, id));
      return;
    case 'buy-vehicle':
      commit(buyVehicle(game, id));
      return;
    case 'open-deposit':
      commit(openDeposit(game, id, currentInputValue(`deposit_${id}`)));
      return;
    case 'take-loan':
      commit(takeLoan(game, id, currentInputValue(`loan_${id}`)));
      return;
    case 'repay-loan':
      commit(repayLoan(game, id));
      return;
    case 'lifestyle-plan':
      commit(setLifestylePlan(game,id));
      return;
    case 'rest': {
      const result = restAction(game, id);
      if (result.ok) advanceDays(game, result.days || 1, { activity: 'rest' });
      refreshOrders(game, true);
      commit(result);
      return;
    }
    case 'flea-search':
      commit(searchFleaMarket(game, value));
      return;
    case 'flea-buy':
      commit(buyFleaOffer(game, id));
      return;
    case 'flea-sell-scrap':
      commit(sellScrap(game));
      return;
    case 'flea-repair':
      commit(repairFleaItem(game, id));
      return;
    case 'flea-salvage':
      commit(salvageFleaItem(game, id));
      return;
    case 'energy-go-rest':
      game.activity ||= {};
      game.activity.energyWarningShown = true;
      ui.modal = null;
      ui.tab = 'rest';
      window.scrollTo(0,0);
      render();
      return;
    case 'idle-go-orders':
      resetIdleReminder(game);
      ui.modal = null;
      ui.tab = 'orders';
      ui.ordersSection = 'available';
      render();
      return;
    case 'idle-go-study':
      resetIdleReminder(game);
      ui.modal = null;
      ui.tab = 'education';
      ui.growthSection = 'education';
      render();
      return;
    case 'idle-dismiss':
      resetIdleReminder(game);
      ui.modal = null;
      commit({ ok: true, message: 'Свободное время продолжается' });
      return;
    case 'activity-plan':
      commit(setActivityPlan(game, value));
      return;
    case 'smart-hint': {
      const target = element.dataset.target;
      if (target === 'nav-rest') { ui.tab='rest'; }
      else if (target === 'open-bank') { ui.tab='more'; ui.morePage='bank'; }
      else if (target === 'open-active-orders') { ui.tab='orders'; ui.ordersSection='active'; }
      else if (target === 'open-orders') { ui.tab='orders'; ui.ordersSection='available'; }
      else if (target === 'open-education') { ui.tab='education'; ui.growthSection='education'; }
      else { ui.tab='more'; ui.morePage='business'; ui.businessSection='overview'; }
      render(); return;
    }
    case 'starter-goal': {
      const target=value||'orders';
      if(target==='orders'){ui.tab='orders';ui.ordersSection='available';}
      else if(target==='workshop'){ui.tab='more';ui.morePage='workshop';ui.workshopSection='shop';}
      else if(target==='education'){ui.tab='education';ui.growthSection='education';}
      else if(target==='advertising'){ui.tab='more';ui.morePage='advertising';}
      else if(target==='rest'){ui.tab='rest';}
      else ui.tab='home';
      window.scrollTo(0,0);render();return;
    }
    case 'emergency-recovery': {
      const result = emergencyRecoveryV182(game);
      refreshOrders(game,true);
      commit(result);
      return;
    }
    case 'release-readiness':
      ui.modal={type:'release-readiness',report:releaseReadinessReportV182(game)};render(true);return;
    case 'feedback-report':
      ui.modal={type:'feedback-report',text:feedbackReportV182(game,`${ui.tab}${ui.tab==='more'?`/${ui.morePage}`:''}`)};persist();render(true);return;
    case 'copy-feedback-report': {
      const text=ui.modal?.text||feedbackReportV182(game,ui.tab||'home');
      if(navigator.clipboard?.writeText){navigator.clipboard.writeText(text).then(()=>toast('Отчёт скопирован')).catch(()=>toast('Не удалось скопировать автоматически','danger'));}
      else {
        const area=document.querySelector('#feedbackReportText');
        area?.select?.();
        try{document.execCommand('copy');toast('Отчёт скопирован');}catch{toast('Выделите текст и скопируйте вручную','danger');}
      }
      return;
    }
    case 'open-notifications':
      ui.tab='more'; ui.morePage='notifications'; ui.modal=null; window.scrollTo(0,0); render(); return;
    case 'notification-filter':
      ui.notificationFilter=value||'all'; render(true); return;
    case 'notifications-read':
      commit(markNotificationsReadV180(game)); return;
    case 'dismiss-notification':
      commit(dismissNotificationV180(game,id)); return;
    case 'open-notification-target': {
      const notice=game.v18?.notifications?.find((item)=>item.id===id);
      if(notice)notice.read=true;
      const target=notice?.target||value||'home';
      if(target==='orders'){ui.tab='orders';ui.ordersSection='active';}
      else if(target==='business'){ui.tab='more';ui.morePage='business';ui.businessSection='overview';}
      else if(target==='advertising'){ui.tab='more';ui.morePage='advertising';}
      else {ui.tab='home';}
      persist(); window.scrollTo(0,0); render(); return;
    }
    case 'set-difficulty':
      commit(setDifficultyV180(game,value)); return;
    case 'set-employee-role':
      commit(setEmployeeRoleV180(game,id,value)); return;
    case 'business-section':
      ui.businessSection=value||'overview'; render(true); return;
    case 'company-type': ui.companyType=value||'service_repair'; render(true); return;
    case 'open-company': commit(openCompany(game,currentInputValue('companyName'),'chip',ui.companyType)); return;
    case 'upgrade-business-stage': commit(upgradeBusinessStage(game)); return;
    case 'open-employee-training': ui.modal={type:'employee-training',employeeId:id}; render(true); return;
    case 'train-employee-program': {
      const result=trainEmployeeProgram(game,id,value);
      if(result.ok&&result.days)advanceDays(game,result.days,{activity:'study',reason:'Обучение сотрудника'});
      ui.modal=null; commit(result); return;
    }
    case 'open-department': commit(openDepartment(game,id)); return;
    case 'toggle-automation': commit(toggleAutomationRule(game,id)); return;
    case 'set-restock': commit(setRestockRule(game,id,currentInputValue(`restock_${id}`))); return;
    case 'train-employee': commit(trainEmployee(game,id)); return;
    case 'resolve-employee-event': ui.modal=null; commit(resolveEmployeeEvent(game,value)); return;
    case 'show-skill-help': ui.modal = { type:'skill-help', skillId:id || value }; render(true); return;
    case 'buy-legacy': commit(buyLegacyUpgrade(game,id)); return;
    case 'hire-employee': commit(hireEmployee(game,id)); return;
    case 'fire-employee': if(window.confirm('Уволить сотрудника?'))commit(fireEmployee(game,id)); return;
    case 'assign-employee': commit(assignEmployee(game,id,element.dataset.order)); return;
    case 'sign-contract': commit(signContract(game,id)); return;
    case 'cancel-contract': if(window.confirm('Расторгнуть контракт?'))commit(cancelContract(game,id)); return;
    case 'visit-city': commit(visitCityPoint(game,id)); return;
    case 'select-advanced-specialization': commit(selectAdvancedSpecialization(game,id)); return;
    case 'resolve-event': {
      const result = resolveDecisionEvent(game,value);
      ui.modal = result.ok ? null : { type:'decision-event' };
      commit(result);
      return;
    }
    case 'test-pc': commit(runPcTest(game)); return;
    case 'new-career-plus': {
      const summary=endingSummary(game); const old=game;
      const nextGame=createNewGame({name:old.profile.name,specialization:old.profile.specialization,avatar:old.profile.avatar||'classic',mode:'campaign',challengeId:null,difficultyId:old.mode?.difficultyId||'normal',legacyPoints:(old.legacy.points||0)+summary.legacyPoints,legacyCareers:(old.legacy.careers||0)+1,legacyRewards:old.legacy.rewards||[]});
      applyNewGamePlusBackground(nextGame,old);
      ensureV08(nextGame); ensureV13(nextGame); ensureV160(nextGame); ensureV166(nextGame); ensureV169(nextGame); ensureV180(nextGame); ensureV182(nextGame);
      nextGame.replay.legacyUpgrades={...(old.replay?.legacyUpgrades||{})};
      nextGame.replay.appliedLegacySignature='';
      ensureV13(nextGame);
      nextGame.player.cash += summary.legacyPoints*500;
      if (!replaceProfile(activeIndex, nextGame)) return;
      game=nextGame; ui.tab='home'; ui.morePage='home'; ui.modal=null; render(); toast('Новая карьера+ началась'); return;
    }
    case 'continue-after-2010': ui.modal=null; commit(continueFrozen2010(game)); return;
    case 'quick-save': {
      const report=validateGameState(game,true);
      if (!persist()) { playTone('error'); return; }
      playTone('success');
      toast(report.repairs.length?`Игра сохранена · исправлено ${report.repairs.length}`:'Игра сохранена · профиль проверен');
      return;
    }
    case 'create-backup': {
      const result=createProfilesBackup(profiles,'manual');
      if(result.ok){game.stability.backupCount=Number(game.stability.backupCount||0)+1;game.stability.lastBackupAt=result.backup.createdAt;persist();}
      toast(result.ok?'Резервная копия создана':result.message,result.ok?'':'danger');
      return;
    }
    case 'restore-backup': {
      if(!window.confirm('Восстановить последнюю резервную копию? Текущий прогресс будет заменён.'))return;
      const result=restoreLatestBackup(true);
      if(!result.ok){toast(result.message,'danger');return;}
      profiles=result.profiles; activeIndex=getActiveProfileIndex(); game=profiles[activeIndex]; ensureV13(game); ensureV160(game); ensureV165(game); ensureV166(game); ensureV169(game); ensureV180(game); ensureV182(game); ui.modal=null; render(); toast(result.message); return;
    }
    case 'export-save':
      ui.modal = { type: 'export', text:exportProfile(game) };
      render();
      return;
    case 'import-save-open':
      ui.modal={type:'import'};render();return;
    case 'show-diagnostics':
      ui.modal={type:'diagnostics', report:diagnosticReport(game)};render();return;
    case 'quality-check-save': {
      const report=validateGameState(game,true);
      persist();
      ui.modal={type:'save-health',report};
      render();
      return;
    }
    case 'import-save-confirm': {
      const result=importProfile(currentInputValue('importSaveText'));
      if(!result.ok){toast(result.message,'danger');return;}
      createProfilesBackup(profiles,'before-import');
      const nextGame=result.game;
      ensureV13(nextGame);ensureV160(nextGame);ensureV165(nextGame);ensureV166(nextGame);ensureV169(nextGame);ensureV180(nextGame);ensureV182(nextGame);
      if (!replaceProfile(activeIndex, nextGame)) return;
      game=nextGame;ui.modal=null;render();toast('Сохранение импортировано');return;
    }
    case 'cancel-exit':
      ui.modal = ui.modal?.previousModal || null;
      render(true);
      return;
    case 'confirm-exit':
      performExit();
      return;
    case 'close-modal':
      ui.modal = null;
      render(true);
      return;
    case 'switch-profile':
      if (!persist()) return;
      game = null;
      ui.mode = 'profiles';
      render();
      return;
    case 'reset-current-profile':
      if (window.confirm('Удалить текущую карьеру?')) {
        if (!showSaveResult(deleteProfile(profiles, activeIndex))) return;
        game = null;
        ui.mode = 'profiles';
        render();
      }
      return;
    default:
      return;
  }
}

root.addEventListener('pointerdown', (event) => {
  const element = event.target.closest('[data-long-action]');
  if (!element) return;
  clearTimeout(longPressTimer);
  longPressTriggered = false;
  longPressTimer = window.setTimeout(() => {
    longPressTriggered = true;
    handleAction(element.dataset.longAction, element);
    if (game?.audio?.vibration) navigator.vibrate?.(35);
  }, 600);
});

for (const eventName of ['pointerup', 'pointercancel', 'pointerleave']) {
  root.addEventListener(eventName, () => clearTimeout(longPressTimer));
}

root.addEventListener('click', (event) => {
  if (longPressTriggered) {
    longPressTriggered = false;
    event.preventDefault();
    return;
  }
  const actionElement = event.target.closest('[data-action]');
  if (!actionElement) return;
  event.preventDefault();
  playTone('ui');
  handleAction(actionElement.dataset.action, actionElement);
});

root.addEventListener('input', (event) => {
  if (event.target.id === 'playerName') {
    ui.playerName = event.target.value.slice(0, 20);
  }
  if (event.target.id === 'shopSearch') {
    ui.shopQuery = event.target.value;
    ui.shopPage = 1;
    clearTimeout(shopDebounce);
    shopDebounce = window.setTimeout(() => {
      const results = root.querySelector('#shopResults');
      if (results && game) results.innerHTML = renderShopResults(game, ui);
    }, 160);
  }
  if (event.target.id === 'settingVolume' && game) {
    ensureV13(game);
    const volume = Math.max(0,Math.min(1,Number(event.target.value||0)/100));
    game.audio.master = volume;
    const settingLabel = event.target.closest('label')?.querySelector('small');
    if (settingLabel) settingLabel.textContent = `${Math.round(volume*100)}%`;
    persist();
    syncRadioPlayback();
  }
});

root.addEventListener('keydown', (event) => {
  if (event.target.id !== 'playerName' || event.key !== 'Enter') return;
  event.preventDefault();
  ui.playerName = event.target.value.slice(0, 20);
  event.target.blur();
});

root.addEventListener('change', (event) => {
  if (event.target.id === 'settingAnimations') {
    game.settings.animations = event.target.checked;
    persist();
    render(true);
  }
  if (event.target.id === 'settingCompact') {
    game.settings.compactMode = event.target.checked;
    persist();
    render(true);
  }
  if (event.target.id === 'settingAudio') {
    ensureV13(game); game.audio.enabled = event.target.checked; persist(); syncRadioPlayback(); render(true);
  }
  if (event.target.id === 'settingRadio') {
    ensureV13(game); game.audio.radioEnabled = event.target.checked; persist(); syncRadioPlayback(); render(true);
  }
  if (event.target.id === 'settingVibration') {
    ensureV13(game); game.audio.vibration = event.target.checked; persist(); render(true);
  }
  if (event.target.id === 'settingEraThemes') {
    ensureV13(game); game.visual.eraThemes = event.target.checked; persist(); render(true);
  }
  if (event.target.id === 'settingReducedMotion') {
    ensureV13(game); game.visual.reducedMotion = event.target.checked; persist(); render(true);
  }
});

window.addEventListener('resize', positionCoachMark);
window.addEventListener('scroll', positionCoachMark, { passive: true });
window.addEventListener('beforeunload', () => { persist(); pauseAudioForBackground(); });
installAudioLifecycleGuard();
loadRadioPlaylist();
installBackGuard();

window.setInterval(() => {
  if (!game || ui.mode !== 'game' || document.visibilityState !== 'visible') return;
  const modalWasOpen=Boolean(ui.modal);
  ensureV160(game);
  ensureCareerV162(game);
  ensureAdvertisingV162(game);
  ensureV165(game);
  ensureV166(game); ensureV169(game); ensureV180(game); ensureV182(game); syncNotificationsV180(game);
  if(game.campaign.finished&&!game.campaign.endChoice){ui.modal={type:'campaign-ending'};render(true);return;}
  if(ui.modal?.type==='campaign-ending')return;
  const result = processSimulationTick(game);
  syncNotificationsV180(game);
  if (!result.changed) return;
  refreshOrders(game);
  persist();
  if(modalWasOpen){refreshLiveIndicators();return;}
  if (document.activeElement?.id === 'shopSearch') { refreshLiveIndicators(); return; }
  if (result.energyWarning) ui.modal = { type:'energy-warning' };
  else if (result.idlePrompt) ui.modal = { type: 'idle-reminder', message: result.message };
  if (!ui.modal && game.world?.activeEvent) ui.modal = { type:'decision-event' };
  if (!ui.modal && game.business?.opened && game.business?.activeEmployeeEvent) ui.modal = { type:'employee-event' };
  if (!ui.modal && game.campaign?.finished && !game.campaign?.endChoice) ui.modal={type:'campaign-ending'};
  challengeStatusV13(game);
  render(true, true);
}, 4200);

render();
