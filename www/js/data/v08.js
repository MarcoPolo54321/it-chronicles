export const GAME_MODES = [
  { id:'campaign', name:'Кампания', desc:'Путь с 2000 по 2010 год, главы эпох и финальная оценка карьеры.' },
  { id:'sandbox', name:'Песочница', desc:'Без финального года и обязательных целей. Экономика и технологии развиваются бесконечно.' },
  { id:'challenge', name:'Испытание', desc:'Особое условие прохождения и отдельная награда.' }
];

export const CHALLENGES_V08 = [
  { id:'million_2010', name:'Миллион до 2010', desc:'Накопите капитал 1 000 000 руб. до 2010 года.', reward:'Золотой калькулятор', check:g=>g.calendar.year<=2010 && Number(g.player.cash||0)>=1_000_000 },
  { id:'no_credit', name:'Без кредитов', desc:'Завершите кампанию 2010 года без кредитов.', reward:'Значок «На свои»', check:g=>g.calendar.year>=2010 && Number(g.stats?.loansTaken||0)===0 },
  { id:'perfect_service', name:'Идеальный сервис', desc:'Выполните 100 заказов с долей успеха не ниже 95%.', reward:'Платиновая отвёртка', check:g=>Number(g.stats?.ordersDone||0)>=100 && Number(g.stats?.ordersFailed||0)<=5 }
];

export const ACTIVITY_PLANS = [
  { id:'balanced', name:'Баланс', icon:'⇄', work:1, study:1, energy:1, business:1, desc:'Работа и учёба развиваются равномерно.' },
  { id:'work', name:'Ударная работа', icon:'', work:1.5, study:.45, energy:1.35, business:.7, desc:'Заказы быстрее, но обучение замедляется и энергия расходуется сильнее.' },
  { id:'study', name:'Учебный режим', icon:'▧', work:.55, study:1.6, energy:1.05, business:.7, desc:'Курсы проходят быстрее. Вуз всё равно идёт строго по календарю.' },
  { id:'business', name:'Управление', icon:'▣', work:.75, study:.65, energy:.85, business:1.55, desc:'Больше внимания сотрудникам, контрактам, рекламе и клиентам.' }
];

