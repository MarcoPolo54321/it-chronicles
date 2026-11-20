import { ACHIEVEMENTS } from '../data/progression.js';
import { addLog, skillLevel } from './progression.js';

const REMOVED_POST_2010_ACHIEVEMENTS = new Set(['g4','g5','g6','g7','g8','g9','j6','j7']);

const completedStudyCount = (game) => Object.values(game.education.completed || {}).reduce((sum, count) => sum + count, 0);
const completedStudyByPrefix = (game, prefix) => Object.entries(game.education.completed || {}).filter(([id]) => id.startsWith(prefix)).reduce((sum, [, count]) => sum + count, 0);
const allSkillsAt = (game, level) => Object.keys(game.skills).every((id) => skillLevel(game,id) >= level);
const netCash = (game) => game.player.cash || 0;

const CONDITIONS = {
  a1: (g) => g.stats.ordersDone >= 1,
  a2: (g) => g.stats.ordersDone >= 10,
  a3: (g) => g.stats.ordersDone >= 50,
  a4: (g) => g.stats.ordersDone >= 100,
  a5: (g) => g.stats.ordersDone >= 250,
  a6: (g) => g.stats.ordersDone >= 500,
  a7: (g) => g.stats.bestStreak >= 10,
  a8: (g) => g.stats.bestStreak >= 25,
  a9: (g) => g.stats.bestStreak >= 50,
  a10: (g) => g.stats.epicDone >= 1,
  a11: (g) => g.stats.epicDone >= 5,
  a12: (g) => g.stats.ordersFailed >= 10,

  b1: (g) => g.stats.earned >= 10000,
  b2: (g) => g.stats.earned >= 100000,
  b3: (g) => g.stats.earned >= 1000000,
  b4: (g) => g.stats.earned >= 10000000,
  b5: (g) => g.stats.earned >= 100000000,
  b6: (g) => g.stats.earned >= 1000000000,
  b7: (g) => netCash(g) >= 50000,
  b8: (g) => netCash(g) >= 500000,
  b9: (g) => netCash(g) >= 5000000,
  b10: (g) => g.bank.deposits.length >= 1,
  b11: (g) => g.bank.loans.length >= 1,
  b12: (g) => (g.stats.loansRepaid || 0) >= 1 && g.bank.loans.length === 0,

  c1: (g) => skillLevel(g,'hardware') >= 5,
  c2: (g) => skillLevel(g,'hardware') >= 10,
  c3: (g) => skillLevel(g,'hardware') >= 20,
  c4: (g) => skillLevel(g,'software') >= 5,
  c5: (g) => skillLevel(g,'software') >= 10,
  c6: (g) => skillLevel(g,'networking') >= 5,
  c7: (g) => skillLevel(g,'networking') >= 10,
  c8: (g) => skillLevel(g,'repair') >= 5,
  c9: (g) => skillLevel(g,'data') >= 5,
  c10: (g) => skillLevel(g,'security') >= 5,
  c11: (g) => skillLevel(g,'communication') >= 5,
  c12: (g) => skillLevel(g,'management') >= 5,
  c13: (g) => allSkillsAt(g, 5),
  c14: (g) => allSkillsAt(g, 10),

  d1: (g) => completedStudyCount(g) >= 1,
  d2: (g) => completedStudyCount(g) >= 5,
  d3: (g) => completedStudyCount(g) >= 15,
  d4: (g) => completedStudyCount(g) >= 30,
  d5: (g) => Object.keys(g.education.completed || {}).some((id) => id.includes('cert')),
  d6: (g) => completedStudyByPrefix(g, 'yt_') >= 5,
  d7: (g) => completedStudyByPrefix(g, 'forum_') >= 5,

  e1: (g) => g.property.ownedLocations.includes('dorm_room') || g.property.ownedLocations.includes('garage'),
  e2: (g) => g.property.ownedLocations.some((id) => !['home', 'garage', 'dorm_room'].includes(id)),
  e3: (g) => g.property.ownedLocations.includes('two_room') || g.property.ownedLocations.includes('campus'),
  e4: (g) => g.property.ownedVehicles.some((id) => id !== 'none'),
  e5: (g) => g.property.ownedVehicles.some((id) => ['van', 'branded_van', 'minivan', 'van_service'].includes(id)),
  e6: (g) => g.property.ownedVehicles.includes('old_mercedes') || g.property.ownedVehicles.includes('fleet') || g.property.ownedVehicles.includes('van_service'),
  e7: (g) => g.pc.assembled,
  e8: (g) => g.pc.assembled && Object.values(g.pc.slots || {}).reduce((sum, part) => sum + Number(part.pcPower || 0), 0) >= 24,

  f1: (g) => g.career.jobId && g.career.jobId !== 'student',
  f2: (g) => String(g.career.jobId).includes('sysadmin'),
  f3: (g) => String(g.career.jobId).includes('security'),
  f4: (g) => String(g.career.jobId).includes('director'),
  f5: (g) => String(g.career.jobId).includes('cto'),
  f6: (g) => g.calendar.year - (g.career.startedYear || g.calendar.year) >= 10,

  g1: (g) => g.calendar.year >= 2002,
  g2: (g) => g.calendar.year >= 2005,
  g3: (g) => g.calendar.year >= 2008,

  h1: (g) => g.player.reputation >= 50,
  h2: (g) => g.player.reputation >= 200,
  h3: (g) => g.player.reputation >= 500,
  h4: (g) => g.player.reputation >= 2000,
  h5: (g) => (g.property.upgrades.ads || 0) >= 6,
  h6: (g) => (g.property.upgrades.word || 0) >= 1,

  i1: (g) => g.player.level >= 5,
  i2: (g) => g.player.level >= 10,
  i3: (g) => g.player.level >= 25,
  i4: (g) => g.player.level >= 50,
  i5: (g) => g.player.level >= 75,
  i6: (g) => g.player.level >= 100,

  j2: (g) => g.player.cash >= 250000,
  j3: (g) => g.player.cash >= 700000,
  j4: (g) => g.player.cash >= 2500000,
  j5: (g) => g.calendar.year <= 2001 && g.calendar.totalDays >= 30,
};

export function checkAchievements(game) {
  const unlocked = [];
  for (const achievement of ACHIEVEMENTS) {
    if (REMOVED_POST_2010_ACHIEVEMENTS.has(achievement.id)) continue;
    if (game.achievements.includes(achievement.id)) continue;
    const condition = CONDITIONS[achievement.id];
    if (condition?.(game)) {
      game.achievements.push(achievement.id);
      unlocked.push(achievement);
      addLog(game, `Достижение: «${achievement.name}».`, 'success');
    }
  }
  return unlocked;
}
