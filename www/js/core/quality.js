import { uid } from './utils.js';

const QUALITY_VERSION = 1;
const LEDGER_LIMIT = 500;
const REPORT_LIMIT = 36;

const SKILL_NAMES_RU = {
  hardware:'Железо', software:'Софт', networking:'Сети', repair:'Ремонт',
  security:'Безопасность', data:'Данные', communication:'Общение', management:'Управление'
};
const PROFESSIONAL_NAMES_RU = {
  hardware:'Специалист по железу', software:'Разработчик', networking:'Сетевой специалист', repair:'Мастер по ремонту',
  security:'Специалист по безопасности', data:'Специалист по данным', communication:'Консультант', management:'Руководитель'
};

const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min, max) => Math.max(min, Math.min(max, finite(value, min)));
const calendarStamp = (game) => ({
  year: finite(game?.calendar?.year, 2000),
  month: finite(game?.calendar?.month, 1),
  day: finite(game?.calendar?.day, 1),
  hour: finite(game?.calendar?.hour, 0)
});

function simpleChecksum(game) {
  const source = JSON.stringify({
    id:game?.id, version:game?.version, updatedAt:game?.updatedAt,
    calendar:game?.calendar, player:game?.player,
    stats:game?.stats, business:game?.business?.opened,
    orders:[game?.orders?.available?.length,game?.orders?.active?.length,game?.orders?.history?.length]
  });
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8,'0');
}

export function ensureQualityState(game) {
  game.quality ||= {};
  game.quality.version = QUALITY_VERSION;
  game.quality.ledger = Array.isArray(game.quality.ledger) ? game.quality.ledger : [];
  game.quality.tips ||= { dismissed:{} };
  game.quality.tips.dismissed ||= {};
  game.quality.lastActionSummary ||= null;
  game.quality.saveHealth ||= { status:'ok', lastCheckedAt:null, checksum:'', issues:[], repairs:[] };
  game.quality.saveHealth.issues = Array.isArray(game.quality.saveHealth.issues) ? game.quality.saveHealth.issues : [];
  game.quality.saveHealth.repairs = Array.isArray(game.quality.saveHealth.repairs) ? game.quality.saveHealth.repairs : [];

  game.finance ||= { current:{income:0,expenses:0,details:[]}, history:[], lifetimeProfit:0 };
  game.finance.current ||= { income:0, expenses:0, details:[] };
  game.finance.current.income = finite(game.finance.current.income);
  game.finance.current.expenses = finite(game.finance.current.expenses);
  game.finance.current.details = Array.isArray(game.finance.current.details) ? game.finance.current.details : [];
  game.finance.history = Array.isArray(game.finance.history) ? game.finance.history : [];
  game.finance.lifetimeProfit = finite(game.finance.lifetimeProfit);

  game.marketing ||= {};
  game.marketing.reports = Array.isArray(game.marketing.reports) ? game.marketing.reports : [];
  return game.quality;
}

export function recordLedger(game, entry = {}) {
  ensureQualityState(game);
  const item = {
    id: uid('ledger'),
    at: calendarStamp(game),
    createdAt: new Date().toISOString(),
    kind: String(entry.kind || 'info'),
    category: String(entry.category || 'system'),
    label: String(entry.label || 'Изменение'),
    amount: finite(entry.amount),
    unit: String(entry.unit || ''),
    details: String(entry.details || ''),
    source: String(entry.source || '')
  };
  game.quality.ledger.unshift(item);
  game.quality.ledger = game.quality.ledger.slice(0, LEDGER_LIMIT);
  return item;
}

export function financeCategory(source = '', amount = 0) {
  const text = String(source || '').toLowerCase();
  if (text.includes('зарплата') && text.includes('сотруд')) return 'payroll';
  if (text.includes('зарплата')) return 'salary';
  if (text.includes('контракт')) return 'contracts';
  if (text.includes('заказ')) return 'orders';
  if (text.includes('реклам')) return 'advertising';
  if (text.includes('обуч') || text.includes('курс') || text.includes('техникум') || text.includes('университет') || text.includes('вуз')) return 'education';
  if (text.includes('аренд') || text.includes('офис') || text.includes('помещен') || text.includes('жиль')) return 'office';
  if (text.includes('кредит') || text.includes('вклад') || text.includes('банк')) return 'bank';
  if (text.includes('покупка') || text.includes('инструмент') || text.includes('рабоч') || text.includes('улучшен')) return 'equipment';
  if (text.includes('ежемесячн') || text.includes('расход')) return 'living';
  if (amount > 0) return 'other_income';
  return 'other_expense';
}

