import { EMPLOYEE_TRAINING_PROGRAMS_V165, BUSINESS_STAGES_V165, CLIENT_TYPE_LABELS_V165 } from '../data/v165.js';
import { addLog, addMoney, getInflation, skillLevel } from './progression.js';
import { clamp } from '../core/utils.js';
import { ensureQualityState, recordLedger } from '../core/quality.js';

const templateSkillMap = {
  v161_repair_master:['repair','hardware'],
  v161_pc_assembler:['hardware','repair'],
  v161_network_engineer:['networking','security'],
  v161_web_developer:['software','data'],
  v161_teacher:['communication','software'],
  v161_sales_manager:['communication','management'],
  v161_support_engineer:['software','networking'],
  v161_security_engineer:['security','networking'],
  v161_data_engineer:['data','repair'],
  v161_operations_manager:['management','communication']
};

export function ensureV165(game) {
  ensureQualityState(game);
  game.business ||= {};
  game.business.stage = Math.max(0, Math.min(BUSINESS_STAGES_V165.length, Number(game.business.stage || 0)));
  if (game.business.opened && game.business.stage < 1) {
    const employees = Number(game.business.employees?.length || 0);
    const contracts = Number(game.business.contracts?.length || 0);
    game.business.stage = contracts >= 3 || employees >= 6 ? 4 : contracts >= 1 || employees >= 3 ? 3 : employees >= 1 ? 2 : 1;
  }
  if (!game.business.opened) game.business.stage = 0;
  game.business.reputationHistory = Array.isArray(game.business.reputationHistory) ? game.business.reputationHistory : [];
  game.business.officeExpenses = Number(game.business.officeExpenses || 0);
  game.business.stageUpgrades = Array.isArray(game.business.stageUpgrades) ? game.business.stageUpgrades : [];
  game.business.employeeTrainingHistory = Array.isArray(game.business.employeeTrainingHistory) ? game.business.employeeTrainingHistory : [];
  for (const employee of game.business.employees || []) {
    employee.skills ||= {};
    for (const skillId of templateSkillMap[employee.templateId] || ['hardware']) {
      employee.skills[skillId] = Math.max(1, Number(employee.skills[skillId] || Math.round(Number(employee.level || 1))));
    }
    employee.trainingHistory = Array.isArray(employee.trainingHistory) ? employee.trainingHistory : [];
  }
  return game;
}

export function businessStage(game) {
  ensureV165(game);
  if (!game.business.opened) return null;
  return BUSINESS_STAGES_V165.find(item=>item.id===game.business.stage) || BUSINESS_STAGES_V165[0];
}

export function nextBusinessStage(game) {
  const current = businessStage(game);
  if (!current) return BUSINESS_STAGES_V165[0];
  return BUSINESS_STAGES_V165.find(item=>item.id===current.id+1) || null;
}

export function companyCapacity(game) {
  const stage = businessStage(game);
  return {
    employees:stage?.maxEmployees || 0,
    contracts:stage?.maxContracts || 0,
    orderBonus:stage?.orderBonus || 0
  };
}

export function businessStageRequirement(game) {
  ensureV165(game);
  if (!game.business.opened) return {ok:false,reason:'Сначала откройте компанию',next:null};
  const next = nextBusinessStage(game);
  if (!next) return {ok:false,reason:'Достигнут максимальный этап',next:null};
  if (game.player.level < next.reqLevel) return {ok:false,reason:`Нужен уровень ${next.reqLevel}`,next};
  if (game.business.companyReputation < next.reqCompanyRep) return {ok:false,reason:`Нужна репутация компании ${next.reqCompanyRep}`,next};
  const cost = Math.max(1,Math.round(Number(next.upgradeCost||0)*getInflation(game)));
  if (game.player.cash < cost) return {ok:false,reason:`Нужно ${cost.toLocaleString('ru-RU')} ₽`,next,cost};
  return {ok:true,reason:'',next,cost};
}

export function upgradeBusinessStage(game) {
  const check = businessStageRequirement(game);
  if (!check.ok) return {ok:false,message:check.reason};
  const next = check.next;
  const cost = Number(check.cost || Math.round(Number(next.upgradeCost||0)*getInflation(game)));
  addMoney(game,-cost,`Расширение компании: ${next.name}`);
  game.business.stage = next.id;
  game.business.stageUpgrades.unshift({stage:next.id,name:next.name,cost,at:{...game.calendar}});
  game.business.companyReputation += 4;
  recordLedger(game,{kind:'gain',category:'business',label:`Новый этап компании: ${next.name}`,details:`Штат до ${next.maxEmployees} · контракты до ${next.maxContracts}`});
  addLog(game,`Компания перешла на этап «${next.name}».`,'success');
  return {ok:true,message:`Открыт этап: ${next.name}`};
}

