export const ORDER_DEADLINES_V169 = Object.freeze({
  urgent: { min: 7, max: 10 },
  warranty: 14,
  corporate: 30,
  standard: Object.freeze({ easy:14, medium:18, hard:21, epic:30 })
});

export const LIFESTYLE_PLANS_V169 = Object.freeze([
  { id:'economy', name:'Домашняя еда из запасов', icon:'', asset:'./assets/ui-v171/rest/economy.webp', dailyCost:0, energyRecovery:0, moodRecovery:-0.15, funRecovery:-0.1, healthRecovery:0, desc:'Никаких ежедневных расходов, но питание однообразное и почти не помогает восстановлению.' },
  { id:'snack', name:'Кафе / перекус', icon:'', asset:'./assets/ui-v168/rest/cafe.webp', dailyCost:60, energyRecovery:1, moodRecovery:.25, funRecovery:.1, healthRecovery:0, desc:'Один недорогой перекус в течение дня.' },
  { id:'canteen', name:'Обед в заводской столовой', icon:'', asset:'./assets/ui-v171/rest/canteen.webp', dailyCost:120, energyRecovery:2, moodRecovery:.35, funRecovery:.15, healthRecovery:.08, desc:'Один полноценный обед в столовой за игровой день.' },
  { id:'grill', name:'Обед в шашлычной', icon:'', asset:'./assets/ui-v171/rest/grill.webp', dailyCost:300, energyRecovery:2.5, moodRecovery:.7, funRecovery:.3, healthRecovery:.05, desc:'Сытный обед, который заметно поднимает настроение.' },
  { id:'restaurant_budget', name:'Недорогой ресторан', icon:'', asset:'./assets/ui-v171/rest/restaurant_budget.webp', dailyCost:700, energyRecovery:3, moodRecovery:1, funRecovery:.45, healthRecovery:.12, desc:'Один поход в недорогой ресторан за игровой день.' },
  { id:'restaurant_good', name:'Хороший ресторан', icon:'', asset:'./assets/ui-v171/rest/restaurant_good.webp', dailyCost:1200, energyRecovery:4, moodRecovery:1.5, funRecovery:.7, healthRecovery:.2, desc:'Полноценный поход в хороший ресторан. Дорого, но эффективно.' },
  { id:'delivery', name:'Доставка еды домой', icon:'▣', asset:'./assets/ui-v171/rest/delivery.webp', dailyCost:900, energyRecovery:5, moodRecovery:1.2, funRecovery:.55, healthRecovery:.18, speedBonus:.05, desc:'Одна доставка на день. Экономит время и немного ускоряет работу и обучение.' }
]);

export const CAREER_SKILL_MATRIX_V169 = Object.freeze({
  hardware:      { hardware:5, repair:2, software:1, networking:.5, security:.5, data:.5, communication:.5, management:.25 },
  software:      { software:5, data:2, security:1, networking:1, communication:.75, management:.5, hardware:.5, repair:.25 },
  networking:    { networking:5, security:2, software:2, hardware:1, data:1, communication:.75, management:.5, repair:.5 },
  repair:        { repair:5, hardware:2, communication:1.5, data:1, software:1, networking:.5, security:.5, management:.25 },
  security:      { security:5, networking:2, software:2, data:1, communication:1, management:.5, hardware:.5, repair:.25 },
  data:          { data:5, software:2, security:1, management:1, communication:.75, networking:.5, hardware:.25, repair:.25 },
  communication: { communication:5, management:2, software:1, data:1, security:.5, networking:.5, hardware:.25, repair:.25 },
  management:    { management:5, communication:2, data:1.5, security:.75, networking:.75, software:.75, hardware:.5, repair:.25 }
});

export const RELATED_ORDER_SKILLS_V169 = Object.freeze({
  hardware:['repair','software'],
  software:['data','security'],
  networking:['security','software'],
  repair:['hardware','communication'],
  security:['networking','data'],
  data:['software','security'],
  communication:['management','software'],
  management:['communication','data']
});
