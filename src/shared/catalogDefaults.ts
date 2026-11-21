import {
  DEFAULT_CLASS_FEATURES,
  DEFAULT_CLASS_PROGRESSION_META,
  DEFAULT_SUBCLASS_FEATURES,
  DEFAULT_SUBCLASSES,
} from './classProgressionData.ts';
import type {
  AbilityModifierRef,
  AbilityRef,
  ArmorCategory,
  ArmorRef,
  CharacterDraft,
  ClassFeatureRef,
  ClassRef,
  ConditionRef,
  EntityVisionEntry,
  FeatRef,
  GameCatalogs,
  GameClockState,
  GearItemKind,
  GearItemRef,
  InventoryItem,
  LevelThresholdRef,
  MapLighting,
  MonsterActionRef,
  PlayerCharacter,
  SkillRef,
  SubclassFeatureRef,
  VisionBehavior,
  VisionRef,
  WeaponCategory,
  WeaponMasteryRef,
  WeaponPropertyRef,
  WeaponRangeType,
  WeaponRef,
} from './types.ts';

export const AUTOMATED_CLASS_FEATURE_SUMMARIES: Record<string, string> = {
  'barbarian-feat-unarmored-defense-l1':
    'Авто-расчёт КЗ без доспехов: 10 + мод. ЛОВ + мод. ТЕЛ (работает со щитом).',
  'barbarian-feat-fast-movement-l5':
    'Авто-бонус к скорости: +10 фт., если не надеты тяжёлые доспехи.',
  'barbarian-feat-rage-l1':
    'В блоке «Действия героя» автоматически показывается текущий бонус урона Ярости (+2…+4 по уровню).',
  'monk-feat-unarmored-defense-l1':
    'Авто-расчёт КЗ без доспехов и щита: 10 + мод. ЛОВ + мод. МДР.',
  'monk-feat-martial-arts-l1':
    'Безоружный удар использует кость Боевых искусств (1к6…1к12) и макс(СИЛ, ЛОВ) для безоружного удара и монашеского оружия.',
  'monk-feat-unarmored-movement-l2':
    'Авто-бонус к скорости (+10…+30 фт. по уровню), если не надеты доспехи и щит.',
  'bard-feat-jack-of-all-trades-l2':
    'Авто-прибавка +⌊БМ/2⌋ к неизученным навыкам и к бонусу Инициативы.',
  'rogue-feat-sneak-attack-l1':
    'В «Действиях героя» автоматически показывается кость Коварной атаки (1к6…10к6) для фехтовального и дальнобойного оружия.',
};

export const AUTOMATED_SUBCLASS_FEATURE_SUMMARIES: Record<string, string> = {
  'sorcerer-draconic-sorcery-f-draconic-sorcery-draconic-resilience-l3':
    'Авто-расчёт КЗ без доспехов: 10 + мод. ЛОВ + мод. ХАР.',
};

export const AUTOMATED_FEAT_SUMMARIES: Record<string, string> = {
  alert: 'Авто-прибавка Бонуса мастерства (+БМ) к броску Инициативы.',
  tavern_brawler: 'Безоружный удар автоматически использует 1к4 + мод. СИЛ дробящего урона.',
};

export const DEFAULT_CONDITIONS: ConditionRef[] = [
  {
    id: 'unconscious',
    name: 'Бессознательный',
    automationKey: 'unconscious',
    automatedSummary:
      'Скорость = 0 фт. · Зрение на карте отключено (0 фт.) · Помеха на Инициативу · Автопровал спасбросков СИЛ/ЛОВ · Предупреждение о критах в 5 фт.',
    description:
      'Пока у вас есть состояние Бессознательный, на вас действуют следующие эффекты:\n\nБездеятельность. У вас есть состояния Недееспособный и Опрокинутый, и вы роняете всё, что держите. Когда ваше состояние Бессознательный заканчивается, вы остаётесь Опрокинутым.\n\nСкорость 0. Ваша Скорость равна 0 и не может быть увеличена.\n\nВлияние на атаки. Броски атаки по вам совершаются с Преимуществом.\n\nВлияние на спасброски. Вы автоматически проваливаете спасброски Силы и Ловкости.\n\nАвтоматические критические попадания. Все броски атаки, попадающие по вам, считаются Критическими попаданиями, если атакующий находится в пределах 5 футов от вас.\n\nНеосознанность. Вы не осознаёте своё окружение.',
  },
  {
    id: 'frightened',
    name: 'Испуганный',
    automationKey: 'frightened',
    automatedSummary:
      'Пометка в бою и проверках: Помеха на броски атаки и проверки характеристик (пока источник в поле зрения).',
    description:
      'Пока у вас есть состояние Испуганный, на вас действуют следующие эффекты:\n\nВлияние на атаки и проверки характеристик. Пока существует линия видимости между вами и источником вашего испуга, вы совершаете с Помехой проверки характеристик и броски атаки.\n\nНе можете приближаться. Вы не можете добровольно приближаться к источнику вашего испуга.',
  },
  {
    id: 'exhaustion',
    name: 'Истощение',
    automationKey: 'exhaustion',
    automatedSummary:
      'Авто-штраф −2 × уровень к тестам к20 (атаки, навыки, инициатива, спасброски) и −5 фт. × уровень к скорости.',
    description:
      'Пока у вас есть состояние Истощение, на вас действуют следующие эффекты:\n\nУровни истощения. Это состояние складывается само с собой. Каждый раз, когда вы получаете это состояние, уровень Истощения увеличивается на 1. Когда уровень Истощения становится 6, вы умираете.\n\nВлияние на тесты к20. Когда вы совершаете Тест к20, результат броска уменьшается на уровень Истощения, умноженный на 2.\n\nСнижение скорости. Ваша Скорость снижается на уровень Истощения, умноженный на 5 футов.\n\nСнятие уровней истощения. Когда вы завершаете Долгий отдых, уровень Истощения снижается на 1. Когда уровень Истощения снижается до 0, состояние на вас заканчивается.',
  },
  {
    id: 'invisible',
    name: 'Невидимый',
    automationKey: 'invisible',
    automatedSummary:
      'Пометка в бою: Преимущество на Инициативу и броски атаки; атаки по цели с Помехой.',
    description:
      'Пока у вас есть состояние Невидимый, на вас действуют следующие эффекты:\n\nВнезапность. Если вы совершаете бросок Инициативы с состоянием Невидимый, то делаете это с Преимуществом.\n\nСкрытость. На вас не может влиять никакой эффект, требующий, чтобы его цель была видна, если только создатель такого эффекта не может каким-либо образом видеть вас. Всё несомое и носимое вами снаряжение также скрывается.\n\nВлияние на атаки. Броски атаки по вам совершаются с Помехой, а ваши броски атаки совершаются с Преимуществом, если только существо не может каким-либо образом видеть вас.',
  },
  {
    id: 'incapacitated',
    name: 'Недееспособный',
    automationKey: 'incapacitated',
    automatedSummary:
      'Скорость = 0 фт. · Помеха на Инициативу · Предупреждение о невозможности действий, реакций и концентрации.',
    description:
      'Пока у вас есть состояние Недееспособный, на вас действуют следующие эффекты:\n\nБездействие. Вы не можете совершать действия, Бонусные действия и Реакции.\n\nБез концентрации. Вы не можете Концентрироваться.\n\nБезмолвие. Вы не можете говорить.\n\nПотрясение. Если вы совершаете бросок Инициативы с состоянием Недееспособный, то делаете это с Помехой.',
  },
  {
    id: 'deafened',
    name: 'Оглохший',
    description:
      'Пока у вас есть состояние Оглохший, на вас действует следующий эффект:\n\nНе можете слышать. Вы не можете слышать и автоматически проваливаете проверки характеристик, требующие слуха.',
  },
  {
    id: 'petrified',
    name: 'Окаменевший',
    automationKey: 'petrified',
    automatedSummary:
      'Скорость = 0 фт. · Зрение на карте отключено · Помеха на Инициативу · Автопровал спасбросков СИЛ/ЛОВ · Сопротивление всему урону.',
    description:
      'Пока у вас есть состояние Окаменевший, на вас действуют следующие эффекты:\n\nНеодушевлённая материя. Вы, вместе со всеми немагическими объектами, которые вы несёте или носите, обращены в твёрдую неодушевлённую материю (обычно — в камень). Ваш вес увеличивается в десять раз, и вы перестаёте стареть.\n\nНедееспособный. У вас есть состояние Недееспособный.\n\nСкорость 0. Ваша Скорость равна 0 и не может быть увеличена.\n\nВлияние на спасброски. Вы автоматически проваливаете спасброски Силы и Ловкости.\n\nВлияние на атаки. Броски атаки по вам совершаются с Преимуществом.\n\nСопротивление урону. У вас есть Сопротивление всему урону.\n\nИммунитет к отравлению. У вас есть Иммунитет к состоянию Отравленный.',
  },
  {
    id: 'prone',
    name: 'Опрокинутый',
    automationKey: 'prone',
    automatedSummary:
      'Пометка в бою: Помеха на броски атаки; встать стоит половину скорости (невозможно при Скорости 0).',
    description:
      'Пока у вас есть состояние Опрокинутый, на вас действуют следующие эффекты:\n\nОграниченное перемещение. Вы можете перемещаться только ползком, или вы можете потратить перемещение в размере, равном половине вашей Скорости (округляя вниз), чтобы подняться и таким образом окончить на себе это состояние. Вы не можете подняться, если ваша Скорость равна 0.\n\nВлияние на атаки. Вы совершаете с Помехой броски атаки. Броски атаки по вам совершаются с Преимуществом, если атакующий находится в пределах 5 футов от вас; броски атаки по вам совершаются с Помехой, если атакующий находится далее 5 футов от вас.',
  },
  {
    id: 'restrained',
    name: 'Опутанный',
    automationKey: 'restrained',
    automatedSummary:
      'Скорость = 0 фт. · Помеха на броски атаки и спасброски ЛОВ · Атаки по цели с Преимуществом.',
    description:
      'Пока у вас есть состояние Опутанный, на вас действуют следующие эффекты:\n\nСкорость 0. Ваша Скорость равна 0 и не может быть увеличена.\n\nВлияние на атаки. Ваши броски атаки совершаются с Помехой, а броски атаки по вам совершаются с Преимуществом.\n\nВлияние на спасброски. Вы совершаете с Помехой спасброски Ловкости.',
  },
  {
    id: 'blinded',
    name: 'Ослеплённый',
    automationKey: 'blinded',
    automatedSummary:
      'Отключает Обычное, Тёмное и Истинное зрение на карте (оставляет Слепое зрение и Чувство вибрации) · Помеха на броски атаки.',
    description:
      'Пока у вас есть состояние Ослеплённый, на вас действуют следующие эффекты:\n\nНе можете видеть. Вы не можете видеть и автоматически проваливаете проверки характеристик, требующие зрения.\n\nВлияние на атаки. Ваши броски атаки совершаются с Помехой, а броски атаки по вам совершаются с Преимуществом.',
  },
  {
    id: 'poisoned',
    name: 'Отравленный',
    automationKey: 'poisoned',
    automatedSummary:
      'Пометка в бою и проверках: Помеха на броски атаки и проверки характеристик.',
    description:
      'Пока у вас есть состояние Отравленный, на вас действует следующий эффект:\n\nВлияние на атаки и проверки характеристик. Вы совершаете с Помехой броски атаки и проверки характеристик.',
  },
  {
    id: 'encumbered',
    name: 'Слегка перегружен',
    automationKey: 'encumbered',
    automatedSummary:
      'Авто при весе инвентаря > Сила × 5 фнт.: Скорость снижается на 10 фт.',
    description:
      'Ваш инвентарь превышает порог лёгкой нагрузки (Сила × 5 фнт.).\n\nСнижение скорости. Ваша Скорость перемещения снижается на 10 футов, пока вес носимого снаряжения остаётся выше Сила × 5 фнт.',
  },
  {
    id: 'heavily_encumbered',
    name: 'Сильно перегружен',
    automationKey: 'heavily_encumbered',
    automatedSummary:
      'Авто при весе > Сила × 10 фнт.: Скорость −20 фт. · Помеха на проверки характеристик, броски атаки и спасброски СИЛ, ЛОВ и ТЕЛ.',
    description:
      'Ваш инвентарь превышает порог тяжёлой нагрузки (Сила × 10 фнт.).\n\nСнижение скорости. Ваша Скорость перемещения снижается на 20 футов.\n\nТяжёлая ноша (Помеха). Вы совершаете с Помехой все проверки характеристик, броски атаки и спасброски, использующие Силу, Ловкость или Телосложение.',
  },
  {
    id: 'over_carry_limit',
    name: 'Максимальный лимит',
    automationKey: 'over_carry_limit',
    automatedSummary:
      'Авто при весе > Сила × 15 фнт.: Скорость падает до 5 фт. · Помеха на проверки характеристик, броски атаки и спасброски СИЛ, ЛОВ и ТЕЛ.',
    description:
      'Вы превысили максимальную грузоподъёмность (Сила × 15 фнт.).\n\nКритическая нагрузка. Ваша Скорость падает до 5 футов, и вы совершаете с Помехой все проверки характеристик, броски атаки и спасброски, использующие Силу, Ловкость или Телосложение, пока не сбросите лишний груз.',
  },
  {
    id: 'dying',
    name: 'Умирающий',
    automationKey: 'dying',
    automatedSummary:
      'Авто при 0 HP: накладывает Бессознательный, Недееспособный и Опрокинутый · В начале своего хода нужен спасбросок от смерти (1к20).',
    description:
      'Ваши Хиты упали до 0, и вы находитесь при смерти.\n\nСопутствующие состояния. Вы автоматически получаете состояния Бессознательный, Недееспособный и Опрокинутый.\n\nСпасброски от смерти. В начале каждого своего хода вы бросаете 1к20 без модификаторов: 10+ — успех, 9 или меньше — провал. Выпадение «1» считается за 2 провала; «20» немедленно восстанавливает 1 Хит и возвращает вас в сознание. Три успеха стабилизируют вас; три провала означают смерть. Урон при 0 HP добавляет 1 провал (критический удар — 2 провала).',
  },
  {
    id: 'stabilized',
    name: 'Стабилизирован',
    automationKey: 'stabilized',
    automatedSummary:
      'Авто при 3 успехах спасброска от смерти (или лечении Медициной): 0 HP, остаётся Бессознательный, спасброски от смерти остановлены.',
    description:
      'Вы остаётесь с 0 Хитов и в состоянии Бессознательный, но угроза немедленной смерти миновала.\n\nНет спасбросков. Вы больше не совершаете спасброски от смерти в начале своего хода.\n\nХрупкое состояние. Если вы получите любой урон, стабилизация спадает — вы снова становитесь Умирающим и получаете провал спасброска от смерти. Если восстановить хотя бы 1 Хит, вы приходите в сознание.',
  },
];

