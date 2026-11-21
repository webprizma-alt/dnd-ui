import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BookOpen,
  Calculator,
  Check,
  ChevronDown,
  ChevronUp,
  Dna,
  Eye,
  GitBranch,
  Image as ImageIcon,
  Layers,
  Loader2,
  Map as MapIcon,
  Pencil,
  Plus,
  RotateCcw,
  ScrollText,
  Search,
  Shield,
  ShieldCheck,
  Skull,
  SlidersHorizontal,
  Sparkles,
  Star,
  Sword,
  Swords,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  DEFAULT_PROFICIENCY_BONUS_BY_LEVEL,
  formatAbilityRange,
  formatArmorClassFormula,
  formatEntityVisions,
  formatModifier,
  formatWeaponReachRange,
  getAbilityModifier,
  getArmorCategoryLabel,
  getClassHitDieInfo,
  getVisionBehaviorLabel,
  getWeaponCategoryLabel,
  getWeaponRangeLabel,
  sortAbilityModifiers,
  sortLevels,
} from '../../shared/catalogDefaults';
import type {
  AbilityModifierRef,
  AbilityRef,
  ArmorCategory,
  ArmorRef,
  BackgroundRef,
  CatalogKey,
  ClassFeatureRef,
  ClassRef,
  ClassResourceScaling,
  EntityVisionEntry,
  FeatRef,
  LevelThresholdRef,
  MonsterActionRef,
  MonsterRef,
  ProficiencyCategory,
  ProficiencyRef,
  SkillRef,
  SpeciesRef,
  SubclassFeatureRef,
  SubclassRef,
  VisionBehavior,
  VisionRef,
  WeaponCategory,
  WeaponRangeType,
  WeaponRef,
} from '../../shared/types';
import { VisionSelector } from '../components/VisionSelector';
import { compressImageFileToDataUrl } from '../imageUtils';
import { useGameSocket } from '../useGameSocket';

interface CatalogsViewProps {
  onNavigate: (path: string) => void;
}

