const tier = (name, cost, fromYear, reqLevel, bonus = {}) => ({ name, cost, fromYear, reqLevel, bonus });
const YEARS_10 = [2000,2001,2003,2005,2007,2010,2010,2010,2010,2010];
const LEVELS_10 = [1,2,3,5,7,9,11,13,15,18];
const COST_MULT = [1,1.75,3,5.2,8.5,12,18,27,39,55];
const buildTiers = (names, baseCost, bonusAt, years = YEARS_10, levels = LEVELS_10) => names.map((name,index) => tier(name, Math.round(baseCost * (COST_MULT[index] || Math.pow(1.55,index))), years[index] ?? years.at(-1), levels[index] ?? levels.at(-1), bonusAt(index + 1)));

export const WORKSPACE_GROUPS = [
  { id:'core', name:'Техника', desc:'Основной комплект: компьютер, монитор, клавиатура и мышь.' },
  { id:'tools', name:'Инструменты', desc:'Паяльное, измерительное и сетевое оснащение мастерской.' },
  { id:'productivity', name:'Организация', desc:'Учёба, планирование, носители и порядок на рабочем месте.' },
  { id:'comfort', name:'Комфорт', desc:'Кресло, свет, звук, напитки, растения и периферия.' }
];

const FIVE_LEVEL_WORKSPACE_ASSETS = new Set(['monitor','computer','keyboard','mouse','chair','lamp','mug','plant','printer','speakers']);
const visualItem = (id, group, name, desc, assetKey, names, baseCost, bonusAt, assetCount = names.length) => ({
  id, group, name, desc, assetKey,
  assetCount: FIVE_LEVEL_WORKSPACE_ASSETS.has(assetKey) ? 5 : assetCount,
  tiers: buildTiers(names,baseCost,bonusAt)
});