export function createDefaultCatalogs(): GameCatalogs {
  const abilities: AbilityRef[] = [
    {
      id: 'str',
      name: 'Сила',
      shortName: 'СИЛ',
      description: 'Физическая мощь, атлетизм, ближний бой и переносимый вес.',
    },
    {
      id: 'dex',
      name: 'Ловкость',
      shortName: 'ЛОВ',
      description: 'Проворство, реакция, инициатива, скрытность и дальнобойные атаки.',
    },
    {
      id: 'con',
      name: 'Телосложение',
      shortName: 'ТЕЛ',
      description: 'Выносливость, стойкость организма и запас очков здоровья (HP).',
    },
    {
      id: 'int',
      name: 'Интеллект',
      shortName: 'ИНТ',
      description: 'Логика, память, аналитическое мышление и познания в магии.',
    },
    {
      id: 'wis',
      name: 'Мудрость',
      shortName: 'МДР',
      description: 'Внимательность, интуиция, сила воли и связь с природой.',
    },
    {
      id: 'cha',
      name: 'Харизма',
      shortName: 'ХАР',
      description: 'Убедительность, обаяние, лидерство и влияние на окружающих.',
    },
  ];

  const abilityModifiers: AbilityModifierRef[] = [
    { id: 'mod-3', minScore: 3, maxScore: 3, modifier: -4 },
    { id: 'mod-4-5', minScore: 4, maxScore: 5, modifier: -3 },
    { id: 'mod-6-7', minScore: 6, maxScore: 7, modifier: -2 },
    { id: 'mod-8-9', minScore: 8, maxScore: 9, modifier: -1 },
    { id: 'mod-10-11', minScore: 10, maxScore: 11, modifier: 0 },
    { id: 'mod-12-13', minScore: 12, maxScore: 13, modifier: 1 },
    { id: 'mod-14-15', minScore: 14, maxScore: 15, modifier: 2 },
    { id: 'mod-16-17', minScore: 16, maxScore: 17, modifier: 3 },
    { id: 'mod-18-19', minScore: 18, maxScore: 19, modifier: 4 },
    { id: 'mod-20', minScore: 20, maxScore: 20, modifier: 5 },
  ];

  const makeArmor = (
    id: string,
    category: ArmorCategory,
    name: string,
    acBase: number,
    acAbilityId: string | null,
    acMaxBonus: number | null,
    strengthReq: string,
    stealth: string,
    weight: string,
    price: string
  ): ArmorRef => ({
    id,
    category,
    name,
    acBase,
    acAbilityId,
    acMaxBonus,
    armorClass: formatArmorClassFormula(
      { category, acBase, acAbilityId, acMaxBonus },
      abilities
    ),
    strengthReq,
    stealth,
    weight,
    price,
  });

  const withProgressionMeta = (cls: ClassRef): ClassRef => {
    const meta = DEFAULT_CLASS_PROGRESSION_META[cls.id];
    if (!meta) return cls;
    return {
      ...cls,
      hitDie: meta.hitDie,
      hpPerLevelHint: meta.hpPerLevelHint,
      proficiencyBonusByLevel: [...meta.proficiencyBonusByLevel],
      classResources: meta.classResources.map((r) => ({ ...r, values: [...r.values] })),
    };
  };

  const baseClasses: ClassRef[] = [
      {
        id: 'artificer',
        name: 'Артефактор',
        description: 'Мастер магических изобретений, рун и алхимических устройств.',
        savingThrowAbilityIds: ['con', 'int'],
        skillChoiceCount: 2,
        allowedSkillIds: ['perception', 'history', 'sleight_of_hand', 'medicine', 'nature', 'investigation', 'arcana'],
        anySkillAllowed: false,
        weaponProficiencyIds: ['weapon_simple', 'weapon_melee', 'weapon_ranged'],
        armorProficiencyIds: ['armor_light', 'armor_medium', 'armor_shield'],
      },
      {
        id: 'bard',
        name: 'Бард',
        description: 'Вдохновитель и заклинатель, черпающий магию в музыке и слове.',
        savingThrowAbilityIds: ['dex', 'cha'],
        skillChoiceCount: 3,
        allowedSkillIds: [],
        anySkillAllowed: true,
        weaponProficiencyIds: ['weapon_simple', 'weapon_melee', 'weapon_ranged'],
        armorProficiencyIds: ['armor_light'],
      },
      {
        id: 'barbarian',
        name: 'Варвар',
        description: 'Неистовый боец, полагающийся на ярость и выносливость.',
        savingThrowAbilityIds: ['str', 'con'],
        skillChoiceCount: 2,
        allowedSkillIds: ['athletics', 'perception', 'survival', 'intimidation', 'animal_handling', 'nature'],
        anySkillAllowed: false,
        weaponProficiencyIds: ['weapon_simple', 'weapon_martial', 'weapon_melee', 'weapon_ranged'],
        armorProficiencyIds: ['armor_light', 'armor_medium', 'armor_shield'],
      },
      {
        id: 'fighter',
        name: 'Воин',
        description: 'Мастер тактики, оружия и доспехов в любом сражении.',
        savingThrowAbilityIds: ['str', 'con'],
        skillChoiceCount: 2,
        allowedSkillIds: [
          'acrobatics',
          'athletics',
          'perception',
          'survival',
          'intimidation',
          'history',
          'animal_handling',
          'insight',
          'persuasion',
        ],
        anySkillAllowed: false,
        weaponProficiencyIds: ['weapon_simple', 'weapon_martial', 'weapon_melee', 'weapon_ranged'],
        armorProficiencyIds: ['armor_light', 'armor_medium', 'armor_heavy', 'armor_shield'],
      },
      {
        id: 'wizard',
        name: 'Волшебник',
        description: 'Ученый-маг, изучающий тайные заклинания по гримуару.',
        savingThrowAbilityIds: ['int', 'wis'],
        skillChoiceCount: 2,
        allowedSkillIds: ['history', 'medicine', 'nature', 'insight', 'investigation', 'religion', 'arcana'],
        anySkillAllowed: false,
        weaponProficiencyIds: ['weapon_simple', 'weapon_melee', 'weapon_ranged'],
        armorProficiencyIds: [],
      },
      {
        id: 'druid',
        name: 'Друид',
        description: 'Хранитель природы, управляющий стихиями и обликом зверей.',
        savingThrowAbilityIds: ['int', 'wis'],
        skillChoiceCount: 2,
        allowedSkillIds: [
          'perception',
          'survival',
          'medicine',
          'animal_handling',
          'nature',
          'insight',
          'religion',
          'arcana',
        ],
        anySkillAllowed: false,
        weaponProficiencyIds: ['weapon_simple', 'weapon_melee', 'weapon_ranged'],
        armorProficiencyIds: ['armor_light', 'armor_shield'],
      },
      {
        id: 'cleric',
        name: 'Жрец',
        description: 'Проводник божественной воли, целитель и защитник отряда.',
        savingThrowAbilityIds: ['wis', 'cha'],
        skillChoiceCount: 2,
        allowedSkillIds: ['history', 'medicine', 'insight', 'religion', 'persuasion'],
        anySkillAllowed: false,
        weaponProficiencyIds: ['weapon_simple', 'weapon_melee', 'weapon_ranged'],
        armorProficiencyIds: ['armor_light', 'armor_medium', 'armor_shield'],
      },
      {
        id: 'warlock',
        name: 'Колдун',
        description: 'Заклинатель, получивший силу через пакт с могущественной сущностью.',
        savingThrowAbilityIds: ['wis', 'cha'],
        skillChoiceCount: 2,
        allowedSkillIds: ['intimidation', 'history', 'deception', 'nature', 'investigation', 'religion', 'arcana'],
        anySkillAllowed: false,
        weaponProficiencyIds: ['weapon_simple', 'weapon_melee', 'weapon_ranged'],
        armorProficiencyIds: ['armor_light'],
      },
      {
        id: 'monk',
        name: 'Монах',
        description: 'Мастер боевых искусств, направляющий внутреннюю энергию ци.',
        savingThrowAbilityIds: ['str', 'dex'],
        skillChoiceCount: 2,
        allowedSkillIds: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'],
        anySkillAllowed: false,
        weaponProficiencyIds: ['weapon_simple', 'weapon_melee', 'weapon_ranged'],
        weaponProficiencyNote: 'Также воинское оружие со свойством «Лёгкое»',
        armorProficiencyIds: [],
      },
      {
        id: 'paladin',
        name: 'Паладин',
        description: 'Воин клятвы, сочетающий тяжелую броню и священную магию.',
        savingThrowAbilityIds: ['wis', 'cha'],
        skillChoiceCount: 2,
        allowedSkillIds: ['athletics', 'intimidation', 'medicine', 'insight', 'religion', 'persuasion'],
        anySkillAllowed: false,
        weaponProficiencyIds: ['weapon_simple', 'weapon_martial', 'weapon_melee', 'weapon_ranged'],
        armorProficiencyIds: ['armor_light', 'armor_medium', 'armor_heavy', 'armor_shield'],
      },
      {
        id: 'rogue',
        name: 'Плут',
        description: 'Специалист по скрытности, ловушкам и точным ударам.',
        savingThrowAbilityIds: ['dex', 'int'],
        skillChoiceCount: 4,
        allowedSkillIds: [
          'acrobatics',
          'athletics',
          'perception',
          'intimidation',
          'sleight_of_hand',
          'deception',
          'insight',
          'investigation',
          'stealth',
          'persuasion',
        ],
        anySkillAllowed: false,
        weaponProficiencyIds: ['weapon_simple', 'weapon_melee', 'weapon_ranged'],
        weaponProficiencyNote: 'Также воинское оружие со свойством «Фехтовальное» или «Лёгкое»',
        armorProficiencyIds: ['armor_light'],
      },
      {
        id: 'ranger',
        name: 'Следопыт',
        description: 'Охотник и разведчик диких земель, меткий стрелок.',
        savingThrowAbilityIds: ['str', 'dex'],
        skillChoiceCount: 3,
        allowedSkillIds: [
          'athletics',
          'perception',
          'survival',
          'animal_handling',
          'nature',
          'insight',
          'investigation',
          'stealth',
        ],
        anySkillAllowed: false,
        weaponProficiencyIds: ['weapon_simple', 'weapon_martial', 'weapon_melee', 'weapon_ranged'],
        armorProficiencyIds: ['armor_light', 'armor_medium', 'armor_shield'],
      },
      {
        id: 'sorcerer',
        name: 'Чародей',
        description: 'Носитель врожденной магии, изменяющий плетение силой воли.',
        savingThrowAbilityIds: ['con', 'cha'],
        skillChoiceCount: 2,
        allowedSkillIds: ['intimidation', 'deception', 'insight', 'religion', 'arcana', 'persuasion'],
        anySkillAllowed: false,
        weaponProficiencyIds: ['weapon_simple', 'weapon_melee', 'weapon_ranged'],
        armorProficiencyIds: [],
      },
  ];

  return {
    abilities,
    abilityModifiers,
    classes: baseClasses.map(withProgressionMeta),
    subclasses: DEFAULT_SUBCLASSES.map((s) => ({ ...s })),
    classFeatures: DEFAULT_CLASS_FEATURES.map((f) => ({
      ...f,
      automatedSummary: AUTOMATED_CLASS_FEATURE_SUMMARIES[f.id],
    })),
    subclassFeatures: DEFAULT_SUBCLASS_FEATURES.map((f) => ({
      ...f,
      automatedSummary: AUTOMATED_SUBCLASS_FEATURE_SUMMARIES[f.id],
    })),
    backgrounds: [
      {
        id: 'entertainer',
        name: 'Артист',
        description: 'Привык выступать перед публикой и завоевывать внимание толпы.',
        abilityIds: ['str', 'dex', 'cha'],
        featId: 'musician',
        skillIds: ['acrobatics', 'performance'],
      },
      {
        id: 'wayfarer',
        name: 'Бродяга',
        description: 'Вырос на улицах и дорогах, умеет выживать и находить лазейки.',
        abilityIds: ['dex', 'wis', 'cha'],
        featId: 'lucky',
        skillIds: ['insight', 'stealth'],
      },
      {
        id: 'noble',
        name: 'Дворянин',
        description: 'Воспитан в знатном роду, знаком с этикетом и политикой.',
        abilityIds: ['str', 'int', 'cha'],
        featId: 'skilled',
        skillIds: ['history', 'persuasion'],
      },
      {
        id: 'sailor',
        name: 'Моряк',
        description: 'Закален штормами, знает корабельное дело и портовые нравы.',
        abilityIds: ['str', 'dex', 'wis'],
        featId: 'tavern_brawler',
        skillIds: ['acrobatics', 'perception'],
      },
      {
        id: 'sage',
        name: 'Мудрец',
        description: 'Посвятил годы книгам, архивам и поиску утраченных знаний.',
        abilityIds: ['con', 'int', 'wis'],
        featId: 'magic_initiate_wizard',
        skillIds: ['history', 'arcana'],
      },
      {
        id: 'hermit',
        name: 'Отшельник',
        description: 'Провел долгое время в уединении, размышлениях и самопознании.',
        abilityIds: ['con', 'wis', 'cha'],
        featId: 'healer',
        skillIds: ['medicine', 'religion'],
      },
      {
        id: 'scribe',
        name: 'Писарь',
        description: 'Искусен в документах, шифрах, летописях и переписке.',
        abilityIds: ['dex', 'int', 'wis'],
        featId: 'skilled',
        skillIds: ['perception', 'investigation'],
      },
      {
        id: 'acolyte',
        name: 'Послушник',
        description: 'Служил в храме, знает обряды, догматы и духовные традиции.',
        abilityIds: ['int', 'wis', 'cha'],
        featId: 'magic_initiate_cleric',
        skillIds: ['insight', 'religion'],
      },
      {
        id: 'criminal',
        name: 'Преступник',
        description: 'Имеет связи в теневом мире и опыт обхода закона.',
        abilityIds: ['dex', 'con', 'int'],
        featId: 'alert',
        skillIds: ['sleight_of_hand', 'stealth'],
      },
      {
        id: 'guide',
        name: 'Проводник',
        description: 'Знает тайные тропы, ориентируется на местности и в дикой природе.',
        abilityIds: ['dex', 'con', 'wis'],
        featId: 'magic_initiate_druid',
        skillIds: ['survival', 'stealth'],
      },
      {
        id: 'artisan',
        name: 'Ремесленник',
        description: 'Состоял в гильдии мастеров, разбирается в ремесле и материалах.',
        abilityIds: ['str', 'dex', 'int'],
        featId: 'crafter',
        skillIds: ['investigation', 'persuasion'],
      },
      {
        id: 'soldier',
        name: 'Солдат',
        description: 'Прошел военную службу, обучен дисциплине и строевому бою.',
        abilityIds: ['str', 'dex', 'con'],
        featId: 'savage_attacker',
        skillIds: ['athletics', 'intimidation'],
      },
      {
        id: 'guard',
        name: 'Стражник',
        description: 'Нес караульную службу, натренирован замечать угрозы и нарушителей.',
        abilityIds: ['str', 'int', 'wis'],
        featId: 'alert',
        skillIds: ['athletics', 'perception'],
      },
      {
        id: 'merchant',
        name: 'Торговец',
        description: 'Умеет оценивать товары, торговаться и вести дела с купцами.',
        abilityIds: ['con', 'int', 'cha'],
        featId: 'lucky',
        skillIds: ['persuasion', 'animal_handling'],
      },
      {
        id: 'farmer',
        name: 'Фермер',
        description: 'Привык к тяжелому труду на земле, уходу за животными и хозяйству.',
        abilityIds: ['str', 'con', 'wis'],
        featId: 'tough',
        skillIds: ['nature', 'animal_handling'],
      },
      {
        id: 'charlatan',
        name: 'Шарлатан',
        description: 'Мастер афер, подделок и убедительных вымышленных историй.',
        abilityIds: ['dex', 'con', 'cha'],
        featId: 'skilled',
        skillIds: ['sleight_of_hand', 'deception'],
      },
    ],
    feats: [
      {
        id: 'alert',
        name: 'Бдительный',
        automatedSummary: AUTOMATED_FEAT_SUMMARIES.alert,
        description:
          'Владение Инициативой: при броске Инициативы добавляйте свой Бонус владения. Обмен Инициативой: сразу после броска Инициативы вы можете обменяться значениями Инициативы с одним согласным союзником в том же бою (если никто из вас не Недееспособен).',
      },
      {
        id: 'lucky',
        name: 'Везучий',
        description:
          'Очки везения (равны Бонусу владения, восстанавливаются после Долгого отдыха). Преимущество: потратьте 1 Очко везения при Тесте К20, чтобы получить Преимущество. Помеха: когда существо совершает бросок атаки по вам, потратьте 1 Очко везения, чтобы наложить Помеху.',
      },
      {
        id: 'tavern_brawler',
        name: 'Дебошир',
        automatedSummary: AUTOMATED_FEAT_SUMMARIES.tavern_brawler,
        description:
          'Усиленный безоружный удар (1к4 + мод. Силы дробящего урона) с перебросом «1» на кости урона. Владение импровизированным оружием. Толчок: 1 раз в ход при попадании Безоружным ударом частью действия Атака можно оттолкнуть цель на 5 футов.',
      },
      {
        id: 'tough',
        name: 'Крепкий',
        description:
          'Ваш максимум Хитов увеличивается на величину, равную удвоенному уровню персонажа, на котором вы получаете эту черту. При каждом последующем получении уровня ваш максимум Хитов увеличивается ещё на 2 Хита.',
      },
      {
        id: 'healer',
        name: 'Лекарь',
        description:
          'Боевой целитель: действием Использование потратьте 1 применение Комплекта целителя на существо в пределах 5 футов — оно может потратить Кость хитов и восстановить результат броска + ваш Бонус владения. Переброс лечения: перебрасывайте «1» на костях лечения.',
      },
      {
        id: 'crafter',
        name: 'Мастеровой',
        description:
          'Владение тремя Ремесленными инструментами. Скидка 20% при покупке немагических предметов. Быстрое изготовление: после Долгого отдыха можно изготовить простой предмет снаряжения (существует до следующего Долгого отдыха).',
      },
      {
        id: 'musician',
        name: 'Музыкант',
        description:
          'Владение тремя Музыкальными инструментами. Ободряющая песня: по завершении Короткого или Долгого отдыха вы можете сыграть песню и дать Героическое вдохновение союзникам (число целей равно вашему Бонусу владения).',
      },
      {
        id: 'savage_attacker',
        name: 'Неистово атакующий',
        description:
          'Один раз за ход, когда вы попадаете по цели оружием, вы можете бросить кости урона этого оружия дважды и использовать любой из результатов.',
      },
      {
        id: 'skilled',
        name: 'Одарённый',
        description:
          'Вы получаете владение тремя навыками или инструментами в любой комбинации на ваш выбор. Черту можно брать повторно.',
      },
      {
        id: 'magic_initiate_wizard',
        name: 'Посвящённый в магию (Волшебник)',
        description:
          'Вы изучаете 2 заговора и 1 заклинание 1-го уровня из списка Волшебника (заклинательная характеристика на выбор: Интеллект, Мудрость или Харизма). Заклинание всегда подготовлено, его можно сотворить 1 раз без траты ячейки за Долгий отдых.',
      },
      {
        id: 'magic_initiate_druid',
        name: 'Посвящённый в магию (Друид)',
        description:
          'Вы изучаете 2 заговора и 1 заклинание 1-го уровня из списка Друида (заклинательная характеристика на выбор: Интеллект, Мудрость или Харизма). Заклинание всегда подготовлено, его можно сотворить 1 раз без траты ячейки за Долгий отдых.',
      },
      {
        id: 'magic_initiate_cleric',
        name: 'Посвящённый в магию (Жрец)',
        description:
          'Вы изучаете 2 заговора и 1 заклинание 1-го уровня из списка Жреца (заклинательная характеристика на выбор: Интеллект, Мудрость или Харизма). Заклинание всегда подготовлено, его можно сотворить 1 раз без траты ячейки за Долгий отдых.',
      },
    ],
    species: [
      {
        id: 'human',
        name: 'Человек',
        description: 'Универсальный и изобретательный народ, быстро осваивающий любые ремесла и пути.',
      },
    ],
    levels: [
      { id: 'lvl-1', level: 1, minXp: 0 },
      { id: 'lvl-2', level: 2, minXp: 300 },
      { id: 'lvl-3', level: 3, minXp: 900 },
      { id: 'lvl-4', level: 4, minXp: 2700 },
      { id: 'lvl-5', level: 5, minXp: 6500 },
      { id: 'lvl-6', level: 6, minXp: 14000 },
      { id: 'lvl-7', level: 7, minXp: 23000 },
      { id: 'lvl-8', level: 8, minXp: 34000 },
      { id: 'lvl-9', level: 9, minXp: 48000 },
      { id: 'lvl-10', level: 10, minXp: 64000 },
      { id: 'lvl-11', level: 11, minXp: 85000 },
      { id: 'lvl-12', level: 12, minXp: 100000 },
      { id: 'lvl-13', level: 13, minXp: 120000 },
      { id: 'lvl-14', level: 14, minXp: 140000 },
      { id: 'lvl-15', level: 15, minXp: 165000 },
      { id: 'lvl-16', level: 16, minXp: 195000 },
      { id: 'lvl-17', level: 17, minXp: 225000 },
      { id: 'lvl-18', level: 18, minXp: 265000 },
      { id: 'lvl-19', level: 19, minXp: 305000 },
      { id: 'lvl-20', level: 20, minXp: 355000 },
    ],
    skills: [
      {
        id: 'acrobatics',
        name: 'Акробатика',
        abilityId: 'dex',
        usageExample: 'Удержать равновесие на узком карнизе, перекатиться при падении или проскочить мимо врага.',
      },
      {
        id: 'athletics',
        name: 'Атлетика',
        abilityId: 'str',
        usageExample: 'Взобраться по отвесной стене, перепрыгнуть провал, выплыть против течения или удержать противника.',
      },
      {
        id: 'perception',
        name: 'Восприятие',
        abilityId: 'wis',
        usageExample: 'Заметить засаду, услышать шаги за дверью или разглядеть скрытую ловушку.',
      },
      {
        id: 'survival',
        name: 'Выживание',
        abilityId: 'wis',
        usageExample: 'Выследить зверя по следам, найти дорогу в лесу, предсказать погоду или разбить лагерь.',
      },
      {
        id: 'performance',
        name: 'Выступление',
        abilityId: 'cha',
        usageExample: 'Увлечь зрителей песней, танцем, актерской игрой или рассказом в таверне.',
      },
      {
        id: 'intimidation',
        name: 'Запугивание',
        abilityId: 'cha',
        usageExample: 'Заставить пленника говорить, отпугнуть бандитов угрозой или подавить волю оппонента.',
      },
      {
        id: 'history',
        name: 'История',
        abilityId: 'int',
        usageExample: 'Вспомнить древние войны, гербы знатных родов, легенды о руинах или хронологию событий.',
      },
      {
        id: 'sleight_of_hand',
        name: 'Ловкость рук',
        abilityId: 'dex',
        usageExample: 'Незаметно вытащить ключ из кармана, подбросить записку или показать фокус с монетой.',
      },
      {
        id: 'medicine',
        name: 'Медицина',
        abilityId: 'wis',
        usageExample: 'Стабилизировать умирающего союзника, определить причину ранения или распознать болезнь.',
      },
      {
        id: 'deception',
        name: 'Обман',
        abilityId: 'cha',
        usageExample: 'Убедительно солгать страже, выдать себя за другого человека или скрыть истинные мотивы.',
      },
      {
        id: 'animal_handling',
        name: 'Обращение с животными',
        abilityId: 'wis',
        usageExample: 'Успокоить испуганного коня, приручить дикого пса или угадать намерения зверя.',
      },
      {
        id: 'nature',
        name: 'Природа',
        abilityId: 'int',
        usageExample: 'Определить ядовитое растение, повадки монстра, климат местности или свойства минералов.',
      },
      {
        id: 'insight',
        name: 'Проницательность',
        abilityId: 'wis',
        usageExample: 'Распознать ложь по мимике и интонации, понять скрытые намерения собеседника.',
      },
      {
        id: 'investigation',
        name: 'Расследование',
        abilityId: 'int',
        usageExample: 'Найти потайной механизм по уликам, сопоставить факты преступления или расшифровать записку.',
      },
      {
        id: 'religion',
        name: 'Религия',
        abilityId: 'int',
        usageExample: 'Узнать символику культа, вспомнить молитвы, божественную иерархию и священные обряды.',
      },
      {
        id: 'stealth',
        name: 'Скрытность',
        abilityId: 'dex',
        usageExample: 'Бесшумно прокрасться мимо часовых, спрятаться в тени или устроить засаду.',
      },
      {
        id: 'arcana',
        name: 'Тайная магия',
        abilityId: 'int',
        usageExample: 'Распознать заклинание, природу артефакта, магический символ или аномалию планов.',
      },
      {
        id: 'persuasion',
        name: 'Убеждение',
        abilityId: 'cha',
        usageExample: 'Договориться о скидке, склонить лорда к союзу или мирно уладить конфликт.',
      },
    ],
    proficiencies: [
      {
        id: 'weapon_simple',
        name: 'Владение простым оружием',
        category: 'weapon',
        description: 'Кинжалы, дубины, копья, короткие луки и другое базовое оружие.',
      },
      {
        id: 'weapon_martial',
        name: 'Владение воинским оружием',
        category: 'weapon',
        description: 'Длинные и двуручные мечи, секиры, алебарды, длинные луки и тяжелые арбалеты.',
      },
      {
        id: 'weapon_melee',
        name: 'Владение рукопашным оружием',
        category: 'weapon',
        description: 'Оружие ближнего боя: клинки, топоры, молоты и древковое вооружение.',
      },
      {
        id: 'weapon_ranged',
        name: 'Владение дальнобойным оружием',
        category: 'weapon',
        description: 'Луки, арбалеты, пращи и метательное оружие дальнего боя.',
      },
      {
        id: 'armor_light',
        name: 'Владение лёгкими доспехами',
        category: 'armor',
        description: 'Стёганый, кожаный и проклёпанный кожаный доспех.',
      },
      {
        id: 'armor_medium',
        name: 'Владение средними доспехами',
        category: 'armor',
        description: 'Шкурный доспех, кольчужная рубаха, чешуйчатый доспех, кираса и полулаты.',
      },
      {
        id: 'armor_heavy',
        name: 'Владение тяжёлыми доспехами',
        category: 'armor',
        description: 'Колечный, кольчужный, пластинчатый и латный доспехи.',
      },
      {
        id: 'armor_shield',
        name: 'Владение щитом',
        category: 'armor',
        description: 'Использование щитов для повышения Класса Защиты (+2).',
      },
    ],
    visions: [
      {
        id: 'normal',
        name: 'Обычное зрение',
        behavior: 'normal',
        description:
          'Персонаж видит только в пределах освещённой зоны. В темноте он «ослеплён».',
      },
      {
        id: 'truesight',
        name: 'Истинное зрение',
        behavior: 'truesight',
        description:
          'Если у вас есть Истинное зрение, ваше зрение улучшается в пределах указанной дальности. В этих пределах ваше зрение проникает сквозь следующее:\n\nТемнота. Вы можете видеть в обычной и магической Темноте.\n\nНевидимость. Вы видите существ и предметы, у которых есть состояние Невидимый.\n\nВизуальные иллюзии. Визуальные иллюзии кажутся вам прозрачными, и вы автоматически преуспеваете в спасбросках против них.\n\nПреображения. Вы распознаёте истинную форму любого видимого вами изменённого магией существа или объекта.\n\nЭфирный план. Вы можете видеть на Эфирный план.',
      },
      {
        id: 'blindsight',
        name: 'Слепое зрение',
        behavior: 'blindsight',
        description:
          'Обладая Слепым зрением, вы можете видеть в определённых пределах, не полагаясь на обычное зрение. В пределах, ограниченных дальностью Слепого зрения, вы видите всё, что не находится за Полным укрытием, даже если у вас есть состояние Ослеплённый, или вы находитесь в области Темноты. Кроме того, в этих пределах вы можете видеть существ, у которых есть состояние Невидимый.',
      },
      {
        id: 'darkvision',
        name: 'Тёмное зрение',
        behavior: 'darkvision',
        description:
          'Если у вас есть Тёмное зрение, то в пределах дальности этого зрения вы видите в Тусклом свете будто в Ярком свете, а в Темноте будто в Тусклом свете. Вы не различаете цвета, видя Тёмным зрением в Темноте, а видите всё как оттенки серого.',
      },
      {
        id: 'tremorsense',
        name: 'Чувство вибрации',
        behavior: 'tremorsense',
        description:
          'Существо, обладающее Чувством вибрации, может определять местоположение существ и движущихся объектов в определённых пределах, если и обладатель Чувства вибрации, и ощущаемое им существо или объект находятся в контакте с одной и той же поверхностью (как, например, земля, стена, потолок) или жидкостью.\n\nЧувство вибрации не может определять местоположение существ или объектов, находящихся в воздухе. Чувство вибрации не считается зрением.',
      },
    ],
    conditions: DEFAULT_CONDITIONS.map((c) => ({ ...c })),
    weaponProperties: DEFAULT_WEAPON_PROPERTIES.map((p) => ({ ...p })),
    weaponMasteries: DEFAULT_WEAPON_MASTERIES.map((m) => ({ ...m })),
    weapons: DEFAULT_WEAPONS.map((w) => ({
      ...w,
      propertyIds: w.propertyIds ? [...w.propertyIds] : undefined,
    })),
    armors: [
      makeArmor('arm-padded', 'light', 'Стёганый доспех', 11, 'dex', null, '—', 'Помеха', '8 фнт.', '5 зм'),
      makeArmor('arm-leather', 'light', 'Кожаный доспех', 11, 'dex', null, '—', '—', '10 фнт.', '10 зм'),
      makeArmor('arm-studded-leather', 'light', 'Проклёпанный кожаный доспех', 12, 'dex', null, '—', '—', '13 фнт.', '45 зм'),
      makeArmor('arm-hide', 'medium', 'Шкурный доспех', 12, 'dex', 2, '—', '—', '12 фнт.', '10 зм'),
      makeArmor('arm-chain-shirt', 'medium', 'Кольчужная рубаха', 13, 'dex', 2, '—', '—', '20 фнт.', '50 зм'),
      makeArmor('arm-scale-mail', 'medium', 'Чешуйчатый доспех', 14, 'dex', 2, '—', 'Помеха', '45 фнт.', '50 зм'),
      makeArmor('arm-breastplate', 'medium', 'Кираса', 14, 'dex', 2, '—', '—', '20 фнт.', '400 зм'),
      makeArmor('arm-half-plate', 'medium', 'Полулаты', 15, 'dex', 2, '—', 'Помеха', '40 фнт.', '750 зм'),
      makeArmor('arm-ring-mail', 'heavy', 'Колечный доспех', 14, null, null, '—', 'Помеха', '40 фнт.', '30 зм'),
      makeArmor('arm-chain-mail', 'heavy', 'Кольчужный доспех', 16, null, null, 'Сила 13', 'Помеха', '55 фнт.', '75 зм'),
      makeArmor('arm-splint', 'heavy', 'Пластинчатый доспех', 17, null, null, 'Сила 15', 'Помеха', '60 фнт.', '200 зм'),
      makeArmor('arm-plate', 'heavy', 'Латный доспех', 18, null, null, 'Сила 15', 'Помеха', '65 фнт.', '1500 зм'),
      makeArmor('arm-shield', 'shield', 'Щит', 2, null, null, '—', '—', '6 фнт.', '10 зм'),
    ],
    gearItems: DEFAULT_GEAR_ITEMS.map((g) => ({
      ...g,
      compatibleWeaponIds: g.compatibleWeaponIds ? [...g.compatibleWeaponIds] : undefined,
    })),
    monsters: [
      {
        id: 'mon-rat',
        name: 'Крыса',
        ac: 10,
        maxHp: 1,
        hpFormula: '1к4 − 1',
        initiative: 10,
        speed: 20,
        abilities: {
          str: 2,
          dex: 11,
          con: 9,
          int: 2,
          wis: 10,
          cha: 4,
        },
        proficientSkillIds: ['perception'],
        visions: [{ visionId: 'darkvision', rangeFt: 30 }],
        xpReward: 10,
        actions: [
          {
            id: 'act-rat-bite',
            name: 'Укус',
            description:
              'Бросок рукопашной атаки: +2 к попаданию, досягаемость 5 футов. Попадание: 1 колющий урон.',
            attackType: 'melee',
            reachFt: 5,
          },
        ],
      },
    ],
  };
}

