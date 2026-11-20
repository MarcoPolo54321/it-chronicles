import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createNewGame } from '../www/js/core/game.js';
import { ALL_VEHICLES, ENTERTAINMENT } from '../www/js/data/economy.js';
import { DECISION_EVENTS_V08 } from '../www/js/data/v08.js';
import { processSimulationTick } from '../www/js/systems/simulation.js';
import { ensureV08, processV08Day } from '../www/js/systems/v08.js';
import { energyErrorPenalty, energyPerformanceFactor, ensureV169 } from '../www/js/systems/v169.js';
import { processVehicleDay, restAction } from '../www/js/systems/economy.js';
import { renderGame } from '../www/js/ui/render.js';

const game=createNewGame({name:'Regression 0.16.10',specialization:'repair',avatar:'classic'});
ensureV08(game);ensureV169(game);
game.player.energy=100;
game.orders.active.push({
  uid:'v1610-order',name:'Проверка прогресса',status:'working',difficulty:'hard',orderType:'standard',
  progressDays:0,totalWorkDays:8,workDays:8,deadlineDays:21,initialDeadlineDays:21,items:[],
  skills:{repair:1},recommendedSkills:{repair:3},client:{name:'Клиент'},reward:200,reputation:1,xp:1,skillXp:{repair:1},baseChance:.9
});
game.education.active={queueId:'book',id:'book',name:'Книга',type:'book',daysLeft:3,totalDays:3,ready:false};
const energyBefore=game.player.energy;
processSimulationTick(game);
assert.ok(game.orders.active[0].progressDays>0,'Заказ не получил прогресс после 12 часов');
assert.ok(game.education.active.daysLeft<3,'Книга не получила прогресс после 12 часов');
assert.ok(game.player.energy<energyBefore,'Энергия не уменьшилась');

const idle=createNewGame({name:'Idle energy'});ensureV08(idle);ensureV169(idle);
idle.player.energy=40;
processSimulationTick(idle);
assert.ok(idle.player.energy<40,'Энергия должна уменьшаться даже без активной работы');
idle.player.energy=0;
const stopped=processSimulationTick(idle);
assert.match(stopped.message,/Отдых/);
assert.equal(idle.player.energy,0,'Автоматический отдых не должен восстанавливать энергию');
assert.equal(energyPerformanceFactor(0),0);
assert.ok(energyPerformanceFactor(20)<energyPerformanceFactor(80));
assert.ok(energyErrorPenalty(8)>energyErrorPenalty(45));
assert.equal(energyErrorPenalty(80),0);

const beforeRest=idle.player.energy;
const sleep=restAction(idle,'sleep');
assert.equal(sleep.ok,true);
assert.ok(idle.player.energy>beforeRest,'Активное действие отдыха должно восстанавливать энергию');
assert.ok(ENTERTAINMENT.some(item=>Number(item.energy||0)>0));

const eventIds=['racket_visit','broken_window','street_pressure','stolen_tools'];
for(const id of eventIds) assert.ok(DECISION_EVENTS_V08.some(item=>item.id===id),`Нет события ${id}`);
const eventGame=createNewGame({name:'Monthly events'});ensureV08(eventGame);
eventGame.world.eventSchedule={monthKey:'2000-1',day:1,triggered:false};
assert.equal(processV08Day(eventGame).created,true);
eventGame.world.activeEvent=null;
assert.equal(processV08Day(eventGame).created,false,'Повторное событие в том же месяце запрещено');
eventGame.calendar.month=2;eventGame.calendar.day=1;
ensureV08(eventGame);
assert.equal(eventGame.world.eventSchedule.monthKey,'2000-2');
assert.ok(eventGame.world.eventSchedule.day>=2&&eventGame.world.eventSchedule.day<=29);

assert.deepEqual(ALL_VEHICLES.map(item=>item.id),['none','bicycle','old_lada','old_mercedes','minivan','van_service']);
const cars=ALL_VEHICLES.slice(2);
for(let i=1;i<cars.length;i++){
  assert.ok(cars[i].cost>cars[i-1].cost,'Цена транспорта должна расти');
  assert.ok(cars[i].dailyCostBase>cars[i-1].dailyCostBase,'Ежедневные расходы должны расти');
  assert.ok(cars[i].speedBonus>cars[i-1].speedBonus,'Скорость транспорта должна расти');
}
const transportGame=createNewGame({name:'Vehicle costs'});ensureV169(transportGame);
transportGame.property.vehicleId='old_mercedes';
transportGame.player.cash=10000;
const cashBefore=transportGame.player.cash;
const daily=processVehicleDay(transportGame);
assert.ok(daily>0);
assert.equal(transportGame.player.cash,cashBefore-daily);

const ui={theme:'light',tab:'more',morePage:'property',ordersSection:'available',workshopSection:'workspace',workspaceGroup:'core',growthSection:'skills',educationKind:'quick',educationSkill:'hardware',educationFormalType:'college',educationPage:1,shopCategory:'all',shopQuery:'',shopPage:1,businessSection:'overview',companyType:'service_repair',ledgerFilter:'all',financeReportIndex:0,advertisingPage:1,advertisingScope:'personal',advertisingDuration:'week',modal:null};
transportGame.player.level=1;
const propertyHtml=renderGame(transportGame,ui);
for(const name of ['ВАЗ-2106','Mercedes-Benz W124','Минивэн','Фургон мастерской']) assert.ok(propertyHtml.includes(name),`Транспорт не показан: ${name}`);
assert.ok(propertyHtml.includes('/день'));
const css=fs.readFileSync(new URL('../www/css/app.css',import.meta.url),'utf8');
assert.ok(css.includes(':root[data-theme="light"] .home-background-bonuses span'));
assert.ok(css.includes('color:#2b2117'));

console.log('Regression v0.16.10: OK');
