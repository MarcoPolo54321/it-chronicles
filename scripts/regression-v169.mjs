import assert from 'node:assert/strict';
import { createNewGame, migrateGame } from '../www/js/core/game.js';
import { advanceDays } from '../www/js/systems/calendar.js';
import { processSimulationTick } from '../www/js/systems/simulation.js';
import { deadlineForOrderV166, ensureV166 } from '../www/js/systems/v166.js';
import { ensureV169, lifestyleDailyCost, processLifestyleDay, setLifestylePlan } from '../www/js/systems/v169.js';
import { maxActiveOrders } from '../www/js/systems/progression.js';
import { availableEducation } from '../www/js/systems/education.js';
import { ensureV08, processV08Day } from '../www/js/systems/v08.js';
import { renderGame } from '../www/js/ui/render.js';

const game=createNewGame({name:'Regression 0.16.10',specialization:'security',avatar:'classic'});
ensureV08(game);ensureV166(game);ensureV169(game);
game.player.energy=100;
game.orders.active.push({
  uid:'parallel-order',name:'Параллельный заказ',status:'working',difficulty:'medium',orderType:'standard',
  progressDays:0,totalWorkDays:10,workDays:10,deadlineDays:18,initialDeadlineDays:18,items:[],skills:{security:1},recommendedSkills:{security:3},
  client:{name:'Тестовый клиент'},reward:120,reputation:1,xp:1,skillXp:{security:1},baseChance:.9
});
game.education.active={queueId:'edu',id:'manual',name:'Тестовый материал',type:'book',daysLeft:2,totalDays:2,ready:false};
const skillXpBefore=Object.fromEntries(Object.entries(game.skills).map(([id,value])=>[id,Number(value.xp||0)]));
const energyBefore=game.player.energy;
const first=processSimulationTick(game);
assert.equal(first.changed,true);
assert.equal(game.calendar.totalDays,0);
assert.ok(game.orders.active[0].progressDays>0,'Заказ должен двигаться уже после первого 12-часового тика');
assert.ok(game.education.active.daysLeft<2,'Учёба должна двигаться уже после первого 12-часового тика');
const second=processSimulationTick(game);
assert.equal(second.changed,true);
assert.equal(game.calendar.totalDays,1);
assert.ok(game.orders.active[0].progressDays>0,'Заказ должен продвигаться при основной работе');
assert.equal(game.orders.active[0].deadlineDays,18);
assert.ok(!game.education.active || game.education.active.daysLeft<2,'Обучение должно идти параллельно с заказом и основной работой');
assert.ok(game.player.energy<energyBefore,'Энергия должна расходоваться ежедневно');
for(const [id,value] of Object.entries(game.skills)) assert.ok(Number(value.xp||0)>skillXpBefore[id],`Основная работа должна давать сопутствующий опыт: ${id}`);

assert.equal(deadlineForOrderV166({orderType:'standard',difficulty:'easy'}),14);
assert.equal(deadlineForOrderV166({orderType:'standard',difficulty:'medium'}),18);
assert.equal(deadlineForOrderV166({orderType:'standard',difficulty:'hard'}),21);
assert.equal(deadlineForOrderV166({orderType:'corporate',difficulty:'epic'}),30);
const urgent=deadlineForOrderV166({uid:'urgent-a',orderType:'urgent',difficulty:'easy'});
assert.ok(urgent>=7&&urgent<=10);

const market=createNewGame({name:'Materials',specialization:'hardware'});
market.player.level=50;market.player.cash=1e9;for(const skill of Object.values(market.skills))skill.level=50;
const offers=availableEducation(market).filter(item=>item.educationKind==='quick');
const counts=Object.fromEntries(['hardware','software','networking','repair','security','data','communication','management'].map(id=>[id,offers.filter(item=>item.focus===id).length]));
assert.equal(offers.length,16);
for(const [id,count] of Object.entries(counts))assert.ok(count>=2,`Нет двух материалов по направлению ${id}`);

const capacityGame=createNewGame({name:'Transport'});ensureV169(capacityGame);
const baseCapacity=maxActiveOrders(capacityGame);
capacityGame.property.vehicleId='minivan';
assert.equal(maxActiveOrders(capacityGame),baseCapacity+2);
capacityGame.property.vehicleId='van_service';
assert.equal(maxActiveOrders(capacityGame),baseCapacity+3);

const lifestyleGame=createNewGame({name:'Lifestyle'});ensureV169(lifestyleGame);
lifestyleGame.player.cash=3000;
assert.equal(setLifestylePlan(lifestyleGame,'canteen').ok,true);
const lifestyleCost=lifestyleDailyCost(lifestyleGame);
assert.equal(lifestyleCost,120);
const cashBefore=lifestyleGame.player.cash;
lifestyleGame.calendar.totalHours += 24;
processLifestyleDay(lifestyleGame);
assert.equal(lifestyleGame.player.cash,cashBefore-lifestyleCost);

const eventGame=createNewGame({name:'Events'});ensureV08(eventGame);
eventGame.world.eventSchedule={monthKey:'2000-1',day:eventGame.calendar.day,triggered:false};
assert.equal(processV08Day(eventGame).created,true);
assert.ok(eventGame.world.activeEvent);
eventGame.world.activeEvent=null;
assert.equal(processV08Day(eventGame).created,false,'В одном месяце не должно быть второго события');

const migrated=migrateGame({...createNewGame({name:'Migration'}),skillUsage:undefined,lifestyle:undefined,parallel:undefined});
assert.ok(migrated.skillUsage.hardware);
assert.equal(migrated.lifestyle.planId,'economy');
assert.equal(migrated.parallel.lastProcessedHour,migrated.calendar.totalHours);

const ui={
  tab:'education',growthSection:'education',educationKind:'quick',educationSkill:'hardware',educationFormalType:'college',educationPage:1,
  ordersSection:'available',workshopSection:'workspace',workspaceGroup:'core',morePage:'home',shopCategory:'all',shopQuery:'',shopPage:1,
  modal:null,businessSection:'overview',companyType:'service_repair',ledgerFilter:'all',financeReportIndex:0,advertisingPage:1,
  advertisingScope:'personal',advertisingDuration:'week',theme:'dark'
};
const educationHtml=renderGame(market,ui);
assert.ok(!educationHtml.includes('Все направления'));
ui.educationKind='formal';
const formalHtml=renderGame(market,ui);
assert.ok(formalHtml.includes('Техникумы и ПТУ')&&formalHtml.includes('ВУЗы'));
ui.tab='more';ui.morePage='rest';
const restHtml=renderGame(lifestyleGame,ui);
assert.ok(restHtml.includes('ПИТАНИЕ НА ОДИН ДЕНЬ'));
assert.ok(restHtml.includes('/день'));
assert.ok(restHtml.includes('Обед в заводской столовой'));
ui.morePage='business';
const companyHtml=renderGame(createNewGame({name:'Company'}),ui);
assert.ok(!companyHtml.includes('company-logo-grid'));
assert.ok(!companyHtml.includes('data-action="company-logo"'));

console.log('Regression compatibility v0.16.9 → v0.16.10: OK');