export const DIAGNOSTIC_CASES = {
  hardware:[
    { id:'no_image', title:'Компьютер включается, но изображения нет', clue:'Вентиляторы вращаются, системный динамик подаёт короткие сигналы.', choices:[
      {id:'ram',label:'Переставить и проверить оперативную память',correct:true,why:'Повторяющиеся короткие сигналы часто указывают на память.'},
      {id:'format',label:'Сразу переустановить Windows',correct:false,why:'До загрузки системы дело не доходит.'},
      {id:'printer',label:'Проверить драйвер принтера',correct:false,why:'Принтер не связан с отсутствием изображения.'}
    ]},
    { id:'overheat', title:'ПК выключается через 10–15 минут', clue:'Корпус горячий, вентилятор шумит сильнее обычного.', choices:[
      {id:'cooling',label:'Проверить охлаждение и термопасту',correct:true,why:'Симптомы типичны для перегрева.'},
      {id:'monitor',label:'Заменить монитор',correct:false,why:'Монитор не выключает системный блок.'},
      {id:'modem',label:'Перенастроить модем',correct:false,why:'Подключение к интернету не влияет на температуру.'}
    ]}
  ],
  software:[
    { id:'slow_boot', title:'Windows загружается десять минут', clue:'Диск постоянно занят, автозагрузка переполнена.', choices:[
      {id:'startup',label:'Проверить автозагрузку, диск и вредоносные программы',correct:true,why:'Нужно сначала определить программную нагрузку и состояние диска.'},
      {id:'cpu',label:'Сразу заменить процессор',correct:false,why:'Апгрейд без диагностики может не решить проблему.'},
      {id:'speakers',label:'Заменить колонки',correct:false,why:'Звук не связан со скоростью загрузки.'}
    ]},
    { id:'virus', title:'Появляются окна с рекламой и пропадают файлы', clue:'Антивирус отключён, браузер открывает неизвестные страницы.', choices:[
      {id:'malware',label:'Изолировать ПК, проверить антивирусом и резервировать данные',correct:true,why:'Сначала нужно остановить распространение и сохранить данные.'},
      {id:'defrag',label:'Только выполнить дефрагментацию',correct:false,why:'Дефрагментация не удаляет вредоносное ПО.'},
      {id:'paint',label:'Переустановить Paint',correct:false,why:'Paint не влияет на заражение.'}
    ]}
  ],
  networking:[
    { id:'no_internet', title:'Модем подключается, но сайты не открываются', clue:'Связь с провайдером есть, IP-адрес получен.', choices:[
      {id:'dns',label:'Проверить DNS и доступ по IP-адресу',correct:true,why:'При наличии соединения проблема часто находится в разрешении имён.'},
      {id:'gpu',label:'Заменить видеокарту',correct:false,why:'Видеокарта не управляет DNS.'},
      {id:'bios',label:'Сбросить BIOS',correct:false,why:'Это слишком радикально и не связано с симптомом.'}
    ]}
  ],
  repair:[
    { id:'power', title:'Компьютер не реагирует на кнопку питания', clue:'Розетка исправна, индикаторы на системном блоке не горят.', choices:[
      {id:'psu',label:'Проверить кабель, кнопку и блок питания мультиметром',correct:true,why:'Нужно пройти цепь питания от простого к сложному.'},
      {id:'windows',label:'Переустановить Windows',correct:false,why:'ОС не запускается без питания.'},
      {id:'mouse',label:'Заменить мышь',correct:false,why:'Мышь не влияет на включение.'}
    ]}
  ],
  data:[
    { id:'disk_clicks', title:'Жёсткий диск щёлкает, документы не открываются', clue:'Данные важны, резервной копии нет.', choices:[
      {id:'clone',label:'Прекратить запись и сделать посекторную копию',correct:true,why:'Любая лишняя запись повышает риск окончательной потери данных.'},
      {id:'format',label:'Отформатировать диск',correct:false,why:'Форматирование ухудшит восстановление.'},
      {id:'games',label:'Запустить игру для проверки',correct:false,why:'Нагрузка может окончательно повредить диск.'}
    ]}
  ],
  security:[
    { id:'office_attack', title:'В офисе зашифровались общие папки', clue:'На одном ПК открыли вложение из неизвестного письма.', choices:[
      {id:'isolate',label:'Отключить заражённые узлы от сети и сохранить журналы',correct:true,why:'Изоляция ограничит распространение и сохранит следы.'},
      {id:'rebootall',label:'Перезагрузить все компьютеры',correct:false,why:'Перезагрузка не остановит распространение по сети.'},
      {id:'delete',label:'Удалить все общие папки',correct:false,why:'Это уничтожит данные без устранения причины.'}
    ]}
  ],
  default:[
    { id:'basic', title:'Клиент описывает проблему неточно', clue:'Нужно отделить симптом от причины.', choices:[
      {id:'questions',label:'Задать уточняющие вопросы и воспроизвести проблему',correct:true,why:'Хорошая диагностика начинается со сбора фактов.'},
      {id:'replace',label:'Сразу заменить самые дорогие детали',correct:false,why:'Это дорого и не гарантирует результат.'},
      {id:'promise',label:'Пообещать ремонт без проверки',correct:false,why:'Обещание без диагностики создаёт риск конфликта.'}
    ]}
  ]
};

