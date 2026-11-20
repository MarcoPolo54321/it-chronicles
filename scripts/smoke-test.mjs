import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createNewGame, migrateGame, PROFILE_LIMIT, SAVE_VERSION } from '../www/js/core/game.js';
import { SKILLS } from '../www/js/data/progression.js';
import { CAREER_BRANCHES_V162, CAREER_JOBS_V162, careerJobByBranchTier } from '../www/js/data/v162.js';
import { WORKSPACE_ITEMS, workspaceAsset, workspaceRoomAsset, workspaceRoomStage } from '../www/js/data/workspace.js';
import { EDUCATION_POOL, availableEducation, completeEducation, completeUniversity, educationDays, educationMarketStatusV167, educationPlayerXp, startEducation } from '../www/js/systems/education.js';
import { advanceHours } from '../www/js/systems/calendar.js';
import { ensureV08 } from '../www/js/systems/v08.js';
import { ensureV13 } from '../www/js/systems/v13.js';
import { ensureV160, openCompany } from '../www/js/systems/v160.js';
import { currentSalary } from '../www/js/systems/progression.js';
import { acceptPromotion, careerBranchState, ensureCareerV162, promotionStatus, switchCareerBranch } from '../www/js/systems/career.js';
import { ADVERTISING_CATALOG_V162, advertisingPrice, ensureAdvertisingV162, processAdvertisingDay, startAdvertisingCampaign } from '../www/js/systems/advertising.js';
import { activeAdvertisingBonuses, companyRevenueShare } from '../www/js/data/advertising-v162.js';
import { ALL_LOCATIONS, ALL_VEHICLES } from '../www/js/data/economy.js';
import { buyVehicle } from '../www/js/systems/economy.js';
import { renderGame, renderProfiles, renderSetup } from '../www/js/ui/render.js';
import { addMoney } from '../www/js/systems/progression.js';
import { closeMonthlyFinancialReport, ensureQualityState, recordLedger, validateGameState } from '../www/js/core/quality.js';
import { BUSINESS_STAGES_V165, EMPLOYEE_TRAINING_PROGRAMS_V165 } from '../www/js/data/v165.js';
import { businessStageRequirement, companyCapacity, ensureV165, trainEmployeeProgram, upgradeBusinessStage } from '../www/js/systems/v165.js';
import { ensureV166, targetAvailableOrdersV166 } from '../www/js/systems/v166.js';
import { acceptOrder, manualRefreshOrders, refreshOrders } from '../www/js/systems/orders.js';
import { knowledgeBonus } from '../www/js/systems/knowledge.js';

const game=createNewGame({name:'Smoke 0.16.7',specialization:'networking',avatar:'classic'});
ensureV08(game);ensureV13(game);ensureV160(game);ensureCareerV162(game);ensureAdvertisingV162(game);ensureV165(game);ensureV166(game);
assert.equal(SAVE_VERSION,19);
assert.equal(PROFILE_LIMIT,10);
assert.deepEqual(SKILLS.map(s=>s.id),['hardware','software','networking','repair','data','security','communication','management']);
assert.equal(CAREER_BRANCHES_V162.length,8);
assert.equal(CAREER_JOBS_V162.length,40);

// Start background and hero profile are independent and additive.
assert.equal(game.skills.networking.level,2);
assert.equal(game.skills.security.level,1);
assert.equal(game.skills.software.level,2); // base 1 + avatar 1
assert.equal(game.skills.communication.level,1);
assert.equal(game.profile.backgroundBonusVersion,1);

// Existing saves receive background once.
const old=createNewGame({name:'Old',specialization:'data',avatar:'engineer'});
delete old.profile.backgroundBonusVersion;
const beforeData=old.skills.data.level;
const migratedOnce=migrateGame(old);
assert.equal(migratedOnce.skills.data.level,beforeData+2);
const migratedTwice=migrateGame(migratedOnce);
assert.equal(migratedTwice.skills.data.level,migratedOnce.skills.data.level);
const legacyProperty=createNewGame({name:'Legacy property'});
legacyProperty.property.locationId='service_center';
legacyProperty.property.ownedLocations=['home','service_center'];
legacyProperty.property.vehicleId='new_car';
legacyProperty.property.ownedVehicles=['none','new_car'];
const migratedProperty=migrateGame(legacyProperty);
assert.equal(migratedProperty.property.locationId,'two_room');
assert.equal(migratedProperty.property.vehicleId,'old_mercedes');