export function sortLevels(levels: LevelThresholdRef[]): LevelThresholdRef[] {
  return [...levels].sort((a, b) => a.minXp - b.minXp || a.level - b.level);
}

export function sortAbilityModifiers(rows: AbilityModifierRef[]): AbilityModifierRef[] {
  return [...rows].sort((a, b) => a.minScore - b.minScore || a.maxScore - b.maxScore);
}

export function computeLevelFromXp(xp: number, levels: LevelThresholdRef[]): number {
  const safeXp = Math.max(0, Math.floor(Number(xp) || 0));
  if (!levels || levels.length === 0) return 1;
  const sorted = sortLevels(levels);
  let matchedLevel = sorted[0].level;
  for (const row of sorted) {
    if (safeXp >= row.minXp) {
      matchedLevel = row.level;
    } else {
      break;
    }
  }
  return matchedLevel;
}

export function getNextLevelThreshold(xp: number, levels: LevelThresholdRef[]): LevelThresholdRef | null {
  const safeXp = Math.max(0, Math.floor(Number(xp) || 0));
  const sorted = sortLevels(levels);
  for (const row of sorted) {
    if (row.minXp > safeXp) {
      return row;
    }
  }
  return null;
}

export function getAbilityModifier(
  score: number,
  abilityModifiers?: AbilityModifierRef[]
): number {
  const numeric = Math.round(Number(score));
  const safeScore = Number.isFinite(numeric) ? numeric : 10;
  if (Array.isArray(abilityModifiers) && abilityModifiers.length > 0) {
    const matched = abilityModifiers.find(
      (row) => safeScore >= row.minScore && safeScore <= row.maxScore
    );
    if (matched) {
      return matched.modifier;
    }
  }
  return Math.floor((safeScore - 10) / 2);
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function formatAbilityRange(row: Pick<AbilityModifierRef, 'minScore' | 'maxScore'>): string {
  return row.minScore === row.maxScore ? `${row.minScore}` : `${row.minScore}–${row.maxScore}`;
}

export function getProficiencyBonus(level: number): number {
  return Math.floor((Math.max(1, level) - 1) / 4) + 2;
}

export function getWeaponCategoryLabel(category: WeaponCategory): string {
  return category === 'martial' ? 'Воинское' : 'Простое';
}

export function getWeaponRangeLabel(rangeType: WeaponRangeType): string {
  return rangeType === 'ranged' ? 'Дальнобойное' : 'Рукопашное';
}

export function getArmorCategoryLabel(category: ArmorCategory): string {
  if (category === 'shield') return 'Щит';
  if (category === 'heavy') return 'Тяжёлые доспехи';
  if (category === 'medium') return 'Средние доспехи';
  return 'Лёгкие доспехи';
}

export function formatArmorClassFormula(
  armor: {
    category?: ArmorCategory;
    acBase: number;
    acAbilityId?: string | null;
    acMaxBonus?: number | null;
  },
  abilities: AbilityRef[]
): string {
  const base = Number.isFinite(armor.acBase) ? Math.round(armor.acBase) : 10;
  const ability = armor.acAbilityId
    ? abilities.find((a) => a.id === armor.acAbilityId)
    : undefined;
  const maxBonus =
    typeof armor.acMaxBonus === 'number' && Number.isFinite(armor.acMaxBonus)
      ? Math.round(armor.acMaxBonus)
      : null;

  if (armor.category === 'shield') {
    let str = base >= 0 ? `+${base}` : `${base}`;
    if (ability) {
      str += ` + мод. ${ability.shortName}`;
      if (maxBonus !== null) str += ` (не более ${maxBonus})`;
    }
    return str;
  }

  let str = `${base}`;
  if (ability) {
    str += ` + мод. ${ability.shortName}`;
    if (maxBonus !== null) {
      str += ` (не более ${maxBonus})`;
    }
  }
  return str;
}

export function parseLegacyArmorClass(
  raw: string | undefined,
  category: ArmorCategory
): { acBase: number; acAbilityId: string | null; acMaxBonus: number | null } {
  if (category === 'shield') {
    const match = /\d+/.exec(raw || '');
    return { acBase: match ? Number(match[0]) : 2, acAbilityId: null, acMaxBonus: null };
  }
  const baseMatch = /\d+/.exec(raw || '');
  const acBase = baseMatch ? Number(baseMatch[0]) : 10;
  const lower = (raw || '').toLowerCase();
  const hasDex = lower.includes('лов');
  const maxMatch = /(?:макс\.?|не более)\s*(\d+)/i.exec(lower);
  const acMaxBonus = maxMatch ? Number(maxMatch[1]) : null;
  return {
    acBase,
    acAbilityId: hasDex ? 'dex' : null,
    acMaxBonus: hasDex ? acMaxBonus : null,
  };
}

export function inferWeaponRangeType(name: string, properties?: string): WeaponRangeType {
  const text = `${name} ${properties || ''}`.toLowerCase();
  if (
    text.includes('лук') ||
    text.includes('арбалет') ||
    text.includes('праща') ||
    text.includes('боеприпас')
  ) {
    return 'ranged';
  }
  return 'melee';
}

export function resolveInventoryArmorCategory(
  item: InventoryItem,
  catalogs: GameCatalogs
): ArmorCategory | undefined {
  if (item.armorCategory) return item.armorCategory;
  const catalogArmor =
    (item.catalogItemId
      ? catalogs.armors.find((a) => a.id === item.catalogItemId)
      : undefined) ??
    catalogs.armors.find((a) => a.name.trim().toLowerCase() === item.name.trim().toLowerCase());
  return catalogArmor?.category;
}

export function computePlayerAcDetails(
  player: Pick<PlayerCharacter, 'abilities' | 'inventory'> & {
    classId?: string;
    subclassId?: string;
    level?: number;
  },
  catalogs: GameCatalogs
): { total: number; breakdown: string; automatedBy?: string } {
  const dexScore = player.abilities?.dex ?? 10;
  const dexMod = getAbilityModifier(dexScore, catalogs.abilityModifiers);

  const equippedArmors = (player.inventory || []).filter(
    (item) => item.equipped && item.category === 'armor'
  );

  let bodyArmorItem: InventoryItem | undefined;
  let shieldItem: InventoryItem | undefined;

  for (const item of equippedArmors) {
    const cat = resolveInventoryArmorCategory(item, catalogs);
    if (cat === 'shield') {
      if (!shieldItem) shieldItem = item;
    } else {
      if (!bodyArmorItem) bodyArmorItem = item;
    }
  }

  let baseAc = 10 + dexMod;
  let baseLabel = `10 + ЛОВ (${formatModifier(dexMod)})`;
  let automatedBy: string | undefined;

  if (!bodyArmorItem) {
    const level = Math.max(1, Math.floor(Number(player.level) || 1));
    // Barbarian Unarmored Defense: 10 + DEX + CON (allowed with shield)
    if (player.classId === 'barbarian') {
      const conMod = getAbilityModifier(player.abilities?.con ?? 10, catalogs.abilityModifiers);
      const barbAc = 10 + dexMod + conMod;
      if (barbAc >= baseAc) {
        baseAc = barbAc;
        baseLabel = `Защита без доспехов: 10 + ЛОВ (${formatModifier(dexMod)}) + ТЕЛ (${formatModifier(conMod)})`;
        automatedBy = 'Защита без доспехов (Варвар)';
      }
    }
    // Monk Unarmored Defense: 10 + DEX + WIS (no armor, no shield)
    if (player.classId === 'monk' && !shieldItem) {
      const wisMod = getAbilityModifier(player.abilities?.wis ?? 10, catalogs.abilityModifiers);
      const monkAc = 10 + dexMod + wisMod;
      if (monkAc >= baseAc) {
        baseAc = monkAc;
        baseLabel = `Защита без доспехов: 10 + ЛОВ (${formatModifier(dexMod)}) + МДР (${formatModifier(wisMod)})`;
        automatedBy = 'Защита без доспехов (Монах)';
      }
    }
    // Draconic Sorcerer: 10 + DEX + CHA (lvl 3+, no armor)
    if (
      player.classId === 'sorcerer' &&
      player.subclassId === 'sorcerer-draconic-sorcery' &&
      level >= 3
    ) {
      const chaMod = getAbilityModifier(player.abilities?.cha ?? 10, catalogs.abilityModifiers);
      const draconicAc = 10 + dexMod + chaMod;
      if (draconicAc >= baseAc) {
        baseAc = draconicAc;
        baseLabel = `Драконья устойчивость: 10 + ЛОВ (${formatModifier(dexMod)}) + ХАР (${formatModifier(chaMod)})`;
        automatedBy = 'Драконья устойчивость (Чародей)';
      }
    }
  }

  if (bodyArmorItem) {
    const catalogArmor =
      (bodyArmorItem.catalogItemId
        ? catalogs.armors.find((a) => a.id === bodyArmorItem.catalogItemId)
        : undefined) ??
      catalogs.armors.find(
        (a) => a.name.trim().toLowerCase() === bodyArmorItem.name.trim().toLowerCase()
      );
    const cat = bodyArmorItem.armorCategory ?? catalogArmor?.category ?? 'light';
    const parsedFallback = parseLegacyArmorClass(
      bodyArmorItem.armorClass ?? catalogArmor?.armorClass,
      cat
    );
    const acBase =
      typeof bodyArmorItem.acBase === 'number'
        ? bodyArmorItem.acBase
        : typeof catalogArmor?.acBase === 'number'
          ? catalogArmor.acBase
          : parsedFallback.acBase;
    const acAbilityId =
      bodyArmorItem.acAbilityId !== undefined
        ? bodyArmorItem.acAbilityId
        : catalogArmor !== undefined
          ? catalogArmor.acAbilityId
          : parsedFallback.acAbilityId;
    const acMaxBonus =
      bodyArmorItem.acMaxBonus !== undefined
        ? bodyArmorItem.acMaxBonus
        : catalogArmor !== undefined
          ? catalogArmor.acMaxBonus
          : parsedFallback.acMaxBonus;

    let abilityBonus = 0;
    if (acAbilityId) {
      const abScore = player.abilities?.[acAbilityId] ?? 10;
      const rawMod = getAbilityModifier(abScore, catalogs.abilityModifiers);
      abilityBonus =
        typeof acMaxBonus === 'number' && Number.isFinite(acMaxBonus)
          ? Math.min(rawMod, acMaxBonus)
          : rawMod;
    }
    baseAc = acBase + abilityBonus;
    baseLabel = bodyArmorItem.name;
  }

  let shieldBonus = 0;
  let shieldLabel = '';
  if (shieldItem) {
    const catalogShield =
      (shieldItem.catalogItemId
        ? catalogs.armors.find((a) => a.id === shieldItem.catalogItemId)
        : undefined) ??
      catalogs.armors.find(
        (a) => a.name.trim().toLowerCase() === shieldItem.name.trim().toLowerCase()
      );
    const parsedFallback = parseLegacyArmorClass(
      shieldItem.armorClass ?? catalogShield?.armorClass,
      'shield'
    );
    const shBase =
      typeof shieldItem.acBase === 'number'
        ? shieldItem.acBase
        : typeof catalogShield?.acBase === 'number'
          ? catalogShield.acBase
          : parsedFallback.acBase;
    const shAbilityId =
      shieldItem.acAbilityId !== undefined
        ? shieldItem.acAbilityId
        : catalogShield?.acAbilityId ?? null;
    const shMaxBonus =
      shieldItem.acMaxBonus !== undefined
        ? shieldItem.acMaxBonus
        : catalogShield?.acMaxBonus ?? null;

    let extra = 0;
    if (shAbilityId) {
      const rawMod = getAbilityModifier(
        player.abilities?.[shAbilityId] ?? 10,
        catalogs.abilityModifiers
      );
      extra =
        typeof shMaxBonus === 'number' && Number.isFinite(shMaxBonus)
          ? Math.min(rawMod, shMaxBonus)
          : rawMod;
    }
    shieldBonus = shBase + extra;
    shieldLabel = ` + ${shieldItem.name} (${formatModifier(shieldBonus)})`;
  }

  return {
    total: Math.max(1, baseAc + shieldBonus),
    breakdown: `${baseLabel}${shieldLabel}`,
    automatedBy,
  };
}

export function computePlayerAc(
  player: Pick<PlayerCharacter, 'abilities' | 'inventory'> & {
    classId?: string;
    subclassId?: string;
    level?: number;
  },
  catalogs: GameCatalogs
): number {
  return computePlayerAcDetails(player, catalogs).total;
}

export function computePlayerInitiative(
  abilities: Record<string, number> | undefined,
  catalogs: Pick<GameCatalogs, 'abilityModifiers'>
): number {
  const dexScore = abilities?.dex ?? 10;
  return 10 + getAbilityModifier(dexScore, catalogs.abilityModifiers);
}

// ============================================================================
// Condition Effects, Effective Speed, Initiative Bonus & Skill Automation
// ============================================================================

export interface ActiveConditionEffects {
  speedZero: boolean;
  speedZeroSources: string[];
  blinded: boolean;
  unaware: boolean;
  incapacitated: boolean;
  isDying: boolean;
  isStabilized: boolean;
  encumbranceTier: 'none' | 'light' | 'heavy' | 'max';
  encumbranceSpeedPenaltyFt: number;
  encumbranceSpeedCapFt: number | null;
  strDexConDisadvantage: boolean;
  exhaustionLevel: number;
  d20Penalty: number;
  speedPenaltyFt: number;
  attackDisadvantage: string[];
  attackAdvantage: string[];
  checkDisadvantage: string[];
  initiativeAdvantage: boolean;
  initiativeDisadvantage: boolean;
  autoFailStrDexSaves: boolean;
  dexSaveDisadvantage: boolean;
  combatCallouts: string[];
}

function normalizeConditionKey(name: string): string {
  const lower = name.trim().toLowerCase().replace(/ё/g, 'е');
  if (lower.includes('бессознат')) return 'unconscious';
  if (lower.includes('испуг')) return 'frightened';
  if (lower.includes('истощ')) return 'exhaustion';
  if (lower.includes('невидим')) return 'invisible';
  if (lower.includes('недееспособ')) return 'incapacitated';
  if (lower.includes('оглох')) return 'deafened';
  if (lower.includes('окаменев')) return 'petrified';
  if (lower.includes('опрокин')) return 'prone';
  if (lower.includes('опутан')) return 'restrained';
  if (lower.includes('ослепл')) return 'blinded';
  if (lower.includes('отравл')) return 'poisoned';
  if (lower.includes('максимальн') && lower.includes('лимит')) return 'over_carry_limit';
  if (lower.includes('сильно') && lower.includes('перегруж')) return 'heavily_encumbered';
  if (lower.includes('слегка') && lower.includes('перегруж')) return 'encumbered';
  if (lower.includes('умирающ')) return 'dying';
  if (lower.includes('стабилизир')) return 'stabilized';
  return lower;
}

export function getActiveConditionEffects(
  conditions: string[] | undefined,
  exhaustionLevel?: number
): ActiveConditionEffects {
  const list = Array.isArray(conditions) ? conditions : [];
  const keys = new Set(list.map(normalizeConditionKey));

  const isDying = keys.has('dying');
  const isStabilized = keys.has('stabilized');

  const speedZeroSources: string[] = [];
  if (keys.has('unconscious')) speedZeroSources.push('Бессознательный');
  if (keys.has('petrified')) speedZeroSources.push('Окаменевший');
  if (keys.has('restrained')) speedZeroSources.push('Опутанный');
  if (keys.has('incapacitated')) speedZeroSources.push('Недееспособный');
  if (isDying && !keys.has('unconscious')) speedZeroSources.push('Умирающий');

  const unaware = keys.has('unconscious') || keys.has('petrified') || isDying;
  const blinded = unaware || keys.has('blinded');
  const incapacitated = unaware || keys.has('incapacitated');

  const encumbranceTier: 'none' | 'light' | 'heavy' | 'max' = keys.has('over_carry_limit')
    ? 'max'
    : keys.has('heavily_encumbered')
      ? 'heavy'
      : keys.has('encumbered')
        ? 'light'
        : 'none';
  const encumbranceSpeedPenaltyFt =
    encumbranceTier === 'heavy' ? 20 : encumbranceTier === 'light' ? 10 : 0;
  const encumbranceSpeedCapFt = encumbranceTier === 'max' ? 5 : null;
  const strDexConDisadvantage = encumbranceTier === 'heavy' || encumbranceTier === 'max';

  const effExhaustion = keys.has('exhaustion')
    ? Math.max(1, Math.min(6, Math.round(Number(exhaustionLevel) || 1)))
    : 0;
  const d20Penalty = effExhaustion > 0 ? -(effExhaustion * 2) : 0;
  const speedPenaltyFt = effExhaustion > 0 ? effExhaustion * 5 : 0;

  const attackDisadvantage: string[] = [];
  if (keys.has('blinded')) attackDisadvantage.push('Ослеплённый');
  if (keys.has('frightened')) attackDisadvantage.push('Испуганный');
  if (keys.has('poisoned')) attackDisadvantage.push('Отравленный');
  if (keys.has('prone')) attackDisadvantage.push('Опрокинутый');
  if (keys.has('restrained')) attackDisadvantage.push('Опутанный');
  if (encumbranceTier === 'heavy') attackDisadvantage.push('Сильно перегружен (СИЛ/ЛОВ/ТЕЛ)');
  if (encumbranceTier === 'max') attackDisadvantage.push('Максимальный лимит (СИЛ/ЛОВ/ТЕЛ)');

  const attackAdvantage: string[] = [];
  if (keys.has('invisible')) attackAdvantage.push('Невидимый');

  const checkDisadvantage: string[] = [];
  if (keys.has('poisoned')) checkDisadvantage.push('Отравленный');
  if (keys.has('frightened')) checkDisadvantage.push('Испуганный');
  if (encumbranceTier === 'heavy') checkDisadvantage.push('Сильно перегружен (СИЛ/ЛОВ/ТЕЛ)');
  if (encumbranceTier === 'max') checkDisadvantage.push('Максимальный лимит (СИЛ/ЛОВ/ТЕЛ)');

  const initiativeAdvantage = keys.has('invisible');
  const initiativeDisadvantage = incapacitated;
  const autoFailStrDexSaves = keys.has('unconscious') || keys.has('petrified');
  const dexSaveDisadvantage = keys.has('restrained') || strDexConDisadvantage;

  const combatCallouts: string[] = [];
  if (isDying) {
    combatCallouts.push('Умирающий (0 HP): в начале хода спасбросок от смерти (1к20)');
  } else if (isStabilized) {
    combatCallouts.push('Стабилизирован (0 HP): без сознания, спасброски от смерти остановлены');
  }
  if (speedZeroSources.length > 0) {
    combatCallouts.push(`Скорость = 0 фт. (${speedZeroSources.join(', ')})`);
  } else if (encumbranceTier === 'max') {
    combatCallouts.push(
      'Максимальный лимит веса: Скорость = 5 фт. · Помеха на проверки, атаки и спасброски СИЛ/ЛОВ/ТЕЛ'
    );
  } else if (encumbranceTier === 'heavy') {
    combatCallouts.push(
      'Сильно перегружен: Скорость −20 фт. · Помеха на проверки, атаки и спасброски СИЛ/ЛОВ/ТЕЛ'
    );
  } else if (encumbranceTier === 'light') {
    combatCallouts.push('Слегка перегружен: Скорость −10 фт.');
  }
  if (effExhaustion > 0) {
    combatCallouts.push(
      `Истощение ур. ${effExhaustion}: ${d20Penalty} к тестам к20, −${speedPenaltyFt} фт. скорости`
    );
  }
  if (incapacitated) {
    combatCallouts.push('Не может совершать действия, бонусные действия, реакции и концентрацию');
  }
  if (attackDisadvantage.length > 0) {
    combatCallouts.push(`Помеха на атаки (${attackDisadvantage.join(', ')})`);
  }
  if (attackAdvantage.length > 0) {
    combatCallouts.push(`Преимущество на атаки и инициативу (${attackAdvantage.join(', ')})`);
  }
  if (checkDisadvantage.length > 0) {
    combatCallouts.push(`Помеха на проверки характеристик (${checkDisadvantage.join(', ')})`);
  }
  if (keys.has('unconscious')) {
    combatCallouts.push('Атаки в пределах 5 фт. — автокрит; автопровал спасбросков СИЛ/ЛОВ');
  } else if (keys.has('petrified')) {
    combatCallouts.push('Сопротивление всему урону; автопровал спасбросков СИЛ/ЛОВ');
  }
  if (keys.has('prone') && !keys.has('unconscious')) {
    combatCallouts.push('Атаки по цели в 5 фт. с Преимуществом, дальше 5 фт. — с Помехой');
  }

  return {
    speedZero: speedZeroSources.length > 0,
    speedZeroSources,
    blinded,
    unaware,
    incapacitated,
    isDying,
    isStabilized,
    encumbranceTier,
    encumbranceSpeedPenaltyFt,
    encumbranceSpeedCapFt,
    strDexConDisadvantage,
    exhaustionLevel: effExhaustion,
    d20Penalty,
    speedPenaltyFt,
    attackDisadvantage,
    attackAdvantage,
    checkDisadvantage,
    initiativeAdvantage,
    initiativeDisadvantage,
    autoFailStrDexSaves,
    dexSaveDisadvantage,
    combatCallouts,
  };
}

export function computePlayerEffectiveSpeed(
  player: Pick<PlayerCharacter, 'classId' | 'level' | 'inventory' | 'conditions'> & {
    speed?: number;
    exhaustionLevel?: number;
  },
  catalogs: Pick<GameCatalogs, 'classes' | 'armors'>
): { baseFt: number; effectiveFt: number; breakdown: string; isZeroByCondition: boolean } {
  const baseFt =
    typeof player.speed === 'number' && Number.isFinite(player.speed) && player.speed >= 0
      ? Math.round(player.speed)
      : 30;
  const effects = getActiveConditionEffects(player.conditions, player.exhaustionLevel);
  if (effects.speedZero) {
    return {
      baseFt,
      effectiveFt: 0,
      breakdown: `0 фт. (${effects.speedZeroSources.join(', ')})`,
      isZeroByCondition: true,
    };
  }

  const equippedArmors = (player.inventory || []).filter(
    (i) => i.equipped && i.category === 'armor'
  );
  let hasAnyArmor = false;
  let hasHeavyArmor = false;
  let hasShield = false;
  for (const item of equippedArmors) {
    const cat = resolveInventoryArmorCategory(item, catalogs as GameCatalogs);
    if (cat === 'shield') hasShield = true;
    else {
      hasAnyArmor = true;
      if (cat === 'heavy') hasHeavyArmor = true;
    }
  }

  let bonusFt = 0;
  const parts: string[] = [`База ${baseFt} фт.`];
  const level = Math.max(1, Math.floor(Number(player.level) || 1));

  // Barbarian Fast Movement (lvl 5+, no heavy armor)
  if (player.classId === 'barbarian' && level >= 5 && !hasHeavyArmor) {
    bonusFt += 10;
    parts.push('+10 фт. (Быстрое передвижение)');
  }

  // Monk Unarmored Movement (lvl 2+, no armor and no shield)
  if (player.classId === 'monk' && level >= 2 && !hasAnyArmor && !hasShield) {
    const monkCls = catalogs.classes.find((c) => c.id === 'monk');
    const moveRes = monkCls?.classResources?.find((r) => r.id === 'monk-res-5');
    const rawVal = moveRes?.values[Math.min(level - 1, (moveRes.values.length || 1) - 1)] ?? '';
    const m = /\d+/.exec(rawVal);
    const monkBonus = m ? Number(m[0]) : 10;
    if (monkBonus > 0) {
      bonusFt += monkBonus;
      parts.push(`+${monkBonus} фт. (Движение без доспехов)`);
    }
  }

  if (effects.speedPenaltyFt > 0) {
    parts.push(`−${effects.speedPenaltyFt} фт. (Истощение ур. ${effects.exhaustionLevel})`);
  }

  let effectiveFt = Math.max(0, baseFt + bonusFt - effects.speedPenaltyFt);

  if (effects.encumbranceSpeedCapFt !== null) {
    effectiveFt = Math.min(effectiveFt, effects.encumbranceSpeedCapFt);
    parts.push(`→ макс. ${effects.encumbranceSpeedCapFt} фт. (Максимальный лимит веса)`);
  } else if (effects.encumbranceSpeedPenaltyFt > 0) {
    effectiveFt = Math.max(0, effectiveFt - effects.encumbranceSpeedPenaltyFt);
    const encLabel =
      effects.encumbranceTier === 'heavy' ? 'Сильно перегружен' : 'Слегка перегружен';
    parts.push(`−${effects.encumbranceSpeedPenaltyFt} фт. (${encLabel})`);
  }

  return {
    baseFt,
    effectiveFt,
    breakdown: parts.join(' '),
    isZeroByCondition: false,
  };
}

export function computePlayerInitiativeDetails(
  player: Pick<
    PlayerCharacter,
    'abilities' | 'classId' | 'level' | 'backgroundId' | 'featIds' | 'conditions'
  > & { exhaustionLevel?: number },
  catalogs: Pick<GameCatalogs, 'abilityModifiers' | 'classes' | 'backgrounds' | 'feats'>
): {
  bonus: number;
  dexMod: number;
  passiveTotal: number;
  breakdown: string;
  hasAdvantage: boolean;
  hasDisadvantage: boolean;
} {
  const dexMod = getAbilityModifier(player.abilities?.dex ?? 10, catalogs.abilityModifiers);
  const classRef = catalogs.classes.find((c) => c.id === player.classId) ?? null;
  const profBonus = getClassProficiencyBonus(player.level, classRef);
  const feats = getHeroFeats(player, catalogs);
  const hasAlert = feats.some((f) => f.id === 'alert');
  const isBardJack = player.classId === 'bard' && player.level >= 2;
  const effects = getActiveConditionEffects(player.conditions, player.exhaustionLevel);

  let bonus = dexMod;
  const parts: string[] = [`ЛОВ (${formatModifier(dexMod)})`];

  if (hasAlert) {
    bonus += profBonus;
    parts.push(`Бдительный (+${profBonus})`);
  } else if (isBardJack) {
    const halfPb = Math.floor(profBonus / 2);
    if (halfPb > 0) {
      bonus += halfPb;
      parts.push(`Мастер на все руки (+${halfPb})`);
    }
  }

  if (effects.d20Penalty !== 0) {
    bonus += effects.d20Penalty;
    parts.push(`Истощение (${effects.d20Penalty})`);
  }

  return {
    bonus,
    dexMod,
    passiveTotal: 10 + bonus,
    breakdown: `${parts.join(' + ')} = ${formatModifier(bonus)}`,
    hasAdvantage: effects.initiativeAdvantage,
    hasDisadvantage: effects.initiativeDisadvantage,
  };
}

export function computeHeroSkillTotal(
  player: Pick<
    PlayerCharacter,
    | 'abilities'
    | 'classId'
    | 'level'
    | 'proficientSkillIds'
    | 'expertiseSkillIds'
    | 'conditions'
  > & { exhaustionLevel?: number },
  skill: Pick<SkillRef, 'id' | 'abilityId'>,
  catalogs: Pick<GameCatalogs, 'abilityModifiers' | 'classes'>
): {
  total: number;
  isProficient: boolean;
  isExpertise: boolean;
  hasJackOfAllTrades: boolean;
  exhaustionPenalty: number;
} {
  const classRef = catalogs.classes.find((c) => c.id === player.classId) ?? null;
  const profBonus = getClassProficiencyBonus(player.level, classRef);
  const abMod = getAbilityModifier(
    player.abilities?.[skill.abilityId] ?? 10,
    catalogs.abilityModifiers
  );
  const isExpertise = (player.expertiseSkillIds ?? []).includes(skill.id);
  const isProficient = isExpertise || player.proficientSkillIds.includes(skill.id);
  const hasJackOfAllTrades =
    !isProficient && player.classId === 'bard' && player.level >= 2;
  const effects = getActiveConditionEffects(player.conditions, player.exhaustionLevel);

  const profAdd = isExpertise
    ? profBonus * 2
    : isProficient
      ? profBonus
      : hasJackOfAllTrades
        ? Math.floor(profBonus / 2)
        : 0;

  return {
    total: abMod + profAdd + effects.d20Penalty,
    isProficient,
    isExpertise,
    hasJackOfAllTrades,
    exhaustionPenalty: effects.d20Penalty,
  };
}

export function parseStrengthRequirement(raw?: string): number | null {
  if (!raw) return null;
  const match = /\d+/.exec(raw);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function hasProficiencyFor(
  player: Pick<PlayerCharacter, 'proficiencyIds'>,
  catalogs: GameCatalogs,
  expectedId: string,
  keywordGroups: string[][]
): boolean {
  if (player.proficiencyIds.includes(expectedId)) return true;
  const ownedRefs = catalogs.proficiencies.filter((p) => player.proficiencyIds.includes(p.id));
  return ownedRefs.some((pr) => {
    const lower = pr.name.toLowerCase();
    return keywordGroups.some((group) => group.every((kw) => lower.includes(kw)));
  });
}

export const DEFAULT_WEAPON_PROPERTIES: WeaponPropertyRef[] = [
  {
    id: 'prop-versatile',
    name: 'Универсальное',
    description:
      'Универсальным оружием можно пользоваться как одной, так и двумя руками. Если вы совершаете рукопашную атаку этим оружием с использованием двух рук, то наносите им повышенный урон (например, не 1к6, а 1к8, или 1к10 вместо 1к8).',
  },
  {
    id: 'prop-light',
    name: 'Лёгкое',
    description:
      'Когда в свой ход вы совершаете действие Атака и атакуете Лёгким оружием, вы можете Бонусным действием позже в тот же ход совершить одну дополнительную атаку. Эта дополнительная атака должна быть совершена другим Лёгким оружием, и вы не добавляете модификатор характеристики к урону этой атаки, если только он не отрицательный.',
  },
  {
    id: 'prop-thrown',
    name: 'Метательное',
    description:
      'Вы можете совершать этим оружием дальнобойные атаки, метая его; вы можете вынуть такое оружие частью атаки. Вы используете в бросках атаки и урона модификатор той же характеристики, что и для рукопашных атак этим оружием. Нормальная дистанция атак при метании — 20 футов, а максимальная — 60 футов. Вы совершаете с Помехой броски атаки по цели за пределами нормальной дистанции, и не можете атаковать цель за пределами максимальной дистанции.',
  },
  {
    id: 'prop-finesse',
    name: 'Фехтовальное',
    description:
      'При совершении атаки Фехтовальным оружием вы выбираете, использовать при совершении бросков атаки и урона ваш модификатор Силы или Ловкости. Вы должны использовать один и тот же модификатор для обоих бросков.',
  },
  {
    id: 'prop-two-handed',
    name: 'Двуручное',
    description: 'Это оружие при атаке нужно держать двумя руками.',
  },
  {
    id: 'prop-heavy',
    name: 'Тяжёлое',
    description:
      'Вы совершаете с Помехой броски атаки этим оружием, если значение вашей Силы меньше 13.',
  },
  {
    id: 'prop-reach',
    name: 'Досягаемость',
    description:
      'Досягаемость ваших атак этим оружием, включая досягаемость Провоцированных атак этим оружием, увеличена на 5 футов.',
  },
  {
    id: 'prop-ammunition',
    name: 'Боеприпас',
    description:
      'Вы можете использовать это оружие для совершения дальнобойной атаки только если у вас есть нужные боеприпасы. Каждая атака расходует один боеприпас. Боеприпас заряжается как часть атаки (для зарядки одноручного оружия требуется одна свободная рука). После сражения вы можете потратить 1 минуту на поиски на поле боя, чтобы восполнить половину использованных боеприпасов (округляя вниз); остальные утрачены.',
  },
  {
    id: 'prop-loading',
    name: 'Перезарядка',
    description:
      'Когда вы стреляете действием, Бонусным действием или Реакцией из оружия со свойством Перезарядка, вы можете выстрелить только одним боеприпасом вне зависимости от количества атак, которые вы обычно можете совершить.',
  },
];

export const DEFAULT_WEAPON_MASTERIES: WeaponMasteryRef[] = [
  {
    id: 'mst-topple',
    name: 'Опрокидывание',
    description:
      'Если вы попадаете по существу этим оружием, можете заставить его совершить спасбросок Телосложения (Сл 8 + ваши Бонус владения и модификатор характеристики, используемой для броска атаки). При провале существо получает состояние Опрокинутый.',
  },
  {
    id: 'mst-sap',
    name: 'Ослабление',
    description:
      'Если вы попадаете по существу этим оружием, оно будет совершать с Помехой следующий бросок атаки до начала вашего следующего хода.',
  },
  {
    id: 'mst-slow',
    name: 'Замедление',
    description:
      'Если вы попадаете по существу этим оружием и наносите урон, можете уменьшить его Скорость на 10 футов до начала вашего следующего хода. Если по существу попадают из оружия с таким свойством несколько раз, снижение Скорости от этого свойства не превышает 10 футов.',
  },
  {
    id: 'mst-nick',
    name: 'Быстрое',
    description:
      'Когда вы совершаете дополнительную атаку от свойства Лёгкое, можете совершить её не Бонусным действием, а частью действия Атака. Вы можете совершить эту дополнительную атаку только один раз за ход.',
  },
  {
    id: 'mst-vex',
    name: 'Досаждение',
    description:
      'Если вы попадаете по существу этим оружием и наносите урон, вы получаете Преимущество на ваш следующий бросок атаки по этому существу до конца вашего следующего хода.',
  },
  {
    id: 'mst-graze',
    name: 'Царапание',
    description:
      'Если ваш бросок атаки этим оружием промахивается по существу, вы можете нанести этому существу урон, равный модификатору характеристики, использованной для броска атаки. Тип этого урона такой же, как у оружия.',
  },
  {
    id: 'mst-cleave',
    name: 'Прорубание',
    description:
      'Если вы попадаете по существу рукопашной атакой этим оружием, можете совершить дополнительную рукопашную атаку этим оружием по второму существу в пределах 5 футов от первого, которое также находится в вашей досягаемости. При попадании вы наносите урон оружия без добавления модификатора характеристики, если только он не отрицательный (1 раз за ход).',
  },
  {
    id: 'mst-push',
    name: 'Толчок',
    description:
      'Если вы попадаете по существу этим оружием, можете оттолкнуть его на расстояние до 10 футов прямо от себя, если его размер Большой или меньше.',
  },
];

export const DEFAULT_GEAR_ITEMS: GearItemRef[] = [
  {
    id: 'gear-arrows',
    name: 'Стрелы',
    kind: 'ammunition',
    price: '1 ЗМ',
    weight: '1 фнт.',
    packQuantity: 20,
    containerId: 'gear-quiver',
    compatibleWeaponIds: ['wpn-shortbow', 'wpn-longbow'],
    description: 'Боеприпас для луков (Короткий лук, Длинный лук). Хранится в Колчане (до 20 шт.).',
  },
  {
    id: 'gear-bolts',
    name: 'Болты',
    kind: 'ammunition',
    price: '1 ЗМ',
    weight: '1.5 фнт.',
    packQuantity: 20,
    containerId: 'gear-bolt-case',
    compatibleWeaponIds: ['wpn-light-crossbow', 'wpn-hand-crossbow', 'wpn-heavy-crossbow'],
    description:
      'Боеприпас для арбалетов (Лёгкий арбалет, Одноручный арбалет, Тяжёлый арбалет). Хранится в Футляре для арбалетных болтов (до 20 шт.).',
  },
  {
    id: 'gear-bolt-case',
    name: 'Футляр для арбалетных болтов',
    kind: 'container',
    price: '1 ЗМ',
    weight: '1 фнт.',
    capacity: 20,
    storedAmmoId: 'gear-bolts',
    description: 'Футляр для арбалетных болтов вмещает до 20 Болтов.',
  },
  {
    id: 'gear-quiver',
    name: 'Колчан',
    kind: 'container',
    price: '1 ЗМ',
    weight: '1 фнт.',
    capacity: 20,
    storedAmmoId: 'gear-arrows',
    description: 'Колчан вмещает до 20 Стрел.',
  },
];

export const DEFAULT_WEAPONS: WeaponRef[] = [
  {
    id: 'wpn-dagger',
    category: 'simple',
    rangeType: 'melee',
    name: 'Кинжал',
    damage: '1к4 колющий',
    reachFt: 5,
    thrownNormalFt: 20,
    thrownMaxFt: 60,
    propertyIds: ['prop-finesse', 'prop-light', 'prop-thrown'],
    properties: 'Фехтовальное, Лёгкое, Метательное (20/60)',
    masteryId: 'mst-nick',
    mastery: 'Быстрое',
    weight: '1 фнт.',
    price: '2 зм',
  },
  {
    id: 'wpn-club',
    category: 'simple',
    rangeType: 'melee',
    name: 'Дубина',
    damage: '1к4 дробящий',
    reachFt: 5,
    propertyIds: ['prop-light'],
    properties: 'Лёгкое',
    masteryId: 'mst-slow',
    mastery: 'Замедление',
    weight: '2 фнт.',
    price: '1 см',
  },
  {
    id: 'wpn-quarterstaff',
    category: 'simple',
    rangeType: 'melee',
    name: 'Боевой посох',
    damage: '1к6 дробящий',
    versatileDamage: '1к8',
    reachFt: 5,
    propertyIds: ['prop-versatile'],
    properties: 'Универсальное (1к8)',
    masteryId: 'mst-topple',
    mastery: 'Опрокидывание',
    weight: '4 фнт.',
    price: '2 см',
  },
  {
    id: 'wpn-spear',
    category: 'simple',
    rangeType: 'melee',
    name: 'Копьё',
    damage: '1к6 колющий',
    versatileDamage: '1к8',
    reachFt: 5,
    thrownNormalFt: 20,
    thrownMaxFt: 60,
    propertyIds: ['prop-thrown', 'prop-versatile'],
    properties: 'Метательное (20/60), Универсальное (1к8)',
    masteryId: 'mst-sap',
    mastery: 'Ослабление',
    weight: '3 фнт.',
    price: '1 зм',
  },
  {
    id: 'wpn-shortbow',
    category: 'simple',
    rangeType: 'ranged',
    name: 'Короткий лук',
    damage: '1к6 колющий',
    rangeNormalFt: 80,
    rangeMaxFt: 320,
    propertyIds: ['prop-ammunition', 'prop-two-handed'],
    properties: 'Боеприпас (80/320), Двуручное',
    masteryId: 'mst-vex',
    mastery: 'Досаждение',
    ammoItemId: 'gear-arrows',
    weight: '2 фнт.',
    price: '25 зм',
  },
  {
    id: 'wpn-light-crossbow',
    category: 'simple',
    rangeType: 'ranged',
    name: 'Лёгкий арбалет',
    damage: '1к8 колющий',
    rangeNormalFt: 80,
    rangeMaxFt: 320,
    propertyIds: ['prop-ammunition', 'prop-loading', 'prop-two-handed'],
    properties: 'Боеприпас (80/320), Перезарядка, Двуручное',
    masteryId: 'mst-slow',
    mastery: 'Замедление',
    ammoItemId: 'gear-bolts',
    weight: '5 фнт.',
    price: '25 зм',
  },
  {
    id: 'wpn-hand-crossbow',
    category: 'martial',
    rangeType: 'ranged',
    name: 'Одноручный арбалет',
    damage: '1к6 колющий',
    rangeNormalFt: 30,
    rangeMaxFt: 120,
    propertyIds: ['prop-ammunition', 'prop-light', 'prop-loading'],
    properties: 'Боеприпас (30/120), Лёгкое, Перезарядка',
    masteryId: 'mst-vex',
    mastery: 'Досаждение',
    ammoItemId: 'gear-bolts',
    weight: '3 фнт.',
    price: '75 зм',
  },
  {
    id: 'wpn-heavy-crossbow',
    category: 'martial',
    rangeType: 'ranged',
    name: 'Тяжёлый арбалет',
    damage: '1к10 колющий',
    rangeNormalFt: 100,
    rangeMaxFt: 400,
    propertyIds: ['prop-ammunition', 'prop-heavy', 'prop-loading', 'prop-two-handed'],
    properties: 'Боеприпас (100/400), Тяжёлое, Перезарядка, Двуручное',
    masteryId: 'mst-push',
    mastery: 'Толчок',
    ammoItemId: 'gear-bolts',
    weight: '18 фнт.',
    price: '50 зм',
  },
  {
    id: 'wpn-longsword',
    category: 'martial',
    rangeType: 'melee',
    name: 'Длинный меч',
    damage: '1к8 рубящий',
    versatileDamage: '1к10',
    reachFt: 5,
    propertyIds: ['prop-versatile'],
    properties: 'Универсальное (1к10)',
    masteryId: 'mst-sap',
    mastery: 'Ослабление',
    weight: '3 фнт.',
    price: '15 зм',
  },
  {
    id: 'wpn-shortsword',
    category: 'martial',
    rangeType: 'melee',
    name: 'Короткий меч',
    damage: '1к6 колющий',
    reachFt: 5,
    propertyIds: ['prop-finesse', 'prop-light'],
    properties: 'Фехтовальное, Лёгкое',
    masteryId: 'mst-vex',
    mastery: 'Досаждение',
    weight: '2 фнт.',
    price: '10 зм',
  },
  {
    id: 'wpn-rapier',
    category: 'martial',
    rangeType: 'melee',
    name: 'Рапира',
    damage: '1к8 колющий',
    reachFt: 5,
    propertyIds: ['prop-finesse'],
    properties: 'Фехтовальное',
    masteryId: 'mst-vex',
    mastery: 'Досаждение',
    weight: '2 фнт.',
    price: '25 зм',
  },
  {
    id: 'wpn-battleaxe',
    category: 'martial',
    rangeType: 'melee',
    name: 'Боевой топор',
    damage: '1к8 рубящий',
    versatileDamage: '1к10',
    reachFt: 5,
    propertyIds: ['prop-versatile'],
    properties: 'Универсальное (1к10)',
    masteryId: 'mst-topple',
    mastery: 'Опрокидывание',
    weight: '4 фнт.',
    price: '10 зм',
  },
  {
    id: 'wpn-greatsword',
    category: 'martial',
    rangeType: 'melee',
    name: 'Двуручный меч',
    damage: '2к6 рубящий',
    reachFt: 5,
    propertyIds: ['prop-heavy', 'prop-two-handed'],
    properties: 'Тяжёлое, Двуручное',
    masteryId: 'mst-graze',
    mastery: 'Царапание',
    weight: '6 фнт.',
    price: '50 зм',
  },
  {
    id: 'wpn-halberd',
    category: 'martial',
    rangeType: 'melee',
    name: 'Алебарда',
    damage: '1к10 рубящий',
    reachFt: 10,
    propertyIds: ['prop-heavy', 'prop-reach', 'prop-two-handed'],
    properties: 'Тяжёлое, Досягаемость, Двуручное',
    masteryId: 'mst-cleave',
    mastery: 'Прорубание',
    weight: '6 фнт.',
    price: '20 зм',
  },
  {
    id: 'wpn-longbow',
    category: 'martial',
    rangeType: 'ranged',
    name: 'Длинный лук',
    damage: '1к8 колющий',
    rangeNormalFt: 150,
    rangeMaxFt: 600,
    propertyIds: ['prop-ammunition', 'prop-heavy', 'prop-two-handed'],
    properties: 'Боеприпас (150/600), Тяжёлое, Двуручное',
    masteryId: 'mst-slow',
    mastery: 'Замедление',
    ammoItemId: 'gear-arrows',
    weight: '2 фнт.',
    price: '50 зм',
  },
];

export function getGearKindLabel(kind: GearItemKind): string {
  switch (kind) {
    case 'ammunition':
      return 'Боеприпас';
    case 'container':
      return 'Контейнер';
    default:
      return 'Предмет снаряжения';
  }
}

export function resolveWeaponCatalogItem(
  item: Pick<InventoryItem, 'catalogItemId' | 'name'>,
  catalogs: Pick<GameCatalogs, 'weapons'>
): WeaponRef | undefined {
  return (
    (item.catalogItemId
      ? catalogs.weapons.find((w) => w.id === item.catalogItemId)
      : undefined) ??
    catalogs.weapons.find((w) => w.name.trim().toLowerCase() === item.name.trim().toLowerCase())
  );
}

export function resolveGearCatalogItem(
  item: Pick<InventoryItem, 'catalogItemId' | 'name'>,
  catalogs?: { gearItems?: GearItemRef[] } | null
): GearItemRef | undefined {
  const list = catalogs?.gearItems ?? DEFAULT_GEAR_ITEMS;
  return (
    (item.catalogItemId ? list.find((g) => g.id === item.catalogItemId) : undefined) ??
    list.find((g) => g.name.trim().toLowerCase() === item.name.trim().toLowerCase())
  );
}

export function inferWeaponPropertyIdsFromText(propertiesText?: string): string[] {
  const lower = (propertiesText || '').toLowerCase();
  if (!lower) return [];
  const ids: string[] = [];
  if (lower.includes('универсал')) ids.push('prop-versatile');
  if (lower.includes('лёгк') || lower.includes('легк')) ids.push('prop-light');
  if (lower.includes('метател')) ids.push('prop-thrown');
  if (lower.includes('фехтовал')) ids.push('prop-finesse');
  if (lower.includes('двуруч')) ids.push('prop-two-handed');
  if (lower.includes('тяжёл') || lower.includes('тяжел')) ids.push('prop-heavy');
  if (lower.includes('досягаем')) ids.push('prop-reach');
  if (lower.includes('боеприпас')) ids.push('prop-ammunition');
  if (lower.includes('перезаряд')) ids.push('prop-loading');
  return ids;
}

export function inferVersatileDamageFromText(propertiesText?: string): string | undefined {
  if (!propertiesText) return undefined;
  const match = /универсал[а-я]*\s*\(\s*([0-9]+[ккd][0-9]+)\s*\)/i.exec(propertiesText);
  return match ? match[1].toLowerCase().replace('d', 'к') : undefined;
}

export function resolveWeaponPropertyRefs(
  source: Pick<InventoryItem, 'catalogItemId' | 'name' | 'propertyIds' | 'properties'> | WeaponRef,
  catalogs?: Partial<Pick<GameCatalogs, 'weapons' | 'weaponProperties'>> | null
): WeaponPropertyRef[] {
  const propCatalog =
    catalogs?.weaponProperties && catalogs.weaponProperties.length > 0
      ? catalogs.weaponProperties
      : DEFAULT_WEAPON_PROPERTIES;
  const catalogWeapon =
    'category' in source && 'damage' in source && !('quantity' in source)
      ? (source as WeaponRef)
      : catalogs?.weapons
        ? resolveWeaponCatalogItem(source, { weapons: catalogs.weapons })
        : undefined;

  const rawIds =
    Array.isArray(source.propertyIds) && source.propertyIds.length > 0
      ? source.propertyIds
      : Array.isArray(catalogWeapon?.propertyIds) && catalogWeapon.propertyIds.length > 0
        ? catalogWeapon.propertyIds
        : inferWeaponPropertyIdsFromText(source.properties ?? catalogWeapon?.properties);

  const uniqueIds = Array.from(new Set(rawIds));
  const resolved: WeaponPropertyRef[] = [];
  for (const id of uniqueIds) {
    const found = propCatalog.find((p) => p.id === id);
    if (found) resolved.push(found);
  }
  return resolved;
}

export function hasWeaponProperty(
  source: Pick<InventoryItem, 'catalogItemId' | 'name' | 'propertyIds' | 'properties'> | WeaponRef,
  catalogs: Partial<Pick<GameCatalogs, 'weapons' | 'weaponProperties'>> | null | undefined,
  propId: string,
  nameNeedle?: string
): boolean {
  const refs = resolveWeaponPropertyRefs(source, catalogs);
  return refs.some(
    (p) =>
      p.id === propId ||
      (nameNeedle ? p.name.toLowerCase().includes(nameNeedle.toLowerCase()) : false)
  );
}

export function formatWeaponPropertiesSummary(
  weapon: Pick<
    WeaponRef,
    | 'propertyIds'
    | 'properties'
    | 'versatileDamage'
    | 'rangeType'
    | 'rangeNormalFt'
    | 'rangeMaxFt'
    | 'thrownNormalFt'
    | 'thrownMaxFt'
  >,
  catalogs?: Partial<Pick<GameCatalogs, 'weaponProperties'>> | null
): string {
  const propCatalog =
    catalogs?.weaponProperties && catalogs.weaponProperties.length > 0
      ? catalogs.weaponProperties
      : DEFAULT_WEAPON_PROPERTIES;
  const ids = Array.isArray(weapon.propertyIds) ? weapon.propertyIds : [];
  if (ids.length === 0) return weapon.properties || '—';

  const labels: string[] = [];
  for (const id of ids) {
    const ref = propCatalog.find((p) => p.id === id);
    if (!ref) continue;
    if (ref.id === 'prop-versatile' && weapon.versatileDamage) {
      labels.push(`${ref.name} (${weapon.versatileDamage})`);
    } else if (ref.id === 'prop-thrown') {
      const n = weapon.thrownNormalFt ?? 20;
      const m = weapon.thrownMaxFt ?? 60;
      labels.push(`${ref.name} (${n}/${m})`);
    } else if (ref.id === 'prop-ammunition' && weapon.rangeNormalFt && weapon.rangeMaxFt) {
      labels.push(`${ref.name} (${weapon.rangeNormalFt}/${weapon.rangeMaxFt})`);
    } else {
      labels.push(ref.name);
    }
  }
  return labels.length > 0 ? labels.join(', ') : weapon.properties || '—';
}

const LEGACY_MASTERY_ALIASES: Record<string, string> = {
  зазубрина: 'mst-nick',
  быстрое: 'mst-nick',
  опрокидывание: 'mst-topple',
  ослабление: 'mst-sap',
  замедление: 'mst-slow',
  досаждение: 'mst-vex',
  царапание: 'mst-graze',
  'скользящий удар': 'mst-graze',
  прорубание: 'mst-cleave',
  рассечение: 'mst-cleave',
  толчок: 'mst-push',
};

export function resolveWeaponMasteryRef(
  source: Pick<InventoryItem, 'catalogItemId' | 'name' | 'masteryId' | 'mastery'> | WeaponRef,
  catalogs?: Partial<Pick<GameCatalogs, 'weapons' | 'weaponMasteries'>> | null
): WeaponMasteryRef | null {
  const masteries =
    catalogs?.weaponMasteries && catalogs.weaponMasteries.length > 0
      ? catalogs.weaponMasteries
      : DEFAULT_WEAPON_MASTERIES;
  const catalogWeapon =
    'category' in source && 'damage' in source && !('quantity' in source)
      ? (source as WeaponRef)
      : catalogs?.weapons
        ? resolveWeaponCatalogItem(source, { weapons: catalogs.weapons })
        : undefined;

  const targetId = source.masteryId ?? catalogWeapon?.masteryId ?? null;
  if (targetId) {
    const byId = masteries.find((m) => m.id === targetId);
    if (byId) return byId;
  }

  const rawName = (source.mastery ?? catalogWeapon?.mastery ?? '').trim().toLowerCase();
  if (!rawName || rawName === '—' || rawName === '-') return null;

  const exact = masteries.find((m) => m.name.trim().toLowerCase() === rawName);
  if (exact) return exact;

  const aliasId = LEGACY_MASTERY_ALIASES[rawName];
  if (aliasId) {
    return masteries.find((m) => m.id === aliasId) ?? null;
  }
  return null;
}

export function resolveWeaponAmmoRequirement(
  source: Pick<
    InventoryItem,
    'catalogItemId' | 'name' | 'propertyIds' | 'properties' | 'ammoItemId'
  > | WeaponRef,
  catalogs?: Partial<Pick<GameCatalogs, 'weapons' | 'weaponProperties' | 'gearItems'>> | null
): {
  required: boolean;
  ammoRef: GearItemRef | null;
  containerRef: GearItemRef | null;
} {
  const needsAmmo = hasWeaponProperty(source, catalogs, 'prop-ammunition', 'боеприпас');
  if (!needsAmmo) {
    return { required: false, ammoRef: null, containerRef: null };
  }
  const gearItems =
    catalogs?.gearItems && catalogs.gearItems.length > 0 ? catalogs.gearItems : DEFAULT_GEAR_ITEMS;
  const catalogWeapon =
    'category' in source && 'damage' in source && !('quantity' in source)
      ? (source as WeaponRef)
      : catalogs?.weapons
        ? resolveWeaponCatalogItem(source, { weapons: catalogs.weapons })
        : undefined;

  const weaponId = catalogWeapon?.id ?? ('id' in source ? (source as WeaponRef).id : undefined);
  const directAmmoId = source.ammoItemId ?? catalogWeapon?.ammoItemId ?? null;
  let ammoRef: GearItemRef | null = directAmmoId
    ? gearItems.find((g) => g.id === directAmmoId) ?? null
    : null;

  if (!ammoRef && weaponId) {
    ammoRef =
      gearItems.find(
        (g) => g.kind === 'ammunition' && g.compatibleWeaponIds?.includes(weaponId)
      ) ?? null;
  }
  if (!ammoRef) {
    const lowerName = source.name.toLowerCase();
    if (lowerName.includes('арбалет')) {
      ammoRef = gearItems.find((g) => g.id === 'gear-bolts') ?? null;
    } else if (lowerName.includes('лук')) {
      ammoRef = gearItems.find((g) => g.id === 'gear-arrows') ?? null;
    }
  }

  const containerRef = ammoRef?.containerId
    ? gearItems.find((g) => g.id === ammoRef!.containerId) ?? null
    : ammoRef
      ? gearItems.find((g) => g.kind === 'container' && g.storedAmmoId === ammoRef!.id) ?? null
      : null;

  return { required: true, ammoRef, containerRef };
}

export function getAmmoCapacityForPlayer(
  inventory: InventoryItem[] | undefined,
  ammoRef: GearItemRef,
  catalogs?: Partial<Pick<GameCatalogs, 'gearItems'>> | null
): {
  currentQty: number;
  maxCapacity: number;
  containerCount: number;
  containerRef: GearItemRef | null;
  ammoInvItem: InventoryItem | null;
} {
  const list = inventory ?? [];
  const gearItems =
    catalogs?.gearItems && catalogs.gearItems.length > 0 ? catalogs.gearItems : DEFAULT_GEAR_ITEMS;
  const containerRef = ammoRef.containerId
    ? gearItems.find((g) => g.id === ammoRef.containerId) ?? null
    : gearItems.find((g) => g.kind === 'container' && g.storedAmmoId === ammoRef.id) ?? null;

  let currentQty = 0;
  let ammoInvItem: InventoryItem | null = null;
  for (const inv of list) {
    const isAmmo =
      inv.catalogItemId === ammoRef.id ||
      inv.name.trim().toLowerCase() === ammoRef.name.trim().toLowerCase();
    if (isAmmo) {
      currentQty += Math.max(0, Number(inv.quantity) || 0);
      if (!ammoInvItem) ammoInvItem = inv;
    }
  }

  let containerCount = 0;
  if (containerRef) {
    for (const inv of list) {
      const isContainer =
        inv.catalogItemId === containerRef.id ||
        inv.name.trim().toLowerCase() === containerRef.name.trim().toLowerCase();
      if (isContainer) {
        containerCount += Math.max(0, Number(inv.quantity) || 0);
      }
    }
  }

  const perContainerCap = Math.max(1, containerRef?.capacity ?? ammoRef.packQuantity ?? 20);
  const maxCapacity = containerRef ? containerCount * perContainerCap : Infinity;

  return {
    currentQty,
    maxCapacity,
    containerCount,
    containerRef,
    ammoInvItem,
  };
}

export interface EquippedHandSlot {
  itemId: string;
  name: string;
  hands: 1 | 2;
  kind: 'weapon' | 'shield';
}

export interface EquippedHandsUsage {
  usedHands: number;
  maxHands: 2;
  freeHands: number;
  slots: EquippedHandSlot[];
}

export function getWeaponRequiredHands(
  item: Pick<InventoryItem, 'catalogItemId' | 'name' | 'propertyIds' | 'properties'> | WeaponRef,
  catalogs?: Partial<Pick<GameCatalogs, 'weapons' | 'weaponProperties'>> | null
): 1 | 2 {
  return hasWeaponProperty(item, catalogs, 'prop-two-handed', 'двуруч') ? 2 : 1;
}

export function computeEquippedHandsUsage(
  inventory: InventoryItem[] | undefined,
  catalogs: Pick<GameCatalogs, 'weapons' | 'armors'> &
    Partial<Pick<GameCatalogs, 'weaponProperties'>>,
  options?: { excludeItemId?: string; excludeShields?: boolean }
): EquippedHandsUsage {
  const slots: EquippedHandSlot[] = [];
  for (const item of inventory ?? []) {
    if (!item.equipped) continue;
    if (options?.excludeItemId && item.id === options.excludeItemId) continue;

    if (item.category === 'weapon') {
      const hands = getWeaponRequiredHands(item, catalogs);
      slots.push({
        itemId: item.id,
        name: item.name,
        hands,
        kind: 'weapon',
      });
    } else if (item.category === 'armor') {
      const armorCat = resolveInventoryArmorCategory(item, catalogs as GameCatalogs);
      if (armorCat === 'shield' && !options?.excludeShields) {
        slots.push({
          itemId: item.id,
          name: item.name,
          hands: 1,
          kind: 'shield',
        });
      }
    }
  }
  const usedHands = slots.reduce((sum, s) => sum + s.hands, 0);
  return {
    usedHands,
    maxHands: 2,
    freeHands: Math.max(0, 2 - usedHands),
    slots,
  };
}

export function hasHeroWeaponMasteryFeature(
  player: Pick<PlayerCharacter, 'classId' | 'level'> & { subclassId?: string },
  catalogs?: Partial<
    Pick<GameCatalogs, 'classes' | 'classFeatures' | 'subclassFeatures'>
  > | null
): boolean {
  const safeLevel = Math.max(1, Math.floor(Number(player.level) || 1));
  const classFeatures = catalogs?.classFeatures ?? [];
  if (
    classFeatures.some(
      (f) =>
        f.classId === player.classId &&
        f.level <= safeLevel &&
        f.name.toLowerCase().includes('оружейное мастерство')
    )
  ) {
    return true;
  }
  const subclassFeatures = catalogs?.subclassFeatures ?? [];
  if (
    player.subclassId &&
    subclassFeatures.some(
      (f) =>
        f.subclassId === player.subclassId &&
        f.level <= safeLevel &&
        f.name.toLowerCase().includes('оружейное мастерство')
    )
  ) {
    return true;
  }
  const classRef = catalogs?.classes?.find((c) => c.id === player.classId);
  if (classRef?.classResources) {
    const masteryRes = classRef.classResources.find((r) =>
      r.name.toLowerCase().includes('оружейное мастерство')
    );
    if (masteryRes) {
      const val = String(masteryRes.values[Math.min(safeLevel - 1, masteryRes.values.length - 1)] ?? '').trim();
      if (val && val !== '—' && val !== '-' && val !== '0') {
        return true;
      }
    }
  }
  return false;
}

export function canPlayerEquipItem(
  player: Pick<PlayerCharacter, 'proficiencyIds' | 'abilities'> & {
    classId?: string;
    inventory?: InventoryItem[];
  },
  item: InventoryItem,
  catalogs: GameCatalogs
): { allowed: true } | { allowed: false; reason: string } {
  if (item.category === 'weapon') {
    const catalogWeapon = resolveWeaponCatalogItem(item, catalogs);
    const weaponCat: WeaponCategory | undefined = item.weaponCategory ?? catalogWeapon?.category;
    const weaponRange: WeaponRangeType | undefined =
      item.weaponRangeType ?? catalogWeapon?.rangeType;
    const isLight = hasWeaponProperty(item, catalogs, 'prop-light', 'лёгк');
    const isFinesse = hasWeaponProperty(item, catalogs, 'prop-finesse', 'фехтовал');
    const classRef = player.classId
      ? catalogs.classes.find((c) => c.id === player.classId)
      : undefined;
    const classNote = (classRef?.weaponProficiencyNote ?? '').toLowerCase();

    const missingParts: string[] = [];

    if (weaponCat === 'simple') {
      const ok = hasProficiencyFor(player, catalogs, 'weapon_simple', [['прост', 'оруж']]);
      if (!ok) missingParts.push('простым оружием');
    } else if (weaponCat === 'martial') {
      const hasMartial = hasProficiencyFor(player, catalogs, 'weapon_martial', [
        ['воинск', 'оруж'],
        ['военн', 'оруж'],
      ]);
      const allowedByLightProp =
        (player.classId === 'monk' ||
          player.classId === 'rogue' ||
          classNote.includes('лёгк') ||
          classNote.includes('легк')) &&
        isLight;
      const allowedByFinesseProp =
        (player.classId === 'rogue' || classNote.includes('фехтовал')) && isFinesse;
      if (!hasMartial && !allowedByLightProp && !allowedByFinesseProp) {
        missingParts.push('воинским оружием');
      }
    }

    if (weaponRange === 'melee') {
      const ok = hasProficiencyFor(player, catalogs, 'weapon_melee', [
        ['рукопаш', 'оруж'],
        ['ближн', 'оруж'],
      ]);
      if (!ok) missingParts.push('рукопашным оружием');
    } else if (weaponRange === 'ranged') {
      const ok = hasProficiencyFor(player, catalogs, 'weapon_ranged', [
        ['дальнобой', 'оруж'],
        ['дальн', 'оруж'],
      ]);
      if (!ok) missingParts.push('дальнобойным оружием');
    }

    if (missingParts.length > 0) {
      return {
        allowed: false,
        reason: `Нельзя экипировать «${item.name}»: у персонажа нет владения ${missingParts.join(' и ')}.`,
      };
    }

    if (!weaponCat && !weaponRange) {
      const hasAnyWeaponProf =
        hasProficiencyFor(player, catalogs, 'weapon_simple', [['прост', 'оруж']]) ||
        hasProficiencyFor(player, catalogs, 'weapon_martial', [
          ['воинск', 'оруж'],
          ['военн', 'оруж'],
        ]) ||
        catalogs.proficiencies.some(
          (pr) => pr.category === 'weapon' && player.proficiencyIds.includes(pr.id)
        );
      if (!hasAnyWeaponProf) {
        return {
          allowed: false,
          reason: `Нельзя экипировать «${item.name}»: у персонажа нет владения оружием.`,
        };
      }
    }

    // Check Two-Hand slot limit (max 2 hands occupied)
    if (Array.isArray(player.inventory)) {
      const neededHands = getWeaponRequiredHands(item, catalogs);
      const handsUsage = computeEquippedHandsUsage(player.inventory, catalogs, {
        excludeItemId: item.id,
      });
      if (handsUsage.usedHands + neededHands > 2) {
        const twoHandedEquipped = handsUsage.slots.find((s) => s.hands === 2);
        if (twoHandedEquipped) {
          return {
            allowed: false,
            reason: `Руки заняты: сейчас надето двуручное оружие «${twoHandedEquipped.name}». Сначала снимите его, чтобы взять «${item.name}».`,
          };
        }
        if (neededHands === 2) {
          const occupiedNames = handsUsage.slots.map((s) => `«${s.name}»`).join(', ');
          return {
            allowed: false,
            reason: `Руки заняты (${handsUsage.usedHands}/2): для двуручного оружия «${item.name}» нужны обе свободные руки. Сначала снимите ${occupiedNames}.`,
          };
        }
        const occupiedNames = handsUsage.slots.map((s) => `«${s.name}»`).join(' и ');
        return {
          allowed: false,
          reason: `Обе руки заняты (${occupiedNames}): нельзя взять «${item.name}» в третью руку. Сначала снимите один предмет.`,
        };
      }

      // Check Ammunition + Container requirement for ranged weapons with "Боеприпас"
      const ammoReq = resolveWeaponAmmoRequirement(item, catalogs);
      if (ammoReq.required && ammoReq.ammoRef) {
        const cap = getAmmoCapacityForPlayer(player.inventory, ammoReq.ammoRef, catalogs);
        const missingContainer = Boolean(ammoReq.containerRef && cap.containerCount <= 0);
        const missingAmmo = cap.currentQty <= 0;
        if (missingContainer && missingAmmo) {
          return {
            allowed: false,
            reason: `Нельзя надеть «${item.name}»: в инвентаре отсутствуют «${ammoReq.containerRef!.name}» и боеприпасы «${ammoReq.ammoRef.name}».`,
          };
        }
        if (missingContainer) {
          return {
            allowed: false,
            reason: `Нельзя надеть «${item.name}»: в инвентаре нет контейнера «${ammoReq.containerRef!.name}».`,
          };
        }
        if (missingAmmo) {
          return {
            allowed: false,
            reason: `Нельзя надеть «${item.name}»: в инвентаре нет боеприпасов «${ammoReq.ammoRef.name}».`,
          };
        }
      }
    }
  }

  if (item.category === 'armor') {
    const catalogArmor =
      (item.catalogItemId
        ? catalogs.armors.find((a) => a.id === item.catalogItemId)
        : undefined) ??
      catalogs.armors.find((a) => a.name.trim().toLowerCase() === item.name.trim().toLowerCase());
    const armorCat: ArmorCategory | undefined = item.armorCategory ?? catalogArmor?.category;

    if (armorCat === 'light') {
      const ok = hasProficiencyFor(player, catalogs, 'armor_light', [
        ['лёгк', 'доспех'],
        ['легк', 'доспех'],
      ]);
      if (!ok) {
        return {
          allowed: false,
          reason: `Нельзя надеть «${item.name}»: у персонажа нет владения лёгкими доспехами.`,
        };
      }
    } else if (armorCat === 'medium') {
      const ok = hasProficiencyFor(player, catalogs, 'armor_medium', [['средн', 'доспех']]);
      if (!ok) {
        return {
          allowed: false,
          reason: `Нельзя надеть «${item.name}»: у персонажа нет владения средними доспехами.`,
        };
      }
    } else if (armorCat === 'heavy') {
      const ok = hasProficiencyFor(player, catalogs, 'armor_heavy', [
        ['тяжёл', 'доспех'],
        ['тяжел', 'доспех'],
      ]);
      if (!ok) {
        return {
          allowed: false,
          reason: `Нельзя надеть «${item.name}»: у персонажа нет владения тяжёлыми доспехами.`,
        };
      }
    } else if (armorCat === 'shield') {
      const ok = hasProficiencyFor(player, catalogs, 'armor_shield', [['щит']]);
      if (!ok) {
        return {
          allowed: false,
          reason: `Нельзя использовать «${item.name}»: у персонажа нет владения щитом.`,
        };
      }
      if (Array.isArray(player.inventory)) {
        const handsUsage = computeEquippedHandsUsage(player.inventory, catalogs, {
          excludeItemId: item.id,
          excludeShields: true,
        });
        if (handsUsage.usedHands + 1 > 2) {
          const occupiedNames = handsUsage.slots.map((s) => `«${s.name}»`).join(' и ');
          return {
            allowed: false,
            reason: `Обе руки заняты (${occupiedNames}): нельзя взять щит «${item.name}». Сначала освободите одну руку.`,
          };
        }
      }
    } else {
      const hasAnyArmorProf = catalogs.proficiencies.some(
        (pr) => pr.category === 'armor' && player.proficiencyIds.includes(pr.id)
      );
      if (!hasAnyArmorProf) {
        return {
          allowed: false,
          reason: `Нельзя надеть «${item.name}»: у персонажа нет владения доспехами.`,
        };
      }
    }

    const reqStr = parseStrengthRequirement(item.strengthReq ?? catalogArmor?.strengthReq);
    if (reqStr !== null) {
      const currentStr = Number(player.abilities?.str ?? 10);
      if (currentStr < reqStr) {
        return {
          allowed: false,
          reason: `Нельзя надеть «${item.name}»: требуется Сила ${reqStr} (у персонажа ${currentStr}).`,
        };
      }
    }
  }

  return { allowed: true };
}

export const FEET_PER_CELL = 5;

export function getMapLightingLabel(lighting?: MapLighting): string {
  if (lighting === 'dim') return 'Полумрак';
  if (lighting === 'darkness') return 'Темнота';
  return 'Яркий свет';
}

export function getMapLightingFullLabel(lighting?: MapLighting): string {
  if (lighting === 'dim') return 'Тусклый свет / Полумрак (Dim Light)';
  if (lighting === 'darkness') return 'Полная темнота (Darkness)';
  return 'Яркий свет (Bright Light)';
}

export function getMapLightingDescription(lighting?: MapLighting): string {
  if (lighting === 'dim') {
    return 'Зона теней, лунный свет, свет свечи или сумерки. Обычное зрение видит в полумраке (помеха на Восприятие по зрению); Тёмное зрение видит как при ярком свете.';
  }
  if (lighting === 'darkness') {
    return 'Глухая пещера, комната без окон или заклинание Тьма. Обычное зрение ослеплено; Тёмное зрение видит в оттенках серого в пределах своей дальности.';
  }
  return 'Обычный дневной свет или прямой свет от факела/костра. В ярком свете существа с обычным зрением видят нормально и без штрафов.';
}

export function getVisionBehaviorLabel(behavior: VisionBehavior): string {
  switch (behavior) {
    case 'truesight':
      return 'Истинное зрение';
    case 'blindsight':
      return 'Слепое зрение';
    case 'darkvision':
      return 'Тёмное зрение';
    case 'tremorsense':
      return 'Чувство вибрации';
    default:
      return 'Обычное зрение';
  }
}

export function inferWeaponReachRange(
  rangeType: WeaponRangeType,
  properties?: string
): { reachFt?: number; rangeNormalFt?: number; rangeMaxFt?: number } {
  const prop = (properties || '').toLowerCase();
  if (rangeType === 'ranged') {
    const match = /\(\s*(\d+)\s*\/\s*(\d+)\s*\)/.exec(prop);
    if (match) {
      const normal = Math.max(5, Number(match[1]) || 80);
      const max = Math.max(normal, Number(match[2]) || normal * 4);
      return { rangeNormalFt: normal, rangeMaxFt: max };
    }
    return { rangeNormalFt: 80, rangeMaxFt: 320 };
  }
  if (prop.includes('досягаем')) {
    return { reachFt: 10 };
  }
  return { reachFt: 5 };
}

export function formatWeaponReachRange(
  rangeType: WeaponRangeType | null | undefined,
  opts: {
    reachFt?: number | null;
    rangeNormalFt?: number | null;
    rangeMaxFt?: number | null;
  }
): string {
  if (rangeType === 'ranged') {
    const normal =
      typeof opts.rangeNormalFt === 'number' && Number.isFinite(opts.rangeNormalFt) && opts.rangeNormalFt >= 0
        ? opts.rangeNormalFt
        : null;
    const max =
      typeof opts.rangeMaxFt === 'number' && Number.isFinite(opts.rangeMaxFt) && opts.rangeMaxFt >= 0
        ? opts.rangeMaxFt
        : null;
    if (normal !== null && max !== null) {
      return max > normal ? `${normal}/${max} фт.` : `${normal} фт.`;
    }
    if (normal !== null) return `${normal} фт.`;
    if (max !== null) return `до ${max} фт.`;
    return '';
  }
  if (rangeType === 'melee') {
    const reach =
      typeof opts.reachFt === 'number' && Number.isFinite(opts.reachFt) && opts.reachFt >= 0
        ? opts.reachFt
        : null;
    return reach !== null ? `${reach} фт.` : '';
  }
  return '';
}

export function resolveWeaponReachRange(
  item: InventoryItem,
  catalogs: Pick<GameCatalogs, 'weapons'>
): {
  rangeType: WeaponRangeType;
  normalFt: number;
  maxFt: number;
} {
  const catalogWeapon: WeaponRef | undefined =
    (item.catalogItemId
      ? catalogs.weapons.find((w) => w.id === item.catalogItemId)
      : undefined) ??
    catalogs.weapons.find(
      (w) => w.name.trim().toLowerCase() === item.name.trim().toLowerCase()
    );
  const rangeType: WeaponRangeType =
    item.weaponRangeType ??
    catalogWeapon?.rangeType ??
    inferWeaponRangeType(item.name, item.properties ?? catalogWeapon?.properties);

  const inferred = inferWeaponReachRange(rangeType, item.properties ?? catalogWeapon?.properties);

  if (rangeType === 'ranged') {
    const normalFt =
      typeof item.rangeNormalFt === 'number' && Number.isFinite(item.rangeNormalFt) && item.rangeNormalFt >= 0
        ? item.rangeNormalFt
        : typeof catalogWeapon?.rangeNormalFt === 'number' &&
            Number.isFinite(catalogWeapon.rangeNormalFt) &&
            catalogWeapon.rangeNormalFt >= 0
          ? catalogWeapon.rangeNormalFt
          : inferred.rangeNormalFt ?? 80;
    const maxFt =
      typeof item.rangeMaxFt === 'number' && Number.isFinite(item.rangeMaxFt) && item.rangeMaxFt >= 0
        ? Math.max(normalFt, item.rangeMaxFt)
        : typeof catalogWeapon?.rangeMaxFt === 'number' &&
            Number.isFinite(catalogWeapon.rangeMaxFt) &&
            catalogWeapon.rangeMaxFt >= 0
          ? Math.max(normalFt, catalogWeapon.rangeMaxFt)
          : Math.max(normalFt, inferred.rangeMaxFt ?? normalFt * 4);
    return { rangeType, normalFt, maxFt };
  }

  const baseReachFt =
    typeof item.reachFt === 'number' && Number.isFinite(item.reachFt) && item.reachFt >= 0
      ? item.reachFt
      : typeof catalogWeapon?.reachFt === 'number' &&
          Number.isFinite(catalogWeapon.reachFt) &&
          catalogWeapon.reachFt >= 0
        ? catalogWeapon.reachFt
        : inferred.reachFt ?? 5;
  const hasReachProp = hasWeaponProperty(item, catalogs, 'prop-reach', 'досягаем');
  const reachFt = hasReachProp && baseReachFt < 10 ? baseReachFt + 5 : baseReachFt;
  return { rangeType: 'melee', normalFt: reachFt, maxFt: reachFt };
}

export function resolveMonsterActionRange(action: MonsterActionRef): {
  rangeType: WeaponRangeType;
  normalFt: number;
  maxFt: number;
} | null {
  if (action.attackType === 'melee') {
    const reach =
      typeof action.reachFt === 'number' && Number.isFinite(action.reachFt) && action.reachFt >= 0
        ? action.reachFt
        : null;
    if (reach === null) return null;
    return { rangeType: 'melee', normalFt: reach, maxFt: reach };
  }
  if (action.attackType === 'ranged') {
    const normal =
      typeof action.rangeNormalFt === 'number' &&
      Number.isFinite(action.rangeNormalFt) &&
      action.rangeNormalFt >= 0
        ? action.rangeNormalFt
        : null;
    const max =
      typeof action.rangeMaxFt === 'number' &&
      Number.isFinite(action.rangeMaxFt) &&
      action.rangeMaxFt >= 0
        ? action.rangeMaxFt
        : normal;
    if (normal === null && max === null) return null;
    const safeNormal = normal ?? max!;
    const safeMax = Math.max(safeNormal, max ?? safeNormal);
    return { rangeType: 'ranged', normalFt: safeNormal, maxFt: safeMax };
  }
  return null;
}

export function formatEntityVisions(
  entries: EntityVisionEntry[] | undefined,
  catalogVisions: VisionRef[]
): string[] {
  if (!Array.isArray(entries) || entries.length === 0) return [];
  return entries
    .map((entry) => {
      const ref = catalogVisions.find((v) => v.id === entry.visionId);
      if (!ref) return null;
      if (typeof entry.rangeFt === 'number' && entry.rangeFt > 0) {
        return `${ref.name} ${entry.rangeFt} фт.`;
      }
      return ref.name;
    })
    .filter((s): s is string => Boolean(s));
}

/**
 * Computes effective tactical sight ranges (in feet) given an entity's vision entries
 * and the current map lighting condition.
 * - clearRangeFt: distance within which cells are seen clearly (no shading)
 * - visibleRangeFt: distance within which cells are at least dimly seen (between clear & visible = twilight dim; beyond visible = dark shroud)
 */
export function computeEffectiveVisionRanges(
  entries: EntityVisionEntry[] | undefined,
  catalogVisions: VisionRef[],
  lighting: MapLighting = 'bright',
  conditions?: string[]
): {
  clearRangeFt: number;
  visibleRangeFt: number;
  summary: string;
} {
  const condEffects = getActiveConditionEffects(conditions);
  if (condEffects.unaware) {
    return {
      clearRangeFt: 0,
      visibleRangeFt: 0,
      summary: 'Не осознаёт окружение — 0 фт. (Бессознательный/Окаменевший)',
    };
  }

  const effectiveEntries: EntityVisionEntry[] =
    Array.isArray(entries) && entries.length > 0
      ? entries
      : [{ visionId: 'normal', rangeFt: null }];

  let normalRange = 0;
  let hasNormal = false;
  let darkvisionRange = 0;
  let blindsightRange = 0;
  let truesightRange = 0;
  let tremorsenseRange = 0;

  for (const entry of effectiveEntries) {
    const ref = catalogVisions.find((v) => v.id === entry.visionId);
    const behavior: VisionBehavior = ref?.behavior ?? (entry.visionId as VisionBehavior) ?? 'normal';
    const r =
      typeof entry.rangeFt === 'number' && Number.isFinite(entry.rangeFt) && entry.rangeFt > 0
        ? entry.rangeFt
        : behavior === 'normal'
          ? Infinity
          : 60;

    if (behavior === 'normal') {
      hasNormal = true;
      normalRange = Math.max(normalRange, r);
    } else if (behavior === 'darkvision') {
      darkvisionRange = Math.max(darkvisionRange, r);
    } else if (behavior === 'blindsight') {
      blindsightRange = Math.max(blindsightRange, r);
    } else if (behavior === 'truesight') {
      truesightRange = Math.max(truesightRange, r);
    } else if (behavior === 'tremorsense') {
      tremorsenseRange = Math.max(tremorsenseRange, r);
    }
  }

  // Condition: Blinded disables normal, darkvision, and truesight (keeps blindsight & tremorsense)
  if (condEffects.blinded) {
    const blindClear = Math.max(blindsightRange, tremorsenseRange);
    return {
      clearRangeFt: blindClear,
      visibleRangeFt: blindClear,
      summary:
        blindClear > 0
          ? `Ослеплён — видит только особыми чувствами (${blindClear} фт.)`
          : 'Ослеплён — не видит (0 фт.)',
    };
  }

  // Creatures with darkvision or truesight also see normally in lit areas unless explicitly blind
  const litSightRange = hasNormal
    ? normalRange
    : darkvisionRange > 0 || truesightRange > 0
      ? Infinity
      : 0;
  const specialClearRange = Math.max(blindsightRange, truesightRange, tremorsenseRange);

  if (lighting === 'bright') {
    const clearRangeFt = Math.max(litSightRange, specialClearRange);
    const summary =
      clearRangeFt === Infinity
        ? 'Яркий свет — видит всю карту'
        : clearRangeFt > 0
          ? `Особые чувства: ${clearRangeFt} фт.`
          : 'Ослеплён (нет зрения)';
    return { clearRangeFt, visibleRangeFt: clearRangeFt, summary };
  }

  if (lighting === 'dim') {
    const clearRangeFt = Math.max(darkvisionRange, specialClearRange);
    const visibleRangeFt = Math.max(clearRangeFt, litSightRange);
    let summary = 'Полумрак';
    if (clearRangeFt === Infinity) {
      summary = 'Полумрак — видит чётко всю карту';
    } else if (clearRangeFt > 0 && visibleRangeFt === Infinity) {
      summary = `Чётко ${clearRangeFt} фт., далее полумрак`;
    } else if (clearRangeFt > 0) {
      summary = `Чётко ${clearRangeFt} фт.${visibleRangeFt > clearRangeFt ? `, полумрак до ${visibleRangeFt} фт.` : ''}`;
    } else if (visibleRangeFt === Infinity) {
      summary = 'Полумрак по всей карте (обычное зрение)';
    } else if (visibleRangeFt > 0) {
      summary = `Полумрак до ${visibleRangeFt} фт.`;
    } else {
      summary = 'Ничего не видит';
    }
    return { clearRangeFt, visibleRangeFt, summary };
  }

  // lighting === 'darkness'
  const clearRangeFt = specialClearRange;
  const visibleRangeFt = Math.max(specialClearRange, darkvisionRange);
  let summary = 'Полная темнота — ослеплён (0 фт.)';
  if (clearRangeFt > 0 && visibleRangeFt > clearRangeFt) {
    summary = `Чётко ${clearRangeFt} фт., тёмное зрение до ${visibleRangeFt} фт.`;
  } else if (clearRangeFt > 0) {
    summary = `Видит в темноте: ${clearRangeFt} фт.`;
  } else if (darkvisionRange > 0) {
    summary = `Тёмное зрение в темноте: ${darkvisionRange} фт. (как полумрак)`;
  }
  return { clearRangeFt, visibleRangeFt, summary };
}

/**
 * Computes D&D 5e grid distance in feet (Chebyshev distance, 5 ft per square)
 * from a token occupying [tokenX..tokenX+tokenSize-1, tokenY..tokenY+tokenSize-1]
 * to target cell (cellX, cellY). Returns 0 for cells occupied by the token.
 */
export function computeGridDistanceFt(
  tokenX: number,
  tokenY: number,
  tokenSize: number,
  cellX: number,
  cellY: number
): number {
  const minX = Math.round(tokenX);
  const minY = Math.round(tokenY);
  const size = Math.max(1, Math.round(tokenSize || 1));
  const maxX = minX + size - 1;
  const maxY = minY + size - 1;

  const dx = cellX < minX ? minX - cellX : cellX > maxX ? cellX - maxX : 0;
  const dy = cellY < minY ? minY - cellY : cellY > maxY ? cellY - maxY : 0;
  return Math.max(dx, dy) * FEET_PER_CELL;
}

// ============================================================================
// PHB 2024 Character Creation Helpers (Backgrounds, Feats & Classes)
// ============================================================================

export function getBackgroundLockedSkillIds(
  backgroundId: string | undefined,
  catalogs: Pick<GameCatalogs, 'backgrounds' | 'skills'>
): string[] {
  if (!backgroundId) return [];
  const bg = catalogs.backgrounds.find((b) => b.id === backgroundId);
  if (!bg || !Array.isArray(bg.skillIds)) return [];
  const validSkills = new Set(catalogs.skills.map((s) => s.id));
  const out: string[] = [];
  for (const id of bg.skillIds) {
    if (validSkills.has(id) && !out.includes(id)) {
      out.push(id);
    }
  }
  return out;
}

export function getClassSelectableSkillIds(
  classId: string | undefined,
  backgroundId: string | undefined,
  catalogs: Pick<GameCatalogs, 'classes' | 'backgrounds' | 'skills'>
): string[] {
  if (!classId) return [];
  const cls = catalogs.classes.find((c) => c.id === classId);
  if (!cls) return [];
  const bgLocked = new Set(getBackgroundLockedSkillIds(backgroundId, catalogs));
  if (cls.anySkillAllowed) {
    return catalogs.skills.map((s) => s.id).filter((id) => !bgLocked.has(id));
  }
  const validSkills = new Set(catalogs.skills.map((s) => s.id));
  const pool = Array.isArray(cls.allowedSkillIds) ? cls.allowedSkillIds : [];
  const out: string[] = [];
  for (const id of pool) {
    if (validSkills.has(id) && !bgLocked.has(id) && !out.includes(id)) {
      out.push(id);
    }
  }
  return out;
}

/**
 * Returns the Set of skill IDs allowed for a hero given their class & background.
 * Returns null if no class is selected (unrestricted fallback).
 */
export function getHeroAllowedSkillIds(
  classId: string | undefined,
  backgroundId: string | undefined,
  catalogs: Pick<GameCatalogs, 'classes' | 'backgrounds' | 'skills'>
): Set<string> | null {
  if (!classId) return null;
  const cls = catalogs.classes.find((c) => c.id === classId);
  if (!cls) return null;
  const bgLocked = getBackgroundLockedSkillIds(backgroundId, catalogs);
  const classPool = getClassSelectableSkillIds(classId, backgroundId, catalogs);
  return new Set([...bgLocked, ...classPool]);
}

export function getClassDefaultProficiencyIds(
  classId: string | undefined,
  catalogs: Pick<GameCatalogs, 'classes' | 'proficiencies'>
): string[] {
  if (!classId) return [];
  const cls = catalogs.classes.find((c) => c.id === classId);
  if (!cls) return [];
  const validIds = new Set(catalogs.proficiencies.map((p) => p.id));
  const combined = [...(cls.weaponProficiencyIds ?? []), ...(cls.armorProficiencyIds ?? [])];
  const out: string[] = [];
  for (const id of combined) {
    if (validIds.has(id) && !out.includes(id)) {
      out.push(id);
    }
  }
  return out;
}

/**
 * Enforces PHB 2024 background ability score bonus rules:
 * - Only abilities listed in background.abilityIds may receive bonuses
 * - Each eligible ability may receive at most +2 (0, 1, or 2)
 * - Total points allocated across eligible abilities may not exceed 3
 */
export function sanitizeBackgroundAbilityBonuses(
  bonuses: Record<string, number> | undefined,
  backgroundId: string | undefined,
  catalogs: Pick<GameCatalogs, 'backgrounds'>
): Record<string, number> {
  if (!backgroundId || !bonuses) return {};
  const bg = catalogs.backgrounds.find((b) => b.id === backgroundId);
  const allowed = Array.isArray(bg?.abilityIds) ? bg.abilityIds : [];
  if (allowed.length === 0) return {};

  const out: Record<string, number> = {};
  let remaining = 3;
  for (const abId of allowed) {
    const raw = bonuses[abId];
    if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) continue;
    const clamped = Math.min(2, Math.min(remaining, Math.floor(raw)));
    if (clamped > 0) {
      out[abId] = clamped;
      remaining -= clamped;
    }
    if (remaining <= 0) break;
  }
  return out;
}

export function getEffectiveDraftAbilities(
  draft: Pick<CharacterDraft, 'abilities' | 'backgroundId' | 'backgroundAbilityBonuses'>,
  catalogs: Pick<GameCatalogs, 'abilities' | 'backgrounds'>
): Record<string, number | null> {
  const cleanBonuses = sanitizeBackgroundAbilityBonuses(
    draft.backgroundAbilityBonuses,
    draft.backgroundId,
    catalogs
  );
  const result: Record<string, number | null> = {};
  for (const ab of catalogs.abilities) {
    const base = draft.abilities[ab.id];
    const bonus = cleanBonuses[ab.id] ?? 0;
    if (typeof base === 'number' && Number.isFinite(base)) {
      result[ab.id] = Math.min(30, base + bonus);
    } else if (bonus > 0) {
      result[ab.id] = Math.min(30, 10 + bonus);
    } else {
      result[ab.id] = null;
    }
  }
  return result;
}

export function getHeroFeats(
  player: Pick<PlayerCharacter, 'backgroundId' | 'featIds'>,
  catalogs: Pick<GameCatalogs, 'backgrounds' | 'feats'>
): FeatRef[] {
  const ids = new Set<string>();
  const bg = catalogs.backgrounds.find((b) => b.id === player.backgroundId);
  if (bg?.featId) ids.add(bg.featId);
  if (Array.isArray(player.featIds)) {
    for (const id of player.featIds) ids.add(id);
  }
  const out: FeatRef[] = [];
  for (const id of ids) {
    const ref = catalogs.feats.find((f) => f.id === id);
    if (ref) out.push(ref);
  }
  return out;
}

// ============================================================================
// Class Progression, Proficiency Bonus by Class, Subclasses & Hero Actions
// ============================================================================

export const DEFAULT_PROFICIENCY_BONUS_BY_LEVEL: number[] = [
  2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6,
];

export function getClassProficiencyBonus(
  level: number,
  classRef?: Pick<ClassRef, 'proficiencyBonusByLevel'> | null
): number {
  const safeLvl = Math.max(1, Math.min(20, Math.floor(Number(level) || 1)));
  if (
    classRef &&
    Array.isArray(classRef.proficiencyBonusByLevel) &&
    classRef.proficiencyBonusByLevel.length > 0
  ) {
    const idx = Math.min(safeLvl - 1, classRef.proficiencyBonusByLevel.length - 1);
    const val = classRef.proficiencyBonusByLevel[idx];
    if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
      return Math.round(val);
    }
  }
  return getProficiencyBonus(safeLvl);
}

