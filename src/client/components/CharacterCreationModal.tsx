import React, { useState } from 'react';
import {
  Award,
  Check,
  ChevronDown,
  ChevronUp,
  Dices,
  GitBranch,
  Layers,
  Lock,
  Minus,
  Plus,
  Shield,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import {
  computeLevelFromXp,
  formatModifier,
  getAbilityModifier,
  getBackgroundLockedSkillIds,
  getClassDefaultProficiencyIds,
  getClassHitDieInfo,
  getClassProficiencyBonus,
  getClassResourcesAtLevel,
  getClassSelectableSkillIds,
  getEffectiveDraftAbilities,
  getHeroClassFeatures,
  getHeroSubclassFeatures,
  sanitizeBackgroundAbilityBonuses,
} from '../../shared/catalogDefaults';
import type {
  CharacterCreationRequest,
  CharacterDraft,
  GameCatalogs,
} from '../../shared/types';
import { VisionSelector } from './VisionSelector';

interface CharacterCreationModalProps {
  request: CharacterCreationRequest;
  catalogs: GameCatalogs;
  onUpdateDraft: (patch: Partial<CharacterDraft>) => void;
  onFinalize: () => void;
  onReject: () => void;
  onMinimize: () => void;
}

const PRESET_COLORS = ['#F59E0B', '#10B981', '#38BDF8', '#A855F7', '#EC4899', '#EF4444'];

export function CharacterCreationModal({
  request,
  catalogs,
  onUpdateDraft,
  onFinalize,
  onReject,
  onMinimize,
}: CharacterCreationModalProps) {
  const [showFeaturesPreview, setShowFeaturesPreview] = useState(false);

  const { draft } = request;
  const derivedLevel = computeLevelFromXp(draft.xp, catalogs.levels);

  const selectedClass = catalogs.classes.find((c) => c.id === draft.classId) ?? null;
  const profBonus = getClassProficiencyBonus(derivedLevel, selectedClass);
  const classSubclasses = selectedClass
    ? catalogs.subclasses.filter((s) => s.classId === selectedClass.id)
    : [];
  const subclassUnlocked = derivedLevel >= 3;
  const selectedBg = catalogs.backgrounds.find((b) => b.id === draft.backgroundId) ?? null;
  const bgFeat = selectedBg?.featId
    ? catalogs.feats.find((f) => f.id === selectedBg.featId) ?? null
    : null;

  const bgEligibleAbilityIds = selectedBg?.abilityIds ?? [];
  const cleanBgBonuses = sanitizeBackgroundAbilityBonuses(
    draft.backgroundAbilityBonuses,
    draft.backgroundId,
    catalogs
  );
  const bgBonusTotal = Object.values(cleanBgBonuses).reduce((sum, v) => sum + v, 0);
  const effectiveAbilities = getEffectiveDraftAbilities(draft, catalogs);

  const dexRaw = effectiveAbilities.dex;
  const dexScore = typeof dexRaw === 'number' ? dexRaw : 10;
  const dexMod = getAbilityModifier(dexScore, catalogs.abilityModifiers);
  const conRaw = effectiveAbilities.con;
  const conScore = typeof conRaw === 'number' ? conRaw : 10;
  const conMod = getAbilityModifier(conScore, catalogs.abilityModifiers);
  const hitDieInfo = getClassHitDieInfo(selectedClass);
  const averageHpPerLevel = Math.max(1, hitDieInfo.average + conMod);
  const suggestedTotalAvgHp = averageHpPerLevel * derivedLevel;

  const classResourcesAtLevel = getClassResourcesAtLevel(selectedClass, derivedLevel);
  const previewClassFeatures = getHeroClassFeatures(draft.classId, derivedLevel, catalogs);
  const previewSubclassFeatures = getHeroSubclassFeatures(
    draft.classId,
    draft.subclassId,
    derivedLevel,
    catalogs
  );

  const derivedAc = 10 + dexMod;
  const derivedInit = 10 + dexMod;
  const canFinalize = draft.name.trim().length > 0;

  const expertiseSkillIds = draft.expertiseSkillIds ?? [];
  const bgLockedSkillIds = getBackgroundLockedSkillIds(draft.backgroundId, catalogs);
  const bgLockedSkillSet = new Set(bgLockedSkillIds);
  const classSelectableSkillIds = getClassSelectableSkillIds(
    draft.classId,
    draft.backgroundId,
    catalogs
  );
  const classSkillLimit = selectedClass?.skillChoiceCount ?? 0;
  const chosenClassSkillIds = draft.proficientSkillIds.filter((id) =>
    classSelectableSkillIds.includes(id)
  );
  const classDefaultProfSet = new Set(getClassDefaultProficiencyIds(draft.classId, catalogs));
  const savingThrowAbilityIds = selectedClass?.savingThrowAbilityIds ?? [];

  const handleAdjustBgBonus = (abId: string, delta: 1 | -1) => {
    if (!bgEligibleAbilityIds.includes(abId)) return;
    const current = cleanBgBonuses[abId] ?? 0;
    const nextVal = current + delta;
    if (nextVal < 0 || nextVal > 2) return;
    if (delta > 0 && bgBonusTotal >= 3) return;
    const nextBonuses: Record<string, number> = { ...cleanBgBonuses };
    if (nextVal === 0) {
      delete nextBonuses[abId];
    } else {
      nextBonuses[abId] = nextVal;
    }
    onUpdateDraft({ backgroundAbilityBonuses: nextBonuses });
  };

  const handleApplyEvenBgBonuses = () => {
    const nextBonuses: Record<string, number> = {};
    for (const abId of bgEligibleAbilityIds.slice(0, 3)) {
      nextBonuses[abId] = 1;
    }
    onUpdateDraft({ backgroundAbilityBonuses: nextBonuses });
  };

  const handleResetBgBonuses = () => {
    onUpdateDraft({ backgroundAbilityBonuses: {} });
  };

  const handleToggleSkill = (skillId: string) => {
    if (bgLockedSkillSet.has(skillId)) return;
    const exists = draft.proficientSkillIds.includes(skillId);
    if (selectedClass && !exists) {
      if (!classSelectableSkillIds.includes(skillId)) return;
      if (classSkillLimit > 0 && chosenClassSkillIds.length >= classSkillLimit) return;
    }
    const nextProf = exists
      ? draft.proficientSkillIds.filter((id) => id !== skillId)
      : [...draft.proficientSkillIds, skillId];
    const nextExp = exists
      ? expertiseSkillIds.filter((id) => id !== skillId)
      : expertiseSkillIds;
    onUpdateDraft({ proficientSkillIds: nextProf, expertiseSkillIds: nextExp });
  };

  const handleToggleExpertise = (skillId: string) => {
    const hasExp = expertiseSkillIds.includes(skillId);
    if (hasExp) {
      onUpdateDraft({
        expertiseSkillIds: expertiseSkillIds.filter((id) => id !== skillId),
      });
    } else {
      const isAlreadyProf =
        bgLockedSkillSet.has(skillId) || draft.proficientSkillIds.includes(skillId);
      if (!isAlreadyProf && selectedClass) {
        if (!classSelectableSkillIds.includes(skillId)) return;
        if (classSkillLimit > 0 && chosenClassSkillIds.length >= classSkillLimit) return;
      }
      const nextProf = draft.proficientSkillIds.includes(skillId)
        ? draft.proficientSkillIds
        : [...draft.proficientSkillIds, skillId];
      onUpdateDraft({
        proficientSkillIds: nextProf,
        expertiseSkillIds: [...expertiseSkillIds, skillId],
      });
    }
  };

  const handleToggleProficiency = (profId: string) => {
    const exists = draft.proficiencyIds.includes(profId);
    const next = exists
      ? draft.proficiencyIds.filter((id) => id !== profId)
      : [...draft.proficiencyIds, profId];
    onUpdateDraft({ proficiencyIds: next });
  };

  // Visible skills during creation:
  // If a class is selected: ONLY background locked skills + class selectable skills.
  // If no class is selected yet: background locked skills (if any).
  const creationVisibleSkills = selectedClass
    ? [
        ...bgLockedSkillIds
          .map((id) => catalogs.skills.find((s) => s.id === id))
          .filter((s): s is NonNullable<typeof s> => Boolean(s)),
        ...classSelectableSkillIds
          .map((id) => catalogs.skills.find((s) => s.id === id))
          .filter((s): s is NonNullable<typeof s> => Boolean(s)),
      ]
    : bgLockedSkillIds
        .map((id) => catalogs.skills.find((s) => s.id === id))
        .filter((s): s is NonNullable<typeof s> => Boolean(s));

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-4xl max-h-[92vh] rounded-2xl bg-[#131A26] border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <header className="shrink-0 px-5 py-4 border-b border-slate-800 bg-[#0B0F17] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0">
              <UserPlus className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-100 truncate">
                Создание персонажа для участника: {request.accountName}
              </h2>
              <p className="text-xs text-slate-400">
                Каждое изменение сразу появляется на экране смартфона игрока в реальном времени
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onMinimize}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors shrink-0"
            title="Свернуть (черновик сохранится)"
            aria-label="Свернуть"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Scrollable Builder Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Section 1: Name, Identity & Core Combat */}
          <div className="grid md:grid-cols-12 gap-4">
            <label className="md:col-span-6 space-y-1.5">
              <span className="text-xs font-medium text-slate-300">Имя персонажа *</span>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => onUpdateDraft({ name: e.target.value })}
                placeholder="Например: Торин Железный Щит"
                className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </label>

            <div className="md:col-span-6 space-y-1.5">
              <span className="text-xs font-medium text-slate-300 block">Цвет фишки на карте</span>
              <div className="h-[38px] px-3 rounded-lg bg-[#0B0F17] border border-slate-800 flex items-center gap-2.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onUpdateDraft({ color: c })}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      draft.color === c ? 'border-white scale-110' : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Цвет ${c}`}
                  />
                ))}
              </div>
            </div>

            <label className="md:col-span-3 space-y-1.5">
              <span className="text-xs font-medium text-slate-300">Класс</span>
              <select
                value={draft.classId}
                onChange={(e) => onUpdateDraft({ classId: e.target.value, subclassId: '' })}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
              >
                <option value="">— Не выбран —</option>
                {catalogs.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="md:col-span-3 space-y-1.5">
              <span className="text-xs font-medium text-slate-300 flex items-center justify-between gap-1">
                <span>Подкласс</span>
                {!subclassUnlocked && (
                  <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" />
                    <span>с 3 ур.</span>
                  </span>
                )}
              </span>
              <select
                value={subclassUnlocked ? (draft.subclassId ?? '') : ''}
                disabled={!subclassUnlocked || !selectedClass || classSubclasses.length === 0}
                onChange={(e) => onUpdateDraft({ subclassId: e.target.value })}
                title={
                  !subclassUnlocked
                    ? 'Выбор подкласса открывается с 3 уровня'
                    : undefined
                }
                className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100 disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!subclassUnlocked
                    ? 'Доступно с 3 уровня'
                    : !selectedClass
                      ? 'Сначала выберите класс'
                      : '— Не выбран —'}
                </option>
                {subclassUnlocked &&
                  classSubclasses.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="md:col-span-3 space-y-1.5">
              <span className="text-xs font-medium text-slate-300">Предыстория</span>
              <select
                value={draft.backgroundId}
                onChange={(e) => onUpdateDraft({ backgroundId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
              >
                <option value="">— Не выбрана —</option>
                {catalogs.backgrounds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="md:col-span-3 space-y-1.5">
              <span className="text-xs font-medium text-slate-300">Вид</span>
              <select
                value={draft.speciesId}
                onChange={(e) => onUpdateDraft({ speciesId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
              >
                <option value="">— Не выбран —</option>
                {catalogs.species.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Class Saving Throws (DM-only) & Background Origin Feat Summary */}
          {(selectedClass || selectedBg) && (
            <div className="grid md:grid-cols-2 gap-3">
              {selectedClass && (
                <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-sky-300 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 shrink-0" />
                      <span>Владение спасбросками</span>
                    </span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/40 text-sky-300">
                      Только ДМ
                    </span>
                  </div>
                  {savingThrowAbilityIds.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {savingThrowAbilityIds.map((abId) => {
                        const ab = catalogs.abilities.find((a) => a.id === abId);
                        if (!ab) return null;
                        const effScore = effectiveAbilities[ab.id];
                        const saveMod =
                          typeof effScore === 'number'
                            ? getAbilityModifier(effScore, catalogs.abilityModifiers) + profBonus
                            : null;
                        return (
                          <span
                            key={ab.id}
                            className="px-2 py-1 rounded-lg bg-[#131A26] border border-slate-700/90 text-xs text-slate-100 flex items-center gap-1.5"
                          >
                            <span>{ab.name}</span>
                            <span className="font-mono tabular-nums text-sky-300 font-semibold">
                              {saveMod !== null ? formatModifier(saveMod) : `+${profBonus}`}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">Не указаны в справочнике класса</p>
                  )}
                  {selectedClass.weaponProficiencyNote && (
                    <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                      Оружие класса: <span className="text-slate-200">{selectedClass.weaponProficiencyNote}</span>
                    </p>
                  )}
                </div>
              )}

              {selectedBg && (
                <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 shrink-0" />
                      <span>Черта предыстории</span>
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">{selectedBg.name}</span>
                  </div>
                  {bgFeat ? (
                    <>
                      <div className="text-xs font-semibold text-slate-100">{bgFeat.name}</div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {bgFeat.description}
                      </p>
                    </>
                  ) : (
                    <p className="text-[11px] text-slate-500">Черта не указана в справочнике</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Section 2: Level/XP, HP, Auto КЗ, Auto Initiative, Gold */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-slate-800">
            <label className="space-y-1.5">
              <span className="text-xs text-slate-400 flex items-center justify-between">
                <span>Опыт (XP)</span>
                <span className="font-mono text-amber-400 font-semibold">Ур. {derivedLevel}</span>
              </span>
              <input
                type="number"
                min={0}
                value={draft.xp}
                onChange={(e) => onUpdateDraft({ xp: Math.max(0, Number(e.target.value) || 0) })}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 font-mono tabular-nums text-sm text-slate-100"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs text-slate-400">Макс. HP</span>
              <input
                type="number"
                min={1}
                placeholder="10"
                value={draft.maxHp ?? ''}
                onChange={(e) =>
                  onUpdateDraft({
                    maxHp: e.target.value === '' ? null : Math.max(1, Number(e.target.value) || 1),
                  })
                }
                className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 font-mono tabular-nums text-sm text-slate-100"
              />
            </label>

            <div className="space-y-1.5">
              <span className="text-xs text-slate-400 block">Класс Защиты (КЗ)</span>
              <div
                className="px-3 py-2 rounded-lg bg-[#0B0F17]/70 border border-slate-800/80 font-mono tabular-nums text-sm text-slate-200 flex items-center justify-between"
                title="Рассчитывается автоматически: 10 + модификатор Ловкости (и доспехи/щит)"
              >
                <span>{derivedAc}</span>
                <span className="text-[10px] text-slate-500">10+ЛОВ</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs text-slate-400 block">Инициатива</span>
              <div
                className="px-3 py-2 rounded-lg bg-[#0B0F17]/70 border border-slate-800/80 font-mono tabular-nums text-sm text-sky-400 flex items-center justify-between"
                title="Рассчитывается автоматически: 10 + модификатор Ловкости"
              >
                <span>{derivedInit}</span>
                <span className="text-[10px] text-slate-500">10+ЛОВ</span>
              </div>
            </div>

            <label className="space-y-1.5">
              <span className="text-xs text-slate-400">Стартовое золото</span>
              <input
                type="number"
                min={0}
                value={draft.gold}
                onChange={(e) => onUpdateDraft({ gold: Math.max(0, Number(e.target.value) || 0) })}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 font-mono tabular-nums text-sm text-amber-400"
              />
            </label>
          </div>

          {/* Live Hit Die / HP per level helper for DM dice rolls */}
          {selectedClass && (
            <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/35 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <Dices className="w-3.5 h-3.5 shrink-0" />
                  <span>Хиты за уровень ({selectedClass.name}): {hitDieInfo.hint}</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Бросьте{' '}
                  <span className="font-mono font-semibold text-amber-300">
                    {derivedLevel}×1к{hitDieInfo.hitDie}
                  </span>{' '}
                  и прибавьте мод. ТЕЛ ({formatModifier(conMod)}) за каждый уровень. Среднее значение:{' '}
                  <span className="font-mono font-semibold text-slate-100">
                    {averageHpPerLevel} HP/ур.
                    {derivedLevel > 1 ? ` (итого ${suggestedTotalAvgHp} HP)` : ''}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => onUpdateDraft({ maxHp: suggestedTotalAvgHp })}
                className="px-2.5 py-1.5 rounded-lg bg-[#0B0F17] hover:bg-slate-800 border border-amber-500/50 text-[11px] font-medium text-amber-300 transition-colors shrink-0"
              >
                Подставить среднее ({suggestedTotalAvgHp})
              </button>
            </div>
          )}

          {/* Section 3: Abilities + Background +3 Points Distribution */}
          <div className="space-y-2.5 pt-4 border-t border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-slate-200">Характеристики</h3>
              {bgEligibleAbilityIds.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span
                    className={`font-mono tabular-nums font-medium ${
                      bgBonusTotal === 3 ? 'text-emerald-400' : 'text-amber-300'
                    }`}
                  >
                    Бонус предыстории: {bgBonusTotal} / 3 (макс. +2 на характеристику)
                  </span>
                  <button
                    type="button"
                    onClick={handleApplyEvenBgBonuses}
                    className="px-2 py-0.5 rounded bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
                  >
                    +1 / +1 / +1
                  </button>
                  {bgBonusTotal > 0 && (
                    <button
                      type="button"
                      onClick={handleResetBgBonuses}
                      className="px-2 py-0.5 rounded bg-[#0B0F17] hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      Сбросить
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-[11px] text-slate-400">
                  Пустые значения при сохранении получат 10
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {catalogs.abilities.map((ab) => {
                const rawVal = draft.abilities[ab.id];
                const hasVal = typeof rawVal === 'number';
                const isBgEligible = bgEligibleAbilityIds.includes(ab.id);
                const bgBonus = cleanBgBonuses[ab.id] ?? 0;
                const effVal = effectiveAbilities[ab.id];
                const mod =
                  typeof effVal === 'number'
                    ? getAbilityModifier(effVal, catalogs.abilityModifiers)
                    : null;

                return (
                  <div
                    key={ab.id}
                    className={`p-2.5 rounded-xl bg-[#0B0F17] border space-y-1.5 transition-colors ${
                      bgBonus > 0
                        ? 'border-amber-500/70'
                        : isBgEligible
                          ? 'border-amber-500/35'
                          : 'border-slate-800'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-[11px] font-medium text-slate-300 truncate">
                        {ab.name}
                      </span>
                      <span className="text-[11px] font-mono tabular-nums font-bold text-amber-400">
                        {mod !== null ? formatModifier(mod) : '—'}
                      </span>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      placeholder="10"
                      value={hasVal ? rawVal : ''}
                      onChange={(e) => {
                        const parsed =
                          e.target.value === ''
                            ? null
                            : Math.max(1, Math.min(30, Number(e.target.value) || 10));
                        onUpdateDraft({
                          abilities: { [ab.id]: parsed },
                        });
                      }}
                      className="w-full px-2 py-1.5 rounded bg-[#131A26] border border-slate-800 font-mono tabular-nums text-sm font-semibold text-center text-slate-100"
                    />
                    {isBgEligible && (
                      <div className="pt-1 border-t border-slate-800/80 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            disabled={bgBonus <= 0}
                            onClick={() => handleAdjustBgBonus(ab.id, -1)}
                            className="w-6 h-6 rounded bg-[#131A26] hover:bg-slate-800 disabled:opacity-30 border border-slate-700 flex items-center justify-center text-slate-200"
                            aria-label={`Уменьшить бонус ${ab.name}`}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span
                            className={`text-xs font-mono tabular-nums font-semibold ${
                              bgBonus > 0 ? 'text-amber-400' : 'text-slate-500'
                            }`}
                          >
                            +{bgBonus}
                          </span>
                          <button
                            type="button"
                            disabled={bgBonus >= 2 || bgBonusTotal >= 3}
                            onClick={() => handleAdjustBgBonus(ab.id, 1)}
                            className="w-6 h-6 rounded bg-[#131A26] hover:bg-slate-800 disabled:opacity-30 border border-slate-700 flex items-center justify-center text-amber-300"
                            aria-label={`Увеличить бонус ${ab.name}`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        {bgBonus > 0 && typeof effVal === 'number' && (
                          <div className="text-[10px] font-mono tabular-nums text-center text-amber-300/90">
                            Итого: {effVal}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Proficiencies & Skills Side-by-Side */}
          <div className="grid md:grid-cols-2 gap-5 pt-4 border-t border-slate-800">
            {/* Learned Proficiencies */}
            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-xs font-semibold text-slate-200">
                  Владение оружием и доспехами ({draft.proficiencyIds.length})
                </h3>
                {selectedClass && (
                  <span className="text-[11px] text-slate-400">По умолчанию от класса</span>
                )}
              </div>
              <div className="space-y-1.5">
                {catalogs.proficiencies.map((pr) => {
                  const active = draft.proficiencyIds.includes(pr.id);
                  const fromClass = classDefaultProfSet.has(pr.id);
                  return (
                    <button
                      key={pr.id}
                      type="button"
                      onClick={() => handleToggleProficiency(pr.id)}
                      className={`w-full px-3 py-2 rounded-lg border text-left flex items-center justify-between gap-2 text-xs transition-colors ${
                        active
                          ? 'bg-amber-500/15 border-amber-500/60 text-slate-100'
                          : 'bg-[#0B0F17] border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="truncate font-medium flex items-center gap-1.5 min-w-0">
                        <span className="truncate">{pr.name}</span>
                        {fromClass && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800/90 border border-slate-700 text-[10px] text-amber-300 shrink-0">
                            Класс
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] shrink-0">
                        {active ? 'Изучено' : 'Нет'}
                      </span>
                    </button>
                  );
                })}
              </div>
              {selectedClass?.weaponProficiencyNote && (
                <p className="text-[11px] text-amber-200/90 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1.5">
                  {selectedClass.weaponProficiencyNote}
                </p>
              )}
            </div>

            {/* Proficient & Expertise Skills (Strict PHB 2024 Background + Class Filter) */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-xs font-semibold text-slate-200">
                  Навыки
                  {selectedClass
                    ? ` (Предыстория: ${bgLockedSkillIds.length} · Класс: ${chosenClassSkillIds.length}/${classSkillLimit})`
                    : ` (${draft.proficientSkillIds.length})`}
                </h3>
                <span className="text-[11px] text-slate-400">
                  БМ +{profBonus} (×2 = +{profBonus * 2})
                </span>
              </div>

              {!selectedClass && creationVisibleSkills.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#0B0F17] border border-slate-800 text-xs text-slate-400 leading-relaxed">
                  Выберите <span className="text-slate-200 font-medium">Предысторию</span> и{' '}
                  <span className="text-slate-200 font-medium">Класс</span>, чтобы увидеть предвыбранные и доступные для выбора навыки персонажа.
                </div>
              ) : (
                <>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/80 rounded-xl bg-[#0B0F17] border border-slate-800">
                    {creationVisibleSkills.map((sk) => {
                      const isBgLocked = bgLockedSkillSet.has(sk.id);
                      const isExp = expertiseSkillIds.includes(sk.id);
                      const active = isBgLocked || isExp || draft.proficientSkillIds.includes(sk.id);
                      const classLimitReached =
                        !isBgLocked &&
                        !active &&
                        Boolean(selectedClass) &&
                        classSkillLimit > 0 &&
                        chosenClassSkillIds.length >= classSkillLimit;

                      const ab = catalogs.abilities.find((a) => a.id === sk.abilityId);
                      const effScore = effectiveAbilities[sk.abilityId];
                      const bonusAdd = isExp ? profBonus * 2 : active ? profBonus : 0;
                      const mod =
                        typeof effScore === 'number'
                          ? getAbilityModifier(effScore, catalogs.abilityModifiers) + bonusAdd
                          : null;

                      return (
                        <div
                          key={sk.id}
                          className={`px-3 py-1.5 flex items-center justify-between gap-2 text-xs transition-colors ${
                            isExp
                              ? 'bg-sky-500/10 text-slate-100'
                              : isBgLocked
                                ? 'bg-emerald-500/10 text-slate-100'
                                : active
                                  ? 'bg-amber-500/10 text-slate-100'
                                  : classLimitReached
                                    ? 'text-slate-500 opacity-55'
                                    : 'text-slate-300 hover:bg-slate-800/40'
                          }`}
                        >
                          <button
                            type="button"
                            disabled={isBgLocked || classLimitReached}
                            onClick={() => handleToggleSkill(sk.id)}
                            title={
                              isBgLocked
                                ? 'Навык предыстории (выдан автоматически, отключить нельзя)'
                                : classLimitReached
                                  ? `Выбрано максимум классовых навыков (${classSkillLimit})`
                                  : undefined
                            }
                            className="flex-1 py-0.5 text-left flex items-center gap-2 min-w-0 disabled:cursor-default"
                          >
                            <span
                              className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                isExp
                                  ? 'bg-sky-400 border-sky-400 text-slate-950'
                                  : isBgLocked
                                    ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                                    : active
                                      ? 'bg-amber-500 border-amber-500 text-slate-950'
                                      : 'border-slate-600'
                              }`}
                            >
                              {isBgLocked ? (
                                <Lock className="w-2.5 h-2.5" />
                              ) : active ? (
                                <Check className="w-2.5 h-2.5" />
                              ) : null}
                            </span>
                            <span className="truncate font-medium">{sk.name}</span>
                            <span className="text-[10px] font-mono text-slate-500 shrink-0">
                              {ab?.shortName ?? '—'}
                            </span>
                            {isBgLocked && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-[10px] text-emerald-300 shrink-0">
                                Предыстория
                              </span>
                            )}
                          </button>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={classLimitReached}
                              onClick={() => handleToggleExpertise(sk.id)}
                              title="Экспертиза (бонус владения ×2)"
                              className={`px-1.5 py-0.5 rounded border text-[10px] font-mono font-semibold transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${
                                isExp
                                  ? 'bg-sky-500/25 border-sky-400/80 text-sky-300'
                                  : 'border-slate-800 text-slate-500 hover:text-sky-300 hover:border-slate-700'
                              }`}
                            >
                              ×2
                            </button>
                            <span
                              className={`w-8 text-right font-mono tabular-nums font-semibold ${
                                isExp
                                  ? 'text-sky-300'
                                  : isBgLocked
                                    ? 'text-emerald-400'
                                    : active
                                      ? 'text-amber-400'
                                      : 'text-slate-500'
                              }`}
                            >
                              {mod !== null ? formatModifier(mod) : '—'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {!selectedClass && (
                    <p className="text-[11px] text-slate-400">
                      Выберите класс, чтобы открыть список классовых навыков для выбора.
                    </p>
                  )}
                  {selectedClass && (
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Показаны только навыки предыстории (фиксированы) и доступные для класса. Остальные классовые навыки можно будет изучить в ходе игры.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Section 4.2: Unlocked Class Parameters & Features Preview */}
          {selectedClass &&
            (classResourcesAtLevel.length > 0 ||
              previewClassFeatures.length > 0 ||
              previewSubclassFeatures.length > 0) && (
              <div className="pt-4 border-t border-slate-800 space-y-2.5">
                <div className="rounded-xl bg-[#0B0F17] border border-slate-800 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowFeaturesPreview((v) => !v)}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-xs font-semibold text-slate-200">
                        Умения и параметры класса на {derivedLevel} уровне
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 font-mono text-[10px] text-amber-300">
                        БМ +{profBonus}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        ({previewClassFeatures.length + previewSubclassFeatures.length} умений)
                      </span>
                    </div>
                    {showFeaturesPreview ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {classResourcesAtLevel.length > 0 && (
                    <div className="px-3.5 pb-2.5 flex flex-wrap gap-1.5">
                      {classResourcesAtLevel.map((res) => (
                        <span
                          key={res.id}
                          className="px-2 py-0.5 rounded-md bg-[#131A26] border border-slate-700 text-[11px] text-slate-300"
                        >
                          {res.name}:{' '}
                          <span className="font-mono font-semibold text-amber-300">
                            {res.value}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}

                  {showFeaturesPreview && (
                    <div className="px-3.5 pb-3 pt-2 border-t border-slate-800/80 space-y-2 max-h-60 overflow-y-auto">
                      {previewClassFeatures.map((feat) => (
                        <div key={feat.id} className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-100">
                            <span className="font-mono text-[10px] text-amber-400">
                              Ур. {feat.level}
                            </span>
                            <span>{feat.name}</span>
                          </div>
                          {feat.description && (
                            <p className="text-[11px] text-slate-400 leading-relaxed whitespace-pre-line line-clamp-3">
                              {feat.description}
                            </p>
                          )}
                        </div>
                      ))}
                      {previewSubclassFeatures.map((feat) => (
                        <div key={feat.id} className="space-y-0.5 pt-1 border-t border-slate-800/60">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-200">
                            <GitBranch className="w-3 h-3 text-violet-400 shrink-0" />
                            <span className="font-mono text-[10px] text-violet-300">
                              Ур. {feat.level}
                            </span>
                            <span>{feat.name}</span>
                          </div>
                          {feat.description && (
                            <p className="text-[11px] text-slate-400 leading-relaxed whitespace-pre-line line-clamp-3">
                              {feat.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* Section 4.5: Vision & Senses */}
          <div className="pt-4 border-t border-slate-800 space-y-2.5">
            <VisionSelector
              catalogVisions={catalogs.visions}
              value={draft.visions ?? []}
              onChange={(nextVisions) => onUpdateDraft({ visions: nextVisions })}
              title="Зрение персонажа"
            />
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-300">
                Чувства (дополнительно, необязательно)
              </span>
              <input
                type="text"
                value={draft.senses ?? ''}
                onChange={(e) => onUpdateDraft({ senses: e.target.value })}
                placeholder="Например: пасс. Восприятие 13, обострённый слух"
                className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100"
              />
            </label>
          </div>

          {/* Section 5: Optional Private Note */}
          <label className="block space-y-1.5 pt-4 border-t border-slate-800">
            <span className="text-xs font-medium text-slate-300">
              Личная заметка для игрока (необязательно)
            </span>
            <textarea
              rows={2}
              value={draft.privateNote}
              onChange={(e) => onUpdateDraft({ privateNote: e.target.value })}
              placeholder="Стартовая завязка или секретная информация для этого героя..."
              className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-100 resize-none"
            />
          </label>
        </div>

        {/* Footer Actions */}
        <footer className="shrink-0 px-5 py-3.5 border-t border-slate-800 bg-[#0B0F17] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onReject}
            className="px-3 py-2 rounded-lg bg-red-950/40 hover:bg-red-900/50 border border-red-900/60 text-xs font-medium text-red-300 flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Отклонить заявку</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onMinimize}
              className="px-3.5 py-2 rounded-lg bg-[#131A26] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
            >
              Свернуть
            </button>
            <button
              type="button"
              onClick={onFinalize}
              disabled={!canFinalize}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Сохранить персонажа</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
