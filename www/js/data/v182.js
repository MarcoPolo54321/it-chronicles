export const CLIENT_ARCHETYPES_V182 = Object.freeze([
  { id:'economical', name:'Экономный', desc:'Чувствителен к цене, чаще выбирает экономную смету.', priceSensitivity:1.18, acceptanceBonus:.08, trustGain:1, reviewStrictness:.05 },
  { id:'demanding', name:'Требовательный', desc:'Платит больше, но ждёт высокого качества и полного тестирования.', priceSensitivity:.86, acceptanceBonus:-.03, trustGain:2, reviewStrictness:.28, payMult:1.12 },
  { id:'impatient', name:'Нетерпеливый', desc:'Ценит скорость, хуже переносит задержки и долгие этапы.', priceSensitivity:1, acceptanceBonus:.02, trustGain:1, reviewStrictness:.18, patienceMult:.72 },
  { id:'loyal', name:'Лояльный', desc:'Чаще возвращается и прощает небольшие ошибки.', priceSensitivity:.92, acceptanceBonus:.07, trustGain:3, reviewStrictness:-.12, repeatBonus:.16 },
  { id:'corporate', name:'Корпоративный', desc:'Даёт крупные заказы, требует сроки, отчётность и надёжность.', priceSensitivity:.78, acceptanceBonus:-.05, trustGain:2, reviewStrictness:.22, payMult:1.18 },
  { id:'referrer', name:'Рекомендующий', desc:'При высоком качестве чаще приводит новых клиентов.', priceSensitivity:.98, acceptanceBonus:.03, trustGain:2, reviewStrictness:.02, referralBonus:.22 }
]);

export const SPECIALIZATION_PERKS_V182 = Object.freeze({
  hardware:{ name:'Эксперт по железу', desc:'Скидка 5% на комплектующие для сборки и выше качество аппаратных заказов.', skill:'hardware', orderBonus:.04, costDiscount:.05 },
  software:{ name:'Системный специалист', desc:'Программные заказы требуют меньше энергии и дают больше опыта.', skill:'software', orderBonus:.04, energyDiscount:.08 },
  networking:{ name:'Сетевой инженер', desc:'Сетевые проекты быстрее проходят этап диагностики и дают больше репутации.', skill:'networking', orderBonus:.05, reputationBonus:.12 },
  repair:{ name:'Мастер ремонта', desc:'Снижен риск повторной поломки после ремонта.', skill:'repair', orderBonus:.05, warrantyRisk:-.06 },
  security:{ name:'Специалист по безопасности', desc:'Открывает дополнительные безопасные решения событий и повышает качество аудитов.', skill:'security', orderBonus:.05, eventBonus:1 },
  data:{ name:'Восстановитель данных', desc:'Заказы по данным дают больше оплаты, а риск провала снижен.', skill:'data', orderBonus:.05, incomeBonus:.08 },
  communication:{ name:'Переговорщик', desc:'Клиенты чаще принимают дорогие сметы и быстрее накапливают доверие.', skill:'communication', quoteBonus:.08, trustBonus:1 },
  management:{ name:'Организатор', desc:'Сотрудники медленнее устают, а рабочие места используются эффективнее.', skill:'management', employeeFatigue:-.12, capacityBonus:1 }
});

export const AD_AUDIENCE_HINTS_V182 = Object.freeze({
  'Доски объявлений':{ audience:'частные клиенты', feature:'низкая стоимость обращения, но слабая точность', clientBias:'student' },
  'Печатная реклама':{ audience:'домашние пользователи', feature:'ровный и предсказуемый поток заявок', clientBias:'home' },
  'Поиск и каталоги':{ audience:'клиенты с конкретной проблемой', feature:'высокая конверсия и более дорогой заказ', clientBias:'freelancer' },
  'IT-порталы':{ audience:'продвинутые пользователи и компании', feature:'сложные заказы и высокий порог ожиданий', clientBias:'small_biz' },
  'Баннерные сети':{ audience:'широкая аудитория', feature:'много обращений, но низкая точность', clientBias:'home' }
});

export const RELEASE_GOALS_V182 = Object.freeze([
  { id:'accept_order', title:'Принять первый заказ', desc:'Откройте вкладку заказов и выберите доступную заявку.', target:'orders' },
  { id:'finish_order', title:'Завершить первый заказ', desc:'Пройдите диагностику, ремонт и тестирование.', target:'orders' },
  { id:'buy_item', title:'Купить материал или инструмент', desc:'Используйте магазин мастерской или помощник закупки.', target:'workshop' },
  { id:'study', title:'Пройти обучение', desc:'Получите временные знания или начните формальное образование.', target:'education' },
  { id:'advertise', title:'Запустить рекламу', desc:'Проверьте, сколько обращений и заказов принесёт площадка.', target:'advertising' },
  { id:'rest', title:'Восстановить энергию', desc:'Выберите отдых и проверьте влияние на состояние героя.', target:'rest' }
]);

export const RELEASE_BALANCE_V182 = Object.freeze({
  emergencyCashThreshold:1200,
  emergencyEnergyThreshold:15,
  emergencyCooldownDays:7,
  emergencyReward:650,
  emergencyEnergyCost:8,
  emergencyRestGain:28,
  beginnerOrderReward:[320,520]
});
