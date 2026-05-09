export const BRANCH_IDS = {
  MAIN: '00000000-0000-4000-a000-000000000001',
  SOUTH: '00000000-0000-4000-a000-000000000002',
} as const;

export const CATEGORY_IDS = {
  DETAILING: 'c0000000-0001-4000-a000-000000000005',
  POLISHING: 'c0000000-0001-4000-a000-000000000002',
  PROTECTION: 'c0000000-0001-4000-a000-000000000004',
  WASHING: 'c0000000-0001-4000-a000-000000000001',
  WET_CLEANING: 'c0000000-0001-4000-a000-000000000003',
} as const;

export interface CategorySeed {
  readonly displayOrder: number;
  readonly icon: string;
  readonly id: string;
  readonly name: string;
}

export interface ServiceSeed {
  readonly basePriceCents: string | null;
  readonly categoryId: string;
  readonly descriptionMd: string;
  readonly durationMinutes: number;
  readonly id: string;
  readonly name: string;
  readonly pricing: ReadonlyArray<{ bodyType: string; priceCents: string }>;
  readonly pricingType: 'BY_BODY_TYPE' | 'FIXED';
}

export const CATEGORIES: readonly CategorySeed[] = [
  { displayOrder: 1, icon: 'droplets', id: CATEGORY_IDS.WASHING, name: 'Мойка' },
  {
    displayOrder: 2,
    icon: 'sparkles',
    id: CATEGORY_IDS.POLISHING,
    name: 'Полировка',
  },
  {
    displayOrder: 3,
    icon: 'spray-can',
    id: CATEGORY_IDS.WET_CLEANING,
    name: 'Химчистка',
  },
  {
    displayOrder: 4,
    icon: 'shield',
    id: CATEGORY_IDS.PROTECTION,
    name: 'Защитные покрытия',
  },
  { displayOrder: 5, icon: 'gem', id: CATEGORY_IDS.DETAILING, name: 'Детейлинг' },
];

