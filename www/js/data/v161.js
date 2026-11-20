// v0.16.1: transparent career ladder and ten company branches for the 2000–2010 campaign.

export const BUSINESS_TYPES_V161 = [
  {id:'service_repair',name:'Компьютерный сервис и ремонт',icon:'SRV',desc:'Диагностика, ремонт, апгрейд и выезд к клиентам.',clients:'Частные лица и небольшие офисы',reqLevel:8,reqRep:30,cost:25000,reqSkills:{repair:6,hardware:5},perks:{orderSlots:1,reward:.05}},
  {id:'pc_builder',name:'Сборка и продажа ПК',icon:'PC',desc:'Компьютеры под бюджет, тестирование, настройка и гарантия.',clients:'Геймеры, семьи, студенты и офисы',reqLevel:8,reqRep:35,cost:40000,reqSkills:{hardware:6,repair:4},perks:{reward:.08,quality:.03}},
  {id:'network_admin',name:'Локальные сети и администрирование',icon:'NET',desc:'Кабельные сети, серверы, модемы и абонентское обслуживание.',clients:'Офисы, классы и интернет-кафе',reqLevel:9,reqRep:40,cost:55000,reqSkills:{networking:6,security:4},perks:{contracts:1,reward:.08}},
  {id:'web_studio',name:'Веб-студия',icon:'WEB',desc:'Сайты-визитки, баннеры, каталоги и первые веб-приложения.',clients:'Магазины, кафе и предприниматели',reqLevel:8,reqRep:35,cost:30000,reqSkills:{software:6,communication:4},perks:{premium:.05,reward:.06}},
  {id:'training_center',name:'Компьютерные курсы',icon:'EDU',desc:'Windows, Office, Интернет, 1С и занятия для детей.',clients:'Взрослые, школьники и компании',reqLevel:8,reqRep:40,cost:45000,reqSkills:{communication:6,management:4,software:3},perks:{reputation:.08,education:.08}},
  {id:'isp',name:'Районный интернет-провайдер',icon:'ISP',desc:'Домовые сети, подключение квартир и ежемесячная абонплата.',clients:'Жильцы домов и малые организации',reqLevel:11,reqRep:80,cost:180000,reqSkills:{networking:7,management:6},perks:{contracts:2,reward:.12}},
  {id:'software_shop',name:'Магазин программ и игр',icon:'CD',desc:'Лицензионное ПО, игры, драйверы и полезные сборники.',clients:'Домашние пользователи и малые фирмы',reqLevel:8,reqRep:45,cost:70000,reqSkills:{software:5,communication:6},perks:{reward:.06,orderSlots:1}},
  {id:'it_outsource',name:'IT-аутсорсинг для бизнеса',icon:'OUT',desc:'Полное обслуживание компьютеров, сетей и учётных систем.',clients:'Магазины, аптеки и небольшие компании',reqLevel:10,reqRep:50,cost:60000,reqSkills:{hardware:5,software:5,networking:5,management:5},perks:{contracts:2,reward:.10}},
  {id:'web_support',name:'Поддержка интернет-проектов',icon:'SUP',desc:'Хостинг, скрипты, обновление контента и защита сайтов.',clients:'Интернет-магазины, порталы и форумы',reqLevel:9,reqRep:45,cost:50000,reqSkills:{software:6,security:5,data:4},perks:{premium:.08,reward:.08}},
  {id:'data_recovery',name:'Восстановление данных',icon:'DATA',desc:'Повреждённые диски, удалённые файлы и файловые системы.',clients:'Частные лица и организации',reqLevel:10,reqRep:55,cost:80000,reqSkills:{data:7,repair:5},perks:{reward:.15,quality:.05}}
];

export const CAREER_TIERS_V161 = [
  {id:1,name:'Стажёр / помощник',range:'навыки 0–2',desc:'Первые задачи под контролем старших.'},
  {id:2,name:'Младший специалист',range:'навыки 3–4',desc:'Самостоятельные типовые работы.'},
  {id:3,name:'Инженер / ведущий техник',range:'навыки 5–6',desc:'Сложные системы и ответственность за результат.'},
  {id:4,name:'Руководитель направления',range:'навыки 7–8',desc:'Команда, бюджет и архитектурные решения.'},
  {id:5,name:'Топ-менеджер / собственник',range:'навыки 9–10',desc:'Стратегия, крупные бюджеты и бизнес.'}
];

