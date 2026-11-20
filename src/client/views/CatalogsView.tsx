import React, { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Calculator,
  Check,
  Dna,
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
  Sword,
  Swords,
  Trash2,
  X,
} from 'lucide-react';
import {
  formatAbilityRange,
  formatArmorClassFormula,
  formatModifier,
  getAbilityModifier,
  getArmorCategoryLabel,
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
  ClassRef,
  LevelThresholdRef,
  MonsterActionRef,
  MonsterRef,
  ProficiencyCategory,
  ProficiencyRef,
  SkillRef,
  SpeciesRef,
  WeaponCategory,
  WeaponRangeType,
  WeaponRef,
} from '../../shared/types';
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
    subtitle: 'Архетипы и профессии героев. В дальнейшем сюда будут привязываться классовые особенности.',
    icon: Swords,
  },
  {
    key: 'backgrounds',
    label: 'Предыстории',
    subtitle: 'Прошлое персонажа до начала приключений и связанные с ним свойства.',
    icon: ScrollText,
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

  // Weapon form drafts & filters
  const [weaponCategoryDraft, setWeaponCategoryDraft] = useState<WeaponCategory>('simple');
  const [weaponRangeDraft, setWeaponRangeDraft] = useState<WeaponRangeType>('melee');
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
  const [monsterActionsDraft, setMonsterActionsDraft] = useState<MonsterActionRef[]>([
    { id: 'act-draft-1', name: '', description: '' },
  ]);

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
    setWeaponCategoryDraft('simple');
    setWeaponRangeDraft('melee');
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
    setMonsterActionsDraft([{ id: `act-${Date.now().toString(36)}`, name: '', description: '' }]);
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
    } else if (
      activeSection === 'classes' ||
      activeSection === 'backgrounds' ||
      activeSection === 'species'
    ) {
      const entry = item as ClassRef | BackgroundRef | SpeciesRef;
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
    } else if (activeSection === 'weapons') {
      const wp = item as WeaponRef;
      setEditingId(wp.id);
      setNameDraft(wp.name);
      setWeaponCategoryDraft(wp.category);
      setWeaponRangeDraft(wp.rangeType || 'melee');
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
      setMonsterActionsDraft(
        mon.actions && mon.actions.length > 0
          ? mon.actions.map((a) => ({ ...a }))
          : [{ id: `act-${Date.now().toString(36)}`, name: '', description: '' }]
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
      send({
        type: 'dm:upsertCatalogItem',
        catalog: 'classes',
        item: {
          id: editingId ?? '',
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
    } else if (activeSection === 'weapons') {
      if (!nameDraft.trim()) return;
      send({
        type: 'dm:upsertCatalogItem',
        catalog: 'weapons',
        item: {
          id: editingId ?? '',
          category: weaponCategoryDraft,
          rangeType: weaponRangeDraft,
          name: nameDraft.trim(),
          damage: weaponDamageDraft.trim() || '—',
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
      const cleanActions = monsterActionsDraft
        .filter((a) => a.name.trim().length > 0)
        .map((a) => ({
          id: a.id || `act-${Date.now().toString(36)}`,
          name: a.name.trim(),
          description: a.description.trim(),
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
          proficientSkillIds: monsterSkillsDraft,
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
                  Восстановить исходные записи во всех 11 справочниках?
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

              {(activeSection === 'classes' ||
                activeSection === 'backgrounds' ||
                activeSection === 'species') && (
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
                      <span className="text-xs text-slate-400">Дистанция:</span>
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

                  {/* Skills Multi-select */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-slate-300">
                      Навыки ({monsterSkillsDraft.length} выбрано)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {catalogs.skills.map((sk) => {
                        const active = monsterSkillsDraft.includes(sk.id);
                        return (
                          <button
                            key={sk.id}
                            type="button"
                            onClick={() =>
                              setMonsterSkillsDraft((prev) =>
                                prev.includes(sk.id)
                                  ? prev.filter((id) => id !== sk.id)
                                  : [...prev, sk.id]
                              )
                            }
                            className={`px-2.5 py-1 rounded-md border text-[11px] transition-colors ${
                              active
                                ? 'bg-amber-500/20 border-amber-500/70 text-amber-300 font-medium'
                                : 'bg-[#0B0F17] border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {sk.name}
                          </button>
                        );
                      })}
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
                          className="grid sm:grid-cols-12 gap-2 items-start p-2.5 rounded-lg bg-[#0B0F17] border border-slate-800"
                        >
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
                                prev.length > 1 ? prev.filter((_, i) => i !== idx) : [{ ...act, name: '', description: '' }]
                              )
                            }
                            className="sm:col-span-1 p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 justify-self-end"
                            aria-label="Удалить действие"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

              {(activeSection === 'classes' ||
                activeSection === 'backgrounds' ||
                activeSection === 'species') && (
                <div className="divide-y divide-slate-800/80">
                  {(catalogs[activeSection] as Array<ClassRef | BackgroundRef | SpeciesRef>)
                    .filter((entry) => !q || entry.name.toLowerCase().includes(q) || entry.description.toLowerCase().includes(q))
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
                          .map((wp) => (
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
                          ))}
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
                          m.actions.some(
                            (a) =>
                              a.name.toLowerCase().includes(q) ||
                              a.description.toLowerCase().includes(q)
                          )
                      )
                      .map((mon) => {
                        const skillNames = catalogs.skills
                          .filter((sk) => mon.proficientSkillIds.includes(sk.id))
                          .map((sk) => sk.name);

                        return (
                          <div
                            key={mon.id}
                            className="p-4 sm:p-5 space-y-3 hover:bg-slate-800/20 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1 min-w-0">
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

                            {/* Skills */}
                            {skillNames.length > 0 && (
                              <div className="text-xs text-slate-300">
                                <span className="text-slate-500">Навыки: </span>
                                {skillNames.join(', ')}
                              </div>
                            )}

                            {/* Actions */}
                            {mon.actions.length > 0 && (
                              <div className="space-y-1.5 pt-2 border-t border-slate-800/70">
                                <div className="text-[11px] font-semibold text-slate-400">
                                  Действия
                                </div>
                                <div className="space-y-1">
                                  {mon.actions.map((act) => (
                                    <div key={act.id} className="text-xs leading-relaxed">
                                      <span className="font-semibold text-amber-300">
                                        {act.name}.{' '}
                                      </span>
                                      <span className="text-slate-300">{act.description}</span>
                                    </div>
                                  ))}
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
    </div>
  );
}
