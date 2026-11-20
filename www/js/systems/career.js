import { CAREER_BRANCHES_V162, CAREER_JOBS_V162, careerBranchById, careerJobByBranchTier } from '../data/v162.js';
import { addLog, jobRequirements } from './progression.js';

const SKILL_IDS=new Set(CAREER_BRANCHES_V162.map((item)=>item.id));

function inferLegacyBranch(jobId='',job=null){
  if(job?.branchId&&SKILL_IDS.has(job.branchId))return job.branchId;
  const text=`${jobId} ${job?.name||''}`.toLowerCase();
  if(/security|безопас|ciso/.test(text))return'security';
  if(/network|sysadmin|сетев|telecom|isp/.test(text))return'networking';
  if(/repair|service|мастер|ремонт/.test(text))return'repair';
  if(/data|database|dba|баз/.test(text))return'data';
  if(/developer|program|software|програм|architect/.test(text))return'software';
  if(/manager|director|head|управ|cto/.test(text))return'management';
  if(/support|sales|client|клиент|продаж|teacher/.test(text))return'communication';
  return'hardware';
}

function estimateLegacyTier(job){
  if(Number(job?.careerTier))return Math.max(1,Math.min(5,Number(job.careerTier)));
  const level=Number(job?.reqLevel||1);
  if(level>=14)return 5;
  if(level>=10)return 4;
  if(level>=6)return 3;
  if(level>=3)return 2;
  return 1;
}

export function ensureCareerV162(game){
  game.career||={jobId:null,startedYear:game.calendar?.year||2000,totalSalary:0};
  game.career.branches||={};
  for(const branch of CAREER_BRANCHES_V162){
    const state=game.career.branches[branch.id]||{};
    state.tier=Math.max(0,Math.min(5,Number(state.tier||0)));
    state.xp=Math.max(0,Number(state.xp||0));
    state.jobId=state.tier?careerJobByBranchTier(branch.id,state.tier)?.id||null:null;
    state.monthsWorked=Math.max(0,Number(state.monthsWorked||0));
    state.bestTier=Math.max(state.tier,Number(state.bestTier||0));
    state.promotionNotifiedTier=Math.max(0,Number(state.promotionNotifiedTier||0));
    game.career.branches[branch.id]=state;
  }

  if(!game.career.v162Migrated){
    const legacyId=String(game.career.jobId||'');
    const known=CAREER_JOBS_V162.find((item)=>item.id===legacyId);
    if(known){
      const state=game.career.branches[known.branchId];
      state.tier=Math.max(state.tier,known.careerTier);
      state.bestTier=Math.max(state.bestTier,state.tier);
      state.jobId=known.id;
      game.career.currentBranchId=known.branchId;
    }else if(legacyId&&!game.business?.opened){
      const branchId=inferLegacyBranch(legacyId,null);
      const state=game.career.branches[branchId];
      state.tier=Math.max(1,state.tier||1);
      state.bestTier=Math.max(state.bestTier,state.tier);
      state.jobId=careerJobByBranchTier(branchId,state.tier)?.id||null;
      game.career.jobId=state.jobId;
      game.career.currentBranchId=branchId;
    }
    game.career.v162Migrated=true;
  }

  if(!game.business?.opened){
    let branchId=game.career.currentBranchId;
    if(!SKILL_IDS.has(branchId))branchId=SKILL_IDS.has(game.profile?.specialization)?game.profile.specialization:'hardware';
    const state=game.career.branches[branchId];
    if(!state.tier){state.tier=1;state.bestTier=1;state.jobId=careerJobByBranchTier(branchId,1)?.id||null;}
    const current=CAREER_JOBS_V162.find((item)=>item.id===game.career.jobId);
    if(!current){game.career.jobId=state.jobId;}
    game.career.currentBranchId=branchId;
  }
  return game.career;
}

export function careerBranchState(game,branchId){
  ensureCareerV162(game);
  return game.career.branches[branchId]||null;
}

export function careerCurrentBranch(game){
  ensureCareerV162(game);
  return careerBranchById(game.career.currentBranchId)||null;
}

export function professionXpRequiredForPromotion(tier){
  const next=careerJobByBranchTier('hardware',Math.min(5,Number(tier||1)+1));
  return Number(next?.professionXpRequired||Infinity);
}

