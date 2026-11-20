import { PROFILE_LIMIT, migrateGame } from './game.js';
import { validateGameState } from './quality.js';

const PROFILES_KEY = 'it_chronicles_profiles_v2';
const ACTIVE_KEY = 'it_chronicles_active_profile_v2';
const LEGACY_KEY = 'it_chronicles_save_v1';
const BACKUPS_KEY = 'it_chronicles_backups_v13';
const BACKUP_META_KEY = 'it_chronicles_backup_meta_v13';
const MAX_BACKUPS = 6;

function emptyProfiles() {
  return Array.from({ length: PROFILE_LIMIT }, () => null);
}

function normalizeProfiles(value) {
  const profiles = Array.isArray(value) ? value.slice(0, PROFILE_LIMIT) : emptyProfiles();
  while (profiles.length < PROFILE_LIMIT) profiles.push(null);
  return profiles.map(profile => { const game=migrateGame(profile); if(game) validateGameState(game,true); return game; });
}

function rawProfiles() {
  return JSON.parse(localStorage.getItem(PROFILES_KEY) || 'null');
}

export function loadProfiles() {
  try {
    const profiles = normalizeProfiles(rawProfiles());
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy && profiles.every(profile => profile === null)) {
      profiles[0] = migrateGame(JSON.parse(legacy));
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    }
    return profiles;
  } catch (error) {
    console.error('Не удалось прочитать профили', error);
    const restored = restoreLatestBackup(false);
    if (restored.ok) return restored.profiles;
    return emptyProfiles();
  }
}

export function saveProfiles(profiles) {
  try {
    for (const profile of profiles || []) if (profile) validateGameState(profile,true);
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    return true;
  } catch (error) {
    console.error('Не удалось сохранить профили', error);
    return false;
  }
}

export function getActiveProfileIndex() {
  const value = Number(localStorage.getItem(ACTIVE_KEY));
  return Number.isInteger(value) && value >= 0 && value < PROFILE_LIMIT ? value : 0;
}

export function setActiveProfileIndex(index) {
  localStorage.setItem(ACTIVE_KEY, String(index));
}

export function createProfilesBackup(profiles, reason = 'manual') {
  try {
    const backups = listBackups();
    const item = {
      id: `backup_${Date.now()}`,
      createdAt: new Date().toISOString(),
      reason,
      activeIndex: getActiveProfileIndex(),
      profiles: structuredClone(profiles)
    };
    backups.unshift(item);
    localStorage.setItem(BACKUPS_KEY, JSON.stringify(backups.slice(0, MAX_BACKUPS)));
    localStorage.setItem(BACKUP_META_KEY, JSON.stringify({ createdAt:item.createdAt, reason }));
    return { ok:true, backup:item };
  } catch (error) {
    console.error('Не удалось создать резервную копию', error);
    return { ok:false, message:'Не удалось создать резервную копию' };
  }
}

export function listBackups() {
  try {
    const value = JSON.parse(localStorage.getItem(BACKUPS_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function restoreLatestBackup(write = true) {
  try {
    const backup = listBackups()[0];
    if (!backup) return { ok:false, message:'Резервных копий нет' };
    const profiles = normalizeProfiles(backup.profiles);
    if (write) {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
      setActiveProfileIndex(Number(backup.activeIndex || 0));
    }
    return { ok:true, profiles, backup, message:'Последняя резервная копия восстановлена' };
  } catch (error) {
    console.error('Не удалось восстановить резервную копию', error);
    return { ok:false, message:'Резервная копия повреждена' };
  }
}

export function saveProfile(profiles, index, game) {
  game.updatedAt = new Date().toISOString();
  validateGameState(game,true);
  profiles[index] = game;
  const meta = (() => {
    try { return JSON.parse(localStorage.getItem(BACKUP_META_KEY) || 'null'); } catch { return null; }
  })();
  const age = meta?.createdAt ? Date.now() - Date.parse(meta.createdAt) : Infinity;
  if (age > 5 * 60 * 1000) {
    const result = createProfilesBackup(profiles, 'autosave');
    if (result.ok && game.stability) {
      game.stability.backupCount = Number(game.stability.backupCount || 0) + 1;
      game.stability.lastBackupAt = result.backup.createdAt;
    }
  }
  return saveProfiles(profiles);
}

export function deleteProfile(profiles, index) {
  createProfilesBackup(profiles, 'before-delete');
  profiles[index] = null;
  saveProfiles(profiles);
}

export function exportProfile(game) {
  return JSON.stringify({ format:'it-chronicles-save', exportedAt:new Date().toISOString(), game }, null, 2);
}

export function importProfile(text) {
  try {
    const parsed = JSON.parse(String(text || '').trim());
    const raw = parsed?.format === 'it-chronicles-save' ? parsed.game : parsed;
    const game = migrateGame(raw);
    if (!game?.profile || !game?.calendar || !game?.player) throw new Error('invalid-structure');
    const report=validateGameState(game,true);
    return { ok:true, game, report, message:report.repairs.length?`Сохранение восстановлено: исправлено ${report.repairs.length}`:'Сохранение проверено и готово к импорту' };
  } catch (error) {
    return { ok:false, message:'Не удалось прочитать сохранение. Проверьте JSON.' };
  }
}