export function recordFinanceEntry(game, amount, source = 'Операция') {
  ensureQualityState(game);
  const value = finite(amount);
  if (!value) return null;
  const detail = {
    id:uid('finance'),
    at:calendarStamp(game),
    amount:value,
    source:String(source || 'Операция'),
    category:financeCategory(source,value)
  };
  game.finance.current.details.unshift(detail);
  game.finance.current.details = game.finance.current.details.slice(0, 300);
  recordLedger(game,{
    kind:value >= 0 ? 'gain' : 'loss',
    category:'money',
    label:String(source || 'Операция'),
    amount:value,
    unit:'₽'
  });
  return detail;
}

export function recordXpEntry(game, amount, source = 'other', label = '') {
  const value = Math.max(0, Math.round(finite(amount)));
  if (!value) return;
  recordLedger(game,{
    kind:'gain',
    category:'xp',
    label:label || (source === 'work' ? 'Опыт за работу' : source === 'study' ? 'Опыт за учёбу' : 'Опыт персонажа'),
    amount:value,
    unit:'XP',
    source
  });
}

export function recordSkillEntry(game, skillId, amount, levelBefore, levelAfter) {
  const value = Math.max(0, Math.round(finite(amount)));
  if (!value) return;
  recordLedger(game,{
    kind:'gain',
    category:'skill',
    label:`Навык: ${SKILL_NAMES_RU[skillId] || skillId}`,
    amount:value,
    unit:'XP',
    details:levelAfter > levelBefore ? `Уровень ${levelBefore} → ${levelAfter}` : ''
  });
}

export function actionSnapshot(game) {
  if (!game) return null;
  const professionXp = Object.fromEntries(Object.entries(game.career?.branches || {}).map(([id,state])=>[id,finite(state?.xp)]));
  const skills = Object.fromEntries(Object.entries(game.skills || {}).map(([id,state])=>[id,{level:finite(state?.level),xp:finite(state?.xp)}]));
  return {
    cash:finite(game.player?.cash),
    reputation:finite(game.player?.reputation),
    companyReputation:finite(game.business?.companyReputation),
    energy:finite(game.player?.energy),
    mood:finite(game.player?.mood),
    health:finite(game.player?.health),
    fun:finite(game.player?.fun),
    level:finite(game.player?.level),
    professionXp,
    skills
  };
}

export function recordActionDelta(game, before, label = 'Действие') {
  if (!game || !before) return null;
  ensureQualityState(game);
  const after = actionSnapshot(game);
  const changes = [];
  const scalar = [
    ['reputation','Репутация',''],
    ['companyReputation','Репутация компании',''],
    ['energy','Энергия',''],
    ['mood','Настроение',''],
    ['health','Здоровье',''],
    ['fun','Отдых','']
  ];
  for (const [key,name,unit] of scalar) {
    const delta = Math.round((after[key]-before[key])*100)/100;
    if (delta) changes.push({name,delta,unit});
  }
  for (const id of new Set([...Object.keys(before.professionXp||{}),...Object.keys(after.professionXp||{})])) {
    const delta = Math.round(finite(after.professionXp[id])-finite(before.professionXp[id]));
    if (delta) changes.push({name:`Профессиональный опыт: ${PROFESSIONAL_NAMES_RU[id] || SKILL_NAMES_RU[id] || id}`,delta,unit:'XP'});
  }
  if (after.level !== before.level) changes.push({name:'Уровень персонажа',delta:after.level-before.level,unit:''});
  if (!changes.length) return null;
  const summary = {
    id:uid('summary'),
    at:calendarStamp(game),
    label:String(label || 'Действие'),
    changes
  };
  game.quality.lastActionSummary = summary;
  recordLedger(game,{
    kind:changes.some(item=>item.delta<0)?'mixed':'gain',
    category:'outcome',
    label:summary.label,
    details:changes.map(item=>`${item.name} ${item.delta>=0?'+':''}${item.delta}${item.unit?` ${item.unit}`:''}`).join(' · ')
  });
  return summary;
}