// Uploaded period-correct workspace artwork.
for(const id of ['monitor','computer','keyboard','mouse','chair','printer','lamp','speakers','mug','plant']){
  for(let level=1;level<=5;level++){
    const url=workspaceAsset(id,level);
    const rel=url.split('?')[0].replace('./','www/');
    assert.ok(fs.existsSync(new URL('../'+rel,import.meta.url)),`Нет ассета ${id}/${level}`);
  }
}
for(const item of WORKSPACE_ITEMS) game.workspace.items[item.id]=5;
game.calendar.year=2000;
assert.equal(workspaceRoomStage(game),0);
assert.ok(workspaceRoomAsset(game).includes('room-0.webp'));
game.calendar.year=2010;
assert.ok(workspaceRoomStage(game)<=4);

// Formal education: one year for college, five years for university, permanent gains and large XP.
const college=EDUCATION_POOL.find(i=>i.id==='v152_college_hardware_01');
const university=EDUCATION_POOL.find(i=>i.id==='v152_university_hardware_01');
assert.equal(college.skillGains.hardware,8);
assert.equal(university.skillGains.hardware,48);
assert.ok(university.skillGains.security>=30&&university.skillGains.security<=40);
assert.equal(educationDays(college),360);
assert.equal(educationDays(university),1800);
assert.ok(educationPlayerXp(college)>=900&&educationPlayerXp(college)<=1100);
assert.ok(educationPlayerXp(university)>=4700&&educationPlayerXp(university)<=5100);

// v0.16.9: expanded weekly set of eligible quick materials is visible.
const marketGame=createNewGame({name:'Market v0.16.9',specialization:'hardware',avatar:'classic'});
marketGame.player.level=50;marketGame.player.cash=10_000_000;
for(const skill of Object.values(marketGame.skills))skill.level=20;
const quickOffers=availableEducation(marketGame).filter(item=>item.educationKind==='quick');
assert.ok(quickOffers.length<=16);
assert.ok(quickOffers.every(item=>item.temporaryKnowledge));
assert.ok(educationMarketStatusV167(marketGame).hoursLeft<=168);
const firstWeekOfferIds=[...marketGame.education.marketV167.offerIds];
marketGame.calendar.totalHours=168;marketGame.calendar.totalDays=7;marketGame.calendar.day=8;
const secondWeekOffers=availableEducation(marketGame).filter(item=>item.educationKind==='quick');
assert.equal(marketGame.education.marketV167.weekKey,1);
assert.ok(secondWeekOffers.length<=16);
assert.notDeepEqual(marketGame.education.marketV167.offerIds,firstWeekOfferIds);
const temporaryNonBook=EDUCATION_POOL.find(item=>item.educationKind==='quick'&&item.type!=='book'&&(item.fromYear||2000)<=marketGame.calendar.year&&(!item.toYear||item.toYear>=marketGame.calendar.year)&&item.skillGains?.[item.focus]);
assert.ok(temporaryNonBook);
const temporarySkill=temporaryNonBook.focus;
const temporaryBefore=knowledgeBonus(marketGame,temporarySkill);
const quickStudyResult=startEducation(marketGame,temporaryNonBook.id);
assert.equal(quickStudyResult.ok,true);
assert.equal(marketGame.education.active,null);
assert.ok(knowledgeBonus(marketGame,temporarySkill)>temporaryBefore);
assert.match(quickStudyResult.message,/моментально/i);

game.player.cash=10_000_000;game.player.level=50;game.player.reputation=500;
for(const skill of Object.values(game.skills)){skill.level=0;skill.xp=0;}
game.skills.hardware.level=2;
assert.equal(startEducation(game,college.id).ok,true);
assert.equal(game.education.university.totalDays,360);
game.education.university.daysLeft=0;game.education.university.ready=true;
const beforeHardware=game.skills.hardware.level;
const beforeStudyXp=game.progression.xpFromStudy||0;
assert.equal(completeUniversity(game).ok,true);
assert.equal(game.skills.hardware.level,beforeHardware+8);
assert.ok((game.progression.xpFromStudy||0)-beforeStudyXp>=900);