const job=(id,name,careerTier,salary,reqLevel,reqSkills,desc,icon='JOB',fromYear=2000)=>({id,name,careerTier,salary,reqLevel,reqSkills,desc,icon,fromYear,toYear:2010,salaryGrowthPerYear:Math.max(200,Math.round(salary*.08))});
export const CAREER_JOBS_V161 = [
  job('student','Студент / помощник',1,200,1,{},'Учёба и мелкие поручения. Слабый доход, но доступна с самого начала.','ST'),
  job('courier_pc_shop','Курьер в компьютерном салоне',1,2500,1,{},'Доставка комплектующих по городу и знакомство с рынком.','CR'),
  job('workshop_intern','Стажёр в мастерской',1,3200,1,{hardware:1},'Чистка системников, установка Windows и помощь мастеру.','IN'),
  job('computer_lab_assistant','Лаборант компьютерного класса',1,3500,1,{software:1},'Контроль техники, простая сеть и порядок в классе.','LB'),
  job('pc_assembler_basic','Сборщик ПК по спецификации',1,4200,2,{hardware:2},'Сборка готовых конфигураций и установка драйверов.','PC'),

  job('service_center_master','Мастер сервис-центра',2,8500,4,{hardware:3,repair:3},'Диагностика, замена деталей и типовой ремонт.','RM',2001),
  job('small_office_admin','Сетевой администратор малого офиса',2,9500,4,{networking:3,software:2},'Локальная сеть, общий интернет и рабочие станции.','SA',2001),
  job('isp_support_tech','Техник поддержки провайдера',2,9000,4,{networking:3,communication:2},'Подключение клиентов, модемы и выездные заявки.','ISP',2001),
  job('junior_programmer','Программист-стажёр',2,10000,4,{software:4},'Простые модули на Pascal, Delphi или C++.','DEV',2001),
  job('small_db_admin','Администратор БД небольшой фирмы',2,10500,4,{data:3,software:2},'Резервные копии, таблицы и базовое сопровождение.','DB',2001),

  job('lead_service_master','Ведущий мастер сервис-центра',3,18000,7,{repair:6,hardware:5},'Сложные неисправности, пайка и гарантийные случаи.','LR',2003),
  job('enterprise_sysadmin','Системный администратор крупной компании',3,24000,7,{networking:6,software:5,security:3},'Windows Server, домен, VPN и резервирование.','SYS',2003),
  job('software_developer','Программист-разработчик',3,26000,7,{software:6,data:3},'Коммерческие проекты на Java, C++ и Perl.','DEV',2003),
  job('enterprise_dba','Администратор БД крупной компании',3,28000,7,{data:6,software:4},'Проектирование, оптимизация запросов и репликация.','DBA',2003),
  job('security_engineer','Специалист по информационной безопасности',3,30000,8,{security:6,networking:4},'Антивирусы, фаерволы, аудит и инциденты.','SEC',2004),
  job('telecom_support_engineer','Инженер поддержки в телекоме',3,27000,7,{networking:6,hardware:3},'Cisco, маршрутизация и поддержка крупных клиентов.','TEL',2003),
  job('computer_courses_teacher','Преподаватель компьютерных курсов',3,19000,7,{communication:6,software:4},'Обучение детей и взрослых работе на ПК.','EDU',2002),

  job('service_department_head','Руководитель отдела сервиса',4,45000,11,{repair:8,management:7,communication:5},'Команда мастеров, качество и рекламации.','HEAD',2005),
  job('it_department_head','Руководитель IT-отдела',4,55000,11,{networking:8,management:7,software:6},'Инфраструктура, бюджет и развитие отдела.','CIO',2005),
  job('software_architect','Ведущий разработчик / архитектор ПО',4,60000,11,{software:8,data:6,management:5},'Архитектура систем и технические решения.','ARCH',2005),
  job('security_department_head','Руководитель отдела ИБ',4,65000,12,{security:8,management:7,networking:6},'Политики безопасности, аудит и команда.','CISO',2006),
  job('it_business_development','Директор по развитию IT-компании',4,70000,12,{management:8,communication:8,software:4},'Новые направления, продажи и бизнес-процессы.','BD',2006),

  job('cto','Технический директор (CTO)',5,110000,16,{management:10,software:9,networking:8},'Техническая стратегия компании и управление R&D.','CTO',2008),
  job('it_company_owner','Генеральный директор IT-компании',5,140000,17,{management:10,communication:9},'Стратегия, финансы, продажи и ответственность за бизнес.','CEO',2008),
  job('large_it_department_head','Руководитель крупного IT-департамента',5,125000,16,{management:10,networking:9,security:7},'Управление большим штатом и крупными бюджетами.','DIR',2008)
];