function previousPeriod(calendar) {
  let year = finite(calendar?.year,2000);
  let month = finite(calendar?.month,1)-1;
  if (month < 1) { month = 12; year -= 1; }
  return {year,month};
}

export function closeMonthlyFinancialReport(game) {
  ensureQualityState(game);
  const current = game.finance.current;
  const details = Array.isArray(current.details) ? current.details : [];
  const period = previousPeriod(game.calendar);
  const income = Math.round(finite(current.income));
  const expenses = Math.round(finite(current.expenses));
  const groups = {};
  for (const item of details) {
    const key = item.category || financeCategory(item.source,item.amount);
    groups[key] ||= { income:0, expenses:0, entries:0 };
    if (item.amount >= 0) groups[key].income += Math.round(item.amount);
    else groups[key].expenses += Math.round(Math.abs(item.amount));
    groups[key].entries += 1;
  }
  const report = {
    id:uid('month-report'),
    year:period.year,
    month:period.month,
    income,
    expenses,
    profit:income-expenses,
    openingCash:Math.round(finite(game.player?.cash)-income+expenses),
    closingCash:Math.round(finite(game.player?.cash)),
    groups,
    details:details.slice(0,100),
    companyReputation:Math.round(finite(game.business?.companyReputation)),
    personalReputation:Math.round(finite(game.player?.reputation)),
    createdAt:new Date().toISOString()
  };
  game.finance.history.unshift(report);
  game.finance.history = game.finance.history.slice(0, REPORT_LIMIT);
  game.finance.lifetimeProfit += report.profit;
  game.finance.current = { income:0, expenses:0, details:[] };
  recordLedger(game,{
    kind:report.profit>=0?'gain':'loss',
    category:'monthly_report',
    label:`Финансовый итог ${String(period.month).padStart(2,'0')}.${period.year}`,
    amount:report.profit,
    unit:'₽',
    details:`Доход ${income.toLocaleString('ru-RU')} ₽ · расходы ${expenses.toLocaleString('ru-RU')} ₽`
  });
  return report;
}

export function latestFinancialReport(game) {
  ensureQualityState(game);
  return game.finance.history[0] || null;
}

export function validateGameState(game, repair = false) {
  const issues = [];
  const repairs = [];
  if (!game || typeof game !== 'object') return {ok:false,issues:['Профиль не является объектом'],repairs:[]};

  ensureQualityState(game);
  const fix = (condition, issue, fn) => {
    if (!condition) return;
    issues.push(issue);
    if (repair && typeof fn === 'function') { fn(); repairs.push(issue); }
  };

  fix(!game.profile || typeof game.profile !== 'object','Отсутствует профиль героя',()=>{game.profile={name:'Новичок',specialization:'hardware',avatar:'classic'};});
  fix(!game.calendar || typeof game.calendar !== 'object','Отсутствует календарь',()=>{game.calendar={year:2000,month:1,day:1,hour:0,totalDays:0,totalHours:0};});
  fix(!game.player || typeof game.player !== 'object','Отсутствует блок персонажа',()=>{game.player={cash:3000,reputation:0,energy:80,mood:70,health:100,fun:70,level:1,xp:0};});
  fix(!game.skills || typeof game.skills !== 'object','Отсутствуют навыки',()=>{game.skills={};});
  fix(!game.orders || typeof game.orders !== 'object','Отсутствует блок заказов',()=>{game.orders={available:[],active:[],history:[]};});
  fix(!Array.isArray(game.orders?.available),'Повреждён список доступных заказов',()=>{game.orders.available=[];});
  fix(!Array.isArray(game.orders?.active),'Повреждён список активных заказов',()=>{game.orders.active=[];});
  fix(!Array.isArray(game.orders?.history),'Повреждена история заказов',()=>{game.orders.history=[];});
  fix(!game.orders?.refreshMeta||typeof game.orders.refreshMeta!=='object','Отсутствует состояние обновления заявок',()=>{game.orders.refreshMeta={count:0,lastRefreshTotalHours:-9999,discarded:0};});
  fix(!Array.isArray(game.log),'Повреждён игровой журнал',()=>{game.log=[];});
  fix(!game.business || typeof game.business !== 'object','Отсутствует блок компании',()=>{game.business={opened:false,employees:[],contracts:[],companyReputation:0};});
  fix(!Array.isArray(game.business?.employees),'Повреждён список сотрудников',()=>{game.business.employees=[];});
  fix(!Array.isArray(game.business?.contracts),'Повреждён список контрактов',()=>{game.business.contracts=[];});

  if (game.player) {
    for (const key of ['cash','reputation','energy','mood','health','fun','level','xp']) {
      fix(!Number.isFinite(Number(game.player[key])),`Некорректное значение player.${key}`,()=>{game.player[key]=key==='level'?1:0;});
    }
    if (repair) {
      game.player.energy=clamp(game.player.energy,0,250);
      game.player.mood=clamp(game.player.mood,0,100);
      game.player.health=clamp(game.player.health,0,100);
      game.player.fun=clamp(game.player.fun,0,100);
      game.player.level=Math.max(1,Math.floor(finite(game.player.level,1)));
    }
  }
  if (game.calendar && repair) {
    game.calendar.year=clamp(game.calendar.year,2000,2010);
    game.calendar.month=clamp(game.calendar.month,1,12);
    game.calendar.day=clamp(game.calendar.day,1,30);
    game.calendar.hour=clamp(game.calendar.hour,0,23);
  }

  const seen = new Set();
  if (Array.isArray(game.orders?.active)) {
    const duplicates = game.orders.active.filter(order=>{
      if (!order?.uid || seen.has(order.uid)) return true;
      seen.add(order.uid); return false;
    });
    fix(duplicates.length>0,`Найдены дубли активных заказов: ${duplicates.length}`,()=>{
      const ids=new Set();
      game.orders.active=game.orders.active.filter(order=>order?.uid&&!ids.has(order.uid)&&ids.add(order.uid));
    });
  }

  const status = issues.length ? (repair ? 'repaired' : 'warning') : 'ok';
  game.quality.saveHealth = {
    status,
    lastCheckedAt:new Date().toISOString(),
    checksum:simpleChecksum(game),
    issues:issues.slice(0,30),
    repairs:repairs.slice(0,30)
  };
  game.stability ||= {};
  game.stability.lastHealthyAt = issues.length && !repair ? game.stability.lastHealthyAt : new Date().toISOString();
  game.stability.warnings = issues.slice(0,30);
  return {ok:issues.length===0 || repair,status,issues,repairs,checksum:game.quality.saveHealth.checksum};
}