export function getClassHitDieInfo(
  classRef?: Pick<ClassRef, 'hitDie' | 'hpPerLevelHint'> | null
): { hitDie: number; average: number; hint: string } {
  const hitDie =
    typeof classRef?.hitDie === 'number' && Number.isFinite(classRef.hitDie) && classRef.hitDie >= 4
      ? Math.round(classRef.hitDie)
      : 8;
  const average = Math.floor(hitDie / 2) + 1;
  const hint =
    classRef?.hpPerLevelHint?.trim() ||
    `1к${hitDie} (или ${average}) + ваш модификатор Телосложения (суммарно минимум 1)`;
  return { hitDie, average, hint };
}

export function getClassResourcesAtLevel(
  classRef: Pick<ClassRef, 'classResources'> | undefined | null,
  level: number
): Array<{ id: string; name: string; value: string }> {
  if (!classRef || !Array.isArray(classRef.classResources)) return [];
  const safeLvl = Math.max(1, Math.min(20, Math.floor(Number(level) || 1)));
  const out: Array<{ id: string; name: string; value: string }> = [];
  for (const res of classRef.classResources) {
    if (!res || !Array.isArray(res.values) || res.values.length === 0) continue;
    const idx = Math.min(safeLvl - 1, res.values.length - 1);
    const val = String(res.values[idx] ?? '—').trim();
    if (!val || val === '—' || val === '-') continue;
    out.push({ id: res.id, name: res.name, value: val });
  }
  return out;
}