const order=(id,businessType,name,skills,rewardBase,xp,desc,extra={})=>({id:`v161_${id}`,businessType,name,icon:extra.icon||'BIZ',clientTier:extra.clientTier||'small_biz',diff:extra.diff||'hard',fromYear:extra.fromYear||2000,toYear:2010,minRep:extra.minRep||0,rewardBase,xp,energy:extra.energy||18,time:extra.time||5,skills,skillXP:Object.fromEntries(Object.entries(skills).map(([k,v])=>[k,Math.max(20,v*10)])),rep:extra.rep||10,chance:extra.chance||.86,onSite:Boolean(extra.onSite),items:extra.items||[],desc});
export const COMPANY_ORDER_TEMPLATES_V161 = [
  order('repair_office','service_repair','Срочный ремонт офисного ПК',{repair:6,hardware:5},[5000,11000],95,'Сложная диагностика и восстановление рабочего места.',{onSite:true,icon:'SRV'}),
  order('repair_batch','service_repair','Партия компьютеров после скачка напряжения',{repair:7,hardware:6},[12000,26000],150,'Несколько машин требуют диагностики и замены блоков питания.',{diff:'epic',icon:'SRV'}),
  order('builder_home','pc_builder','Домашний компьютер под ключ',{hardware:6,repair:4},[8000,16000],110,'Подбор, сборка, тестирование и установка программ.',{icon:'PC'}),
  order('builder_gaming','pc_builder','Игровая машина для клуба',{hardware:7,repair:5},[18000,38000],180,'Производительная конфигурация с тестированием стабильности.',{diff:'epic',icon:'PC'}),
  order('network_office','network_admin','Локальная сеть малого офиса',{networking:6,security:4},[10000,22000],140,'Кабели, свитч, общий доступ и защита рабочих станций.',{onSite:true,icon:'NET'}),
  order('network_cafe','network_admin','Сеть интернет-кафе',{networking:7,security:5},[22000,45000],200,'Сервер, маршрутизация и устойчивость под высокой нагрузкой.',{diff:'epic',onSite:true,icon:'NET'}),
  order('web_card','web_studio','Сайт-визитка компании',{software:6,communication:4},[7000,15000],110,'Пять страниц, форма связи и регистрация в каталогах.',{icon:'WEB'}),
  order('web_shop','web_studio','Каталог интернет-магазина',{software:7,data:5,communication:5},[18000,42000],190,'Каталог товаров, база данных и панель обновления.',{diff:'epic',icon:'WEB'}),
  order('training_office','training_center','Обучение сотрудников Office',{communication:6,software:4},[9000,18000],120,'Группа сотрудников осваивает Word, Excel и Интернет.',{onSite:true,icon:'EDU'}),
  order('training_children','training_center','Курс программирования для школьников',{communication:7,software:5,management:4},[14000,28000],160,'Набор группы, программа занятий и итоговый проект.',{icon:'EDU'}),
  order('isp_house','isp','Подключение жилого дома',{networking:7,management:6},[30000,65000],240,'Магистраль, коммутаторы и десятки абонентов.',{diff:'epic',onSite:true,icon:'ISP'}),
  order('isp_block','isp','Расширение районной сети',{networking:8,management:7,security:5},[60000,120000],320,'Новый квартал, резервирование и круглосуточная поддержка.',{diff:'epic',onSite:true,icon:'ISP'}),
  order('software_bundle','software_shop','Комплект лицензионного ПО для офиса',{software:5,communication:6},[9000,19000],110,'Подбор лицензий, установка и обучение пользователей.',{icon:'CD'}),
  order('game_shop','software_shop','Поставка игр для компьютерного клуба',{software:6,communication:6},[16000,32000],150,'Лицензии, установка, обновления и настройка сети.',{icon:'CD'}),
  order('outsource_shop','it_outsource','Абонентское обслуживание магазина',{hardware:5,software:5,networking:5},[12000,26000],160,'Касса, складской учёт, сеть и рабочие станции.',{onSite:true,icon:'OUT'}),
  order('outsource_chain','it_outsource','Поддержка сети аптек',{hardware:6,software:6,networking:6,management:5},[35000,75000],260,'Несколько точек, единые стандарты и срочные выезды.',{diff:'epic',onSite:true,icon:'OUT'}),
  order('support_portal','web_support','Поддержка новостного портала',{software:6,security:5,data:4},[12000,28000],155,'Обновления, резервные копии и устранение сбоев.',{icon:'SUP'}),
  order('support_shop','web_support','Защита интернет-магазина',{software:7,security:7,data:5},[26000,56000],230,'Аудит, исправление уязвимостей и резервирование базы.',{diff:'epic',icon:'SUP'}),
  order('recover_photos','data_recovery','Восстановление семейного архива',{data:7,repair:5},[10000,25000],170,'Повреждённый диск и критически важные фотографии.',{icon:'DATA'}),
  order('recover_company','data_recovery','Восстановление базы предприятия',{data:8,repair:6,security:5},[35000,90000],300,'Сбой массива, повреждённые файлы и жёсткий срок.',{diff:'epic',icon:'DATA'})
];