export const WORKSPACE_ITEMS = [
  visualItem('monitor','core','Монитор','Ускоряет диагностику и повышает ценность выполненной работы.','monitor',[
    'CRT 15″ с барахолки','CRT 17″ офисный','Плоский CRT 19″','Первый LCD 17″','LCD 22″ Full HD','IPS 24″','Два монитора 24″','Профессиональный 27″','Ультраширокий 34″','Изогнутый 4K-монитор'
  ],520,n=>({workSpeed:.008+n*.010,income:.004+n*.005})),
  visualItem('computer','core','Системный блок','Главный инструмент: ускоряет работу и открывает сложные заказы.','computer',[
    'Celeron 533 / 64 МБ','Pentium III / 128 МБ','Pentium 4 / 512 МБ','Athlon 64 / 1 ГБ','Core 2 Duo / 2 ГБ','Сильный Core i5 / 8 ГБ'
  ],1600,n=>({workSpeed:.015+n*.018,income:.008+n*.009})),
  visualItem('keyboard','core','Клавиатура','Повышает скорость ввода и получение профессионального опыта.','keyboard',[
    'Классическая PS/2','Офисная мембранная','Мультимедийная','Эргономичная','Низкопрофильная','Механическая','Компактная TKL','Игровая RGB','Беспроводная профессиональная','Флагманская механическая'
  ],220,n=>({workSpeed:.004+n*.006,skillXp:.006+n*.006}),9),
  visualItem('mouse','core','Мышь','Улучшает точность диагностики и шанс успешного завершения заказа.','mouse',[
    'Шариковая мышь','Шариковая с колёсиком','Оптическая PS/2','Оптическая USB','Лазерная','Беспроводная','Игровая 3200 DPI','Эргономичная','Профессиональная беспроводная','Флагманская точная мышь'
  ],150,n=>({workSpeed:.003+n*.004,success:.002+n*.003})),

  { id:'ws_screwdrivers', group:'tools', name:'Набор отвёрток', desc:'Базовая разборка корпусов и периферии.', assetKey:'ws_screwdrivers', assetCount:2, tiers:[tier('Простой набор отвёрток',350,2000,1,{workSpeed:.015,success:.008,skillXp:.01}),tier('Современный точный набор',2200,2010,7,{workSpeed:.04,success:.02,skillXp:.03})] },
  { id:'ws_pro_screwdrivers', group:'tools', name:'Профессиональные отвёртки', desc:'Точный инструмент для ноутбуков и сложной техники.', assetKey:'ws_pro_screwdrivers', assetCount:2, tiers:[tier('Профессиональный набор 2000-х',1600,2002,4,{workSpeed:.03,success:.015,skillXp:.02}),tier('Модульный сервисный набор',6500,2010,10,{workSpeed:.065,success:.035,skillXp:.045})] },
  { id:'ws_soldering', group:'tools', name:'Паяльник', desc:'Открывает уверенную работу с платами и электроникой.', assetKey:'ws_soldering', assetCount:2, tiers:[tier('Советский паяльник',600,2000,2,{success:.012,skillXp:.018}),tier('Паяльная станция',5200,2010,9,{success:.045,skillXp:.05,workSpeed:.025})] },
  { id:'ws_multimeter', group:'tools', name:'Мультиметр', desc:'Ускоряет поиск неисправностей питания и электроники.', assetKey:'ws_multimeter', assetCount:2, tiers:[tier('Мультиметр DT-830',750,2000,2,{success:.015,workSpeed:.012}),tier('Цифровой мультиметр',4800,2010,8,{success:.04,workSpeed:.035})] },
  { id:'ws_crimper', group:'tools', name:'Кримпер RJ-45', desc:'Главный инструмент для сетевых заказов.', assetKey:'ws_crimper', assetCount:2, tiers:[tier('Простой кримпер RJ-45',850,2000,3,{success:.012,skillXp:.018}),tier('Профессиональный кримпер',4300,2010,8,{success:.035,skillXp:.045,workSpeed:.02})] },
  { id:'ws_antistatic_mat', group:'tools', name:'Антистатический коврик', desc:'Снижает риск повреждения комплектующих.', assetKey:'ws_antistatic_mat', assetCount:2, tiers:[tier('Антистатический коврик',900,2000,3,{success:.018}),tier('Сервисный ESD-комплект',3900,2010,8,{success:.05,health:.01})] },
  { id:'ws_tweezers', group:'tools', name:'Антистатический пинцет', desc:'Помогает при точной работе с мелкими компонентами.', assetKey:'ws_tweezers', assetCount:2, tiers:[tier('Антистатический пинцет',300,2000,2,{success:.008,skillXp:.01}),tier('Набор точных пинцетов',1800,2010,7,{success:.025,skillXp:.025})] },
  { id:'ws_oscilloscope', group:'tools', name:'Осциллограф', desc:'Оборудование для глубокой диагностики электроники.', assetKey:'ws_oscilloscope', assetCount:2, tiers:[tier('Аналоговый осциллограф',6500,2003,7,{success:.035,income:.02,skillXp:.03}),tier('Цифровой осциллограф',28000,2012,14,{success:.075,income:.055,skillXp:.065})] },

  { id:'notebook', group:'productivity', name:'Блокнот', desc:'Помогает планировать заказы и быстрее учиться.', tiers:[tier('Школьная тетрадь',60,2000,1,{educationSpeed:.01}),tier('Блокнот в клетку',120,2000,1,{educationSpeed:.02}),tier('Ежедневник',260,2000,2,{educationSpeed:.035,workSpeed:.005}),tier('Органайзер',600,2002,4,{educationSpeed:.055,workSpeed:.01}),tier('Электронный органайзер',1800,2004,7,{educationSpeed:.08,workSpeed:.02})] },
  { id:'stationery', group:'productivity', name:'Канцелярия', desc:'Небольшой бонус к обучению и качеству общения.', tiers:[tier('Один карандаш',25,2000,1,{skillXp:.005}),tier('Стакан ручек',80,2000,1,{skillXp:.01,reputation:.005}),tier('Набор маркеров',180,2000,2,{skillXp:.02,reputation:.01}),tier('Чертёжный набор',400,2001,4,{skillXp:.03,reputation:.015}),tier('Настольный органайзер',900,2003,6,{skillXp:.045,reputation:.025})] },
  { id:'clock', group:'productivity', name:'Часы', desc:'Помогают соблюдать сроки и восстанавливать энергию.', tiers:[tier('Будильник «Электроника»',90,2000,1,{energyRegen:.2}),tier('Настольные часы',180,2000,2,{energyRegen:.35,workSpeed:.005}),tier('Часы с календарём',400,2001,3,{energyRegen:.5,workSpeed:.01}),tier('Радиобудильник',850,2002,5,{energyRegen:.7,workSpeed:.015}),tier('Часы-метеостанция',1800,2005,8,{energyRegen:1,workSpeed:.025})] },
  { id:'poster', group:'productivity', name:'Плакаты', desc:'Добавляют атмосферы, мотивации и репутации.', tiers:[tier('«Не баг, а фича»',40,2000,1,{mood:.05}),tier('Календарь 2000',100,2000,1,{mood:.08,reputation:.005}),tier('Шпаргалка по DOS',220,2000,2,{mood:.1,skillXp:.01}),tier('Плакат Linux / Tux',450,2001,4,{mood:.13,reputation:.015}),tier('Карта технологий',900,2004,7,{mood:.18,reputation:.025})] },
  { id:'books', group:'productivity', name:'Книжная полка', desc:'Даёт постоянный бонус к опыту и скорости обучения.', tiers:[tier('Три потрёпанные книги',250,2000,1,{skillXp:.015,educationSpeed:.01}),tier('Полка справочников',600,2000,2,{skillXp:.03,educationSpeed:.02}),tier('Серия по Windows и Delphi',1300,2001,4,{skillXp:.05,educationSpeed:.035}),tier('Техническая библиотека',2800,2003,7,{skillXp:.075,educationSpeed:.055}),tier('Домашний архив IT-книг',6000,2006,10,{skillXp:.11,educationSpeed:.08})] },
  { id:'floppies', group:'productivity', name:'Носители и бэкапы', desc:'Повышают надёжность работы с данными.', tiers:[tier('Одна дискета 3,5″',30,2000,1,{success:.003}),tier('Набор дискет',100,2000,1,{success:.007}),tier('Коробка подписанных дискет',250,2000,2,{success:.012,skillXp:.005}),tier('CD-R архив',600,2001,4,{success:.02,skillXp:.01}),tier('Внешний HDD',2400,2005,8,{success:.035,skillXp:.02})] },

  visualItem('chair','comfort','Кресло','Улучшает восстановление энергии и здоровье.','chair',[
    'Табуретка','Офисный стул','Кресло на колёсиках','Кресло с подлокотниками','Кожаное кресло','Эргономичное кресло','Сетчатое рабочее кресло','Профессиональное кресло','Премиальное кресло','Флагманское эргокресло'
  ],220,n=>({energyRegen:.08+n*.10,health:.003+n*.006})),
  visualItem('printer','comfort','Принтер и сканер','Оформление документов и офисных заказов.','printer',[
    'Матричный принтер','Струйный A4','Лазерный принтер','Домашнее МФУ','Сетевой лазерный принтер','Цветное МФУ','Офисное МФУ','Быстрый сетевой принтер','Профессиональный сканер-МФУ','Компактное МФУ нового поколения'
  ],700,n=>({income:.003+n*.006,reputation:.002+n*.004})),
  visualItem('headphones','comfort','Наушники с микрофоном','Помогают сосредоточиться и общаться с клиентами.','headphones',[
    'Простые проводные','Гарнитура с микрофоном','Закрытые мониторные','Игровая гарнитура','USB-гарнитура','Беспроводные','Студийные','Гарнитура с шумоподавлением','Профессиональные беспроводные','Флагманская гарнитура'
  ],260,n=>({mood:.02+n*.025,communicationBonus:.002+n*.003,energyRegen:.03+n*.035})),
  visualItem('lamp','comfort','Настольная лампа','Уменьшает ошибки и помогает учиться вечером.','lamp',[
    'Лампа с прищепкой','Шарнирная лампа','Лампа с регулировкой','Галогенная','Компактная офисная','LED-лампа','Лампа с USB','Лампа с регулировкой температуры','Умная лампа','Профессиональный рабочий свет'
  ],120,n=>({success:.002+n*.003,educationSpeed:.003+n*.004})),
  visualItem('speakers','comfort','Колонки','Музыка поддерживает настроение и уменьшает усталость.','speakers',[
    'Одна хрипящая колонка','Пара офисных колонок','Колонки 2.0','Система 2.1','Домашняя 5.1','Активные мониторы','Компактная акустика','Беспроводные колонки','Студийные мониторы','Премиальная настольная акустика'
  ],160,n=>({mood:.025+n*.025,energyRegen:.035+n*.04})),
  visualItem('mug','comfort','Кружка и кофе','Увеличивает запас энергии и удовольствие от места.','mug',[
    'Эмалированная кружка','Кружка Root Admin','Керамическая кружка','Большая офисная кружка','Термокружка','Кружка с крышкой','Термостакан','Умная кружка','Премиальный термостакан','Кружка с подогревом'
  ],80,n=>({energyMax:1+n*2,fun:.02+n*.02})),
  visualItem('plant','comfort','Растение','Делает рабочее место живым и улучшает настроение.','plant',[
    'Кактус','Фикус','Хлорофитум','Денежное дерево','Небольшая пальма','Суккуленты','Монстера','Большое комнатное растение','Дизайнерская композиция','Зелёная стена'
  ],150,n=>({fun:.025+n*.025,mood:.015+n*.015,income:n>=4?.002*n:0}))
];

