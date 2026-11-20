import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createNewGame, migrateGame, SAVE_VERSION } from '../www/js/core/game.js';
import { renderGame } from '../www/js/ui/render.js';
import { refreshOrders } from '../www/js/systems/orders.js';
import {
  applyClientArchetypeV182,
  clientArchetypeV182,
  emergencyRecoveryV182,
  ensureV182,
  feedbackReportV182,
  recoveryStatusV182,
  releaseGoalsV182,
  releaseReadinessReportV182,
  specializationPerkV182
} from '../www/js/systems/v182.js';
import { CLIENT_ARCHETYPES_V182, SPECIALIZATION_PERKS_V182 } from '../www/js/data/v182.js';
import { GAME_VERSION } from '../www/js/data/version.js';
import { advanceDays } from '../www/js/systems/calendar.js';
import { continueFrozen2010, markCampaignFinished } from '../www/js/systems/v160.js';
import { targetAvailableOrdersV166 } from '../www/js/systems/v166.js';
import { deleteProfile, loadProfiles, saveProfile } from '../www/js/core/storage.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=JSON.parse(read('package.json'));
assert.equal(pkg.version,GAME_VERSION);
assert.equal(pkg.androidVersionCode,1804);
assert.equal(SAVE_VERSION,19);
const build=read('BUILD_UPDATE.ps1');
assert.match(build,/versionCode \$versionCode/);
assert.match(build,/Hroniki-Aytishnika-v\$version-debug\.apk/);

const game=createNewGame({name:'RC 18.2',specialization:'hardware',avatar:'classic',difficultyId:'normal'});
ensureV182(game);
assert.equal(game.version,19);
assert.ok(game.v182?.releaseCandidate);
assert.equal(releaseGoalsV182(game).length,6);
assert.equal(releaseGoalsV182(game).filter(x=>x.done).length,0);
assert.equal(Object.keys(SPECIALIZATION_PERKS_V182).length,8);
assert.equal(specializationPerkV182(game).skill,'hardware');

const legacy=createNewGame({name:'Legacy'});
delete legacy.v182;
legacy.version=18;
legacy.settings.themeMode='dark';
const migrated=migrateGame(legacy);
ensureV182(migrated);
assert.equal(migrated.version,19);
assert.equal(migrated.settings.themeMode,'light');
assert.ok(migrated.v182?.recovery);

// Client archetypes are deterministic, visible and mechanically different.
assert.equal(CLIENT_ARCHETYPES_V182.length,6);
const client={id:'client-test',tierId:'home',name:'Тестовый клиент',payMult:1,priceSensitivity:1,patience:8};
applyClientArchetypeV182(client);
const archetype=clientArchetypeV182(client);
assert.ok(archetype.name);
assert.equal(client.archetypeAppliedV182,true);
const snapshot={payMult:client.payMult,priceSensitivity:client.priceSensitivity,patience:client.patience};
applyClientArchetypeV182(client);
assert.deepEqual({payMult:client.payMult,priceSensitivity:client.priceSensitivity,patience:client.patience},snapshot,'Повторная миграция не должна повторно умножать параметры клиента');

// Dead-end protection: low cash always produces a simple recovery order.
game.player.cash=100;
game.orders.available=[];
game.orders.active=[];
refreshOrders(game,true);
assert.ok(game.orders.available.some(order=>order.templateId==='v182_recovery_gig'));
assert.equal(recoveryStatusV182(game).available,true);
const cashBefore=game.player.cash;
const recovery=emergencyRecoveryV182(game);
assert.equal(recovery.ok,true);
assert.ok(game.player.cash>cashBefore||game.player.energy>82);
assert.equal(game.v182.stats.deadEndsPrevented,1);
assert.equal(game.calendar.totalDays,0);
assert.equal(emergencyRecoveryV182(game).ok,false);
assert.equal(recoveryStatusV182(game).cooldown,7);

// Old day-zero saves still respect the cooldown after migration.
const oldRecovery=createNewGame();
ensureV182(oldRecovery);
oldRecovery.v182.recovery={lastDay:0,uses:1};
assert.equal(recoveryStatusV182(oldRecovery).cooldown,7);

