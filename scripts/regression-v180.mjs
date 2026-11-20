import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createNewGame, migrateGame, SAVE_VERSION } from '../www/js/core/game.js';
import { GAME_VERSION } from '../www/js/data/version.js';
import { renderGame, renderSetup } from '../www/js/ui/render.js';
import { refreshOrders, acceptOrder } from '../www/js/systems/orders.js';
import { advanceDays } from '../www/js/systems/calendar.js';
import {
  canAcceptAtWorkstationV180,
  dismissNotificationV180,
  ensureV180,
  enrichOrderV180,
  markNotificationsReadV180,
  processV180Day,
  proposeQuoteV180,
  pushNotificationV180,
  quoteOptionsV180,
  registerOrderOutcomeV180,
  setDifficultyV180,
  workstationStatusV180
} from '../www/js/systems/v180.js';
import { AD_CATEGORY_ASSETS_V180, DIFFICULTY_MODES_V180, HISTORICAL_CHAINS_V180 } from '../www/js/data/v180.js';
import { ADVERTISING_CATALOG_V162 } from '../www/js/systems/advertising.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');

const pkg=JSON.parse(read('package.json'));
assert.equal(pkg.version,GAME_VERSION);
assert.equal(SAVE_VERSION,19);

// New game and legacy migration contain the complete v18 state.
const game=createNewGame({name:'Тест 18',specialization:'hardware',avatar:'classic',difficultyId:'normal'});
ensureV180(game);
assert.equal(game.version,19);
assert.equal(game.mode.difficultyId,'normal');
assert.ok(Array.isArray(game.v18.notifications));
assert.ok(Array.isArray(game.v18.warranties.active));
assert.equal(Object.keys(game.reputationBySkill).length,8);
const legacy=createNewGame({name:'Legacy'});
delete legacy.v18;
delete legacy.reputationBySkill;
legacy.version=17;
const migrated=migrateGame(legacy);
assert.equal(migrated.version,19);
assert.ok(migrated.v18?.warranties?.active);
assert.equal(Object.keys(migrated.reputationBySkill).length,8);

// Difficulty modes are selectable and influence the game state.
assert.deepEqual(DIFFICULTY_MODES_V180.map(x=>x.id),['calm','normal','realistic']);
assert.equal(setDifficultyV180(game,'realistic').ok,true);
assert.equal(game.mode.difficultyId,'realistic');
assert.equal(setDifficultyV180(game,'normal').ok,true);

// Workshop capacities and quick/project classification.
const stations=workstationStatusV180(game);
assert.equal(stations.length,4);
assert.ok(stations.some(x=>x.id==='repair'&&x.capacity>=1));
const project=enrichOrderV180({uid:'project-test',name:'Настроить сеть офиса',difficulty:'hard',onSite:true,status:'available',reward:4000,estimatedMaterialCost:800,client:{id:'c1',name:'ООО Тест'},skills:{networking:2}});
assert.equal(project.workMode,'project');
assert.equal(project.stationId,'network');
// Give the profile a network station through skill progression.
game.skills.networking.level=2;
assert.equal(canAcceptAtWorkstationV180(game,project).ok,true);

// Generated orders contain a work mode and station. At least one project can be accepted and quoted.
game.player.level=30; game.player.reputation=500; game.player.cash=1_000_000;
for(const skill of Object.values(game.skills)) skill.level=15;
refreshOrders(game,true);
assert.ok(game.orders.available.length>0);
assert.ok(game.orders.available.every(o=>o.workMode&&o.stationId));
let generatedProject=game.orders.available.find(o=>o.workMode==='project');
if(!generatedProject){
  generatedProject=project;
  project.client={id:'c1',name:'ООО Тест',trust:60,priceSensitivity:.8};
  game.clients.records.c1={...project.client,tierId:'small_biz',orders:0,history:[],averageRating:0,preference:'reliable'};
  game.orders.available.unshift(project);
}
generatedProject.onSite=false;
const accepted=acceptOrder(game,generatedProject.uid);
assert.equal(accepted.ok,true);
assert.equal(accepted.needsQuote,true);
const active=game.orders.active.find(o=>o.uid===generatedProject.uid);
assert.equal(active.status,'quotation');
const options=quoteOptionsV180(game,active);
assert.equal(options.length,4);
assert.ok(options.every(x=>x.price>0&&x.acceptance>0&&x.acceptance<=1));
const originalRandom=Math.random;
Math.random=()=>0;
const quote=proposeQuoteV180(game,active.uid,'standard');
Math.random=originalRandom;
assert.equal(quote.ok,true);
assert.equal(quote.accepted,true);
assert.equal(active.status,'diagnosis');

