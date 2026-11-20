import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createNewGame } from '../www/js/core/game.js';
import { EDUCATION_POOL, startEducation } from '../www/js/systems/education.js';
import { grantTemporaryKnowledge, knowledgeBonus } from '../www/js/systems/knowledge.js';
import { completeOrder } from '../www/js/systems/orders.js';
import { processParallelDay } from '../www/js/systems/v169.js';
import { ensureV08 } from '../www/js/systems/v08.js';
import { ensureV169 } from '../www/js/systems/v169.js';
import { recordSkillEntry } from '../www/js/core/quality.js';
import { renderGame, renderSetup } from '../www/js/ui/render.js';

const game=createNewGame({name:'Regression 0.16.11',specialization:'networking',avatar:'classic'});
ensureV08(game);ensureV169(game);
game.player.level=50;game.player.cash=1_000_000;game.player.energy=100;
for(const skill of Object.values(game.skills)){skill.level=5;skill.xp=0;}

// Быстрые материалы изучаются сразу и не создают активную очередь.
const material=EDUCATION_POOL.find(item=>item.educationKind==='quick'&&item.focus==='networking'&&(item.fromYear||2000)<=game.calendar.year);
assert.ok(material,'Не найден быстрый материал по сетям');
const dayBefore=game.calendar.totalDays;
const tempBefore=knowledgeBonus(game,'networking');
const study=startEducation(game,material.id);
assert.equal(study.ok,true);
assert.match(study.message,/моментально/i);
assert.equal(game.education.active,null);
assert.equal(game.calendar.totalDays,dayBefore);
assert.ok(knowledgeBonus(game,'networking')>tempBefore);

// Заказ завершается моментально и сначала расходует временные знания.
grantTemporaryKnowledge(game,{
  id:'v1611_test_knowledge',name:'Тестовый конспект',focus:'networking',focusSkill:'networking',
  skillGains:{networking:2},cooldownMonths:6,knowledgeMonths:12
});
const permanentBefore=game.skills.networking.level;
const temporaryBefore=knowledgeBonus(game,'networking');
const order={
  uid:'v1611-instant-order',name:'Настройка сети',status:'repair',difficulty:'easy',orderType:'standard',
  items:[],skills:{networking:2},recommendedSkills:{networking:2},client:{name:'Клиент'},
  reward:250,reputation:1,xp:10,skillXp:{networking:5},baseChance:.95,
  diagnosis:{quality:1,correct:true},repairApproach:{quality:.05,failureRisk:0,reviewPenalty:0}
};
game.orders.active.push(order);
const orderDayBefore=game.calendar.totalDays;
const completed=completeOrder(game,order.uid);
assert.equal(completed.ok,true);
assert.equal(completed.needsTest,true);
assert.equal(order.status,'testing');
assert.equal(game.calendar.totalDays,orderDayBefore);
assert.equal(knowledgeBonus(game,'networking'),temporaryBefore-2);
assert.equal(game.skills.networking.level,permanentBefore,'При наличии временных знаний постоянный уровень не должен уменьшаться');
assert.equal(order.knowledgeConsumed.networking.total,2);

// При нехватке временных знаний постоянный навык не теряется, но появляется штраф к качеству/оплате.
for (const entry of Object.values(game.education.bookKnowledge || {})) {
  if (entry.skills) entry.skills.networking = 0;
  if (entry.skillId === 'networking') entry.amount = 0;
}
const second={...order,uid:'v1611-permanent-order',name:'Повторная настройка',status:'repair',knowledgeConsumed:undefined,materialsConsumed:false,repairResult:null};
game.orders.active.push(second);
const permanentBeforeSecond=game.skills.networking.level;
const secondResult=completeOrder(game,second.uid);
assert.equal(secondResult.ok,true);
assert.equal(game.skills.networking.level,permanentBeforeSecond);
assert.equal(second.knowledgeConsumed.networking.permanent,0);
assert.equal(second.knowledgeConsumed.networking.shortage,2);
assert.equal(Number(second.knowledgeShortageTotal||0),2);
assert.ok((second.repairResult?.baseProbability||0) < (order.repairResult?.baseProbability||1));

// При обычной основной работе полного запаса хватает минимум на 14 дней.
const energyGame=createNewGame({name:'Energy fortnight',specialization:'hardware',avatar:'classic'});
ensureV169(energyGame);
energyGame.player.energy=100;
energyGame.career.jobId='support_trainee';
energyGame.business.opened=false;
for(let day=0;day<14;day+=1)processParallelDay(energyGame);
assert.ok(energyGame.player.energy>0,`Энергия закончилась раньше двух недель: ${energyGame.player.energy}`);

// Локализация новых и старых записей журнала.
recordSkillEntry(game,'networking',10,1,1);
game.quality.ledger.unshift({id:'legacy',at:{day:1,month:1,year:2000},kind:'gain',category:'skill',label:'Навык: hardware',amount:1,unit:'XP',details:'Профессиональный опыт: software'});
const ui={theme:'light',tab:'more',morePage:'log',ordersSection:'available',workshopSection:'workspace',workspaceGroup:'core',growthSection:'skills',educationKind:'quick',educationSkill:'hardware',educationFormalType:'college',educationPage:1,shopCategory:'all',shopQuery:'',shopPage:1,businessSection:'overview',companyType:'service_repair',ledgerFilter:'all',financeReportIndex:0,advertisingPage:1,advertisingScope:'personal',advertisingDuration:'week',modal:null};
const logHtml=renderGame(game,ui);
assert.ok(logHtml.includes('Навык: Сети'));
assert.ok(logHtml.includes('Навык: Железо'));
assert.ok(logHtml.includes('Профессиональный опыт: Софт'));
assert.ok(!logHtml.includes('Навык: hardware'));

// Нижняя навигация, мастерская в «Ещё», уровень помещения и предупреждение энергии.
ui.tab='home';ui.morePage='home';
const mainHtml=renderGame(game,ui);
assert.ok(mainHtml.includes('data-tour="nav-rest"'));
assert.ok(mainHtml.includes('data-action="main-tab" data-value="rest"'));
assert.ok(!mainHtml.includes('data-tour="nav-workshop"'));
ui.tab='more';ui.morePage='home';
const moreHtml=renderGame(game,ui);
assert.ok(moreHtml.includes('data-action="more-page" data-value="workshop"'));
ui.morePage='property';game.player.level=1;
const propertyHtml=renderGame(game,ui);
assert.ok(propertyHtml.includes('Нужен ур.'));
ui.modal={type:'energy-warning'};game.player.energy=18;
const warningHtml=renderGame(game,ui);
assert.ok(warningHtml.includes('Энергия подходит к концу'));
assert.ok(warningHtml.includes('energy-go-rest'));

// В создании персонажа используются графические иконки навыков.
const setupHtml=renderSetup({theme:'light',specialization:'hardware',avatar:'classic',setupSlot:0,playerName:'Тест',gameMode:'campaign',challengeId:'million_2010'});
assert.ok(setupHtml.includes('./assets/ui-v169/skills/hardware.webp'));
assert.ok(setupHtml.includes('skill-icon-image'));

const css=fs.readFileSync(new URL('../www/css/app.css',import.meta.url),'utf8');
assert.ok(css.includes('.energy-warning-dialog'));
console.log('Regression v0.16.11: OK');