const CAMPAIGN_MAX_YEAR = 2010;
for (const item of WORKSPACE_ITEMS) {
  item.tiers = item.tiers.filter((entry) => Number(entry.fromYear || 2000) <= CAMPAIGN_MAX_YEAR);
  if (item.assetKey && item.group !== 'tools') item.tiers = item.tiers.slice(0, 5);
  if (item.assetCount) item.assetCount = Math.min(Number(item.assetCount), item.tiers.length);
}

export function workspaceState(game) { game.workspace ||= { items:{}, totalSpent:0 }; game.workspace.items ||= {}; return game.workspace; }
export function workspaceLevel(game,itemId) { return Number(workspaceState(game).items[itemId] || 0); }
export function workspaceCurrentTier(game,itemId) { const item=WORKSPACE_ITEMS.find(entry=>entry.id===itemId); const level=workspaceLevel(game,itemId); return level>0 ? item?.tiers[Math.min(level,item.tiers.length)-1] || null : null; }
export function workspaceNextTier(game,itemId) { const item=WORKSPACE_ITEMS.find(entry=>entry.id===itemId); const level=workspaceLevel(game,itemId); return item?.tiers[level] || null; }
export function workspaceAsset(itemId,level=0) { const item=WORKSPACE_ITEMS.find(entry=>entry.id===itemId); if (!item) return './assets/workspace/items/computer.webp'; if (item.assetKey) { const n=Math.max(1,Math.min(Number(item.assetCount||item.tiers.length||1),Number(level||1))); return `./assets/workspace/catalog/${item.assetKey}/${n}.webp?v=165`; } return `./assets/workspace/items/${itemId}.webp?v=165`; }
export function workspaceRoomStage(game) { const visual=WORKSPACE_ITEMS.filter(item=>item.assetKey && item.group!=='tools'); if (!visual.length) return 0; const ratio=visual.reduce((sum,item)=>sum+Math.min(1,workspaceLevel(game,item.id)/Math.max(1,item.tiers.length)),0)/visual.length; const equipmentStage=Math.max(0,Math.min(4,Math.round(ratio*4))); const year=Math.max(2000,Math.min(2010,Number(game.calendar?.year||2000))); const eraCap=Math.max(0,Math.min(4,Math.floor((year-2000)/2.5))); return Math.min(equipmentStage,eraCap); }
export function workspaceRoomAsset(game) { const stage=workspaceRoomStage(game); return `./assets/workspace/rooms/room-${stage}.webp?v=165`; }

