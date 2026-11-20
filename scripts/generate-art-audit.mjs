import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_COMPONENTS } from '../www/js/data/components.js';
import { ACHIEVEMENTS } from '../www/js/data/progression.js';
import { ALL_LOCATIONS, ALL_VEHICLES, ENTERTAINMENT, UPGRADES, EVENTS, BANK, WIFE_TASKS } from '../www/js/data/economy.js';
import { EDUCATION_POOL } from '../www/js/systems/education.js';
import { ACTIVITY_PLANS, CITY_POINTS_V08, CONTRACT_TEMPLATES_V08, DECISION_EVENTS_V08, EMPLOYEE_TEMPLATES_V08, CHALLENGES_V08 } from '../www/js/data/v08.js';
import { AUTOMATION_RULES_V13, CHAPTER_REWARDS_V13, DEPARTMENTS_V13, EMPLOYEE_TRAITS_V13, LEGACY_REWARDS_V13, ORDER_TEST_PROTOCOLS_V13, REPAIR_APPROACHES_V13 } from '../www/js/data/v13.js';
import { BUSINESS_TYPES_V161, COMPANY_CONTRACT_TEMPLATES_V161, COMPANY_EMPLOYEE_TEMPLATES_V161 } from '../www/js/data/v161.js';
import { CAREER_JOBS_V162 } from '../www/js/data/v162.js';
import { BUSINESS_STAGES_V165, EMPLOYEE_TRAINING_PROGRAMS_V165 } from '../www/js/data/v165.js';
import { ORDER_TASK_TYPES_V166 } from '../www/js/data/v166.js';
import { WORKSPACE_ITEMS, workspaceAsset } from '../www/js/data/workspace.js';
import { HERO_AVATARS } from '../www/js/data/avatars.js';
import { STARTER_BACKGROUNDS_V163 } from '../www/js/data/backgrounds-v165.js';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(__dirname,'..');
const out=(name)=>path.join(root,name);
const categoryNames={cpu:'Процессоры',gpu:'Видеокарты',ram:'Оперативная память',storage:'Накопители',mb:'Материнские платы',psu:'Блоки питания',case:'Корпуса',cool:'Охлаждение',periph:'Периферия',cons:'Расходники и ПО',tool:'Инструменты'};
const focusNames={hardware:'Железо',software:'Софт',networking:'Сети',repair:'Ремонт',security:'Безопасность',data:'Данные',communication:'Общение',management:'Управление'};
const typeNames={book:'Книги',course:'Курсы',lecture:'Лекции',forum:'Форумы',college:'Техникумы и ПТУ',university:'ВУЗы',youtube:'Видео',advertising:'Реклама'};

const componentLines=[
  'ХРОНИКИ АЙТИШНИКА 0.16.11 — ПОЛНЫЙ СПИСОК КОМПЛЕКТУЮЩИХ',
  '',
  `Всего позиций: ${ALL_COMPONENTS.length}.`,
  'Формат: ID — название — год появления — уровень.',
  ''
];
for(const cat of Object.keys(categoryNames)){
  const rows=ALL_COMPONENTS.filter(item=>item.cat===cat);
  componentLines.push(`## ${categoryNames[cat]} (${rows.length})`);
  for(const item of rows) componentLines.push(`- ${item.id} — ${item.name} — с ${item.fromYear || 2000} г. — ур. ${item.tier || 1}`);
  componentLines.push('');
}
fs.writeFileSync(out('docs/archive/audits/COMPONENTS_LIST_0.16.11.txt'),componentLines.join('\n'),'utf8');

const componentArtIds=new Set([
  'tool_wrist','therm','therm_paste','air','alco','ide_c','paste_brush','win98_cd','win2k_cd','winxp_cd','winxp_pro_cd','av_drweb','av_kasper','screen_cloth',
  'tool_screw_basic','tool_screw_set','tool_tweezer','tool_anti_mat','tool_multimeter','tool_solder_iron','tool_osc_analog','tool_crimper'
]);
const componentsMissing=ALL_COMPONENTS.filter(item=>!componentArtIds.has(item.id));
const componentsCovered=ALL_COMPONENTS.filter(item=>componentArtIds.has(item.id));