export function getHeroClassFeatures(
  classId: string | undefined,
  level: number,
  catalogs: Pick<GameCatalogs, 'classFeatures'>
): ClassFeatureRef[] {
  if (!classId) return [];
  const safeLvl = Math.max(1, Math.floor(Number(level) || 1));
  return (catalogs.classFeatures ?? [])
    .filter((f) => f.classId === classId && f.level <= safeLvl)
    .sort((a, b) => a.level - b.level);
}

export function getHeroSubclassFeatures(
  classId: string | undefined,
  subclassId: string | undefined,
  level: number,
  catalogs: Pick<GameCatalogs, 'subclassFeatures'>
): SubclassFeatureRef[] {
  if (!classId || !subclassId) return [];
  const safeLvl = Math.max(1, Math.floor(Number(level) || 1));
  if (safeLvl < 3) return [];
  return (catalogs.subclassFeatures ?? [])
    .filter((f) => f.classId === classId && f.subclassId === subclassId && f.level <= safeLvl)
    .sort((a, b) => a.level - b.level);
}

export interface HeroLevelUpChecklist {
  hasPendingLevelUp: boolean;
  needsSubclassChoice: boolean;
  fromLevel: number;
  toLevel: number;
  levelsGained: number;
  hitDie: number;
  averageRoll: number;
  conMod: number;
  averageHpPerLevel: number;
  hpHint: string;
  profBonusChange: { from: number; to: number } | null;
  resourceChanges: Array<{ name: string; from: string; to: string }>;
  unlockedClassFeatures: ClassFeatureRef[];
  unlockedSubclassFeatures: SubclassFeatureRef[];
}

