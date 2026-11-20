import type {
  AbilityModifierRef,
  AbilityRef,
  ArmorCategory,
  ArmorRef,
  EntityVisionEntry,
  GameCatalogs,
  InventoryItem,
  LevelThresholdRef,
  MapLighting,
  MonsterActionRef,
  PlayerCharacter,
  VisionBehavior,
  VisionRef,
  WeaponCategory,
  WeaponRangeType,
  WeaponRef,
} from './types';

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

  return {
    abilities,
    abilityModifiers,
    classes: [
      { id: 'artificer', name: 'Артефактор', description: 'Мастер магических изобретений, рун и алхимических устройств.' },
      { id: 'bard', name: 'Бард', description: 'Вдохновитель и заклинатель, черпающий магию в музыке и слове.' },
      { id: 'barbarian', name: 'Варвар', description: 'Неистовый боец, полагающийся на ярость и выносливость.' },
      { id: 'fighter', name: 'Воин', description: 'Мастер тактики, оружия и доспехов в любом сражении.' },
      { id: 'wizard', name: 'Волшебник', description: 'Ученый-маг, изучающий тайные заклинания по гримуару.' },
      { id: 'druid', name: 'Друид', description: 'Хранитель природы, управляющий стихиями и обликом зверей.' },
      { id: 'cleric', name: 'Жрец', description: 'Проводник божественной воли, целитель и защитник отряда.' },
      { id: 'warlock', name: 'Колдун', description: 'Заклинатель, получивший силу через пакт с могущественной сущностью.' },
      { id: 'monk', name: 'Монах', description: 'Мастер боевых искусств, направляющий внутреннюю энергию ци.' },
      { id: 'paladin', name: 'Паладин', description: 'Воин клятвы, сочетающий тяжелую броню и священную магию.' },
      { id: 'rogue', name: 'Плут', description: 'Специалист по скрытности, ловушкам и точным ударам.' },
      { id: 'ranger', name: 'Следопыт', description: 'Охотник и разведчик диких земель, меткий стрелок.' },
      { id: 'sorcerer', name: 'Чародей', description: 'Носитель врожденной магии, изменяющий плетение силой воли.' },
    ],
    backgrounds: [
      { id: 'entertainer', name: 'Артист', description: 'Привык выступать перед публикой и завоевывать внимание толпы.' },
      { id: 'wayfarer', name: 'Бродяга', description: 'Вырос на улицах и дорогах, умеет выживать и находить лазейки.' },
      { id: 'noble', name: 'Дворянин', description: 'Воспитан в знатном роду, знаком с этикетом и политикой.' },
      { id: 'sailor', name: 'Моряк', description: 'Закален штормами, знает корабельное дело и портовые нравы.' },
      { id: 'sage', name: 'Мудрец', description: 'Посвятил годы книгам, архивам и поиску утраченных знаний.' },
      { id: 'hermit', name: 'Отшельник', description: 'Провел долгое время в уединении, размышлениях и самопознании.' },
      { id: 'scribe', name: 'Писарь', description: 'Искусен в документах, шифрах, летописях и переписке.' },
      { id: 'acolyte', name: 'Послушник', description: 'Служил в храме, знает обряды, догматы и духовные традиции.' },
      { id: 'criminal', name: 'Преступник', description: 'Имеет связи в теневом мире и опыт обхода закона.' },
      { id: 'guide', name: 'Проводник', description: 'Знает тайные тропы, ориентируется на местности и в дикой природе.' },
      { id: 'artisan', name: 'Ремесленник', description: 'Состоял в гильдии мастеров, разбирается в ремесле и материалах.' },
      { id: 'soldier', name: 'Солдат', description: 'Прошел военную службу, обучен дисциплине и строевому бою.' },
      { id: 'guard', name: 'Стражник', description: 'Нес караульную службу, натренирован замечать угрозы и нарушителей.' },
      { id: 'merchant', name: 'Торговец', description: 'Умеет оценивать товары, торговаться и вести дела с купцами.' },
      { id: 'farmer', name: 'Фермер', description: 'Привык к тяжелому труду на земле, уходу за животными и хозяйству.' },
      { id: 'charlatan', name: 'Шарлатан', description: 'Мастер афер, подделок и убедительных вымышленных историй.' },
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
    weapons: [
      {
        id: 'wpn-dagger',
        category: 'simple',
        rangeType: 'melee',
        name: 'Кинжал',
        damage: '1к4 колющий',
        reachFt: 5,
        properties: 'Фехтовальное, Лёгкое, Метательное (20/60)',
        mastery: 'Зазубрина',
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
        properties: 'Лёгкое',
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
        reachFt: 5,
        properties: 'Универсальное (1к8)',
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
        reachFt: 5,
        properties: 'Метательное (20/60), Универсальное (1к8)',
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
        properties: 'Боеприпасы (80/320), Двуручное',
        mastery: 'Досаждение',
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
        properties: 'Боеприпасы (80/320), Перезарядка, Двуручное',
        mastery: 'Замедление',
        weight: '5 фнт.',
        price: '25 зм',
      },
      {
        id: 'wpn-longsword',
        category: 'martial',
        rangeType: 'melee',
        name: 'Длинный меч',
        damage: '1к8 рубящий',
        reachFt: 5,
        properties: 'Универсальное (1к10)',
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
        properties: 'Фехтовальное, Лёгкое',
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
        properties: 'Фехтовальное',
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
        reachFt: 5,
        properties: 'Универсальное (1к10)',
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
        properties: 'Тяжёлое, Двуручное',
        mastery: 'Скользящий удар',
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
        properties: 'Тяжёлое, Досягаемость, Двуручное',
        mastery: 'Рассечение',
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
        properties: 'Боеприпасы (150/600), Тяжёлое, Двуручное',
        mastery: 'Замедление',
        weight: '2 фнт.',
        price: '50 зм',
      },
    ],
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
  player: Pick<PlayerCharacter, 'abilities' | 'inventory'>,
  catalogs: GameCatalogs
): { total: number; breakdown: string } {
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
  };
}