export const COMPANY_EMPLOYEE_TEMPLATES_V161 = [
  {id:'v161_repair_master',name:'Мастер по ремонту',icon:'RM',salary:11000,reqLevel:8,speed:1.08,quality:.07,businessTypes:['service_repair','pc_builder','data_recovery'],desc:'Диагностика, пайка и сложные аппаратные работы.'},
  {id:'v161_pc_assembler',name:'Сборщик и тестировщик ПК',icon:'PC',salary:10000,reqLevel:8,speed:1.12,quality:.05,businessTypes:['pc_builder','software_shop'],desc:'Собирает конфигурации и проводит тесты стабильности.'},
  {id:'v161_network_engineer',name:'Сетевой инженер',icon:'NET',salary:15000,reqLevel:9,speed:1.08,quality:.08,businessTypes:['network_admin','isp','it_outsource'],desc:'Монтаж, маршрутизация и поддержка сетей.'},
  {id:'v161_web_developer',name:'Веб-разработчик',icon:'WEB',salary:17000,reqLevel:9,speed:1.02,quality:.08,businessTypes:['web_studio','web_support'],desc:'Сайты, скрипты и базы данных.'},
  {id:'v161_teacher',name:'Преподаватель компьютерных курсов',icon:'EDU',salary:12000,reqLevel:8,speed:.75,quality:.06,businessTypes:['training_center'],desc:'Ведёт группы и повышает качество обучения.'},
  {id:'v161_sales_manager',name:'Менеджер по продажам',icon:'SALE',salary:13000,reqLevel:8,speed:.35,quality:.03,businessTypes:['software_shop','pc_builder','training_center'],desc:'Привлекает клиентов и помогает закрывать сделки.'},
  {id:'v161_support_engineer',name:'Инженер техподдержки',icon:'SUP',salary:14000,reqLevel:9,speed:1.0,quality:.06,businessTypes:['it_outsource','web_support','isp'],desc:'Обрабатывает обращения и поддерживает клиентов.'},
  {id:'v161_security_engineer',name:'Инженер по безопасности',icon:'SEC',salary:19000,reqLevel:10,speed:.9,quality:.12,businessTypes:['network_admin','web_support','it_outsource'],desc:'Аудит, защита и реагирование на инциденты.'},
  {id:'v161_data_engineer',name:'Специалист по восстановлению данных',icon:'DATA',salary:20000,reqLevel:10,speed:.82,quality:.15,businessTypes:['data_recovery','it_outsource'],desc:'Работает с носителями и критичными файлами.'},
  {id:'v161_operations_manager',name:'Операционный менеджер',icon:'OPS',salary:18000,reqLevel:10,speed:.3,quality:.05,businessTypes:BUSINESS_TYPES_V161.map(item=>item.id),desc:'Планирует загрузку команды, сроки и расходы.'}
];