export const STORY_CHAPTERS_V08 = [
  { id:'first_pc', from:2000, to:2002, title:'Первый компьютер', desc:'Домашние заказы, Windows 98, дискеты и первые постоянные клиенты.', goals:[
    {id:'orders20',title:'Выполнить 20 заказов',value:g=>g.stats.ordersDone,target:20},
    {id:'pc',title:'Собрать собственный ПК',value:g=>g.pc.assembled?1:0,target:1},
    {id:'job',title:'Получить постоянную работу',value:g=>g.career.jobId&&g.career.jobId!=='student'?1:0,target:1},
    {id:'clients5',title:'Завести 5 постоянных клиентов',value:g=>Object.keys(g.clients?.records||{}).length,target:5}
  ]},
  { id:'internet', from:2003, to:2007, title:'Интернет приходит в каждый дом', desc:'Сети, компьютерные клубы, собственная мастерская и первый сотрудник.', goals:[
    {id:'network5',title:'Сети до 5 уровня',value:g=>g.skills.networking.level,target:5},
    {id:'location',title:'Открыть мастерскую',value:g=>g.property.locationId==='home'?0:1,target:1},
    {id:'employee',title:'Нанять сотрудника',value:g=>g.business?.employees?.length||0,target:1},
    {id:'contract',title:'Подписать сервисный контракт',value:g=>g.business?.contracts?.length||0,target:1}
  ]},
  { id:'service', from:2008, to:2010, title:'Сервисный центр', desc:'Ноутбуки, Windows 7, корпоративные клиенты и управление денежным потоком.', goals:[
    {id:'rep250',title:'Репутация 250',value:g=>g.player.reputation,target:250},
    {id:'employees3',title:'Команда из 3 человек',value:g=>g.business?.employees?.length||0,target:3},
    {id:'company100',title:'Репутация компании 100',value:g=>g.business?.companyReputation||0,target:100}
  ]},
];

export const EMPLOYEE_TEMPLATES_V08 = [
  {id:'apprentice',name:'Ученик мастера',icon:'УЧ',salary:3500,reqLevel:3,speed:.65,quality:.00,skills:{hardware:1},desc:'Берёт простые работы и постепенно набирается опыта.'},
  {id:'repairer',name:'Мастер по ремонту',icon:'РМ',salary:9000,reqLevel:7,speed:1.05,quality:.05,skills:{hardware:3,repair:2},desc:'Самостоятельно выполняет ремонт и диагностику железа.'},
  {id:'sysadmin',name:'Системный администратор',icon:'SA',salary:13000,reqLevel:10,speed:1.1,quality:.07,skills:{software:4,networking:3},desc:'Сети, офисы, серверы и постоянное обслуживание.'},
  {id:'manager',name:'Менеджер приёмки',icon:'MG',salary:11000,reqLevel:9,speed:.25,quality:.02,orderSlots:2,desc:'Повышает пропускную способность и удерживает клиентов.'},
  {id:'accountant',name:'Бухгалтер',icon:'БУ',salary:15000,reqLevel:12,speed:.1,quality:.00,taxDiscount:.12,desc:'Контролирует расходы, кредиты и денежный поток.'},
  {id:'marketer',name:'Специалист по рекламе',icon:'AD',salary:17000,reqLevel:14,speed:.1,quality:.00,marketing:.18,desc:'Повышает поток заявок и эффективность рекламы.'}
];

export const CONTRACT_TEMPLATES_V08 = [
  {id:'school',name:'Компьютерный класс школы',icon:'SCH',fromYear:2000,minRep:35,monthly:4500,load:1,months:12,skills:{hardware:2,software:2},desc:'Поддержка учебных компьютеров, принтеров и локальной сети.'},
  {id:'cafe',name:'Интернет-кафе',icon:'NET',fromYear:2002,minRep:80,monthly:12000,load:2,months:12,skills:{networking:3,software:3},desc:'Ежемесячное обслуживание клуба и срочные ночные вызовы.'},
  {id:'office',name:'Малый офис',icon:'OFF',fromYear:2004,minRep:130,monthly:24000,load:2,months:18,skills:{networking:4,software:4},desc:'Рабочие станции, резервные копии и безопасность.'},
  {id:'factory',name:'Производственное предприятие',icon:'FAC',fromYear:2008,minRep:260,monthly:65000,load:4,months:24,skills:{networking:6,security:4},desc:'Сложная инфраструктура и строгие сроки реакции.'}
];

export const COMPETITORS_V08 = [
  {id:'byte',name:'Сервис «Байт»',style:'Дешевле всех',strength:.75,share:16},
  {id:'master',name:'Компьютерный мастер',style:'Сарафанное радио',strength:.9,share:18},
  {id:'techno',name:'ТехноСервис',style:'Корпоративные клиенты',strength:1.15,share:24},
  {id:'garage',name:'Гаражный гений',style:'Ремонт редкого железа',strength:.82,share:12}
];

