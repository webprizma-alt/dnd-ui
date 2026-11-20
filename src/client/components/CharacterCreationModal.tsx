import React from 'react';
import { Check, Trash2, UserPlus, X } from 'lucide-react';
import {
  computeLevelFromXp,
  formatModifier,
  getAbilityModifier,
  getProficiencyBonus,
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
  const { draft } = request;
  const derivedLevel = computeLevelFromXp(draft.xp, catalogs.levels);
  const profBonus = getProficiencyBonus(derivedLevel);
  const dexRaw = draft.abilities.dex;
  const dexScore = typeof dexRaw === 'number' ? dexRaw : 10;
  const dexMod = getAbilityModifier(dexScore, catalogs.abilityModifiers);
  const derivedAc = 10 + dexMod;
  const derivedInit = 10 + dexMod;
  const canFinalize = draft.name.trim().length > 0;

  const expertiseSkillIds = draft.expertiseSkillIds ?? [];

  const handleToggleSkill = (skillId: string) => {
    const exists = draft.proficientSkillIds.includes(skillId);
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

            <label className="md:col-span-4 space-y-1.5">
              <span className="text-xs font-medium text-slate-300">Класс</span>
              <select
                value={draft.classId}
                onChange={(e) => onUpdateDraft({ classId: e.target.value })}
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

            <label className="md:col-span-4 space-y-1.5">
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

            <label className="md:col-span-4 space-y-1.5">
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

          {/* Section 3: Abilities */}
          <div className="space-y-2.5 pt-4 border-t border-slate-800">
            <div className="flex items-baseline justify-between">
              <h3 className="text-xs font-semibold text-slate-200">Характеристики</h3>
              <span className="text-[11px] text-slate-400">
                Пустые значения при сохранении получат 10
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {catalogs.abilities.map((ab) => {
                const rawVal = draft.abilities[ab.id];
                const hasVal = typeof rawVal === 'number';
                const mod = hasVal ? getAbilityModifier(rawVal, catalogs.abilityModifiers) : null;
                return (
                  <div
                    key={ab.id}
                    className="p-2.5 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-1.5"
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
                      placeholder="—"
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
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Proficiencies & Skills Side-by-Side */}
          <div className="grid md:grid-cols-2 gap-5 pt-4 border-t border-slate-800">
            {/* Learned Proficiencies */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-200">
                Изученные владения ({draft.proficiencyIds.length})
              </h3>
              <div className="space-y-1.5">
                {catalogs.proficiencies.map((pr) => {
                  const active = draft.proficiencyIds.includes(pr.id);
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
                      <span className="truncate font-medium">{pr.name}</span>
                      <span className="text-[11px] shrink-0">
                        {active ? 'Изучено' : 'Нет'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Proficient & Expertise Skills */}
            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-xs font-semibold text-slate-200">
                  Навыки ({draft.proficientSkillIds.length}
                  {expertiseSkillIds.length > 0 ? ` · ×2: ${expertiseSkillIds.length}` : ''})
                </h3>
                <span className="text-[11px] text-slate-400">
                  БМ +{profBonus} (×2 = +{profBonus * 2})
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/80 rounded-xl bg-[#0B0F17] border border-slate-800">
                {catalogs.skills.map((sk) => {
                  const isExp = expertiseSkillIds.includes(sk.id);
                  const active = isExp || draft.proficientSkillIds.includes(sk.id);
                  const ab = catalogs.abilities.find((a) => a.id === sk.abilityId);
                  const rawScore = draft.abilities[sk.abilityId];
                  const bonusAdd = isExp ? profBonus * 2 : active ? profBonus : 0;
                  const mod =
                    typeof rawScore === 'number'
                      ? getAbilityModifier(rawScore, catalogs.abilityModifiers) + bonusAdd
                      : null;

                  return (
                    <div
                      key={sk.id}
                      className={`px-3 py-1.5 flex items-center justify-between gap-2 text-xs transition-colors ${
                        isExp
                          ? 'bg-sky-500/10 text-slate-100'
                          : active
                            ? 'bg-amber-500/10 text-slate-100'
                            : 'text-slate-400 hover:bg-slate-800/40'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleSkill(sk.id)}
                        className="flex-1 py-0.5 text-left flex items-center gap-2 min-w-0"
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                            isExp
                              ? 'bg-sky-400 border-sky-400 text-slate-950'
                              : active
                                ? 'bg-amber-500 border-amber-500 text-slate-950'
                                : 'border-slate-600'
                          }`}
                        >
                          {active && <Check className="w-2.5 h-2.5" />}
                        </span>
                        <span className="truncate font-medium">{sk.name}</span>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">
                          {ab?.shortName ?? '—'}
                        </span>
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleExpertise(sk.id)}
                          title="Экспертиза (бонус владения ×2)"
                          className={`px-1.5 py-0.5 rounded border text-[10px] font-mono font-semibold transition-colors ${
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
            </div>
          </div>

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