export const COMPANY_CONTRACT_TEMPLATES_V161 = [
  {id:'v161_contract_service',businessType:'service_repair',name:'Абонентский ремонт офиса',icon:'SRV',fromYear:2000,minRep:45,monthly:14000,load:2,months:12,skills:{repair:6,hardware:5},desc:'Регулярная диагностика и срочные ремонты.'},
  {id:'v161_contract_builder',businessType:'pc_builder',name:'Поставка компьютеров учебному центру',icon:'PC',fromYear:2001,minRep:50,monthly:18000,load:2,months:10,skills:{hardware:6,repair:4},desc:'Сборка, настройка и гарантийное обслуживание.'},
  {id:'v161_contract_network',businessType:'network_admin',name:'Поддержка сети бизнес-центра',icon:'NET',fromYear:2002,minRep:60,monthly:26000,load:3,months:18,skills:{networking:6,security:4},desc:'Сеть, серверы и устранение аварий.'},
  {id:'v161_contract_web',businessType:'web_studio',name:'Серия сайтов для торговой сети',icon:'WEB',fromYear:2001,minRep:55,monthly:22000,load:2,months:12,skills:{software:6,communication:4},desc:'Новые страницы, баннеры и обновление контента.'},
  {id:'v161_contract_training',businessType:'training_center',name:'Корпоративное обучение персонала',icon:'EDU',fromYear:2000,minRep:55,monthly:20000,load:2,months:12,skills:{communication:6,management:4},desc:'Регулярные группы по Windows и Office.'},
  {id:'v161_contract_isp',businessType:'isp',name:'Домовая сеть микрорайона',icon:'ISP',fromYear:2002,minRep:100,monthly:65000,load:5,months:24,skills:{networking:7,management:6},desc:'Сотни абонентов и круглосуточная эксплуатация.'},
  {id:'v161_contract_software',businessType:'software_shop',name:'Поставка ПО малому бизнесу',icon:'CD',fromYear:2001,minRep:60,monthly:24000,load:2,months:12,skills:{software:5,communication:6},desc:'Лицензии, обновления и консультации.'},
  {id:'v161_contract_outsource',businessType:'it_outsource',name:'Полный IT-аутсорсинг сети магазинов',icon:'OUT',fromYear:2002,minRep:70,monthly:42000,load:4,months:18,skills:{hardware:5,software:5,networking:5,management:5},desc:'Единая поддержка техники, сетей и учёта.'},
  {id:'v161_contract_support',businessType:'web_support',name:'Техподдержка интернет-магазина',icon:'SUP',fromYear:2002,minRep:65,monthly:30000,load:3,months:18,skills:{software:6,security:5,data:4},desc:'Хостинг, обновления, резервные копии и защита.'},
  {id:'v161_contract_data',businessType:'data_recovery',name:'Резервное восстановление для юрлиц',icon:'DATA',fromYear:2002,minRep:80,monthly:38000,load:3,months:12,skills:{data:7,repair:5},desc:'Приоритетное восстановление критичных данных.'}
];

export function businessTypeById(id){return BUSINESS_TYPES_V161.find(item=>item.id===id)||BUSINESS_TYPES_V161[0];}