export const CITY_POINTS_V08 = [
  {id:'home',name:'Дом',icon:'',energy:0,bonus:'Восстановление',desc:'Личное рабочее место и собственный компьютер.'},
  {id:'market',name:'Радиорынок',icon:'▦',energy:5,bonus:'−5% к покупке деталей на 7 дней',desc:'Торг, редкие детали и сомнительные продавцы.'},
  {id:'college',name:'Институтский квартал',icon:'▧',energy:4,bonus:'+10% к обучению на 7 дней',desc:'Лекции, библиотеки, знакомства и объявления.'},
  {id:'business',name:'Деловой район',icon:'▣',energy:6,bonus:'+1 предложение контракта',desc:'Офисы, банки и корпоративные клиенты.'},
  {id:'club',name:'Компьютерный клуб',icon:'',energy:4,bonus:'+5 к репутации и новые клиенты',desc:'Игроки, локальные сети и ночные ремонты.'},
  {id:'dump',name:'Склад списанной техники',icon:'',energy:7,bonus:'Шанс найти неисправную деталь',desc:'Ненужные системники, платы и периферия.'}
];

export const DECISION_EVENTS_V08 = [
  {id:'power_cut',title:'В мастерской отключили электричество',text:'Несколько заказов могут задержаться.',choices:[
    {id:'wait',label:'Ждать',effect:{mood:-3,deadlines:-1},result:'Работы задержались на день.'},
    {id:'generator',label:'Арендовать генератор за 250 руб.',effect:{cash:-250,company:3},result:'Работа продолжилась, клиенты оценили надёжность.'},
    {id:'home',label:'Перенести заказы домой',effect:{energy:-8,company:1},result:'Неудобно, но сроки удалось сохранить.'}
  ]},
  {id:'employee_raise',businessOnly:true,title:'Сотрудник просит повышение',text:'Он считает, что давно приносит компании больше своей зарплаты.',choices:[
    {id:'raise',label:'Повысить зарплату на 15%',effect:{employeeMorale:15,company:4},result:'Команда довольна решением.'},
    {id:'refuse',label:'Отказать',effect:{employeeMorale:-20},result:'Сотрудник остался, но мотивация снизилась.'},
    {id:'bonus',label:'Выплатить разовую премию',effect:{cash:-300,employeeMorale:8},result:'Компромисс принят.'}
  ]},
  {id:'big_client',title:'Крупный клиент просит срочный ремонт',text:'Оплата высокая, но придётся отложить другие дела.',choices:[
    {id:'accept',label:'Принять',effect:{cash:500,energy:-18,company:5},result:'Срочная работа выполнена.'},
    {id:'delegate',label:'Передать сотруднику',effect:{cash:350,company:3},result:'Команда справилась без вашего участия.'},
    {id:'decline',label:'Отказаться',effect:{company:-2},result:'Клиент ушёл к конкуренту.'}
  ]},
  {id:'inspection',businessOnly:true,title:'Проверка документов',text:'Нужно показать учёт доходов и договоры.',choices:[
    {id:'accountant',label:'Поручить бухгалтеру',effect:{cash:-100,company:2},result:'Проверка прошла спокойно.'},
    {id:'self',label:'Разобраться самостоятельно',effect:{energy:-12,mood:-5},result:'День ушёл на бумаги.'},
    {id:'ignore',label:'Игнорировать',effect:{cash:-600,company:-8},result:'Получен штраф.'}
  ]},
  {id:'internet_outage',title:'Отключили интернет',text:'Заказы продолжаются, но выездные и сетевые работы могут задержаться.',choices:[
    {id:'modem',label:'Купить мобильный модем за 250 руб.',effect:{cash:-250,reputation:1},result:'Работа продолжилась без задержки.'},
    {id:'postpone',label:'Перенести задачи',effect:{deadlines:-1,mood:-2},result:'Часть заказов потеряла один день срока.'},
    {id:'provider',label:'Позвонить знакомому провайдеру',reqSkills:{communication:3},effect:{reputation:2},result:'Связь восстановили быстрее обычного.'}
  ]},
  {id:'small_flood',title:'Небольшая протечка в мастерской',text:'Нужно быстро защитить оборудование и привести помещение в порядок.',choices:[
    {id:'repair',label:'Вызвать мастера за 180 руб.',effect:{cash:-180,mood:-1},result:'Протечку устранили в тот же день.'},
    {id:'self',label:'Устранить самостоятельно',reqSkills:{repair:2},effect:{energy:-8},result:'Вы справились своими силами.'},
    {id:'move',label:'Перенести технику',effect:{deadlines:-1,energy:-4},result:'Оборудование спасено, но работа замедлилась.'}
  ]},
  {id:'vehicle_breakdown',title:'Транспорт потребовал ремонта',text:'Следующий выезд может сорваться.',choices:[
    {id:'service',label:'Оплатить ремонт за 220 руб.',effect:{cash:-220},result:'Транспорт снова готов к выездам.'},
    {id:'self',label:'Починить самому',reqSkills:{repair:3,hardware:2},effect:{energy:-10,reputation:1},result:'Ремонт выполнен самостоятельно.'},
    {id:'delay',label:'Отложить выезды',effect:{deadlines:-1},result:'Выездные заказы потеряли день срока.'}
  ]},
  {id:'inheritance_phone',title:'Дальняя родственница оставила старый мобильный телефон',text:'Телефон рабочий, но выглядит устаревшим.',choices:[
    {id:'keep',label:'Оставить для мастерской',effect:{inventory:{phone_old:1},mood:3},result:'Старый телефон добавлен на склад.'},
    {id:'sell',label:'Продать коллекционеру',effect:{cash:140},result:'Телефон продан за 140 руб.'},
    {id:'gift',label:'Подарить знакомому',effect:{reputation:3},result:'Добрый жест улучшил вашу репутацию.'}
  ]},
  {id:'small_inheritance',title:'Небольшое наследство',text:'После оформления документов вам положена небольшая сумма.',choices:[
    {id:'take',label:'Получить 300 руб.',effect:{cash:300,mood:2},result:'На счёт поступило 300 руб.'},
    {id:'tools',label:'Потратить на расходники',effect:{inventory:{therm:2,air:1}},result:'На складе появились полезные расходники.'},
    {id:'reserve',label:'Отложить деньги',effect:{cash:200,reputation:1},result:'После расходов осталось 200 руб.'}
  ]},
  {id:'recommendation',title:'Знакомый порекомендовал вас клиенту',text:'Новый заказчик уже слышал о вашей аккуратной работе.',choices:[
    {id:'accept',label:'Взяться за заказ',effect:{cash:120,reputation:4,energy:-4},result:'Заказ выполнен, рекомендация сработала.'},
    {id:'consult',label:'Дать консультацию',effect:{cash:45,reputation:2},result:'Клиент получил полезную консультацию.'},
    {id:'decline',label:'Вежливо отказаться',effect:{mood:1},result:'Вы сохранили свободное время.'}
  ]},
  {id:'racket_visit',fromYear:2000,toYear:2005,title:'В мастерскую пришли «решать вопросы»',text:'Двое местных требуют платить за «спокойную работу» и обещают вернуться.',choices:[
    {id:'pay',label:'Отдать 250 руб.',effect:{cash:-250,mood:-8},result:'Деньги забрали, но проблема может вернуться.'},
    {id:'police',label:'Обратиться в милицию',reqSkills:{communication:2},effect:{energy:-6,reputation:2},result:'Заявление приняли, возле мастерской стали чаще появляться патрули.'},
    {id:'security',label:'Отказать и усилить защиту',reqSkills:{security:3,communication:2},effect:{cash:-120,energy:-8,company:3},result:'Вы поставили замки и сигнализацию, после чего визиты прекратились.'}
  ]},
  {id:'broken_window',fromYear:2000,toYear:2007,title:'Ночью разбили окно мастерской',text:'Стекло разбито, внутри холодно, а утром должны прийти клиенты.',choices:[
    {id:'glazier',label:'Вызвать стекольщика за 180 руб.',effect:{cash:-180,mood:-2},result:'Окно заменили до открытия.'},
    {id:'board',label:'Закрыть проём самому',reqSkills:{repair:2},effect:{energy:-9},result:'Временный щит спас рабочий день, но ремонт получился грубым.'},
    {id:'delay',label:'Закрыть мастерскую на день',effect:{deadlines:-1,mood:-5},result:'Заказы задержались, зато технику удалось сохранить.'}
  ]},
  {id:'street_pressure',fromYear:2000,toYear:2006,title:'Компания со двора требует бесплатный ремонт',text:'Пацаны принесли системный блок из компьютерного клуба и намекают, что платить не собираются.',choices:[
    {id:'repair_free',label:'Сделать бесплатно',effect:{energy:-12,mood:-6},result:'Компьютер заработал, но день ушёл впустую.'},
    {id:'negotiate',label:'Договориться на расходники',reqSkills:{communication:3},effect:{cash:80,reputation:2,energy:-6},result:'Удалось получить оплату за детали и закончить разговор без конфликта.'},
    {id:'refuse',label:'Спокойно отказать',reqSkills:{security:2},effect:{reputation:1,mood:-2},result:'После короткого спора компания ушла искать другого мастера.'}
  ]},
  {id:'stolen_tools',fromYear:2000,toYear:2008,title:'Из мастерской пропал ящик инструментов',text:'Замок на подсобке повреждён, а часть ручного инструмента исчезла.',choices:[
    {id:'replace',label:'Купить замену за 220 руб.',effect:{cash:-220},result:'Рабочее место снова укомплектовано.'},
    {id:'market',label:'Искать на радиорынке',effect:{cash:-100,energy:-8,mood:-2},result:'Удалось собрать недорогой комплект из подержанных инструментов.'},
    {id:'investigate',label:'Проверить записи и соседей',reqSkills:{security:3,communication:2},effect:{energy:-7,reputation:2},result:'Инструменты нашли у перекупщика и вернули владельцу.'}
  ]}
];