export function workspaceBonuses(game) {
  const result={workSpeed:0,income:0,skillXp:0,success:0,educationSpeed:0,energyMax:0,energyRegen:0,mood:0,fun:0,reputation:0,health:0,communicationBonus:0,setLevel:0};
  for (const item of WORKSPACE_ITEMS) { const current=workspaceCurrentTier(game,item.id); if (!current) continue; for (const [key,value] of Object.entries(current.bonus||{})) result[key]=(result[key]||0)+Number(value||0); }
  const core=['monitor','computer','keyboard','mouse'].map(id=>workspaceLevel(game,id));
  const setLevel=Math.min(...core); result.setLevel=Number.isFinite(setLevel)?setLevel:0;
  if (result.setLevel>0) { result.workSpeed+=result.setLevel*.012; result.income+=result.setLevel*.008; result.success+=result.setLevel*.004; }
  return result;
}
export function workspaceBonusText(bonus={}) {
  const labels=[];
  if (bonus.workSpeed) labels.push(`скорость +${Math.round(bonus.workSpeed*100)}%`);
  if (bonus.income) labels.push(`доход +${Math.round(bonus.income*100)}%`);
  if (bonus.skillXp) labels.push(`опыт +${Math.round(bonus.skillXp*100)}%`);
  if (bonus.success) labels.push(`успех +${Math.round(bonus.success*100)}%`);
  if (bonus.educationSpeed) labels.push(`учёба +${Math.round(bonus.educationSpeed*100)}%`);
  if (bonus.energyMax) labels.push(`энергия +${Math.round(bonus.energyMax)}`);
  if (bonus.energyRegen) labels.push(`восстановление +${Number(bonus.energyRegen).toFixed(1)}`);
  if (bonus.mood) labels.push(`настроение +${Number(bonus.mood).toFixed(2)}/день`);
  if (bonus.fun) labels.push(`удовольствие +${Number(bonus.fun).toFixed(2)}/день`);
  if (bonus.reputation) labels.push(`репутация +${Math.round(bonus.reputation*100)}%`);
  if (bonus.health) labels.push(`здоровье +${Number(bonus.health).toFixed(2)}/день`);
  if (bonus.communicationBonus) labels.push(`общение +${Math.round(bonus.communicationBonus*100)}%`);
  return labels.join(' · ') || 'декоративное улучшение';
}
