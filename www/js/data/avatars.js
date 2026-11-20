export const HERO_ERA_STAGES = [
  { id:'2000', from:2000, to:2009, label:'Нулевые' },
  { id:'2010', from:2010, to:Infinity, label:'Финал 2010' }
];

const bonus = (skill, amount = 1) => ({ skill, amount });

const avatar = (id, name, desc, short, bonuses = []) => ({
  id,
  name,
  desc,
  short,
  bonuses,
  file:`./assets/avatars/heroes/${id}/2000.webp`,
  files:{
    2000:`./assets/avatars/heroes/${id}/2000.webp`,
    2010:`./assets/avatars/heroes/${id}/2010.webp`
  }
});

export const HERO_AVATARS = [
  avatar('classic', 'Домашний энтузиаст', 'Начал с домашнего компьютера и быстро учится общаться с клиентами.', 'CL', [bonus('software'), bonus('communication')]),
  avatar('engineer', 'Инженер-сборщик', 'Понимает комплектующие и не боится сложного ремонта.', 'EN', [bonus('hardware'), bonus('repair')]),
  avatar('sysadmin', 'Системный администратор', 'Следит за рабочими станциями, сетями и стабильностью системы.', 'SA', [bonus('networking'), bonus('software')]),
  avatar('networker', 'Сетевик', 'Модемы, кабели и локальные сети — его естественная среда.', 'NT', [bonus('networking'), bonus('communication')]),
  avatar('coder', 'Разработчица', 'Любит софт, скрипты и аккуратную работу с данными.', 'CD', [bonus('software'), bonus('data')]),
  avatar('retro_hacker', 'Ретро-хакер', 'Ищет слабые места в старых системах и знает их изнутри.', 'RH', [bonus('security'), bonus('software')]),
  avatar('administrator', 'Будущий руководитель', 'Умеет договариваться, организовывать людей и держать процесс под контролем.', 'AD', [bonus('management'), bonus('communication')]),
  avatar('operator', 'Оператор ПК', 'Быстро осваивает программы и спокойно работает с клиентскими задачами.', 'OP', [bonus('software'), bonus('communication')]),
  avatar('technician', 'Выездной техник', 'Настраивает рабочие места и разбирается в подключении техники.', 'TC', [bonus('hardware'), bonus('networking')]),
  avatar('service_master', 'Сервисный мастер', 'Чинит периферию и умеет объяснить клиенту, что произошло.', 'SM', [bonus('repair'), bonus('communication')]),
  avatar('electronics', 'Радиотехник', 'Паяльник, платы и точная диагностика — его сильные стороны.', 'EL', [bonus('repair'), bonus('hardware')]),
  avatar('laptop_specialist', 'Мобильный специалист', 'Работает с ноутбуками, операционными системами и портативной техникой.', 'NB', [bonus('hardware'), bonus('software')]),
  avatar('upgrader', 'Апгрейдер', 'Знает, какие комплектующие дадут максимум производительности и надёжности.', 'UP', [bonus('hardware'), bonus('data')])
];

export function heroAvatarById(id) {
  return HERO_AVATARS.find((item) => item.id === id) || HERO_AVATARS[0];
}

export function heroAvatarEra(year = 2000) {
  const safeYear = Number.isFinite(Number(year)) ? Number(year) : 2000;
  return HERO_ERA_STAGES.find((stage) => safeYear >= stage.from && safeYear <= stage.to) || HERO_ERA_STAGES[0];
}

export function heroAvatarFile(id, year = 2000) {
  const item = heroAvatarById(id);
  const stage = heroAvatarEra(year);
  if (item.files?.[stage.id]) return item.files[stage.id];

  const stageIndex = HERO_ERA_STAGES.findIndex((entry) => entry.id === stage.id);
  for (let index = stageIndex; index >= 0; index -= 1) {
    const candidate = item.files?.[HERO_ERA_STAGES[index].id];
    if (candidate) return candidate;
  }
  return item.file || HERO_AVATARS[0].file;
}
