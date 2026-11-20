import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Backpack,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Coins,
  Compass,
  FlaskConical,
  KeyRound,
  LogOut,
  MapPin,
  Package,
  RefreshCw,
  Shield,
  Sparkles,
  Sword,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import {
  computeLevelFromXp,
  computePlayerAcDetails,
  formatModifier,
  getAbilityModifier,
  getArmorCategoryLabel,
  getNextLevelThreshold,
  getProficiencyBonus,
  getWeaponCategoryLabel,
  getWeaponRangeLabel,
  sortLevels,
} from '../../shared/catalogDefaults';
import type { InventoryItem, ItemCategory, UserAccount } from '../../shared/types';
import { useGameSocket } from '../useGameSocket';

interface PlayerViewProps {
  onNavigate: (path: string) => void;
}

type MobileTab = 'inventory' | 'hero' | 'events';

const ACCOUNT_STORAGE_KEY = 'dnd_account_id';
const PLAYER_STORAGE_KEY = 'dnd_selected_player_id';

function getCategoryLabel(category: ItemCategory): string {
  switch (category) {
    case 'weapon':
      return 'Оружие';
    case 'armor':
      return 'Броня';
    case 'potion':
      return 'Зелье';
    case 'quest':
      return 'Особое';
    default:
      return 'Снаряжение';
  }
}

function CategoryIcon({ category }: { category: ItemCategory }) {
  switch (category) {
    case 'weapon':
      return <Sword className="w-4 h-4 text-amber-400" />;
    case 'armor':
      return <Shield className="w-4 h-4 text-sky-400" />;
    case 'potion':
      return <FlaskConical className="w-4 h-4 text-emerald-400" />;
    case 'quest':
      return <KeyRound className="w-4 h-4 text-amber-300" />;
    default:
      return <Package className="w-4 h-4 text-slate-300" />;
  }
}