// Salary and profession XP remain active.
ensureCareerV162(game);
game.business.opened=false;
game.career.currentBranchId='hardware';
const hw=careerBranchState(game,'hardware');
hw.tier=1;hw.bestTier=1;hw.jobId=careerJobByBranchTier('hardware',1).id;hw.xp=0;
game.career.jobId=hw.jobId;
const salary=currentSalary(game);
assert.ok(salary>0);
game.calendar={year:2000,month:1,day:30,hour:0,totalDays:29,totalHours:696};
const cashBefore=game.player.cash;const professionBefore=hw.xp;
advanceHours(game,24,{activity:'productive'});
assert.ok(game.player.cash>cashBefore);
assert.ok(hw.xp>professionBefore);

// Career branches preserve progress.
hw.tier=3;hw.bestTier=3;hw.jobId=careerJobByBranchTier('hardware',3).id;hw.xp=700;game.career.jobId=hw.jobId;
assert.equal(switchCareerBranch(game,'software').ok,true);
assert.equal(careerBranchState(game,'software').tier,1);
assert.equal(switchCareerBranch(game,'hardware').ok,true);
assert.equal(careerBranchState(game,'hardware').tier,3);

// Promotion.
game.calendar.year=2008;game.player.level=50;for(const skill of Object.values(game.skills))skill.level=20;
hw.tier=1;hw.bestTier=1;hw.jobId=careerJobByBranchTier('hardware',1).id;hw.xp=200;game.career.currentBranchId='hardware';game.career.jobId=hw.jobId;
assert.equal(promotionStatus(game).available,true);
assert.equal(acceptPromotion(game).ok,true);

// Housing and transport progression.
assert.deepEqual(ALL_LOCATIONS.map(x=>x.id),['home','dorm_room','studio','one_room','two_room']);
for(const location of ALL_LOCATIONS) {
  assert.ok(location.asset);
  const rel=location.asset.replace('./','www/');
  assert.ok(fs.existsSync(new URL('../'+rel,import.meta.url)));
}
assert.ok(ALL_VEHICLES.some(x=>x.id==='old_mercedes'));
game.player.cash=10_000_000;game.player.level=50;
const commBefore=game.skills.communication.level;
assert.equal(buyVehicle(game,'old_mercedes').ok,true);
assert.equal(game.skills.communication.level,commBefore+1);
assert.equal(buyVehicle(game,'old_mercedes').ok,true);
assert.equal(game.skills.communication.level,commBefore+1);

// Advertising remains independent.
const placement=ADVERTISING_CATALOG_V162.find(item=>item.fromYear<=game.calendar.year);
const adPrice=advertisingPrice(game,placement,'personal','week');
assert.ok(adPrice>0);
assert.equal(startAdvertisingCampaign(game,placement.id,'personal','week').ok,true);
assert.ok(activeAdvertisingBonuses(game,'personal').campaigns>=1);
assert.ok(companyRevenueShare(game)>=.35&&companyRevenueShare(game)<=.50);

// v0.16.7: save health, structured ledger and monthly finance.
ensureQualityState(game);
const validation=validateGameState(game,true);
assert.equal(validation.ok,true);
const ledgerBefore=game.quality.ledger.length;
addMoney(game,1234,'Тестовый заказ');
assert.ok(game.quality.ledger.length>ledgerBefore);
assert.ok(game.finance.current.details.some(item=>item.source==='Тестовый заказ'));
const report=closeMonthlyFinancialReport(game);
assert.ok(report.income>=1234);
assert.equal(game.finance.current.income,0);
assert.ok(game.finance.history.length>=1);

