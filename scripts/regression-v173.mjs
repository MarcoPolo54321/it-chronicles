import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createNewGame } from '../www/js/core/game.js';
import { renderGame, renderSetup } from '../www/js/ui/render.js';
import { processYearTaxes, creditStatus } from '../www/js/systems/economy.js';
import { BANK } from '../www/js/data/economy.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');

const pkg=JSON.parse(read('package.json'));
assert.match(pkg.version,/^0\.(?:17\.[3-9]|18\.\d+)$/);
const build=read('BUILD_UPDATE.ps1');
assert.match(build,/versionCode (?:170[3-9]|18\d{2})/);
assert.match(build,/versionName "0\.(?:17\.[3-9]|18\.\d+)"/);
assert.match(build,/Hroniki-Aytishnika-v0\.(?:17\.[3-9]|18\.\d+)\.apk/);

const setup=renderSetup({theme:'dark',specialization:'networking',avatar:'classic',setupSlot:0,playerName:'Тест'});
assert.ok(setup.includes('Стартовый профессиональный бэкграунд'));
assert.ok(!setup.includes('background-picker-icon'));
assert.ok(setup.includes('background-picker-bonuses'));

const game=createNewGame({name:'Тест',specialization:'hardware',avatar:'classic'});
const baseUi={theme:'dark',tab:'home',morePage:'home',heroSection:'development',ordersSection:'available',workshopSection:'workspace',workspaceGroup:'core',growthSection:'skills',educationKind:'quick',educationSkill:'hardware',educationFormalType:'college',educationPage:1,shopCategory:'all',shopQuery:'',shopPage:1,businessSection:'overview',advertisingPage:1,advertisingScope:'personal',advertisingDuration:'week',ledgerFilter:'all',financeReportIndex:0,modal:null};
let html=renderGame(game,{...baseUi,tab:'home'});
for(const asset of ['money.webp','energy.webp','reputation.webp','level.webp']) assert.ok(html.includes(asset),`Главный показатель не использует ${asset}`);
assert.ok(!html.includes('Новости месяца обновятся'));
assert.ok(!html.includes('Нищеброд</h3>') || !html.includes('🏚'));

html=renderGame(game,{...baseUi,tab:'more',morePage:'home'});
assert.ok(html.includes('Герой и карьера'));
assert.ok(!html.includes('>Развитие героя<'));
assert.ok(!html.includes('>Работа<') || html.includes('Герой и карьера'));
assert.ok(!html.includes('>Навыки<') || html.includes('Герой и карьера'));

html=renderGame(game,{...baseUi,tab:'more',morePage:'hero',heroSection:'jobs'});
assert.ok(html.includes('hero-hub-tabs'));
assert.ok(html.includes('Основная работа') || html.includes('ОСНОВНАЯ РАБОТА'));

html=renderGame(game,{...baseUi,tab:'more',morePage:'bank'});
assert.ok(html.includes('>Банк<'));
assert.ok(!/НАЛОГИ|Налоговый долг|самозанят/i.test(html));

html=renderGame(game,{...baseUi,tab:'more',morePage:'achievements'});
assert.ok(!html.includes('🔒'));
assert.ok(html.includes('achievement-category-image'));

html=renderGame(game,{...baseUi,tab:'more',morePage:'settings'});
assert.ok(html.includes('автор: Ивасик'));
assert.ok(!html.includes('схема сохранения'));
assert.ok(!html.includes('кампания 2000–2010'));

// Налоговая механика действительно отключена, а старый долг очищается.
game.bank.taxDebt=5000;
game.bank.selfEmployed=true;
game.bank.yearlyIncome=100000;
processYearTaxes(game);
assert.equal(game.bank.taxDebt,0);
assert.equal(game.bank.selfEmployed,false);
const micro=BANK.loanRates.find(x=>x.id==='l1');
game.calendar.totalDays=120;
game.bank.totalIncome=50000;
const status=creditStatus(game,micro);
assert.notEqual(status.reason,'Сначала погасите налоговый долг');

const emoji=/[\u{1F000}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/u;
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(full);
    else if(/\.(js|css|html|json|txt|md)$/i.test(ent.name)){
      const text=fs.readFileSync(full,'utf8');
      assert.ok(!emoji.test(text),`Остался emoji-символ: ${path.relative(root,full)}`);
    }
  }
}
walk(path.join(root,'www'));

const css=read('www/css/app.css');
assert.match(css,/\.background-picker-bonuses\{display:grid;grid-template-columns:repeat\(2/);
assert.match(css,/\.vital-cards \.metric>div\{text-align:right/);
assert.match(css,/\.flea-intro \.scrap-counter\{grid-column:1\/-1;width:100%/);
assert.match(css,/img\[src\*="\/ui-v168\/"\]/);
assert.ok(fs.existsSync(path.join(root,'docs','archive','audits','ADVERTISING_SOURCES_0.17.3.txt')));

console.log('Regression v0.17.3: OK');