export function contextualTip(game) {
  ensureQualityState(game);
  const dismissed = game.quality.tips.dismissed || {};
  const candidates = [
    {id:'first-order',when:(game.stats?.ordersDone||0)===0,target:'orders',title:'Начните с простого заказа',text:'Примите заявку, проведите диагностику, выберите способ ремонта и обязательно протестируйте результат.'},
    {id:'first-study',when:Object.keys(game.education?.completed||{}).length===0,target:'education',title:'Учёба даёт постоянный рост',text:'Быстрый материал занимает один день, а техникум и ВУЗ дают крупный постоянный бонус.'},
    {id:'salary',when:!game.career?.jobId,target:'jobs',title:'Устройтесь на постоянную работу',text:'Ежемесячная зарплата стабилизирует экономику между частными заказами.'},
    {id:'workspace',when:Object.keys(game.workspace?.items||{}).length<2,target:'workshop',title:'Инструменты меняют вероятность успеха',text:'Сравнивайте улучшения перед покупкой: скорость, доход, успех и обучение складываются.'},
    {id:'business-ready',when:!game.business?.opened && (game.player?.level||1)>=7,target:'business',title:'Пора готовиться к своей фирме',text:'Накопите деньги, репутацию и профильные навыки. После открытия компания развивается по этапам.'},
    {id:'company-stage',when:Boolean(game.business?.opened),target:'business',title:'Развивайте офис поэтапно',text:'Новые этапы увеличивают штат, число контрактов и расходы на содержание.'},
    {id:'finance',when:(game.finance?.history||[]).length>0,target:'finance',title:'Проверяйте месячный отчёт',text:'Доходы и расходы разбиты по категориям — так проще найти убыточные решения.'}
  ];
  return candidates.find(item=>item.when&&!dismissed[item.id]) || null;
}

export function dismissContextualTip(game, id) {
  ensureQualityState(game);
  game.quality.tips.dismissed[String(id||'')] = true;
}

export function ledgerEntries(game, category = 'all') {
  ensureQualityState(game);
  return game.quality.ledger.filter(item=>category==='all'||item.category===category);
}