export function processBusinessOfficeMonth(game) {
  ensureV165(game);
  const stage = businessStage(game);
  if (!stage) return null;
  const cost = Math.round(Number(stage.monthlyCost || 0) * getInflation(game));
  if (cost > 0) {
    addMoney(game,-cost,`Офис и содержание: ${stage.name}`);
    game.business.officeExpenses += cost;
  }
  game.business.reputationHistory.unshift({
    year:game.calendar.year,month:game.calendar.month,
    reputation:Math.round(game.business.companyReputation||0),
    quality:Math.round(game.business.qualityScore||0),
    stage:stage.id
  });
  game.business.reputationHistory = game.business.reputationHistory.slice(0,36);
  return {cost,stage};
}

export function employeeTrainingProgramById(id) {
  return EMPLOYEE_TRAINING_PROGRAMS_V165.find(item=>item.id===id) || EMPLOYEE_TRAINING_PROGRAMS_V165[0];
}

export function employeeTrainingPrice(employee, program, game = null) {
  const multiplier = game ? getInflation(game) : 0.45;
  return Math.max(500,Math.round(Number(employee?.salary||10000)*Number(program?.costMult||.5)*multiplier));
}

export function trainEmployeeProgram(game, employeeId, programId) {
  ensureV165(game);
  if (!game.business.opened) return {ok:false,message:'Сначала откройте компанию'};
  const employee = game.business.employees.find(item=>item.id===employeeId);
  if (!employee) return {ok:false,message:'Сотрудник не найден'};
  const program = employeeTrainingProgramById(programId);
  const cost = employeeTrainingPrice(employee,program,game);
  if (game.player.cash < cost) return {ok:false,message:`На обучение нужно ${cost.toLocaleString('ru-RU')} ₽`};
  addMoney(game,-cost,`Обучение сотрудника: ${employee.name} · ${program.name}`);
  employee.level = Math.min(10,Number(employee.level||1)+program.levelGain);
  employee.morale = clamp(Number(employee.morale||75)+program.morale,0,100);
  employee.training = Number(employee.training||0)+1;
  const targets = program.managementOnly ? ['management','communication'] : (templateSkillMap[employee.templateId] || ['hardware']);
  employee.skills ||= {};
  for (const skillId of targets) employee.skills[skillId]=Math.min(100,Number(employee.skills[skillId]||1)+program.skillGain);
  const entry={id:`training_${Date.now()}`,programId:program.id,name:program.name,cost,days:program.days,skills:targets,at:{...game.calendar}};
  employee.trainingHistory.unshift(entry);
  employee.trainingHistory=employee.trainingHistory.slice(0,20);
  game.business.employeeTrainingHistory.unshift({...entry,employeeId:employee.id,employeeName:employee.name});
  game.business.employeeTrainingHistory=game.business.employeeTrainingHistory.slice(0,80);
  game.stats.employeeTrainings=Number(game.stats.employeeTrainings||0)+1;
  recordLedger(game,{kind:'gain',category:'employee',label:`Обучение: ${employee.name}`,details:`${program.name} · ${targets.join(', ')} +${program.skillGain}`});
  return {ok:true,message:`${employee.name}: ${program.name} завершён`,days:program.days};
}

export function employeeSkillSummary(employee) {
  return Object.entries(employee?.skills||{}).sort((a,b)=>b[1]-a[1]).map(([id,value])=>({id,value:Math.round(value)}));
}

export function clientTypeInfo(order) {
  const tier = order?.client?.tierId || order?.clientTier || 'home';
  return CLIENT_TYPE_LABELS_V165[tier] || {name:order?.client?.tierName||'Клиент',icon:'CL',priority:'качество и сроки'};
}

export function orderInfluenceBreakdown(game, order) {
  const required = Object.entries(order?.skills||{});
  const skillRows = required.map(([id,need])=>({
    id,need,current:skillLevel(game,id),delta:skillLevel(game,id)-Number(need||0)
  }));
  const toolLevels = ['ws_screwdrivers','ws_pro_screwdrivers','ws_soldering','ws_multimeter','ws_oscilloscope','ws_crimper','ws_tweezers','ws_antistatic_mat']
    .reduce((sum,id)=>sum+Number(game.workspace?.items?.[id]||0),0);
  const toolEffect = Math.min(18,toolLevels*1.5);
  const skillEffect = Math.max(-25,Math.min(30,skillRows.reduce((sum,row)=>sum+row.delta*3,0)));
  const diagnosisEffect = Math.round(Number(order?.diagnosis?.quality||0)*10);
  return {skillRows,toolLevels,toolEffect,skillEffect,diagnosisEffect};
}