interface CatalogSectionMeta {
  key: CatalogKey;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SECTIONS: CatalogSectionMeta[] = [
  {
    key: 'abilities',
    label: 'Характеристики',
    subtitle: 'Базовые параметры персонажа и монстров, к которым привязываются проверки и навыки.',
    icon: Sparkles,
  },
  {
    key: 'abilityModifiers',
    label: 'Модификаторы',
    subtitle: 'Таблица перевода значения характеристики в модификатор. Используется для КЗ, инициативы и навыков.',
    icon: Calculator,
  },
  {
    key: 'classes',
    label: 'Классы',
    subtitle: 'Хиты за уровень, таблица бонуса мастерства, параметры класса, спасброски (ДМ), навыки и владения (PHB 2024).',
    icon: Swords,
  },
  {
    key: 'subclasses',
    label: 'Подклассы',
    subtitle: 'Специализации классов (PHB 2024 / Eberron), открываются героям с 3 уровня.',
    icon: GitBranch,
  },
  {
    key: 'classFeatures',
    label: 'Классовые умения',
    subtitle: 'Умения базовых классов по уровням (1–20), автоматически открываются героям по мере роста уровня.',
    icon: Layers,
  },
  {
    key: 'subclassFeatures',
    label: 'Умения подклассов',
    subtitle: 'Уникальные умения подклассов (с 3 уровня и выше), привязанные к выбранному подклассу.',
    icon: Star,
  },
  {
    key: 'backgrounds',
    label: 'Предыстории',
    subtitle: 'Три характеристики (+3 очка, макс. +2 на одну), черта происхождения и фиксированные навыки (PHB 2024).',
    icon: ScrollText,
  },
  {
    key: 'feats',
    label: 'Черты',
    subtitle: 'Черты предысторий (происхождения) и особые таланты героев: название и что даёт черта.',
    icon: Sparkles,
  },
  {
    key: 'species',
    label: 'Виды',
    subtitle: 'Народы и виды мира. Новые виды можно добавлять в любой момент.',
    icon: Dna,
  },
  {
    key: 'levels',
    label: 'Уровни и опыт',
    subtitle: 'Таблица порогов опыта. Уровень персонажа всегда вычисляется автоматически по текущему XP.',
    icon: Award,
  },
  {
    key: 'skills',
    label: 'Навыки',
    subtitle: 'Каждый навык связан с характеристикой и содержит пример использования для игрока.',
    icon: BookOpen,
  },
  {
    key: 'proficiencies',
    label: 'Владения',
    subtitle: 'Изученные владения оружием, доспехами и щитом — используются для проверки экипировки.',
    icon: Shield,
  },
  {
    key: 'visions',
    label: 'Зрение',
    subtitle: 'Типы зрения и особых чувств (1 клетка = 5 фт.) для расчёта видимости на тактической карте ДМ.',
    icon: Eye,
  },
  {
    key: 'weapons',
    label: 'Оружие',
    subtitle: 'Простое и воинское, рукопашное и дальнобойное оружие: урон, свойства, мастерство, вес и цена.',
    icon: Sword,
  },
  {
    key: 'armors',
    label: 'Доспехи и щиты',
    subtitle: 'Лёгкие, средние, тяжёлые доспехи и щиты с конструктором формулы Класса Защиты (КЗ).',
    icon: ShieldCheck,
  },
  {
    key: 'monsters',
    label: 'Монстры',
    subtitle: 'Бестиарий существ: КЗ, хиты, инициатива, скорость, характеристики, навыки, опыт и действия.',
    icon: Skull,
  },
];

function getProficiencyCategoryLabel(category: ProficiencyCategory): string {
  if (category === 'weapon') return 'Оружие';
  if (category === 'armor') return 'Доспехи и щит';
  return 'Прочее';
}

export function CatalogsView({ onNavigate }: CatalogsViewProps) {
  const { status, dmState, send } = useGameSocket({ role: 'dm' });
  const [activeSection, setActiveSection] = useState<CatalogKey>('abilities');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Unified form draft states
  const [nameDraft, setNameDraft] = useState('');
  const [shortNameDraft, setShortNameDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const [abilityIdDraft, setAbilityIdDraft] = useState('str');
  const [profCategoryDraft, setProfCategoryDraft] = useState<ProficiencyCategory>('weapon');
  const [levelNumDraft, setLevelNumDraft] = useState(1);
  const [minXpDraft, setMinXpDraft] = useState(0);

  // Ability modifiers form drafts
  const [modMinScoreDraft, setModMinScoreDraft] = useState(10);
  const [modMaxScoreDraft, setModMaxScoreDraft] = useState(11);
  const [modValueDraft, setModValueDraft] = useState(0);

  // Vision form draft
  const [visionBehaviorDraft, setVisionBehaviorDraft] = useState<VisionBehavior>('normal');

  // Class form drafts
  const [classHitDieDraft, setClassHitDieDraft] = useState<number>(8);
  const [classHpHintDraft, setClassHpHintDraft] = useState<string>('');
  const [classProfByLevelDraft, setClassProfByLevelDraft] = useState<number[]>([
    ...DEFAULT_PROFICIENCY_BONUS_BY_LEVEL,
  ]);
  const [classResourcesDraft, setClassResourcesDraft] = useState<ClassResourceScaling[]>([]);
  const [showClassProgressionEditor, setShowClassProgressionEditor] = useState(false);
  const [classSavingThrowsDraft, setClassSavingThrowsDraft] = useState<string[]>([]);
  const [classSkillCountDraft, setClassSkillCountDraft] = useState<number>(2);
  const [classAnySkillDraft, setClassAnySkillDraft] = useState<boolean>(false);
  const [classAllowedSkillsDraft, setClassAllowedSkillsDraft] = useState<string[]>([]);
  const [classWeaponProfsDraft, setClassWeaponProfsDraft] = useState<string[]>([
    'weapon_simple',
    'weapon_melee',
    'weapon_ranged',
  ]);
  const [classWeaponNoteDraft, setClassWeaponNoteDraft] = useState<string>('');
  const [classArmorProfsDraft, setClassArmorProfsDraft] = useState<string[]>([]);

  // Subclass / Class Feature / Subclass Feature drafts & filters
  const [subclassClassIdDraft, setSubclassClassIdDraft] = useState<string>('fighter');
  const [subclassFilterClassId, setSubclassFilterClassId] = useState<string>('all');
  const [featureClassIdDraft, setFeatureClassIdDraft] = useState<string>('fighter');
  const [featureLevelDraft, setFeatureLevelDraft] = useState<number>(1);
  const [classFeatureFilterClassId, setClassFeatureFilterClassId] = useState<string>('fighter');
  const [subFeatureClassIdDraft, setSubFeatureClassIdDraft] = useState<string>('fighter');
  const [subFeatureSubclassIdDraft, setSubFeatureSubclassIdDraft] = useState<string>('');
  const [subFeatureLevelDraft, setSubFeatureLevelDraft] = useState<number>(3);
  const [subFeatureFilterClassId, setSubFeatureFilterClassId] = useState<string>('fighter');
  const [subFeatureFilterSubclassId, setSubFeatureFilterSubclassId] = useState<string>('all');

  // Background form drafts
  const [bgAbilityIdsDraft, setBgAbilityIdsDraft] = useState<string[]>([]);
  const [bgFeatIdDraft, setBgFeatIdDraft] = useState<string>('');
  const [bgSkillIdsDraft, setBgSkillIdsDraft] = useState<string[]>([]);

  // Weapon form drafts & filters
  const [weaponCategoryDraft, setWeaponCategoryDraft] = useState<WeaponCategory>('simple');
  const [weaponRangeDraft, setWeaponRangeDraft] = useState<WeaponRangeType>('melee');
  const [weaponReachDraft, setWeaponReachDraft] = useState<number>(5);
  const [weaponRangeNormalDraft, setWeaponRangeNormalDraft] = useState<number>(80);
  const [weaponRangeMaxDraft, setWeaponRangeMaxDraft] = useState<number>(320);
  const [weaponDamageDraft, setWeaponDamageDraft] = useState('');
  const [weaponPropsDraft, setWeaponPropsDraft] = useState('');
  const [weaponMasteryDraft, setWeaponMasteryDraft] = useState('');
  const [weaponWeightDraft, setWeaponWeightDraft] = useState('');
  const [weaponPriceDraft, setWeaponPriceDraft] = useState('');
  const [weaponFilter, setWeaponFilter] = useState<'all' | WeaponCategory>('all');
  const [weaponRangeFilter, setWeaponRangeFilter] = useState<'all' | WeaponRangeType>('all');

  // Armor form drafts (structured AC constructor) & filter
  const [armorCategoryDraft, setArmorCategoryDraft] = useState<ArmorCategory>('light');
  const [armorAcBaseDraft, setArmorAcBaseDraft] = useState<number>(11);
  const [armorAcAbilityDraft, setArmorAcAbilityDraft] = useState<string>('dex');
  const [armorAcMaxBonusDraft, setArmorAcMaxBonusDraft] = useState<string>('');
  const [armorStrDraft, setArmorStrDraft] = useState('');
  const [armorStealthDraft, setArmorStealthDraft] = useState('');
  const [armorWeightDraft, setArmorWeightDraft] = useState('');
  const [armorPriceDraft, setArmorPriceDraft] = useState('');
  const [armorFilter, setArmorFilter] = useState<'all' | ArmorCategory>('all');

  // Monster form drafts
  const [monsterAcDraft, setMonsterAcDraft] = useState<number>(10);
  const [monsterMaxHpDraft, setMonsterMaxHpDraft] = useState<number>(1);
  const [monsterHpFormulaDraft, setMonsterHpFormulaDraft] = useState<string>('');
  const [monsterInitDraft, setMonsterInitDraft] = useState<number>(10);
  const [monsterSpeedDraft, setMonsterSpeedDraft] = useState<number>(30);
  const [monsterXpDraft, setMonsterXpDraft] = useState<number>(10);
  const [monsterAbilitiesDraft, setMonsterAbilitiesDraft] = useState<Record<string, number>>({
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
  });
  const [monsterSkillsDraft, setMonsterSkillsDraft] = useState<string[]>([]);
  const [monsterExpertiseDraft, setMonsterExpertiseDraft] = useState<string[]>([]);
  const [monsterImmunitiesDraft, setMonsterImmunitiesDraft] = useState('');
  const [monsterResistancesDraft, setMonsterResistancesDraft] = useState('');
  const [monsterSensesDraft, setMonsterSensesDraft] = useState('');
  const [monsterVisionsDraft, setMonsterVisionsDraft] = useState<EntityVisionEntry[]>([
    { visionId: 'normal', rangeFt: null },
  ]);
  const [monsterTraitsDraft, setMonsterTraitsDraft] = useState<MonsterActionRef[]>([
    { id: 'trt-draft-1', name: '', description: '' },
  ]);
  const [monsterActionsDraft, setMonsterActionsDraft] = useState<MonsterActionRef[]>([
    {
      id: 'act-draft-1',
      name: '',
      description: '',
      attackType: null,
      reachFt: null,
      rangeNormalFt: null,
      rangeMaxFt: null,
    },
  ]);

  // Monster portrait upload & AI generation modal state
  const monsterUploadInputRef = useRef<HTMLInputElement | null>(null);
  const monsterRefInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingMonsterId, setUploadingMonsterId] = useState<string | null>(null);
  const [uploadTargetMonsterId, setUploadTargetMonsterId] = useState<string | null>(null);
  const [monsterUploadError, setMonsterUploadError] = useState<string | null>(null);
  const [genModalMonsterId, setGenModalMonsterId] = useState<string | null>(null);
  const [genReferenceDataUrl, setGenReferenceDataUrl] = useState<string | null>(null);
  const [genExtraPrompt, setGenExtraPrompt] = useState('');
  const [isGeneratingMonster, setIsGeneratingMonster] = useState(false);
  const [genMonsterError, setGenMonsterError] = useState<string | null>(null);
  const [genMonsterSuccess, setGenMonsterSuccess] = useState<string | null>(null);

  const buildDefaultMonsterAbilities = () => {
    const next: Record<string, number> = {};
    for (const ab of dmState?.catalogs.abilities ?? []) {
      next[ab.id] = 10;
    }
    return Object.keys(next).length > 0
      ? next
      : { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  };

  const resetForm = (nextSection?: CatalogKey) => {
    const sec = nextSection ?? activeSection;
    setEditingId(null);
    setNameDraft('');
    setShortNameDraft('');
    setDescDraft('');
    setAbilityIdDraft(dmState?.catalogs.abilities[0]?.id ?? 'str');
    setProfCategoryDraft('weapon');
    setModMinScoreDraft(10);
    setModMaxScoreDraft(11);
    setModValueDraft(0);
    setVisionBehaviorDraft('normal');
    setClassHitDieDraft(8);
    setClassHpHintDraft('');
    setClassProfByLevelDraft([...DEFAULT_PROFICIENCY_BONUS_BY_LEVEL]);
    setClassResourcesDraft([]);
    setShowClassProgressionEditor(false);
    setClassSavingThrowsDraft([]);
    setClassSkillCountDraft(2);
    setClassAnySkillDraft(false);
    setClassAllowedSkillsDraft([]);
    setClassWeaponProfsDraft(['weapon_simple', 'weapon_melee', 'weapon_ranged']);
    setClassWeaponNoteDraft('');
    setClassArmorProfsDraft([]);
    setFeatureLevelDraft(1);
    setSubFeatureLevelDraft(3);
    setBgAbilityIdsDraft([]);
    setBgFeatIdDraft('');
    setBgSkillIdsDraft([]);
    setWeaponCategoryDraft('simple');
    setWeaponRangeDraft('melee');
    setWeaponReachDraft(5);
    setWeaponRangeNormalDraft(80);
    setWeaponRangeMaxDraft(320);
    setWeaponDamageDraft('');
    setWeaponPropsDraft('');
    setWeaponMasteryDraft('');
    setWeaponWeightDraft('');
    setWeaponPriceDraft('');
    setArmorCategoryDraft('light');
    setArmorAcBaseDraft(11);
    setArmorAcAbilityDraft('dex');
    setArmorAcMaxBonusDraft('');
    setArmorStrDraft('');
    setArmorStealthDraft('');
    setArmorWeightDraft('');
    setArmorPriceDraft('');
    setMonsterAcDraft(10);
    setMonsterMaxHpDraft(1);
    setMonsterHpFormulaDraft('');
    setMonsterInitDraft(10);
    setMonsterSpeedDraft(30);
    setMonsterXpDraft(10);
    setMonsterAbilitiesDraft(buildDefaultMonsterAbilities());
    setMonsterSkillsDraft([]);
    setMonsterExpertiseDraft([]);
    setMonsterImmunitiesDraft('');
    setMonsterResistancesDraft('');
    setMonsterSensesDraft('');
    setMonsterVisionsDraft([{ visionId: 'normal', rangeFt: null }]);
    setMonsterTraitsDraft([{ id: `trt-${Date.now().toString(36)}`, name: '', description: '' }]);
    setMonsterActionsDraft([
      {
        id: `act-${Date.now().toString(36)}`,
        name: '',
        description: '',
        attackType: null,
        reachFt: null,
        rangeNormalFt: null,
        rangeMaxFt: null,
      },
    ]);
    if (sec === 'levels' && dmState) {
      const sorted = sortLevels(dmState.catalogs.levels);
      const last = sorted[sorted.length - 1];
      setLevelNumDraft((last?.level ?? 0) + 1);
      setMinXpDraft((last?.minXp ?? 0) + 1000);
    }
  };

  const handleSelectSection = (key: CatalogKey) => {
    setActiveSection(key);
    setSearchQuery('');
    setWeaponFilter('all');
    setWeaponRangeFilter('all');
    setArmorFilter('all');
    resetForm(key);
  };

  const handleArmorCategoryChange = (cat: ArmorCategory) => {
    setArmorCategoryDraft(cat);
    if (!editingId) {
      if (cat === 'light') {
        setArmorAcBaseDraft(11);
        setArmorAcAbilityDraft('dex');
        setArmorAcMaxBonusDraft('');
      } else if (cat === 'medium') {
        setArmorAcBaseDraft(12);
        setArmorAcAbilityDraft('dex');
        setArmorAcMaxBonusDraft('2');
      } else if (cat === 'heavy') {
        setArmorAcBaseDraft(16);
        setArmorAcAbilityDraft('');
        setArmorAcMaxBonusDraft('');
      } else if (cat === 'shield') {
        setArmorAcBaseDraft(2);
        setArmorAcAbilityDraft('');
        setArmorAcMaxBonusDraft('');
      }
    }
  };

  const currentMeta = SECTIONS.find((s) => s.key === activeSection) ?? SECTIONS[0];

  const abilitiesMap = useMemo(() => {
    const map = new Map<string, AbilityRef>();
    for (const a of dmState?.catalogs.abilities ?? []) {
      map.set(a.id, a);
    }
    return map;
  }, [dmState?.catalogs.abilities]);

  if (!dmState) {
    return (
      <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="text-base font-medium text-slate-200">Загрузка справочников...</p>
          <p className="text-sm text-slate-400">Подключение к игровому серверу</p>
        </div>
      </div>
    );
  }

  const { catalogs } = dmState;
  const q = searchQuery.trim().toLowerCase();

  const startEdit = (item: unknown) => {
    if (activeSection === 'abilities') {
      const ab = item as AbilityRef;
      setEditingId(ab.id);
      setNameDraft(ab.name);
      setShortNameDraft(ab.shortName);
      setDescDraft(ab.description);
    } else if (activeSection === 'abilityModifiers') {
      const mod = item as AbilityModifierRef;
      setEditingId(mod.id);
      setModMinScoreDraft(mod.minScore);
      setModMaxScoreDraft(mod.maxScore);
      setModValueDraft(mod.modifier);
    } else if (activeSection === 'classes') {
      const cls = item as ClassRef;
      setEditingId(cls.id);
      setNameDraft(cls.name);
      setDescDraft(cls.description);
      const hitInfo = getClassHitDieInfo(cls);
      setClassHitDieDraft(hitInfo.hitDie);
      setClassHpHintDraft(cls.hpPerLevelHint ?? hitInfo.hint);
      setClassProfByLevelDraft(
        Array.isArray(cls.proficiencyBonusByLevel) && cls.proficiencyBonusByLevel.length === 20
          ? [...cls.proficiencyBonusByLevel]
          : [...DEFAULT_PROFICIENCY_BONUS_BY_LEVEL]
      );
      setClassResourcesDraft(
        Array.isArray(cls.classResources)
          ? cls.classResources.map((r) => ({ ...r, values: [...r.values] }))
          : []
      );
      setClassSavingThrowsDraft([...(cls.savingThrowAbilityIds ?? [])]);
      setClassSkillCountDraft(cls.skillChoiceCount ?? 2);
      setClassAnySkillDraft(Boolean(cls.anySkillAllowed));
      setClassAllowedSkillsDraft([...(cls.allowedSkillIds ?? [])]);
      setClassWeaponProfsDraft([...(cls.weaponProficiencyIds ?? [])]);
      setClassWeaponNoteDraft(cls.weaponProficiencyNote ?? '');
      setClassArmorProfsDraft([...(cls.armorProficiencyIds ?? [])]);
    } else if (activeSection === 'subclasses') {
      const sc = item as SubclassRef;
      setEditingId(sc.id);
      setSubclassClassIdDraft(sc.classId || catalogs.classes[0]?.id || 'fighter');
      setNameDraft(sc.name);
      setDescDraft(sc.description);
    } else if (activeSection === 'classFeatures') {
      const cf = item as ClassFeatureRef;
      setEditingId(cf.id);
      setFeatureClassIdDraft(cf.classId || catalogs.classes[0]?.id || 'fighter');
      setFeatureLevelDraft(cf.level || 1);
      setNameDraft(cf.name);
      setDescDraft(cf.description);
    } else if (activeSection === 'subclassFeatures') {
      const sf = item as SubclassFeatureRef;
      setEditingId(sf.id);
      setSubFeatureClassIdDraft(sf.classId || catalogs.classes[0]?.id || 'fighter');
      setSubFeatureSubclassIdDraft(sf.subclassId || '');
      setSubFeatureLevelDraft(sf.level || 3);
      setNameDraft(sf.name);
      setDescDraft(sf.description);
    } else if (activeSection === 'backgrounds') {
      const bg = item as BackgroundRef;
      setEditingId(bg.id);
      setNameDraft(bg.name);
      setDescDraft(bg.description);
      setBgAbilityIdsDraft([...(bg.abilityIds ?? [])]);
      setBgFeatIdDraft(bg.featId ?? '');
      setBgSkillIdsDraft([...(bg.skillIds ?? [])]);
    } else if (activeSection === 'feats') {
      const ft = item as FeatRef;
      setEditingId(ft.id);
      setNameDraft(ft.name);
      setDescDraft(ft.description);
    } else if (activeSection === 'species') {
      const entry = item as SpeciesRef;
      setEditingId(entry.id);
      setNameDraft(entry.name);
      setDescDraft(entry.description);
    } else if (activeSection === 'levels') {
      const lvl = item as LevelThresholdRef;
      setEditingId(lvl.id);
      setLevelNumDraft(lvl.level);
      setMinXpDraft(lvl.minXp);
    } else if (activeSection === 'skills') {
      const sk = item as SkillRef;
      setEditingId(sk.id);
      setNameDraft(sk.name);
      setAbilityIdDraft(sk.abilityId || catalogs.abilities[0]?.id || '');
      setDescDraft(sk.usageExample);
    } else if (activeSection === 'proficiencies') {
      const pr = item as ProficiencyRef;
      setEditingId(pr.id);
      setNameDraft(pr.name);
      setProfCategoryDraft(pr.category);
      setDescDraft(pr.description);
    } else if (activeSection === 'visions') {
      const vis = item as VisionRef;
      setEditingId(vis.id);
      setNameDraft(vis.name);
      setVisionBehaviorDraft(vis.behavior || 'normal');
      setDescDraft(vis.description);
    } else if (activeSection === 'weapons') {
      const wp = item as WeaponRef;
      setEditingId(wp.id);
      setNameDraft(wp.name);
      setWeaponCategoryDraft(wp.category);
      setWeaponRangeDraft(wp.rangeType || 'melee');
      setWeaponReachDraft(wp.reachFt ?? 5);
      setWeaponRangeNormalDraft(wp.rangeNormalFt ?? 80);
      setWeaponRangeMaxDraft(wp.rangeMaxFt ?? 320);
      setWeaponDamageDraft(wp.damage);
      setWeaponPropsDraft(wp.properties);
      setWeaponMasteryDraft(wp.mastery);
      setWeaponWeightDraft(wp.weight);
      setWeaponPriceDraft(wp.price);
    } else if (activeSection === 'armors') {
      const ar = item as ArmorRef;
      setEditingId(ar.id);
      setNameDraft(ar.name);
      setArmorCategoryDraft(ar.category);
      setArmorAcBaseDraft(ar.acBase ?? (ar.category === 'shield' ? 2 : 10));
      setArmorAcAbilityDraft(ar.acAbilityId ?? '');
      setArmorAcMaxBonusDraft(
        ar.acAbilityId && typeof ar.acMaxBonus === 'number' ? String(ar.acMaxBonus) : ''
      );
      setArmorStrDraft(ar.strengthReq);
      setArmorStealthDraft(ar.stealth);
      setArmorWeightDraft(ar.weight);
      setArmorPriceDraft(ar.price);
    } else if (activeSection === 'monsters') {
      const mon = item as MonsterRef;
      setEditingId(mon.id);
      setNameDraft(mon.name);
      setMonsterAcDraft(mon.ac);
      setMonsterMaxHpDraft(mon.maxHp);
      setMonsterHpFormulaDraft(mon.hpFormula || '');
      setMonsterInitDraft(mon.initiative);
      setMonsterSpeedDraft(mon.speed);
      setMonsterXpDraft(mon.xpReward);
      const nextAb: Record<string, number> = {};
      for (const ab of catalogs.abilities) {
        nextAb[ab.id] = mon.abilities?.[ab.id] ?? 10;
      }
      setMonsterAbilitiesDraft(nextAb);
      setMonsterSkillsDraft([...(mon.proficientSkillIds || [])]);
      setMonsterExpertiseDraft([...(mon.expertiseSkillIds || [])]);
      setMonsterImmunitiesDraft(mon.immunities || '');
      setMonsterResistancesDraft(mon.resistances || '');
      setMonsterSensesDraft(mon.senses || '');
      setMonsterVisionsDraft(
        Array.isArray(mon.visions) && mon.visions.length > 0
          ? mon.visions.map((v) => ({ ...v }))
          : []
      );
      setMonsterTraitsDraft(
        mon.traits && mon.traits.length > 0
          ? mon.traits.map((t) => ({ ...t }))
          : [{ id: `trt-${Date.now().toString(36)}`, name: '', description: '' }]
      );
      setMonsterActionsDraft(
        mon.actions && mon.actions.length > 0
          ? mon.actions.map((a) => ({
              ...a,
              attackType: a.attackType ?? null,
              reachFt: a.reachFt ?? null,
              rangeNormalFt: a.rangeNormalFt ?? null,
              rangeMaxFt: a.rangeMaxFt ?? null,
            }))
          : [
              {
                id: `act-${Date.now().toString(36)}`,
                name: '',
                description: '',
                attackType: null,
                reachFt: null,
                rangeNormalFt: null,
                rangeMaxFt: null,
              },
            ]
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeSection === 'abilities') {
      if (!nameDraft.trim()) return;
      send({
        type: 'dm:upsertCatalogItem',
        catalog: 'abilities',
        item: {
          id: editingId ?? '',
          name: nameDraft.trim(),
          shortName: (shortNameDraft.trim() || nameDraft.trim().slice(0, 3)).toUpperCase(),
          description: descDraft.trim(),
        },
      });
    } else if (activeSection === 'abilityModifiers') {
      send({
        type: 'dm:upsertCatalogItem',
        catalog: 'abilityModifiers',
        item: {
          id: editingId ?? '',
          minScore: Math.max(1, Math.min(30, Math.round(modMinScoreDraft))),
          maxScore: Math.max(1, Math.min(30, Math.round(modMaxScoreDraft))),
          modifier: Math.round(modValueDraft),
        },
      });
    } else if (activeSection === 'classes') {
      if (!nameDraft.trim()) return;
      const safeHitDie = Math.max(4, Math.min(20, Math.round(classHitDieDraft || 8)));
      const avg = Math.floor(safeHitDie / 2) + 1;
      const safeHpHint =
        classHpHintDraft.trim() ||
        `1к${safeHitDie} (или ${avg}) + ваш модификатор Телосложения (суммарно минимум 1)`;
      const cleanResources = classResourcesDraft
        .filter((r) => r.name.trim().length > 0)
        .map((r) => ({
          id: r.id || `res-${Date.now().toString(36)}`,
          name: r.name.trim(),
          values: Array.from({ length: 20 }, (_, i) => String(r.values[i] ?? '—').trim() || '—'),
        }));
      send({
        type: 'dm:upsertCatalogItem',
        catalog: 'classes',
        item: {
          id: editingId ?? '',
          name: nameDraft.trim(),
          description: descDraft.trim(),
          hitDie: safeHitDie,
          hpPerLevelHint: safeHpHint,
          proficiencyBonusByLevel: Array.from({ length: 20 }, (_, i) =>
            Math.max(1, Math.min(12, Math.round(classProfByLevelDraft[i] ?? DEFAULT_PROFICIENCY_BONUS_BY_LEVEL[i])))
          ),
          classResources: cleanResources,
          savingThrowAbilityIds: classSavingThrowsDraft,
          skillChoiceCount: Math.max(0, Math.min(18, Math.round(classSkillCountDraft || 0))),
          anySkillAllowed: classAnySkillDraft,
          allowedSkillIds: classAnySkillDraft ? [] : classAllowedSkillsDraft,
          weaponProficiencyIds: classWeaponProfsDraft,
          weaponProficiencyNote: classWeaponNoteDraft.trim() || undefined,
          armorProficiencyIds: classArmorProfsDraft,
        },
      });
    } else if (activeSection === 'subclasses') {
      if (!nameDraft.trim()) return;
      const clsId = subclassClassIdDraft || catalogs.classes[0]?.id || 'fighter';
      send({
        type: 'dm:upsertCatalogItem',
        catalog: 'subclasses',
        item: {
          id: editingId ?? '',
          classId: clsId,
          name: nameDraft.trim(),
          description: descDraft.trim(),
        },
      });
    } else if (activeSection === 'classFeatures') {
      if (!nameDraft.trim()) return;
      const clsId = featureClassIdDraft || catalogs.classes[0]?.id || 'fighter';
      send({
        type: 'dm:upsertCatalogItem',
        catalog: 'classFeatures',
        item: {
          id: editingId ?? '',
          classId: clsId,
          level: Math.max(1, Math.min(20, Math.round(featureLevelDraft || 1))),
          name: nameDraft.trim(),
          description: descDraft.trim(),
        },
      });
    } else if (activeSection === 'subclassFeatures') {
      if (!nameDraft.trim()) return;
      const clsId = subFeatureClassIdDraft || catalogs.classes[0]?.id || 'fighter';
      const fallbackSub = catalogs.subclasses.find((s) => s.classId === clsId)?.id ?? '';
      const scId = subFeatureSubclassIdDraft || fallbackSub;
      if (!scId) return;
      send({
        type: 'dm:upsertCatalogItem',
        catalog: 'subclassFeatures',
        item: {
          id: editingId ?? '',
          classId: clsId,
          subclassId: scId,
          level: Math.max(1, Math.min(20, Math.round(subFeatureLevelDraft || 3))),
          name: nameDraft.trim(),
          description: descDraft.trim(),
        },
      });
    } else if (activeSection === 'backgrounds') {
      if (!nameDraft.trim()) return;
      send({
        type: 'dm:upsertCatalogItem',
        catalog: 'backgrounds',
        item: {
          id: editingId ?? '',
          name: nameDraft.trim(),
          description: descDraft.trim(),
          abilityIds: bgAbilityIdsDraft.slice(0, 3),
          featId: bgFeatIdDraft || null,
          skillIds: bgSkillIdsDraft,
        },
      });
    } else if (activeSection === 'feats') {
      if (!nameDraft.trim()) return;
      send({
        type: 'dm:upsertCatalogItem',
        catalog: 'feats',
        item: {
          id: editingId ?? '',
          name: nameDraft.trim(),
          description: descDraft.trim(),
        },
      });
    } else if (activeSection === 'species') {
      if (!nameDraft.trim()) return;
      send({
        type: 'dm:upsertCatalogItem',
        catalog: 'species',
        item: {
          id: editingId ?? '',
          name: nameDraft.trim(),
          description: descDraft.trim(),
        },
      });
    } else if (activeSection === 'levels') {
      send({
        type: 'dm:upsertCatalogItem',
        catalog: 'levels',
        item: {
          id: editingId ?? '',
          level: Math.max(1, Math.round(levelNumDraft)),
          minXp: Math.max(0, Math.floor(minXpDraft)),
        },
      });
    } else if (activeSection === 'skills') {
      if (!nameDraft.trim()) return;
      send({
        type: 'dm:upsertCatalogItem',
        catalog: 'skills',
        item: {
          id: editingId ?? '',
          name: nameDraft.trim(),
          abilityId: abilityIdDraft || catalogs.abilities[0]?.id || '',
          usageExample: descDraft.trim(),
        },
      });
    } else if (activeSection === 'proficiencies') {
      if (!nameDraft.trim()) return;
      send({
        type: 'dm:upsertCatalogItem',
        catalog: 'proficiencies',
        item: {
          id: editingId ?? '',
          name: nameDraft.trim(),
          category: profCategoryDraft,
          description: descDraft.trim(),
        },
      });
    } else if (activeSection === 'visions') {
      if (!nameDraft.trim()) return;
      send({
        type: 'dm:upsertCatalogItem',
        catalog: 'visions',
        item: {
          id: editingId ?? '',
          name: nameDraft.trim(),
          behavior: visionBehaviorDraft,
          description: descDraft.trim(),
        },
      });
    } else if (activeSection === 'weapons') {
      if (!nameDraft.trim()) return;
      const safeReach = Math.max(0, Math.round(Number.isFinite(weaponReachDraft) ? weaponReachDraft : 5));
      const safeNormal = Math.max(
        0,
        Math.round(Number.isFinite(weaponRangeNormalDraft) ? weaponRangeNormalDraft : 80)
      );
      const safeMax = Math.max(
        safeNormal,
        Math.round(Number.isFinite(weaponRangeMaxDraft) ? weaponRangeMaxDraft : safeNormal * 4)
      );
      send({
        type: 'dm:upsertCatalogItem',
        catalog: 'weapons',
        item: {
          id: editingId ?? '',
          category: weaponCategoryDraft,
          rangeType: weaponRangeDraft,
          name: nameDraft.trim(),
          damage: weaponDamageDraft.trim() || '—',
          reachFt: weaponRangeDraft === 'melee' ? safeReach : undefined,
          rangeNormalFt: weaponRangeDraft === 'ranged' ? safeNormal : undefined,
          rangeMaxFt: weaponRangeDraft === 'ranged' ? safeMax : undefined,
          properties: weaponPropsDraft.trim() || '—',
          mastery: weaponMasteryDraft.trim() || '—',
          weight: weaponWeightDraft.trim() || '—',
          price: weaponPriceDraft.trim() || '—',
        },
      });
    } else if (activeSection === 'armors') {
      if (!nameDraft.trim()) return;
      const acAbilityId = armorAcAbilityDraft || null;
      const parsedMax =
        acAbilityId && armorAcMaxBonusDraft.trim() !== ''
          ? Math.max(0, Math.round(Number(armorAcMaxBonusDraft) || 0))
          : null;
      const acBase = Math.max(0, Math.round(Number(armorAcBaseDraft) || 0));
      const formattedAc = formatArmorClassFormula(
        {
          category: armorCategoryDraft,
          acBase,
          acAbilityId,
          acMaxBonus: parsedMax,
        },
        catalogs.abilities
      );
      send({
        type: 'dm:upsertCatalogItem',
        catalog: 'armors',
        item: {
          id: editingId ?? '',
          category: armorCategoryDraft,
          name: nameDraft.trim(),
          acBase,
          acAbilityId,
          acMaxBonus: parsedMax,
          armorClass: formattedAc,
          strengthReq: armorStrDraft.trim() || '—',
          stealth: armorStealthDraft.trim() || '—',
          weight: armorWeightDraft.trim() || '—',
          price: armorPriceDraft.trim() || '—',
        },
      });
    } else if (activeSection === 'monsters') {
      if (!nameDraft.trim()) return;
      const cleanTraits = monsterTraitsDraft
        .filter((t) => t.name.trim().length > 0)
        .map((t) => ({
          id: t.id || `trt-${Date.now().toString(36)}`,
          name: t.name.trim(),
          description: t.description.trim(),
        }));
      const cleanActions = monsterActionsDraft
        .filter((a) => a.name.trim().length > 0)
        .map((a) => ({
          id: a.id || `act-${Date.now().toString(36)}`,
          name: a.name.trim(),
          description: a.description.trim(),
          attackType: a.attackType ?? null,
          reachFt:
            a.attackType === 'melee' && typeof a.reachFt === 'number' && Number.isFinite(a.reachFt)
              ? Math.max(0, Math.round(a.reachFt))
              : null,
          rangeNormalFt:
            a.attackType === 'ranged' &&
            typeof a.rangeNormalFt === 'number' &&
            Number.isFinite(a.rangeNormalFt)
              ? Math.max(0, Math.round(a.rangeNormalFt))
              : null,
          rangeMaxFt:
            a.attackType === 'ranged' &&
            typeof a.rangeMaxFt === 'number' &&
            Number.isFinite(a.rangeMaxFt)
              ? Math.max(0, Math.round(a.rangeMaxFt))
              : null,
        }));
      send({
        type: 'dm:upsertCatalogItem',
        catalog: 'monsters',
        item: {
          id: editingId ?? '',
          name: nameDraft.trim(),
          ac: Math.max(1, Math.round(monsterAcDraft || 10)),
          maxHp: Math.max(1, Math.round(monsterMaxHpDraft || 1)),
          hpFormula: monsterHpFormulaDraft.trim() || undefined,
          initiative: Math.round(monsterInitDraft || 10),
          speed: Math.max(0, Math.round(monsterSpeedDraft || 0)),
          abilities: monsterAbilitiesDraft,
          proficientSkillIds: Array.from(
            new Set([...monsterSkillsDraft, ...monsterExpertiseDraft])
          ),
          expertiseSkillIds: monsterExpertiseDraft,
          immunities: monsterImmunitiesDraft.trim() || undefined,
          resistances: monsterResistancesDraft.trim() || undefined,
          senses: monsterSensesDraft.trim() || undefined,
          visions: monsterVisionsDraft,
          traits: cleanTraits,
          xpReward: Math.max(0, Math.floor(monsterXpDraft || 0)),
          actions: cleanActions,
        },
      });
    }
    resetForm();
  };

  const handleDelete = (itemId: string) => {
    send({
      type: 'dm:deleteCatalogItem',
      catalog: activeSection,
      itemId,
    });
    if (editingId === itemId) {
      resetForm();
    }
  };

  const getCount = (key: CatalogKey) => catalogs[key].length;

  const armorPreviewFormula = formatArmorClassFormula(
    {
      category: armorCategoryDraft,
      acBase: Number.isFinite(armorAcBaseDraft) ? armorAcBaseDraft : 10,
      acAbilityId: armorAcAbilityDraft || null,
      acMaxBonus:
        armorAcAbilityDraft && armorAcMaxBonusDraft.trim() !== ''
          ? Number(armorAcMaxBonusDraft)
          : null,
    },
    catalogs.abilities
  );

  const monsterDexMod = getAbilityModifier(
    monsterAbilitiesDraft.dex ?? 10,
    catalogs.abilityModifiers
  );

  const activeGenMonster = genModalMonsterId
    ? catalogs.monsters.find((m) => m.id === genModalMonsterId) ?? null
    : null;

  const handleTriggerMonsterUpload = (monsterId: string) => {
    setUploadTargetMonsterId(monsterId);
    setMonsterUploadError(null);
    monsterUploadInputRef.current?.click();
  };

  const handleMonsterPhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !uploadTargetMonsterId) return;

    const targetId = uploadTargetMonsterId;
    setUploadingMonsterId(targetId);
    setMonsterUploadError(null);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 1024, 0.88);
      const res = await fetch('/api/portraits/monster/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monsterId: targetId, dataUrl }),
      });
      const data = (await res.json()) as { portraitUrl?: string; error?: string };
      if (!res.ok || !data.portraitUrl) {
        throw new Error(data.error || 'Не удалось загрузить фото монстра');
      }
    } catch (err) {
      setMonsterUploadError(err instanceof Error ? err.message : 'Ошибка загрузки изображения');
    } finally {
      setUploadingMonsterId(null);
      setUploadTargetMonsterId(null);
    }
  };

  const handleOpenMonsterGenModal = (monsterId: string) => {
    setGenModalMonsterId(monsterId);
    setGenReferenceDataUrl(null);
    setGenExtraPrompt('');
    setGenMonsterError(null);
    setGenMonsterSuccess(null);
  };

  const handleMonsterRefFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setGenMonsterError(null);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 1024, 0.86);
      setGenReferenceDataUrl(dataUrl);
    } catch (err) {
      setGenMonsterError(err instanceof Error ? err.message : 'Не удалось прочитать референс');
    }
  };

  const handleGenerateMonsterPortrait = async () => {
    if (!activeGenMonster) return;
    setIsGeneratingMonster(true);
    setGenMonsterError(null);
    setGenMonsterSuccess(null);
    try {
      const res = await fetch('/api/portraits/monster/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monsterId: activeGenMonster.id,
          referenceDataUrl: genReferenceDataUrl,
          extraPrompt: genExtraPrompt.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { portraitUrl?: string; error?: string };
      if (!res.ok || !data.portraitUrl) {
        throw new Error(data.error || 'Не удалось сгенерировать фото монстра');
      }
      setGenMonsterSuccess('Портрет монстра сохранён и синхронизирован с ТВ!');
    } catch (err) {
      setGenMonsterError(err instanceof Error ? err.message : 'Ошибка генерации изображения');
    } finally {
      setIsGeneratingMonster(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col">
      {/* Unified DM / Catalogs Top Bar */}
      <header className="h-14 shrink-0 px-4 sm:px-5 border-b border-slate-800 bg-[#0B0F17] flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="text-sm font-semibold text-slate-100 hover:text-amber-400 transition-colors whitespace-nowrap shrink-0"
          >
            Tabletop Sync
          </button>

          {/* Primary DM Workspace Switcher */}
          <nav
            aria-label="Разделы мастера"
            className="flex items-center gap-1 p-1 rounded-lg bg-[#131A26] border border-slate-800"
          >
            <button
              type="button"
              onClick={() => onNavigate('/dm')}
              className="px-3 py-1 rounded-md text-xs font-medium text-slate-400 hover:text-slate-100 flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Пульт мастера</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/locations')}
              className="px-3 py-1 rounded-md text-xs font-medium text-slate-400 hover:text-slate-100 flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Карта мира</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/catalogs')}
              className="px-3 py-1 rounded-md text-xs font-medium bg-slate-800 text-amber-400 flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Справочники</span>
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 whitespace-nowrap">
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              aria-hidden="true"
            />
            <span>{status === 'connected' ? 'Автосохранение активно' : 'Переподключение...'}</span>
          </div>

          <a
            href="/tv"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex px-3 py-1.5 rounded-lg bg-[#131A26] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap"
          >
            Открыть ТВ
          </a>
        </div>
      </header>

      {/* Main Layout: Catalogs Sidebar + Editor/List Workspace */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Left Catalog Directory Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800 bg-[#131A26]/60 p-3 flex flex-col justify-between gap-4">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-1 lg:pb-0">
            {SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.key;
              return (
                <button
                  key={sec.key}
                  type="button"
                  onClick={() => handleSelectSection(sec.key)}
                  className={`px-3 py-2.5 rounded-lg text-left text-xs font-medium flex items-center justify-between gap-3 transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-slate-800 text-amber-400 border border-slate-700'
                      : 'text-slate-300 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{sec.label}</span>
                  </span>
                  <span className="font-mono tabular-nums text-[11px] text-slate-400">
                    {getCount(sec.key)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Reset Defaults Utility */}
          <div className="hidden lg:block pt-3 border-t border-slate-800">
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="w-full py-2 px-3 rounded-lg bg-[#0B0F17] hover:bg-slate-800 border border-slate-800 text-xs text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Сбросить справочники</span>
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-red-950/30 border border-red-900/60 space-y-2">
                <p className="text-[11px] text-red-200 leading-snug">
                  Восстановить исходные записи во всех справочниках ({SECTIONS.length})?
                </p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      send({ type: 'dm:resetCatalogs' });
                      setConfirmReset(false);
                      resetForm();
                    }}
                    className="flex-1 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                  >
                    Сбросить
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="flex-1 py-1.5 rounded-md bg-slate-800 text-slate-200 text-xs"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right Active Catalog Content */}
        <main className="flex-1 min-w-0 p-5 sm:p-7 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Section Title & Search */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-xl font-semibold tracking-tight text-slate-100">
                  {currentMeta.label}
                </h1>
                <p className="text-sm text-slate-400">{currentMeta.subtitle}</p>
              </div>

              {activeSection !== 'levels' && activeSection !== 'abilityModifiers' && (
                <div className="relative w-full sm:w-64 shrink-0">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по справочнику..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/70"
                  />
                </div>
              )}
            </div>

            {/* Create / Edit Entry Form */}
            <form
              onSubmit={handleSubmit}
              className="p-4 sm:p-5 rounded-xl bg-[#131A26] border border-slate-800 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-semibold text-slate-200">
                  {editingId ? 'Редактирование записи' : 'Добавить новую запись'}
                </h2>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => resetForm()}
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Отменить правку</span>
                  </button>
                )}
              </div>

              {activeSection === 'abilities' && (
                <div className="grid sm:grid-cols-12 gap-3">
                  <input
                    type="text"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder="Название (напр. Сила)"
                    className="sm:col-span-4 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                    required
                  />
                  <input
                    type="text"
                    value={shortNameDraft}
                    onChange={(e) => setShortNameDraft(e.target.value)}
                    placeholder="Код (СИЛ)"
                    maxLength={5}
                    className="sm:col-span-2 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs font-mono uppercase text-slate-100"
                  />
                  <input
                    type="text"
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    placeholder="Описание свойств и проверок"
                    className="sm:col-span-4 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                  />
                  <button
                    type="submit"
                    className="sm:col-span-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>{editingId ? 'Сохранить' : 'Добавить'}</span>
                  </button>
                </div>
              )}

              {activeSection === 'abilityModifiers' && (
                <div className="grid sm:grid-cols-12 gap-3 items-end">
                  <label className="sm:col-span-3 space-y-1">
                    <span className="text-[11px] text-slate-400">Значение от</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={modMinScoreDraft}
                      onChange={(e) => setModMinScoreDraft(Number(e.target.value) || 1)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs font-mono tabular-nums text-slate-100"
                      required
                    />
                  </label>
                  <label className="sm:col-span-3 space-y-1">
                    <span className="text-[11px] text-slate-400">Значение до</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={modMaxScoreDraft}
                      onChange={(e) => setModMaxScoreDraft(Number(e.target.value) || 1)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs font-mono tabular-nums text-slate-100"
                      required
                    />
                  </label>
                  <label className="sm:col-span-3 space-y-1">
                    <span className="text-[11px] text-slate-400">Модификатор</span>
                    <input
                      type="number"
                      min={-10}
                      max={15}
                      value={modValueDraft}
                      onChange={(e) => setModValueDraft(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs font-mono tabular-nums text-amber-400 font-semibold"
                      required
                    />
                  </label>
                  <button
                    type="submit"
                    className="sm:col-span-3 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>{editingId ? 'Сохранить' : 'Добавить диапазон'}</span>
                  </button>
                </div>
              )}

              {activeSection === 'classes' && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-12 gap-3">
                    <input
                      type="text"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      placeholder="Название класса (напр. Друид)"
                      className="sm:col-span-4 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                      required
                    />
                    <input
                      type="text"
                      value={descDraft}
                      onChange={(e) => setDescDraft(e.target.value)}
                      placeholder="Краткое описание класса"
                      className="sm:col-span-6 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                    />
                    <button
                      type="submit"
                      className="sm:col-span-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      <span>{editingId ? 'Сохранить' : 'Добавить'}</span>
                    </button>
                  </div>

                  {/* Saving Throws (DM Only) */}
                  <div className="p-3 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-200">
                        Владение спасбросками (только для ДМ)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Выбрано: {classSavingThrowsDraft.length}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {catalogs.abilities.map((ab) => {
                        const checked = classSavingThrowsDraft.includes(ab.id);
                        return (
                          <button
                            key={ab.id}
                            type="button"
                            onClick={() =>
                              setClassSavingThrowsDraft((prev) =>
                                prev.includes(ab.id)
                                  ? prev.filter((id) => id !== ab.id)
                                  : [...prev, ab.id]
                              )
                            }
                            className={`px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                              checked
                                ? 'bg-sky-500/20 border-sky-400/70 text-sky-200 font-medium'
                                : 'bg-[#131A26] border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {ab.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Class Skills */}
                  <div className="p-3 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-slate-200">
                        Владение навыками класса
                      </span>
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <label className="flex items-center gap-1.5 text-slate-300">
                          <span>Сколько выбрать при создании:</span>
                          <input
                            type="number"
                            min={0}
                            max={18}
                            value={classSkillCountDraft}
                            onChange={(e) =>
                              setClassSkillCountDraft(
                                Math.max(0, Math.min(18, Number(e.target.value) || 0))
                              )
                            }
                            className="w-16 px-2 py-1 rounded bg-[#131A26] border border-slate-700 font-mono text-center text-slate-100"
                          />
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-amber-300">
                          <input
                            type="checkbox"
                            checked={classAnySkillDraft}
                            onChange={(e) => setClassAnySkillDraft(e.target.checked)}
                            className="rounded border-slate-600 bg-[#131A26]"
                          />
                          <span>Любые навыки (как у Барда)</span>
                        </label>
                      </div>
                    </div>

                    {!classAnySkillDraft && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                        {catalogs.skills.map((sk) => {
                          const checked = classAllowedSkillsDraft.includes(sk.id);
                          return (
                            <button
                              key={sk.id}
                              type="button"
                              onClick={() =>
                                setClassAllowedSkillsDraft((prev) =>
                                  prev.includes(sk.id)
                                    ? prev.filter((id) => id !== sk.id)
                                    : [...prev, sk.id]
                                )
                              }
                              className={`px-2.5 py-1.5 rounded-lg border text-left text-xs truncate transition-colors ${
                                checked
                                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-200 font-medium'
                                  : 'bg-[#131A26] border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {sk.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Weapon & Armor Proficiencies */}
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2">
                      <span className="text-xs font-semibold text-slate-200 block">
                        Владение оружием по умолчанию
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {catalogs.proficiencies
                          .filter((p) => p.category === 'weapon')
                          .map((pr) => {
                            const checked = classWeaponProfsDraft.includes(pr.id);
                            return (
                              <button
                                key={pr.id}
                                type="button"
                                onClick={() =>
                                  setClassWeaponProfsDraft((prev) =>
                                    prev.includes(pr.id)
                                      ? prev.filter((id) => id !== pr.id)
                                      : [...prev, pr.id]
                                  )
                                }
                                className={`px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                                  checked
                                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-200 font-medium'
                                    : 'bg-[#131A26] border-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {pr.name}
                              </button>
                            );
                          })}
                      </div>
                      <input
                        type="text"
                        value={classWeaponNoteDraft}
                        onChange={(e) => setClassWeaponNoteDraft(e.target.value)}
                        placeholder="Особое примечание (напр. Воинское со свойством Лёгкое)"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-[11px] text-slate-200"
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2">
                      <span className="text-xs font-semibold text-slate-200 block">
                        Тренированность с доспехами по умолчанию
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {catalogs.proficiencies
                          .filter((p) => p.category === 'armor')
                          .map((pr) => {
                            const checked = classArmorProfsDraft.includes(pr.id);
                            return (
                              <button
                                key={pr.id}
                                type="button"
                                onClick={() =>
                                  setClassArmorProfsDraft((prev) =>
                                    prev.includes(pr.id)
                                      ? prev.filter((id) => id !== pr.id)
                                      : [...prev, pr.id]
                                  )
                                }
                                className={`px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                                  checked
                                    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200 font-medium'
                                    : 'bg-[#131A26] border-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {pr.name}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  </div>

                  {/* Hit Die & HP per level hint */}
                  <div className="grid sm:grid-cols-12 gap-3 p-3 rounded-xl bg-[#0B0F17] border border-slate-800">
                    <label className="sm:col-span-3 space-y-1">
                      <span className="text-[11px] font-semibold text-slate-300">Кость хитов</span>
                      <select
                        value={classHitDieDraft}
                        onChange={(e) => {
                          const die = Number(e.target.value) || 8;
                          setClassHitDieDraft(die);
                          const avg = Math.floor(die / 2) + 1;
                          setClassHpHintDraft(
                            `1к${die} (или ${avg}) + ваш модификатор Телосложения (суммарно минимум 1)`
                          );
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#131A26] border border-slate-700 text-xs font-mono text-amber-300"
                      >
                        <option value={6}>1к6 (ср. 4)</option>
                        <option value={8}>1к8 (ср. 5)</option>
                        <option value={10}>1к10 (ср. 6)</option>
                        <option value={12}>1к12 (ср. 7)</option>
                      </select>
                    </label>
                    <label className="sm:col-span-9 space-y-1">
                      <span className="text-[11px] font-semibold text-slate-300">
                        Подсказка «Хиты за уровень» (для ДМ при создании и повышении уровня)
                      </span>
                      <input
                        type="text"
                        value={classHpHintDraft}
                        onChange={(e) => setClassHpHintDraft(e.target.value)}
                        placeholder={`1к${classHitDieDraft} (или ${Math.floor(classHitDieDraft / 2) + 1}) + ваш модификатор Телосложения (суммарно минимум 1)`}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-100"
                      />
                    </label>
                  </div>

                  {/* Collapsible Level 1-20 Progression Table Editor (Proficiency Bonus + Class Resources) */}
                  <div className="rounded-xl bg-[#0B0F17] border border-slate-800 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowClassProgressionEditor((v) => !v)}
                      className="w-full px-3 py-2.5 flex items-center justify-between gap-2 text-xs font-semibold text-slate-200 hover:bg-slate-800/40 transition-colors"
                    >
                      <span>
                        Таблица прогрессии (Ур. 1–20): Бонус владения и параметры класса (
                        {classResourcesDraft.length})
                      </span>
                      {showClassProgressionEditor ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {showClassProgressionEditor && (
                      <div className="p-3 border-t border-slate-800 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-400">
                            Бонус владения (+2..+6) и колонки ресурсов (например, Второе дыхание, Ярость, Коварная атака)
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setClassResourcesDraft((prev) => [
                                ...prev,
                                {
                                  id: `res-${Date.now().toString(36)}-${prev.length}`,
                                  name: 'Новый параметр',
                                  values: Array.from({ length: 20 }, () => '1'),
                                },
                              ])
                            }
                            className="px-2.5 py-1 rounded-md bg-[#131A26] hover:bg-slate-800 border border-slate-700 text-[11px] text-amber-400 flex items-center gap-1 shrink-0"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Добавить параметр</span>
                          </button>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead>
                              <tr className="border-b border-slate-800 text-slate-400">
                                <th className="py-1.5 pr-2 font-medium min-w-[140px]">Параметр</th>
                                {Array.from({ length: 20 }, (_, i) => (
                                  <th
                                    key={i}
                                    className="py-1.5 px-1 font-mono text-center text-slate-500 min-w-[38px]"
                                  >
                                    {i + 1}
                                  </th>
                                ))}
                                <th className="py-1.5 pl-1 w-7" />
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/70">
                              <tr>
                                <td className="py-1.5 pr-2 font-semibold text-amber-300">
                                  Бонус владения
                                </td>
                                {Array.from({ length: 20 }, (_, idx) => (
                                  <td key={idx} className="py-1 px-0.5">
                                    <input
                                      type="number"
                                      min={1}
                                      max={12}
                                      value={classProfByLevelDraft[idx] ?? DEFAULT_PROFICIENCY_BONUS_BY_LEVEL[idx]}
                                      onChange={(e) => {
                                        const val = Math.max(1, Math.min(12, Number(e.target.value) || 2));
                                        setClassProfByLevelDraft((prev) =>
                                          Array.from({ length: 20 }, (_, i) =>
                                            i === idx ? val : (prev[i] ?? DEFAULT_PROFICIENCY_BONUS_BY_LEVEL[i])
                                          )
                                        );
                                      }}
                                      className="w-9 px-1 py-1 rounded bg-[#131A26] border border-slate-800 font-mono text-center text-amber-300"
                                    />
                                  </td>
                                ))}
                                <td />
                              </tr>
                              {classResourcesDraft.map((res, rIdx) => (
                                <tr key={res.id}>
                                  <td className="py-1.5 pr-2">
                                    <input
                                      type="text"
                                      value={res.name}
                                      onChange={(e) =>
                                        setClassResourcesDraft((prev) =>
                                          prev.map((row, i) =>
                                            i === rIdx ? { ...row, name: e.target.value } : row
                                          )
                                        )
                                      }
                                      className="w-full px-2 py-1 rounded bg-[#131A26] border border-slate-800 text-slate-100"
                                    />
                                  </td>
                                  {Array.from({ length: 20 }, (_, idx) => (
                                    <td key={idx} className="py-1 px-0.5">
                                      <input
                                        type="text"
                                        value={res.values[idx] ?? '—'}
                                        onChange={(e) =>
                                          setClassResourcesDraft((prev) =>
                                            prev.map((row, i) =>
                                              i === rIdx
                                                ? {
                                                    ...row,
                                                    values: Array.from({ length: 20 }, (_, j) =>
                                                      j === idx ? e.target.value : (row.values[j] ?? '—')
                                                    ),
                                                  }
                                                : row
                                            )
                                          )
                                        }
                                        className="w-11 px-1 py-1 rounded bg-[#131A26] border border-slate-800 font-mono text-center text-slate-200"
                                      />
                                    </td>
                                  ))}
                                  <td className="py-1 pl-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setClassResourcesDraft((prev) =>
                                          prev.filter((_, i) => i !== rIdx)
                                        )
                                      }
                                      className="p-1 text-slate-500 hover:text-red-400"
                                      aria-label="Удалить параметр"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeSection === 'subclasses' && (
                <div className="space-y-3">
                  <div className="grid sm:grid-cols-12 gap-3">
                    <select
                      value={subclassClassIdDraft}
                      onChange={(e) => setSubclassClassIdDraft(e.target.value)}
                      className="sm:col-span-4 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                    >
                      {catalogs.classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          Класс: {c.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      placeholder="Название подкласса (напр. Мастер боя)"
                      className="sm:col-span-5 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                      required
                    />
                    <button
                      type="submit"
                      className="sm:col-span-3 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      <span>{editingId ? 'Сохранить' : 'Добавить подкласс'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    placeholder="Описание подкласса..."
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100 resize-y"
                  />
                </div>
              )}

              {activeSection === 'classFeatures' && (
                <div className="space-y-3">
                  <div className="grid sm:grid-cols-12 gap-3">
                    <select
                      value={featureClassIdDraft}
                      onChange={(e) => setFeatureClassIdDraft(e.target.value)}
                      className="sm:col-span-3 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                    >
                      {catalogs.classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <div className="sm:col-span-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0B0F17] border border-slate-800">
                      <span className="text-[11px] text-slate-400">Ур.</span>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={featureLevelDraft}
                        onChange={(e) =>
                          setFeatureLevelDraft(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
                        }
                        className="w-full bg-transparent font-mono text-xs text-amber-300 font-semibold focus:outline-none"
                      />
                    </div>
                    <input
                      type="text"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      placeholder="Название умения (напр. Второе дыхание)"
                      className="sm:col-span-4 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                      required
                    />
                    <button
                      type="submit"
                      className="sm:col-span-3 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      <span>{editingId ? 'Сохранить' : 'Добавить умение'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    placeholder="Полное описание классового умения..."
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100 resize-y"
                  />
                </div>
              )}

              {activeSection === 'subclassFeatures' && (
                <div className="space-y-3">
                  <div className="grid sm:grid-cols-12 gap-3">
                    <select
                      value={subFeatureClassIdDraft}
                      onChange={(e) => {
                        const nextClassId = e.target.value;
                        setSubFeatureClassIdDraft(nextClassId);
                        const firstSub = catalogs.subclasses.find((s) => s.classId === nextClassId);
                        setSubFeatureSubclassIdDraft(firstSub?.id ?? '');
                      }}
                      className="sm:col-span-3 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                    >
                      {catalogs.classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={
                        subFeatureSubclassIdDraft ||
                        catalogs.subclasses.find((s) => s.classId === subFeatureClassIdDraft)?.id ||
                        ''
                      }
                      onChange={(e) => setSubFeatureSubclassIdDraft(e.target.value)}
                      className="sm:col-span-3 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                    >
                      {catalogs.subclasses
                        .filter((s) => s.classId === subFeatureClassIdDraft)
                        .map((sc) => (
                          <option key={sc.id} value={sc.id}>
                            {sc.name}
                          </option>
                        ))}
                    </select>
                    <div className="sm:col-span-1 flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[#0B0F17] border border-slate-800">
                      <span className="text-[10px] text-slate-400">Ур</span>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={subFeatureLevelDraft}
                        onChange={(e) =>
                          setSubFeatureLevelDraft(
                            Math.max(1, Math.min(20, Number(e.target.value) || 3))
                          )
                        }
                        className="w-full bg-transparent font-mono text-xs text-amber-300 font-semibold focus:outline-none"
                      />
                    </div>
                    <input
                      type="text"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      placeholder="Название умения подкласса"
                      className="sm:col-span-3 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                      required
                    />
                    <button
                      type="submit"
                      className="sm:col-span-2 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center justify-center gap-1 transition-colors whitespace-nowrap"
                    >
                      {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      <span>{editingId ? 'Сохранить' : 'Добавить'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    placeholder="Полное описание умения подкласса..."
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100 resize-y"
                  />
                </div>
              )}

              {activeSection === 'backgrounds' && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-12 gap-3">
                    <input
                      type="text"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      placeholder="Название предыстории (напр. Солдат)"
                      className="sm:col-span-4 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                      required
                    />
                    <input
                      type="text"
                      value={descDraft}
                      onChange={(e) => setDescDraft(e.target.value)}
                      placeholder="Краткое описание предыстории"
                      className="sm:col-span-6 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                    />
                    <button
                      type="submit"
                      className="sm:col-span-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      <span>{editingId ? 'Сохранить' : 'Добавить'}</span>
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    {/* 3 eligible abilities */}
                    <div className="p-3 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-200">
                          3 характеристики предыстории (+3 очка)
                        </span>
                        <span className="text-[11px] font-mono text-amber-400">
                          {bgAbilityIdsDraft.length} / 3
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {catalogs.abilities.map((ab) => {
                          const checked = bgAbilityIdsDraft.includes(ab.id);
                          const atLimit = !checked && bgAbilityIdsDraft.length >= 3;
                          return (
                            <button
                              key={ab.id}
                              type="button"
                              disabled={atLimit}
                              onClick={() =>
                                setBgAbilityIdsDraft((prev) =>
                                  prev.includes(ab.id)
                                    ? prev.filter((id) => id !== ab.id)
                                    : prev.length < 3
                                      ? [...prev, ab.id]
                                      : prev
                                )
                              }
                              className={`px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                                checked
                                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-200 font-medium'
                                  : atLimit
                                    ? 'bg-[#131A26] border-slate-800/60 text-slate-600 cursor-not-allowed'
                                    : 'bg-[#131A26] border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {ab.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Linked Origin Feat */}
                    <div className="p-3 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2">
                      <span className="text-xs font-semibold text-slate-200 block">
                        Черта предыстории
                      </span>
                      <select
                        value={bgFeatIdDraft}
                        onChange={(e) => setBgFeatIdDraft(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-100"
                      >
                        <option value="">— Не выбрана —</option>
                        {catalogs.feats.map((ft) => (
                          <option key={ft.id} value={ft.id}>
                            {ft.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Fixed Background Skills */}
                  <div className="p-3 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-200">
                        Фиксированные навыки предыстории
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Выбрано: {bgSkillIdsDraft.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                      {catalogs.skills.map((sk) => {
                        const checked = bgSkillIdsDraft.includes(sk.id);
                        return (
                          <button
                            key={sk.id}
                            type="button"
                            onClick={() =>
                              setBgSkillIdsDraft((prev) =>
                                prev.includes(sk.id)
                                  ? prev.filter((id) => id !== sk.id)
                                  : [...prev, sk.id]
                              )
                            }
                            className={`px-2.5 py-1.5 rounded-lg border text-left text-xs truncate transition-colors ${
                              checked
                                ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200 font-medium'
                                : 'bg-[#131A26] border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {sk.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'feats' && (
                <div className="space-y-3">
                  <div className="grid sm:grid-cols-12 gap-3">
                    <input
                      type="text"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      placeholder="Название черты (напр. Бдительный)"
                      className="sm:col-span-9 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                      required
                    />
                    <button
                      type="submit"
                      className="sm:col-span-3 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      <span>{editingId ? 'Сохранить' : 'Добавить черту'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    placeholder="Что даёт черта..."
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100 resize-y"
                  />
                </div>
              )}

              {activeSection === 'species' && (
                <div className="grid sm:grid-cols-12 gap-3">
                  <input
                    type="text"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder="Название"
                    className="sm:col-span-4 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                    required
                  />
                  <input
                    type="text"
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    placeholder="Описание и особенности"
                    className="sm:col-span-6 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                  />
                  <button
                    type="submit"
                    className="sm:col-span-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>{editingId ? 'Сохранить' : 'Добавить'}</span>
                  </button>
                </div>
              )}

              {activeSection === 'levels' && (
                <div className="grid sm:grid-cols-12 gap-3 items-end">
                  <label className="sm:col-span-4 space-y-1">
                    <span className="text-[11px] text-slate-400">Уровень</span>
                    <input
                      type="number"
                      min={1}
                      value={levelNumDraft}
                      onChange={(e) => setLevelNumDraft(Number(e.target.value) || 1)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs font-mono tabular-nums text-slate-100"
                      required
                    />
                  </label>
                  <label className="sm:col-span-5 space-y-1">
                    <span className="text-[11px] text-slate-400">Необходимо опыта (XP от)</span>
                    <input
                      type="number"
                      min={0}
                      value={minXpDraft}
                      onChange={(e) => setMinXpDraft(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs font-mono tabular-nums text-slate-100"
                      required
                    />
                  </label>
                  <button
                    type="submit"
                    className="sm:col-span-3 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>{editingId ? 'Сохранить' : 'Добавить порог'}</span>
                  </button>
                </div>
              )}

              {activeSection === 'skills' && (
                <div className="space-y-3">
                  <div className="grid sm:grid-cols-12 gap-3">
                    <input
                      type="text"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      placeholder="Название навыка (напр. Акробатика)"
                      className="sm:col-span-5 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                      required
                    />
                    <select
                      value={abilityIdDraft}
                      onChange={(e) => setAbilityIdDraft(e.target.value)}
                      className="sm:col-span-4 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-200"
                    >
                      {catalogs.abilities.map((ab) => (
                        <option key={ab.id} value={ab.id}>
                          Характеристика: {ab.name} ({ab.shortName})
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="sm:col-span-3 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      <span>{editingId ? 'Сохранить' : 'Добавить'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    placeholder="Пример использования — пояснение игроку, в каких ситуациях применяется этот навык..."
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100 resize-none"
                  />
                </div>
              )}

              {activeSection === 'proficiencies' && (
                <div className="grid sm:grid-cols-12 gap-3">
                  <input
                    type="text"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder="Название владения (напр. Владение щитом)"
                    className="sm:col-span-4 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                    required
                  />
                  <select
                    value={profCategoryDraft}
                    onChange={(e) => setProfCategoryDraft(e.target.value as ProficiencyCategory)}
                    className="sm:col-span-2 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-200"
                  >
                    <option value="weapon">Оружие</option>
                    <option value="armor">Доспехи и щит</option>
                    <option value="other">Прочее</option>
                  </select>
                  <input
                    type="text"
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    placeholder="Пояснение (какие типы предметов покрывает)"
                    className="sm:col-span-4 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                  />
                  <button
                    type="submit"
                    className="sm:col-span-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>{editingId ? 'Сохранить' : 'Добавить'}</span>
                  </button>
                </div>
              )}

              {activeSection === 'visions' && (
                <div className="space-y-3">
                  <div className="grid sm:grid-cols-12 gap-3">
                    <input
                      type="text"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      placeholder="Название (напр. Тёмное зрение)"
                      className="sm:col-span-5 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                      required
                    />
                    <select
                      value={visionBehaviorDraft}
                      onChange={(e) => setVisionBehaviorDraft(e.target.value as VisionBehavior)}
                      className="sm:col-span-5 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                    >
                      <option value="normal">Механика: Обычное зрение (только освещённая зона)</option>
                      <option value="darkvision">Механика: Тёмное зрение (полумрак→яркий, темнота→полумрак)</option>
                      <option value="blindsight">Механика: Слепое зрение (видит в темноте/ослеплении)</option>
                      <option value="truesight">Механика: Истинное зрение (видит сквозь тьму и иллюзии)</option>
                      <option value="tremorsense">Механика: Чувство вибрации (ощущает по поверхности)</option>
                    </select>
                    <button
                      type="submit"
                      className="sm:col-span-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      <span>{editingId ? 'Сохранить' : 'Добавить'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    placeholder="Подробное описание правил этого зрения..."
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100 resize-y"
                  />
                </div>
              )}

              {activeSection === 'weapons' && (
                <div className="space-y-3">
                  {/* Dual Toggles: Простое/Воинское & Рукопашное/Дальнобойное */}
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Категория:</span>
                      <div className="inline-flex p-1 rounded-lg bg-[#0B0F17] border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setWeaponCategoryDraft('simple')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            weaponCategoryDraft === 'simple'
                              ? 'bg-amber-500 text-slate-950 font-semibold'
                              : 'text-slate-300 hover:text-slate-100'
                          }`}
                        >
                          Простое
                        </button>
                        <button
                          type="button"
                          onClick={() => setWeaponCategoryDraft('martial')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            weaponCategoryDraft === 'martial'
                              ? 'bg-amber-500 text-slate-950 font-semibold'
                              : 'text-slate-300 hover:text-slate-100'
                          }`}
                        >
                          Воинское
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Тип:</span>
                      <div className="inline-flex p-1 rounded-lg bg-[#0B0F17] border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setWeaponRangeDraft('melee')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            weaponRangeDraft === 'melee'
                              ? 'bg-sky-500 text-slate-950 font-semibold'
                              : 'text-slate-300 hover:text-slate-100'
                          }`}
                        >
                          Рукопашное
                        </button>
                        <button
                          type="button"
                          onClick={() => setWeaponRangeDraft('ranged')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            weaponRangeDraft === 'ranged'
                              ? 'bg-sky-500 text-slate-950 font-semibold'
                              : 'text-slate-300 hover:text-slate-100'
                          }`}
                        >
                          Дальнобойное
                        </button>
                      </div>
                    </div>

                    {/* Structured Reach / Range inputs */}
                    {weaponRangeDraft === 'melee' ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Досягаемость:</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={5}
                          value={weaponReachDraft}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setWeaponReachDraft(raw === '' ? 0 : Math.max(0, Number(raw)));
                          }}
                          className="w-20 px-2.5 py-1.5 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs font-mono text-slate-100 text-center"
                        />
                        <span className="text-xs text-slate-400">фт.</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Дистанция (норм./макс.):</span>
                        <input
                          type="number"
                          min={0}
                          max={2000}
                          step={5}
                          value={weaponRangeNormalDraft}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setWeaponRangeNormalDraft(raw === '' ? 0 : Math.max(0, Number(raw)));
                          }}
                          className="w-20 px-2 py-1.5 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs font-mono text-slate-100 text-center"
                        />
                        <span className="text-xs text-slate-500">/</span>
                        <input
                          type="number"
                          min={0}
                          max={4000}
                          step={5}
                          value={weaponRangeMaxDraft}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setWeaponRangeMaxDraft(raw === '' ? 0 : Math.max(0, Number(raw)));
                          }}
                          className="w-20 px-2 py-1.5 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs font-mono text-slate-100 text-center"
                        />
                        <span className="text-xs text-slate-400">фт.</span>
                      </div>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-12 gap-3">
                    <input
                      type="text"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      placeholder="Название (напр. Длинный меч)"
                      className="sm:col-span-4 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                      required
                    />
                    <input
                      type="text"
                      value={weaponDamageDraft}
                      onChange={(e) => setWeaponDamageDraft(e.target.value)}
                      placeholder="Урон (напр. 1к8 рубящий)"
                      className="sm:col-span-4 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                    />
                    <input
                      type="text"
                      value={weaponMasteryDraft}
                      onChange={(e) => setWeaponMasteryDraft(e.target.value)}
                      placeholder="Мастерство (напр. Ослабление)"
                      className="sm:col-span-4 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                    />
                  </div>

                  <div className="grid sm:grid-cols-12 gap-3">
                    <input
                      type="text"
                      value={weaponPropsDraft}
                      onChange={(e) => setWeaponPropsDraft(e.target.value)}
                      placeholder="Свойства (напр. Универсальное (1к10), Лёгкое)"
                      className="sm:col-span-6 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                    />
                    <input
                      type="text"
                      value={weaponWeightDraft}
                      onChange={(e) => setWeaponWeightDraft(e.target.value)}
                      placeholder="Вес (напр. 3 фнт.)"
                      className="sm:col-span-2 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs font-mono text-slate-100"
                    />
                    <input
                      type="text"
                      value={weaponPriceDraft}
                      onChange={(e) => setWeaponPriceDraft(e.target.value)}
                      placeholder="Цена (напр. 15 зм)"
                      className="sm:col-span-2 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs font-mono text-amber-300"
                    />
                    <button
                      type="submit"
                      className="sm:col-span-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      <span>{editingId ? 'Сохранить' : 'Добавить'}</span>
                    </button>
                  </div>
                </div>
              )}

              {activeSection === 'armors' && (
                <div className="space-y-3">
                  {/* Toggle: Лёгкие / Средние / Тяжёлые / Щит */}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs text-slate-400">Категория:</span>
                    <div className="inline-flex flex-wrap p-1 rounded-lg bg-[#0B0F17] border border-slate-800">
                      {(
                        [
                          ['light', 'Лёгкие доспехи'],
                          ['medium', 'Средние доспехи'],
                          ['heavy', 'Тяжёлые доспехи'],
                          ['shield', 'Щит'],
                        ] as Array<[ArmorCategory, string]>
                      ).map(([cat, label]) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleArmorCategoryChange(cat)}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                            armorCategoryDraft === cat
                              ? 'bg-amber-500 text-slate-950 font-semibold'
                              : 'text-slate-300 hover:text-slate-100'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Structured AC Formula Constructor */}
                  <div className="p-3 rounded-lg bg-[#0B0F17] border border-slate-800/90 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold text-slate-300">
                        Конструктор Класса Защиты (КЗ)
                      </span>
                      <span className="text-xs font-mono text-sky-400">
                        Итоговая формула: {armorPreviewFormula}
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-12 gap-2.5">
                      <label className="sm:col-span-4 space-y-1">
                        <span className="text-[11px] text-slate-400">
                          {armorCategoryDraft === 'shield' ? 'Бонус КЗ (+)*' : 'Базовое значение КЗ *'}
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={armorAcBaseDraft}
                          onChange={(e) => setArmorAcBaseDraft(Number(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-lg bg-[#131A26] border border-slate-800 text-xs font-mono tabular-nums text-slate-100"
                          required
                        />
                      </label>

                      <label className="sm:col-span-4 space-y-1">
                        <span className="text-[11px] text-slate-400">
                          Модификатор характеристики (необяз.)
                        </span>
                        <select
                          value={armorAcAbilityDraft}
                          onChange={(e) => {
                            const val = e.target.value;
                            setArmorAcAbilityDraft(val);
                            if (!val) setArmorAcMaxBonusDraft('');
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-100"
                        >
                          <option value="">Нет модификатора</option>
                          {catalogs.abilities.map((ab) => (
                            <option key={ab.id} value={ab.id}>
                              + мод. {ab.name} ({ab.shortName})
                            </option>
                          ))}
                        </select>
                      </label>

                      {armorAcAbilityDraft && (
                        <label className="sm:col-span-4 space-y-1">
                          <span className="text-[11px] text-slate-400">
                            Макс. бонус модификатора (пусто = без лимита)
                          </span>
                          <input
                            type="number"
                            min={0}
                            max={20}
                            placeholder="Без ограничения"
                            value={armorAcMaxBonusDraft}
                            onChange={(e) => setArmorAcMaxBonusDraft(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-[#131A26] border border-slate-800 text-xs font-mono tabular-nums text-slate-100"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-12 gap-3">
                    <input
                      type="text"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      placeholder="Название (напр. Кольчужный доспех или Щит)"
                      className="sm:col-span-4 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                      required
                    />
                    <input
                      type="text"
                      value={armorStrDraft}
                      onChange={(e) => setArmorStrDraft(e.target.value)}
                      placeholder="Сила (напр. Сила 13 или —)"
                      className="sm:col-span-4 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                    />
                    <input
                      type="text"
                      value={armorStealthDraft}
                      onChange={(e) => setArmorStealthDraft(e.target.value)}
                      placeholder="Скрытность (напр. Помеха или —)"
                      className="sm:col-span-4 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                    />
                  </div>

                  <div className="grid sm:grid-cols-12 gap-3">
                    <input
                      type="text"
                      value={armorWeightDraft}
                      onChange={(e) => setArmorWeightDraft(e.target.value)}
                      placeholder="Вес (напр. 55 фнт.)"
                      className="sm:col-span-5 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs font-mono text-slate-100"
                    />
                    <input
                      type="text"
                      value={armorPriceDraft}
                      onChange={(e) => setArmorPriceDraft(e.target.value)}
                      placeholder="Цена (напр. 75 зм)"
                      className="sm:col-span-5 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs font-mono text-amber-300"
                    />
                    <button
                      type="submit"
                      className="sm:col-span-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      <span>{editingId ? 'Сохранить' : 'Добавить'}</span>
                    </button>
                  </div>
                </div>
              )}

              {activeSection === 'monsters' && (
                <div className="space-y-4">
                  {/* Core Stats Row */}
                  <div className="grid sm:grid-cols-12 gap-3">
                    <label className="sm:col-span-4 space-y-1">
                      <span className="text-[11px] text-slate-400">Название монстра *</span>
                      <input
                        type="text"
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        placeholder="Например: Крыса"
                        className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                        required
                      />
                    </label>
                    <label className="sm:col-span-2 space-y-1">
                      <span className="text-[11px] text-slate-400 flex items-center justify-between">
                        <span>КЗ</span>
                        <button
                          type="button"
                          onClick={() => setMonsterAcDraft(10 + monsterDexMod)}
                          className="text-[10px] text-amber-400 hover:underline"
                          title="Рассчитать 10 + мод. ЛОВ"
                        >
                          10+ЛОВ
                        </button>
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={40}
                        value={monsterAcDraft}
                        onChange={(e) => setMonsterAcDraft(Number(e.target.value) || 10)}
                        className="w-full px-2.5 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs font-mono tabular-nums text-slate-100"
                        required
                      />
                    </label>
                    <label className="sm:col-span-2 space-y-1">
                      <span className="text-[11px] text-slate-400">Хиты (HP)</span>
                      <input
                        type="number"
                        min={1}
                        value={monsterMaxHpDraft}
                        onChange={(e) => setMonsterMaxHpDraft(Number(e.target.value) || 1)}
                        className="w-full px-2.5 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs font-mono tabular-nums text-emerald-400"
                        required
                      />
                    </label>
                    <label className="sm:col-span-2 space-y-1">
                      <span className="text-[11px] text-slate-400 flex items-center justify-between">
                        <span>Иниц.</span>
                        <button
                          type="button"
                          onClick={() => setMonsterInitDraft(10 + monsterDexMod)}
                          className="text-[10px] text-amber-400 hover:underline"
                          title="Рассчитать 10 + мод. ЛОВ"
                        >
                          10+ЛОВ
                        </button>
                      </span>
                      <input
                        type="number"
                        value={monsterInitDraft}
                        onChange={(e) => setMonsterInitDraft(Number(e.target.value) || 10)}
                        className="w-full px-2.5 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs font-mono tabular-nums text-sky-300"
                      />
                    </label>
                    <label className="sm:col-span-2 space-y-1">
                      <span className="text-[11px] text-slate-400">Скорость (фт.)</span>
                      <input
                        type="number"
                        min={0}
                        value={monsterSpeedDraft}
                        onChange={(e) => setMonsterSpeedDraft(Number(e.target.value) || 0)}
                        className="w-full px-2.5 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs font-mono tabular-nums text-slate-100"
                      />
                    </label>
                  </div>

                  <div className="grid sm:grid-cols-12 gap-3">
                    <label className="sm:col-span-4 space-y-1">
                      <span className="text-[11px] text-slate-400">Формула хитов (необяз.)</span>
                      <input
                        type="text"
                        value={monsterHpFormulaDraft}
                        onChange={(e) => setMonsterHpFormulaDraft(e.target.value)}
                        placeholder="Например: 1к4 − 1"
                        className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs font-mono text-slate-200"
                      />
                    </label>
                    <label className="sm:col-span-4 space-y-1">
                      <span className="text-[11px] text-slate-400">Опыт за убийство (XP)</span>
                      <input
                        type="number"
                        min={0}
                        value={monsterXpDraft}
                        onChange={(e) => setMonsterXpDraft(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs font-mono tabular-nums text-amber-300"
                      />
                    </label>
                  </div>

                  {/* 6 Ability Scores */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-slate-300">
                      Характеристики (модификатор по справочнику)
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {catalogs.abilities.map((ab) => {
                        const val = monsterAbilitiesDraft[ab.id] ?? 10;
                        const mod = getAbilityModifier(val, catalogs.abilityModifiers);
                        return (
                          <div
                            key={ab.id}
                            className="p-2 rounded-lg bg-[#0B0F17] border border-slate-800 space-y-1"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-mono text-slate-400">{ab.shortName}</span>
                              <span className="font-mono tabular-nums font-bold text-amber-400">
                                {formatModifier(mod)}
                              </span>
                            </div>
                            <input
                              type="number"
                              min={1}
                              max={30}
                              value={val}
                              onChange={(e) => {
                                const nextVal = Math.max(1, Math.min(30, Number(e.target.value) || 1));
                                setMonsterAbilitiesDraft((prev) => ({ ...prev, [ab.id]: nextVal }));
                              }}
                              className="w-full px-1.5 py-1 rounded bg-[#131A26] border border-slate-800 font-mono tabular-nums text-xs text-center text-slate-100"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Skills Multi-select with live +N bonus & Expertise ×2 */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] font-medium text-slate-300">
                        Навыки ({monsterSkillsDraft.length} выбрано · владение +2, экспертиза ×2 = +4)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {catalogs.skills.map((sk) => {
                        const isExp = monsterExpertiseDraft.includes(sk.id);
                        const active = isExp || monsterSkillsDraft.includes(sk.id);
                        const abScore = monsterAbilitiesDraft[sk.abilityId] ?? 10;
                        const abMod = getAbilityModifier(abScore, catalogs.abilityModifiers);
                        const totalBonus = isExp ? abMod + 4 : active ? abMod + 2 : abMod;
                        return (
                          <div
                            key={sk.id}
                            className={`inline-flex items-stretch rounded-md border text-[11px] overflow-hidden transition-colors ${
                              isExp
                                ? 'bg-sky-500/20 border-sky-400/70'
                                : active
                                  ? 'bg-amber-500/20 border-amber-500/70'
                                  : 'bg-[#0B0F17] border-slate-800'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                if (active) {
                                  setMonsterSkillsDraft((prev) =>
                                    prev.filter((id) => id !== sk.id)
                                  );
                                  setMonsterExpertiseDraft((prev) =>
                                    prev.filter((id) => id !== sk.id)
                                  );
                                } else {
                                  setMonsterSkillsDraft((prev) => [...prev, sk.id]);
                                }
                              }}
                              className={`px-2 py-1 inline-flex items-center gap-1.5 transition-colors ${
                                isExp
                                  ? 'text-sky-200 font-medium'
                                  : active
                                    ? 'text-amber-300 font-medium'
                                    : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <span>{sk.name}</span>
                              <span
                                className={`font-mono tabular-nums ${
                                  isExp
                                    ? 'text-sky-300 font-semibold'
                                    : active
                                      ? 'text-amber-200 font-semibold'
                                      : 'text-slate-500'
                                }`}
                              >
                                {formatModifier(totalBonus)}
                              </span>
                            </button>
                            <button
                              type="button"
                              title="Экспертиза (бонус владения ×2 = +4)"
                              onClick={() => {
                                if (isExp) {
                                  setMonsterExpertiseDraft((prev) =>
                                    prev.filter((id) => id !== sk.id)
                                  );
                                } else {
                                  setMonsterExpertiseDraft((prev) => [...prev, sk.id]);
                                  setMonsterSkillsDraft((prev) =>
                                    prev.includes(sk.id) ? prev : [...prev, sk.id]
                                  );
                                }
                              }}
                              className={`px-1.5 py-1 border-l font-mono text-[10px] font-semibold transition-colors ${
                                isExp
                                  ? 'border-sky-400/60 bg-sky-500/30 text-sky-200'
                                  : active
                                    ? 'border-amber-500/40 text-amber-300/70 hover:text-sky-300 hover:bg-sky-500/15'
                                    : 'border-slate-800 text-slate-500 hover:text-sky-300 hover:bg-slate-800/70'
                              }`}
                            >
                              ×2
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    {monsterSkillsDraft.length > 0 && (
                      <div className="text-[11px] text-slate-300 pt-0.5">
                        <span className="text-slate-500">Выбрано: </span>
                        {catalogs.skills
                          .filter(
                            (sk) =>
                              monsterSkillsDraft.includes(sk.id) ||
                              monsterExpertiseDraft.includes(sk.id)
                          )
                          .map((sk) => {
                            const isExp = monsterExpertiseDraft.includes(sk.id);
                            const abMod = getAbilityModifier(
                              monsterAbilitiesDraft[sk.abilityId] ?? 10,
                              catalogs.abilityModifiers
                            );
                            const bonus = abMod + (isExp ? 4 : 2);
                            return `${sk.name} ${formatModifier(bonus)}${isExp ? ' (×2)' : ''}`;
                          })
                          .join(', ')}
                      </div>
                    )}
                  </div>

                  {/* Immunities, Resistances, Senses */}
                  <div className="grid sm:grid-cols-3 gap-3">
                    <label className="space-y-1">
                      <span className="text-[11px] text-slate-400">Иммунитеты</span>
                      <input
                        type="text"
                        value={monsterImmunitiesDraft}
                        onChange={(e) => setMonsterImmunitiesDraft(e.target.value)}
                        placeholder="Например: Яд; Отравление"
                        className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] text-slate-400">Сопротивления</span>
                      <input
                        type="text"
                        value={monsterResistancesDraft}
                        onChange={(e) => setMonsterResistancesDraft(e.target.value)}
                        placeholder="Например: Огонь, Холод"
                        className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] text-slate-400">Чувства (дополнительно)</span>
                      <input
                        type="text"
                        value={monsterSensesDraft}
                        onChange={(e) => setMonsterSensesDraft(e.target.value)}
                        placeholder="Например: пасс. Восприятие 13, обострённый нюх"
                        className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
                      />
                    </label>
                  </div>

                  {/* Structured Monster Visions */}
                  <div className="p-3 rounded-lg bg-[#0B0F17]/70 border border-slate-800/80">
                    <VisionSelector
                      catalogVisions={catalogs.visions}
                      value={monsterVisionsDraft}
                      onChange={setMonsterVisionsDraft}
                      title="Зрение монстра"
                    />
                  </div>

                  {/* Monster Traits */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-300">
                        Особенности монстра ({monsterTraitsDraft.filter((t) => t.name.trim()).length})
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setMonsterTraitsDraft((prev) => [
                            ...prev,
                            {
                              id: `trt-${Date.now().toString(36)}-${prev.length}`,
                              name: '',
                              description: '',
                            },
                          ])
                        }
                        className="px-2.5 py-1 rounded-md bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 text-[11px] text-amber-400 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Добавить особенность</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {monsterTraitsDraft.map((trt, idx) => (
                        <div
                          key={trt.id}
                          className="grid sm:grid-cols-12 gap-2 items-start p-2.5 rounded-lg bg-[#0B0F17] border border-slate-800"
                        >
                          <input
                            type="text"
                            value={trt.name}
                            onChange={(e) =>
                              setMonsterTraitsDraft((prev) =>
                                prev.map((row, i) =>
                                  i === idx ? { ...row, name: e.target.value } : row
                                )
                              )
                            }
                            placeholder="Название (напр. Тактика стаи)"
                            className="sm:col-span-3 px-2.5 py-1.5 rounded bg-[#131A26] border border-slate-800 text-xs text-slate-100"
                          />
                          <input
                            type="text"
                            value={trt.description}
                            onChange={(e) =>
                              setMonsterTraitsDraft((prev) =>
                                prev.map((row, i) =>
                                  i === idx ? { ...row, description: e.target.value } : row
                                )
                              )
                            }
                            placeholder="Описание особенности..."
                            className="sm:col-span-8 px-2.5 py-1.5 rounded bg-[#131A26] border border-slate-800 text-xs text-slate-200"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setMonsterTraitsDraft((prev) =>
                                prev.length > 1
                                  ? prev.filter((_, i) => i !== idx)
                                  : [{ ...trt, name: '', description: '' }]
                              )
                            }
                            className="sm:col-span-1 p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 justify-self-end"
                            aria-label="Удалить особенность"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Monster Actions */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-300">
                        Действия монстра ({monsterActionsDraft.filter((a) => a.name.trim()).length})
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setMonsterActionsDraft((prev) => [
                            ...prev,
                            {
                              id: `act-${Date.now().toString(36)}-${prev.length}`,
                              name: '',
                              description: '',
                              attackType: null,
                              reachFt: null,
                              rangeNormalFt: null,
                              rangeMaxFt: null,
                            },
                          ])
                        }
                        className="px-2.5 py-1 rounded-md bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 text-[11px] text-amber-400 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Добавить действие</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {monsterActionsDraft.map((act, idx) => (
                        <div
                          key={act.id}
                          className="space-y-2 p-2.5 rounded-lg bg-[#0B0F17] border border-slate-800"
                        >
                          <div className="grid sm:grid-cols-12 gap-2 items-start">
                            <input
                              type="text"
                              value={act.name}
                              onChange={(e) =>
                                setMonsterActionsDraft((prev) =>
                                  prev.map((row, i) =>
                                    i === idx ? { ...row, name: e.target.value } : row
                                  )
                                )
                              }
                              placeholder="Название (напр. Укус)"
                              className="sm:col-span-3 px-2.5 py-1.5 rounded bg-[#131A26] border border-slate-800 text-xs text-slate-100"
                            />
                            <input
                              type="text"
                              value={act.description}
                              onChange={(e) =>
                                setMonsterActionsDraft((prev) =>
                                  prev.map((row, i) =>
                                    i === idx ? { ...row, description: e.target.value } : row
                                  )
                                )
                              }
                              placeholder="Бросок атаки, досягаемость и урон..."
                              className="sm:col-span-8 px-2.5 py-1.5 rounded bg-[#131A26] border border-slate-800 text-xs text-slate-200"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setMonsterActionsDraft((prev) =>
                                  prev.length > 1
                                    ? prev.filter((_, i) => i !== idx)
                                    : [
                                        {
                                          ...act,
                                          name: '',
                                          description: '',
                                          attackType: null,
                                          reachFt: null,
                                          rangeNormalFt: null,
                                          rangeMaxFt: null,
                                        },
                                      ]
                                )
                              }
                              className="sm:col-span-1 p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 justify-self-end"
                              aria-label="Удалить действие"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Optional tactical reach / range */}
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                            <span>Дистанция (необяз.):</span>
                            <select
                              value={act.attackType ?? ''}
                              onChange={(e) => {
                                const val = e.target.value as '' | WeaponRangeType;
                                setMonsterActionsDraft((prev) =>
                                  prev.map((row, i) =>
                                    i !== idx
                                      ? row
                                      : val === 'melee'
                                        ? {
                                            ...row,
                                            attackType: 'melee',
                                            reachFt: row.reachFt ?? 5,
                                            rangeNormalFt: null,
                                            rangeMaxFt: null,
                                          }
                                        : val === 'ranged'
                                          ? {
                                              ...row,
                                              attackType: 'ranged',
                                              reachFt: null,
                                              rangeNormalFt: row.rangeNormalFt ?? 60,
                                              rangeMaxFt: row.rangeMaxFt ?? 120,
                                            }
                                          : {
                                              ...row,
                                              attackType: null,
                                              reachFt: null,
                                              rangeNormalFt: null,
                                              rangeMaxFt: null,
                                            }
                                  )
                                );
                              }}
                              className="px-2 py-1 rounded bg-[#131A26] border border-slate-800 text-xs text-slate-200"
                            >
                              <option value="">Не указана</option>
                              <option value="melee">Рукопашная (досягаемость)</option>
                              <option value="ranged">Дальнобойная (норм. / макс.)</option>
                            </select>

                            {act.attackType === 'melee' && (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={200}
                                  step={5}
                                  value={act.reachFt ?? ''}
                                  onChange={(e) =>
                                    setMonsterActionsDraft((prev) =>
                                      prev.map((row, i) =>
                                        i === idx
                                          ? {
                                              ...row,
                                              reachFt:
                                                e.target.value !== ''
                                                  ? Math.max(0, Number(e.target.value))
                                                  : null,
                                            }
                                          : row
                                      )
                                    )
                                  }
                                  placeholder="0"
                                  className="w-16 px-2 py-1 rounded bg-[#131A26] border border-slate-800 text-xs font-mono text-slate-100 text-center"
                                />
                                <span>фт.</span>
                              </div>
                            )}

                            {act.attackType === 'ranged' && (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={2000}
                                  step={5}
                                  value={act.rangeNormalFt ?? ''}
                                  onChange={(e) =>
                                    setMonsterActionsDraft((prev) =>
                                      prev.map((row, i) =>
                                        i === idx
                                          ? {
                                              ...row,
                                              rangeNormalFt:
                                                e.target.value !== ''
                                                  ? Math.max(0, Number(e.target.value))
                                                  : null,
                                            }
                                          : row
                                      )
                                    )
                                  }
                                  placeholder="60"
                                  className="w-16 px-2 py-1 rounded bg-[#131A26] border border-slate-800 text-xs font-mono text-slate-100 text-center"
                                />
                                <span>/</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={4000}
                                  step={5}
                                  value={act.rangeMaxFt ?? ''}
                                  onChange={(e) =>
                                    setMonsterActionsDraft((prev) =>
                                      prev.map((row, i) =>
                                        i === idx
                                          ? {
                                              ...row,
                                              rangeMaxFt:
                                                e.target.value !== ''
                                                  ? Math.max(0, Number(e.target.value))
                                                  : null,
                                            }
                                          : row
                                      )
                                    )
                                  }
                                  placeholder="120"
                                  className="w-16 px-2 py-1 rounded bg-[#131A26] border border-slate-800 text-xs font-mono text-slate-100 text-center"
                                />
                                <span>фт.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      <span>{editingId ? 'Сохранить монстра' : 'Добавить монстра'}</span>
                    </button>
                  </div>
                </div>
              )}
            </form>

            {/* Entries Table / List */}
            <div className="rounded-xl bg-[#131A26] border border-slate-800 overflow-hidden">
              {activeSection === 'abilities' && (
                <div className="divide-y divide-slate-800/80">
                  {catalogs.abilities
                    .filter((a) => !q || a.name.toLowerCase().includes(q) || a.shortName.toLowerCase().includes(q))
                    .map((ab) => (
                      <div
                        key={ab.id}
                        className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                      >
                        <div className="flex items-baseline gap-3 min-w-0">
                          <span className="w-10 font-mono text-xs font-bold text-amber-400 shrink-0">
                            {ab.shortName}
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-100">{ab.name}</div>
                            {ab.description && (
                              <p className="text-xs text-slate-400 mt-0.5">{ab.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEdit(ab)}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                            aria-label="Редактировать"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(ab.id)}
                            className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                            aria-label="Удалить"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {activeSection === 'abilityModifiers' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-[#0B0F17]/50">
                        <th className="py-2.5 px-4 font-medium">Значение характеристики</th>
                        <th className="py-2.5 px-4 font-medium">Модификатор</th>
                        <th className="py-2.5 px-4 font-medium text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-xs">
                      {sortAbilityModifiers(catalogs.abilityModifiers).map((row) => (
                        <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-2.5 px-4 font-mono tabular-nums font-semibold text-slate-100">
                            {formatAbilityRange(row)}
                          </td>
                          <td
                            className={`py-2.5 px-4 font-mono tabular-nums font-bold ${
                              row.modifier > 0
                                ? 'text-emerald-400'
                                : row.modifier < 0
                                  ? 'text-red-400'
                                  : 'text-amber-400'
                            }`}
                          >
                            {formatModifier(row.modifier)}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => startEdit(row)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                                aria-label="Редактировать"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(row.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                                aria-label="Удалить"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeSection === 'classes' && (
                <div className="divide-y divide-slate-800/80">
                  {catalogs.classes
                    .filter(
                      (cls) =>
                        !q ||
                        cls.name.toLowerCase().includes(q) ||
                        cls.description.toLowerCase().includes(q)
                    )
                    .map((cls) => {
                      const saves = (cls.savingThrowAbilityIds ?? [])
                        .map((id) => abilitiesMap.get(id)?.name)
                        .filter(Boolean)
                        .join(', ');
                      const skillNames = cls.anySkillAllowed
                        ? 'Любые навыки'
                        : (cls.allowedSkillIds ?? [])
                            .map((id) => catalogs.skills.find((s) => s.id === id)?.name)
                            .filter(Boolean)
                            .join(', ');
                      const weaponNames = (cls.weaponProficiencyIds ?? [])
                        .map((id) => catalogs.proficiencies.find((p) => p.id === id)?.name)
                        .filter(Boolean)
                        .join(', ');
                      const armorNames = (cls.armorProficiencyIds ?? [])
                        .map((id) => catalogs.proficiencies.find((p) => p.id === id)?.name)
                        .filter(Boolean)
                        .join(', ');

                      const hitInfo = getClassHitDieInfo(cls);
                      const subclassCount = catalogs.subclasses.filter((s) => s.classId === cls.id).length;
                      const featureCount = catalogs.classFeatures.filter((f) => f.classId === cls.id).length;
                      const resourceNames = (cls.classResources ?? []).map((r) => r.name).join(', ');

                      return (
                        <div
                          key={cls.id}
                          className="px-4 py-3.5 flex items-start justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                        >
                          <div className="min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-slate-100">{cls.name}</span>
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 font-mono text-[10px] font-semibold text-amber-300">
                                1к{hitInfo.hitDie}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-300">
                                Подклассов: {subclassCount}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-300">
                                Умений: {featureCount}
                              </span>
                            </div>
                            {cls.description && (
                              <p className="text-xs text-slate-400">{cls.description}</p>
                            )}
                            <div className="grid sm:grid-cols-2 gap-x-5 gap-y-1 pt-1 text-[11px]">
                              <div className="sm:col-span-2">
                                <span className="text-slate-500">Хиты за уровень: </span>
                                <span className="text-slate-200">{hitInfo.hint}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Спасброски (ДМ): </span>
                                <span className="text-sky-300 font-medium">{saves || '—'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">
                                  Навыки (выбор {cls.skillChoiceCount ?? 2}):{' '}
                                </span>
                                <span className="text-amber-200">{skillNames || '—'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Оружие: </span>
                                <span className="text-slate-200">
                                  {weaponNames || 'Нет'}
                                  {cls.weaponProficiencyNote ? ` · ${cls.weaponProficiencyNote}` : ''}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500">Доспехи: </span>
                                <span className="text-emerald-300">{armorNames || 'Нет'}</span>
                              </div>
                              {resourceNames && (
                                <div className="sm:col-span-2">
                                  <span className="text-slate-500">Параметры таблицы: </span>
                                  <span className="text-violet-300">{resourceNames}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => startEdit(cls)}
                              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                              aria-label="Редактировать"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(cls.id)}
                              className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                              aria-label="Удалить"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {activeSection === 'subclasses' && (
                <div>
                  <div className="px-4 py-2.5 border-b border-slate-800 bg-[#0B0F17]/50 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-slate-400">Фильтр по классу:</span>
                    <select
                      value={subclassFilterClassId}
                      onChange={(e) => setSubclassFilterClassId(e.target.value)}
                      className="px-2.5 py-1 rounded-lg bg-[#131A26] border border-slate-700 text-xs text-slate-100"
                    >
                      <option value="all">Все классы ({catalogs.subclasses.length})</option>
                      {catalogs.classes.map((c) => {
                        const cnt = catalogs.subclasses.filter((s) => s.classId === c.id).length;
                        return (
                          <option key={c.id} value={c.id}>
                            {c.name} ({cnt})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="divide-y divide-slate-800/80">
                    {catalogs.subclasses
                      .filter(
                        (sc) =>
                          (subclassFilterClassId === 'all' || sc.classId === subclassFilterClassId) &&
                          (!q ||
                            sc.name.toLowerCase().includes(q) ||
                            sc.description.toLowerCase().includes(q))
                      )
                      .map((sc) => {
                        const cls = catalogs.classes.find((c) => c.id === sc.classId);
                        const featCount = catalogs.subclassFeatures.filter(
                          (f) => f.subclassId === sc.id
                        ).length;
                        return (
                          <div
                            key={sc.id}
                            className="px-4 py-3 flex items-start justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-slate-100">{sc.name}</span>
                                <span className="px-1.5 py-0.5 rounded bg-violet-500/15 border border-violet-500/40 text-[10px] font-medium text-violet-300">
                                  {cls?.name ?? sc.classId}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  Умений подкласса: {featCount}
                                </span>
                              </div>
                              {sc.description && (
                                <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line line-clamp-3">
                                  {sc.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => startEdit(sc)}
                                className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                                aria-label="Редактировать"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(sc.id)}
                                className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                                aria-label="Удалить"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {activeSection === 'classFeatures' && (
                <div>
                  <div className="px-4 py-2.5 border-b border-slate-800 bg-[#0B0F17]/50 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-slate-400">Класс:</span>
                    <select
                      value={classFeatureFilterClassId}
                      onChange={(e) => {
                        setClassFeatureFilterClassId(e.target.value);
                        if (e.target.value !== 'all') {
                          setFeatureClassIdDraft(e.target.value);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#131A26] border border-slate-700 text-xs text-slate-100"
                    >
                      <option value="all">Все классы ({catalogs.classFeatures.length})</option>
                      {catalogs.classes.map((c) => {
                        const cnt = catalogs.classFeatures.filter((f) => f.classId === c.id).length;
                        return (
                          <option key={c.id} value={c.id}>
                            {c.name} ({cnt})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="divide-y divide-slate-800/80">
                    {catalogs.classFeatures
                      .filter(
                        (cf) =>
                          (classFeatureFilterClassId === 'all' ||
                            cf.classId === classFeatureFilterClassId) &&
                          (!q ||
                            cf.name.toLowerCase().includes(q) ||
                            cf.description.toLowerCase().includes(q))
                      )
                      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'ru'))
                      .map((cf) => {
                        const cls = catalogs.classes.find((c) => c.id === cf.classId);
                        return (
                          <div
                            key={cf.id}
                            className="px-4 py-3 flex items-start justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 font-mono text-[10px] font-semibold text-amber-300">
                                  Ур. {cf.level}
                                </span>
                                <span className="text-sm font-semibold text-slate-100">{cf.name}</span>
                                {classFeatureFilterClassId === 'all' && (
                                  <span className="text-[11px] text-slate-400">
                                    · {cls?.name ?? cf.classId}
                                  </span>
                                )}
                              </div>
                              {cf.description && (
                                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line line-clamp-4">
                                  {cf.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => startEdit(cf)}
                                className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                                aria-label="Редактировать"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(cf.id)}
                                className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                                aria-label="Удалить"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {activeSection === 'subclassFeatures' && (
                <div>
                  <div className="px-4 py-2.5 border-b border-slate-800 bg-[#0B0F17]/50 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-slate-400">Класс:</span>
                    <select
                      value={subFeatureFilterClassId}
                      onChange={(e) => {
                        const nextClassId = e.target.value;
                        setSubFeatureFilterClassId(nextClassId);
                        setSubFeatureFilterSubclassId('all');
                        if (nextClassId !== 'all') {
                          setSubFeatureClassIdDraft(nextClassId);
                          const firstSub = catalogs.subclasses.find((s) => s.classId === nextClassId);
                          setSubFeatureSubclassIdDraft(firstSub?.id ?? '');
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#131A26] border border-slate-700 text-xs text-slate-100"
                    >
                      <option value="all">Все классы ({catalogs.subclassFeatures.length})</option>
                      {catalogs.classes.map((c) => {
                        const cnt = catalogs.subclassFeatures.filter((f) => f.classId === c.id).length;
                        return (
                          <option key={c.id} value={c.id}>
                            {c.name} ({cnt})
                          </option>
                        );
                      })}
                    </select>

                    {subFeatureFilterClassId !== 'all' && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSubFeatureFilterSubclassId('all')}
                          className={`px-2 py-1 rounded-md border text-[11px] transition-colors ${
                            subFeatureFilterSubclassId === 'all'
                              ? 'bg-violet-500/20 border-violet-400/70 text-violet-200 font-medium'
                              : 'bg-[#131A26] border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Все подклассы
                        </button>
                        {catalogs.subclasses
                          .filter((s) => s.classId === subFeatureFilterClassId)
                          .map((sc) => (
                            <button
                              key={sc.id}
                              type="button"
                              onClick={() => {
                                setSubFeatureFilterSubclassId(sc.id);
                                setSubFeatureSubclassIdDraft(sc.id);
                              }}
                              className={`px-2 py-1 rounded-md border text-[11px] transition-colors ${
                                subFeatureFilterSubclassId === sc.id
                                  ? 'bg-violet-500/20 border-violet-400/70 text-violet-200 font-medium'
                                  : 'bg-[#131A26] border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {sc.name}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  <div className="divide-y divide-slate-800/80">
                    {catalogs.subclassFeatures
                      .filter(
                        (sf) =>
                          (subFeatureFilterClassId === 'all' ||
                            sf.classId === subFeatureFilterClassId) &&
                          (subFeatureFilterSubclassId === 'all' ||
                            sf.subclassId === subFeatureFilterSubclassId) &&
                          (!q ||
                            sf.name.toLowerCase().includes(q) ||
                            sf.description.toLowerCase().includes(q))
                      )
                      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'ru'))
                      .map((sf) => {
                        const cls = catalogs.classes.find((c) => c.id === sf.classId);
                        const sc = catalogs.subclasses.find((s) => s.id === sf.subclassId);
                        return (
                          <div
                            key={sf.id}
                            className="px-4 py-3 flex items-start justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-1.5 py-0.5 rounded bg-violet-500/20 border border-violet-400/50 font-mono text-[10px] font-semibold text-violet-200">
                                  Ур. {sf.level}
                                </span>
                                <span className="text-sm font-semibold text-slate-100">{sf.name}</span>
                                <span className="text-[11px] text-slate-400">
                                  · {sc?.name ?? sf.subclassId}
                                  {subFeatureFilterClassId === 'all' && cls ? ` (${cls.name})` : ''}
                                </span>
                              </div>
                              {sf.description && (
                                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line line-clamp-4">
                                  {sf.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => startEdit(sf)}
                                className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                                aria-label="Редактировать"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(sf.id)}
                                className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                                aria-label="Удалить"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {activeSection === 'backgrounds' && (
                <div className="divide-y divide-slate-800/80">
                  {catalogs.backgrounds
                    .filter(
                      (bg) =>
                        !q ||
                        bg.name.toLowerCase().includes(q) ||
                        bg.description.toLowerCase().includes(q)
                    )
                    .map((bg) => {
                      const abNames = (bg.abilityIds ?? [])
                        .map((id) => abilitiesMap.get(id)?.name)
                        .filter(Boolean)
                        .join(', ');
                      const feat = bg.featId
                        ? catalogs.feats.find((f) => f.id === bg.featId)
                        : null;
                      const skNames = (bg.skillIds ?? [])
                        .map((id) => catalogs.skills.find((s) => s.id === id)?.name)
                        .filter(Boolean)
                        .join(', ');
                      return (
                        <div
                          key={bg.id}
                          className="px-4 py-3.5 flex items-start justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                        >
                          <div className="min-w-0 space-y-1.5">
                            <div className="text-sm font-semibold text-slate-100">{bg.name}</div>
                            {bg.description && (
                              <p className="text-xs text-slate-400">{bg.description}</p>
                            )}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-0.5 text-[11px]">
                              <span>
                                <span className="text-slate-500">Характеристики (+3): </span>
                                <span className="text-amber-300 font-medium">{abNames || '—'}</span>
                              </span>
                              <span>
                                <span className="text-slate-500">Черта: </span>
                                <span className="text-sky-300 font-medium">
                                  {feat?.name ?? '—'}
                                </span>
                              </span>
                              <span>
                                <span className="text-slate-500">Навыки: </span>
                                <span className="text-emerald-300 font-medium">
                                  {skNames || '—'}
                                </span>
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => startEdit(bg)}
                              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                              aria-label="Редактировать"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(bg.id)}
                              className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                              aria-label="Удалить"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {activeSection === 'feats' && (
                <div className="divide-y divide-slate-800/80">
                  {catalogs.feats
                    .filter(
                      (ft) =>
                        !q ||
                        ft.name.toLowerCase().includes(q) ||
                        ft.description.toLowerCase().includes(q)
                    )
                    .map((ft) => (
                      <div
                        key={ft.id}
                        className="px-4 py-3 flex items-start justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="text-sm font-semibold text-slate-100">{ft.name}</div>
                          {ft.description && (
                            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                              {ft.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEdit(ft)}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                            aria-label="Редактировать"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(ft.id)}
                            className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                            aria-label="Удалить"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {activeSection === 'species' && (
                <div className="divide-y divide-slate-800/80">
                  {catalogs.species
                    .filter(
                      (entry) =>
                        !q ||
                        entry.name.toLowerCase().includes(q) ||
                        entry.description.toLowerCase().includes(q)
                    )
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-100">{entry.name}</div>
                          {entry.description && (
                            <p className="text-xs text-slate-400 mt-0.5">{entry.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEdit(entry)}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                            aria-label="Редактировать"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(entry.id)}
                            className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                            aria-label="Удалить"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {activeSection === 'levels' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-[#0B0F17]/50">
                        <th className="py-2.5 px-4 font-medium">Уровень</th>
                        <th className="py-2.5 px-4 font-medium">Опыт от (XP)</th>
                        <th className="py-2.5 px-4 font-medium text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-xs">
                      {sortLevels(catalogs.levels).map((lvl) => (
                        <tr key={lvl.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-2.5 px-4 font-mono tabular-nums font-semibold text-amber-400">
                            Уровень {lvl.level}
                          </td>
                          <td className="py-2.5 px-4 font-mono tabular-nums text-slate-100">
                            {lvl.minXp.toLocaleString('ru-RU')} XP
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => startEdit(lvl)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                                aria-label="Редактировать"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(lvl.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                                aria-label="Удалить"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeSection === 'skills' && (
                <div className="divide-y divide-slate-800/80">
                  {catalogs.skills
                    .filter(
                      (sk) =>
                        !q ||
                        sk.name.toLowerCase().includes(q) ||
                        sk.usageExample.toLowerCase().includes(q) ||
                        (abilitiesMap.get(sk.abilityId)?.name.toLowerCase().includes(q) ?? false)
                    )
                    .map((sk) => {
                      const linkedAb = abilitiesMap.get(sk.abilityId);
                      return (
                        <div
                          key={sk.id}
                          className="px-4 py-3 flex items-start justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-baseline gap-2.5 flex-wrap">
                              <span className="text-sm font-semibold text-slate-100">{sk.name}</span>
                              <span className="text-xs text-amber-400 font-medium">
                                {linkedAb ? `${linkedAb.name} (${linkedAb.shortName})` : 'Без характеристики'}
                              </span>
                            </div>
                            {sk.usageExample && (
                              <p className="text-xs text-slate-400 leading-relaxed">
                                {sk.usageExample}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => startEdit(sk)}
                              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                              aria-label="Редактировать"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(sk.id)}
                              className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                              aria-label="Удалить"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {activeSection === 'proficiencies' && (
                <div className="divide-y divide-slate-800/80">
                  {catalogs.proficiencies
                    .filter(
                      (pr) =>
                        !q ||
                        pr.name.toLowerCase().includes(q) ||
                        pr.description.toLowerCase().includes(q)
                    )
                    .map((pr) => (
                      <div
                        key={pr.id}
                        className="px-4 py-3 flex items-start justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-baseline gap-2.5 flex-wrap">
                            <span className="text-sm font-semibold text-slate-100">{pr.name}</span>
                            <span className="text-xs text-slate-400">
                              · {getProficiencyCategoryLabel(pr.category)}
                            </span>
                          </div>
                          {pr.description && (
                            <p className="text-xs text-slate-400">{pr.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEdit(pr)}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                            aria-label="Редактировать"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(pr.id)}
                            className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                            aria-label="Удалить"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {activeSection === 'visions' && (
                <div className="divide-y divide-slate-800/80">
                  {catalogs.visions
                    .filter(
                      (v) =>
                        !q ||
                        v.name.toLowerCase().includes(q) ||
                        v.description.toLowerCase().includes(q)
                    )
                    .map((vis) => (
                      <div
                        key={vis.id}
                        className="p-4 flex items-start justify-between gap-4 hover:bg-slate-800/20 transition-colors"
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-sm font-semibold text-slate-100">
                              {vis.name}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-[11px] font-medium text-sky-300">
                              {getVisionBehaviorLabel(vis.behavior)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 whitespace-pre-line leading-relaxed">
                            {vis.description || 'Без описания'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEdit(vis)}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                            aria-label="Редактировать"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(vis.id)}
                            className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                            aria-label="Удалить"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {activeSection === 'weapons' && (
                <div>
                  <div className="px-4 py-2.5 border-b border-slate-800 bg-[#0B0F17]/40 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(
                        [
                          ['all', 'Все'],
                          ['simple', 'Простое'],
                          ['martial', 'Воинское'],
                        ] as Array<['all' | WeaponCategory, string]>
                      ).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setWeaponFilter(key)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                            weaponFilter === key
                              ? 'bg-slate-800 text-amber-400'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {(
                        [
                          ['all', 'Любая дистанция'],
                          ['melee', 'Рукопашное'],
                          ['ranged', 'Дальнобойное'],
                        ] as Array<['all' | WeaponRangeType, string]>
                      ).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setWeaponRangeFilter(key)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                            weaponRangeFilter === key
                              ? 'bg-slate-800 text-sky-400'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-[#0B0F17]/50">
                          <th className="py-2.5 px-3 font-medium">Название</th>
                          <th className="py-2.5 px-3 font-medium">Классификация</th>
                          <th className="py-2.5 px-3 font-medium">Дистанция</th>
                          <th className="py-2.5 px-3 font-medium">Урон</th>
                          <th className="py-2.5 px-3 font-medium">Свойства</th>
                          <th className="py-2.5 px-3 font-medium">Мастерство</th>
                          <th className="py-2.5 px-3 font-medium">Вес</th>
                          <th className="py-2.5 px-3 font-medium">Цена</th>
                          <th className="py-2.5 px-3 font-medium text-right">Действия</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-xs">
                        {catalogs.weapons
                          .filter(
                            (w) =>
                              (weaponFilter === 'all' || w.category === weaponFilter) &&
                              (weaponRangeFilter === 'all' || (w.rangeType || 'melee') === weaponRangeFilter) &&
                              (!q ||
                                w.name.toLowerCase().includes(q) ||
                                w.damage.toLowerCase().includes(q) ||
                                w.properties.toLowerCase().includes(q) ||
                                w.mastery.toLowerCase().includes(q))
                          )
                          .map((wp) => {
                            const reachLabel = formatWeaponReachRange(wp.rangeType || 'melee', wp);
                            return (
                              <tr key={wp.id} className="hover:bg-slate-800/30 transition-colors">
                                <td className="py-2.5 px-3 font-semibold text-slate-100 whitespace-nowrap">
                                  {wp.name}
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <span className="text-amber-400">
                                    {getWeaponCategoryLabel(wp.category)}
                                  </span>
                                  <span className="text-slate-600"> · </span>
                                  <span className="text-sky-400">
                                    {getWeaponRangeLabel(wp.rangeType || 'melee')}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-mono tabular-nums text-rose-300 whitespace-nowrap">
                                  {reachLabel || '—'}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-slate-200 whitespace-nowrap">
                                  {wp.damage}
                                </td>
                                <td className="py-2.5 px-3 text-slate-300 max-w-[240px]">
                                  {wp.properties}
                                </td>
                                <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                                  {wp.mastery}
                                </td>
                                <td className="py-2.5 px-3 font-mono tabular-nums text-slate-400 whitespace-nowrap">
                                  {wp.weight}
                                </td>
                                <td className="py-2.5 px-3 font-mono tabular-nums text-amber-300 whitespace-nowrap">
                                  {wp.price}
                                </td>
                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => startEdit(wp)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                                      aria-label="Редактировать"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(wp.id)}
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                                      aria-label="Удалить"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeSection === 'armors' && (
                <div>
                  <div className="px-4 py-2.5 border-b border-slate-800 bg-[#0B0F17]/40 flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        ['all', 'Все'],
                        ['light', 'Лёгкие доспехи'],
                        ['medium', 'Средние доспехи'],
                        ['heavy', 'Тяжёлые доспехи'],
                        ['shield', 'Щит'],
                      ] as Array<['all' | ArmorCategory, string]>
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setArmorFilter(key)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          armorFilter === key
                            ? 'bg-slate-800 text-amber-400'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-[#0B0F17]/50">
                          <th className="py-2.5 px-3 font-medium">Название</th>
                          <th className="py-2.5 px-3 font-medium">Тип</th>
                          <th className="py-2.5 px-3 font-medium">Класс Защиты (КЗ)</th>
                          <th className="py-2.5 px-3 font-medium">Сила</th>
                          <th className="py-2.5 px-3 font-medium">Скрытность</th>
                          <th className="py-2.5 px-3 font-medium">Вес</th>
                          <th className="py-2.5 px-3 font-medium">Цена</th>
                          <th className="py-2.5 px-3 font-medium text-right">Действия</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-xs">
                        {catalogs.armors
                          .filter(
                            (a) =>
                              (armorFilter === 'all' || a.category === armorFilter) &&
                              (!q ||
                                a.name.toLowerCase().includes(q) ||
                                a.armorClass.toLowerCase().includes(q) ||
                                a.strengthReq.toLowerCase().includes(q) ||
                                a.stealth.toLowerCase().includes(q))
                          )
                          .map((ar) => (
                            <tr key={ar.id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-2.5 px-3 font-semibold text-slate-100 whitespace-nowrap">
                                {ar.name}
                              </td>
                              <td className="py-2.5 px-3 text-sky-400 whitespace-nowrap">
                                {getArmorCategoryLabel(ar.category)}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-200 whitespace-nowrap">
                                {ar.armorClass}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap">
                                {ar.strengthReq}
                              </td>
                              <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                                {ar.stealth}
                              </td>
                              <td className="py-2.5 px-3 font-mono tabular-nums text-slate-400 whitespace-nowrap">
                                {ar.weight}
                              </td>
                              <td className="py-2.5 px-3 font-mono tabular-nums text-amber-300 whitespace-nowrap">
                                {ar.price}
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => startEdit(ar)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                                    aria-label="Редактировать"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(ar.id)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                                    aria-label="Удалить"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeSection === 'monsters' && (
                <div className="divide-y divide-slate-800/80">
                  <input
                    ref={monsterUploadInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleMonsterPhotoFileChange}
                    className="hidden"
                  />

                  {monsterUploadError && (
                    <div className="px-4 py-3 bg-red-950/40 border-b border-red-800/60 text-xs text-red-200 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>{monsterUploadError}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setMonsterUploadError(null)}
                        className="p-1 text-red-300 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {catalogs.monsters.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      В бестиарии пока нет монстров. Добавьте первого с помощью формы выше.
                    </div>
                  ) : (
                    catalogs.monsters
                      .filter(
                        (m) =>
                          !q ||
                          m.name.toLowerCase().includes(q) ||
                          (m.immunities || '').toLowerCase().includes(q) ||
                          (m.resistances || '').toLowerCase().includes(q) ||
                          (m.senses || '').toLowerCase().includes(q) ||
                          (m.traits || []).some(
                            (t) =>
                              t.name.toLowerCase().includes(q) ||
                              t.description.toLowerCase().includes(q)
                          ) ||
                          m.actions.some(
                            (a) =>
                              a.name.toLowerCase().includes(q) ||
                              a.description.toLowerCase().includes(q)
                          )
                      )
                      .map((mon) => {
                        const skillLabels = catalogs.skills
                          .filter(
                            (sk) =>
                              mon.proficientSkillIds.includes(sk.id) ||
                              (mon.expertiseSkillIds ?? []).includes(sk.id)
                          )
                          .map((sk) => {
                            const isExp = (mon.expertiseSkillIds ?? []).includes(sk.id);
                            const abScore = mon.abilities?.[sk.abilityId] ?? 10;
                            const abMod = getAbilityModifier(abScore, catalogs.abilityModifiers);
                            const bonus = abMod + (isExp ? 4 : 2);
                            return `${sk.name} ${formatModifier(bonus)}${isExp ? ' (×2)' : ''}`;
                          });
                        const monsterTraits = mon.traits ?? [];
                        const visionLabels = formatEntityVisions(mon.visions, catalogs.visions);
                        const isUploadingThis = uploadingMonsterId === mon.id;

                        return (
                          <div
                            key={mon.id}
                            className="p-4 sm:p-5 space-y-3 hover:bg-slate-800/20 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-4 min-w-0">
                                {/* Monster 3:4 Portrait Preview */}
                                <div className="w-16 h-[86px] rounded-xl overflow-hidden border border-slate-700/90 bg-[#0B0F17] shrink-0 flex items-center justify-center relative">
                                  {mon.portraitUrl ? (
                                    <img
                                      src={mon.portraitUrl}
                                      alt={mon.name}
                                      className="w-full h-full object-cover object-top"
                                    />
                                  ) : (
                                    <Skull className="w-6 h-6 text-slate-600" />
                                  )}
                                  {isUploadingThis && (
                                    <div className="absolute inset-0 bg-[#0B0F17]/80 flex items-center justify-center">
                                      <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-1.5 min-w-0">
                                  <div className="flex items-baseline gap-3 flex-wrap">
                                    <h3 className="text-base font-semibold text-slate-100">
                                      {mon.name}
                                    </h3>
                                    <span className="text-xs font-mono tabular-nums text-amber-400 font-semibold">
                                      {mon.xpReward} XP
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 font-mono tabular-nums">
                                    <span>
                                      <span className="text-slate-500">КЗ:</span> {mon.ac}
                                    </span>
                                    <span>
                                      <span className="text-slate-500">Хиты:</span>{' '}
                                      <span className="text-emerald-400">{mon.maxHp}</span>
                                      {mon.hpFormula ? ` (${mon.hpFormula})` : ''}
                                    </span>
                                    <span>
                                      <span className="text-slate-500">Инициатива:</span>{' '}
                                      <span className="text-sky-400">{mon.initiative}</span>
                                    </span>
                                    <span>
                                      <span className="text-slate-500">Скорость:</span> {mon.speed} фт.
                                    </span>
                                  </div>

                                  {/* Portrait Upload & AI Generation Controls */}
                                  <div className="flex flex-wrap items-center gap-2 pt-1">
                                    <button
                                      type="button"
                                      disabled={isUploadingThis}
                                      onClick={() => handleTriggerMonsterUpload(mon.id)}
                                      className="px-2.5 py-1.5 rounded-lg bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 text-[11px] font-medium text-slate-200 inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                                    >
                                      <Upload className="w-3.5 h-3.5 text-sky-400" />
                                      <span>{isUploadingThis ? 'Загрузка...' : 'Загрузить фото'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenMonsterGenModal(mon.id)}
                                      className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/50 text-[11px] font-semibold text-amber-300 inline-flex items-center gap-1.5 transition-colors"
                                    >
                                      <Sparkles className="w-3.5 h-3.5" />
                                      <span>Сгенерировать фото</span>
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => startEdit(mon)}
                                  className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                                  aria-label="Редактировать монстра"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(mon.id)}
                                  className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                                  aria-label="Удалить монстра"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* 6 Abilities Strip */}
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                              {catalogs.abilities.map((ab) => {
                                const score = mon.abilities?.[ab.id] ?? 10;
                                const mod = getAbilityModifier(score, catalogs.abilityModifiers);
                                return (
                                  <div
                                    key={ab.id}
                                    className="px-2.5 py-1.5 rounded-lg bg-[#0B0F17] border border-slate-800/90 flex items-baseline justify-between gap-1 text-xs font-mono tabular-nums"
                                  >
                                    <span className="text-[10px] text-slate-500">{ab.shortName}</span>
                                    <span>
                                      <span className="text-slate-200">{score}</span>{' '}
                                      <span className="text-amber-400 font-semibold">
                                        ({formatModifier(mod)})
                                      </span>
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Skills, Resistances, Immunities, Visions, Senses */}
                            {(skillLabels.length > 0 ||
                              mon.resistances ||
                              mon.immunities ||
                              visionLabels.length > 0 ||
                              mon.senses) && (
                              <div className="space-y-1 text-xs text-slate-300">
                                {skillLabels.length > 0 && (
                                  <div>
                                    <span className="text-slate-500">Навыки: </span>
                                    <span className="font-mono tabular-nums text-slate-200">
                                      {skillLabels.join(', ')}
                                    </span>
                                  </div>
                                )}
                                {mon.resistances && (
                                  <div>
                                    <span className="text-slate-500">Сопротивления: </span>
                                    <span>{mon.resistances}</span>
                                  </div>
                                )}
                                {mon.immunities && (
                                  <div>
                                    <span className="text-slate-500">Иммунитеты: </span>
                                    <span>{mon.immunities}</span>
                                  </div>
                                )}
                                {visionLabels.length > 0 && (
                                  <div>
                                    <span className="text-slate-500">Зрение: </span>
                                    <span className="text-sky-300 font-medium">
                                      {visionLabels.join(', ')}
                                    </span>
                                  </div>
                                )}
                                {mon.senses && (
                                  <div>
                                    <span className="text-slate-500">Чувства: </span>
                                    <span>{mon.senses}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Traits */}
                            {monsterTraits.length > 0 && (
                              <div className="space-y-1.5 pt-2 border-t border-slate-800/70">
                                <div className="text-[11px] font-semibold text-slate-400">
                                  Особенности
                                </div>
                                <div className="space-y-1">
                                  {monsterTraits.map((trt) => (
                                    <div key={trt.id} className="text-xs leading-relaxed">
                                      <span className="font-semibold text-sky-300">
                                        {trt.name}.{' '}
                                      </span>
                                      <span className="text-slate-300">{trt.description}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Actions */}
                            {mon.actions.length > 0 && (
                              <div className="space-y-1.5 pt-2 border-t border-slate-800/70">
                                <div className="text-[11px] font-semibold text-slate-400">
                                  Действия
                                </div>
                                <div className="space-y-1">
                                  {mon.actions.map((act) => {
                                    const reachStr = formatWeaponReachRange(act.attackType, act);
                                    return (
                                      <div key={act.id} className="text-xs leading-relaxed">
                                        <span className="font-semibold text-amber-300">
                                          {act.name}.{' '}
                                        </span>
                                        {reachStr && (
                                          <span className="inline-block mr-1.5 px-1.5 py-0.2 rounded bg-rose-500/15 border border-rose-500/30 text-[10px] font-mono text-rose-300">
                                            {act.attackType === 'ranged' ? 'Дальн.' : 'Досяг.'} {reachStr}
                                          </span>
                                        )}
                                        <span className="text-slate-300">{act.description}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      {/* Monster AI Portrait Generation Modal */}
      {activeGenMonster && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            if (!isGeneratingMonster) setGenModalMonsterId(null);
          }}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-[#131A26] border border-slate-700/90 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-100">
                  Сгенерировать фото: {activeGenMonster.name}
                </h2>
                <p className="text-xs text-slate-400">
                  ИИ-генерация · стиль тёмного фэнтези D&D для карточек ТВ
                </p>
              </div>
              <button
                type="button"
                disabled={isGeneratingMonster}
                onClick={() => setGenModalMonsterId(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors disabled:opacity-40"
                aria-label="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              ref={monsterRefInputRef}
              type="file"
              accept="image/*"
              onChange={handleMonsterRefFileChange}
              className="hidden"
            />

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Current / Result Portrait */}
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-slate-300">Текущий портрет</div>
                  <div className="relative w-full aspect-[3/4] max-h-56 rounded-xl overflow-hidden border border-slate-800 bg-[#0B0F17] flex items-center justify-center">
                    {activeGenMonster.portraitUrl ? (
                      <img
                        src={activeGenMonster.portraitUrl}
                        alt={activeGenMonster.name}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="text-center p-4 space-y-1.5">
                        <Skull className="w-8 h-8 text-slate-600 mx-auto" />
                        <p className="text-[11px] text-slate-500">Портрет ещё не задан</p>
                      </div>
                    )}
                    {isGeneratingMonster && (
                      <div className="absolute inset-0 bg-[#0B0F17]/85 backdrop-blur-sm flex flex-col items-center justify-center gap-2 p-3 text-center">
                        <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
                        <span className="text-xs font-medium text-amber-200">
                          ИИ рисует монстра...
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Optional Reference Image Upload */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">
                      Референс (необязательно)
                    </span>
                    {genReferenceDataUrl && (
                      <button
                        type="button"
                        disabled={isGeneratingMonster}
                        onClick={() => setGenReferenceDataUrl(null)}
                        className="text-[11px] text-slate-400 hover:text-red-400"
                      >
                        Убрать
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={isGeneratingMonster}
                    onClick={() => monsterRefInputRef.current?.click()}
                    className="w-full aspect-[3/4] max-h-56 rounded-xl overflow-hidden border border-dashed border-slate-700 hover:border-amber-500/60 bg-[#0B0F17] flex flex-col items-center justify-center gap-2 p-3 text-center transition-colors disabled:opacity-50"
                  >
                    {genReferenceDataUrl ? (
                      <img
                        src={genReferenceDataUrl}
                        alt="Референс"
                        className="w-full h-full object-cover object-center rounded-lg"
                      />
                    ) : (
                      <>
                        <ImageIcon className="w-7 h-7 text-slate-500" />
                        <span className="text-xs font-medium text-slate-300">
                          Загрузить референс
                        </span>
                        <span className="text-[11px] text-slate-500 leading-snug">
                          Набросок, арт или фото-ориентир
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Auto-pulled Monster Card Details */}
              <div className="rounded-xl bg-[#0B0F17] border border-slate-800 p-3.5 space-y-2 text-xs">
                <div className="text-[11px] font-semibold text-slate-400">
                  Данные из карточки монстра (передаются ИИ автоматически):
                </div>
                <div className="text-slate-200 font-medium">
                  {activeGenMonster.name} · КЗ {activeGenMonster.ac} · Хиты{' '}
                  {activeGenMonster.maxHp}
                  {activeGenMonster.hpFormula ? ` (${activeGenMonster.hpFormula})` : ''} · Скорость{' '}
                  {activeGenMonster.speed} фт.
                </div>
                {activeGenMonster.actions.length > 0 && (
                  <div className="text-[11px] text-slate-400 leading-relaxed">
                    <span className="text-slate-500">Действия: </span>
                    {activeGenMonster.actions
                      .map((a) => `${a.name}${a.description ? ` (${a.description})` : ''}`)
                      .join('; ')}
                  </div>
                )}
              </div>

              {/* Optional DM Visual Hint */}
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-300">
                  Дополнительные визуальные детали (необязательно)
                </span>
                <textarea
                  rows={2}
                  disabled={isGeneratingMonster}
                  value={genExtraPrompt}
                  onChange={(e) => setGenExtraPrompt(e.target.value)}
                  placeholder="Например: покрыт мхом и шрамами, светящиеся жёлтые глаза, фон тёмной пещеры..."
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0F17] border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/70 resize-none"
                />
              </label>

              {genMonsterSuccess && (
                <div className="rounded-xl bg-emerald-950/50 border border-emerald-700/60 px-3.5 py-2.5 text-xs text-emerald-200 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{genMonsterSuccess}</span>
                </div>
              )}

              {genMonsterError && (
                <div className="rounded-xl bg-red-950/50 border border-red-700/60 px-3.5 py-2.5 text-xs text-red-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{genMonsterError}</span>
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 border-t border-slate-800 bg-[#0B0F17]/80 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isGeneratingMonster}
                onClick={() => setGenModalMonsterId(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors disabled:opacity-50"
              >
                Закрыть
              </button>
              <button
                type="button"
                disabled={isGeneratingMonster}
                onClick={handleGenerateMonsterPortrait}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                {isGeneratingMonster ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Генерация...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Сгенерировать портрет</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
