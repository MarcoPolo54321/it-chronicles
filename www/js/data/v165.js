export const BUSINESS_STAGES_V165 = [
  {id:1,name:'Работа на дому',icon:'HOME',desc:'Один мастер, личные заказы и минимальные постоянные расходы.',upgradeCost:0,reqLevel:1,reqCompanyRep:0,maxEmployees:1,maxContracts:0,monthlyCost:0,orderBonus:0},
  {id:2,name:'Домашняя мастерская',icon:'ROOM',desc:'Отдельная зона для ремонта и первый помощник.',upgradeCost:35000,reqLevel:9,reqCompanyRep:10,maxEmployees:2,maxContracts:1,monthlyCost:2500,orderBonus:1},
  {id:3,name:'Арендованный офис',icon:'OFFICE',desc:'Приём клиентов, несколько сотрудников и первые корпоративные договоры.',upgradeCost:90000,reqLevel:11,reqCompanyRep:25,maxEmployees:4,maxContracts:2,monthlyCost:12000,orderBonus:2},
  {id:4,name:'Сервисная компания',icon:'FIRM',desc:'Полноценная команда, отделы и стабильные корпоративные проекты.',upgradeCost:220000,reqLevel:14,reqCompanyRep:55,maxEmployees:7,maxContracts:4,monthlyCost:28000,orderBonus:3},
  {id:5,name:'Региональная IT-фирма',icon:'HQ',desc:'Крупный офис, несколько направлений и сложные долгосрочные контракты.',upgradeCost:500000,reqLevel:17,reqCompanyRep:90,maxEmployees:10,maxContracts:6,monthlyCost:60000,orderBonus:4}
];

export const EMPLOYEE_TRAINING_PROGRAMS_V165 = [
  {id:'practice',name:'Практикум в мастерской',icon:'TOOL',costMult:.35,days:3,levelGain:.22,morale:3,skillGain:4,desc:'Недорогое обучение на текущих заказах.'},
  {id:'vendor',name:'Курс производителя',icon:'CERT',costMult:.7,days:7,levelGain:.5,morale:7,skillGain:9,desc:'Сертификация по технике и программам.'},
  {id:'college',name:'Отраслевой интенсив',icon:'EDU',costMult:1.15,days:14,levelGain:.85,morale:10,skillGain:15,desc:'Сильный рост квалификации и специализации.'},
  {id:'leadership',name:'Подготовка руководителя',icon:'LEAD',costMult:1.45,days:21,levelGain:.7,morale:12,skillGain:18,managementOnly:true,desc:'Управление командой, сроками и клиентами.'}
];

export const FINANCE_CATEGORY_LABELS_V165 = {
  salary:'Основная работа',
  orders:'Частные заказы',
  contracts:'Корпоративные контракты',
  advertising:'Реклама',
  education:'Обучение',
  taxes:'Банк',
  office:'Офис и помещение',
  payroll:'Зарплаты сотрудников',
  equipment:'Техника и инструменты',
  living:'Жильё и быт',
  bank:'Банк и кредиты',
  other_income:'Прочие доходы',
  other_expense:'Прочие расходы'
};

export const CLIENT_TYPE_LABELS_V165 = {
  home:{name:'Частный клиент',icon:'HOME',priority:'цена и понятное объяснение'},
  student:{name:'Студент',icon:'STU',priority:'низкая стоимость и скорость'},
  gamer:{name:'Геймер',icon:'GAME',priority:'производительность и качество'},
  small_biz:{name:'Малый бизнес',icon:'BIZ',priority:'сроки и надёжность'},
  medium_biz:{name:'Компания',icon:'CORP',priority:'документы, гарантия и стабильность'},
  corporate:{name:'Корпоративный клиент',icon:'HQ',priority:'качество, отчётность и поддержка'},
  enterprise:{name:'Крупная организация',icon:'ENT',priority:'репутация и минимальный риск'}
};