export function getHeroLevelUpChecklist(
  player: Pick<PlayerCharacter, 'classId' | 'subclassId' | 'level' | 'acknowledgedLevel' | 'abilities'>,
  catalogs: Pick<
    GameCatalogs,
    'classes' | 'subclasses' | 'classFeatures' | 'subclassFeatures' | 'abilityModifiers'
  >
): HeroLevelUpChecklist {
  const toLevel = Math.max(1, Math.floor(Number(player.level) || 1));
  const fromLevel =
    typeof player.acknowledgedLevel === 'number' && Number.isFinite(player.acknowledgedLevel)
      ? Math.max(1, Math.floor(player.acknowledgedLevel))
      : toLevel;
  const hasPendingLevelUp = toLevel > fromLevel;
  const levelsGained = Math.max(0, toLevel - fromLevel);

  const classRef = catalogs.classes.find((c) => c.id === player.classId) ?? null;
  const classSubclasses = catalogs.subclasses.filter((s) => s.classId === player.classId);
  const hasValidSubclass = Boolean(
    player.subclassId && classSubclasses.some((s) => s.id === player.subclassId)
  );
  const needsSubclassChoice = toLevel >= 3 && classSubclasses.length > 0 && !hasValidSubclass;

  const { hitDie, average: averageRoll, hint: hpHint } = getClassHitDieInfo(classRef);
  const conScore = player.abilities?.con ?? 10;
  const conMod = getAbilityModifier(conScore, catalogs.abilityModifiers);
  const averageHpPerLevel = Math.max(1, averageRoll + conMod);

  const prevPb = getClassProficiencyBonus(fromLevel, classRef);
  const nextPb = getClassProficiencyBonus(toLevel, classRef);
  const profBonusChange = hasPendingLevelUp && nextPb !== prevPb ? { from: prevPb, to: nextPb } : null;

  const resourceChanges: Array<{ name: string; from: string; to: string }> = [];
  if (hasPendingLevelUp && classRef?.classResources) {
    for (const res of classRef.classResources) {
      const fromVal = String(res.values[Math.min(fromLevel - 1, res.values.length - 1)] ?? '—');
      const toVal = String(res.values[Math.min(toLevel - 1, res.values.length - 1)] ?? '—');
      if (fromVal !== toVal && toVal !== '—' && toVal !== '-') {
        resourceChanges.push({ name: res.name, from: fromVal, to: toVal });
      }
    }
  }

  const unlockedClassFeatures = hasPendingLevelUp
    ? (catalogs.classFeatures ?? [])
        .filter((f) => f.classId === player.classId && f.level > fromLevel && f.level <= toLevel)
        .sort((a, b) => a.level - b.level)
    : [];

  const unlockedSubclassFeatures =
    hasPendingLevelUp && hasValidSubclass && player.subclassId
      ? (catalogs.subclassFeatures ?? [])
          .filter(
            (f) =>
              f.subclassId === player.subclassId && f.level > fromLevel && f.level <= toLevel
          )
          .sort((a, b) => a.level - b.level)
      : [];

  return {
    hasPendingLevelUp,
    needsSubclassChoice,
    fromLevel,
    toLevel,
    levelsGained,
    hitDie,
    averageRoll,
    conMod,
    averageHpPerLevel,
    hpHint,
    profBonusChange,
    resourceChanges,
    unlockedClassFeatures,
    unlockedSubclassFeatures,
  };
}