export const ADVANCED_SPECIALIZATIONS_V08 = [
  {id:'hardware_master',name:'Мастер по железу',icon:'HW',reqLevel:5,desc:'+12% скорость ремонта и +7% шанс успеха.',bonus:{work:.12,success:.07}},
  {id:'sysadmin',name:'Системный администратор',icon:'SA',reqLevel:5,desc:'+15% к сетевым заказам и зарплате.',bonus:{salary:.15,network:.15}},
  {id:'developer',name:'Программист',icon:'DEV',reqLevel:5,desc:'+15% к обучению и программным заказам.',bonus:{study:.15,software:.15}},
  {id:'security',name:'Специалист по безопасности',icon:'SEC',reqLevel:7,desc:'+10% шанс успеха и дорогие контракты.',bonus:{success:.10,security:.20}},
  {id:'data_recovery',name:'Восстановление данных',icon:'DATA',reqLevel:7,desc:'+20% награды за восстановление и меньше риска на барахолке.',bonus:{income:.08,data:.20}},
  {id:'entrepreneur',name:'Предприниматель',icon:'CEO',reqLevel:8,desc:'+12% дохода бизнеса и дополнительный сотрудник.',bonus:{income:.12,business:.15}},
  {id:'universal',name:'Универсал',icon:'ALL',reqLevel:10,desc:'+5% ко всем основным направлениям.',bonus:{work:.05,study:.05,success:.05,income:.05}}
];

export const ENDINGS_V08 = [
  {id:'empire',title:'Основатель IT-империи',check:g=>(g.player.cash||0)>=10_000_000 && (g.business?.employees?.length||0)>=5},
  {id:'service_king',title:'Лучший мастер города',check:g=>(g.stats.ordersDone||0)>=250 && (g.business?.companyReputation||0)>=300},
  {id:'corporate',title:'Корпоративный эксперт',check:g=>(g.career.totalSalary||0)>=5_000_000 && (g.education.degreeSalaryBonus||0)>=.2},
  {id:'teacher',title:'Эксперт и преподаватель',check:g=>(g.stats.studiesCompleted||0)>=35 && Object.values(g.skills).filter(s=>s.level>=12).length>=4},
  {id:'collector',title:'Коллекционер ретротехники',check:g=>(g.stats.fleaFinds||0)>=80 && Object.keys(g.inventory||{}).length>=35},
  {id:'independent',title:'Независимый частный мастер',check:g=>(g.stats.ordersDone||0)>=100}
];