// v0.16.7: staged company, employee capacity and training.
const biz=createNewGame({name:'Business 0.16.7',specialization:'management',avatar:'administrator'});
ensureV08(biz);ensureV13(biz);ensureV160(biz);ensureCareerV162(biz);ensureAdvertisingV162(biz);ensureV165(biz);
biz.player.level=50;biz.player.cash=10_000_000;biz.player.reputation=500;
for(const skill of Object.values(biz.skills))skill.level=20;
biz.business.opened=true;biz.business.name='ТестСервис';biz.business.typeId='service_repair';biz.business.companyReputation=100;biz.business.stage=1;
ensureV165(biz);
assert.equal(BUSINESS_STAGES_V165.length,5);
assert.equal(companyCapacity(biz).employees,1);
assert.equal(businessStageRequirement(biz).ok,true);
assert.equal(upgradeBusinessStage(biz).ok,true);
assert.equal(biz.business.stage,2);
biz.business.employees.push({id:'emp_test',templateId:'v161_repair_master',name:'Сотрудник',salary:20000,level:2,morale:70,training:0});
ensureV165(biz);
const cashTraining=biz.player.cash;
const training=trainEmployeeProgram(biz,'emp_test',EMPLOYEE_TRAINING_PROGRAMS_V165[0].id);
assert.equal(training.ok,true);
assert.ok(biz.player.cash<cashTraining);
assert.ok(biz.business.employees[0].training>=1);

// v0.16.7: advertising effectiveness report.
const activeAd=biz.marketing.activeCampaigns;
const adPlacement=ADVERTISING_CATALOG_V162.find(item=>item.fromYear<=biz.calendar.year);
assert.equal(startAdvertisingCampaign(biz,adPlacement.id,'personal','week').ok,true);
biz.marketing.activeCampaigns[0].daysLeft=1;
biz.marketing.activeCampaigns[0].stats={leads:5,orders:2,revenue:25000};
processAdvertisingDay(biz);
assert.ok(biz.marketing.reports.length>=1);
assert.equal(biz.marketing.reports[0].profit,biz.marketing.reports[0].revenue-biz.marketing.reports[0].price);

// UI checks.
const ui={theme:'dark',tab:'education',ordersSection:'available',workshopSection:'workspace',workspaceGroup:'core',growthSection:'skills',morePage:'home',educationKind:'formal',educationSkill:'hardware',educationPage:1,advertisingPage:1,advertisingScope:'personal',advertisingDuration:'week',businessSection:'overview',companyLogo:'chip',companyType:'service_repair',specialization:'networking',avatar:'classic',setupSlot:0,playerName:'Тест',ledgerFilter:'all',financeReportIndex:0,modal:null};
const setupHtml=renderSetup(ui);
assert.ok(setupHtml.includes('Стартовый профессиональный бэкграунд'));
assert.ok(setupHtml.includes('+2'));
assert.ok(setupHtml.includes('независимые бонусы'));

const eduGame=createNewGame({name:'Education UI',specialization:'hardware',avatar:'classic'});
ensureV08(eduGame);ensureV13(eduGame);ensureV160(eduGame);ensureCareerV162(eduGame);eduGame.player.level=50;eduGame.player.cash=10_000_000;
const educationHtml=renderGame(eduGame,ui);
assert.ok(educationHtml.includes('Железо +8 постоянно'));
assert.ok(educationHtml.includes('1 игровой год'));
assert.ok(educationHtml.includes('5 игровых лет'));
assert.ok(!educationHtml.includes('8/10'));
assert.ok(!educationHtml.includes('48/50'));

ui.tab='home';
const homeHtml=renderGame(eduGame,ui);
assert.ok(homeHtml.includes('Бэкграунд:'));
assert.ok(!homeHtml.includes('era-news-ticker'));
assert.ok(homeHtml.includes('era-news-list'));

ui.tab='more';ui.morePage='jobs';
const careerHtml=renderGame(eduGame,ui);
assert.ok(careerHtml.includes('Ежемесячная зарплата'));
assert.ok(careerHtml.includes('career-choice-button'));
assert.ok(careerHtml.includes('career-switcher'));

ui.morePage='property';
eduGame.calendar.year=2008;
const propertyHtml=renderGame(eduGame,ui);
assert.ok(propertyHtml.includes('Комната у родителей'));
assert.ok(propertyHtml.includes('Mercedes-Benz W124'));
assert.ok(propertyHtml.includes('property-preview'));