export interface HeroActionItem {
  id: string;
  kind: 'unarmed' | 'melee' | 'ranged' | 'bonus_light';
  name: string;
  subtitle: string;
  equipped: boolean;
  inventoryItemId?: string;
  handsRequired?: 1 | 2;
  hitBonus: number;
  hitFormula: string;
  hitBreakdown: string;
  damageFormula: string;
  damageBreakdown: string;
  rangeLabel: string;
  properties?: string;
  resolvedProperties?: WeaponPropertyRef[];
  mastery?: string;
  /** Active mastery (only populated when weapon is equipped AND hero has "Оружейное мастерство") */
  activeMastery?: {
    id: string;
    name: string;
    description: string;
    saveDc?: number;
    computedHint?: string;
  } | null;
  /** Extra two-handed attack stats for Versatile weapons */
  versatileAttack?: {
    damageFormula: string;
    damageBreakdown: string;
    availableNow: boolean;
    note: string;
  } | null;
  /** Thrown ranged attack stats for melee weapons with Thrown property */
  thrownAttack?: {
    hitFormula: string;
    damageFormula: string;
    normalFt: number;
    maxFt: number;
  } | null;
  /** True when weapon has Heavy property and hero STR < 13 */
  heavyDisadvantage?: boolean;
  /** True when weapon has Loading property */
  loadingNote?: boolean;
  /** True when weapon has Finesse property */
  finesseChoice?: boolean;
  /** True when weapon has Reach property */
  reachBonusNote?: boolean;
  /** Ammunition status for weapons with Ammunition property */
  ammoStatus?: {
    ammoItemId: string;
    ammoName: string;
    currentQty: number;
    maxCapacity: number;
    containerName: string | null;
    hasContainer: boolean;
  } | null;
  /** True when action represents an extra Light-weapon attack */
  isBonusAction?: boolean;
  bonusNote?: string;
}

function formatDamageWithAbilityMod(baseDamage: string, mod: number): string {
  const clean = baseDamage.trim();
  if (!clean) {
    return mod === 0 ? '1' : `1 ${mod > 0 ? '+' : '−'} ${Math.abs(mod)}`;
  }
  const match = /^(\S+)(\s+.*)?$/.exec(clean);
  if (!match) {
    return mod === 0 ? clean : `${clean} ${mod > 0 ? '+' : '−'} ${Math.abs(mod)}`;
  }
  const dicePart = match[1];
  const restPart = match[2] || '';
  if (mod === 0) return `${dicePart}${restPart}`;
  const sign = mod > 0 ? '+' : '−';
  return `${dicePart} ${sign} ${Math.abs(mod)}${restPart}`;
}

function replaceDamageDice(baseDamage: string, nextDice: string): string {
  const clean = baseDamage.trim();
  const match = /^(\S+)(\s+.*)?$/.exec(clean);
  if (!match) return nextDice;
  return `${nextDice}${match[2] || ''}`;
}

function formatHitFormula(hitBonus: number): string {
  if (hitBonus === 0) return '1к20';
  return hitBonus > 0 ? `1к20 + ${hitBonus}` : `1к20 − ${Math.abs(hitBonus)}`;
}

function formatHitBreakdown(
  profBonus: number,
  abilityLabel: string,
  abilityMod: number,
  exhaustionPenalty: number,
  total: number
): string {
  const parts = [`БМ (+${profBonus})`, `${abilityLabel} (${formatModifier(abilityMod)})`];
  if (exhaustionPenalty !== 0) {
    parts.push(`Истощ. (${exhaustionPenalty})`);
  }
  return `${parts.join(' + ')} = ${formatModifier(total)}`;
}

