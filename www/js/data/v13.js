export const ORDER_TEST_PROTOCOLS_V13 = [
  { id:'quick', name:'Быстрый запуск', icon:'▶', energy:2, days:0, cost:0, quality:.05, desc:'Проверить включение и основные функции. Быстро, но скрытые дефекты можно пропустить.' },
  { id:'standard', name:'Стандартный тест', icon:'', energy:4, days:1, cost:0, quality:.14, desc:'Запуск, температура, нагрузка и повтор симптома. Оптимальный вариант для большинства заказов.' },
  { id:'full', name:'Полный прогон', icon:'▦', energy:7, days:2, cost:250, quality:.25, desc:'Длительный стресс-тест, проверка журналов и повторная диагностика. Дороже, но снижает гарантийные возвраты.' }
];

export const REPAIR_APPROACHES_V13 = [
  { id:'careful', name:'Аккуратный ремонт', icon:'◫', speed:.8, quality:.18, cost:.08, desc:'Больше времени на проверку и подготовку. Повышает качество и доверие клиента.' },
  { id:'balanced', name:'Стандартное решение', icon:'⇄', speed:1, quality:.08, cost:0, desc:'Сбалансированный подход без дополнительных расходов.' },
  { id:'economy', name:'Бюджетный ремонт', icon:'₽', speed:1.1, quality:-.10, cost:-.10, desc:'Экономия на времени и материалах. Прибыль выше, но возрастает риск возврата.' },
  { id:'premium', name:'Премиум-решение', icon:'◆', speed:.9, quality:.24, cost:.18, desc:'Лучшие материалы, профилактика и расширенное тестирование. Дороже, но клиент получает максимальный результат.' }
];

export const DEPARTMENTS_V13 = [
  { id:'reception', name:'Приёмка', icon:'▤', cost:45000, monthly:7000, reqLevel:8, reqLocation:'small_workshop', bonus:{slots:2,trust:.05}, desc:'Менеджер фиксирует симптомы, сроки и комплектность. Даёт дополнительные слоты и повышает доверие.' },
  { id:'repair', name:'Ремонтный отдел', icon:'', cost:90000, monthly:14000, reqLevel:12, reqLocation:'workshop', bonus:{work:.18,quality:.06}, desc:'Отдельные столы, инструменты и контроль качества ускоряют ремонт.' },
  { id:'field', name:'Выездная служба', icon:'⇢', cost:120000, monthly:18000, reqLevel:14, reqVehicle:'van', bonus:{onsite:.25,slots:2}, desc:'Курьер и выездной мастер обслуживают клиентов на месте.' },
  { id:'warehouse', name:'Складской отдел', icon:'▦', cost:80000, monthly:9000, reqLevel:10, reqLocation:'workshop', bonus:{discount:.05,restock:true}, desc:'Учёт деталей, минимальные остатки и автоматические закупки расходников.' },
  { id:'corporate', name:'Корпоративный отдел', icon:'▣', cost:260000, monthly:32000, reqLevel:20, reqLocation:'service_center', bonus:{contracts:2,reward:.12}, desc:'Работа с договорами, SLA и крупными организациями.' },
  { id:'marketing', name:'Рекламный отдел', icon:'◎', cost:160000, monthly:22000, reqLevel:16, reqLocation:'workshop', bonus:{leads:.2,reputation:.05}, desc:'Аналитика каналов, повторные клиенты и стабильный поток заявок.' },
  { id:'accounting', name:'Бухгалтерия', icon:'Σ', cost:140000, monthly:21000, reqLevel:16, reqLocation:'workshop', bonus:{tax:.12,credit:.15}, desc:'Контроль кредитов, вкладов и финансового результата.' }
];

export const AUTOMATION_RULES_V13 = [
  { id:'restock', name:'Автозакупка расходников', icon:'▦', department:'warehouse', desc:'Докупить термопасту, сжатый воздух и носители, когда остаток ниже установленного минимума.' },
  { id:'simple_apprentice', name:'Простые заказы — ученику', icon:'УЧ', department:'repair', desc:'Автоматически делегировать лёгкие заказы свободному ученику.' },
  { id:'network_sysadmin', name:'Сетевые задачи — системному администратору', icon:'SA', department:'repair', desc:'Сетевые и серверные заказы автоматически получает свободный системный администратор.' },
  { id:'warranty_priority', name:'Гарантии в приоритет', icon:'!', department:'reception', desc:'Гарантийные возвраты автоматически поднимаются в начало очереди.' },
  { id:'expensive_player', name:'Дорогие заказы оставить игроку', icon:'◆', department:'reception', desc:'Заказы дороже заданного порога не делегируются автоматически.' },
  { id:'auto_course', name:'Продолжать очередь обучения', icon:'EDU', department:null, desc:'После завершения курса автоматически запускать следующий пункт очереди.' }
];