export function promotionStatus(game){
  ensureCareerV162(game);
  if(game.business?.opened)return{available:false,reason:'Вы управляете собственной компанией'};
  const branch=careerCurrentBranch(game);
  const state=branch?careerBranchState(game,branch.id):null;
  if(!branch||!state)return{available:false,reason:'Карьерная ветка не выбрана'};
  if(state.tier>=5)return{available:false,reason:'Достигнута высшая должность',branch,state};
  const next=careerJobByBranchTier(branch.id,state.tier+1);
  const required=Number(next.professionXpRequired||0);
  if(state.xp<required)return{available:false,reason:`Нужно ${required-state.xp} проф. XP`,branch,state,next,required};
  const req=jobRequirements(game,next);
  if(!req.ok)return{available:false,reason:req.reason,branch,state,next,required};
  return{available:true,reason:'Доступно повышение',branch,state,next,required};
}

export function addProfessionXp(game,amount,label='Постоянная работа'){
  ensureCareerV162(game);
  if(game.business?.opened||!game.career.jobId)return 0;
  const branch=careerCurrentBranch(game);
  const state=branch?careerBranchState(game,branch.id):null;
  if(!state)return 0;
  const gained=Math.max(0,Math.round(Number(amount)||0));
  state.xp+=gained;
  state.monthsWorked+=1;
  const status=promotionStatus(game);
  if(status.available&&state.promotionNotifiedTier<status.next.careerTier){
    state.promotionNotifiedTier=status.next.careerTier;
    game.career.pendingPromotion={branchId:branch.id,toTier:status.next.careerTier,jobId:status.next.id};
    addLog(game,`Карьерное предложение: ${status.next.name}. Откройте раздел «Работа», чтобы принять повышение.`,'success');
  }
  addLog(game,`${label}: +${gained} профессионального XP (${branch.name}).`,'info');
  return gained;
}

export function acceptPromotion(game){
  const status=promotionStatus(game);
  if(!status.available)return{ok:false,message:status.reason};
  const {branch,state,next}=status;
  state.tier=next.careerTier;
  state.bestTier=Math.max(state.bestTier,state.tier);
  state.jobId=next.id;
  state.promotionNotifiedTier=state.tier;
  game.career.jobId=next.id;
  game.career.startedYear=game.calendar.year;
  game.career.pendingPromotion=null;
  addLog(game,`Повышение: ${next.name}. Зарплата теперь ${next.salary.toLocaleString('ru-RU')} ₽ в месяц до надбавок.`,'success');
  return{ok:true,message:`Новая должность: ${next.name}`};
}

export function switchCareerBranch(game,branchId){
  ensureCareerV162(game);
  if(game.business?.opened)return{ok:false,message:'Работа по найму недоступна, пока открыта компания'};
  const branch=careerBranchById(branchId);
  if(!branch)return{ok:false,message:'Карьерная ветка не найдена'};
  const state=careerBranchState(game,branchId);
  const firstVisit=!state.tier;
  if(firstVisit){state.tier=1;state.bestTier=1;state.xp=0;state.jobId=careerJobByBranchTier(branchId,1)?.id||null;}
  game.career.currentBranchId=branchId;
  game.career.jobId=state.jobId||careerJobByBranchTier(branchId,state.tier||1)?.id||null;
  game.career.startedYear=game.calendar.year;
  game.career.pendingPromotion=null;
  addLog(game,firstVisit?`Новая специальность: ${branch.name}. Карьера начинается с первой должности.`:`Возвращение в специальность «${branch.name}» на сохранённую должность.`,'success');
  return{ok:true,message:firstVisit?`Начата ветка: ${branch.name}`:`Восстановлена должность: ${careerJobByBranchTier(branchId,state.tier)?.name}`};
}

export function applyForJob(game,jobId){
  const job=CAREER_JOBS_V162.find((item)=>item.id===jobId);
  if(!job)return{ok:false,message:'Вакансия не найдена'};
  const switched=switchCareerBranch(game,job.branchId);
  if(!switched.ok)return switched;
  const state=careerBranchState(game,job.branchId);
  if(job.careerTier>state.tier)return{ok:false,message:'Сначала получите повышение внутри этой специальности'};
  state.tier=Math.max(state.tier,job.careerTier);
  state.jobId=careerJobByBranchTier(job.branchId,state.tier)?.id||job.id;
  game.career.jobId=state.jobId;
  return{ok:true,message:careerJobByBranchTier(job.branchId,state.tier)?.name||job.name};
}