export function computeHeroActions(
  player: Pick<PlayerCharacter, 'abilities' | 'level' | 'classId' | 'inventory'> & {
    subclassId?: string;
    backgroundId?: string;
    featIds?: string[];
    conditions?: string[];
    exhaustionLevel?: number;
  },
  catalogs: Pick<GameCatalogs, 'classes' | 'weapons' | 'abilityModifiers'> & {
    armors?: GameCatalogs['armors'];
    backgrounds?: GameCatalogs['backgrounds'];
    feats?: GameCatalogs['feats'];
    classFeatures?: GameCatalogs['classFeatures'];
    subclassFeatures?: GameCatalogs['subclassFeatures'];
    weaponProperties?: GameCatalogs['weaponProperties'];
    weaponMasteries?: GameCatalogs['weaponMasteries'];
    gearItems?: GameCatalogs['gearItems'];
  }
): HeroActionItem[] {
  const classRef = catalogs.classes.find((c) => c.id === player.classId) ?? null;
  const profBonus = getClassProficiencyBonus(player.level, classRef);
  const strScore = player.abilities?.str ?? 10;
  const dexScore = player.abilities?.dex ?? 10;
  const strMod = getAbilityModifier(strScore, catalogs.abilityModifiers);
  const dexMod = getAbilityModifier(dexScore, catalogs.abilityModifiers);
  const condEffects = getActiveConditionEffects(player.conditions, player.exhaustionLevel);
  const exPen = condEffects.d20Penalty;

  const isMonk = player.classId === 'monk';
  const isBarbarian = player.classId === 'barbarian';
  const isRogue = player.classId === 'rogue';
  const safeLevel = Math.max(1, Math.min(20, Math.floor(Number(player.level) || 1)));
  const hasMasteryFeature = hasHeroWeaponMasteryFeature(player, catalogs);

  const handsUsage = computeEquippedHandsUsage(player.inventory, {
    weapons: catalogs.weapons,
    armors: catalogs.armors ?? [],
    weaponProperties: catalogs.weaponProperties,
  });

  const monkDieRaw = isMonk
    ? classRef?.classResources?.find((r) => r.id === 'monk-res-3')?.values[safeLevel - 1]
    : undefined;
  const monkDie =
    monkDieRaw && /^1?[кk]\d+/i.test(monkDieRaw) ? monkDieRaw.toLowerCase() : isMonk ? '1к6' : null;
  const rageDamageRaw = isBarbarian
    ? classRef?.classResources?.find((r) => r.id === 'barbarian-res-4')?.values[safeLevel - 1]
    : undefined;
  const sneakAttackRaw = isRogue
    ? classRef?.classResources?.find((r) => r.id === 'rogue-res-3')?.values[safeLevel - 1]
    : undefined;

  const hasTavernBrawler =
    Array.isArray(player.featIds) && player.featIds.includes('tavern_brawler')
      ? true
      : Boolean(
          catalogs.backgrounds &&
            player.backgroundId &&
            catalogs.backgrounds.find((b) => b.id === player.backgroundId)?.featId ===
              'tavern_brawler'
        );

  const actions: HeroActionItem[] = [];

  // 1. Unarmed Strike (always available; automated for Monk Martial Arts & Tavern Brawler)
  const useMonkDex = isMonk && dexMod > strMod;
  const unarmedAbMod = useMonkDex ? dexMod : strMod;
  const unarmedAbShort = useMonkDex ? 'ЛОВ' : 'СИЛ';
  const unarmedHitBonus = profBonus + unarmedAbMod + exPen;
  let unarmedDamageFormula: string;
  let unarmedDamageBreakdown: string;
  let unarmedSubtitle = 'Всегда доступно';

  if (monkDie) {
    unarmedDamageFormula = formatDamageWithAbilityMod(`${monkDie} дробящий`, unarmedAbMod);
    unarmedDamageBreakdown = `${monkDie} + ${unarmedAbShort} (${formatModifier(unarmedAbMod)}) · Боевые искусства`;
    unarmedSubtitle = 'Боевые искусства (авто)';
  } else if (hasTavernBrawler) {
    unarmedDamageFormula = formatDamageWithAbilityMod('1к4 дробящий', strMod);
    unarmedDamageBreakdown = `1к4 + СИЛ (${formatModifier(strMod)}) · Черта «Дебошир»`;
    unarmedSubtitle = 'Усилен чертой «Дебошир»';
  } else {
    const unarmedDamageTotal = Math.max(1, 1 + strMod);
    unarmedDamageFormula = `${unarmedDamageTotal} дробящий`;
    unarmedDamageBreakdown = `1 + СИЛ (${formatModifier(strMod)})`;
  }

  actions.push({
    id: 'action-unarmed',
    kind: 'unarmed',
    name: 'Безоружный удар',
    subtitle: unarmedSubtitle,
    equipped: true,
    hitBonus: unarmedHitBonus,
    hitFormula: formatHitFormula(unarmedHitBonus),
    hitBreakdown: formatHitBreakdown(profBonus, unarmedAbShort, unarmedAbMod, exPen, unarmedHitBonus),
    damageFormula: unarmedDamageFormula,
    damageBreakdown: unarmedDamageBreakdown,
    rangeLabel: '5 фт.',
    bonusNote:
      isBarbarian && rageDamageRaw && !useMonkDex
        ? `В Ярости: ${rageDamageRaw} к урону`
        : undefined,
  });

  // 2 & 3. Melee & Ranged Weapon Attacks from inventory
  const weaponsInInventory = (player.inventory ?? []).filter((item) => item.category === 'weapon');
  const sortedWeapons = [...weaponsInInventory].sort(
    (a, b) => Number(b.equipped) - Number(a.equipped)
  );

  const equippedLightWeapons: Array<{
    item: InventoryItem;
    baseDamage: string;
    abilityMod: number;
    abilityShort: string;
    hitBonus: number;
    rangeLabel: string;
    hasNickMastery: boolean;
  }> = [];

  for (const item of sortedWeapons) {
    const catalogWeapon = resolveWeaponCatalogItem(item, catalogs);
    const resolvedRange = resolveWeaponReachRange(item, catalogs);
    const isRanged = resolvedRange.rangeType === 'ranged';
    const rangeLabel =
      isRanged && resolvedRange.maxFt > resolvedRange.normalFt
        ? `${resolvedRange.normalFt}/${resolvedRange.maxFt} фт.`
        : `${resolvedRange.normalFt} фт.`;

    const resolvedProps = resolveWeaponPropertyRefs(item, catalogs);
    const propIds = new Set(resolvedProps.map((p) => p.id));
    const isFinesse = propIds.has('prop-finesse');
    const isLight = propIds.has('prop-light');
    const isVersatile = propIds.has('prop-versatile');
    const isThrown = propIds.has('prop-thrown');
    const isTwoHanded = propIds.has('prop-two-handed');
    const isHeavy = propIds.has('prop-heavy');
    const isReach = propIds.has('prop-reach');
    const isLoading = propIds.has('prop-loading');

    const wpnCat = item.weaponCategory ?? catalogWeapon?.category;
    const isMonkWeapon = isMonk && !isRanged && (wpnCat === 'simple' || isLight);

    const baseDamage = item.damage || catalogWeapon?.damage || '1к4';
    let abilityMod = isRanged ? dexMod : strMod;
    let abilityShort = isRanged ? 'ЛОВ' : 'СИЛ';
    if (!isRanged && (isFinesse || isMonkWeapon) && dexMod > strMod) {
      abilityMod = dexMod;
      abilityShort = 'ЛОВ';
    }

    const hitBonus = profBonus + abilityMod + exPen;
    const notes: string[] = [];
    if (isBarbarian && rageDamageRaw && !isRanged && abilityShort === 'СИЛ') {
      notes.push(`В Ярости: ${rageDamageRaw} к урону`);
    }
    if (isRogue && sneakAttackRaw && (isRanged || isFinesse)) {
      notes.push(`Коварная атака: +${sneakAttackRaw}`);
    }

    // Versatile two-handed damage calculation
    let versatileAttack: HeroActionItem['versatileAttack'] = null;
    if (isVersatile && !isRanged) {
      const vDice =
        item.versatileDamage ||
        catalogWeapon?.versatileDamage ||
        inferVersatileDamageFromText(item.properties || catalogWeapon?.properties) ||
        '1к8';
      const vBase = replaceDamageDice(baseDamage, vDice);
      const otherHandFree = item.equipped ? handsUsage.usedHands <= 1 : true;
      versatileAttack = {
        damageFormula: formatDamageWithAbilityMod(vBase, abilityMod),
        damageBreakdown: `${vBase} + ${abilityShort} (${formatModifier(abilityMod)})`,
        availableNow: otherHandFree,
        note: otherHandFree
          ? 'Двумя руками (вторая рука свободна)'
          : 'Вторая рука занята — сейчас используется одной рукой',
      };
    }

    // Thrown ranged attack calculation
    let thrownAttack: HeroActionItem['thrownAttack'] = null;
    if (isThrown && !isRanged) {
      const normalFt = item.thrownNormalFt ?? catalogWeapon?.thrownNormalFt ?? 20;
      const maxFt = item.thrownMaxFt ?? catalogWeapon?.thrownMaxFt ?? 60;
      thrownAttack = {
        hitFormula: formatHitFormula(hitBonus),
        damageFormula: formatDamageWithAbilityMod(baseDamage, abilityMod),
        normalFt,
        maxFt,
      };
    }

    // Ammunition status
    const ammoReq = resolveWeaponAmmoRequirement(item, catalogs);
    let ammoStatus: HeroActionItem['ammoStatus'] = null;
    if (ammoReq.required && ammoReq.ammoRef) {
      const cap = getAmmoCapacityForPlayer(player.inventory, ammoReq.ammoRef, catalogs);
      ammoStatus = {
        ammoItemId: ammoReq.ammoRef.id,
        ammoName: ammoReq.ammoRef.name,
        currentQty: cap.currentQty,
        maxCapacity: Number.isFinite(cap.maxCapacity) ? cap.maxCapacity : cap.currentQty,
        containerName: ammoReq.containerRef?.name ?? null,
        hasContainer: !ammoReq.containerRef || cap.containerCount > 0,
      };
    }

    // Weapon Mastery (ONLY active when weapon is equipped AND hero has "Оружейное мастерство")
    const masteryRef = resolveWeaponMasteryRef(item, catalogs);
    let activeMastery: HeroActionItem['activeMastery'] = null;
    if (item.equipped && hasMasteryFeature && masteryRef) {
      const saveDc = masteryRef.id === 'mst-topple' ? 8 + profBonus + abilityMod : undefined;
      let computedHint: string | undefined;
      if (masteryRef.id === 'mst-topple' && saveDc !== undefined) {
        computedHint = `Спасбросок Тел. Сл ${saveDc} (8 + БМ ${profBonus} + ${abilityShort} ${formatModifier(abilityMod)}) → Опрокинутый`;
      } else if (masteryRef.id === 'mst-sap') {
        computedHint = 'Помеха на следующий бросок атаки цели до начала вашего следующего хода';
      } else if (masteryRef.id === 'mst-slow') {
        computedHint = 'Скорость цели −10 фт. до начала вашего следующего хода (не складывается)';
      } else if (masteryRef.id === 'mst-nick') {
        computedHint = 'Доп. атака Лёгким оружием — частью действия Атака (1/ход) вместо Бонусного действия';
      } else if (masteryRef.id === 'mst-graze') {
        computedHint = `При промахе наносит ${Math.max(0, abilityMod)} урона (${abilityShort})`;
      }
      activeMastery = {
        id: masteryRef.id,
        name: masteryRef.name,
        description: masteryRef.description,
        saveDc,
        computedHint,
      };
    }

    if (item.equipped && isLight) {
      equippedLightWeapons.push({
        item,
        baseDamage,
        abilityMod,
        abilityShort,
        hitBonus,
        rangeLabel,
        hasNickMastery: Boolean(activeMastery && activeMastery.id === 'mst-nick'),
      });
    }

    actions.push({
      id: `action-wpn-${item.id}`,
      kind: isRanged ? 'ranged' : 'melee',
      name: item.name,
      subtitle: isRanged ? 'Дальнобойная атака оружием' : 'Рукопашная атака оружием',
      equipped: item.equipped,
      inventoryItemId: item.id,
      handsRequired: isTwoHanded ? 2 : 1,
      hitBonus,
      hitFormula: formatHitFormula(hitBonus),
      hitBreakdown: formatHitBreakdown(profBonus, abilityShort, abilityMod, exPen, hitBonus),
      damageFormula: formatDamageWithAbilityMod(baseDamage, abilityMod),
      damageBreakdown: `${baseDamage} + ${abilityShort} (${formatModifier(abilityMod)})`,
      rangeLabel,
      properties:
        resolvedProps.length > 0
          ? formatWeaponPropertiesSummary(
              {
                propertyIds: resolvedProps.map((p) => p.id),
                properties: item.properties || catalogWeapon?.properties || '',
                versatileDamage: item.versatileDamage || catalogWeapon?.versatileDamage,
                rangeType: resolvedRange.rangeType,
                rangeNormalFt: isRanged ? resolvedRange.normalFt : undefined,
                rangeMaxFt: isRanged ? resolvedRange.maxFt : undefined,
                thrownNormalFt: item.thrownNormalFt ?? catalogWeapon?.thrownNormalFt,
                thrownMaxFt: item.thrownMaxFt ?? catalogWeapon?.thrownMaxFt,
              },
              catalogs
            )
          : item.properties || catalogWeapon?.properties,
      resolvedProperties: resolvedProps,
      mastery: masteryRef?.name ?? (item.mastery || catalogWeapon?.mastery),
      activeMastery,
      versatileAttack,
      thrownAttack,
      heavyDisadvantage: isHeavy && strScore < 13,
      loadingNote: isLoading,
      finesseChoice: isFinesse,
      reachBonusNote: isReach,
      ammoStatus,
      bonusNote: notes.length > 0 ? notes.join(' · ') : undefined,
    });
  }

  // 4. Automatic Extra Attack from Two Equipped Light Weapons (or Nick mastery!)
  if (equippedLightWeapons.length >= 2) {
    const offhand = equippedLightWeapons[1];
    const hasNick = equippedLightWeapons.some((w) => w.hasNickMastery);
    const offhandDmgMod = offhand.abilityMod < 0 ? offhand.abilityMod : 0;
    actions.push({
      id: 'action-light-extra',
      kind: 'bonus_light',
      name: hasNick
        ? `Доп. атака: ${offhand.item.name} (Быстрое)`
        : `Доп. атака: ${offhand.item.name}`,
      subtitle: hasNick
        ? 'Частью действия Атака (1/ход, мастерство «Быстрое»)'
        : 'Бонусное действие (свойство «Лёгкое»)',
      equipped: true,
      inventoryItemId: offhand.item.id,
      hitBonus: offhand.hitBonus,
      hitFormula: formatHitFormula(offhand.hitBonus),
      hitBreakdown: formatHitBreakdown(
        profBonus,
        offhand.abilityShort,
        offhand.abilityMod,
        exPen,
        offhand.hitBonus
      ),
      damageFormula: formatDamageWithAbilityMod(offhand.baseDamage, offhandDmgMod),
      damageBreakdown:
        offhandDmgMod < 0
          ? `${offhand.baseDamage} ${offhandDmgMod} (отрицат. мод. ${offhand.abilityShort})`
          : `${offhand.baseDamage} (без положит. модификатора характеристики)`,
      rangeLabel: offhand.rangeLabel,
      isBonusAction: true,
      bonusNote: hasNick
        ? 'Освобождает Бонусное действие — выполняется внутри действия Атака после атаки другим Лёгким оружием.'
        : 'Совершается другим Лёгким оружием после действия Атака Лёгким оружием.',
    });
  }

  return actions;
}

// ============================================================================
// Inventory Weight Limit & Encumbrance (Heroes Only)
// ============================================================================

export const ENCUMBRANCE_CONDITION_NAMES = [
  'Слегка перегружен',
  'Сильно перегружен',
  'Максимальный лимит',
] as const;

export const DYING_AUTO_CONDITIONS = [
  'Умирающий',
  'Бессознательный',
  'Недееспособный',
  'Опрокинутый',
] as const;

/**
 * Parses Russian/English weight strings like "2 фнт.", "0,5 фнт.", "1/4 фнт.", "1 1/2", "12.5 lb".
 * Returns weight in pounds (фнт.), or 0 if empty / unparseable.
 */
export function parseWeightLb(raw?: string | number | null): number {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw > 0 ? Math.round(raw * 100) / 100 : 0;
  }
  if (!raw || typeof raw !== 'string') return 0;
  const cleaned = raw.trim().replace(/,/g, '.');
  if (!cleaned || cleaned === '—' || cleaned === '-') return 0;

  // Mixed fraction e.g. "1 1/2"
  const mixed = /(\d+)\s+(\d+)\s*\/\s*(\d+)/.exec(cleaned);
  if (mixed) {
    const whole = Number(mixed[1]);
    const num = Number(mixed[2]);
    const den = Number(mixed[3]);
    if (den > 0 && Number.isFinite(whole) && Number.isFinite(num)) {
      return Math.round((whole + num / den) * 100) / 100;
    }
  }

  // Simple fraction e.g. "1/4" or "1/2"
  const frac = /(\d+)\s*\/\s*(\d+)/.exec(cleaned);
  if (frac) {
    const num = Number(frac[1]);
    const den = Number(frac[2]);
    if (den > 0 && Number.isFinite(num)) {
      return Math.round((num / den) * 100) / 100;
    }
  }

  const decimal = /(\d+(?:\.\d+)?)/.exec(cleaned);
  if (decimal) {
    const val = Number(decimal[1]);
    if (Number.isFinite(val) && val > 0) {
      return Math.round(val * 100) / 100;
    }
  }
  return 0;
}

export function formatWeightLb(lb: number): string {
  const safe = Number.isFinite(lb) && lb > 0 ? Math.round(lb * 100) / 100 : 0;
  if (Math.abs(safe - Math.round(safe)) < 0.001) {
    return String(Math.round(safe));
  }
  return safe.toFixed(2).replace(/0$/, '').replace('.', ',');
}

export function getInventoryItemUnitWeightLb(
  item: InventoryItem,
  catalogs?: Partial<Pick<GameCatalogs, 'weapons' | 'armors' | 'gearItems'>> | null
): number {
  const gearRef = resolveGearCatalogItem(item, catalogs);
  const packQty =
    item.packQuantity && item.packQuantity > 1
      ? item.packQuantity
      : gearRef?.kind === 'ammunition' && gearRef.packQuantity && gearRef.packQuantity > 1
        ? gearRef.packQuantity
        : 1;

  const direct = parseWeightLb(item.weight);
  if (direct > 0) {
    return packQty > 1 ? Math.round((direct / packQty) * 1000) / 1000 : direct;
  }
  if (!catalogs) return 0;

  const lowerName = item.name.trim().toLowerCase();
  if (item.category === 'weapon' && catalogs.weapons) {
    const w =
      (item.catalogItemId
        ? catalogs.weapons.find((x) => x.id === item.catalogItemId)
        : undefined) ??
      catalogs.weapons.find((x) => x.name.trim().toLowerCase() === lowerName);
    if (w?.weight) return parseWeightLb(w.weight);
  } else if (item.category === 'armor' && catalogs.armors) {
    const a =
      (item.catalogItemId
        ? catalogs.armors.find((x) => x.id === item.catalogItemId)
        : undefined) ??
      catalogs.armors.find((x) => x.name.trim().toLowerCase() === lowerName);
    if (a?.weight) return parseWeightLb(a.weight);
  } else if (gearRef?.weight) {
    const base = parseWeightLb(gearRef.weight);
    return packQty > 1 ? Math.round((base / packQty) * 1000) / 1000 : base;
  }
  return 0;
}

export interface HeroEncumbranceInfo {
  strScore: number;
  totalWeightLb: number;
  lightThresholdLb: number;
  heavyThresholdLb: number;
  maxCarryLb: number;
  tier: 'none' | 'light' | 'heavy' | 'max';
  conditionName: string | null;
  speedPenaltyFt: number;
  speedCapFt: number | null;
  hasStrDexConDisadvantage: boolean;
  summary: string;
}

export function computeHeroEncumbrance(
  player: Pick<PlayerCharacter, 'abilities' | 'inventory'>,
  catalogs?: Partial<Pick<GameCatalogs, 'weapons' | 'armors' | 'gearItems'>> | null
): HeroEncumbranceInfo {
  const rawStr = Number(player.abilities?.str ?? 10);
  const strScore = Number.isFinite(rawStr) && rawStr > 0 ? Math.round(rawStr) : 10;
  const lightThresholdLb = strScore * 5;
  const heavyThresholdLb = strScore * 10;
  const maxCarryLb = strScore * 15;

  let rawTotal = 0;
  for (const item of player.inventory ?? []) {
    const unit = getInventoryItemUnitWeightLb(item, catalogs);
    const qty = Math.max(0, Number(item.quantity) || 0);
    rawTotal += unit * qty;
  }
  const totalWeightLb = Math.round(rawTotal * 100) / 100;

  if (totalWeightLb > maxCarryLb) {
    return {
      strScore,
      totalWeightLb,
      lightThresholdLb,
      heavyThresholdLb,
      maxCarryLb,
      tier: 'max',
      conditionName: 'Максимальный лимит',
      speedPenaltyFt: 0,
      speedCapFt: 5,
      hasStrDexConDisadvantage: true,
      summary:
        'Вес превышает Сила × 15: скорость падает до 5 фт., помеха на проверки, атаки и спасброски СИЛ, ЛОВ и ТЕЛ.',
    };
  }
  if (totalWeightLb > heavyThresholdLb) {
    return {
      strScore,
      totalWeightLb,
      lightThresholdLb,
      heavyThresholdLb,
      maxCarryLb,
      tier: 'heavy',
      conditionName: 'Сильно перегружен',
      speedPenaltyFt: 20,
      speedCapFt: null,
      hasStrDexConDisadvantage: true,
      summary:
        'Вес превышает Сила × 10: скорость −20 фт., помеха на проверки, атаки и спасброски СИЛ, ЛОВ и ТЕЛ.',
    };
  }
  if (totalWeightLb > lightThresholdLb) {
    return {
      strScore,
      totalWeightLb,
      lightThresholdLb,
      heavyThresholdLb,
      maxCarryLb,
      tier: 'light',
      conditionName: 'Слегка перегружен',
      speedPenaltyFt: 10,
      speedCapFt: null,
      hasStrDexConDisadvantage: false,
      summary: 'Вес превышает Сила × 5: скорость снижается на 10 фт.',
    };
  }
  return {
    strScore,
    totalWeightLb,
    lightThresholdLb,
    heavyThresholdLb,
    maxCarryLb,
    tier: 'none',
    conditionName: null,
    speedPenaltyFt: 0,
    speedCapFt: null,
    hasStrDexConDisadvantage: false,
    summary: 'Нагрузка в норме — штрафов к скорости и броскам нет.',
  };
}

// ============================================================================
// In-Game Clock & Dynamic Day/Night Map Tinting
// ============================================================================

/** 24 in-game hours = 4 real hours => 6 in-game minutes per 1 real minute */
export const DEFAULT_GAME_CLOCK_SCALE = 6;

export function createDefaultGameClock(nowMs: number = Date.now()): GameClockState {
  return {
    anchorGameMinutes: 9 * 60, // Day 1, 09:00
    anchorRealMs: nowMs,
    timeScale: DEFAULT_GAME_CLOCK_SCALE,
    paused: false,
  };
}

export function computeCurrentGameMinutes(
  clock: GameClockState | undefined | null,
  nowMs: number = Date.now()
): number {
  if (!clock) return 9 * 60;
  const base = Number.isFinite(clock.anchorGameMinutes) ? Math.max(0, clock.anchorGameMinutes) : 9 * 60;
  if (clock.paused) return base;
  const scale =
    typeof clock.timeScale === 'number' && Number.isFinite(clock.timeScale) && clock.timeScale >= 0
      ? clock.timeScale
      : DEFAULT_GAME_CLOCK_SCALE;
  const elapsedRealMin = Math.max(0, (nowMs - clock.anchorRealMs) / 60000);
  return base + elapsedRealMin * scale;
}

export interface FormattedGameClock {
  totalMinutes: number;
  day: number;
  hours: number;
  minutes: number;
  minuteOfDay: number;
  timeText: string;
  dayText: string;
  phaseLabel: string;
  phaseIcon: 'moon' | 'sunrise' | 'sun' | 'sunset';
  lighting: MapLighting;
  overlayCss: string;
  filterCss: string;
  paused: boolean;
}

function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

export function formatGameClock(
  clock: GameClockState | undefined | null,
  nowMs: number = Date.now()
): FormattedGameClock {
  const totalMinutes = computeCurrentGameMinutes(clock, nowMs);
  const wholeMinutes = Math.floor(totalMinutes);
  const day = Math.floor(wholeMinutes / 1440) + 1;
  const minuteOfDay = ((wholeMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  const timeText = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const dayText = `День ${day}`;

  // Continuous hour value for smooth lighting/color transitions
  const h = (totalMinutes % 1440) / 60;

  let phaseLabel: string;
  let phaseIcon: 'moon' | 'sunrise' | 'sun' | 'sunset';
  let lighting: MapLighting;
  let r = 0;
  let g = 0;
  let b = 0;
  let alpha = 0;
  let brightness = 1;
  let saturate = 1;

  if (h < 5.0 || h >= 21.0) {
    // Deep Night (21:00 – 05:00)
    phaseLabel = 'Ночь';
    phaseIcon = 'moon';
    lighting = 'darkness';
    r = 8;
    g = 14;
    b = 42;
    alpha = 0.56;
    brightness = 0.62;
    saturate = 0.78;
  } else if (h < 6.5) {
    // Dawn (05:00 – 06:30): night indigo -> warm sunrise rose/gold
    const t = (h - 5.0) / 1.5;
    phaseLabel = 'Рассвет';
    phaseIcon = 'sunrise';
    lighting = 'dim';
    r = lerpNum(14, 215, t);
    g = lerpNum(20, 120, t);
    b = lerpNum(56, 72, t);
    alpha = lerpNum(0.5, 0.24, t);
    brightness = lerpNum(0.68, 0.9, t);
    saturate = lerpNum(0.82, 1.05, t);
  } else if (h < 8.0) {
    // Early Morning (06:30 – 08:00): warm golden light -> bright clear day
    const t = (h - 6.5) / 1.5;
    phaseLabel = 'Утро';
    phaseIcon = 'sunrise';
    lighting = h < 7.0 ? 'dim' : 'bright';
    r = lerpNum(230, 255, t);
    g = lerpNum(155, 220, t);
    b = lerpNum(80, 160, t);
    alpha = lerpNum(0.2, 0.0, t);
    brightness = lerpNum(0.92, 1.0, t);
    saturate = lerpNum(1.04, 1.0, t);
  } else if (h < 17.5) {
    // Day (08:00 – 17:30): bright clear light
    phaseLabel = h < 11.5 ? 'Утро' : 'День';
    phaseIcon = 'sun';
    lighting = 'bright';
    r = 0;
    g = 0;
    b = 0;
    alpha = 0;
    brightness = 1;
    saturate = 1;
  } else if (h < 19.5) {
    // Sunset / Evening (17:30 – 19:30): golden hour -> warm amber-crimson sunset
    const t = (h - 17.5) / 2.0;
    phaseLabel = h < 18.5 ? 'Вечер' : 'Закат';
    phaseIcon = 'sunset';
    lighting = h < 18.0 ? 'bright' : 'dim';
    r = lerpNum(235, 195, t);
    g = lerpNum(145, 72, t);
    b = lerpNum(55, 52, t);
    alpha = lerpNum(0.05, 0.3, t);
    brightness = lerpNum(0.98, 0.84, t);
    saturate = lerpNum(1.04, 1.08, t);
  } else {
    // Twilight (19:30 – 21:00): sunset crimson -> deep night indigo
    const t = (h - 19.5) / 1.5;
    phaseLabel = 'Сумерки';
    phaseIcon = 'moon';
    lighting = h < 20.5 ? 'dim' : 'darkness';
    r = lerpNum(155, 10, t);
    g = lerpNum(62, 16, t);
    b = lerpNum(76, 46, t);
    alpha = lerpNum(0.32, 0.55, t);
    brightness = lerpNum(0.82, 0.63, t);
    saturate = lerpNum(1.02, 0.8, t);
  }

  const overlayCss =
    alpha <= 0.005
      ? 'transparent'
      : `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha.toFixed(3)})`;
  const filterCss =
    Math.abs(brightness - 1) < 0.01 && Math.abs(saturate - 1) < 0.01
      ? 'none'
      : `brightness(${brightness.toFixed(2)}) saturate(${saturate.toFixed(2)})`;

  return {
    totalMinutes,
    day,
    hours,
    minutes,
    minuteOfDay,
    timeText,
    dayText,
    phaseLabel,
    phaseIcon,
    lighting,
    overlayCss,
    filterCss,
    paused: Boolean(clock?.paused),
  };
}

export function resolveEffectiveMapLighting(
  mapLighting: MapLighting | undefined,
  affectedByTimeOfDay: boolean | undefined,
  clock: GameClockState | undefined | null,
  nowMs: number = Date.now()
): MapLighting {
  if (affectedByTimeOfDay && clock) {
    return formatGameClock(clock, nowMs).lighting;
  }
  return mapLighting ?? 'bright';
}