export const EMPLOYEE_TRAITS_V13 = [
  { id:'meticulous', name:'Педант', icon:'', quality:.08, speed:-.04, desc:'Работает медленнее, но почти не допускает повторных дефектов.' },
  { id:'fast', name:'Шустрый', icon:'≫', speed:.12, quality:-.03, desc:'Быстро закрывает потоковые задачи.' },
  { id:'sociable', name:'Общительный', icon:'', trust:.08, desc:'Удерживает клиентов и чаще получает рекомендации.' },
  { id:'thrifty', name:'Бережливый', icon:'₽', cost:-.08, desc:'Снижает расход материалов и помогает экономить.' },
  { id:'mentor', name:'Наставник', icon:'+', training:.2, desc:'Ускоряет развитие остальных сотрудников.' },
  { id:'ambitious', name:'Амбициозный', icon:'↑', speed:.06, salaryGrowth:.12, desc:'Быстро растёт, но чаще просит повышение.' },
  { id:'unreliable', name:'Ненадёжный', icon:'?', quality:-.07, eventRisk:.12, desc:'Дешёвый специалист с повышенным риском ошибок и конфликтов.' }
];

export const MARKET_EVENTS_V13 = [
  { id:'crisis_2008', name:'Финансовый кризис', from:2008, to:2009, duration:7, categories:{cpu:1.2,gpu:1.25,mb:1.2}, reward:.86, desc:'Клиенты экономят, импортная техника дорожает.' },
  { id:'clearance', name:'Распродажа старых складов', from:2001, to:2010, duration:3, categories:{cpu:.82,gpu:.82,ram:.8,storage:.88}, desc:'Оптовики освобождают склад под новое поколение техники.' },
  { id:'currency_jump', name:'Скачок валютного курса', from:2000, to:2010, duration:4, categories:{cpu:1.18,gpu:1.22,mb:1.18,ram:1.15,storage:1.15}, desc:'Импортные комплектующие временно дорожают.' }
];

export const CHALLENGES_V13 = [
  { id:'million_2010', name:'Миллион до 2010', desc:'Накопите капитал 1 000 000 руб. до 2010 года.', reward:'Золотой калькулятор' },
  { id:'no_credit', name:'На свои', desc:'Завершите кампанию 2010 года, ни разу не взяв кредит.', reward:'Значок «На свои»' },
  { id:'perfect_service', name:'Идеальный сервис', desc:'Выполните 100 заказов и допустите не больше пяти провалов.', reward:'Платиновая отвёртка' },
  { id:'service_five_years', name:'Сервис за пять лет', desc:'Откройте полноценный сервисный центр до 2005 года.', reward:'Вывеска раннего предпринимателя' },
  { id:'solo_master', name:'Один в поле мастер', desc:'Выполните 150 заказов без найма сотрудников.', reward:'Кожаный чемодан мастера' },
  { id:'academic_path', name:'Красный диплом', desc:'Закончите вуз, пять языковых уровней и десять профессиональных курсов.', reward:'Настольная лампа профессора' },
  { id:'no_job_business', name:'Только своё дело', desc:'Постройте сервисный центр, не устраиваясь на постоянную работу.', reward:'Табличка «Сам себе начальник»' },
  { id:'flea_legend', name:'Легенда радиорынка', desc:'Восстановите 30 неисправных находок и заработайте на них 200 000 руб.', reward:'Редкий тестовый стенд' }
];

export const LEGACY_REWARDS_V13 = [
  { id:'starter_cash', name:'Стартовый капитал', icon:'₽', cost:1, max:5, desc:'+2 000 руб. в новой карьере за уровень.' },
  { id:'starter_skill', name:'Опыт прошлого', icon:'XP', cost:2, max:3, desc:'+1 уровень стартового профильного навыка.' },
  { id:'extra_slot', name:'Организованность', icon:'▤', cost:3, max:2, desc:'+1 слот активных заказов.' },
  { id:'fast_study', name:'Учебная привычка', icon:'EDU', cost:2, max:3, desc:'+8% скорости краткосрочного обучения.' },
  { id:'rare_tool', name:'Семейный инструмент', icon:'', cost:4, max:1, desc:'Начать карьеру с мультиметром и расширенным набором отвёрток.' },
  { id:'client_book', name:'Старая записная книжка', icon:'CL', cost:4, max:1, desc:'Первый постоянный клиент и +10 репутации на старте.' }
];

export const CHAPTER_REWARDS_V13 = [
  { id:'first_pc', reward:{cash:5000,reputation:10,legacy:1}, text:'Премия начинающему мастеру и первая рекомендация.' },
  { id:'internet', reward:{cash:25000,reputation:25,legacy:1}, text:'Репутация сетевого специалиста и доступ к крупным клиентам.' },
  { id:'service', reward:{cash:100000,reputation:50,legacy:2}, text:'Сервис признан одним из лучших в городе.' },
  { id:'business', reward:{cash:500000,reputation:100,legacy:2}, text:'Бренд мастерской стал известен за пределами района.' },
  { id:'empire', reward:{cash:2000000,reputation:200,legacy:3}, text:'Цифровая империя завершает кампанию на пике развития.' }
];

export const ERA_VISUAL_THEMES_V13 = [
  { from:2000,to:2002,id:'win98',label:'CRT и серый пластик' },
  { from:2003,to:2007,id:'xp',label:'Синий пластик и интернет-клубы' },
  { from:2008,to:2010,id:'aero',label:'Стекло, LCD и Windows 7' }
];

export const SOUND_PRESETS_V13 = [
  { id:'ui', name:'Интерфейс', frequency:560, duration:.045 },
  { id:'success', name:'Успех', frequency:760, duration:.09 },
  { id:'error', name:'Ошибка', frequency:190, duration:.12 },
  { id:'modem', name:'Модем', frequency:980, duration:.16 },
  { id:'cash', name:'Оплата', frequency:620, duration:.07 }
];
