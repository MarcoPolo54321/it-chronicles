export const DIFFICULTY_MODES_V180 = Object.freeze([
  { id:'calm', name:'Спокойный', desc:'Больше доход, меньше усталость и гарантийные риски.', income:1.15, energyCost:.82, warrantyRisk:.65, clientTolerance:1.18, employeeFatigue:.75 },
  { id:'normal', name:'Обычный', desc:'Основной баланс игры без скрытых поблажек.', income:1, energyCost:1, warrantyRisk:1, clientTolerance:1, employeeFatigue:1 },
  { id:'realistic', name:'Реалистичный', desc:'Клиенты чаще торгуются, ошибки дороже, команда быстрее устаёт.', income:.92, energyCost:1.16, warrantyRisk:1.35, clientTolerance:.86, employeeFatigue:1.25 }
]);

export const QUOTE_STRATEGIES_V180 = Object.freeze([
  { id:'economy', name:'Экономная смета', priceMult:.86, materialMult:.78, quality:-.08, warrantyRisk:.20, acceptance:.17, desc:'Низкая цена, дешёвые детали и повышенный риск возврата.' },
  { id:'standard', name:'Стандартная смета', priceMult:1, materialMult:1, quality:0, warrantyRisk:.08, acceptance:.08, desc:'Сбалансированная цена, качество и срок.' },
  { id:'reliable', name:'Надёжная смета', priceMult:1.22, materialMult:1.18, quality:.08, warrantyRisk:-.05, acceptance:-.05, desc:'Более качественные детали и сниженный риск повторной поломки.' },
  { id:'premium', name:'Премиальная смета', priceMult:1.48, materialMult:1.35, quality:.14, warrantyRisk:-.09, acceptance:-.15, desc:'Максимальное качество, расширенная гарантия и высокая цена.' }
]);

export const WORKSTATIONS_V180 = Object.freeze([
  { id:'diagnostic', name:'Диагностический стол', short:'Диагностика' },
  { id:'repair', name:'Ремонтный стол', short:'Ремонт' },
  { id:'assembly', name:'Место сборки ПК', short:'Сборка' },
  { id:'network', name:'Сетевой стенд', short:'Сети' }
]);

export const EMPLOYEE_ROLES_V180 = Object.freeze([
  { id:'repair_master', name:'Мастер по ремонту', skills:['repair','hardware'], speed:.10, quality:.06 },
  { id:'assembler', name:'Сборщик ПК', skills:['hardware'], speed:.12, quality:.04 },
  { id:'networker', name:'Сетевой специалист', skills:['networking','security'], speed:.09, quality:.06 },
  { id:'manager', name:'Менеджер', skills:['communication','management'], speed:.03, quality:.03, leadBonus:.08 },
  { id:'seller', name:'Продавец', skills:['communication'], speed:.02, quality:.02, incomeBonus:.07 },
  { id:'trainee', name:'Ученик', skills:['repair','hardware'], speed:-.04, quality:-.03, learning:.18 }
]);

export const HISTORICAL_CHAINS_V180 = Object.freeze([
  { id:'xp_launch', year:2001, month:10, title:'Windows XP выходит на рынок', text:'Клиенты начинают спрашивать переход с Windows 98 и 2000.', effects:{ softwareRep:2, softwareDemand:.08 } },
  { id:'broadband', year:2003, month:4, title:'Широкополосный интернет набирает популярность', text:'Растёт спрос на домашние сети, модемы и настройку подключения.', effects:{ networkingRep:2, networkingDemand:.10 } },
  { id:'usb', year:2004, month:9, title:'USB-флешки вытесняют дискеты', text:'Перенос данных становится быстрее, но клиенты всё чаще теряют файлы на съёмных носителях.', effects:{ dataRep:2, dataDemand:.08 } },
  { id:'wifi', year:2005, month:6, title:'Wi‑Fi появляется в домах и кафе', text:'Появляется новый поток заказов на роутеры и беспроводные сети.', effects:{ networkingRep:3, networkingDemand:.12 } },
  { id:'lcd', year:2006, month:3, title:'LCD-мониторы становятся массовыми', text:'ЭЛТ постепенно уходят, растёт спрос на апгрейд рабочих мест.', effects:{ hardwareRep:2, hardwareDemand:.08 } },
  { id:'virus_wave', year:2007, month:2, title:'Новая волна вредоносных программ', text:'Безопасность и резервные копии становятся важнее обычной установки Windows.', effects:{ securityRep:3, securityDemand:.12 } },
  { id:'crisis', year:2008, month:9, title:'Финансовый кризис меняет рынок', text:'Клиенты чаще выбирают ремонт вместо покупки новой техники.', effects:{ repairRep:3, repairDemand:.14 } },
  { id:'win7', year:2009, month:10, title:'Windows 7 возвращает интерес к обновлению ПК', text:'Компании и домашние пользователи планируют переход на новую систему.', effects:{ softwareRep:2, hardwareRep:2, softwareDemand:.10 } },
  { id:'clouds', year:2010, month:5, title:'Облачные сервисы входят в повседневную работу', text:'Бизнес начинает интересоваться резервным копированием и удалённым доступом.', effects:{ dataRep:2, managementRep:2, dataDemand:.10 } }
]);

export const AD_CATEGORY_ASSETS_V180 = Object.freeze({
  'IT-порталы':'./assets/ui-v180/advertising/it-portals.webp',
  'Печатная реклама':'./assets/ui-v180/advertising/print.webp',
  'Доски объявлений':'./assets/ui-v180/advertising/classifieds.webp',
  'Баннерные сети':'./assets/ui-v180/advertising/banner-networks.webp',
  'Поиск и каталоги':'./assets/ui-v180/advertising/search-catalogs.webp'
});