export const SERVICES: readonly ServiceSeed[] = [
  {
    basePriceCents: null,
    categoryId: CATEGORY_IDS.WASHING,
    descriptionMd: 'Быстрая бесконтактная мойка кузова.',
    durationMinutes: 30,
    id: 's0000000-0001-4000-a000-000000000001',
    name: 'Экспресс-мойка',
    pricing: [
      { bodyType: 'SEDAN', priceCents: '50000' },
      { bodyType: 'SUV', priceCents: '70000' },
      { bodyType: 'COUPE', priceCents: '50000' },
      { bodyType: 'MINIVAN', priceCents: '80000' },
    ],
    pricingType: 'BY_BODY_TYPE',
  },
  {
    basePriceCents: null,
    categoryId: CATEGORY_IDS.WASHING,
    descriptionMd: 'Мойка кузова + чернение шин + пылесос салона.',
    durationMinutes: 60,
    id: 's0000000-0001-4000-a000-000000000002',
    name: 'Комплексная мойка',
    pricing: [
      { bodyType: 'SEDAN', priceCents: '120000' },
      { bodyType: 'SUV', priceCents: '160000' },
      { bodyType: 'COUPE', priceCents: '120000' },
      { bodyType: 'MINIVAN', priceCents: '180000' },
    ],
    pricingType: 'BY_BODY_TYPE',
  },
  {
    basePriceCents: '150000',
    categoryId: CATEGORY_IDS.WASHING,
    descriptionMd: 'Аппаратная мойка двигателя с консервацией.',
    durationMinutes: 45,
    id: 's0000000-0001-4000-a000-000000000003',
    name: 'Мойка двигателя',
    pricing: [],
    pricingType: 'FIXED',
  },
  {
    basePriceCents: null,
    categoryId: CATEGORY_IDS.POLISHING,
    descriptionMd: 'Восстановительная полировка кузова (3 этапа).',
    durationMinutes: 240,
    id: 's0000000-0001-4000-a000-000000000004',
    name: 'Полировка кузова',
    pricing: [
      { bodyType: 'SEDAN', priceCents: '800000' },
      { bodyType: 'SUV', priceCents: '1200000' },
      { bodyType: 'COUPE', priceCents: '750000' },
      { bodyType: 'MINIVAN', priceCents: '1300000' },
    ],
    pricingType: 'BY_BODY_TYPE',
  },
  {
    basePriceCents: '200000',
    categoryId: CATEGORY_IDS.POLISHING,
    descriptionMd: 'Полировка и бронирование фар (пара).',
    durationMinutes: 60,
    id: 's0000000-0001-4000-a000-000000000005',
    name: 'Полировка фар',
    pricing: [],
    pricingType: 'FIXED',
  },
  {
    basePriceCents: null,
    categoryId: CATEGORY_IDS.WET_CLEANING,
    descriptionMd: 'Глубокая химчистка салона с экстракцией и сушкой.',
    durationMinutes: 180,
    id: 's0000000-0001-4000-a000-000000000006',
    name: 'Химчистка салона',
    pricing: [
      { bodyType: 'SEDAN', priceCents: '500000' },
      { bodyType: 'SUV', priceCents: '700000' },
      { bodyType: 'COUPE', priceCents: '450000' },
      { bodyType: 'MINIVAN', priceCents: '800000' },
    ],
    pricingType: 'BY_BODY_TYPE',
  },
  {
    basePriceCents: '150000',
    categoryId: CATEGORY_IDS.WET_CLEANING,
    descriptionMd: 'Озонирование для устранения запахов.',
    durationMinutes: 60,
    id: 's0000000-0001-4000-a000-000000000007',
    name: 'Озонирование салона',
    pricing: [],
    pricingType: 'FIXED',
  },
  {
    basePriceCents: null,
    categoryId: CATEGORY_IDS.PROTECTION,
    descriptionMd: 'Нанесение керамического покрытия (9H, 5 слоёв, гарантия 3 года).',
    durationMinutes: 480,
    id: 's0000000-0001-4000-a000-000000000008',
    name: 'Керамическое покрытие',
    pricing: [
      { bodyType: 'SEDAN', priceCents: '2500000' },
      { bodyType: 'SUV', priceCents: '3500000' },
      { bodyType: 'COUPE', priceCents: '2200000' },
      { bodyType: 'MINIVAN', priceCents: '3800000' },
    ],
    pricingType: 'BY_BODY_TYPE',
  },
  {
    basePriceCents: '300000',
    categoryId: CATEGORY_IDS.PROTECTION,
    descriptionMd: 'Антидождь на лобовое + боковые стёкла.',
    durationMinutes: 60,
    id: 's0000000-0001-4000-a000-000000000009',
    name: 'Антидождь',
    pricing: [],
    pricingType: 'FIXED',
  },
  {
    basePriceCents: null,
    categoryId: CATEGORY_IDS.DETAILING,
    descriptionMd: 'Полный детейлинг: мойка, деконтаминация, полировка, керамика, чистка салона.',
    durationMinutes: 480,
    id: 's0000000-0001-4000-a000-000000000010',
    name: 'Полный детейлинг',
    pricing: [
      { bodyType: 'SEDAN', priceCents: '3500000' },
      { bodyType: 'SUV', priceCents: '5000000' },
      { bodyType: 'COUPE', priceCents: '3200000' },
      { bodyType: 'MINIVAN', priceCents: '5500000' },
    ],
    pricingType: 'BY_BODY_TYPE',
  },
  {
    basePriceCents: null,
    categoryId: CATEGORY_IDS.DETAILING,
    descriptionMd: 'Предпродажная подготовка: мойка, полировка, химчистка, озон.',
    durationMinutes: 360,
    id: 's0000000-0001-4000-a000-000000000011',
    name: 'Предпродажная подготовка',
    pricing: [
      { bodyType: 'SEDAN', priceCents: '1500000' },
      { bodyType: 'SUV', priceCents: '2000000' },
      { bodyType: 'COUPE', priceCents: '1400000' },
      { bodyType: 'MINIVAN', priceCents: '2200000' },
    ],
    pricingType: 'BY_BODY_TYPE',
  },
];
