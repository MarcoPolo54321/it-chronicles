import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DECISION_EVENTS_V08 } from '../www/js/data/v08.js';
import { EVENTS } from '../www/js/data/economy.js';
import { MARKET_EVENTS_V13 } from '../www/js/data/v13.js';
import { SKILLS } from '../www/js/data/progression.js';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(__dirname,'..');
const skillNames=Object.fromEntries(SKILLS.map(item=>[item.id,item.name]));
const effectNames={cash:'деньги',energy:'энергия',mood:'настроение',fun:'развлечения',health:'здоровье',reputation:'репутация',rep:'репутация',company:'репутация компании',deadlines:'сроки заказов',employeeMorale:'мотивация сотрудников'};

function effectText(effect={}){
  const parts=[];
  for(const [key,value] of Object.entries(effect)){
    if(key==='inventory'){
      parts.push(`имущество: ${Object.entries(value||{}).map(([id,qty])=>`${id} ×${qty}`).join(', ')}`);
      continue;
    }
    const label=effectNames[key]||key;
    if(typeof value==='number')parts.push(`${label} ${value>0?'+':''}${value}`);
  }
  return parts.join(' · ')||'без прямого числового эффекта';
}
function reqText(req={}){
  const rows=Object.entries(req).map(([id,level])=>`${skillNames[id]||id} ${level}`);
  return rows.length?rows.join(' · '):'нет';
}

const lines=[
  'ХРОНИКИ АЙТИШНИКА v0.17.0 — ВСЕ СОБЫТИЯ ДЛЯ ОТРИСОВКИ',
  '',
  'Назначение: список сюжетных карточек и фоновых событий, для которых можно подготовить иллюстрации.',
  'Рекомендуемый формат имени изображения: event_<ID>.webp.',
  ''
];

const visibleDecisionEvents=DECISION_EVENTS_V08.filter(item=>(item.fromYear||2000)<=2010);
lines.push(`## 1. ЕЖЕМЕСЯЧНЫЕ СЮЖЕТНЫЕ СОБЫТИЯ (${visibleDecisionEvents.length})`,'');
for(const event of visibleDecisionEvents){
  lines.push(`### ${event.id}`);
  lines.push(`Изображение: event_${event.id}.webp`);
  lines.push(`Название: ${event.title}`);
  lines.push(`Период: ${event.fromYear||2000}–${event.toYear||2010}${event.businessOnly?' · только после открытия компании':''}`);
  lines.push(`Сцена: ${event.text}`);
  lines.push('Варианты:');
  for(const choice of event.choices||[]){
    lines.push(`- ${choice.label}`);
    lines.push(`  Требования: ${reqText(choice.reqSkills)}`);
    lines.push(`  Эффект: ${effectText(choice.effect)}`);
    lines.push(`  Результат: ${choice.result}`);
  }
  lines.push('');
}

const employeeEvents=[
  {id:'employee_raise',title:'Сотрудник просит повышение',text:'Сотрудник считает, что вырос профессионально и хочет пересмотра зарплаты.',variants:['Повысить зарплату','Отказать']},
  {id:'employee_training',title:'Обучение сотрудника',text:'Появилось место на отраслевом интенсиве. Можно оплатить обучение сотрудника.',variants:['Оплатить обучение','Отказаться']},
  {id:'employee_mistake',title:'Ошибка сотрудника',text:'Клиент пожаловался на невнимательность. Нужно решить, как отреагировать.',variants:['Поддержать сотрудника','Ввести строгий контроль']}
];
lines.push(`## 2. СОБЫТИЯ В КОМАНДЕ (${employeeEvents.length})`,'');
for(const event of employeeEvents){
  lines.push(`### ${event.id}`);
  lines.push(`Изображение: event_${event.id}.webp`);
  lines.push(`Название: ${event.title}`);
  lines.push(`Сцена: ${event.text}`);
  lines.push(`Варианты: ${event.variants.join(' / ')}`,'');
}

const marketEvents=MARKET_EVENTS_V13.filter(item=>Number(item.from||2000)<=2010);
lines.push(`## 3. РЫНОЧНЫЕ СОБЫТИЯ НА ГЛАВНОЙ (${marketEvents.length})`,'');
for(const event of marketEvents){
  lines.push(`- ${event.id} — ${event.name}`);
  lines.push(`  Изображение: event_market_${event.id}.webp`);
  lines.push(`  Период: ${event.from||2000}–${Math.min(2010,event.to||2010)}`);
  lines.push(`  Сцена: ${event.desc}`);
}
lines.push('');

lines.push(`## 4. КЛАССИЧЕСКИЕ ФОНОВЫЕ СОБЫТИЯ (${EVENTS.length})`,'');
for(const event of EVENTS){
  lines.push(`- ${event.id} — ${event.name.replace(/^\S+\s*/,'')}`);
  lines.push(`  Изображение: event_background_${event.id}.webp`);
  lines.push(`  Тип эффекта: ${event.eff?.t||'не указан'}`);
}
lines.push('');
lines.push('Итого уникальных сюжетных/событийных блоков:',String(visibleDecisionEvents.length+employeeEvents.length+marketEvents.length+EVENTS.length));

const output=path.join(root,'docs','archive','audits','EVENT_STORIES_0.17.0.txt');
fs.writeFileSync(output,lines.join('\n'),'utf8');
console.log(JSON.stringify({output,decision:visibleDecisionEvents.length,employee:employeeEvents.length,market:marketEvents.length,background:EVENTS.length,total:visibleDecisionEvents.length+employeeEvents.length+marketEvents.length+EVENTS.length},null,2));
