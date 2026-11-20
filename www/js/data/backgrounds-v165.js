// v0.16.6: стартовое направление и визуальный профиль героя — независимые источники бонусов.
const background = (id, icon, name, desc, bonuses, perk) => ({ id, icon, name, desc, bonuses, perk });

export const STARTER_BACKGROUNDS_V163 = [
  background('hardware','','Железо','Сборка, апгрейд и комплектующие',[{skill:'hardware',amount:2},{skill:'repair',amount:1}],'Скидка на первые комплектующие'),
  background('software','','Софт','ОС, программы и разработка',[{skill:'software',amount:2},{skill:'data',amount:1}],'Быстрее осваивает программы'),
  background('networking','','Сети','Интернет, серверы и маршрутизация',[{skill:'networking',amount:2},{skill:'security',amount:1}],'Раньше открываются сетевые заявки'),
  background('repair','','Ремонт','Диагностика, пайка и восстановление',[{skill:'repair',amount:2},{skill:'hardware',amount:1}],'Больше опыта за ремонтные заказы'),
  background('security','','Безопасность','Антивирусы и защита систем',[{skill:'security',amount:2},{skill:'networking',amount:1}],'Лучше справляется с вирусами'),
  background('data','','Данные','Базы, диски и восстановление',[{skill:'data',amount:2},{skill:'software',amount:1}],'Раньше доступны задачи по данным'),
  background('communication','','Общение','Клиенты, переговоры и сервис',[{skill:'communication',amount:2},{skill:'management',amount:1}],'Быстрее растёт репутация'),
  background('management','','Управление','Команда, процессы и бизнес',[{skill:'management',amount:2},{skill:'communication',amount:1}],'Проще перейти к управлению')
];

export function starterBackgroundById(id) {
  return STARTER_BACKGROUNDS_V163.find((item) => item.id === id) || STARTER_BACKGROUNDS_V163[0];
}

export function applyStarterBackgroundBonuses(skills, id) {
  const item = starterBackgroundById(id);
  for (const bonus of item.bonuses || []) {
    if (!skills?.[bonus.skill]) continue;
    skills[bonus.skill].level = Math.max(0, Number(skills[bonus.skill].level || 0)) + Math.max(0, Number(bonus.amount || 0));
  }
  return skills;
}