export function PlayerView({ onNavigate }: PlayerViewProps) {
  const [accountId, setAccountId] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    return window.localStorage.getItem(ACCOUNT_STORAGE_KEY) || undefined;
  });
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    return window.localStorage.getItem(PLAYER_STORAGE_KEY) || undefined;
  });

  const [justRegisteredAccountId, setJustRegisteredAccountId] = useState<string | null>(null);
  const [registerName, setRegisterName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const [activeTab, setActiveTab] = useState<MobileTab>('hero');
  const [confirmUseId, setConfirmUseId] = useState<string | null>(null);
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);
  const [onlyProficientSkills, setOnlyProficientSkills] = useState(false);

  const handleAccountRegistered = useCallback((account: UserAccount) => {
    window.localStorage.setItem(ACCOUNT_STORAGE_KEY, account.id);
    window.localStorage.removeItem(PLAYER_STORAGE_KEY);
    setJustRegisteredAccountId(account.id);
    setAccountId(account.id);
    setSelectedPlayerId(undefined);
    setRegisterName('');
    setAuthError(null);
    setIsRegistering(false);
  }, []);

  const { status, playerState, lastError, errorNotice, clearError, send } = useGameSocket({
    role: 'player',
    accountId,
    playerId: selectedPlayerId,
    onAccountRegistered: handleAccountRegistered,
  });

  // Auto-dismiss equip/action error notifications after 6 seconds
  useEffect(() => {
    if (!errorNotice) return;
    const timer = setTimeout(() => {
      clearError();
    }, 6000);
    return () => clearTimeout(timer);
  }, [errorNotice, clearError]);

  // Clear pending flag once server confirms the registered account in state
  useEffect(() => {
    if (
      justRegisteredAccountId &&
      playerState?.currentAccount?.id === justRegisteredAccountId
    ) {
      setJustRegisteredAccountId(null);
    }
  }, [justRegisteredAccountId, playerState?.currentAccount?.id]);

  // Drop stale localStorage accountId if it no longer exists on server
  useEffect(() => {
    if (!accountId || !playerState) return;
    if (justRegisteredAccountId === accountId) return;
    const exists = playerState.accounts.some((a) => a.id === accountId);
    if (!exists) {
      window.localStorage.removeItem(ACCOUNT_STORAGE_KEY);
      window.localStorage.removeItem(PLAYER_STORAGE_KEY);
      setAccountId(undefined);
      setSelectedPlayerId(undefined);
    }
  }, [accountId, justRegisteredAccountId, playerState]);

  // Drop stale localStorage playerId if it no longer belongs to this account
  useEffect(() => {
    if (!selectedPlayerId || !playerState?.currentAccount) return;
    const owned = playerState.myCharacters.some((p) => p.id === selectedPlayerId);
    if (!owned) {
      window.localStorage.removeItem(PLAYER_STORAGE_KEY);
      setSelectedPlayerId(undefined);
    }
  }, [playerState, selectedPlayerId]);

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = registerName.trim();
    if (!trimmed) {
      setAuthError('Введите ваше имя для входа');
      return;
    }
    setAuthError(null);
    setIsRegistering(true);
    send({ type: 'account:register', name: trimmed });
  };

  const handlePickExistingAccount = (id: string) => {
    window.localStorage.setItem(ACCOUNT_STORAGE_KEY, id);
    window.localStorage.removeItem(PLAYER_STORAGE_KEY);
    setAccountId(id);
    setSelectedPlayerId(undefined);
    send({ type: 'join', role: 'player', accountId: id, playerId: undefined });
  };

  const handleLogoutAccount = () => {
    window.localStorage.removeItem(ACCOUNT_STORAGE_KEY);
    window.localStorage.removeItem(PLAYER_STORAGE_KEY);
    setJustRegisteredAccountId(null);
    setAccountId(undefined);
    setSelectedPlayerId(undefined);
    send({ type: 'join', role: 'player', accountId: undefined, playerId: undefined });
  };

  const handleSelectPlayer = (id: string) => {
    if (!accountId) return;
    window.localStorage.setItem(PLAYER_STORAGE_KEY, id);
    setSelectedPlayerId(id);
    send({ type: 'join', role: 'player', accountId, playerId: id });
  };

  const handleSwitchPlayer = () => {
    window.localStorage.removeItem(PLAYER_STORAGE_KEY);
    setSelectedPlayerId(undefined);
    send({ type: 'join', role: 'player', accountId, playerId: undefined });
  };

  const handleRequestCreation = () => {
    if (!playerState?.currentAccount) return;
    send({
      type: 'player:requestCharacterCreation',
      accountId: playerState.currentAccount.id,
    });
  };

  const handleCancelCreation = () => {
    if (!playerState?.currentAccount || !playerState.myCreationRequest) return;
    send({
      type: 'player:cancelCharacterCreation',
      accountId: playerState.currentAccount.id,
      requestId: playerState.myCreationRequest.id,
    });
  };

  // Initial socket boot
  if (!playerState) {
    return (
      <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="text-base font-medium text-slate-200">Подключение к столу...</p>
          <p className="text-sm text-slate-400">Синхронизация с сервером мастера</p>
        </div>
      </div>
    );
  }

  // Wait for account sync when accountId is valid/just-registered
  if (accountId && (!playerState.currentAccount || playerState.currentAccount.id !== accountId)) {
    const accountExists =
      justRegisteredAccountId === accountId ||
      playerState.accounts.some((a) => a.id === accountId);
    if (accountExists) {
      return (
        <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex items-center justify-center p-6">
          <div className="text-center space-y-2">
            <p className="text-base font-medium text-slate-200">Вход в учетную запись...</p>
            <p className="text-sm text-slate-400">Загрузка списка ваших персонажей</p>
          </div>
        </div>
      );
    }
  }

  // STEP 1: LOCAL ACCOUNT REGISTRATION / SELECTION
  if (!accountId || !playerState.currentAccount) {
    return (
      <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col">
        <header className="h-14 px-4 border-b border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="text-sm font-semibold text-slate-100 min-h-[44px] flex items-center"
          >
            Tabletop Sync
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              aria-hidden="true"
            />
            <span>{status === 'connected' ? 'В сети' : 'Связь...'}</span>
          </div>
        </header>

        <main className="flex-1 w-full max-w-md mx-auto px-4 py-8 space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight text-slate-100">
              Вход участника
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Представьтесь, чтобы сервер запомнил вас на этом устройстве. К одной учетной записи можно привязать несколько персонажей.
            </p>
          </div>

          <form
            onSubmit={handleRegisterSubmit}
            className="rounded-2xl bg-[#131A26] border border-slate-800 p-5 space-y-4"
          >
            <div className="space-y-1.5">
              <label htmlFor="player-account-name" className="block text-xs font-medium text-slate-300">
                Ваше имя
              </label>
              <input
                id="player-account-name"
                type="text"
                autoComplete="name"
                maxLength={40}
                value={registerName}
                onChange={(e) => {
                  setRegisterName(e.target.value);
                  if (authError) setAuthError(null);
                }}
                placeholder="Например: Алексей"
                className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl bg-[#0B0F17] border border-slate-700 text-base text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {(authError || lastError) && (
              <p className="text-xs text-red-400">{authError || lastError}</p>
            )}

            <button
              type="submit"
              disabled={isRegistering}
              className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] disabled:opacity-60 text-slate-950 text-sm font-semibold transition-all"
            >
              {isRegistering ? 'Входим...' : 'Войти без пароля'}
            </button>
          </form>

          {playerState.accounts.length > 0 && (
            <section className="space-y-2.5">
              <div className="text-xs font-medium text-slate-400 px-1">
                Уже зарегистрированные участники ({playerState.accounts.length})
              </div>
              <div className="space-y-2">
                {playerState.accounts.map((acc) => {
                  const charCount = playerState.availablePlayers.filter(
                    (p) => p.ownerAccountId === acc.id
                  ).length;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handlePickExistingAccount(acc.id)}
                      className="w-full min-h-[56px] px-4 py-3 rounded-2xl bg-[#131A26] hover:bg-slate-800/80 active:scale-[0.99] border border-slate-800 flex items-center justify-between gap-3 text-left transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono font-bold text-amber-400 shrink-0">
                          {acc.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-100 truncate">
                            {acc.name}
                          </div>
                          <div className="text-xs text-slate-400">
                            Персонажей: <span className="font-mono tabular-nums">{charCount}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </main>
      </div>
    );
  }

  // Wait for character sheet sync if a character owned by this account was selected
  if (selectedPlayerId && (!playerState.self || playerState.self.id !== selectedPlayerId)) {
    const pickedExists = playerState.myCharacters.some((p) => p.id === selectedPlayerId);
    if (pickedExists) {
      return (
        <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex items-center justify-center p-6">
          <div className="text-center space-y-2">
            <p className="text-base font-medium text-slate-200">Открываем лист персонажа...</p>
            <p className="text-sm text-slate-400">Получение анкеты и инвентаря с сервера</p>
          </div>
        </div>
      );
    }
  }

  const currentAccount = playerState.currentAccount;
  const { catalogs } = playerState;

  // STEP 2: ACCOUNT LOBBY + DM-GUIDED CHARACTER CREATION QUEUE & LIVE DRAFT ("БОЛВАНКА")
  if (!selectedPlayerId || !playerState.self) {
    const creationReq = playerState.myCreationRequest;
    const draft = creationReq?.draft ?? null;
    const draftClass = draft ? catalogs.classes.find((c) => c.id === draft.classId) : null;
    const draftSpecies = draft ? catalogs.species.find((s) => s.id === draft.speciesId) : null;
    const draftBackground = draft
      ? catalogs.backgrounds.find((b) => b.id === draft.backgroundId)
      : null;
    const draftLevel = draft ? computeLevelFromXp(draft.xp, catalogs.levels) : 1;
    const draftProfBonus = getProficiencyBonus(draftLevel);
    const draftDexVal = draft ? draft.abilities.dex : null;
    const draftDexMod =
      typeof draftDexVal === 'number' && !Number.isNaN(draftDexVal)
        ? getAbilityModifier(draftDexVal, catalogs.abilityModifiers)
        : null;
    const draftDerivedAc = draftDexMod !== null ? 10 + draftDexMod : null;
    const draftDerivedInit = draftDexMod !== null ? 10 + draftDexMod : null;
    const draftSkills = draft
      ? catalogs.skills.filter((sk) => draft.proficientSkillIds.includes(sk.id))
      : [];
    const draftProficiencies = draft
      ? catalogs.proficiencies.filter((pr) => draft.proficiencyIds.includes(pr.id))
      : [];

    return (
      <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col">
        <header className="sticky top-0 z-30 h-14 px-4 bg-[#0B0F17]/95 backdrop-blur-md border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="text-sm font-semibold text-slate-100 min-h-[44px] flex items-center shrink-0"
            >
              Tabletop Sync
            </button>
            <span className="text-slate-700" aria-hidden="true">/</span>
            <span className="text-xs font-medium text-amber-400 truncate">
              {currentAccount.name}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              title={status === 'connected' ? 'В сети' : 'Переподключение...'}
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={handleLogoutAccount}
              className="min-h-[44px] px-3 rounded-xl text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800/80 flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Выйти</span>
            </button>
          </div>
        </header>

        <main className="flex-1 w-full max-w-xl mx-auto px-4 py-6 space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-slate-100">
              Персонажи игрока {currentAccount.name}
            </h1>
            <p className="text-xs text-slate-400">
              {playerState.tvDisplay.phase === 'title_splash'
                ? `Сессия готовится к запуску · ${playerState.tvDisplay.campaignTitle}`
                : `Локальная сессия · ${playerState.scene.locationName}`}
            </p>
          </div>

          {/* LIVE CREATION SECTION */}
          {!creationReq && (
            <button
              type="button"
              onClick={handleRequestCreation}
              className="w-full min-h-[60px] px-5 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 flex items-center justify-between gap-4 text-left transition-all"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-950/15 flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-base font-semibold leading-tight">Создать персонажа</div>
                  <div className="text-xs text-slate-900/80 mt-0.5">
                    Встать в очередь — анкету заполнит мастер
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 shrink-0" />
            </button>
          )}

          {/* QUEUED STATE */}
          {creationReq && creationReq.status === 'queued' && (
            <section className="rounded-2xl bg-[#131A26] border border-amber-500/40 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold text-slate-100">
                      Заявка на создание в очереди
                    </h2>
                    <p className="text-xs font-mono tabular-nums text-amber-400">
                      Место в очереди: #{playerState.queuePosition ?? 1}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Мастер получил ваш запрос. Как только мастер начнет заполнять анкету, на этом экране появится живая карточка персонажа. Самостоятельное редактирование отключено.
              </p>

              <button
                type="button"
                onClick={handleCancelCreation}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 hover:text-slate-100 flex items-center gap-1.5 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Отменить заявку</span>
              </button>
            </section>
          )}

          {/* LIVE READ-ONLY CHARACTER BLANK ("БОЛВАНКА") WHILE DM FILLS FIELDS */}
          {creationReq && creationReq.status === 'in_progress' && draft && (
            <section className="space-y-4">
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/50 px-4 py-3.5 space-y-1">
                <div className="text-sm font-semibold text-amber-300">
                  Мастер заполняет вашего персонажа
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Данные появляются на экране автоматически по мере ввода мастером. После сохранения герой станет доступен для входа в игру.
                </p>
              </div>

              {/* Read-only Draft Card */}
              <div className="rounded-2xl bg-[#131A26] border border-slate-800 p-5 space-y-5">
                {/* Name & Identity */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center font-mono font-bold text-sm text-slate-950 shrink-0 transition-colors"
                      style={{ backgroundColor: draft.color || '#F59E0B' }}
                    >
                      {draft.name.trim() ? draft.name.trim().slice(0, 2).toUpperCase() : '??'}
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`text-lg font-semibold truncate ${
                          draft.name.trim() ? 'text-slate-100' : 'text-slate-500 italic'
                        }`}
                      >
                        {draft.name.trim() || 'Ожидание имени...'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {draftClass ? draftClass.name : 'Класс —'} ·{' '}
                        {draftSpecies ? draftSpecies.name : 'Вид —'} ·{' '}
                        {draftBackground ? draftBackground.name : 'Предыстория —'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-mono tabular-nums font-bold text-amber-400">
                      Ур. {draftLevel}
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-slate-400">
                      {draft.xp.toLocaleString('ru-RU')} XP
                    </div>
                  </div>
                </div>

                {/* Core Combat Numbers */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-800/80">
                  <div className="rounded-xl bg-[#0B0F17] border border-slate-800/90 p-3">
                    <div className="text-[11px] text-slate-400">Макс. HP</div>
                    <div
                      className={`mt-0.5 text-lg font-mono tabular-nums font-semibold ${
                        draft.maxHp !== null ? 'text-emerald-400' : 'text-slate-600'
                      }`}
                    >
                      {draft.maxHp !== null ? draft.maxHp : '—'}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#0B0F17] border border-slate-800/90 p-3">
                    <div className="text-[11px] text-slate-400">Класс Защиты</div>
                    <div
                      className={`mt-0.5 text-lg font-mono tabular-nums font-semibold ${
                        draftDerivedAc !== null ? 'text-slate-100' : 'text-slate-600'
                      }`}
                    >
                      {draftDerivedAc !== null ? draftDerivedAc : '—'}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#0B0F17] border border-slate-800/90 p-3">
                    <div className="text-[11px] text-slate-400">Инициатива</div>
                    <div
                      className={`mt-0.5 text-lg font-mono tabular-nums font-semibold ${
                        draftDerivedInit !== null ? 'text-sky-400' : 'text-slate-600'
                      }`}
                    >
                      {draftDerivedInit !== null ? draftDerivedInit : '—'}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#0B0F17] border border-slate-800/90 p-3">
                    <div className="text-[11px] text-slate-400">Золото</div>
                    <div className="mt-0.5 text-lg font-mono tabular-nums font-semibold text-amber-400">
                      {draft.gold} зм
                    </div>
                  </div>
                </div>

                {/* Abilities Grid */}
                <div className="space-y-2 pt-3 border-t border-slate-800/80">
                  <div className="text-xs font-semibold text-slate-300">Характеристики</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {catalogs.abilities.map((ab) => {
                      const val = draft.abilities[ab.id];
                      const hasValue = typeof val === 'number' && !Number.isNaN(val);
                      const mod = hasValue
                        ? getAbilityModifier(val, catalogs.abilityModifiers)
                        : null;
                      return (
                        <div
                          key={ab.id}
                          className={`rounded-xl border p-3 transition-colors ${
                            hasValue
                              ? 'bg-[#0B0F17] border-slate-700/90'
                              : 'bg-[#0B0F17]/50 border-slate-800/70'
                          }`}
                        >
                          <div className="flex items-baseline justify-between gap-1">
                            <span className="text-xs text-slate-300 truncate">{ab.name}</span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {ab.shortName}
                            </span>
                          </div>
                          <div className="mt-1 flex items-baseline justify-between gap-2">
                            <span
                              className={`text-xl font-mono tabular-nums font-bold ${
                                hasValue ? 'text-amber-400' : 'text-slate-600'
                              }`}
                            >
                              {mod !== null ? formatModifier(mod) : '—'}
                            </span>
                            <span
                              className={`text-xs font-mono tabular-nums ${
                                hasValue ? 'text-slate-200' : 'text-slate-600'
                              }`}
                            >
                              {hasValue ? val : '—'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Skills */}
                <div className="space-y-2 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">
                      Изученные навыки ({draftSkills.length})
                    </span>
                    <span className="font-mono tabular-nums text-slate-400">
                      БМ +{draftProfBonus}
                    </span>
                  </div>
                  {draftSkills.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Навыки появятся здесь, когда мастер отметит их в анкете.
                    </p>
                  ) : (
                    <div className="rounded-xl bg-[#0B0F17] border border-slate-800/90 divide-y divide-slate-800/80">
                      {draftSkills.map((sk) => {
                        const ab = catalogs.abilities.find((a) => a.id === sk.abilityId);
                        const abVal = draft.abilities[sk.abilityId];
                        const totalMod =
                          typeof abVal === 'number'
                            ? getAbilityModifier(abVal, catalogs.abilityModifiers) + draftProfBonus
                            : null;
                        return (
                          <div
                            key={sk.id}
                            className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <span className="font-medium text-slate-100">{sk.name}</span>
                              {ab && (
                                <span className="ml-1.5 text-slate-500">({ab.shortName})</span>
                              )}
                            </div>
                            <span className="font-mono tabular-nums font-semibold text-amber-400 shrink-0">
                              {totalMod !== null ? formatModifier(totalMod) : `+${draftProfBonus}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Selected Proficiencies */}
                <div className="space-y-2 pt-3 border-t border-slate-800/80">
                  <div className="text-xs font-semibold text-slate-300">
                    Изученные владения ({draftProficiencies.length})
                  </div>
                  {draftProficiencies.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Владения оружием и доспехами пока не указаны.
                    </p>
                  ) : (
                    <div className="rounded-xl bg-[#0B0F17] border border-slate-800/90 divide-y divide-slate-800/80">
                      {draftProficiencies.map((pr) => (
                        <div key={pr.id} className="px-3 py-2">
                          <div className="text-xs font-medium text-slate-100">{pr.name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Optional Private Note */}
                {draft.privateNote.trim() && (
                  <div className="space-y-1.5 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Личная заметка мастера</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">{draft.privateNote}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* OWNED CHARACTERS LIST */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-slate-200">
                Ваши персонажи ({playerState.myCharacters.length})
              </h2>
            </div>

            {playerState.myCharacters.length > 0 ? (
              <div className="space-y-2.5">
                {playerState.myCharacters.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPlayer(p.id)}
                    className="w-full min-h-[72px] px-4 py-3.5 rounded-2xl bg-[#131A26] hover:bg-slate-800/80 active:scale-[0.99] border border-slate-800 flex items-center justify-between gap-4 text-left transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-mono font-bold text-sm text-slate-950 shrink-0"
                        style={{ backgroundColor: p.color }}
                      >
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-slate-100 truncate">
                          {p.name}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                          <span>{p.role}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums text-amber-400">
                            Ур. {p.level}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            HP {p.hp}/{p.maxHp}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">КЗ {p.ac}</span>
                        </div>
                        {p.locationName && (
                          <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="truncate">
                              {p.locationName}
                              {p.locationNote ? ` · ${p.locationNote}` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-[#131A26] border border-slate-800 text-center space-y-1.5">
                <p className="text-sm font-medium text-slate-300">
                  У вас пока нет готовых персонажей
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {creationReq
                    ? 'Дождитесь, пока мастер завершит заполнение анкеты и сохранит героя.'
                    : 'Нажмите «Создать персонажа» выше, чтобы отправить заявку мастеру.'}
                </p>
              </div>
            )}
          </section>
        </main>
      </div>
    );
  }

  // STEP 3: FULL IN-GAME CHARACTER SHEET
  const self = playerState.self;
  const classRef = catalogs.classes.find((c) => c.id === self.classId);
  const backgroundRef = catalogs.backgrounds.find((b) => b.id === self.backgroundId);
  const speciesRef = catalogs.species.find((s) => s.id === self.speciesId);

  const nextLevel = getNextLevelThreshold(self.xp, catalogs.levels);
  const sortedLevels = sortLevels(catalogs.levels);
  const currentLevelEntry =
    [...sortedLevels].reverse().find((l) => self.xp >= l.minXp) ?? sortedLevels[0];
  const currentMinXp = currentLevelEntry?.minXp ?? 0;
  const xpProgressPct = nextLevel
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(((self.xp - currentMinXp) / Math.max(1, nextLevel.minXp - currentMinXp)) * 100)
        )
      )
    : 100;
  const profBonus = getProficiencyBonus(self.level);

  const hpPct = Math.max(0, Math.min(100, Math.round((self.hp / Math.max(1, self.maxHp)) * 100)));
  const hpBarColor =
    hpPct <= 25 ? 'bg-red-500' : hpPct <= 55 ? 'bg-amber-500' : 'bg-emerald-500';
  const privateEventsCount = playerState.eventLog.filter((e) => e.scope === 'private').length;

  const learnedProficiencies = catalogs.proficiencies.filter((pr) =>
    self.proficiencyIds.includes(pr.id)
  );
  const visibleSkills = onlyProficientSkills
    ? catalogs.skills.filter((sk) => self.proficientSkillIds.includes(sk.id))
    : catalogs.skills;

  const handleToggleEquip = (item: InventoryItem) => {
    send({
      type: 'player:toggleEquip',
      playerId: self.id,
      itemId: item.id,
    });
  };

  const handleUseConsumable = (item: InventoryItem) => {
    if (confirmUseId !== item.id) {
      setConfirmUseId(item.id);
      return;
    }
    setConfirmUseId(null);
    send({
      type: 'player:useConsumable',
      playerId: self.id,
      itemId: item.id,
    });
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 pb-20">
      {/* Compact Sticky Mobile Top Bar (<= 56px) */}
      <header className="sticky top-0 z-30 h-14 px-4 bg-[#0B0F17]/95 backdrop-blur-md border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: self.color }}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-100 truncate leading-tight">
              {self.name}
            </div>
            <div className="text-[11px] text-slate-400 truncate leading-tight">
              {classRef?.name ?? self.role} · Ур. {self.level} · КЗ {self.ac}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 px-2">
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              aria-hidden="true"
            />
            <span className="font-mono tabular-nums">{self.hp}/{self.maxHp} HP</span>
          </div>

          <button
            type="button"
            onClick={handleSwitchPlayer}
            className="min-h-[44px] px-3 rounded-xl text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800/80 flex items-center gap-1.5 transition-colors"
            aria-label="К списку персонажей"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Персонажи</span>
          </button>
        </div>
      </header>

      {/* Prominent Equip/Action Denial Toast Banner */}
      {errorNotice && (
        <div
          role="alert"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md rounded-2xl bg-red-950/95 border border-red-500/70 px-4 py-3.5 shadow-2xl flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="text-xs font-semibold text-red-200">Невозможно экипировать</div>
            <p className="text-xs text-red-100 leading-relaxed">{errorNotice.message}</p>
          </div>
          <button
            type="button"
            onClick={clearError}
            className="p-1 rounded-lg text-red-300 hover:text-white hover:bg-red-900/60 shrink-0"
            aria-label="Закрыть уведомление"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Responsive Content */}
      <main className="w-full max-w-4xl mx-auto px-4 pt-4 space-y-5">
        {/* Staged Travel Banner when DM is preparing destination map */}
        {playerState.tvDisplay.phase === 'traveling' && (
          <div className="rounded-2xl p-4 border bg-amber-950/25 border-amber-500/40 flex items-start gap-3">
            <Compass className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0 space-y-0.5">
              <div className="text-xs font-semibold text-amber-300">
                В пути:{' '}
                {playerState.tvDisplay.fromLocationName
                  ? `${playerState.tvDisplay.fromLocationName} → `
                  : ''}
                {playerState.tvDisplay.toLocationName || playerState.scene.locationName}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {playerState.tvDisplay.travelMessage || 'Мастер готовит следующую локацию...'}
              </p>
            </div>
          </div>
        )}

        {/* Scene Banner Notification if active */}
        {playerState.scene.activeEvent && (
          <div
            className={`rounded-2xl p-4 border ${
              playerState.scene.activeEvent.tone === 'danger'
                ? 'bg-red-950/50 border-red-800/70'
                : playerState.scene.activeEvent.tone === 'reward'
                  ? 'bg-emerald-950/50 border-emerald-800/70'
                  : 'bg-[#131A26] border-amber-500/50'
            }`}
          >
            <div className="text-xs text-slate-400">
              {playerState.scene.locationName}
            </div>
            <div className="mt-0.5 text-sm font-semibold text-slate-100">
              {playerState.scene.activeEvent.title}
            </div>
            {playerState.scene.activeEvent.description && (
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                {playerState.scene.activeEvent.description}
              </p>
            )}
          </div>
        )}

        {/* TAB 1: PRIVATE INVENTORY (Hidden on TV!) */}
        {activeTab === 'inventory' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-lg font-semibold text-slate-100">Личный инвентарь</h1>
                <p className="text-xs text-slate-400">
                  Видно только на вашем устройстве · Скрыто на ТВ
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#131A26] border border-slate-800 text-sm font-mono tabular-nums text-amber-400 font-semibold shrink-0">
                <Coins className="w-4 h-4" />
                <span>{self.gold} зм</span>
              </div>
            </div>

            {self.inventory.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#131A26] border border-slate-800 text-center space-y-1.5">
                <p className="text-sm font-medium text-slate-300">Рюкзак пуст</p>
                <p className="text-xs text-slate-400">
                  Предметы, выданные мастером, появятся здесь автоматически.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl bg-[#131A26] border border-slate-800 divide-y divide-slate-800/80 overflow-hidden">
                {self.inventory.map((item) => (
                  <div key={item.id} className="p-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#0B0F17] border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                        <CategoryIcon category={item.category} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-100">
                            {item.name}
                          </span>
                          <span className="text-xs font-mono tabular-nums text-amber-400 font-semibold">
                            ×{item.quantity}
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          {item.weaponCategory
                            ? (() => {
                                const catalogW = item.catalogItemId
                                  ? catalogs.weapons.find((w) => w.id === item.catalogItemId)
                                  : undefined;
                                const range = item.weaponRangeType ?? catalogW?.rangeType;
                                return `${getWeaponCategoryLabel(item.weaponCategory)}${range ? ` · ${getWeaponRangeLabel(range)}` : ''}`;
                              })()
                            : item.armorCategory
                              ? getArmorCategoryLabel(item.armorCategory)
                              : getCategoryLabel(item.category)}
                          {item.equipped ? ' · Экипировано' : ''}
                        </div>
                        {item.category === 'weapon' && (item.damage || item.properties || item.mastery) && (
                          <div className="mt-1.5 text-[11px] text-slate-300 space-y-0.5">
                            {item.damage && (
                              <div>
                                <span className="text-slate-500">Урон: </span>
                                <span className="font-mono text-amber-300">{item.damage}</span>
                                {item.mastery && item.mastery !== '—' && (
                                  <span className="text-slate-400"> · Мастерство: {item.mastery}</span>
                                )}
                              </div>
                            )}
                            {item.properties && item.properties !== '—' && (
                              <div className="text-slate-400">Свойства: {item.properties}</div>
                            )}
                            {(item.weight || item.price) && (
                              <div className="text-slate-500 font-mono">
                                {[item.weight, item.price].filter(Boolean).join(' · ')}
                              </div>
                            )}
                          </div>
                        )}
                        {item.category === 'armor' && (item.armorClass || item.strengthReq || item.stealth) && (
                          <div className="mt-1.5 text-[11px] text-slate-300 space-y-0.5">
                            <div>
                              {item.armorClass && (
                                <>
                                  <span className="text-slate-500">КЗ: </span>
                                  <span className="font-mono text-sky-300">{item.armorClass}</span>
                                </>
                              )}
                              {item.strengthReq && item.strengthReq !== '—' && (
                                <span className="text-slate-400"> · {item.strengthReq}</span>
                              )}
                              {item.stealth && item.stealth !== '—' && (
                                <span className="text-slate-400"> · Скрытность: {item.stealth}</span>
                              )}
                            </div>
                            {(item.weight || item.price) && (
                              <div className="text-slate-500 font-mono">
                                {[item.weight, item.price].filter(Boolean).join(' · ')}
                              </div>
                            )}
                          </div>
                        )}
                        {item.description &&
                          item.category !== 'weapon' &&
                          item.category !== 'armor' && (
                            <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.category === 'potion' ? (
                        <button
                          type="button"
                          onClick={() => handleUseConsumable(item)}
                          className={`min-h-[44px] px-3 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
                            confirmUseId === item.id
                              ? 'bg-emerald-500 text-slate-950 font-semibold'
                              : 'bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 text-slate-200'
                          }`}
                        >
                          {confirmUseId === item.id ? 'Подтвердить' : 'Выпить'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleEquip(item)}
                          className={`min-h-[44px] px-3 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${
                            item.equipped
                              ? 'bg-amber-500/15 border-amber-500/60 text-amber-300'
                              : 'bg-[#0B0F17] border-slate-700 text-slate-300 hover:text-slate-100'
                          }`}
                        >
                          {item.equipped ? 'Надето' : 'Надеть'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: FULL CHARACTER SHEET */}
        {activeTab === 'hero' && (
          <section className="space-y-4">
            {/* Core Character Identity, HP & XP */}
            <div className="rounded-2xl bg-[#131A26] border border-slate-800 p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <h1 className="text-xl font-semibold text-slate-100 truncate">{self.name}</h1>
                  <p className="text-xs text-slate-400">
                    {classRef?.name ?? self.role} · {speciesRef?.name ?? '—'} ·{' '}
                    {backgroundRef?.name ?? '—'}
                  </p>
                  {self.locationName && (
                    <p className="text-xs text-amber-300/90 flex items-center gap-1.5 pt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">
                        {self.locationName}
                        {self.locationNote ? ` — ${self.locationNote}` : ''}
                      </span>
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-mono tabular-nums font-bold text-amber-400">
                    Уровень {self.level}
                  </div>
                  <div className="text-[11px] font-mono tabular-nums text-slate-400">
                    {self.xp.toLocaleString('ru-RU')} XP
                  </div>
                </div>
              </div>

              {/* XP Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Прогресс опыта</span>
                  <span className="font-mono tabular-nums">
                    {nextLevel
                      ? `${self.xp.toLocaleString('ru-RU')} / ${nextLevel.minXp.toLocaleString('ru-RU')} XP до ур. ${nextLevel.level}`
                      : 'Максимальный уровень'}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-200"
                    style={{ width: `${xpProgressPct}%` }}
                  />
                </div>
              </div>

              {/* Health Bar */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-400">Здоровье (HP)</span>
                  <span className="text-xl font-mono tabular-nums font-bold text-slate-100">
                    {self.hp} / {self.maxHp}
                    {self.tempHp > 0 && (
                      <span className="ml-1.5 text-sm text-sky-400">+{self.tempHp} врем.</span>
                    )}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-200 ${hpBarColor}`}
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
                <div>
                  <div className="text-[11px] text-slate-400">Класс Защиты</div>
                  <div className="text-lg font-mono tabular-nums font-semibold text-slate-100">
                    {self.ac}
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    {computePlayerAcDetails(self, catalogs).breakdown}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Инициатива</div>
                  <div className="text-lg font-mono tabular-nums font-semibold text-sky-400">
                    {self.initiative ?? 10}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Бонус мастерства</div>
                  <div className="text-lg font-mono tabular-nums font-semibold text-amber-400">
                    +{profBonus}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Золото</div>
                  <div className="text-lg font-mono tabular-nums font-semibold text-slate-100">
                    {self.gold} зм
                  </div>
                </div>
              </div>

              {self.conditions.length > 0 && (
                <div className="pt-3 border-t border-slate-800/80">
                  <div className="text-xs text-slate-400 mb-1">Активные состояния</div>
                  <p className="text-sm font-medium text-amber-300">
                    {self.conditions.join(' · ')}
                  </p>
                </div>
              )}
            </div>

            {/* Abilities Grid */}
            <div className="space-y-2.5">
              <h2 className="text-sm font-semibold text-slate-200 px-1">Характеристики</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {catalogs.abilities.map((ab) => {
                  const val = self.abilities[ab.id] ?? 10;
                  const mod = getAbilityModifier(val, catalogs.abilityModifiers);
                  return (
                    <div
                      key={ab.id}
                      className="rounded-2xl bg-[#131A26] border border-slate-800 p-3.5 space-y-1.5"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-medium text-slate-300 truncate">
                          {ab.name}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">{ab.shortName}</span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-2xl font-mono tabular-nums font-bold text-amber-400">
                          {formatModifier(mod)}
                        </span>
                        <span className="text-sm font-mono tabular-nums text-slate-300">
                          {val}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Skills with Linked Ability & Usage Example */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 px-1">
                <h2 className="text-sm font-semibold text-slate-200">
                  Навыки ({self.proficientSkillIds.length} изучено)
                </h2>
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#131A26] border border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setOnlyProficientSkills(false)}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      !onlyProficientSkills
                        ? 'bg-slate-800 text-amber-400 font-medium'
                        : 'text-slate-400'
                    }`}
                  >
                    Все
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnlyProficientSkills(true)}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      onlyProficientSkills
                        ? 'bg-slate-800 text-amber-400 font-medium'
                        : 'text-slate-400'
                    }`}
                  >
                    Изученные
                  </button>
                </div>
              </div>

              <div className="rounded-2xl bg-[#131A26] border border-slate-800 divide-y divide-slate-800/80 overflow-hidden">
                {visibleSkills.map((sk) => {
                  const isProf = self.proficientSkillIds.includes(sk.id);
                  const ab = catalogs.abilities.find((a) => a.id === sk.abilityId);
                  const baseScore = self.abilities[sk.abilityId] ?? 10;
                  const totalMod =
                    getAbilityModifier(baseScore, catalogs.abilityModifiers) +
                    (isProf ? profBonus : 0);
                  const isExpanded = expandedSkillId === sk.id;

                  return (
                    <div key={sk.id}>
                      <button
                        type="button"
                        onClick={() => setExpandedSkillId(isExpanded ? null : sk.id)}
                        className="w-full min-h-[48px] px-4 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isProf
                                ? 'bg-amber-500 border-amber-500 text-slate-950'
                                : 'border-slate-700'
                            }`}
                          >
                            {isProf && <Check className="w-2.5 h-2.5" />}
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-100 truncate">
                              {sk.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {ab ? ab.name : 'Без характеристики'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-sm font-mono tabular-nums font-semibold ${
                              isProf ? 'text-amber-400' : 'text-slate-300'
                            }`}
                          >
                            {formatModifier(totalMod)}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-slate-500 transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-3.5 pt-0.5 text-xs text-slate-300 leading-relaxed bg-[#0B0F17]/50">
                          <span className="text-slate-400">Пример использования: </span>
                          {sk.usageExample || 'Описание не заполнено в справочнике.'}
                        </div>
                      )}
                    </div>
                  );
                })}
                {visibleSkills.length === 0 && (
                  <div className="p-5 text-center text-xs text-slate-400">
                    Мастер пока не отметил изученные навыки для этого персонажа.
                  </div>
                )}
              </div>
            </div>

            {/* Learned Proficiencies */}
            <div className="rounded-2xl bg-[#131A26] border border-slate-800 p-5 space-y-2.5">
              <h2 className="text-sm font-semibold text-slate-200">
                Изученные владения ({learnedProficiencies.length})
              </h2>
              {learnedProficiencies.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Владения оружием и доспехами пока не указаны.
                </p>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {learnedProficiencies.map((pr) => (
                    <div key={pr.id} className="py-2 first:pt-0 last:pb-0">
                      <div className="text-xs font-medium text-slate-100">{pr.name}</div>
                      {pr.description && (
                        <div className="text-[11px] text-slate-400 mt-0.5">{pr.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Private DM Note */}
            <div className="rounded-2xl bg-[#131A26] border border-slate-800 p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
                <Sparkles className="w-4 h-4" />
                <span>Личная заметка от мастера</span>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">
                {self.privateNote
                  ? self.privateNote
                  : 'У вас пока нет секретных подсказок или личных заметок от мастера.'}
              </p>
            </div>
          </section>
        )}

        {/* TAB 3: PERSONAL & PUBLIC EVENTS */}
        {activeTab === 'events' && (
          <section className="space-y-3">
            <div>
              <h1 className="text-lg font-semibold text-slate-100">Журнал событий</h1>
              <p className="text-xs text-slate-400">
                Общие события сцены и личные сообщения от мастера
              </p>
            </div>

            <div className="space-y-2.5">
              {playerState.eventLog.map((evt) => (
                <div
                  key={evt.id}
                  className={`rounded-2xl p-4 border ${
                    evt.scope === 'private'
                      ? 'bg-amber-950/20 border-amber-700/50'
                      : 'bg-[#131A26] border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                    <span className={evt.scope === 'private' ? 'text-amber-400 font-medium' : ''}>
                      {evt.scope === 'private' ? 'Лично вам' : 'Общее событие'}
                    </span>
                    <span className="font-mono tabular-nums">
                      {new Date(evt.timestamp).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-100">{evt.title}</div>
                  {evt.message && (
                    <p className="mt-1 text-xs text-slate-300 leading-relaxed">{evt.message}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Fixed Bottom Mobile Thumb-Zone Tab Bar (<= 15% viewport height) */}
      <nav
        aria-label="Навигация игрока"
        className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#0B0F17]/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-3"
      >
        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === 'inventory' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Backpack className="w-5 h-5" />
          <span className="text-[11px] font-medium">Инвентарь</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hero')}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === 'hero' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[11px] font-medium">Герой</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('events')}
          className={`min-h-[44px] relative flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === 'events' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Bell className="w-5 h-5" />
            {privateEventsCount > 0 && (
              <span className="sr-only">Личных уведомлений: {privateEventsCount}</span>
            )}
          </div>
          <span className="text-[11px] font-medium">
            События {privateEventsCount > 0 ? `(${privateEventsCount})` : ''}
          </span>
        </button>
      </nav>
    </div>
  );
}