// Permanent clients, directional reputation and warranties update after a completed job.
const completed={...active,uid:'completed-v18',orderType:'standard',workMode:'project',quality:.92,quote:{id:'reliable'},quoteWarrantyRisk:-.05,repairApproach:{failureRisk:.02},skills:{networking:2},client:{...active.client,id:active.client.id||'c1'}};
const beforeWarranties=game.v18.warranties.active.length;
registerOrderOutcomeV180(game,completed,true,5);
assert.ok(game.v18.warranties.active.length>beforeWarranties);
assert.ok(game.reputationBySkill.networking>0);
const warrantyCount=game.v18.warranties.active.length;
registerOrderOutcomeV180(game,{...completed,uid:'warranty-complete',orderType:'warranty'},true,5);
assert.equal(game.v18.warranties.active.length,warrantyCount,'Гарантийный ремонт не должен создавать бесконечную новую гарантию');

// Notification center supports add/read/remove.
const notice=pushNotificationV180(game,{type:'test',title:'Проверка',text:'Тестовое уведомление',target:'home'});
assert.ok(game.v18.notifications.some(x=>x.id===notice.id&&!x.read));
assert.equal(markNotificationsReadV180(game).ok,true);
assert.ok(game.v18.notifications.every(x=>x.read));
assert.equal(dismissNotificationV180(game,notice.id).ok,true);
assert.ok(!game.v18.notifications.some(x=>x.id===notice.id));

// Historical chain is limited to 2000–2010 and is triggered at its date.
assert.ok(HISTORICAL_CHAINS_V180.every(x=>x.year>=2000&&x.year<=2010));
const historyGame=createNewGame({name:'История'});
ensureV180(historyGame);
historyGame.calendar.year=2001; historyGame.calendar.month=10; historyGame.calendar.day=1; historyGame.calendar.totalDays=270;
historyGame.v18.lastProcessedDay=269;
processV180Day(historyGame);
assert.ok(historyGame.v18.history.seen.includes('xp_launch'));
assert.ok(historyGame.v18.notifications.some(x=>x.type==='history'));

// All advertising categories have the uploaded artwork.
const categories=[...new Set(ADVERTISING_CATALOG_V162.map(x=>x.category))];
assert.equal(categories.length,5);
for(const category of categories){
  const asset=AD_CATEGORY_ASSETS_V180[category];
  assert.ok(asset,`Нет изображения категории ${category}`);
  assert.ok(fs.existsSync(path.join(root,'www',asset.replace('./',''))),`Нет файла ${asset}`);
}

const ui={theme:'dark',tab:'home',morePage:'home',heroSection:'development',ordersSection:'available',workshopSection:'workspace',workspaceGroup:'core',growthSection:'skills',educationKind:'quick',educationSkill:'hardware',educationFormalType:'college',educationPage:1,shopCategory:'all',shopQuery:'',shopPage:1,businessSection:'overview',advertisingPage:1,advertisingScope:'personal',advertisingDuration:'week',notificationFilter:'all',ledgerFilter:'all',financeReportIndex:0,modal:null};
let html=renderGame(game,ui);
assert.ok(html.includes('today-dashboard'));
assert.ok(html.includes('Мастерская и ближайшие дела'));
assert.ok(html.includes('Активные гарантии'));
html=renderGame(game,{...ui,tab:'more',morePage:'notifications'});
assert.ok(html.includes('ЦЕНТР СОБЫТИЙ')&&html.includes('Уведомления'));
game.business.opened=true; game.business.typeId='service_repair'; game.business.name='ТестСервис'; game.business.foundedAt={...game.calendar};
html=renderGame(game,{...ui,tab:'more',morePage:'business',businessSection:'overview'});
assert.ok(html.includes('ЗАГРУЗКА МАСТЕРСКОЙ'));
assert.ok(html.includes('РЕПУТАЦИЯ ПО НАПРАВЛЕНИЯМ'));
html=renderGame(game,{...ui,tab:'more',morePage:'advertising'});
assert.ok(html.includes('advertising-source-image'));
const setup=renderSetup({theme:'dark',specialization:'hardware',avatar:'classic',setupSlot:0,playerName:'Тест',difficultyId:'normal'});
assert.ok(setup.includes('Сложность карьеры'));
assert.ok(setup.includes('Спокойный')&&setup.includes('Реалистичный'));

// Asset optimization: v18 graphics are WebP and no single UI icon is excessively large.
const uiRoot=path.join(root,'www/assets');
const imageFiles=[];
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,ent.name);if(ent.isDirectory())walk(full);else if(/\.(webp|png)$/i.test(ent.name))imageFiles.push(full)}}
walk(uiRoot);
const v18Images=imageFiles.filter(x=>x.includes(`${path.sep}ui-v180${path.sep}`));
assert.equal(v18Images.length,5);
assert.ok(v18Images.every(x=>x.endsWith('.webp')));
assert.ok(v18Images.every(x=>fs.statSync(x).size<100_000));
assert.ok(imageFiles.filter(x=>x.endsWith('.png')).every(x=>!x.includes(`${path.sep}ui-v168${path.sep}`)&&!x.includes(`${path.sep}ui-v169${path.sep}`)&&!x.includes(`${path.sep}ui-v171${path.sep}`)));

const css=read('www/css/app.css');
assert.match(css,/v0\.18\.0/);
assert.match(css,/\.quote-options/);
assert.match(css,/\.notification-list/);
assert.match(css,/\.workstation-grid/);

console.log('Regression v0.18.0: OK');