export function computePlayerAc(
  player: Pick<PlayerCharacter, 'abilities' | 'inventory'>,
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

export function canPlayerEquipItem(
  player: Pick<PlayerCharacter, 'proficiencyIds' | 'abilities'>,
  item: InventoryItem,
  catalogs: GameCatalogs
): { allowed: true } | { allowed: false; reason: string } {
  if (item.category === 'weapon') {
    const catalogWeapon =
      (item.catalogItemId
        ? catalogs.weapons.find((w) => w.id === item.catalogItemId)
        : undefined) ??
      catalogs.weapons.find((w) => w.name.trim().toLowerCase() === item.name.trim().toLowerCase());
    const weaponCat: WeaponCategory | undefined = item.weaponCategory ?? catalogWeapon?.category;
    const weaponRange: WeaponRangeType | undefined =
      item.weaponRangeType ?? catalogWeapon?.rangeType;

    const missingParts: string[] = [];

    if (weaponCat === 'simple') {
      const ok = hasProficiencyFor(player, catalogs, 'weapon_simple', [['прост', 'оруж']]);
      if (!ok) missingParts.push('простым оружием');
    } else if (weaponCat === 'martial') {
      const ok = hasProficiencyFor(player, catalogs, 'weapon_martial', [
        ['воинск', 'оруж'],
        ['военн', 'оруж'],
      ]);
      if (!ok) missingParts.push('воинским оружием');
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
        hasProficiencyFor(player, catalogs, 'weapon_martial', [['воинск', 'оруж'], ['военн', 'оруж']]) ||
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
    const normal = typeof opts.rangeNormalFt === 'number' && opts.rangeNormalFt > 0 ? opts.rangeNormalFt : null;
    const max = typeof opts.rangeMaxFt === 'number' && opts.rangeMaxFt > 0 ? opts.rangeMaxFt : null;
    if (normal && max) return `${normal}/${max} фт.`;
    if (normal) return `${normal} фт.`;
    if (max) return `до ${max} фт.`;
    return '';
  }
  if (rangeType === 'melee') {
    const reach = typeof opts.reachFt === 'number' && opts.reachFt > 0 ? opts.reachFt : null;
    return reach ? `${reach} фт.` : '';
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
      typeof item.rangeNormalFt === 'number' && item.rangeNormalFt > 0
        ? item.rangeNormalFt
        : typeof catalogWeapon?.rangeNormalFt === 'number' && catalogWeapon.rangeNormalFt > 0
          ? catalogWeapon.rangeNormalFt
          : inferred.rangeNormalFt ?? 80;
    const maxFt =
      typeof item.rangeMaxFt === 'number' && item.rangeMaxFt > 0
        ? Math.max(normalFt, item.rangeMaxFt)
        : typeof catalogWeapon?.rangeMaxFt === 'number' && catalogWeapon.rangeMaxFt > 0
          ? Math.max(normalFt, catalogWeapon.rangeMaxFt)
          : Math.max(normalFt, inferred.rangeMaxFt ?? normalFt * 4);
    return { rangeType, normalFt, maxFt };
  }

  const reachFt =
    typeof item.reachFt === 'number' && item.reachFt > 0
      ? item.reachFt
      : typeof catalogWeapon?.reachFt === 'number' && catalogWeapon.reachFt > 0
        ? catalogWeapon.reachFt
        : inferred.reachFt ?? 5;
  return { rangeType: 'melee', normalFt: reachFt, maxFt: reachFt };
}

export function resolveMonsterActionRange(action: MonsterActionRef): {
  rangeType: WeaponRangeType;
  normalFt: number;
  maxFt: number;
} | null {
  if (action.attackType === 'melee') {
    const reach =
      typeof action.reachFt === 'number' && action.reachFt > 0 ? action.reachFt : null;
    if (!reach) return null;
    return { rangeType: 'melee', normalFt: reach, maxFt: reach };
  }
  if (action.attackType === 'ranged') {
    const normal =
      typeof action.rangeNormalFt === 'number' && action.rangeNormalFt > 0
        ? action.rangeNormalFt
        : null;
    const max =
      typeof action.rangeMaxFt === 'number' && action.rangeMaxFt > 0
        ? action.rangeMaxFt
        : normal;
    if (!normal && !max) return null;
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
  lighting: MapLighting = 'bright'
): {
  clearRangeFt: number;
  visibleRangeFt: number;
  summary: string;
} {
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

