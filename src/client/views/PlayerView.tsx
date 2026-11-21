import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Backpack,
  Bell,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Coins,
  Compass,
  Eye,
  FlaskConical,
  GitBranch,
  HeartPulse,
  Image as ImageIcon,
  KeyRound,
  Layers,
  Loader2,
  LogOut,
  MapPin,
  Moon,
  Package,
  Pause,
  RefreshCw,
  Scale,
  Shield,
  Skull,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  Sword,
  Swords,
  User,
  UserPlus,
  X,
  Zap,
} from 'lucide-react';
import {
  computeEquippedHandsUsage,
  computeHeroActions,
  computeHeroEncumbrance,
  computeHeroSkillTotal,
  computeLevelFromXp,
  computePlayerAcDetails,
  computePlayerEffectiveSpeed,
  computePlayerInitiativeDetails,
  formatEntityVisions,
  formatGameClock,
  formatModifier,
  formatWeaponPropertiesSummary,
  formatWeightLb,
  getAbilityModifier,
  getActiveConditionEffects,
  getAmmoCapacityForPlayer,
  getArmorCategoryLabel,
  getClassProficiencyBonus,
  getClassResourcesAtLevel,
  getEffectiveDraftAbilities,
  getHeroClassFeatures,
  getHeroFeats,
  getHeroSubclassFeatures,
  getInventoryItemUnitWeightLb,
  getNextLevelThreshold,
  getWeaponCategoryLabel,
  getWeaponRangeLabel,
  getWeaponRequiredHands,
  hasHeroWeaponMasteryFeature,
  resolveGearCatalogItem,
  resolveWeaponMasteryRef,
  resolveWeaponPropertyRefs,
  resolveWeaponReachRange,
  sanitizeBackgroundAbilityBonuses,
  sortLevels,
} from '../../shared/catalogDefaults';
import type { InventoryItem, ItemCategory, UserAccount } from '../../shared/types';
import { compressImageFileToDataUrl } from '../imageUtils';
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
  const [expandedFeatureId, setExpandedFeatureId] = useState<string | null>(null);
  const [expandedConditionName, setExpandedConditionName] = useState<string | null>(null);
  const [expandedActionPropKey, setExpandedActionPropKey] = useState<string | null>(null);
  const [onlyProficientSkills, setOnlyProficientSkills] = useState(false);

  // Hero AI portrait generation modal state (used only inside entered hero sheet)
  const [portraitSheetOpen, setPortraitSheetOpen] = useState(false);
  const [capturedFaceDataUrl, setCapturedFaceDataUrl] = useState<string | null>(null);
  const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(false);
  const [portraitError, setPortraitError] = useState<string | null>(null);
  const [portraitSuccessNote, setPortraitSuccessNote] = useState<string | null>(null);
  const [clockNowMs, setClockNowMs] = useState(() => Date.now());
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setClockNowMs(Date.now()), 2000);
    return () => window.clearInterval(id);
  }, []);

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
    const draftBgFeat = draftBackground?.featId
      ? catalogs.feats.find((f) => f.id === draftBackground.featId) ?? null
      : null;
    const draftBgBonuses = draft
      ? sanitizeBackgroundAbilityBonuses(
          draft.backgroundAbilityBonuses,
          draft.backgroundId,
          catalogs
        )
      : {};
    const draftEffectiveAbilities = draft
      ? getEffectiveDraftAbilities(draft, catalogs)
      : {};
    const draftLevel = draft ? computeLevelFromXp(draft.xp, catalogs.levels) : 1;
    const draftProfBonus = getClassProficiencyBonus(draftLevel, draftClass);
    const draftSubclass =
      draft?.subclassId && draftLevel >= 3
        ? catalogs.subclasses.find((s) => s.id === draft.subclassId) ?? null
        : null;
    const draftClassResources = getClassResourcesAtLevel(draftClass, draftLevel);
    const draftClassFeatures = draft
      ? getHeroClassFeatures(draft.classId, draftLevel, catalogs)
      : [];
    const draftSubclassFeatures = draft
      ? getHeroSubclassFeatures(draft.classId, draft.subclassId, draftLevel, catalogs)
      : [];
    const draftDexVal = draft ? draftEffectiveAbilities.dex : null;
    const draftDexMod =
      typeof draftDexVal === 'number' && !Number.isNaN(draftDexVal)
        ? getAbilityModifier(draftDexVal, catalogs.abilityModifiers)
        : null;
    const draftDerivedAc = draftDexMod !== null ? 10 + draftDexMod : null;
    const draftDerivedInit = draftDexMod !== null ? 10 + draftDexMod : null;
    const draftSkills = draft
      ? catalogs.skills.filter(
          (sk) =>
            draft.proficientSkillIds.includes(sk.id) ||
            (draft.expertiseSkillIds ?? []).includes(sk.id)
        )
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
                        {draftClass ? draftClass.name : 'Класс —'}
                        {draftSubclass ? ` (${draftSubclass.name})` : ''} ·{' '}
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
                      const val = draftEffectiveAbilities[ab.id];
                      const bgBonus = draftBgBonuses[ab.id] ?? 0;
                      const hasValue = typeof val === 'number' && !Number.isNaN(val);
                      const mod = hasValue
                        ? getAbilityModifier(val, catalogs.abilityModifiers)
                        : null;
                      return (
                        <div
                          key={ab.id}
                          className={`rounded-xl border p-3 transition-colors ${
                            bgBonus > 0
                              ? 'bg-[#0B0F17] border-amber-500/60'
                              : hasValue
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
                            <span className="flex items-center gap-1">
                              {bgBonus > 0 && (
                                <span className="px-1 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-[10px] font-mono font-semibold text-amber-300">
                                  +{bgBonus}
                                </span>
                              )}
                              <span
                                className={`text-xs font-mono tabular-nums ${
                                  hasValue ? 'text-slate-200' : 'text-slate-600'
                                }`}
                              >
                                {hasValue ? val : '—'}
                              </span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Origin Feat Preview */}
                {draftBgFeat && (
                  <div className="space-y-1.5 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                      <Award className="w-3.5 h-3.5 shrink-0" />
                      <span>Черта предыстории: {draftBgFeat.name}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {draftBgFeat.description}
                    </p>
                  </div>
                )}

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
                        const isExp = (draft.expertiseSkillIds ?? []).includes(sk.id);
                        const bonusAdd = isExp ? draftProfBonus * 2 : draftProfBonus;
                        const abVal = draftEffectiveAbilities[sk.abilityId];
                        const totalMod =
                          typeof abVal === 'number'
                            ? getAbilityModifier(abVal, catalogs.abilityModifiers) + bonusAdd
                            : null;
                        return (
                          <div
                            key={sk.id}
                            className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-slate-100">{sk.name}</span>
                              {ab && (
                                <span className="text-slate-500">({ab.shortName})</span>
                              )}
                              {isExp && (
                                <span className="px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/60 text-[10px] font-mono font-semibold text-sky-300">
                                  Экспертиза ×2
                                </span>
                              )}
                            </div>
                            <span
                              className={`font-mono tabular-nums font-semibold shrink-0 ${
                                isExp ? 'text-sky-300' : 'text-amber-400'
                              }`}
                            >
                              {totalMod !== null ? formatModifier(totalMod) : `+${bonusAdd}`}
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
                  {draftClass?.weaponProficiencyNote && (
                    <p className="text-[11px] text-amber-200/90">
                      {draftClass.weaponProficiencyNote}
                    </p>
                  )}
                </div>

                {/* Live Class Parameters & Unlocked Features Preview */}
                {draftClass &&
                  (draftClassResources.length > 0 ||
                    draftClassFeatures.length > 0 ||
                    draftSubclassFeatures.length > 0) && (
                    <div className="space-y-2 pt-3 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-amber-400" />
                          <span>
                            Умения класса ({draftClassFeatures.length + draftSubclassFeatures.length})
                          </span>
                        </span>
                        <span className="font-mono text-amber-400">БМ +{draftProfBonus}</span>
                      </div>
                      {draftClassResources.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {draftClassResources.map((r) => (
                            <span
                              key={r.id}
                              className="px-2 py-0.5 rounded-md bg-[#0B0F17] border border-slate-800 text-[11px] text-slate-300"
                            >
                              {r.name}:{' '}
                              <span className="font-mono font-semibold text-amber-300">
                                {r.value}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {draftClassFeatures.map((f) => (
                          <span
                            key={f.id}
                            className="px-2 py-0.5 rounded-md bg-[#0B0F17] border border-slate-800 text-[11px] text-slate-200"
                          >
                            <span className="font-mono text-amber-400 mr-1">Ур.{f.level}</span>
                            {f.name}
                          </span>
                        ))}
                        {draftSubclassFeatures.map((f) => (
                          <span
                            key={f.id}
                            className="px-2 py-0.5 rounded-md bg-violet-500/15 border border-violet-500/40 text-[11px] text-violet-200"
                          >
                            <span className="font-mono text-violet-300 mr-1">Ур.{f.level}</span>
                            {f.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

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
                      {p.portraitUrl ? (
                        <img
                          src={p.portraitUrl}
                          alt={p.name}
                          className="w-11 h-11 rounded-full object-cover object-top border-2 shrink-0"
                          style={{ borderColor: p.color }}
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-mono font-bold text-sm text-slate-950 shrink-0"
                          style={{ backgroundColor: p.color }}
                        >
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
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
  const subclassRef =
    self.subclassId && self.level >= 3
      ? catalogs.subclasses.find((s) => s.id === self.subclassId) ?? null
      : null;
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
  const profBonus = getClassProficiencyBonus(self.level, classRef);
  const heroActions = computeHeroActions(self, catalogs);
  const classResources = getClassResourcesAtLevel(classRef, self.level);
  const unlockedClassFeatures = getHeroClassFeatures(self.classId, self.level, catalogs);
  const unlockedSubclassFeatures = getHeroSubclassFeatures(
    self.classId,
    self.subclassId,
    self.level,
    catalogs
  );
  const hasAvailableSubclasses = catalogs.subclasses.some((s) => s.classId === self.classId);
  const needsSubclassNotice = self.level >= 3 && !subclassRef && hasAvailableSubclasses;

  const hpPct = Math.max(0, Math.min(100, Math.round((self.hp / Math.max(1, self.maxHp)) * 100)));
  const hpBarColor =
    hpPct <= 25 ? 'bg-red-500' : hpPct <= 55 ? 'bg-amber-500' : 'bg-emerald-500';
  const privateEventsCount = playerState.eventLog.filter((e) => e.scope === 'private').length;

  const learnedProficiencies = catalogs.proficiencies.filter((pr) =>
    self.proficiencyIds.includes(pr.id)
  );
  const visibleSkills = onlyProficientSkills
    ? catalogs.skills.filter(
        (sk) =>
          self.proficientSkillIds.includes(sk.id) ||
          (self.expertiseSkillIds ?? []).includes(sk.id)
      )
    : catalogs.skills;

  const encumbrance = computeHeroEncumbrance(self, catalogs);
  const handsUsage = computeEquippedHandsUsage(self.inventory, catalogs);
  const hasWeaponMastery = hasHeroWeaponMasteryFeature(self, catalogs);
  const myToken = playerState.tokens.find((t) => t.playerId === self.id);
  const isMyTurn = Boolean(myToken && playerState.scene.activeTurnTokenId === myToken.id);
  const deathSaves = self.deathSaves ?? { successes: 0, failures: 0, status: 'none' as const };
  const formattedClock = formatGameClock(playerState.gameClock, clockNowMs);
  const ClockPhaseIcon =
    formattedClock.phaseIcon === 'moon'
      ? Moon
      : formattedClock.phaseIcon === 'sunrise'
        ? Sunrise
        : formattedClock.phaseIcon === 'sunset'
          ? Sunset
          : Sun;

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

  const handleOpenPortraitSheet = () => {
    setCapturedFaceDataUrl(null);
    setPortraitError(null);
    setPortraitSuccessNote(null);
    setPortraitSheetOpen(true);
  };

  const handleFaceFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPortraitError(null);
    setPortraitSuccessNote(null);
    try {
      const compressed = await compressImageFileToDataUrl(file, 1024, 0.86);
      setCapturedFaceDataUrl(compressed);
    } catch (err) {
      setPortraitError(err instanceof Error ? err.message : 'Не удалось обработать фото');
    }
  };

  const handleGenerateHeroPortrait = async () => {
    if (!capturedFaceDataUrl) {
      setPortraitError('Сделайте фото камерой или выберите снимок из галереи');
      return;
    }
    setIsGeneratingPortrait(true);
    setPortraitError(null);
    setPortraitSuccessNote(null);
    try {
      const res = await fetch('/api/portraits/hero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: self.id,
          photoDataUrl: capturedFaceDataUrl,
        }),
      });
      const data = (await res.json()) as { portraitUrl?: string; error?: string };
      if (!res.ok || !data.portraitUrl) {
        throw new Error(data.error || 'Не удалось сгенерировать портрет');
      }
      setCapturedFaceDataUrl(null);
      setPortraitSuccessNote('Портрет сохранён и обновлён на экране ТВ!');
    } catch (err) {
      setPortraitError(err instanceof Error ? err.message : 'Ошибка генерации портрета');
    } finally {
      setIsGeneratingPortrait(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 pb-20">
      {/* Compact Sticky Mobile Top Bar (<= 56px) */}
      <header className="sticky top-0 z-30 h-14 px-4 bg-[#0B0F17]/95 backdrop-blur-md border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {self.portraitUrl ? (
            <img
              src={self.portraitUrl}
              alt={self.name}
              className="w-8 h-8 rounded-full object-cover object-top border-2 shrink-0"
              style={{ borderColor: self.color }}
            />
          ) : (
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: self.color }}
              aria-hidden="true"
            />
          )}
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-100 truncate leading-tight">
              {self.name}
            </div>
            <div className="text-[11px] text-slate-400 truncate leading-tight">
              {classRef?.name ?? self.role}
              {subclassRef ? ` (${subclassRef.name})` : ''} · Ур. {self.level} · КЗ {self.ac}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-[#131A26] border border-slate-800 text-[11px] text-slate-300"
            title={`${formattedClock.dayText} · ${formattedClock.phaseLabel}`}
          >
            <ClockPhaseIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-mono tabular-nums font-semibold text-slate-100">
              {formattedClock.timeText}
            </span>
            {formattedClock.paused && <Pause className="w-3 h-3 text-slate-400 shrink-0" />}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 px-1.5">
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
            className="min-h-[44px] px-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800/80 flex items-center gap-1.5 transition-colors"
            aria-label="К списку персонажей"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Персонажи</span>
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
            <div className="text-xs font-semibold text-red-200">Действие недоступно</div>
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

        {/* Compact Mobile In-Game Time Strip */}
        <div className="sm:hidden flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-[#131A26] border border-slate-800/90 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <ClockPhaseIcon className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-medium">{formattedClock.phaseLabel}</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">{formattedClock.dayText}</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono tabular-nums font-semibold text-slate-100">
            <span>{formattedClock.timeText}</span>
            {formattedClock.paused && (
              <span className="text-[10px] font-sans font-medium text-amber-400">Пауза</span>
            )}
          </div>
        </div>

        {/* Active Turn Banner */}
        {isMyTurn && deathSaves.status !== 'dead' && (
          <div className="rounded-2xl p-3.5 border border-amber-400/70 bg-amber-500/15 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Swords className="w-5 h-5 text-amber-300 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-bold text-amber-200 leading-tight">
                  Сейчас ваш ход!
                </div>
                <div className="text-[11px] text-amber-100/80 leading-snug">
                  Раунд {playerState.scene.round}
                  {encumbrance.tier === 'light'
                    ? ' · Слегка перегружен: скорость −10 фт.'
                    : encumbrance.tier === 'heavy'
                      ? ' · Сильно перегружен: скорость −20 фт. и помеха!'
                      : encumbrance.tier === 'max'
                        ? ' · Максимальный лимит веса: скорость 5 фт. и помеха!'
                        : ''}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Death Saving Throws / Dying / Stabilized / Dead Status Banner */}
        {deathSaves.status === 'dying' && (
          <div
            className={`rounded-2xl p-4 border space-y-3 ${
              isMyTurn
                ? 'bg-red-950/75 border-red-400 shadow-lg shadow-red-950/50'
                : 'bg-red-950/50 border-red-600/70'
            }`}
          >
            <div className="flex items-start gap-3">
              <HeartPulse className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-sm font-bold text-red-200">
                  {isMyTurn
                    ? 'Ваш ход — бросьте спасбросок от смерти (1к20)!'
                    : 'Персонаж при смерти (0 HP, без сознания)'}
                </div>
                <p className="text-xs text-red-100/90 leading-relaxed">
                  {isMyTurn
                    ? 'Бросьте 1к20 и назовите результат мастеру: 10+ — успех, 2–9 — провал, 20 — очнуться с 1 HP, 1 — сразу 2 провала.'
                    : 'В начале вашего хода бросьте 1к20: 3 успеха стабилизируют героя, 3 провала приведут к гибели.'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="rounded-xl bg-[#0B0F17]/80 border border-emerald-500/30 px-3 py-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-emerald-300">Успехи</span>
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((idx) => (
                    <span
                      key={idx}
                      className={`w-3.5 h-3.5 rounded-full border ${
                        idx < deathSaves.successes
                          ? 'bg-emerald-400 border-emerald-300'
                          : 'bg-slate-900 border-slate-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="rounded-xl bg-[#0B0F17]/80 border border-red-500/40 px-3 py-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-red-300">Провалы</span>
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((idx) => (
                    <span
                      key={idx}
                      className={`w-3.5 h-3.5 rounded-full border ${
                        idx < deathSaves.failures
                          ? 'bg-red-500 border-red-300'
                          : 'bg-slate-900 border-slate-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {deathSaves.status === 'stabilized' && (
          <div className="rounded-2xl p-4 border border-emerald-500/50 bg-emerald-950/35 flex items-start gap-3">
            <HeartPulse className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="text-sm font-semibold text-emerald-200">
                Стабилизирован (0 HP, без сознания)
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Спасброски от смерти больше не требуются. Любой урон снова переведёт героя в состояние «Умирающий».
              </p>
            </div>
          </div>
        )}

        {deathSaves.status === 'dead' && (
          <div className="rounded-2xl p-4 border border-red-600/80 bg-red-950/65 flex items-start gap-3">
            <Skull className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="text-sm font-bold text-red-200">Персонаж погиб</div>
              <p className="text-xs text-red-100/85 leading-relaxed">
                Три провала спасбросков от смерти. Требуется воскрешение или решение мастера.
              </p>
            </div>
          </div>
        )}

        {/* Prominent Disadvantage Warning for Heavy / Max Encumbrance (extra-bright on player's turn) */}
        {encumbrance.hasStrDexConDisadvantage && deathSaves.status !== 'dead' && (
          <div
            className={`rounded-2xl p-4 border flex items-start gap-3 ${
              isMyTurn
                ? 'bg-rose-950/75 border-rose-400 shadow-lg shadow-rose-950/40'
                : 'bg-amber-950/40 border-amber-500/60'
            }`}
          >
            <AlertTriangle
              className={`w-5 h-5 shrink-0 mt-0.5 ${isMyTurn ? 'text-rose-300' : 'text-amber-400'}`}
            />
            <div className="min-w-0 space-y-1">
              <div
                className={`text-xs font-bold uppercase tracking-wide ${
                  isMyTurn ? 'text-rose-200' : 'text-amber-200'
                }`}
              >
                {isMyTurn ? 'Внимание в ваш ход · ' : ''}
                {encumbrance.conditionName} ({formatWeightLb(encumbrance.totalWeightLb)} /{' '}
                {encumbrance.maxCarryLb} фнт.)
              </div>
              <p className="text-xs text-slate-100 leading-relaxed">
                <span className="font-semibold text-rose-300">ПОМЕХА</span> на все проверки
                способностей, броски атаки и спасброски, использующие{' '}
                <span className="font-semibold">Силу, Ловкость или Телосложение</span>.{' '}
                {encumbrance.tier === 'max'
                  ? 'Скорость снижена до 5 фт.'
                  : 'Скорость снижена на 20 фт.'}
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

            {/* Hero Weight Limit & Encumbrance Card */}
            {(() => {
              const weightPct = Math.min(
                100,
                Math.round((encumbrance.totalWeightLb / Math.max(1, encumbrance.maxCarryLb)) * 100)
              );
              const barColor =
                encumbrance.tier === 'max'
                  ? 'bg-red-500'
                  : encumbrance.tier === 'heavy'
                    ? 'bg-rose-500'
                    : encumbrance.tier === 'light'
                      ? 'bg-amber-400'
                      : 'bg-emerald-500';
              const cardTone =
                encumbrance.tier === 'max'
                  ? 'border-red-500/60 bg-red-950/25'
                  : encumbrance.tier === 'heavy'
                    ? 'border-rose-500/50 bg-rose-950/20'
                    : encumbrance.tier === 'light'
                      ? 'border-amber-500/50 bg-amber-950/15'
                      : 'border-slate-800 bg-[#131A26]';
              return (
                <div className={`rounded-2xl border p-4 space-y-2.5 ${cardTone}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                      <Scale className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Нагрузка и лимит веса</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {encumbrance.conditionName && (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                            encumbrance.tier === 'light'
                              ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                              : 'bg-red-500/20 border-red-400/60 text-red-200'
                          }`}
                        >
                          {encumbrance.conditionName}
                        </span>
                      )}
                      <span className="text-sm font-mono tabular-nums font-bold text-slate-100">
                        {formatWeightLb(encumbrance.totalWeightLb)} / {encumbrance.maxCarryLb} фнт.
                      </span>
                    </div>
                  </div>

                  {/* Progress bar with 1/3 (STR×5) and 2/3 (STR×10) threshold ticks */}
                  <div className="relative h-2.5 rounded-full bg-slate-800/90 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-200 ${barColor}`}
                      style={{ width: `${weightPct}%` }}
                    />
                    <span
                      className="absolute top-0 bottom-0 left-1/3 w-px bg-slate-950/80"
                      title={`Слегка перегружен: > ${encumbrance.lightThresholdLb} фнт.`}
                    />
                    <span
                      className="absolute top-0 bottom-0 left-2/3 w-px bg-slate-950/80"
                      title={`Сильно перегружен: > ${encumbrance.heavyThresholdLb} фнт.`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 gap-2">
                    <span>0</span>
                    <span className={encumbrance.tier === 'light' ? 'text-amber-300 font-semibold' : ''}>
                      ×5: {encumbrance.lightThresholdLb} фнт.
                    </span>
                    <span className={encumbrance.tier === 'heavy' ? 'text-rose-300 font-semibold' : ''}>
                      ×10: {encumbrance.heavyThresholdLb} фнт.
                    </span>
                    <span className={encumbrance.tier === 'max' ? 'text-red-300 font-semibold' : ''}>
                      Макс (СИЛ {encumbrance.strScore}×15): {encumbrance.maxCarryLb} фнт.
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-snug">{encumbrance.summary}</p>
                </div>
              );
            })()}

            {/* Hands Usage Summary Card */}
            <div className="rounded-2xl border border-slate-800 bg-[#131A26] p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Swords className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Занятость рук</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md text-xs font-mono font-semibold border ${
                    handsUsage.usedHands >= 2
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                      : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  }`}
                >
                  {handsUsage.usedHands} / {handsUsage.maxHands} рук
                </span>
              </div>
              {handsUsage.slots.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Обе руки свободны — можно взять одноручное оружие, щит или двуручное оружие.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {handsUsage.slots.map((slot) => (
                    <span
                      key={slot.itemId}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B0F17] border border-slate-700/90 text-xs text-slate-200"
                    >
                      <span className="font-medium">{slot.name}</span>
                      <span className="text-[10px] font-mono text-amber-300">
                        {slot.hands === 2 ? '2 руки' : '1 рука'}
                      </span>
                    </span>
                  ))}
                  {handsUsage.freeHands > 0 && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-[11px] text-emerald-300">
                      Свободна {handsUsage.freeHands} рука
                    </span>
                  )}
                </div>
              )}
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
                {self.inventory.map((item) => {
                  const gearRef =
                    item.category === 'gear' ? resolveGearCatalogItem(item, catalogs) : undefined;
                  const weaponHands =
                    item.category === 'weapon' ? getWeaponRequiredHands(item, catalogs) : null;
                  const weaponPropRefs =
                    item.category === 'weapon' ? resolveWeaponPropertyRefs(item, catalogs) : [];
                  const weaponMastery =
                    item.category === 'weapon' && item.equipped && hasWeaponMastery
                      ? resolveWeaponMasteryRef(item, catalogs)
                      : null;
                  return (
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
                          {weaponHands && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800/90 border border-slate-700 text-[10px] font-mono text-slate-300">
                              {weaponHands === 2 ? '2 руки' : '1 рука'}
                            </span>
                          )}
                          {item.category === 'armor' && item.armorCategory === 'shield' && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800/90 border border-slate-700 text-[10px] font-mono text-sky-300">
                              1 рука
                            </span>
                          )}
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
                        {item.category === 'weapon' && (
                          <div className="mt-1.5 text-[11px] text-slate-300 space-y-1">
                            <div>
                              {item.damage && (
                                <>
                                  <span className="text-slate-500">Урон: </span>
                                  <span className="font-mono text-amber-300">{item.damage}</span>
                                </>
                              )}
                              {(() => {
                                const rr = resolveWeaponReachRange(item, catalogs);
                                const label =
                                  rr.rangeType === 'ranged' && rr.maxFt > rr.normalFt
                                    ? `${rr.normalFt}/${rr.maxFt} фт.`
                                    : `${rr.normalFt} фт.`;
                                return (
                                  <span className="text-rose-300 font-mono">
                                    {item.damage ? ' · ' : ''}
                                    {rr.rangeType === 'ranged' ? 'Дист.' : 'Досяг.'} {label}
                                  </span>
                                );
                              })()}
                            </div>
                            {(weaponPropRefs.length > 0 || (item.properties && item.properties !== '—')) && (
                              <div className="text-slate-400">
                                Свойства:{' '}
                                {weaponPropRefs.length > 0
                                  ? formatWeaponPropertiesSummary(
                                      {
                                        propertyIds: weaponPropRefs.map((p) => p.id),
                                        properties: item.properties || '',
                                        versatileDamage: item.versatileDamage,
                                        rangeType: item.weaponRangeType ?? 'melee',
                                        rangeNormalFt: item.rangeNormalFt,
                                        rangeMaxFt: item.rangeMaxFt,
                                        thrownNormalFt: item.thrownNormalFt,
                                        thrownMaxFt: item.thrownMaxFt,
                                      },
                                      catalogs
                                    )
                                  : item.properties}
                              </div>
                            )}
                            {weaponMastery && (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-violet-500/15 border border-violet-500/40 text-violet-200 font-medium">
                                <Sparkles className="w-3 h-3 text-violet-300" />
                                <span>Мастерство: {weaponMastery.name}</span>
                              </div>
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
                        {gearRef?.kind === 'ammunition' && (() => {
                          const cap = getAmmoCapacityForPlayer(self.inventory, gearRef, catalogs);
                          const hasCap = Number.isFinite(cap.maxCapacity);
                          return (
                            <div className="mt-1.5 text-[11px] space-y-0.5">
                              <div
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border font-mono ${
                                  cap.containerCount > 0 || !cap.containerRef
                                    ? 'bg-sky-950/35 border-sky-500/35 text-sky-200'
                                    : 'bg-rose-950/35 border-rose-500/45 text-rose-200'
                                }`}
                              >
                                <span>
                                  Запас: {cap.currentQty}
                                  {hasCap ? ` / ${cap.maxCapacity}` : ''}
                                </span>
                                {cap.containerRef && (
                                  <span className="font-sans text-[10px] opacity-85">
                                    · {cap.containerRef.name}
                                    {cap.containerCount === 0 ? ' (нет в инвентаре!)' : ` ×${cap.containerCount}`}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                        {gearRef?.kind === 'container' && (() => {
                          const storedAmmo = gearRef.storedAmmoId
                            ? catalogs.gearItems.find((g) => g.id === gearRef.storedAmmoId)
                            : undefined;
                          const totalCap = (gearRef.capacity ?? 20) * Math.max(1, item.quantity);
                          return (
                            <div className="mt-1 text-[11px] text-sky-300/90">
                              Контейнер: вмещает до {totalCap} шт.
                              {storedAmmo ? ` (${storedAmmo.name})` : ''}
                            </div>
                          );
                        })()}
                        {item.description &&
                          item.category !== 'weapon' &&
                          item.category !== 'armor' && (
                            <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        {(() => {
                          const unitLb = getInventoryItemUnitWeightLb(item, catalogs);
                          if (unitLb <= 0) return null;
                          const totalLb = Math.round(unitLb * Math.max(0, item.quantity) * 100) / 100;
                          return (
                            <div className="mt-1 text-[11px] font-mono text-slate-400">
                              Вес: {formatWeightLb(totalLb)} фнт.
                              {item.quantity > 1 ? ` (${formatWeightLb(unitLb)} × ${item.quantity})` : ''}
                            </div>
                          );
                        })()}
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
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: FULL CHARACTER SHEET */}
        {activeTab === 'hero' && (
          <section className="space-y-4">
            {/* Core Character Identity, HP & XP */}
            <div className="rounded-2xl bg-[#131A26] border border-slate-800 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3.5">
                <div className="flex items-start gap-3.5 min-w-0">
                  {/* Hero 3:4 Card Portrait Thumbnail */}
                  <button
                    type="button"
                    onClick={handleOpenPortraitSheet}
                    className="relative w-20 h-[106px] rounded-xl overflow-hidden border border-slate-700/90 bg-[#0B0F17] shrink-0 group focus:outline-none focus:ring-2 focus:ring-amber-400"
                    title="Сгенерировать портрет героя"
                  >
                    {self.portraitUrl ? (
                      <img
                        src={self.portraitUrl}
                        alt={self.name}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-center px-1"
                        style={{
                          background: `radial-gradient(circle at 50% 35%, ${self.color}33, #0B0F17 85%)`,
                        }}
                      >
                        <Camera className="w-5 h-5 text-amber-400/90" />
                        <span className="text-[10px] font-medium text-slate-400 leading-tight">
                          Портрет
                        </span>
                      </div>
                    )}
                    <span className="absolute inset-x-0 bottom-0 py-1 bg-gradient-to-t from-black/90 via-black/60 to-transparent text-[9px] font-medium text-amber-300 text-center">
                      {self.portraitUrl ? 'Обновить' : 'Создать'}
                    </span>
                  </button>

                  <div className="space-y-1 min-w-0">
                    <h1 className="text-xl font-semibold text-slate-100 truncate">{self.name}</h1>
                    <p className="text-xs text-slate-400">
                      {classRef?.name ?? self.role}
                      {subclassRef ? (
                        <span className="text-violet-300 font-medium"> ({subclassRef.name})</span>
                      ) : null}{' '}
                      · {speciesRef?.name ?? '—'} · {backgroundRef?.name ?? '—'}
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

                    <div className="pt-1.5">
                      <button
                        type="button"
                        onClick={handleOpenPortraitSheet}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 active:scale-[0.99] border border-amber-500/50 text-amber-300 text-xs font-semibold inline-flex items-center gap-2 transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {self.portraitUrl
                            ? 'Перегенерировать изображение'
                            : 'Сгенерировать изображение'}
                        </span>
                      </button>
                    </div>
                  </div>
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

              {(() => {
                const acDetails = computePlayerAcDetails(self, catalogs);
                const speedDetails = computePlayerEffectiveSpeed(self, catalogs);
                const initDetails = computePlayerInitiativeDetails(self, catalogs);
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-slate-800/80">
                    <div>
                      <div className="text-[11px] text-slate-400">Класс Защиты</div>
                      <div className="text-lg font-mono tabular-nums font-semibold text-slate-100">
                        {self.ac}
                      </div>
                      <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                        {acDetails.breakdown}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">Скорость</div>
                      <div
                        className={`text-lg font-mono tabular-nums font-semibold ${
                          speedDetails.effectiveFt === 0 ? 'text-rose-400' : 'text-emerald-300'
                        }`}
                      >
                        {speedDetails.effectiveFt} фт.
                      </div>
                      {speedDetails.effectiveFt !== speedDetails.baseFt && (
                        <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                          {speedDetails.breakdown}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">Инициатива</div>
                      <div className="text-lg font-mono tabular-nums font-semibold text-sky-400">
                        {self.initiative ?? 10}
                      </div>
                      <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                        Бросок: 1к20 {formatModifier(initDetails.bonus)}
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
                );
              })()}

              {(() => {
                const heroVisions = formatEntityVisions(self.visions, catalogs.visions);
                if (heroVisions.length === 0 && !self.senses) return null;
                return (
                  <div className="pt-3 border-t border-slate-800/80 space-y-1">
                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-sky-400" />
                      <span>Зрение и чувства</span>
                    </div>
                    {heroVisions.length > 0 && (
                      <p className="text-xs font-medium text-sky-300">
                        {heroVisions.join(' · ')}
                      </p>
                    )}
                    {self.senses && (
                      <p className="text-xs text-slate-300">{self.senses}</p>
                    )}
                  </div>
                );
              })()}

              {(() => {
                const activeEffects = getActiveConditionEffects(
                  self.conditions,
                  self.exhaustionLevel
                );
                if (self.conditions.length === 0 && activeEffects.exhaustionLevel === 0) return null;

                return (
                  <div className="pt-3 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-medium text-amber-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Активные состояния ({self.conditions.length})</span>
                      </div>
                      <span className="text-[10px] text-slate-500">Нажмите для правил</span>
                    </div>

                    <div className="space-y-1.5">
                      {self.conditions.map((condName) => {
                        const ref = catalogs.conditions.find(
                          (c) => c.name.toLowerCase() === condName.toLowerCase()
                        );
                        const isOpen = expandedConditionName === condName;
                        const isExhaustion = condName.toLowerCase().includes('истощ');
                        return (
                          <div
                            key={condName}
                            className="rounded-xl bg-amber-950/25 border border-amber-500/35 overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => setExpandedConditionName(isOpen ? null : condName)}
                              className="w-full px-3 py-2 flex items-center justify-between gap-2 text-left hover:bg-amber-950/35 transition-colors"
                            >
                              <div className="min-w-0 flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-amber-200">
                                  {condName}
                                  {isExhaustion && activeEffects.exhaustionLevel > 0
                                    ? ` (ур. ${activeEffects.exhaustionLevel})`
                                    : ''}
                                </span>
                                {ref?.automatedSummary && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-[10px] text-emerald-300">
                                    <Zap className="w-2.5 h-2.5" />
                                    <span>Авто</span>
                                  </span>
                                )}
                              </div>
                              <ChevronDown
                                className={`w-3.5 h-3.5 text-amber-300/80 shrink-0 transition-transform ${
                                  isOpen ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                            {isOpen && (
                              <div className="px-3 pb-3 pt-1 border-t border-amber-500/20 bg-[#0B0F17]/75 space-y-1.5">
                                {ref?.automatedSummary && (
                                  <div className="text-[11px] text-emerald-300 font-medium">
                                    Автоэффект: {ref.automatedSummary}
                                  </div>
                                )}
                                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                                  {ref?.description || 'Описание статуса не заполнено в справочнике.'}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {activeEffects.combatCallouts.length > 0 && (
                      <div className="rounded-xl bg-[#0B0F17]/80 border border-slate-800 px-3 py-2 space-y-1">
                        {activeEffects.combatCallouts.map((note, idx) => (
                          <div key={idx} className="text-[11px] text-amber-200/90 leading-snug">
                            • {note}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {needsSubclassNotice && (
                <div className="pt-3 border-t border-slate-800/80">
                  <div className="rounded-xl bg-violet-950/40 border border-violet-500/45 px-3.5 py-2.5 flex items-start gap-2.5">
                    <GitBranch className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-violet-200 leading-relaxed">
                      На 3 уровне открывается <span className="font-semibold">подкласс</span>! Сообщите мастеру, какую специализацию вы выбираете.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Hero Actions (Unarmed Strike + Inventory Weapons) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 px-1">
                <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Swords className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Действия ({heroActions.length})</span>
                </h2>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono border ${
                      handsUsage.usedHands >= 2
                        ? 'bg-amber-500/15 border-amber-500/45 text-amber-200'
                        : 'bg-[#131A26] border-slate-800 text-slate-300'
                    }`}
                  >
                    Руки: {handsUsage.usedHands}/{handsUsage.maxHands}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    БМ +{profBonus}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                {heroActions.map((act) => {
                  const invItem = act.inventoryItemId
                    ? self.inventory.find((i) => i.id === act.inventoryItemId)
                    : undefined;
                  const activeExpandedProp = act.resolvedProperties?.find(
                    (p) => `${act.id}:${p.id}` === expandedActionPropKey
                  );
                  return (
                    <div
                      key={act.id}
                      className={`rounded-2xl border p-4 space-y-2.5 transition-colors ${
                        act.kind === 'bonus_light'
                          ? 'bg-amber-950/15 border-amber-500/40'
                          : act.equipped
                            ? 'bg-[#131A26] border-slate-800'
                            : 'bg-[#131A26]/65 border-slate-800/70 opacity-85'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-semibold text-slate-100">
                              {act.name}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-slate-300">
                              {act.rangeLabel}
                            </span>
                            {act.handsRequired && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/80 font-mono text-[10px] text-slate-300">
                                {act.handsRequired === 2 ? '2 руки' : '1 рука'}
                              </span>
                            )}
                            {act.kind === 'bonus_light' && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-[10px] font-semibold text-amber-200">
                                {act.name.includes('Быстрое') ? 'Часть Атаки' : 'Бонусное действие'}
                              </span>
                            )}
                            {!act.equipped && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-[10px] text-slate-400">
                                В рюкзаке
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{act.subtitle}</div>
                        </div>

                        {!act.equipped && invItem && (
                          <button
                            type="button"
                            onClick={() => handleToggleEquip(invItem)}
                            className="min-h-[36px] px-3 rounded-xl bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-amber-300 shrink-0 transition-colors"
                          >
                            Надеть
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-[#0B0F17] border border-slate-800/90 px-3 py-2">
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <span className="text-[10px] text-slate-400">Бросок попадания</span>
                            <div className="flex items-center gap-1">
                              {act.heavyDisadvantage && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/50 text-[9px] font-semibold text-rose-300">
                                  Помеха (СИЛ&lt;13)
                                </span>
                              )}
                              {encumbrance.hasStrDexConDisadvantage && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/50 text-[9px] font-semibold text-rose-300">
                                  Помеха
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-sm font-mono tabular-nums font-bold text-amber-400">
                            {act.hitFormula}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono leading-tight mt-0.5">
                            Бонус: {act.hitBreakdown}
                          </div>
                        </div>
                        <div className="rounded-xl bg-[#0B0F17] border border-slate-800/90 px-3 py-2">
                          <div className="text-[10px] text-slate-400">Урон</div>
                          <div className="text-sm font-mono tabular-nums font-bold text-rose-300">
                            {act.damageFormula}
                          </div>
                          <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                            {act.damageBreakdown}
                          </div>
                        </div>
                      </div>

                      {/* Equipped Weapon Active Property Details */}
                      {act.equipped && act.versatileAttack && (
                        <div
                          className={`rounded-xl border px-3 py-2 flex items-center justify-between gap-2 ${
                            act.versatileAttack.availableNow
                              ? 'bg-sky-950/25 border-sky-500/35'
                              : 'bg-slate-900/50 border-slate-800'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-sky-200">
                              Универсальное — двумя руками
                            </div>
                            <div className="text-[10px] text-slate-400 leading-snug">
                              {act.versatileAttack.note}
                            </div>
                          </div>
                          <div className="text-right font-mono tabular-nums shrink-0">
                            <div className="text-xs font-bold text-sky-300">
                              {act.versatileAttack.damageFormula}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {act.versatileAttack.damageBreakdown}
                            </div>
                          </div>
                        </div>
                      )}

                      {act.equipped && act.thrownAttack && (
                        <div className="rounded-xl bg-amber-950/20 border border-amber-500/30 px-3 py-2 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-amber-200">
                              Метательная атака ({act.thrownAttack.normalFt}/{act.thrownAttack.maxFt} фт.)
                            </div>
                            <div className="text-[10px] text-slate-400 leading-snug">
                              Помеха дальше {act.thrownAttack.normalFt} фт. · Можно вынуть частью атаки
                            </div>
                          </div>
                          <div className="text-right font-mono tabular-nums shrink-0">
                            <div className="text-xs font-bold text-amber-300">
                              {act.thrownAttack.hitFormula}
                            </div>
                            <div className="text-[11px] text-rose-300">
                              {act.thrownAttack.damageFormula}
                            </div>
                          </div>
                        </div>
                      )}

                      {act.equipped && act.ammoStatus && (
                        <div
                          className={`rounded-xl border px-3 py-2 flex items-center justify-between gap-2 ${
                            act.ammoStatus.currentQty > 0 && act.ammoStatus.hasContainer
                              ? 'bg-[#0B0F17] border-sky-500/35'
                              : 'bg-rose-950/30 border-rose-500/50'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-slate-200">
                              Боеприпас: {act.ammoStatus.ammoName}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {act.ammoStatus.containerName
                                ? `${act.ammoStatus.containerName} · `
                                : ''}
                              <span
                                className={`font-mono font-semibold ${
                                  act.ammoStatus.currentQty === 0
                                    ? 'text-rose-300'
                                    : 'text-sky-300'
                                }`}
                              >
                                {act.ammoStatus.currentQty} / {act.ammoStatus.maxCapacity}
                              </span>
                              {act.ammoStatus.currentQty === 0 ? ' — боеприпасы закончились!' : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              disabled={act.ammoStatus.currentQty <= 0}
                              onClick={() =>
                                send({
                                  type: 'player:spendAmmo',
                                  playerId: self.id,
                                  ammoItemId: act.ammoStatus!.ammoItemId,
                                  delta: -1,
                                })
                              }
                              className="min-h-[32px] px-2.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 disabled:opacity-40 border border-rose-500/40 text-[11px] font-semibold text-rose-200 transition-colors"
                            >
                              −1 выстрел
                            </button>
                            <button
                              type="button"
                              disabled={act.ammoStatus.currentQty >= act.ammoStatus.maxCapacity}
                              onClick={() =>
                                send({
                                  type: 'player:spendAmmo',
                                  playerId: self.id,
                                  ammoItemId: act.ammoStatus!.ammoItemId,
                                  delta: 1,
                                })
                              }
                              className="min-h-[32px] px-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-[11px] font-mono text-slate-200 transition-colors"
                              title="Подобрать/вернуть боеприпас"
                            >
                              +1
                            </button>
                          </div>
                        </div>
                      )}

                      {act.equipped &&
                        (act.heavyDisadvantage ||
                          act.loadingNote ||
                          act.finesseChoice ||
                          act.reachBonusNote) && (
                          <div className="space-y-1 text-[11px]">
                            {act.heavyDisadvantage && (
                              <div className="rounded-lg bg-rose-950/35 border border-rose-500/45 px-2.5 py-1.5 text-rose-200">
                                Тяжёлое оружие: ваша Сила меньше 13 — броски атаки совершаются с Помехой.
                              </div>
                            )}
                            {act.loadingNote && (
                              <div className="rounded-lg bg-amber-950/25 border border-amber-500/30 px-2.5 py-1 text-amber-200">
                                Перезарядка: не более 1 выстрела за действие, бонусное действие или реакцию.
                              </div>
                            )}
                            {act.finesseChoice && (
                              <div className="text-[10px] text-slate-400 px-0.5">
                                Фехтовальное: можно использовать модификатор Силы или Ловкости (выбран лучший).
                              </div>
                            )}
                            {act.reachBonusNote && (
                              <div className="text-[10px] text-slate-400 px-0.5">
                                Досягаемость: +5 фт. к дальности рукопашных атак в свой ход и атак при провокации.
                              </div>
                            )}
                          </div>
                        )}

                      {act.bonusNote && (
                        <div className="rounded-lg bg-emerald-950/30 border border-emerald-500/30 px-2.5 py-1.5 text-[11px] text-emerald-300 leading-snug">
                          {act.bonusNote}
                        </div>
                      )}

                      {/* Active Weapon Mastery — ONLY shown when equipped AND hero has «Оружейное мастерство» */}
                      {act.activeMastery && (
                        <div className="rounded-xl bg-violet-950/35 border border-violet-500/45 px-3 py-2.5 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-violet-200 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                              <span>Мастерство: {act.activeMastery.name}</span>
                            </span>
                            {act.activeMastery.saveDc !== undefined && (
                              <span className="px-1.5 py-0.5 rounded bg-violet-500/20 border border-violet-400/50 font-mono text-[10px] font-bold text-violet-100">
                                Сл {act.activeMastery.saveDc}
                              </span>
                            )}
                          </div>
                          {act.activeMastery.computedHint && (
                            <div className="text-[11px] font-medium text-amber-200/95 leading-snug">
                              {act.activeMastery.computedHint}
                            </div>
                          )}
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            {act.activeMastery.description}
                          </p>
                        </div>
                      )}

                      {/* Interactive Weapon Property Chips */}
                      {act.resolvedProperties && act.resolvedProperties.length > 0 && (
                        <div className="space-y-1.5 pt-0.5">
                          <div className="flex flex-wrap gap-1.5">
                            {act.resolvedProperties.map((prop) => {
                              const propKey = `${act.id}:${prop.id}`;
                              const isOpen = expandedActionPropKey === propKey;
                              return (
                                <button
                                  key={prop.id}
                                  type="button"
                                  onClick={() =>
                                    setExpandedActionPropKey(isOpen ? null : propKey)
                                  }
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors ${
                                    isOpen
                                      ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                                      : 'bg-[#0B0F17] border-slate-700/80 text-slate-300 hover:border-slate-500'
                                  }`}
                                >
                                  {prop.name}
                                </button>
                              );
                            })}
                          </div>
                          {activeExpandedProp && (
                            <div className="rounded-lg bg-[#0B0F17] border border-slate-700/90 px-2.5 py-2 text-[11px] text-slate-300 leading-relaxed">
                              <span className="font-semibold text-amber-200">
                                {activeExpandedProp.name}:{' '}
                              </span>
                              {activeExpandedProp.description}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Abilities Grid */}
            <div className="space-y-2.5">
              <h2 className="text-sm font-semibold text-slate-200 px-1">Характеристики</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {catalogs.abilities.map((ab) => {
                  const val = self.abilities[ab.id] ?? 10;
                  const mod = getAbilityModifier(val, catalogs.abilityModifiers);
                  const hasEncDisadv =
                    encumbrance.hasStrDexConDisadvantage &&
                    (ab.id === 'str' || ab.id === 'dex' || ab.id === 'con');
                  return (
                    <div
                      key={ab.id}
                      className={`rounded-2xl border p-3.5 space-y-1.5 ${
                        hasEncDisadv
                          ? 'bg-rose-950/20 border-rose-500/45'
                          : 'bg-[#131A26] border-slate-800'
                      }`}
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
                      {hasEncDisadv && (
                        <div className="text-[10px] font-medium text-rose-300">
                          Помеха (перегрузка)
                        </div>
                      )}
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
                  const skillCalc = computeHeroSkillTotal(self, sk, catalogs);
                  const isExp = skillCalc.isExpertise;
                  const isProf = skillCalc.isProficient;
                  const ab = catalogs.abilities.find((a) => a.id === sk.abilityId);
                  const totalMod = skillCalc.total;
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
                              isExp
                                ? 'bg-sky-400 border-sky-400 text-slate-950'
                                : isProf
                                  ? 'bg-amber-500 border-amber-500 text-slate-950'
                                  : skillCalc.hasJackOfAllTrades
                                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                                    : 'border-slate-700'
                            }`}
                          >
                            {isProf && <Check className="w-2.5 h-2.5" />}
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-100 truncate flex items-center gap-1.5">
                              <span className="truncate">{sk.name}</span>
                              {isExp && (
                                <span className="px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/60 text-[10px] font-mono font-semibold text-sky-300 shrink-0">
                                  ×2
                                </span>
                              )}
                              {skillCalc.hasJackOfAllTrades && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 shrink-0">
                                  ½БМ
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {ab ? ab.name : 'Без характеристики'}
                              {isExp
                                ? ' · Экспертиза'
                                : skillCalc.hasJackOfAllTrades
                                  ? ' · Мастер на все руки'
                                  : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-sm font-mono tabular-nums font-semibold ${
                              isExp
                                ? 'text-sky-300'
                                : isProf
                                  ? 'text-amber-400'
                                  : 'text-slate-300'
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
                        <div className="px-4 pb-3.5 pt-1 text-xs text-slate-300 leading-relaxed bg-[#0B0F17]/50 space-y-1">
                          {skillCalc.exhaustionPenalty !== 0 && (
                            <div className="text-[11px] font-mono text-rose-300">
                              Штраф от истощения: {skillCalc.exhaustionPenalty}
                            </div>
                          )}
                          <div>
                            <span className="text-slate-400">Пример использования: </span>
                            {sk.usageExample || 'Описание не заполнено в справочнике.'}
                          </div>
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

            {/* Class & Subclass Features + Scaling Class Parameters */}
            {(() => {
              const allFeatures = [
                ...unlockedClassFeatures.map((f) => ({
                  id: f.id,
                  level: f.level,
                  name: f.name,
                  description: f.description,
                  automatedSummary: f.automatedSummary,
                  isSubclass: false,
                })),
                ...unlockedSubclassFeatures.map((f) => ({
                  id: f.id,
                  level: f.level,
                  name: f.name,
                  description: f.description,
                  automatedSummary: f.automatedSummary,
                  isSubclass: true,
                })),
              ].sort((a, b) => a.level - b.level);

              if (classResources.length === 0 && allFeatures.length === 0) return null;

              return (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 px-1">
                    <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Умения класса ({allFeatures.length})</span>
                    </h2>
                    {subclassRef && (
                      <span className="px-2 py-0.5 rounded-md bg-violet-500/15 border border-violet-500/40 text-[11px] font-medium text-violet-300 truncate max-w-[180px]">
                        {subclassRef.name}
                      </span>
                    )}
                  </div>

                  {classResources.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {classResources.map((res) => (
                        <div
                          key={res.id}
                          className="rounded-xl bg-[#131A26] border border-slate-800 px-3.5 py-2.5"
                        >
                          <div className="text-[11px] text-slate-400 truncate">{res.name}</div>
                          <div className="mt-0.5 text-base font-mono tabular-nums font-bold text-amber-400">
                            {res.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {allFeatures.length > 0 && (
                    <div className="rounded-2xl bg-[#131A26] border border-slate-800 divide-y divide-slate-800/80 overflow-hidden">
                      {allFeatures.map((feat) => {
                        const isOpen = expandedFeatureId === feat.id;
                        return (
                          <div key={feat.id}>
                            <button
                              type="button"
                              onClick={() => setExpandedFeatureId(isOpen ? null : feat.id)}
                              className="w-full min-h-[48px] px-4 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-slate-800/40 transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold shrink-0 ${
                                    feat.isSubclass
                                      ? 'bg-violet-500/20 border border-violet-400/50 text-violet-200'
                                      : 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                                  }`}
                                >
                                  Ур. {feat.level}
                                </span>
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-slate-100 truncate flex items-center gap-1.5">
                                    <span className="truncate">{feat.name}</span>
                                    {feat.automatedSummary && (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-[9px] font-medium text-emerald-300 shrink-0">
                                        <Zap className="w-2.5 h-2.5" />
                                        <span>Авто</span>
                                      </span>
                                    )}
                                  </div>
                                  {feat.isSubclass && subclassRef && (
                                    <div className="text-[10px] text-violet-300">
                                      Подкласс: {subclassRef.name}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <ChevronDown
                                className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${
                                  isOpen ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                            {isOpen && (
                              <div className="px-4 pb-3.5 pt-1.5 text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-[#0B0F17]/50 space-y-1.5">
                                {feat.automatedSummary && (
                                  <div className="text-[11px] text-emerald-300 bg-emerald-950/25 border border-emerald-500/25 rounded-md px-2.5 py-1">
                                    Автоэффект: {feat.automatedSummary}
                                  </div>
                                )}
                                <div>
                                  {feat.description || 'Описание не заполнено в справочнике.'}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Hero Feats (Origin Feat & Others) */}
            {(() => {
              const heroFeats = getHeroFeats(self, catalogs);
              if (heroFeats.length === 0) return null;
              return (
                <div className="rounded-2xl bg-[#131A26] border border-slate-800 p-5 space-y-2.5">
                  <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Черты ({heroFeats.length})</span>
                  </h2>
                  <div className="divide-y divide-slate-800/80">
                    {heroFeats.map((feat) => (
                      <div key={feat.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-amber-300">{feat.name}</span>
                          {feat.automatedSummary && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-[9px] font-medium text-emerald-300">
                              <Zap className="w-2.5 h-2.5" />
                              <span>Авто</span>
                            </span>
                          )}
                        </div>
                        {feat.automatedSummary && (
                          <div className="text-[11px] text-emerald-300/95">
                            Автоэффект: {feat.automatedSummary}
                          </div>
                        )}
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {feat.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

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
              {classRef?.weaponProficiencyNote && (
                <p className="text-[11px] text-amber-200/90 pt-2 border-t border-slate-800/80">
                  {classRef.weaponProficiencyNote}
                </p>
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
      {/* Hero AI Portrait Generation Bottom Sheet */}
      {portraitSheetOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={() => {
            if (!isGeneratingPortrait) setPortraitSheetOpen(false);
          }}
        >
          <div
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-[#131A26] border-t sm:border border-slate-700/90 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle & Header */}
            <div className="pt-3 pb-2 px-5 border-b border-slate-800/80 shrink-0">
              <div className="w-10 h-1.5 bg-slate-700 rounded-full mx-auto mb-3 sm:hidden" />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-100">Портрет героя</h2>
                  <p className="text-xs text-slate-400">
                    ИИ превратит ваше фото в карточку тёмного фэнтези
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isGeneratingPortrait}
                  onClick={() => setPortraitSheetOpen(false)}
                  className="min-h-[44px] min-w-[44px] rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 flex items-center justify-center transition-colors disabled:opacity-40"
                  aria-label="Закрыть"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Hidden Native Mobile Camera & Gallery Pickers */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFaceFileSelected}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handleFaceFileSelected}
              className="hidden"
            />

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Auto-attached Hero Traits Summary */}
              <div className="rounded-xl bg-[#0B0F17] border border-slate-800 p-3 space-y-1.5">
                <div className="text-[11px] font-medium text-slate-400">
                  Учитывается при генерации:
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-[10px] text-slate-500">Вид</div>
                    <div className="font-medium text-slate-200 truncate">
                      {speciesRef?.name ?? '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Класс</div>
                    <div className="font-medium text-amber-300 truncate">
                      {classRef?.name ?? self.role}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Предыстория</div>
                    <div className="font-medium text-slate-200 truncate">
                      {backgroundRef?.name ?? '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Photo / Result Preview Frame (3:4 Card Ratio) */}
              <div className="flex justify-center">
                <div className="relative w-44 aspect-[3/4] rounded-2xl overflow-hidden border border-slate-700 bg-[#0B0F17] flex items-center justify-center shadow-inner">
                  {capturedFaceDataUrl ? (
                    <img
                      src={capturedFaceDataUrl}
                      alt="Выбранное фото лица"
                      className="w-full h-full object-cover object-top"
                    />
                  ) : self.portraitUrl ? (
                    <img
                      src={self.portraitUrl}
                      alt={self.name}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="p-4 text-center space-y-2">
                      <Camera className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs text-slate-400 leading-snug">
                        Сделайте селфи или выберите фото лица из галереи
                      </p>
                    </div>
                  )}

                  {isGeneratingPortrait && (
                    <div className="absolute inset-0 bg-[#0B0F17]/85 backdrop-blur-sm flex flex-col items-center justify-center gap-2.5 p-4 text-center">
                      <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                      <p className="text-xs font-medium text-amber-200 leading-snug">
                        ИИ рисует портрет героя...
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {portraitSuccessNote && (
                <div className="rounded-xl bg-emerald-950/50 border border-emerald-700/60 px-3.5 py-2.5 text-xs text-emerald-200 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{portraitSuccessNote}</span>
                </div>
              )}

              {portraitError && (
                <div className="rounded-xl bg-red-950/50 border border-red-700/60 px-3.5 py-2.5 text-xs text-red-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{portraitError}</span>
                </div>
              )}
            </div>

            {/* Thumb-Zone Bottom Actions */}
            <div className="p-4 border-t border-slate-800/80 bg-[#0B0F17]/90 space-y-2.5 shrink-0">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isGeneratingPortrait}
                  onClick={() => cameraInputRef.current?.click()}
                  className="min-h-[48px] px-3 py-2.5 rounded-xl bg-[#131A26] hover:bg-slate-800 active:scale-[0.98] border border-slate-700 text-xs font-semibold text-slate-100 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Camera className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Камера</span>
                </button>
                <button
                  type="button"
                  disabled={isGeneratingPortrait}
                  onClick={() => galleryInputRef.current?.click()}
                  className="min-h-[48px] px-3 py-2.5 rounded-xl bg-[#131A26] hover:bg-slate-800 active:scale-[0.98] border border-slate-700 text-xs font-semibold text-slate-100 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <ImageIcon className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Из галереи</span>
                </button>
              </div>

              <button
                type="button"
                disabled={isGeneratingPortrait || !capturedFaceDataUrl}
                onClick={handleGenerateHeroPortrait}
                className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] disabled:opacity-45 disabled:hover:bg-amber-500 text-slate-950 text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              >
                {isGeneratingPortrait ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Генерация портрета...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Создать портрет героя</span>
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
