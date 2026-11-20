export const EXTRA_EDUCATION_V07 = [
  {
    id:'college_operator_pc', name:'Техникум — оператор ЭВМ', icon:'ТЕХ', type:'college',
    fromYear:2000, cost:12000, academicYears:1, durationDays:360, repeatCount:1,
    reqLevel:2, reqSkills:{software:1}, skillGains:{software:3,hardware:2,communication:1},
    graduationBonus:{playerXp:650,reputation:55,salaryBonus:.08},
    desc:'Один полный игровой год: устройство ПК, офисные программы, печать, обслуживание учебного класса.'
  },
  {
    id:'college_radio_tech', name:'Радиотехнический техникум', icon:'РТ', type:'college',
    fromYear:2000, cost:24000, academicYears:2, durationDays:720, repeatCount:1,
    reqLevel:3, reqSkills:{hardware:2}, skillGains:{hardware:4,repair:4,software:1},
    graduationBonus:{playerXp:950,reputation:80,salaryBonus:.12},
    desc:'Два игровых года: электроника, схемотехника, пайка и диагностика компьютерных плат.'
  },
  {
    id:'college_telecom', name:'Колледж связи — сети и телекоммуникации', icon:'СВ', type:'college',
    fromYear:2001, cost:30000, academicYears:2, durationDays:720, repeatCount:1,
    reqLevel:4, reqSkills:{networking:1}, skillGains:{networking:5,hardware:2,communication:1},
    graduationBonus:{playerXp:1000,reputation:90,salaryBonus:.13},
    desc:'Два игровых года: телефония, локальные сети, модемы, кабельные системы и серверные.'
  },
  {
    id:'college_programmer', name:'Колледж — программное обеспечение вычислительной техники', icon:'ПО', type:'college',
    fromYear:2001, cost:36000, academicYears:3, durationDays:1080, repeatCount:1,
    reqLevel:5, reqSkills:{software:2}, skillGains:{software:5,data:2,management:1},
    graduationBonus:{playerXp:1350,reputation:115,salaryBonus:.16},
    desc:'Три игровых года: Pascal, C, базы данных, алгоритмы и дипломный проект.'
  }
];

export const LONG_PROGRAM_OVERRIDES_V07 = {
  uni_prep_math: { type:'lecture', durationDays:90, academicYears:0, reqLevel:2, cost:1200 },
  uni_it_faculty: { type:'university', durationDays:1440, academicYears:4, reqLevel:7, cost:120000,
    graduationBonus:{playerXp:1500,reputation:150,salaryBonus:.20} },
  uni_radio_evening: { type:'college', durationDays:360, academicYears:1, reqLevel:4, cost:28000,
    graduationBonus:{playerXp:800,reputation:70,salaryBonus:.10} }
};