const checkAsset=(asset)=>{
  if(!asset||typeof asset!=='string'||!asset.startsWith('./'))return null;
  const rel=asset.split('?')[0].replace(/^\.\//,'');
  return fs.existsSync(path.join(root,'www',rel));
};
const brokenAssets=[];
for(const [group,items] of [['Помещения',ALL_LOCATIONS],['Транспорт',ALL_VEHICLES],['Отдых',ENTERTAINMENT]]){
  for(const item of items){ if(item.asset&&checkAsset(item.asset)===false)brokenAssets.push(`${group}: ${item.id} — ${item.name} — ${item.asset}`); }
}
for(const avatar of HERO_AVATARS){
  for(const [era,asset] of Object.entries(avatar.files||{})){ if(checkAsset(asset)===false)brokenAssets.push(`Аватар: ${avatar.id}/${era} — ${avatar.name} — ${asset}`); }
}
for(const item of WORKSPACE_ITEMS){
  for(let level=1;level<=Number(item.assetCount||5);level+=1){const asset=workspaceAsset(item.id,level);if(checkAsset(asset)===false)brokenAssets.push(`Мастерская: ${item.id}/${level} — ${item.name} — ${asset}`);}
}
for(const type of ORDER_TASK_TYPES_V166){
  const asset=`./assets/orders/types/${type.icon}`;
  if(checkAsset(asset)===false)brokenAssets.push(`Тип заказа: ${type.id} — ${type.name} — ${asset}`);
}

const audit=[];
audit.push('ХРОНИКИ АЙТИШНИКА 0.16.11 — АУДИТ ОТСУТСТВУЮЩИХ ИЗОБРАЖЕНИЙ','');
audit.push('Критерий аудита: в список попали сущности, которые видны игроку карточкой/строкой и сейчас используют эмодзи, текстовую заглушку или общее изображение категории вместо собственной иллюстрации.');
audit.push('Это не означает, что интерфейс сломан: для большинства позиций работает запасная иконка. Список предназначен для создания индивидуальных изображений.','');
audit.push(`Фактически битых ссылок на уже назначенные изображения: ${brokenAssets.length}.`);
if(brokenAssets.length) for(const row of brokenAssets)audit.push(`- ${row}`);
else audit.push('- Битых ссылок не найдено.');
audit.push('');

audit.push(`## ПРИОРИТЕТ 1. Комплектующие без собственной картинки (${componentsMissing.length} из ${ALL_COMPONENTS.length})`);
for(const cat of Object.keys(categoryNames)){
  const rows=componentsMissing.filter(item=>item.cat===cat);
  audit.push(`### ${categoryNames[cat]} (${rows.length})`);
  for(const item of rows)audit.push(`- ${item.id} — ${item.name}`);
}
audit.push('');
audit.push(`Уже имеют индивидуальное изображение (${componentsCovered.length}):`);
for(const item of componentsCovered)audit.push(`- ${item.id} — ${item.name}`);
audit.push('');

audit.push(`## ПРИОРИТЕТ 2. Учебные материалы без индивидуальной обложки (${EDUCATION_POOL.length})`);
audit.push('Сейчас книги, лекции, курсы и форумы используют общую картинку направления; ВУЗы используют один из двух общих вариантов направления.');
const eduGroups=new Map();
for(const item of EDUCATION_POOL){
  const type=typeNames[item.type]||item.type||'Другое';
  const focus=focusNames[item.focusSkill||item.focus]||item.focusSkill||item.focus||'Без направления';
  const key=`${type} / ${focus}`;
  if(!eduGroups.has(key))eduGroups.set(key,[]);
  eduGroups.get(key).push(item);
}
for(const [group,items] of [...eduGroups.entries()].sort((a,b)=>a[0].localeCompare(b[0],'ru'))){
  audit.push(`### ${group} (${items.length})`);
  for(const item of items)audit.push(`- ${item.id} — ${item.name}`);
}
audit.push('');

const addSection=(title,items,name=(x)=>x.name||x.title||x.text||x.id)=>{
  const unique=[...new Map(items.map(item=>[item.id||`${name(item)}-${Math.random()}`,item])).values()];
  audit.push(`## ${title} (${unique.length})`);
  for(const item of unique)audit.push(`- ${item.id||'без-id'} — ${name(item)}`);
  audit.push('');
};
addSection('ПРИОРИТЕТ 3. Достижения: сейчас эмодзи/замок',ACHIEVEMENTS);
addSection('ПРИОРИТЕТ 3. Должности карьеры: общая иконка направления',CAREER_JOBS_V162);
addSection('ПРИОРИТЕТ 3. Шаблоны сотрудников: эмодзи', [...EMPLOYEE_TEMPLATES_V08,...COMPANY_EMPLOYEE_TEMPLATES_V161]);
addSection('ПРИОРИТЕТ 3. События с выбором: без сюжетной иллюстрации',DECISION_EVENTS_V08,(x)=>x.title);
addSection('ПРИОРИТЕТ 3. Городские точки: эмодзи',CITY_POINTS_V08);
addSection('ПРИОРИТЕТ 3. Отделы компании: эмодзи',DEPARTMENTS_V13);
addSection('ПРИОРИТЕТ 3. Этапы компании: эмодзи/общая картинка бизнеса',BUSINESS_STAGES_V165);
addSection('ПРИОРИТЕТ 3. Обучение сотрудников: эмодзи',EMPLOYEE_TRAINING_PROGRAMS_V165);
addSection('ПРИОРИТЕТ 3. Банковские продукты: эмодзи',[...BANK.depositRates,...BANK.loanRates]);
addSection('ПРИОРИТЕТ 3. Улучшения героя/бизнеса: эмодзи',UPGRADES);
addSection('ПРИОРИТЕТ 3. Планы активности: эмодзи',ACTIVITY_PLANS);
addSection('ПРИОРИТЕТ 3. Подходы к ремонту и тестирование: эмодзи',[...REPAIR_APPROACHES_V13,...ORDER_TEST_PROTOCOLS_V13]);
addSection('ПРИОРИТЕТ 3. Контракты: эмодзи',[...CONTRACT_TEMPLATES_V08,...COMPANY_CONTRACT_TEMPLATES_V161]);
addSection('ПРИОРИТЕТ 3. Автоматизация и награды наследия: эмодзи',[...AUTOMATION_RULES_V13,...LEGACY_REWARDS_V13,...CHAPTER_REWARDS_V13],(x)=>x.name||x.text||x.reward||x.id);
addSection('ПРИОРИТЕТ 3. Черты сотрудников: эмодзи',EMPLOYEE_TRAITS_V13);
addSection('ПРИОРИТЕТ 3. Семейные задания: эмодзи',WIFE_TASKS);
addSection('ПРИОРИТЕТ 3. Старые случайные события: эмодзи в названии',EVENTS);
addSection('ПРИОРИТЕТ 3. Испытания: без отдельной картинки',CHALLENGES_V08);
addSection('ПРИОРИТЕТ 3. Стартовые бэкграунды: используются иконки навыков, нет собственной сцены',STARTER_BACKGROUNDS_V163);

audit.push('## УЖЕ ПОКРЫТО ОТДЕЛЬНЫМИ ИЗОБРАЖЕНИЯМИ ИЛИ НАБОРАМИ');
audit.push(`- Аватары героя: ${HERO_AVATARS.length} профилей по эпохам.`);
audit.push(`- Навыки: 8 отдельных изображений.`);
audit.push(`- Помещения: ${ALL_LOCATIONS.length} изображений.`);
audit.push(`- Транспорт: ${ALL_VEHICLES.length} изображений.`);
audit.push(`- Отдых: ${ENTERTAINMENT.length} изображений.`);
audit.push(`- Мастерская: ${WORKSPACE_ITEMS.length} предметов с уровнями.`);
audit.push(`- Типы заказов: ${ORDER_TASK_TYPES_V166.length} изображений, которыми покрываются конкретные заказы.`);
audit.push(`- Типы бизнеса: ${BUSINESS_TYPES_V161.length} направлений с изображениями стадий.`);

audit.push('');
audit.push('Рекомендуемый порядок производства: 1) комплектующие, 2) обложки книг/материалов, 3) события, 4) достижения и карьера, 5) остальные управленческие карточки.');
fs.writeFileSync(out('docs/archive/audits/MISSING_IMAGE_AUDIT_0.16.11.txt'),audit.join('\n'),'utf8');

console.log(JSON.stringify({
  components:ALL_COMPONENTS.length,
  componentsMissing:componentsMissing.length,
  componentsCovered:componentsCovered.length,
  education:EDUCATION_POOL.length,
  brokenAssets:brokenAssets.length,
  auditLines:audit.length
},null,2));