const afterFinale=createNewGame();
afterFinale.calendar.totalDays=3959;
afterFinale.calendar.totalHours=3959*24;
markCampaignFinished(afterFinale);
continueFrozen2010(afterFinale);
afterFinale.player.cash=100;
assert.equal(emergencyRecoveryV182(afterFinale).ok,true);
advanceDays(afterFinale,7);
assert.equal(recoveryStatusV182(afterFinale).cooldown,0);

const board=createNewGame();
refreshOrders(board,true);
board.orders.available=board.orders.available.filter(order=>!order.recoveryOrder);
board.player.cash=100;
refreshOrders(board);
assert.ok(board.orders.available.some(order=>order.recoveryOrder));
assert.equal(board.orders.available.length,targetAvailableOrdersV166(board));
refreshOrders(board);
assert.equal(board.orders.available.filter(order=>order.recoveryOrder).length,1);

const report=releaseReadinessReportV182(game);
assert.equal(report.saveVersion,19);
assert.ok(Array.isArray(report.warnings));
const feedback=feedbackReportV182(game,'home');
assert.ok(feedback.includes(`Версия игры: ${GAME_VERSION}`));
assert.match(feedback,/Что произошло:/);

const ui={theme:'dark',tab:'home',morePage:'home',heroSection:'development',ordersSection:'available',workshopSection:'workspace',workspaceGroup:'core',growthSection:'skills',educationKind:'quick',educationSkill:'hardware',educationFormalType:'college',educationPage:1,shopCategory:'all',shopQuery:'',shopPage:1,businessSection:'overview',advertisingPage:1,advertisingScope:'personal',advertisingDuration:'week',notificationFilter:'all',ledgerFilter:'all',financeReportIndex:0,modal:null};
let html=renderGame(game,ui);
assert.ok(html.includes('ПЕРВЫЕ 30 МИНУТ'));
assert.ok(html.includes('ЗАЩИТА ОТ ТУПИКА')||!recoveryStatusV182(game).available);
assert.ok(html.includes('СПЕЦИАЛИЗАЦИЯ'));
ui.tab='more';ui.morePage='advertising';
html=renderGame(game,ui);
assert.ok(html.includes('ad-audience-guide-v182'));
assert.ok(html.includes('Аудитория:'));
ui.morePage='settings';
html=renderGame(game,ui);
assert.ok(html.includes('Проверка перед открытым тестом'));
assert.ok(html.includes('Сообщить о проблеме'));
html=renderGame(game,{...ui,modal:{type:'release-readiness',report}});
assert.ok(html.includes('RELEASE CANDIDATE'));
html=renderGame(game,{...ui,modal:{type:'feedback-report',text:feedback}});
assert.ok(html.includes('ОТЧЁТ ТЕСТИРОВАНИЯ'));

const app=read('www/js/app.js');
assert.match(app,/const modalWasOpen=Boolean\(ui\.modal\)/);
assert.match(app,/if\(modalWasOpen\)\{refreshLiveIndicators\(\);return;\}/);
assert.ok(!app.includes("(ui.modal && ui.modal.type!=='campaign-ending')"));

const css=read('www/css/app.css');
assert.match(css,/release-onboarding-v182/);
assert.match(css,/quality-breakdown-v182/);
assert.match(css,/ad-audience-guide-v182/);

const values=new Map();
let rejectProfileWrites=false;
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
  getItem: key=>values.get(key) ?? null,
  setItem: (key,value)=>{
    if(rejectProfileWrites&&key==='it_chronicles_profiles_v2')throw new Error('Simulated quota limit');
    values.set(key,value);
  }
}});
const slots=Array(10).fill(null);
const current=createNewGame({name:'Тест сохранения'});
assert.equal(saveProfile(slots,0,current),true);
const previousCash=current.player.cash;
current.player.cash+=100;
rejectProfileWrites=true;
const reportStorageError=console.error;
try {
  console.error=()=>{};
  assert.equal(saveProfile(slots,0,current),false);
  assert.equal(deleteProfile(slots,0),false);
} finally {
  console.error=reportStorageError;
}
assert.equal(slots[0],current);
assert.equal(loadProfiles()[0].player.cash,previousCash);
rejectProfileWrites=false;
assert.equal(saveProfile(slots,0,current),true);
assert.equal(loadProfiles()[0].player.cash,previousCash+100);
delete globalThis.localStorage;

console.log(`Regression v${GAME_VERSION}: OK`);
