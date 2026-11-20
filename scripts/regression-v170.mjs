import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createNewGame } from '../www/js/core/game.js';
import { LIFESTYLE_PLANS_V169 } from '../www/js/data/v169.js';
import { ensureV08, resolveDecisionEvent } from '../www/js/systems/v08.js';
import { ensureV169, lifestyleDailyCost, processLifestyleDay, setLifestylePlan } from '../www/js/systems/v169.js';
import { renderGame } from '../www/js/ui/render.js';

const ui={
  theme:'light',tab:'home',morePage:'home',ordersSection:'available',workshopSection:'workspace',workspaceGroup:'core',
  growthSection:'skills',educationKind:'quick',educationSkill:'hardware',educationFormalType:'college',educationPage:1,
  shopCategory:'all',shopQuery:'',shopPage:1,businessSection:'overview',companyType:'service_repair',ledgerFilter:'all',
  financeReportIndex:0,advertisingPage:1,advertisingScope:'personal',advertisingDuration:'week',modal:null
};

// Еда оплачивается за один игровой день.
const foodGame=createNewGame({name:'Food v17',specialization:'hardware',avatar:'classic'});
ensureV169(foodGame);
foodGame.player.cash=10_000;
const restaurant=LIFESTYLE_PLANS_V169.find(item=>item.id==='restaurant_good');
assert.ok(restaurant);
assert.equal(lifestyleDailyCost(foodGame,restaurant),1200);
const beforeFood=foodGame.player.cash;
assert.equal(setLifestylePlan(foodGame,restaurant.id).ok,true);
assert.equal(foodGame.player.cash,beforeFood-1200);
foodGame.calendar.totalHours+=24;
processLifestyleDay(foodGame);
assert.equal(foodGame.player.cash,beforeFood-2400);

// Главная страница больше не содержит дублирующий блок фокуса.
const homeHtml=renderGame(foodGame,ui);
assert.ok(!homeHtml.includes('СЕЙЧАС В ФОКУСЕ'));

// Барахолка вынесена в отдельный пункт «Ещё» и удалена из вкладок мастерской.
ui.tab='more';ui.morePage='home';
const moreHtml=renderGame(foodGame,ui);
assert.ok(moreHtml.includes('data-value="flea"'));
assert.ok(moreHtml.includes('Барахолка'));
ui.morePage='workshop';
const workshopHtml=renderGame(foodGame,ui);
assert.ok(!workshopHtml.includes("data-value=\"flea\">Барахолка"));
ui.morePage='flea';
const fleaHtml=renderGame(foodGame,ui);
assert.ok(fleaHtml.includes('БАРАХОЛКА НУЛЕВЫХ'));
assert.ok(fleaHtml.includes('РЕТРО-РЫНОК'));

// Сюжетное событие показывает требования и не закрывается при ошибке навыка.
const eventGame=createNewGame({name:'Event v17',specialization:'hardware',avatar:'classic'});
ensureV08(eventGame);
for(const skill of Object.values(eventGame.skills)){skill.level=0;skill.xp=0;}
eventGame.world.activeEvent={id:'event-test',eventId:'racket_visit',createdAt:{...eventGame.calendar}};
ui.modal={type:'decision-event'};ui.tab='home';ui.morePage='home';
const eventHtml=renderGame(eventGame,ui);
assert.ok(eventHtml.includes('Общение 0/2'));
assert.ok(eventHtml.includes('Безопасность 0/3'));
assert.ok(eventHtml.includes('disabled'));
const failed=resolveDecisionEvent(eventGame,'police');
assert.equal(failed.ok,false);
assert.match(failed.message,/Общение 0\/2/);
assert.ok(eventGame.world.activeEvent,'Событие должно оставаться активным после неудачного выбора');

// Android/браузерная кнопка назад ведёт по внутренней иерархии.
const appSource=fs.readFileSync(new URL('../www/js/app.js',import.meta.url),'utf8');
assert.ok(appSource.includes("function navigateBack()"));
assert.ok(appSource.includes("ui.morePage = 'home'"));
assert.ok(appSource.includes("appPlugin.addListener('backButton', navigateBack)"));
assert.ok(appSource.includes("ui.modal = result.ok ? null : { type:'decision-event' }"));

// Сборщик сам восстанавливает local.properties при наличии Android SDK.
const buildSource=fs.readFileSync(new URL('../BUILD_UPDATE.ps1',import.meta.url),'utf8');
assert.ok(buildSource.includes('local.properties'));
assert.ok(buildSource.includes('ANDROID_SDK_ROOT'));

console.log('Regression v0.17.0: OK');