ui.tab='more';ui.morePage='development';
const developmentHtml=renderGame(eduGame,ui);
assert.ok(developmentHtml.includes('База героя'));
assert.ok(developmentHtml.includes('development-skill-list-v167'));
assert.ok(developmentHtml.includes('skill-icon-image'));

ui.morePage='finance';
const financeHtml=renderGame(game,ui);
assert.ok(financeHtml.includes('Месячный отчёт'));
assert.ok(financeHtml.includes('Подробная расшифровка'));

ui.morePage='log';
const ledgerHtml=renderGame(game,ui);
assert.ok(ledgerHtml.includes('Награды и бонусы'));
assert.ok(ledgerHtml.includes('ledger-filter'));

ui.morePage='advertising';
const advertisingHtml=renderGame(biz,ui);
assert.ok(advertisingHtml.includes('Отчёт об эффективности'));

ui.morePage='business';ui.businessSection='overview';
const businessHtml=renderGame(biz,ui);
assert.ok(businessHtml.includes('ЭТАП КОМПАНИИ'));
assert.ok(businessHtml.includes('Офис в месяц'));

ui.morePage='settings';
const settingsHtml=renderGame(game,ui);
assert.ok(settingsHtml.includes('Проверить сохранение'));

ui.modal={type:'workspace-comparison',itemId:'monitor'};
const comparisonHtml=renderGame(eduGame,ui);
assert.ok(comparisonHtml.includes('СЛЕДУЮЩЕЕ УЛУЧШЕНИЕ'));
assert.ok(comparisonHtml.includes('workspace-next-image'));


// v0.16.7: progressive profile slots and redesigned orders.
const profileSlots=Array(10).fill(null);profileSlots[0]=game;
const profilesHtml=renderProfiles(profileSlots,{theme:'dark'});
assert.equal((profilesHtml.match(/Создать карьеру/g)||[]).length,1);
assert.ok(setupHtml.includes('previous-background'));
assert.ok(!setupHtml.includes('ПОДТВЕРЖДЕНИЕ ВЫБОРА'));
const orderGame=createNewGame({name:'Orders 0.16.7',specialization:'hardware',avatar:'classic'});
ensureV08(orderGame);ensureV13(orderGame);ensureV160(orderGame);ensureV165(orderGame);ensureV166(orderGame);
refreshOrders(orderGame,true);
assert.equal(targetAvailableOrdersV166(orderGame),5);
assert.equal(orderGame.orders.available.length,5);
assert.ok(orderGame.orders.available.every(order=>order.taskTypeId&&order.diagnosticCase?.story&&order.diagnosticCase?.choices?.length===3));
assert.ok(orderGame.orders.available.every(order=>order.reward>=Number(order.estimatedMaterialCost||0)));
for(const order of orderGame.orders.available){
  const taskIcon=(await import('../www/js/data/v166.js')).orderTaskTypeV166(order).icon;
  assert.ok(taskIcon.endsWith('.webp'));
  assert.ok(fs.existsSync(new URL(`../www/assets/orders/types/${taskIcon}`,import.meta.url)));
}
const beforeRefreshHours=orderGame.calendar.totalHours;
assert.equal(manualRefreshOrders(orderGame).ok,true);
assert.equal(orderGame.calendar.totalHours-beforeRefreshHours,6);
const localOrder=orderGame.orders.available.find(order=>!order.onSite);
assert.ok(localOrder);
assert.equal(acceptOrder(orderGame,localOrder.uid).ok,true);
assert.ok(orderGame.orders.active[0].deadlineDays>=7&&orderGame.orders.active[0].deadlineDays<=30);
ui.tab='orders';ui.ordersSection='available';ui.modal=null;
const ordersHtml=renderGame(orderGame,ui);
assert.ok(ordersHtml.includes('order-card-v180'));
assert.ok(ordersHtml.includes('order-details'));
assert.ok(ordersHtml.includes('.webp?v=167'));

ui.tab='education';ui.educationKind='quick';ui.educationSkill='hardware';ui.educationPage=1;
const quickEducationHtml=renderGame(marketGame,ui);
assert.ok(quickEducationHtml.includes('ВИТРИНА НЕДЕЛИ'));
assert.ok(quickEducationHtml.includes('education-market-v167'));

console.log('Smoke test v0.18.0: OK');
