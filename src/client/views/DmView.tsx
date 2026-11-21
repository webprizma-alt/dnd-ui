import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpCircle,
  Award,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Compass,
  Crosshair,
  Dices,
  Eye,
  EyeOff,
  GitBranch,
  Grid3X3,
  HeartPulse,
  ImagePlus,
  Layers,
  Lock,
  Map as MapIcon,
  MapPin,
  Minus,
  Moon,
  Music,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Scale,
  Send,
  Shield,
  Skull,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  Swords,
  Trash2,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import {
  computeEffectiveVisionRanges,
  computeEquippedHandsUsage,
  computeHeroActions,
  computeHeroEncumbrance,
  computeHeroSkillTotal,
  computePlayerAcDetails,
  computePlayerEffectiveSpeed,
  computePlayerInitiativeDetails,
  formatEntityVisions,
  formatGameClock,
  formatModifier,
  formatWeaponPropertiesSummary,
  formatWeaponReachRange,
  formatWeightLb,
  getAbilityModifier,
  getActiveConditionEffects,
  getAmmoCapacityForPlayer,
  getArmorCategoryLabel,
  getBackgroundLockedSkillIds,
  getClassDefaultProficiencyIds,
  getClassHitDieInfo,
  getClassProficiencyBonus,
  getClassResourcesAtLevel,
  getGearKindLabel,
  getHeroAllowedSkillIds,
  getHeroClassFeatures,
  getHeroFeats,
  getHeroLevelUpChecklist,
  getHeroSubclassFeatures,
  getInventoryItemUnitWeightLb,
  getMapLightingDescription,
  getNextLevelThreshold,
  getWeaponCategoryLabel,
  getWeaponRangeLabel,
  getWeaponRequiredHands,
  resolveEffectiveMapLighting,
  resolveGearCatalogItem,
  resolveMonsterActionRange,
  resolveWeaponReachRange,
} from '../../shared/catalogDefaults';
import type {
  ArmorCategory,
  EventTone,
  ItemCategory,
  LocationHotspot,
  MapLighting,
  MapToken,
  SceneMode,
  TokenKind,
  WeaponCategory,
  WeaponRangeType,
} from '../../shared/types';
import { CharacterCreationModal } from '../components/CharacterCreationModal';
import { TacticalMap, type DmTacticalOverlay } from '../components/TacticalMap';
import { VisionSelector } from '../components/VisionSelector';
import { useGameSocket } from '../useGameSocket';

interface DmViewProps {
  onNavigate: (path: string) => void;
}

type DmTab = 'queue' | 'players' | 'events' | 'tokens';
type PlayerSubTab = 'combat' | 'checks' | 'gear' | 'profile';

const PRESET_COLORS = ['#F59E0B', '#10B981', '#38BDF8', '#A855F7', '#EC4899', '#EF4444'];

export function DmView({ onNavigate }: DmViewProps) {
  const { status, dmState, errorNotice, clearError, send } = useGameSocket({ role: 'dm' });
  const [activeTab, setActiveTab] = useState<DmTab>('players');
  const [playerSubTab, setPlayerSubTab] = useState<PlayerSubTab>('combat');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [expandedDmActionPropKey, setExpandedDmActionPropKey] = useState<string | null>(null);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [activeCreationRequestId, setActiveCreationRequestId] = useState<string | null>(null);
  const [uploadingMap, setUploadingMap] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingSplashAudio, setUploadingSplashAudio] = useState(false);
  const [splashAudioError, setSplashAudioError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Add Player Form
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerOwnerAccountId, setNewPlayerOwnerAccountId] = useState('');
  const [newPlayerClassId, setNewPlayerClassId] = useState('fighter');
  const [newPlayerBackgroundId, setNewPlayerBackgroundId] = useState('soldier');
  const [newPlayerSpeciesId, setNewPlayerSpeciesId] = useState('human');
  const [newPlayerHp, setNewPlayerHp] = useState(12);
  const [newPlayerColor, setNewPlayerColor] = useState(PRESET_COLORS[0]);

  // Add Inventory Item Form
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<ItemCategory>('gear');
  const [itemQty, setItemQty] = useState(1);
  const [itemWeight, setItemWeight] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemCatalogId, setItemCatalogId] = useState('');
  const [itemWeaponCat, setItemWeaponCat] = useState<WeaponCategory>('simple');
  const [itemWeaponRange, setItemWeaponRange] = useState<WeaponRangeType>('melee');
  const [itemArmorCat, setItemArmorCat] = useState<ArmorCategory>('light');

  // In-game Clock UI State
  const [clockNowMs, setClockNowMs] = useState(() => Date.now());
  const [clockPopoverOpen, setClockPopoverOpen] = useState(false);

  // Local Drafts for Name, Private Note, Location Note, Senses, Campaign Title & Hotspots
  const [nameDraft, setNameDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [locationNoteDraft, setLocationNoteDraft] = useState('');
  const [sensesDraft, setSensesDraft] = useState('');
  const [levelUpHpDeltaDraft, setLevelUpHpDeltaDraft] = useState('');
  const [expandedDmFeatureId, setExpandedDmFeatureId] = useState<string | null>(null);
  const [showDmTacticalOverlay, setShowDmTacticalOverlay] = useState(true);
  const [selectedAttackOverlayId, setSelectedAttackOverlayId] = useState<string>('all');
  const [activeHotspotPopover, setActiveHotspotPopover] = useState<LocationHotspot | null>(null);
  const [showHiddenHotspots, setShowHiddenHotspots] = useState(false);
  const [movePartyOnTravel, setMovePartyOnTravel] = useState(true);
  const [editingCampaignTitle, setEditingCampaignTitle] = useState(false);
  const [campaignTitleDraft, setCampaignTitleDraft] = useState('');
  const [campaignSubtitleDraft, setCampaignSubtitleDraft] = useState('');

  // Event Trigger Form
  const [eventScope, setEventScope] = useState<'public' | 'private'>('public');
  const [eventTargetPlayerId, setEventTargetPlayerId] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventMessage, setEventMessage] = useState('');
  const [eventTone, setEventTone] = useState<EventTone>('neutral');
  const [showBannerOnTv, setShowBannerOnTv] = useState(true);

  // Add Token Form
  const [tokenLabel, setTokenLabel] = useState('');
  const [tokenKind, setTokenKind] = useState<TokenKind>('enemy');
  const [tokenColor, setTokenColor] = useState('#EF4444');
  const [tokenSize, setTokenSize] = useState(1);
  const [tokenInitiative, setTokenInitiative] = useState(10);
  const [tokenMonsterId, setTokenMonsterId] = useState('');
  const [tokenMaxHp, setTokenMaxHp] = useState<number | ''>('');
  const [tokenAc, setTokenAc] = useState<number | ''>('');
  const [expandedMonsterTokenId, setExpandedMonsterTokenId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const splashAudioInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!dmState) return;
    if (!selectedPlayerId || !dmState.players.some((p) => p.id === selectedPlayerId)) {
      const firstId = dmState.players[0]?.id ?? '';
      setSelectedPlayerId(firstId);
      setEventTargetPlayerId(firstId);
    }
    if (dmState.catalogs.classes.length > 0 && !dmState.catalogs.classes.some((c) => c.id === newPlayerClassId)) {
      setNewPlayerClassId(dmState.catalogs.classes[0].id);
    }
    if (dmState.catalogs.backgrounds.length > 0 && !dmState.catalogs.backgrounds.some((b) => b.id === newPlayerBackgroundId)) {
      setNewPlayerBackgroundId(dmState.catalogs.backgrounds[0].id);
    }
    if (dmState.catalogs.species.length > 0 && !dmState.catalogs.species.some((s) => s.id === newPlayerSpeciesId)) {
      setNewPlayerSpeciesId(dmState.catalogs.species[0].id);
    }
  }, [dmState, selectedPlayerId, newPlayerClassId, newPlayerBackgroundId, newPlayerSpeciesId]);

  const selectedPlayer = dmState?.players.find((p) => p.id === selectedPlayerId) ?? null;

  useEffect(() => {
    if (selectedPlayer) {
      setNoteDraft(selectedPlayer.privateNote);
      setNameDraft(selectedPlayer.name);
      setLocationNoteDraft(selectedPlayer.locationNote ?? '');
      setSensesDraft(selectedPlayer.senses ?? '');
      setLevelUpHpDeltaDraft('');
    }
  }, [
    selectedPlayer?.id,
    selectedPlayer?.level,
    selectedPlayer?.privateNote,
    selectedPlayer?.name,
    selectedPlayer?.locationNote,
    selectedPlayer?.senses,
  ]);

  useEffect(() => {
    setSelectedAttackOverlayId('all');
  }, [dmState?.scene.activeTurnTokenId, dmState?.activeLocationId]);

  useEffect(() => {
    setActiveHotspotPopover(null);
  }, [dmState?.activeLocationId]);

  useEffect(() => {
    if (!errorNotice) return;
    const timer = window.setTimeout(() => clearError(), 6500);
    return () => window.clearTimeout(timer);
  }, [errorNotice, clearError]);

  useEffect(() => {
    const id = window.setInterval(() => setClockNowMs(Date.now()), 2000);
    return () => window.clearInterval(id);
  }, []);

  if (!dmState) {
    return (
      <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="text-base font-medium text-slate-200">Загрузка консоли мастера...</p>
          <p className="text-sm text-slate-400">Синхронизация состояния сессии</p>
        </div>
      </div>
    );
  }

  const { catalogs } = dmState;
  const activeLocation =
    dmState.locations.find((l) => l.id === dmState.activeLocationId) ?? dmState.locations[0];
  const parentLocation = activeLocation?.parentLocationId
    ? dmState.locations.find((l) => l.id === activeLocation.parentLocationId) ?? null
    : null;

  const handleMapUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploadingMap(true);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/map/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          dataUrl,
          locationId: dmState.activeLocationId,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Ошибка загрузки карты');
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploadingMap(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUploadSplashAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSplashAudioError(null);

    if (!file.name.toLowerCase().endsWith('.mp3') && file.type && !file.type.includes('mpeg') && !file.type.includes('mp3')) {
      setSplashAudioError('Поддерживаются только аудиофайлы в формате MP3');
      e.target.value = '';
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setSplashAudioError('Файл слишком большой (максимум 25 МБ)');
      e.target.value = '';
      return;
    }

    setUploadingSplashAudio(true);
    try {
      const res = await fetch(
        `/api/audio/upload?target=splash&filename=${encodeURIComponent(file.name)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'audio/mpeg' },
          body: file,
        }
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Ошибка загрузки MP3');
      }
    } catch (err) {
      setSplashAudioError(err instanceof Error ? err.message : 'Ошибка загрузки MP3');
    } finally {
      setUploadingSplashAudio(false);
      if (splashAudioInputRef.current) splashAudioInputRef.current.value = '';
    }
  };

  const handleNextTurn = () => {
    if (activeLocation?.kind === 'city') return;
    // Skip dead monsters automatically; unconscious combatants remain in turn order!
    const combatTokens = dmState.tokens.filter(
      (t) => t.kind !== 'object' && t.combatStatus !== 'dead'
    );
    if (combatTokens.length === 0) return;
    const visibleTokens = combatTokens.filter((t) => t.visibleOnTv);
    const pool = [...(visibleTokens.length > 0 ? visibleTokens : combatTokens)].sort((a, b) => {
      const aInit =
        a.playerId
          ? dmState.players.find((p) => p.id === a.playerId)?.initiative ?? a.initiative ?? 0
          : a.initiative ?? 0;
      const bInit =
        b.playerId
          ? dmState.players.find((p) => p.id === b.playerId)?.initiative ?? b.initiative ?? 0
          : b.initiative ?? 0;
      return bInit - aInit;
    });
    const currentIdx = pool.findIndex((t) => t.id === dmState.scene.activeTurnTokenId);
    const nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % pool.length;
    const nextRound = currentIdx === pool.length - 1 ? dmState.scene.round + 1 : dmState.scene.round;
    send({
      type: 'dm:setScene',
      patch: {
        activeTurnTokenId: pool[nextIdx].id,
        round: nextRound,
      },
    });
  };

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    send({
      type: 'dm:upsertPlayer',
      player: {
        name: newPlayerName.trim(),
        ownerAccountId: newPlayerOwnerAccountId || undefined,
        classId: newPlayerClassId,
        backgroundId: newPlayerBackgroundId,
        speciesId: newPlayerSpeciesId,
        color: newPlayerColor,
        maxHp: newPlayerHp,
        xp: 0,
      },
    });
    setNewPlayerName('');
    setShowAddPlayer(false);
  };

  const handleAddInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer || !itemName.trim()) return;
    const selectedWeapon =
      itemCategory === 'weapon' && itemCatalogId
        ? catalogs.weapons.find((w) => w.id === itemCatalogId)
        : undefined;
    const selectedArmor =
      itemCategory === 'armor' && itemCatalogId
        ? catalogs.armors.find((a) => a.id === itemCatalogId)
        : undefined;
    const selectedGear =
      itemCategory === 'gear' && itemCatalogId
        ? catalogs.gearItems.find((g) => g.id === itemCatalogId)
        : undefined;

    send({
      type: 'dm:addInventoryItem',
      playerId: selectedPlayer.id,
      item: {
        name: itemName.trim(),
        category: itemCategory,
        quantity: Math.max(1, itemQty),
        description: itemDesc.trim(),
        equipped: false,
        catalogItemId: selectedWeapon?.id ?? selectedArmor?.id ?? selectedGear?.id,
        weaponCategory:
          itemCategory === 'weapon' ? (selectedWeapon?.category ?? itemWeaponCat) : undefined,
        weaponRangeType:
          itemCategory === 'weapon' ? (selectedWeapon?.rangeType ?? itemWeaponRange) : undefined,
        reachFt: itemCategory === 'weapon' ? selectedWeapon?.reachFt : undefined,
        rangeNormalFt: itemCategory === 'weapon' ? selectedWeapon?.rangeNormalFt : undefined,
        rangeMaxFt: itemCategory === 'weapon' ? selectedWeapon?.rangeMaxFt : undefined,
        versatileDamage: itemCategory === 'weapon' ? selectedWeapon?.versatileDamage : undefined,
        thrownNormalFt: itemCategory === 'weapon' ? selectedWeapon?.thrownNormalFt : undefined,
        thrownMaxFt: itemCategory === 'weapon' ? selectedWeapon?.thrownMaxFt : undefined,
        propertyIds: itemCategory === 'weapon' ? selectedWeapon?.propertyIds : undefined,
        masteryId: itemCategory === 'weapon' ? selectedWeapon?.masteryId : undefined,
        ammoItemId: itemCategory === 'weapon' ? selectedWeapon?.ammoItemId : undefined,
        armorCategory:
          itemCategory === 'armor' ? (selectedArmor?.category ?? itemArmorCat) : undefined,
        damage: selectedWeapon?.damage,
        properties: selectedWeapon
          ? formatWeaponPropertiesSummary(selectedWeapon, catalogs)
          : undefined,
        mastery: selectedWeapon?.mastery,
        armorClass: selectedArmor?.armorClass,
        acBase: selectedArmor?.acBase,
        acAbilityId: selectedArmor?.acAbilityId,
        acMaxBonus: selectedArmor?.acMaxBonus,
        strengthReq: selectedArmor?.strengthReq,
        stealth: selectedArmor?.stealth,
        gearKind: selectedGear?.kind,
        packQuantity: selectedGear?.packQuantity,
        weight:
          itemWeight.trim() ||
          selectedWeapon?.weight ||
          selectedArmor?.weight ||
          selectedGear?.weight,
        price: selectedWeapon?.price ?? selectedArmor?.price ?? selectedGear?.price,
      },
    });
    setItemName('');
    setItemQty(1);
    setItemWeight('');
    setItemDesc('');
    setItemCatalogId('');
  };

  const handleToggleCondition = (cond: string) => {
    if (!selectedPlayer) return;
    const exists = selectedPlayer.conditions.includes(cond);
    const next = exists
      ? selectedPlayer.conditions.filter((c) => c !== cond)
      : [...selectedPlayer.conditions, cond];
    const isExhaustion = cond.toLowerCase().includes('истощ');
    send({
      type: 'dm:updateStats',
      playerId: selectedPlayer.id,
      conditions: next,
      ...(isExhaustion
        ? { exhaustionLevel: exists ? 0 : Math.max(1, selectedPlayer.exhaustionLevel ?? 1) }
        : {}),
    });
  };

  const handleToggleTokenCondition = (tok: MapToken, condName: string) => {
    const current = tok.conditions ?? [];
    const exists = current.includes(condName);
    const next = exists ? current.filter((c) => c !== condName) : [...current, condName];
    send({
      type: 'dm:setTokenConditions',
      tokenId: tok.id,
      conditions: next,
    });
  };

  const handleToggleSkill = (skillId: string) => {
    if (!selectedPlayer) return;
    const bgLocked = new Set(getBackgroundLockedSkillIds(selectedPlayer.backgroundId, catalogs));
    const allowedSkills = getHeroAllowedSkillIds(
      selectedPlayer.classId,
      selectedPlayer.backgroundId,
      catalogs
    );
    const exists = selectedPlayer.proficientSkillIds.includes(skillId);
    if (exists && bgLocked.has(skillId)) return;
    if (!exists && allowedSkills && !allowedSkills.has(skillId)) return;
    const currentExp = selectedPlayer.expertiseSkillIds ?? [];
    const nextProf = exists
      ? selectedPlayer.proficientSkillIds.filter((id) => id !== skillId)
      : [...selectedPlayer.proficientSkillIds, skillId];
    const nextExp = exists ? currentExp.filter((id) => id !== skillId) : currentExp;
    send({
      type: 'dm:updateStats',
      playerId: selectedPlayer.id,
      proficientSkillIds: nextProf,
      expertiseSkillIds: nextExp,
    });
  };

  const handleToggleExpertise = (skillId: string) => {
    if (!selectedPlayer) return;
    const allowedSkills = getHeroAllowedSkillIds(
      selectedPlayer.classId,
      selectedPlayer.backgroundId,
      catalogs
    );
    const currentExp = selectedPlayer.expertiseSkillIds ?? [];
    const hasExp = currentExp.includes(skillId);
    if (hasExp) {
      send({
        type: 'dm:updateStats',
        playerId: selectedPlayer.id,
        expertiseSkillIds: currentExp.filter((id) => id !== skillId),
      });
    } else {
      if (allowedSkills && !allowedSkills.has(skillId)) return;
      const nextProf = selectedPlayer.proficientSkillIds.includes(skillId)
        ? selectedPlayer.proficientSkillIds
        : [...selectedPlayer.proficientSkillIds, skillId];
      send({
        type: 'dm:updateStats',
        playerId: selectedPlayer.id,
        proficientSkillIds: nextProf,
        expertiseSkillIds: [...currentExp, skillId],
      });
    }
  };

  const handleToggleProficiency = (profId: string) => {
    if (!selectedPlayer) return;
    const exists = selectedPlayer.proficiencyIds.includes(profId);
    const next = exists
      ? selectedPlayer.proficiencyIds.filter((id) => id !== profId)
      : [...selectedPlayer.proficiencyIds, profId];
    send({
      type: 'dm:updateStats',
      playerId: selectedPlayer.id,
      proficiencyIds: next,
    });
  };

  const handleSendEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() && !eventMessage.trim()) return;
    send({
      type: 'dm:triggerEvent',
      scope: eventScope,
      targetPlayerId: eventScope === 'private' ? eventTargetPlayerId || selectedPlayer?.id : undefined,
      title: eventTitle.trim(),
      message: eventMessage.trim(),
      tone: eventTone,
      showBannerOnTv: eventScope === 'public' ? showBannerOnTv : false,
    });
    setEventTitle('');
    setEventMessage('');
  };

  const handleAddToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenLabel.trim()) return;
    const parsedMaxHp = typeof tokenMaxHp === 'number' && tokenMaxHp > 0 ? tokenMaxHp : undefined;
    const parsedAc = typeof tokenAc === 'number' && tokenAc > 0 ? tokenAc : undefined;
    const newToken: MapToken = {
      id: `token-${Date.now().toString(36)}`,
      label: tokenLabel.trim(),
      kind: tokenKind,
      color: tokenColor,
      x: Math.floor(dmState.map.cols / 2),
      y: Math.floor(dmState.map.rows / 2),
      size: tokenSize,
      visibleOnTv: true,
      initiative: tokenInitiative,
      monsterId: tokenKind === 'enemy' && tokenMonsterId ? tokenMonsterId : undefined,
      hp: parsedMaxHp,
      maxHp: parsedMaxHp,
      ac: parsedAc,
    };
    send({ type: 'dm:upsertToken', token: newToken });
    setTokenLabel('');
    setTokenInitiative(10);
    setTokenMonsterId('');
    setTokenMaxHp('');
    setTokenAc('');
    setSelectedTokenId(newToken.id);
  };

  const nextLevelRef = selectedPlayer
    ? getNextLevelThreshold(selectedPlayer.xp, catalogs.levels)
    : null;
  const selectedClassRef = selectedPlayer
    ? catalogs.classes.find((c) => c.id === selectedPlayer.classId) ?? null
    : null;
  const selectedSubclassRef =
    selectedPlayer?.subclassId && selectedPlayer.level >= 3
      ? catalogs.subclasses.find((s) => s.id === selectedPlayer.subclassId) ?? null
      : null;
  const profBonus = selectedPlayer
    ? getClassProficiencyBonus(selectedPlayer.level, selectedClassRef)
    : 2;
  const levelUpChecklist = selectedPlayer
    ? getHeroLevelUpChecklist(selectedPlayer, catalogs)
    : null;
  const heroActions = selectedPlayer ? computeHeroActions(selectedPlayer, catalogs) : [];
  const activeCreationRequest = activeCreationRequestId
    ? dmState.creationRequests.find((r) => r.id === activeCreationRequestId) ?? null
    : null;
  const pendingQueueCount = dmState.creationRequests.length;
  const getAccountName = (accountId?: string) =>
    accountId ? dmState.accounts.find((a) => a.id === accountId)?.name ?? null : null;

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0B0F17] text-slate-100 flex flex-col">
      {/* Top Bar with DM / Catalogs Switcher */}
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
            className="flex items-center gap-1 p-1 rounded-lg bg-[#131A26] border border-slate-800 shrink-0"
          >
            <button
              type="button"
              onClick={() => onNavigate('/dm')}
              className="px-3 py-1 rounded-md text-xs font-medium bg-slate-800 text-amber-400 flex items-center gap-1.5 transition-colors whitespace-nowrap"
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
              className="px-3 py-1 rounded-md text-xs font-medium text-slate-400 hover:text-slate-100 flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Справочники</span>
            </button>
          </nav>

          <div className="hidden xl:flex items-center gap-2 text-xs text-slate-400 whitespace-nowrap">
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              aria-hidden="true"
            />
            <span>{status === 'connected' ? 'Сервер активен' : 'Переподключение...'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* In-Game Clock Widget & Controls Popover */}
          {(() => {
            const formattedClock = formatGameClock(dmState.gameClock, clockNowMs);
            const ClockIcon =
              formattedClock.phaseIcon === 'moon'
                ? Moon
                : formattedClock.phaseIcon === 'sunrise'
                  ? Sunrise
                  : formattedClock.phaseIcon === 'sunset'
                    ? Sunset
                    : Sun;
            const currentScale = dmState.gameClock?.timeScale ?? 6;
            return (
              <div className="relative flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setClockPopoverOpen((prev) => !prev)}
                  title="Настройки игрового времени и смены дня и ночи"
                  className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    clockPopoverOpen
                      ? 'bg-amber-500/15 border-amber-500/60 text-amber-200'
                      : 'bg-[#131A26] hover:bg-slate-800 border-slate-700 text-slate-200'
                  }`}
                >
                  <ClockIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="font-mono tabular-nums font-bold">{formattedClock.timeText}</span>
                  <span className="hidden xl:inline text-[11px] text-slate-400">
                    · {formattedClock.dayText} · {formattedClock.phaseLabel}
                  </span>
                  {formattedClock.paused && (
                    <span className="px-1 py-0.5 rounded bg-amber-500/20 text-[9px] font-semibold text-amber-300">
                      Пауза
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    send({
                      type: 'dm:updateGameClock',
                      paused: !formattedClock.paused,
                    })
                  }
                  title={formattedClock.paused ? 'Возобновить ход времени' : 'Поставить время на паузу'}
                  className={`p-2 rounded-lg border transition-colors ${
                    formattedClock.paused
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 hover:bg-amber-500/30'
                      : 'bg-[#131A26] border-slate-700 text-slate-300 hover:text-slate-100 hover:bg-slate-800'
                  }`}
                >
                  {formattedClock.paused ? (
                    <Play className="w-3.5 h-3.5" />
                  ) : (
                    <Pause className="w-3.5 h-3.5" />
                  )}
                </button>

                {clockPopoverOpen && (
                  <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-2xl bg-[#131A26] border border-slate-700 shadow-2xl p-4 space-y-3.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span className="font-semibold text-slate-100">Игровое время</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setClockPopoverOpen(false)}
                        className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100"
                        aria-label="Закрыть"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-3 rounded-xl bg-[#0B0F17] border border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <ClockIcon className="w-6 h-6 text-amber-400 shrink-0" />
                        <div>
                          <div className="text-lg font-mono tabular-nums font-bold text-slate-100 leading-tight">
                            {formattedClock.timeText}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {formattedClock.dayText} · {formattedClock.phaseLabel}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          send({ type: 'dm:updateGameClock', paused: !formattedClock.paused })
                        }
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors ${
                          formattedClock.paused
                            ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                            : 'bg-amber-500/20 border border-amber-500/50 text-amber-200 hover:bg-amber-500/30'
                        }`}
                      >
                        {formattedClock.paused ? (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>Идёт</span>
                          </>
                        ) : (
                          <>
                            <Pause className="w-3.5 h-3.5" />
                            <span>Пауза</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Quick Time Advance */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] text-slate-400">Перемотать вперёд</div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { label: '+15м', mins: 15 },
                          { label: '+1ч', mins: 60 },
                          { label: '+4ч', mins: 240 },
                          { label: '+8ч', mins: 480 },
                        ].map((step) => (
                          <button
                            key={step.mins}
                            type="button"
                            onClick={() =>
                              send({ type: 'dm:updateGameClock', addMinutes: step.mins })
                            }
                            className="py-1.5 rounded-lg bg-[#0B0F17] hover:bg-slate-800 border border-slate-800 font-mono text-[11px] text-slate-200 transition-colors"
                          >
                            {step.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Time-of-Day Presets */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] text-slate-400">Выставить время суток</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { label: 'Рассвет 05:30', min: 5 * 60 + 30 },
                          { label: 'Утро 09:00', min: 9 * 60 },
                          { label: 'Полдень 12:00', min: 12 * 60 },
                          { label: 'Вечер 18:00', min: 18 * 60 },
                          { label: 'Закат 19:00', min: 19 * 60 },
                          { label: 'Ночь 22:00', min: 22 * 60 },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() =>
                              send({ type: 'dm:updateGameClock', setMinuteOfDay: preset.min })
                            }
                            className="px-2 py-1.5 rounded-lg bg-[#0B0F17] hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-200 transition-colors"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Exact Time & Day Picker */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                      <label className="space-y-1">
                        <span className="text-[10px] text-slate-400">Точное время</span>
                        <input
                          type="time"
                          value={formattedClock.timeText}
                          onChange={(e) => {
                            const [hh, mm] = e.target.value.split(':').map(Number);
                            if (Number.isFinite(hh) && Number.isFinite(mm)) {
                              send({
                                type: 'dm:updateGameClock',
                                setMinuteOfDay: hh * 60 + mm,
                              });
                            }
                          }}
                          className="w-full px-2 py-1.5 rounded-lg bg-[#0B0F17] border border-slate-700 font-mono text-xs text-slate-100"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] text-slate-400">День кампании</span>
                        <input
                          type="number"
                          min={1}
                          value={formattedClock.day}
                          onChange={(e) =>
                            send({
                              type: 'dm:updateGameClock',
                              setDay: Math.max(1, Number(e.target.value) || 1),
                            })
                          }
                          className="w-full px-2 py-1.5 rounded-lg bg-[#0B0F17] border border-slate-700 font-mono text-xs text-slate-100"
                        />
                      </label>
                    </div>

                    {/* Time Scale Selector */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-800">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Скорость хода времени</span>
                        <span className="font-mono text-amber-300">×{currentScale}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { label: '4ч/сут', scale: 6, title: '24 игровых часа = 4 реальных часа (по умолч.)' },
                          { label: '2ч/сут', scale: 12, title: '24 игровых часа = 2 реальных часа' },
                          { label: '1ч/сут', scale: 24, title: '24 игровых часа = 1 реальный час' },
                          { label: '1:1', scale: 1, title: 'Реальное время' },
                        ].map((opt) => (
                          <button
                            key={opt.scale}
                            type="button"
                            title={opt.title}
                            onClick={() =>
                              send({ type: 'dm:updateGameClock', timeScale: opt.scale })
                            }
                            className={`py-1 rounded border text-[10px] font-mono transition-colors ${
                              Math.abs(currentScale - opt.scale) < 0.01
                                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-semibold'
                                : 'bg-[#0B0F17] border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {(() => {
            const isAudioMuted = Boolean(dmState.tvDisplay.audioMuted);
            const activeTrackUrl =
              dmState.tvDisplay.phase === 'title_splash'
                ? dmState.tvDisplay.splashAudioUrl
                : activeLocation?.ambientAudioUrl;
            const activeTrackName =
              dmState.tvDisplay.phase === 'title_splash'
                ? dmState.tvDisplay.splashAudioName
                : activeLocation?.ambientAudioName;
            const hasTrack = Boolean(activeTrackUrl);
            return (
              <button
                type="button"
                onClick={() => send({ type: 'dm:setAudioMuted', muted: !isAudioMuted })}
                title={
                  isAudioMuted
                    ? 'Звук на ТВ отключён — нажмите, чтобы включить'
                    : hasTrack
                      ? `Звук на ТВ включён (${activeTrackName || 'MP3'}) — нажмите, чтобы выключить`
                      : 'Звук на ТВ включён (для текущей сцены аудио не загружено) — нажмите, чтобы заглушить'
                }
                aria-pressed={isAudioMuted}
                className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  isAudioMuted
                    ? 'bg-rose-500/20 border-rose-500/60 text-rose-200 hover:bg-rose-500/30'
                    : hasTrack
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200 hover:bg-emerald-500/25'
                      : 'bg-[#131A26] hover:bg-slate-800 border-slate-700 text-slate-200'
                }`}
              >
                {isAudioMuted ? (
                  <VolumeX className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <Volume2
                    className={`w-4 h-4 shrink-0 ${hasTrack ? 'text-emerald-400' : 'text-slate-400'}`}
                  />
                )}
                <span className="hidden sm:inline">{isAudioMuted ? 'Звук выкл' : 'Звук ТВ'}</span>
              </button>
            );
          })()}

          <input
            ref={splashAudioInputRef}
            type="file"
            accept=".mp3,audio/mpeg"
            onChange={handleUploadSplashAudio}
            className="hidden"
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleMapUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingMap}
            className="px-3 py-2 rounded-lg bg-[#131A26] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <ImagePlus className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">{uploadingMap ? 'Загрузка...' : 'Загрузить карту'}</span>
          </button>

          {activeLocation?.kind !== 'city' && (
            <>
              <button
                type="button"
                onClick={() => send({ type: 'dm:startInitiativeRoll' })}
                className="px-3 py-2 rounded-lg bg-[#131A26] hover:bg-slate-800 border border-slate-700 hover:border-amber-500/60 text-xs font-medium text-amber-300 flex items-center gap-1.5 transition-colors whitespace-nowrap"
                title="Открыть бросок инициативы для всех участников на карте"
              >
                <Dices className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Инициатива</span>
              </button>
              <button
                type="button"
                onClick={handleNextTurn}
                className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <span>След. ход</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          <a
            href="/tv"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex px-3 py-2 rounded-lg bg-[#131A26] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap"
          >
            Открыть ТВ
          </a>
        </div>
      </header>

      {/* DM Validation / Action Blocked Notification Toast */}
      {errorNotice && (
        <div
          role="alert"
          className="fixed top-16 right-4 z-50 w-[calc(100%-2rem)] max-w-md rounded-2xl bg-red-950/95 border border-red-500/70 px-4 py-3 shadow-2xl flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="text-xs font-semibold text-red-200">Ограничение правил</div>
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

      {/* Main Split Workspace */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Left/Center: Interactive Drag & Drop World/Tactical Board */}
        <section className="flex-1 min-h-[260px] min-w-0 flex flex-col bg-[#0B0F17]">
          {/* TV Broadcast / Staging Control Bar */}
          {dmState.tvDisplay.phase === 'title_splash' && (
            <div className="shrink-0 px-4 py-3 bg-amber-500/15 border-b border-amber-500/50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  {editingCampaignTitle ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        send({
                          type: 'dm:updateCampaignTitle',
                          campaignTitle: campaignTitleDraft.trim() || dmState.tvDisplay.campaignTitle,
                          campaignSubtitle: campaignSubtitleDraft.trim(),
                        });
                        setEditingCampaignTitle(false);
                      }}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <input
                        type="text"
                        value={campaignTitleDraft}
                        onChange={(e) => setCampaignTitleDraft(e.target.value)}
                        placeholder="Название кампании"
                        className="px-2.5 py-1 rounded-lg bg-[#0B0F17] border border-amber-500/60 text-xs text-slate-100"
                      />
                      <input
                        type="text"
                        value={campaignSubtitleDraft}
                        onChange={(e) => setCampaignSubtitleDraft(e.target.value)}
                        placeholder="Подзаголовок"
                        className="px-2.5 py-1 rounded-lg bg-[#0B0F17] border border-slate-700 text-xs text-slate-200"
                      />
                      <button
                        type="submit"
                        className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold"
                      >
                        Сохранить
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCampaignTitle(false)}
                        className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs"
                      >
                        Отмена
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="text-xs font-semibold text-amber-200 flex items-center gap-2 flex-wrap">
                        <span>На ТВ титульная заставка: «{dmState.tvDisplay.campaignTitle}»</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCampaignTitleDraft(dmState.tvDisplay.campaignTitle);
                            setCampaignSubtitleDraft(dmState.tvDisplay.campaignSubtitle);
                            setEditingCampaignTitle(true);
                          }}
                          className="text-[11px] font-normal text-amber-400 hover:text-amber-300 underline underline-offset-2"
                        >
                          изменить
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Подготовьте карту «{activeLocation?.name ?? dmState.scene.locationName}» и фишки, затем нажмите кнопку старта.
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0B0F17]/80 border border-amber-500/35 text-[11px] text-slate-200">
                  <Music
                    className={`w-3.5 h-3.5 shrink-0 ${
                      dmState.tvDisplay.splashAudioUrl ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  />
                  {dmState.tvDisplay.splashAudioUrl ? (
                    <>
                      <span
                        className="max-w-[140px] truncate text-emerald-200"
                        title={dmState.tvDisplay.splashAudioName || 'Аудио заставки'}
                      >
                        {dmState.tvDisplay.splashAudioName || 'Заставка.mp3'}
                      </span>
                      <button
                        type="button"
                        onClick={() => splashAudioInputRef.current?.click()}
                        disabled={uploadingSplashAudio}
                        className="text-amber-300 hover:text-amber-200 underline underline-offset-2 ml-1"
                      >
                        {uploadingSplashAudio ? '...' : 'заменить'}
                      </button>
                      <button
                        type="button"
                        onClick={() => send({ type: 'dm:clearSplashAudio' })}
                        title="Удалить аудио заставки"
                        className="p-0.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => splashAudioInputRef.current?.click()}
                      disabled={uploadingSplashAudio}
                      className="text-amber-200 hover:text-amber-100 font-medium"
                    >
                      {uploadingSplashAudio ? 'Загрузка MP3...' : '+ MP3 заставки'}
                    </button>
                  )}
                </div>
                {splashAudioError && (
                  <span className="text-[11px] text-rose-300">{splashAudioError}</span>
                )}
                <button
                  type="button"
                  onClick={() => send({ type: 'dm:startGame' })}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 shadow-md"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Начать игру</span>
                </button>
              </div>
            </div>
          )}

          {dmState.tvDisplay.phase === 'traveling' && (
            <div className="shrink-0 px-4 py-3 bg-emerald-500/15 border-b border-emerald-500/50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-emerald-200">
                    На ТВ заставка перехода:{' '}
                    {dmState.tvDisplay.fromLocationName
                      ? `${dmState.tvDisplay.fromLocationName} → `
                      : ''}
                    {dmState.tvDisplay.toLocationName || activeLocation?.name}
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Игроки не видят новую карту. Расставьте фишки героев и врагов, затем нажмите «Готово».
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => send({ type: 'dm:confirmLocationReady' })}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Готово — показать карту</span>
              </button>
            </div>
          )}

          {/* Location Switcher & Live Controls */}
          <div className="shrink-0 px-4 py-2 border-b border-slate-800 bg-[#131A26]/70 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              {parentLocation && (
                <button
                  type="button"
                  onClick={() =>
                    send({
                      type: 'dm:beginLocationTransition',
                      targetLocationId: parentLocation.id,
                      moveParty: movePartyOnTravel,
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-1 transition-colors whitespace-nowrap"
                  title={`Вернуться в ${parentLocation.name}`}
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                  <span>{parentLocation.name}</span>
                </button>
              )}

              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <select
                  aria-label="Активная локация"
                  value={dmState.activeLocationId}
                  onChange={(e) => {
                    const targetId = e.target.value;
                    if (targetId && targetId !== dmState.activeLocationId) {
                      send({
                        type: 'dm:beginLocationTransition',
                        targetLocationId: targetId,
                        moveParty: movePartyOnTravel,
                      });
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#0B0F17] border border-slate-700 text-xs font-medium text-slate-100 max-w-[240px]"
                >
                  {dmState.locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.kind === 'city' ? '[Город] ' : '[Бой] '}
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={movePartyOnTravel}
                  onChange={(e) => setMovePartyOnTravel(e.target.checked)}
                  className="accent-amber-500"
                />
                <span>Переносить партию при переходе</span>
              </label>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {dmState.tvDisplay.phase === 'live' && (
                <button
                  type="button"
                  onClick={() => send({ type: 'dm:showTitleSplash' })}
                  className="px-2.5 py-1 rounded-lg bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-amber-300 text-[11px] transition-colors whitespace-nowrap"
                >
                  На заставку ТВ
                </button>
              )}
              <button
                type="button"
                onClick={() => onNavigate('/locations')}
                className="px-2.5 py-1 rounded-lg bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 text-amber-400 text-[11px] font-medium transition-colors whitespace-nowrap"
              >
                Настроить локации →
              </button>
            </div>
          </div>

          {/* Map Toolbar */}
          <div className="shrink-0 px-4 py-2 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-slate-400">
                {activeLocation?.kind === 'city'
                  ? 'Свободное перемещение · Нажимайте на точки на карте для перехода'
                  : 'Привязка к клеткам (1 кл. = 5 фт.) · Перетаскивайте фишки мышью'}
              </span>
              {uploadError && <span className="text-red-400">{uploadError}</span>}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Per-location Day/Night Cycle Toggle */}
              {activeLocation && (
                <button
                  type="button"
                  onClick={() =>
                    send({
                      type: 'dm:upsertLocation',
                      location: {
                        id: activeLocation.id,
                        name: activeLocation.name,
                        kind: activeLocation.kind,
                        affectedByTimeOfDay: !activeLocation.affectedByTimeOfDay,
                      },
                    })
                  }
                  title="Привязать освещение и оттенок карты к игровому времени суток (день/ночь)"
                  className={`px-2.5 py-1 rounded border text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
                    activeLocation.affectedByTimeOfDay
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-200'
                      : 'bg-[#131A26] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>{activeLocation.affectedByTimeOfDay ? 'День/Ночь: Авто' : 'День/Ночь: Выкл'}</span>
                </button>
              )}

              {/* Map Lighting Selector (all map types) */}
              {(() => {
                const effLighting = resolveEffectiveMapLighting(
                  dmState.map.lighting,
                  activeLocation?.affectedByTimeOfDay,
                  dmState.gameClock,
                  clockNowMs
                );
                return (
                  <div className="inline-flex items-center rounded border border-slate-800 bg-[#131A26] p-0.5">
                    {(
                      [
                        { id: 'bright', label: 'Яркий', Icon: Sun, activeClass: 'bg-amber-500/20 text-amber-300' },
                        { id: 'dim', label: 'Полумрак', Icon: Sunset, activeClass: 'bg-sky-500/20 text-sky-300' },
                        { id: 'darkness', label: 'Темнота', Icon: Moon, activeClass: 'bg-indigo-500/30 text-indigo-200' },
                      ] as Array<{ id: MapLighting; label: string; Icon: React.ComponentType<{ className?: string }>; activeClass: string }>
                    ).map(({ id, label, Icon, activeClass }) => {
                      const isActive = effLighting === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          title={
                            activeLocation?.affectedByTimeOfDay
                              ? `Сейчас задаётся игровым временем (${getMapLightingDescription(id)}). Отключите «День/Ночь: Авто» для ручного выбора.`
                              : getMapLightingDescription(id)
                          }
                          onClick={() => {
                            if (activeLocation?.affectedByTimeOfDay) {
                              send({
                                type: 'dm:upsertLocation',
                                location: {
                                  id: activeLocation.id,
                                  name: activeLocation.name,
                                  kind: activeLocation.kind,
                                  affectedByTimeOfDay: false,
                                },
                              });
                            }
                            send({
                              type: 'dm:updateMap',
                              locationId: dmState.activeLocationId,
                              patch: { lighting: id },
                            });
                          }}
                          className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                            isActive ? activeClass : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              {/* DM-only Tactical Vision & Reach Overlay Toggle */}
              {activeLocation?.kind === 'tactical' && (
                <button
                  type="button"
                  onClick={() => setShowDmTacticalOverlay((prev) => !prev)}
                  title="Отображать на карте мастера зоны зрения и досягаемости активной фишки (на ТВ скрыто)"
                  className={`px-2.5 py-1 rounded border flex items-center gap-1.5 transition-colors ${
                    showDmTacticalOverlay
                      ? 'bg-rose-500/15 border-rose-500/50 text-rose-200'
                      : 'bg-[#131A26] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Зоны ДМ</span>
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  send({
                    type: 'dm:updateMap',
                    locationId: dmState.activeLocationId,
                    patch: { showGrid: !dmState.map.showGrid },
                  })
                }
                title="Размерность сетки настраивается в разделе «Карта мира»"
                className={`px-2.5 py-1 rounded border flex items-center gap-1.5 transition-colors ${
                  dmState.map.showGrid
                    ? 'bg-slate-800 border-slate-600 text-slate-100'
                    : 'bg-[#131A26] border-slate-800 text-slate-400'
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span>Сетка</span>
              </button>

              {(() => {
                const hiddenCount = (activeLocation?.hotspots ?? []).filter((h) => !h.visibleOnTv).length;
                if (hiddenCount === 0) return null;
                return (
                  <button
                    type="button"
                    onClick={() => setShowHiddenHotspots((prev) => !prev)}
                    className={`px-2.5 py-1 rounded border flex items-center gap-1.5 transition-colors ${
                      showHiddenHotspots
                        ? 'bg-slate-800 border-amber-500/60 text-amber-300'
                        : 'bg-[#131A26] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                    title="Показать или скрыть спрятанные точки на карте мастера"
                  >
                    {showHiddenHotspots ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>Скрытые ({hiddenCount})</span>
                  </button>
                );
              })()}

              {dmState.scene.activeEvent && (
                <button
                  type="button"
                  onClick={() => send({ type: 'dm:clearBanner' })}
                  className="px-2.5 py-1 rounded bg-red-950/60 border border-red-800/70 text-red-200 hover:bg-red-900/60 flex items-center gap-1 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Убрать баннер ТВ</span>
                </button>
              )}
            </div>
          </div>

          {/* DM-Only Tactical Vision & Attack Range HUD Strip */}
          {(() => {
            const isTacticalLoc = activeLocation?.kind === 'tactical';
            const turnToken =
              isTacticalLoc && dmState.scene.activeTurnTokenId
                ? dmState.tokens.find((t) => t.id === dmState.scene.activeTurnTokenId) ?? null
                : null;

            const turnPlayer = turnToken?.playerId
              ? dmState.players.find((p) => p.id === turnToken.playerId) ?? null
              : null;
            const turnMonster = turnToken?.monsterId
              ? catalogs.monsters.find((m) => m.id === turnToken.monsterId) ?? null
              : null;

            const attackOptions: Array<{
              id: string;
              label: string;
              rangeLabel: string;
              normalFt: number;
              maxFt: number;
            }> = [];

            if (turnPlayer) {
              const equippedWeapons = turnPlayer.inventory.filter(
                (i) => i.equipped && i.category === 'weapon'
              );
              for (const wp of equippedWeapons) {
                const resolved = resolveWeaponReachRange(wp, catalogs);
                const rangeLabel =
                  resolved.rangeType === 'ranged' && resolved.maxFt > resolved.normalFt
                    ? `${resolved.normalFt}/${resolved.maxFt} фт.`
                    : `${resolved.normalFt} фт.`;
                attackOptions.push({
                  id: wp.id,
                  label: wp.name,
                  rangeLabel,
                  normalFt: resolved.normalFt,
                  maxFt: resolved.maxFt,
                });
              }
            } else if (turnMonster) {
              for (const act of turnMonster.actions) {
                const resolved = resolveMonsterActionRange(act);
                if (!resolved) continue;
                const rangeLabel =
                  resolved.rangeType === 'ranged' && resolved.maxFt > resolved.normalFt
                    ? `${resolved.normalFt}/${resolved.maxFt} фт.`
                    : `${resolved.normalFt} фт.`;
                attackOptions.push({
                  id: act.id,
                  label: act.name,
                  rangeLabel,
                  normalFt: resolved.normalFt,
                  maxFt: resolved.maxFt,
                });
              }
            }

            const activeAttacks =
              selectedAttackOverlayId === 'all'
                ? attackOptions
                : attackOptions.filter((a) => a.id === selectedAttackOverlayId);
            const effectiveAttacks = activeAttacks.length > 0 ? activeAttacks : attackOptions;

            const hasEffectiveAttacks = effectiveAttacks.length > 0;
            const attackNormalFt = hasEffectiveAttacks
              ? effectiveAttacks.reduce((acc, item) => Math.max(acc, item.normalFt), 0)
              : null;
            const attackMaxFt = hasEffectiveAttacks
              ? effectiveAttacks.reduce((acc, item) => Math.max(acc, item.maxFt), 0)
              : null;
            const attackIncludesSelf = effectiveAttacks.some((item) => item.normalFt === 0);

            const visionEntries = turnPlayer
              ? turnPlayer.visions
              : turnMonster
                ? turnMonster.visions
                : undefined;

            const activeTurnConditions = turnPlayer
              ? turnPlayer.conditions
              : turnToken?.conditions ?? [];

            const formattedClockForMap = formatGameClock(dmState.gameClock, clockNowMs);
            const effectiveMapLighting = resolveEffectiveMapLighting(
              dmState.map.lighting,
              activeLocation?.affectedByTimeOfDay,
              dmState.gameClock,
              clockNowMs
            );
            const turnPlayerEncumbrance = turnPlayer
              ? computeHeroEncumbrance(turnPlayer, catalogs)
              : null;
            const turnPlayerDeathSaves = turnPlayer?.deathSaves ?? null;

            const effectiveVision = turnToken
              ? computeEffectiveVisionRanges(
                  visionEntries,
                  catalogs.visions,
                  effectiveMapLighting,
                  activeTurnConditions
                )
              : null;

            const dmOverlay: DmTacticalOverlay | null =
              isTacticalLoc && showDmTacticalOverlay && turnToken && effectiveVision
                ? {
                    tokenId: turnToken.id,
                    clearRangeFt: effectiveVision.clearRangeFt,
                    visibleRangeFt: effectiveVision.visibleRangeFt,
                    attackNormalFt,
                    attackMaxFt,
                    attackIncludesSelf,
                  }
                : null;

            return (
              <>
                {isTacticalLoc && showDmTacticalOverlay && (
                  <div className="shrink-0 px-4 py-1.5 border-b border-slate-800/70 bg-[#0F1521]/90 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    {turnToken && effectiveVision ? (
                      <>
                        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                          <span className="inline-flex items-center gap-1.5 font-semibold text-amber-300">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: turnToken.color }}
                            />
                            <span>Ход: {turnToken.label}</span>
                          </span>
                          <span className="text-slate-600">·</span>
                          <span className="text-sky-300 flex items-center gap-1">
                            <Eye className="w-3 h-3 shrink-0" />
                            <span>{effectiveVision.summary}</span>
                          </span>
                          {turnPlayerEncumbrance && turnPlayerEncumbrance.hasStrDexConDisadvantage && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 border border-rose-400/70 text-rose-200 font-semibold">
                              <AlertTriangle className="w-3 h-3 text-rose-300 shrink-0" />
                              <span>
                                ПОМЕХА (СИЛ/ЛОВ/ТЕЛ) · {turnPlayerEncumbrance.conditionName}
                              </span>
                            </span>
                          )}
                          {turnPlayerEncumbrance && turnPlayerEncumbrance.tier === 'light' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/50 text-amber-200">
                              <Scale className="w-3 h-3 shrink-0" />
                              <span>Слегка перегружен (−10 фт.)</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {attackOptions.length > 0 ? (
                            <>
                              {attackOptions.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedAttackOverlayId('all')}
                                  className={`px-2 py-0.5 rounded border text-[11px] transition-colors ${
                                    selectedAttackOverlayId === 'all'
                                      ? 'bg-rose-500/20 border-rose-500/60 text-rose-200 font-medium'
                                      : 'bg-[#131A26] border-slate-800 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  Все ({attackOptions.length})
                                </button>
                              )}
                              {attackOptions.map((opt) => {
                                const isSel =
                                  attackOptions.length === 1 ||
                                  selectedAttackOverlayId === opt.id;
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() =>
                                      setSelectedAttackOverlayId(
                                        selectedAttackOverlayId === opt.id ? 'all' : opt.id
                                      )
                                    }
                                    className={`px-2 py-0.5 rounded border text-[11px] transition-colors ${
                                      isSel
                                        ? 'bg-rose-500/20 border-rose-500/60 text-rose-200 font-medium'
                                        : 'bg-[#131A26] border-slate-800 text-slate-400 hover:text-slate-200'
                                    }`}
                                  >
                                    {opt.label}{' '}
                                    <span className="font-mono text-rose-300/90">
                                      ({opt.rangeLabel})
                                    </span>
                                  </button>
                                );
                              })}
                            </>
                          ) : (
                            <span className="text-slate-500">
                              {turnPlayer
                                ? 'Нет экипированного оружия'
                                : 'Нет действий с указанной дистанцией'}
                            </span>
                          )}

                          <span className="hidden xl:inline-flex items-center gap-2 ml-2 pl-2 border-l border-slate-800 text-[10px] text-slate-400">
                            <span className="inline-flex items-center gap-1">
                              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/35 border border-rose-400/50" />
                              норм.
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/15 border border-rose-400/25" />
                              макс.
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span className="w-2.5 h-2.5 rounded-sm bg-slate-950/85 border border-slate-700" />
                              вне зрения
                            </span>
                          </span>
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-400">
                        Зоны ДМ включены (скрыто на ТВ): нажмите «Ход» у фишки на вкладке «Фишки», чтобы подсветить её зрение и досягаемость атак.
                      </span>
                    )}
                  </div>
                )}

                {/* Active-Turn Quick Death Saving Throw Bar for Dying Hero */}
                {isTacticalLoc && turnPlayer && turnPlayerDeathSaves?.status === 'dying' && (
                  <div className="shrink-0 px-4 py-2 border-b border-red-500/50 bg-red-950/55 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <HeartPulse className="w-4 h-4 text-red-400 shrink-0" />
                      <span className="font-semibold text-red-200">
                        Спасбросок от смерти — {turnPlayer.name}:
                      </span>
                      <span className="font-mono text-[11px] text-emerald-300">
                        Успехи {turnPlayerDeathSaves.successes}/3
                      </span>
                      <span className="text-slate-500">·</span>
                      <span className="font-mono text-[11px] text-red-300">
                        Провалы {turnPlayerDeathSaves.failures}/3
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() =>
                          send({ type: 'dm:recordDeathSave', playerId: turnPlayer.id, outcome: 'success' })
                        }
                        className="px-2 py-1 rounded bg-emerald-600/80 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-colors"
                      >
                        Успех (10+)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          send({ type: 'dm:recordDeathSave', playerId: turnPlayer.id, outcome: 'failure' })
                        }
                        className="px-2 py-1 rounded bg-red-700/80 hover:bg-red-600 text-white text-[11px] font-semibold transition-colors"
                      >
                        Провал (2–9)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          send({ type: 'dm:recordDeathSave', playerId: turnPlayer.id, outcome: 'nat20' })
                        }
                        className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold transition-colors"
                      >
                        20! (1 HP)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          send({ type: 'dm:recordDeathSave', playerId: turnPlayer.id, outcome: 'nat1' })
                        }
                        className="px-2 py-1 rounded bg-rose-900 hover:bg-rose-800 border border-rose-500/60 text-rose-100 text-[11px] font-semibold transition-colors"
                      >
                        1! (2 пров.)
                      </button>
                    </div>
                  </div>
                )}

                {/* Interactive Map Canvas + Hotspot Action Popover */}
                <div className="relative flex-1 min-h-0 p-4 flex items-center justify-center">
                  <TacticalMap
                    map={dmState.map}
                    tokens={dmState.tokens}
                    locationKind={activeLocation?.kind ?? 'tactical'}
                    hotspots={
                      showHiddenHotspots
                        ? activeLocation?.hotspots ?? []
                        : (activeLocation?.hotspots ?? []).filter((h) => h.visibleOnTv)
                    }
                    activeTurnTokenId={activeLocation?.kind === 'city' ? null : dmState.scene.activeTurnTokenId}
                    interactive={true}
                    selectedTokenId={selectedTokenId}
                    dmOverlay={dmOverlay}
                    timeOfDayTint={
                      activeLocation?.affectedByTimeOfDay
                        ? {
                            overlayCss: formattedClockForMap.overlayCss,
                            filterCss: formattedClockForMap.filterCss,
                          }
                        : null
                    }
                    onSelectToken={(id) => {
                      setSelectedTokenId(id);
                      const tok = dmState.tokens.find((t) => t.id === id);
                      if (tok?.playerId) {
                        setSelectedPlayerId(tok.playerId);
                      }
                    }}
                    onMoveToken={(tokenId, x, y) => send({ type: 'dm:moveToken', tokenId, x, y })}
                    onHotspotClick={(hs) => setActiveHotspotPopover(hs)}
                  />

            {activeHotspotPopover && (() => {
              const targetLoc = activeHotspotPopover.targetLocationId
                ? dmState.locations.find((l) => l.id === activeHotspotPopover.targetLocationId)
                : null;
              return (
                <div className="absolute bottom-6 left-6 z-30 w-80 max-w-[calc(100%-3rem)] rounded-2xl bg-[#131A26]/95 backdrop-blur-md border border-amber-500/60 shadow-2xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-amber-400">Точка активности</div>
                      <div className="text-sm font-semibold text-slate-100 truncate">
                        {activeHotspotPopover.label}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveHotspotPopover(null)}
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100"
                      aria-label="Закрыть"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {activeHotspotPopover.description && (
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {activeHotspotPopover.description}
                    </p>
                  )}

                  {targetLoc ? (
                    <div className="space-y-2 pt-1">
                      <div className="text-[11px] text-slate-400">
                        Ведет в локацию:{' '}
                        <span className="text-slate-200 font-medium">{targetLoc.name}</span> (
                        {targetLoc.kind === 'city' ? 'город' : 'тактическая'})
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          send({
                            type: 'dm:beginLocationTransition',
                            targetLocationId: targetLoc.id,
                            moveParty: true,
                          });
                          setActiveHotspotPopover(null);
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors"
                      >
                        Перейти всей партией (с заставкой)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          send({
                            type: 'dm:beginLocationTransition',
                            targetLocationId: targetLoc.id,
                            moveParty: false,
                          });
                          setActiveHotspotPopover(null);
                        }}
                        className="w-full py-1.5 px-3 rounded-lg bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
                      >
                        Открыть локацию без переноса партии
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      К этой точке не привязана вложенная локация. Привяжите карту в редакторе «Карта мира».
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setActiveHotspotPopover(null);
                      onNavigate('/locations');
                    }}
                    className="w-full pt-2 border-t border-slate-800 text-[11px] text-amber-400 hover:text-amber-300 text-left"
                  >
                    Настроить точку в Карте мира →
                  </button>
                </div>
              );
            })()}
          </div>
              </>
            );
          })()}
        </section>

        {/* Right Sidebar: Queue / Players / Events / Tokens */}
        <aside className="w-full lg:w-[440px] xl:w-[470px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-800 bg-[#131A26] flex flex-col min-h-0 max-h-[54vh] lg:max-h-none">
          {/* Segmented Tabs */}
          <div className="shrink-0 p-2 border-b border-slate-800 grid grid-cols-4 gap-1 bg-[#0B0F17]/50">
            <button
              type="button"
              onClick={() => setActiveTab('queue')}
              className={`py-2 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
                activeTab === 'queue'
                  ? 'bg-[#131A26] text-amber-400 border border-slate-700'
                  : pendingQueueCount > 0
                    ? 'text-amber-300 hover:text-amber-200'
                    : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 shrink-0" />
              <span>Очередь{pendingQueueCount > 0 ? ` (${pendingQueueCount})` : ''}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('players')}
              className={`py-2 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
                activeTab === 'players'
                  ? 'bg-[#131A26] text-amber-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>Герои</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('events')}
              className={`py-2 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
                activeTab === 'events'
                  ? 'bg-[#131A26] text-amber-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bell className="w-3.5 h-3.5 shrink-0" />
              <span>События</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tokens')}
              className={`py-2 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
                activeTab === 'tokens'
                  ? 'bg-[#131A26] text-amber-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>Фишки</span>
            </button>
          </div>

          {/* Pending Queue Notice Bar when on other tabs */}
          {pendingQueueCount > 0 && activeTab !== 'queue' && (
            <button
              type="button"
              onClick={() => setActiveTab('queue')}
              className="shrink-0 px-4 py-2 bg-amber-500/15 hover:bg-amber-500/20 border-b border-amber-500/40 text-xs text-amber-200 flex items-center justify-between gap-2 transition-colors text-left"
            >
              <span>
                Заявки на создание персонажа: <strong>{pendingQueueCount}</strong>
              </span>
              <span className="font-semibold text-amber-400 whitespace-nowrap">Открыть →</span>
            </button>
          )}

          {/* Tab Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* TAB 0: CREATION QUEUE & PARTICIPANT ACCOUNTS */}
            {activeTab === 'queue' && (
              <div className="space-y-5">
                <div className="space-y-2.5">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-xs font-semibold text-slate-200">
                      Очередь создания персонажей ({dmState.creationRequests.length})
                    </h2>
                    <span className="text-[11px] text-slate-400">Живая синхронизация</span>
                  </div>

                  {dmState.creationRequests.length === 0 ? (
                    <div className="p-5 rounded-xl bg-[#0B0F17] border border-slate-800 text-center space-y-1">
                      <p className="text-xs font-medium text-slate-300">Очередь пуста</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Когда участник на телефоне нажмет «Создать персонажа», его заявка сразу появится здесь.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {dmState.creationRequests.map((req, idx) => {
                        const isInProgress = req.status === 'in_progress';
                        return (
                          <div
                            key={req.id}
                            className={`p-3.5 rounded-xl bg-[#0B0F17] border space-y-3 ${
                              isInProgress ? 'border-amber-500/70' : 'border-slate-800'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-100 truncate">
                                  {req.accountName}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {isInProgress
                                    ? `В работе · Черновик: ${req.draft.name || 'без имени'}`
                                    : `В очереди #${idx + 1}`}
                                </div>
                              </div>
                              <span className="text-[11px] font-mono tabular-nums text-slate-500 shrink-0">
                                {new Date(req.createdAt).toLocaleTimeString('ru-RU', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isInProgress) {
                                    send({ type: 'dm:startCreationRequest', requestId: req.id });
                                  }
                                  setActiveCreationRequestId(req.id);
                                }}
                                className="flex-1 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap"
                              >
                                {isInProgress ? 'Продолжить заполнение' : 'Взять в работу'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  send({ type: 'dm:rejectCreationRequest', requestId: req.id });
                                  if (activeCreationRequestId === req.id) {
                                    setActiveCreationRequestId(null);
                                  }
                                }}
                                className="p-2 rounded-lg bg-[#131A26] hover:bg-red-950/60 border border-slate-800 text-slate-400 hover:text-red-300 transition-colors"
                                title="Отклонить заявку"
                                aria-label="Отклонить заявку"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Registered Accounts Directory */}
                <div className="space-y-2.5 pt-3 border-t border-slate-800">
                  <div className="text-xs font-semibold text-slate-300">
                    Зарегистрированные участники ({dmState.accounts.length})
                  </div>
                  {dmState.accounts.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Участники появятся здесь после первого входа с телефона на /play.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-800/80 rounded-xl bg-[#0B0F17] border border-slate-800">
                      {dmState.accounts.map((acc) => {
                        const heroCount = dmState.players.filter(
                          (p) => p.ownerAccountId === acc.id
                        ).length;
                        return (
                          <div
                            key={acc.id}
                            className="px-3 py-2.5 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="font-medium text-slate-100 truncate">{acc.name}</div>
                              <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                                Персонажей: {heroCount}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => send({ type: 'dm:deleteAccount', accountId: acc.id })}
                              className="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400"
                              title="Удалить аккаунт"
                              aria-label="Удалить аккаунт"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 1: PLAYERS & CHARACTER ENTITY */}
            {activeTab === 'players' && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {dmState.players.map((p) => {
                      const inOtherLocation = p.locationId !== dmState.activeLocationId;
                      const pCheck = getHeroLevelUpChecklist(p, catalogs);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPlayerId(p.id)}
                          title={inOtherLocation ? `В другой локации: ${p.locationName}` : p.locationName}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors whitespace-nowrap shrink-0 ${
                            selectedPlayerId === p.id
                              ? 'bg-slate-800 border-amber-500/70 text-slate-100'
                              : 'bg-[#0B0F17] border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: p.color }}
                            aria-hidden="true"
                          />
                          <span>{p.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">Ур.{p.level}</span>
                          {pCheck.hasPendingLevelUp && (
                            <span
                              className="px-1 py-0.5 rounded bg-amber-500/20 border border-amber-400/60 text-[9px] font-mono font-bold text-amber-300"
                              title="Повышение уровня — проверьте памятку"
                            >
                              LVL↑
                            </span>
                          )}
                          {!pCheck.hasPendingLevelUp && pCheck.needsSubclassChoice && (
                            <span
                              className="px-1 py-0.5 rounded bg-violet-500/20 border border-violet-400/60 text-[9px] font-semibold text-violet-200"
                              title="Требуется выбрать подкласс (3 ур.)"
                            >
                              Подкл.
                            </span>
                          )}
                          {inOtherLocation && (
                            <MapPin className="w-3 h-3 text-amber-400 shrink-0" aria-label="В другой локации" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddPlayer((v) => !v)}
                    className="p-2 rounded-lg bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 text-slate-200 shrink-0"
                    title="Добавить персонажа"
                    aria-label="Добавить персонажа"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Add Player Inline Form (Driven by Reference Catalogs) */}
                {showAddPlayer && (
                  <form
                    onSubmit={handleAddPlayer}
                    className="p-3.5 rounded-xl bg-[#0B0F17] border border-slate-700 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200">
                        Новый персонаж (0 XP · Уровень 1)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddPlayer(false)}
                        className="text-slate-400 hover:text-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Имя персонажа"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-100"
                      required
                    />
                    {dmState.accounts.length > 0 && (
                      <label className="block space-y-1 text-xs">
                        <span className="text-[11px] text-slate-400">Участник (аккаунт)</span>
                        <select
                          value={newPlayerOwnerAccountId}
                          onChange={(e) => setNewPlayerOwnerAccountId(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-100"
                        >
                          <option value="">— Не привязан —</option>
                          {dmState.accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <label className="space-y-1">
                        <span className="text-[11px] text-slate-400">Класс</span>
                        <select
                          value={newPlayerClassId}
                          onChange={(e) => setNewPlayerClassId(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-100"
                        >
                          {catalogs.classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] text-slate-400">Предыстория</span>
                        <select
                          value={newPlayerBackgroundId}
                          onChange={(e) => setNewPlayerBackgroundId(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-100"
                        >
                          {catalogs.backgrounds.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] text-slate-400">Вид</span>
                        <select
                          value={newPlayerSpeciesId}
                          onChange={(e) => setNewPlayerSpeciesId(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-100"
                        >
                          {catalogs.species.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs items-end">
                      <label className="space-y-1">
                        <span className="text-[11px] text-slate-400">Макс. HP</span>
                        <input
                          type="number"
                          min={1}
                          value={newPlayerHp}
                          onChange={(e) => setNewPlayerHp(Number(e.target.value) || 10)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 font-mono text-slate-100"
                        />
                      </label>
                      <div className="px-2.5 py-1.5 rounded-lg bg-[#131A26]/70 border border-slate-800/80 text-[11px] text-slate-400 leading-tight">
                        КЗ и Инициатива: <span className="font-mono text-slate-200">10 + мод. ЛОВ</span>
                      </div>
                    </div>
                    {(() => {
                      const cls = catalogs.classes.find((c) => c.id === newPlayerClassId);
                      if (!cls) return null;
                      const hitInfo = getClassHitDieInfo(cls);
                      return (
                        <div className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200/95 flex items-center gap-1.5">
                          <Dices className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Хиты за ур.: {hitInfo.hint}</span>
                        </div>
                      );
                    })()}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNewPlayerColor(c)}
                            className={`w-5 h-5 rounded-full border-2 ${
                              newPlayerColor === c ? 'border-white scale-110' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: c }}
                            aria-label={`Цвет ${c}`}
                          />
                        ))}
                      </div>
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold"
                      >
                        Создать
                      </button>
                    </div>
                  </form>
                )}

                {!selectedPlayer && !showAddPlayer && (
                  <div className="p-6 rounded-xl bg-[#0B0F17] border border-slate-800 text-center space-y-2">
                    <p className="text-xs font-medium text-slate-300">
                      Персонажи еще не созданы
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Примите заявку участника во вкладке «Очередь» или создайте персонажа вручную кнопкой «+».
                    </p>
                  </div>
                )}

                {selectedPlayer && (
                  <div className="space-y-4">
                    {/* Selected Player Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-slate-100 truncate">
                          {selectedPlayer.name}
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                          {selectedPlayer.role}
                          {selectedSubclassRef ? ` (${selectedSubclassRef.name})` : ''} · Ур.{' '}
                          {selectedPlayer.level} · БМ +{profBonus} ({selectedPlayer.xp} XP)
                          {getAccountName(selectedPlayer.ownerAccountId)
                            ? ` · ${getAccountName(selectedPlayer.ownerAccountId)}`
                            : ''}
                          {' · '}
                          {selectedPlayer.isConnected ? 'В сети' : 'Офлайн'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          send({ type: 'dm:deletePlayer', playerId: selectedPlayer.id })
                        }
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors shrink-0"
                        title="Удалить персонажа"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* DM Level-Up & Subclass Reminder Banner */}
                    {levelUpChecklist &&
                      (levelUpChecklist.hasPendingLevelUp || levelUpChecklist.needsSubclassChoice) && (
                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/45 space-y-2.5 text-xs">
                          {levelUpChecklist.hasPendingLevelUp && (
                            <>
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                                  <ArrowUpCircle className="w-4 h-4 shrink-0" />
                                  <span>
                                    Повышение уровня: Ур. {levelUpChecklist.fromLevel} → Ур.{' '}
                                    {levelUpChecklist.toLevel}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    send({
                                      type: 'dm:updateStats',
                                      playerId: selectedPlayer.id,
                                      acknowledgedLevel: selectedPlayer.level,
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Готово</span>
                                </button>
                              </div>

                              {/* 1. Hit Die roll & quick +HP action */}
                              <div className="p-2.5 rounded-lg bg-[#0B0F17]/90 border border-slate-800 space-y-1.5">
                                <div className="text-[11px] font-medium text-slate-200 flex items-center gap-1.5">
                                  <Dices className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span>
                                    Бросьте{' '}
                                    <span className="font-mono text-amber-300 font-semibold">
                                      {levelUpChecklist.levelsGained}×1к{levelUpChecklist.hitDie}
                                    </span>{' '}
                                    + мод. ТЕЛ ({formatModifier(levelUpChecklist.conMod)}) за уровень
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {levelUpChecklist.hpHint} · Среднее: +
                                  {levelUpChecklist.averageHpPerLevel * levelUpChecklist.levelsGained}{' '}
                                  HP
                                </div>
                                <div className="flex items-center gap-1.5 pt-0.5">
                                  <input
                                    type="number"
                                    min={1}
                                    value={levelUpHpDeltaDraft}
                                    onChange={(e) => setLevelUpHpDeltaDraft(e.target.value)}
                                    placeholder={String(
                                      levelUpChecklist.averageHpPerLevel *
                                        levelUpChecklist.levelsGained
                                    )}
                                    className="w-20 px-2 py-1 rounded bg-[#131A26] border border-slate-700 font-mono text-xs text-emerald-300 text-center"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const fallbackAvg =
                                        levelUpChecklist.averageHpPerLevel *
                                        levelUpChecklist.levelsGained;
                                      const delta = Math.max(
                                        1,
                                        Math.round(
                                          levelUpHpDeltaDraft.trim() !== ''
                                            ? Number(levelUpHpDeltaDraft) || fallbackAvg
                                            : fallbackAvg
                                        )
                                      );
                                      send({
                                        type: 'dm:updateStats',
                                        playerId: selectedPlayer.id,
                                        maxHp: selectedPlayer.maxHp + delta,
                                        hp: selectedPlayer.hp + delta,
                                      });
                                      setLevelUpHpDeltaDraft('');
                                    }}
                                    className="px-2.5 py-1 rounded bg-emerald-600/90 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-colors"
                                  >
                                    +HP к Макс. ({selectedPlayer.maxHp} →{' '}
                                    {selectedPlayer.maxHp +
                                      Math.max(
                                        1,
                                        Math.round(
                                          levelUpHpDeltaDraft.trim() !== ''
                                            ? Number(levelUpHpDeltaDraft) ||
                                                levelUpChecklist.averageHpPerLevel *
                                                  levelUpChecklist.levelsGained
                                            : levelUpChecklist.averageHpPerLevel *
                                                levelUpChecklist.levelsGained
                                        )
                                      )}
                                    )
                                  </button>
                                </div>
                              </div>

                              {/* 2. Proficiency Bonus Increase */}
                              {levelUpChecklist.profBonusChange && (
                                <div className="text-[11px] text-emerald-300">
                                  • Бонус мастерства вырос:{' '}
                                  <span className="font-mono font-bold">
                                    +{levelUpChecklist.profBonusChange.from} → +
                                    {levelUpChecklist.profBonusChange.to}
                                  </span>{' '}
                                  (навыки, спасброски и атаки пересчитаны)
                                </div>
                              )}

                              {/* 3. Class Resource Scaling Changes */}
                              {levelUpChecklist.resourceChanges.length > 0 && (
                                <div className="text-[11px] text-slate-200 space-y-0.5">
                                  <div className="text-slate-400">• Обновились параметры класса:</div>
                                  <div className="flex flex-wrap gap-1.5 pl-2">
                                    {levelUpChecklist.resourceChanges.map((rc) => (
                                      <span
                                        key={rc.name}
                                        className="px-1.5 py-0.5 rounded bg-[#0B0F17] border border-slate-700 text-[10px]"
                                      >
                                        {rc.name}:{' '}
                                        <span className="font-mono text-amber-300 font-semibold">
                                          {rc.from} → {rc.to}
                                        </span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 4. Newly Unlocked Features */}
                              {(levelUpChecklist.unlockedClassFeatures.length > 0 ||
                                levelUpChecklist.unlockedSubclassFeatures.length > 0) && (
                                <div className="text-[11px] text-slate-200 space-y-1">
                                  <div className="text-slate-400">• Открылись новые умения:</div>
                                  <div className="flex flex-wrap gap-1 pl-2">
                                    {levelUpChecklist.unlockedClassFeatures.map((f) => (
                                      <span
                                        key={f.id}
                                        className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-[10px] text-amber-200"
                                      >
                                        Ур.{f.level} {f.name}
                                      </span>
                                    ))}
                                    {levelUpChecklist.unlockedSubclassFeatures.map((f) => (
                                      <span
                                        key={f.id}
                                        className="px-1.5 py-0.5 rounded bg-violet-500/20 border border-violet-400/50 text-[10px] text-violet-200"
                                      >
                                        Ур.{f.level} {f.name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {/* 5. Subclass Selection Reminder (Level 3+) */}
                          {levelUpChecklist.needsSubclassChoice && (
                            <div className="p-2.5 rounded-lg bg-violet-950/50 border border-violet-500/50 space-y-1.5">
                              <div className="text-[11px] font-semibold text-violet-200 flex items-center gap-1.5">
                                <GitBranch className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                                <span>
                                  Выбор подкласса (3 ур.) — уведомите игрока и выберите подкласс:
                                </span>
                              </div>
                              <select
                                value={selectedPlayer.subclassId ?? ''}
                                onChange={(e) =>
                                  send({
                                    type: 'dm:updateStats',
                                    playerId: selectedPlayer.id,
                                    subclassId: e.target.value,
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg bg-[#0B0F17] border border-violet-500/50 text-xs text-slate-100"
                              >
                                <option value="">— Выбрать подкласс для {selectedClassRef?.name ?? 'класса'} —</option>
                                {catalogs.subclasses
                                  .filter((s) => s.classId === selectedPlayer.classId)
                                  .map((sc) => (
                                    <option key={sc.id} value={sc.id}>
                                      {sc.name}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          )}
                        </div>
                      )}

                    {/* Reorganized 4-Tab Hero Workspace: Бой / Проверки / Снаряжение / Анкета */}
                    <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-[#0B0F17] border border-slate-800 text-[11px] font-medium">
                      {(
                        [
                          { id: 'combat', label: 'Бой' },
                          { id: 'checks', label: 'Проверки' },
                          { id: 'gear', label: 'Снаряжение' },
                          { id: 'profile', label: 'Анкета' },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setPlayerSubTab(tab.id)}
                          className={`py-1.5 px-1.5 rounded-md transition-colors whitespace-nowrap ${
                            playerSubTab === tab.id
                              ? 'bg-[#131A26] text-amber-400'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* SUB-TAB 1: БОЙ (HP, КЗ, Скорость, Инициатива, Действия, Состояния, Ресурсы класса) */}
                    {playerSubTab === 'combat' && (() => {
                      const acDetails = computePlayerAcDetails(selectedPlayer, catalogs);
                      const speedDetails = computePlayerEffectiveSpeed(selectedPlayer, catalogs);
                      const initDetails = computePlayerInitiativeDetails(selectedPlayer, catalogs);
                      const encumbrance = computeHeroEncumbrance(selectedPlayer, catalogs);
                      const deathSaves = selectedPlayer.deathSaves ?? {
                        successes: 0,
                        failures: 0,
                        status: 'none' as const,
                      };
                      const isSelectedTurn = Boolean(
                        dmState.tokens.find((t) => t.playerId === selectedPlayer.id)?.id ===
                          dmState.scene.activeTurnTokenId
                      );
                      const condEffects = getActiveConditionEffects(
                        selectedPlayer.conditions,
                        selectedPlayer.exhaustionLevel
                      );
                      const combatResources = getClassResourcesAtLevel(
                        selectedClassRef,
                        selectedPlayer.level
                      );

                      return (
                        <div className="space-y-4">
                          {/* Encumbrance Disadvantage Callout in Combat Tab */}
                          {encumbrance.tier !== 'none' && (
                            <div
                              className={`p-3 rounded-xl border text-xs space-y-1 ${
                                encumbrance.hasStrDexConDisadvantage
                                  ? isSelectedTurn
                                    ? 'bg-rose-950/70 border-rose-400'
                                    : 'bg-rose-950/35 border-rose-500/50'
                                  : 'bg-amber-950/25 border-amber-500/45'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-rose-200 flex items-center gap-1.5">
                                  <Scale className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span>
                                    {encumbrance.conditionName}
                                    {isSelectedTurn && encumbrance.hasStrDexConDisadvantage
                                      ? ' · ХОД ГЕРОЯ!'
                                      : ''}
                                  </span>
                                </span>
                                <span className="font-mono text-[11px] text-slate-200">
                                  {formatWeightLb(encumbrance.totalWeightLb)} / {encumbrance.maxCarryLb} фнт.
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-200 leading-snug">
                                {encumbrance.summary}
                              </p>
                            </div>
                          )}

                          {/* HP & Key Combat Numbers */}
                          <div className="p-3 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Здоровье</span>
                              <span className="font-mono tabular-nums text-sm font-bold text-slate-100">
                                {selectedPlayer.hp} / {selectedPlayer.maxHp}
                                {selectedPlayer.tempHp > 0 && (
                                  <span className="ml-1.5 text-xs text-sky-400">
                                    +{selectedPlayer.tempHp} врем.
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5">
                              {[-5, -1, 1, 5].map((delta) => (
                                <button
                                  key={delta}
                                  type="button"
                                  onClick={() =>
                                    send({
                                      type: 'dm:updateStats',
                                      playerId: selectedPlayer.id,
                                      hp: selectedPlayer.hp + delta,
                                    })
                                  }
                                  className={`py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors ${
                                    delta < 0
                                      ? 'bg-red-950/40 border-red-900/60 text-red-300 hover:bg-red-900/50'
                                      : 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300 hover:bg-emerald-900/50'
                                  }`}
                                >
                                  {delta > 0 ? `+${delta}` : delta}
                                </button>
                              ))}
                            </div>
                            <div className="grid grid-cols-5 gap-1.5 pt-1 text-xs">
                              <label className="space-y-1">
                                <span className="text-[10px] text-slate-400">Макс. HP</span>
                                <input
                                  type="number"
                                  min={1}
                                  value={selectedPlayer.maxHp}
                                  onChange={(e) =>
                                    send({
                                      type: 'dm:updateStats',
                                      playerId: selectedPlayer.id,
                                      maxHp: Number(e.target.value) || 1,
                                    })
                                  }
                                  className="w-full px-1.5 py-1 rounded bg-[#131A26] border border-slate-800 font-mono text-slate-100"
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-[10px] text-slate-400">Врем.</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={selectedPlayer.tempHp}
                                  onChange={(e) =>
                                    send({
                                      type: 'dm:updateStats',
                                      playerId: selectedPlayer.id,
                                      tempHp: Number(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full px-1.5 py-1 rounded bg-[#131A26] border border-slate-800 font-mono text-slate-100"
                                />
                              </label>
                              <div className="space-y-1" title={acDetails.breakdown}>
                                <span className="text-[10px] text-slate-400">КЗ (авто)</span>
                                <div className="w-full px-1.5 py-1 rounded bg-[#131A26]/80 border border-slate-800/90 font-mono tabular-nums text-sky-300 font-semibold text-center">
                                  {selectedPlayer.ac}
                                </div>
                              </div>
                              <label className="space-y-1" title={speedDetails.breakdown}>
                                <span className="text-[10px] text-slate-400">Скор. (баз)</span>
                                <input
                                  type="number"
                                  min={0}
                                  step={5}
                                  value={selectedPlayer.speed ?? 30}
                                  onChange={(e) =>
                                    send({
                                      type: 'dm:updateStats',
                                      playerId: selectedPlayer.id,
                                      speed: Math.max(0, Number(e.target.value) || 0),
                                    })
                                  }
                                  className="w-full px-1.5 py-1 rounded bg-[#131A26] border border-slate-800 font-mono text-emerald-300"
                                />
                              </label>
                              <label className="space-y-1" title={`Бонус к броску: ${initDetails.breakdown}`}>
                                <span className="text-[10px] text-slate-400">Иниц.</span>
                                <input
                                  type="number"
                                  value={selectedPlayer.initiative ?? 0}
                                  onChange={(e) =>
                                    send({
                                      type: 'dm:updateStats',
                                      playerId: selectedPlayer.id,
                                      initiative: Number(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full px-1.5 py-1 rounded bg-[#131A26] border border-slate-800 font-mono text-sky-300"
                                />
                              </label>
                            </div>
                            <div className="space-y-0.5 pt-1 border-t border-slate-800/70 text-[10px] text-slate-400">
                              <div className="truncate">
                                КЗ: <span className="text-slate-300">{acDetails.breakdown}</span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate">
                                  Скорость сейчас:{' '}
                                  <span
                                    className={`font-mono font-semibold ${
                                      speedDetails.effectiveFt === 0
                                        ? 'text-rose-400'
                                        : 'text-emerald-300'
                                    }`}
                                  >
                                    {speedDetails.effectiveFt} фт.
                                  </span>
                                  {speedDetails.effectiveFt !== speedDetails.baseFt
                                    ? ` (${speedDetails.breakdown})`
                                    : ''}
                                </span>
                                <span className="font-mono text-sky-300 shrink-0">
                                  Иниц. 1к20 {formatModifier(initDetails.bonus)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Hero Death Saving Throws Panel (0 HP / Dying / Stabilized / Dead) */}
                          {(selectedPlayer.hp <= 0 || deathSaves.status !== 'none') && (
                            <div
                              className={`p-3 rounded-xl border space-y-2.5 text-xs ${
                                deathSaves.status === 'dead'
                                  ? 'bg-red-950/60 border-red-500/70'
                                  : deathSaves.status === 'stabilized'
                                    ? 'bg-emerald-950/30 border-emerald-500/50'
                                    : 'bg-red-950/40 border-red-500/60'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-slate-100 flex items-center gap-1.5">
                                  {deathSaves.status === 'dead' ? (
                                    <Skull className="w-4 h-4 text-red-400 shrink-0" />
                                  ) : (
                                    <HeartPulse className="w-4 h-4 text-red-400 shrink-0" />
                                  )}
                                  <span>
                                    {deathSaves.status === 'dead'
                                      ? 'Герой погиб'
                                      : deathSaves.status === 'stabilized'
                                        ? 'Стабилизирован (0 HP)'
                                        : 'Спасброски от смерти (0 HP)'}
                                  </span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    send({
                                      type: 'dm:recordDeathSave',
                                      playerId: selectedPlayer.id,
                                      outcome: 'reset',
                                    })
                                  }
                                  className="px-2 py-0.5 rounded bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 text-[10px] text-slate-300"
                                >
                                  Сброс
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="px-2.5 py-1.5 rounded-lg bg-[#0B0F17]/80 border border-emerald-500/30 flex items-center justify-between">
                                  <span className="text-[11px] text-emerald-300">Успехи</span>
                                  <div className="flex items-center gap-1">
                                    {[0, 1, 2].map((idx) => (
                                      <span
                                        key={idx}
                                        className={`w-3 h-3 rounded-full border ${
                                          idx < deathSaves.successes
                                            ? 'bg-emerald-400 border-emerald-300'
                                            : 'bg-slate-900 border-slate-600'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                                <div className="px-2.5 py-1.5 rounded-lg bg-[#0B0F17]/80 border border-red-500/35 flex items-center justify-between">
                                  <span className="text-[11px] text-red-300">Провалы</span>
                                  <div className="flex items-center gap-1">
                                    {[0, 1, 2].map((idx) => (
                                      <span
                                        key={idx}
                                        className={`w-3 h-3 rounded-full border ${
                                          idx < deathSaves.failures
                                            ? 'bg-red-500 border-red-300'
                                            : 'bg-slate-900 border-slate-600'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {deathSaves.status !== 'dead' && (
                                <div className="space-y-1.5">
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        send({
                                          type: 'dm:recordDeathSave',
                                          playerId: selectedPlayer.id,
                                          outcome: 'success',
                                        })
                                      }
                                      className="py-1.5 px-2 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-colors"
                                    >
                                      +1 Успех (10–19)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        send({
                                          type: 'dm:recordDeathSave',
                                          playerId: selectedPlayer.id,
                                          outcome: 'failure',
                                        })
                                      }
                                      className="py-1.5 px-2 rounded-lg bg-red-700/80 hover:bg-red-600 text-white text-[11px] font-semibold transition-colors"
                                    >
                                      +1 Провал (2–9)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        send({
                                          type: 'dm:recordDeathSave',
                                          playerId: selectedPlayer.id,
                                          outcome: 'nat20',
                                        })
                                      }
                                      className="py-1.5 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold transition-colors"
                                    >
                                      Нат. 20 (1 HP!)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        send({
                                          type: 'dm:recordDeathSave',
                                          playerId: selectedPlayer.id,
                                          outcome: 'nat1',
                                        })
                                      }
                                      className="py-1.5 px-2 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-500/60 text-rose-200 text-[11px] font-semibold transition-colors"
                                    >
                                      Нат. 1 (+2 пров.)
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-3 gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        send({
                                          type: 'dm:recordDeathSave',
                                          playerId: selectedPlayer.id,
                                          outcome: 'damage_1',
                                        })
                                      }
                                      className="py-1 px-1.5 rounded-lg bg-[#0B0F17] hover:bg-slate-800 border border-red-900/60 text-red-300 text-[10px] font-medium"
                                      title="Получен урон при 0 HP (+1 провал)"
                                    >
                                      Урон (+1 пр.)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        send({
                                          type: 'dm:recordDeathSave',
                                          playerId: selectedPlayer.id,
                                          outcome: 'damage_2',
                                        })
                                      }
                                      className="py-1 px-1.5 rounded-lg bg-[#0B0F17] hover:bg-slate-800 border border-red-900/60 text-red-300 text-[10px] font-medium"
                                      title="Критический удар в упор при 0 HP (+2 провала)"
                                    >
                                      Крит (+2 пр.)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        send({
                                          type: 'dm:recordDeathSave',
                                          playerId: selectedPlayer.id,
                                          outcome: 'stabilize',
                                        })
                                      }
                                      className="py-1 px-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-600/50 text-emerald-300 text-[10px] font-medium"
                                      title="Успешная проверка Медицины СЛ 10 или заклинание Стабилизации"
                                    >
                                      Стабилизир.
                                    </button>
                                  </div>
                                </div>
                              )}
                              <div className="text-[10px] text-slate-400 leading-snug">
                                При восстановлении HP &gt; 0 спасброски сбрасываются автоматически.
                              </div>
                            </div>
                          )}

                          {/* Hero Combat Actions (Unambiguous Formula Display) */}
                          {(() => {
                            const combatHandsUsage = computeEquippedHandsUsage(
                              selectedPlayer.inventory,
                              catalogs
                            );
                            return (
                              <div className="p-3 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                                    <Swords className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <span>Действия героя ({heroActions.length})</span>
                                    {encumbrance.hasStrDexConDisadvantage && (
                                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/50 text-[9px] font-semibold text-rose-300">
                                        Помеха
                                      </span>
                                    )}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                                        combatHandsUsage.usedHands >= 2
                                          ? 'bg-amber-500/15 border-amber-500/45 text-amber-200'
                                          : 'bg-[#131A26] border-slate-800 text-slate-300'
                                      }`}
                                    >
                                      Руки: {combatHandsUsage.usedHands}/2
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400">
                                      БМ +{profBonus}
                                    </span>
                                  </div>
                                </div>
                                <div className="divide-y divide-slate-800/80">
                                  {heroActions.map((act) => {
                                    const expandedProp = act.resolvedProperties?.find(
                                      (p) => `${act.id}:${p.id}` === expandedDmActionPropKey
                                    );
                                    return (
                                      <div
                                        key={act.id}
                                        className={`py-2.5 first:pt-0 last:pb-0 space-y-1.5 text-xs ${
                                          act.equipped
                                            ? 'text-slate-100'
                                            : 'text-slate-400 opacity-75'
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="min-w-0">
                                            <div className="font-medium flex items-center gap-1.5 flex-wrap">
                                              <span className="truncate">{act.name}</span>
                                              <span className="px-1 py-0.5 rounded bg-slate-800/90 font-mono text-[9px] text-slate-300 shrink-0">
                                                {act.rangeLabel}
                                              </span>
                                              {act.handsRequired && (
                                                <span className="px-1 py-0.5 rounded bg-slate-800/80 font-mono text-[9px] text-slate-300 shrink-0">
                                                  {act.handsRequired === 2 ? '2 руки' : '1 рука'}
                                                </span>
                                              )}
                                              {act.kind === 'bonus_light' && (
                                                <span className="px-1 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-[9px] font-semibold text-amber-200 shrink-0">
                                                  {act.name.includes('Быстрое')
                                                    ? 'Часть Атаки'
                                                    : 'Бонусное'}
                                                </span>
                                              )}
                                              {act.heavyDisadvantage && (
                                                <span className="px-1 py-0.5 rounded bg-rose-500/20 border border-rose-500/50 text-[9px] font-semibold text-rose-300 shrink-0">
                                                  Помеха (СИЛ&lt;13)
                                                </span>
                                              )}
                                              {!act.equipped && (
                                                <span className="px-1 py-0.5 rounded bg-slate-800 text-[9px] text-slate-400 shrink-0">
                                                  в рюкзаке
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                              Бонус: {act.hitBreakdown}
                                            </div>
                                          </div>
                                          <div className="text-right font-mono tabular-nums shrink-0">
                                            <div className="text-xs font-bold text-amber-300">
                                              {act.hitFormula}
                                            </div>
                                            <div className="text-[11px] text-rose-300">
                                              {act.damageFormula}
                                            </div>
                                          </div>
                                        </div>

                                        {act.equipped && act.versatileAttack && (
                                          <div className="rounded bg-sky-950/25 border border-sky-500/30 px-2 py-1 flex items-center justify-between gap-2 text-[10px]">
                                            <span className="text-sky-200">
                                              Универсальное (2 руки):{' '}
                                              <span className="text-slate-400">
                                                {act.versatileAttack.availableNow
                                                  ? '2-я рука свободна'
                                                  : '2-я рука занята'}
                                              </span>
                                            </span>
                                            <span className="font-mono font-semibold text-sky-300 shrink-0">
                                              {act.versatileAttack.damageFormula}
                                            </span>
                                          </div>
                                        )}

                                        {act.equipped && act.thrownAttack && (
                                          <div className="rounded bg-amber-950/20 border border-amber-500/25 px-2 py-1 flex items-center justify-between gap-2 text-[10px]">
                                            <span className="text-amber-200">
                                              Метание ({act.thrownAttack.normalFt}/
                                              {act.thrownAttack.maxFt} фт., помеха &gt;
                                              {act.thrownAttack.normalFt})
                                            </span>
                                            <span className="font-mono text-amber-300 shrink-0">
                                              {act.thrownAttack.hitFormula} ·{' '}
                                              {act.thrownAttack.damageFormula}
                                            </span>
                                          </div>
                                        )}

                                        {act.equipped && act.ammoStatus && (
                                          <div
                                            className={`rounded border px-2 py-1 flex items-center justify-between gap-2 text-[10px] ${
                                              act.ammoStatus.currentQty > 0 &&
                                              act.ammoStatus.hasContainer
                                                ? 'bg-[#131A26] border-sky-500/30 text-slate-200'
                                                : 'bg-rose-950/30 border-rose-500/50 text-rose-200'
                                            }`}
                                          >
                                            <span className="truncate">
                                              {act.ammoStatus.ammoName}:{' '}
                                              <span className="font-mono font-bold text-sky-300">
                                                {act.ammoStatus.currentQty}/
                                                {act.ammoStatus.maxCapacity}
                                              </span>
                                              {act.ammoStatus.containerName
                                                ? ` (${act.ammoStatus.containerName})`
                                                : ''}
                                            </span>
                                            <div className="flex items-center gap-1 shrink-0">
                                              <button
                                                type="button"
                                                disabled={act.ammoStatus.currentQty <= 0}
                                                onClick={() =>
                                                  send({
                                                    type: 'player:spendAmmo',
                                                    playerId: selectedPlayer.id,
                                                    ammoItemId: act.ammoStatus!.ammoItemId,
                                                    delta: -1,
                                                  })
                                                }
                                                className="px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-40 border border-rose-500/40 text-rose-200 font-semibold"
                                              >
                                                −1
                                              </button>
                                              <button
                                                type="button"
                                                disabled={
                                                  act.ammoStatus.currentQty >=
                                                  act.ammoStatus.maxCapacity
                                                }
                                                onClick={() =>
                                                  send({
                                                    type: 'player:spendAmmo',
                                                    playerId: selectedPlayer.id,
                                                    ammoItemId: act.ammoStatus!.ammoItemId,
                                                    delta: 1,
                                                  })
                                                }
                                                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-slate-200 font-mono"
                                              >
                                                +1
                                              </button>
                                            </div>
                                          </div>
                                        )}

                                        {act.equipped && act.loadingNote && (
                                          <div className="text-[10px] text-amber-200/90 bg-amber-950/20 border border-amber-500/25 rounded px-2 py-0.5">
                                            Перезарядка: не более 1 выстрела за действие/бон./реакцию
                                          </div>
                                        )}

                                        {act.bonusNote && (
                                          <div className="text-[10px] text-emerald-300 bg-emerald-950/25 border border-emerald-500/25 rounded px-2 py-0.5">
                                            {act.bonusNote}
                                          </div>
                                        )}

                                        {/* Active Weapon Mastery — ONLY when equipped AND hero has «Оружейное мастерство» */}
                                        {act.activeMastery && (
                                          <div className="rounded-lg bg-violet-950/35 border border-violet-500/45 px-2.5 py-1.5 space-y-0.5">
                                            <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-violet-200">
                                              <span className="flex items-center gap-1">
                                                <Sparkles className="w-3 h-3 text-violet-400 shrink-0" />
                                                <span>Мастерство: {act.activeMastery.name}</span>
                                              </span>
                                              {act.activeMastery.saveDc !== undefined && (
                                                <span className="px-1.5 py-0.5 rounded bg-violet-500/20 font-mono text-[10px] text-violet-100">
                                                  Сл {act.activeMastery.saveDc}
                                                </span>
                                              )}
                                            </div>
                                            {act.activeMastery.computedHint && (
                                              <div className="text-[10px] text-amber-200/95 leading-snug">
                                                {act.activeMastery.computedHint}
                                              </div>
                                            )}
                                            <p className="text-[10px] text-slate-300 leading-snug">
                                              {act.activeMastery.description}
                                            </p>
                                          </div>
                                        )}

                                        {act.resolvedProperties &&
                                          act.resolvedProperties.length > 0 && (
                                            <div className="space-y-1">
                                              <div className="flex flex-wrap gap-1">
                                                {act.resolvedProperties.map((prop) => {
                                                  const key = `${act.id}:${prop.id}`;
                                                  const isOpen = expandedDmActionPropKey === key;
                                                  return (
                                                    <button
                                                      key={prop.id}
                                                      type="button"
                                                      title={prop.description}
                                                      onClick={() =>
                                                        setExpandedDmActionPropKey(
                                                          isOpen ? null : key
                                                        )
                                                      }
                                                      className={`px-1.5 py-0.5 rounded text-[9px] border transition-colors ${
                                                        isOpen
                                                          ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                                                          : 'bg-[#131A26] border-slate-800 text-slate-300 hover:border-slate-600'
                                                      }`}
                                                    >
                                                      {prop.name}
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                              {expandedProp && (
                                                <div className="rounded bg-[#131A26] border border-slate-700/80 px-2 py-1.5 text-[10px] text-slate-300 leading-snug">
                                                  <span className="font-semibold text-amber-200">
                                                    {expandedProp.name}:{' '}
                                                  </span>
                                                  {expandedProp.description}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Conditions from Catalog (Synced to Player Phone + Automated Effects) */}
                          <div className="p-3 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>Состояния ({selectedPlayer.conditions.length})</span>
                              </span>
                              <span className="text-[10px] text-slate-500">Видны игроку</span>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {catalogs.conditions.map((cond) => {
                                const active = selectedPlayer.conditions.includes(cond.name);
                                return (
                                  <button
                                    key={cond.id}
                                    type="button"
                                    onClick={() => handleToggleCondition(cond.name)}
                                    title={
                                      cond.automatedSummary
                                        ? `${cond.automatedSummary}\n\n${cond.description}`
                                        : cond.description
                                    }
                                    className={`px-2 py-1 rounded-md text-[11px] border flex items-center gap-1 transition-colors ${
                                      active
                                        ? 'bg-amber-500/20 border-amber-500/70 text-amber-200 font-medium'
                                        : 'bg-[#131A26] border-slate-800 text-slate-400 hover:text-slate-200'
                                    }`}
                                  >
                                    <span>{cond.name}</span>
                                    {cond.automatedSummary && (
                                      <Zap
                                        className={`w-2.5 h-2.5 shrink-0 ${
                                          active ? 'text-emerald-300' : 'text-emerald-500/60'
                                        }`}
                                      />
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Exhaustion Level Control (1-6) */}
                            {(condEffects.exhaustionLevel > 0 ||
                              selectedPlayer.conditions.some((c) =>
                                c.toLowerCase().includes('истощ')
                              )) && (
                              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                                <span className="text-amber-300 font-medium">
                                  Степень истощения ({condEffects.exhaustionLevel || 1} / 6)
                                </span>
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5, 6].map((lvl) => (
                                    <button
                                      key={lvl}
                                      type="button"
                                      onClick={() =>
                                        send({
                                          type: 'dm:updateStats',
                                          playerId: selectedPlayer.id,
                                          exhaustionLevel: lvl,
                                        })
                                      }
                                      className={`w-6 h-6 rounded font-mono text-[11px] font-semibold border transition-colors ${
                                        (selectedPlayer.exhaustionLevel ?? 1) === lvl
                                          ? 'bg-rose-500/25 border-rose-400 text-rose-200'
                                          : 'bg-[#131A26] border-slate-800 text-slate-400 hover:text-slate-200'
                                      }`}
                                    >
                                      {lvl}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Active Automated Callouts */}
                            {condEffects.combatCallouts.length > 0 && (
                              <div className="rounded-lg bg-amber-950/25 border border-amber-500/30 px-2.5 py-2 space-y-1">
                                {condEffects.combatCallouts.map((line, i) => (
                                  <div key={i} className="text-[11px] text-amber-200/95 leading-snug">
                                    • {line}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Compact Class Combat Resources */}
                          {combatResources.length > 0 && (
                            <div className="p-3 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2">
                              <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>Ресурсы класса (ур. {selectedPlayer.level})</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {combatResources.map((r) => (
                                  <span
                                    key={r.id}
                                    className="px-2 py-1 rounded-md bg-[#131A26] border border-slate-700 text-[11px] text-slate-300"
                                  >
                                    {r.name}:{' '}
                                    <span className="font-mono font-semibold text-amber-300">
                                      {r.value}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* SUB-TAB 2: ПРОВЕРКИ (Характеристики, Спасброски ДМ, Навыки и Экспертиза, Зрение и чувства) */}
                    {playerSubTab === 'checks' && (() => {
                      const condEffects = getActiveConditionEffects(
                        selectedPlayer.conditions,
                        selectedPlayer.exhaustionLevel
                      );
                      const bgLockedSkillSet = new Set(
                        getBackgroundLockedSkillIds(selectedPlayer.backgroundId, catalogs)
                      );
                      const allowedSkillSet = getHeroAllowedSkillIds(
                        selectedPlayer.classId,
                        selectedPlayer.backgroundId,
                        catalogs
                      );
                      const availableSkills = catalogs.skills.filter(
                        (sk) => !allowedSkillSet || allowedSkillSet.has(sk.id)
                      );
                      const unavailableSkills = allowedSkillSet
                        ? catalogs.skills.filter((sk) => !allowedSkillSet.has(sk.id))
                        : [];

                      const renderSkillRow = (
                        sk: (typeof catalogs.skills)[number],
                        isUnavailable: boolean
                      ) => {
                        const isBgLocked = bgLockedSkillSet.has(sk.id);
                        const skillCalc = computeHeroSkillTotal(selectedPlayer, sk, catalogs);
                        const isExp = skillCalc.isExpertise;
                        const active = isBgLocked || skillCalc.isProficient;
                        const ab = catalogs.abilities.find((a) => a.id === sk.abilityId);
                        const totalMod = skillCalc.total;

                        return (
                          <div
                            key={sk.id}
                            className={`px-3 py-1.5 flex items-center justify-between gap-2 text-xs transition-colors ${
                              isUnavailable && !active
                                ? 'text-slate-600 opacity-55'
                                : isExp
                                  ? 'bg-sky-500/10 text-slate-100'
                                  : isBgLocked
                                    ? 'bg-emerald-500/10 text-slate-100'
                                    : active
                                      ? 'bg-amber-500/10 text-slate-100'
                                      : 'text-slate-400 hover:bg-slate-800/40'
                            }`}
                          >
                            <button
                              type="button"
                              disabled={isBgLocked || (isUnavailable && !active)}
                              onClick={() => handleToggleSkill(sk.id)}
                              title={
                                isBgLocked
                                  ? 'Навык предыстории (выдан автоматически, отключить нельзя)'
                                  : isUnavailable
                                    ? 'Навык недоступен выбранному классу и предыстории'
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
                                        : skillCalc.hasJackOfAllTrades
                                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                                          : 'border-slate-700'
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
                                  Предыст.
                                </span>
                              )}
                              {skillCalc.hasJackOfAllTrades && (
                                <span className="px-1 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-[9px] font-mono text-emerald-300 shrink-0">
                                  ½БМ
                                </span>
                              )}
                              {isUnavailable && !active && (
                                <span className="text-[10px] text-slate-500 shrink-0">
                                  Недоступно
                                </span>
                              )}
                            </button>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                disabled={isUnavailable && !isExp}
                                onClick={() => handleToggleExpertise(sk.id)}
                                title="Экспертиза (бонус владения ×2)"
                                className={`px-1.5 py-0.5 rounded border text-[10px] font-mono font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
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
                                        : 'text-slate-400'
                                }`}
                              >
                                {formatModifier(totalMod)}
                              </span>
                            </div>
                          </div>
                        );
                      };

                      const saveIds = selectedClassRef?.savingThrowAbilityIds ?? [];

                      return (
                        <div className="space-y-4">
                          {/* Ability Scores Grid */}
                          <div className="space-y-2">
                            <div className="flex items-baseline justify-between">
                              <span className="text-xs font-semibold text-slate-200">
                                Характеристики
                              </span>
                              <button
                                type="button"
                                onClick={() => onNavigate('/catalogs')}
                                className="text-[11px] text-amber-400 hover:text-amber-300"
                              >
                                Справочник →
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {catalogs.abilities.map((ab) => {
                                const val = selectedPlayer.abilities[ab.id] ?? 10;
                                const mod = getAbilityModifier(val, catalogs.abilityModifiers);
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
                                        {formatModifier(mod)}
                                      </span>
                                    </div>
                                    <input
                                      type="number"
                                      min={1}
                                      max={30}
                                      value={val}
                                      onChange={(e) =>
                                        send({
                                          type: 'dm:updateStats',
                                          playerId: selectedPlayer.id,
                                          abilities: {
                                            ...selectedPlayer.abilities,
                                            [ab.id]: Math.max(
                                              1,
                                              Math.min(30, Number(e.target.value) || 10)
                                            ),
                                          },
                                        })
                                      }
                                      className="w-full px-2 py-1 rounded bg-[#131A26] border border-slate-800 font-mono tabular-nums text-sm font-semibold text-center text-slate-100"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* DM-Only Saving Throws (with Condition Penalties & Auto-Fail) */}
                          <div className="p-3 rounded-xl bg-[#0B0F17] border border-sky-500/30 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-sky-300 flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5 shrink-0" />
                                <span>Спасброски</span>
                              </span>
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/40 text-sky-300">
                                Только для ДМ
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {catalogs.abilities.map((ab) => {
                                const isProfSave = saveIds.includes(ab.id);
                                const score = selectedPlayer.abilities[ab.id] ?? 10;
                                const saveMod =
                                  getAbilityModifier(score, catalogs.abilityModifiers) +
                                  (isProfSave ? profBonus : 0) +
                                  condEffects.d20Penalty;
                                const autoFail =
                                  condEffects.autoFailStrDexSaves &&
                                  (ab.id === 'str' || ab.id === 'dex');
                                const dexDisadv =
                                  condEffects.dexSaveDisadvantage && ab.id === 'dex';
                                return (
                                  <div
                                    key={ab.id}
                                    className={`px-2 py-1.5 rounded-lg border text-[11px] flex items-center justify-between gap-1 ${
                                      autoFail
                                        ? 'bg-rose-950/35 border-rose-500/50 text-rose-200'
                                        : isProfSave
                                          ? 'bg-[#131A26] border-sky-500/45 text-slate-100'
                                          : 'bg-[#131A26]/60 border-slate-800 text-slate-400'
                                    }`}
                                  >
                                    <span className="truncate font-medium">
                                      {ab.shortName}
                                      {dexDisadv && !autoFail ? ' (пом.)' : ''}
                                    </span>
                                    <span
                                      className={`font-mono tabular-nums font-bold ${
                                        autoFail
                                          ? 'text-rose-300 text-[10px]'
                                          : isProfSave
                                            ? 'text-sky-300'
                                            : 'text-slate-300'
                                      }`}
                                    >
                                      {autoFail ? 'ПРОВАЛ' : formatModifier(saveMod)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Skills & Expertise */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="text-xs font-semibold text-slate-200">
                                Навыки и экспертиза ({selectedPlayer.proficientSkillIds.length})
                              </h3>
                              <span className="text-[11px] font-mono text-slate-400">
                                БМ +{profBonus} · ×2 = +{profBonus * 2}
                              </span>
                            </div>
                            <div className="divide-y divide-slate-800/80 rounded-xl bg-[#0B0F17] border border-slate-800 overflow-hidden">
                              {availableSkills.map((sk) => renderSkillRow(sk, false))}
                              {unavailableSkills.length > 0 && (
                                <>
                                  <div className="px-3 py-1.5 bg-[#131A26]/70 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                    Недоступны по классу и предыстории ({unavailableSkills.length})
                                  </div>
                                  {unavailableSkills.map((sk) => renderSkillRow(sk, true))}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Senses & Vision for Hero */}
                          <div className="p-3 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2.5">
                            <VisionSelector
                              catalogVisions={catalogs.visions}
                              value={selectedPlayer.visions ?? []}
                              onChange={(nextVisions) =>
                                send({
                                  type: 'dm:updateStats',
                                  playerId: selectedPlayer.id,
                                  visions: nextVisions,
                                })
                              }
                              compact={true}
                              title="Зрение героя"
                            />
                            <label className="block space-y-1 pt-1 border-t border-slate-800/80">
                              <span className="text-[11px] text-slate-400">
                                Чувства (дополнительно)
                              </span>
                              <input
                                type="text"
                                value={sensesDraft}
                                onChange={(e) => setSensesDraft(e.target.value)}
                                onBlur={() => {
                                  if (sensesDraft !== (selectedPlayer.senses ?? '')) {
                                    send({
                                      type: 'dm:updateStats',
                                      playerId: selectedPlayer.id,
                                      senses: sensesDraft.trim(),
                                    });
                                  }
                                }}
                                placeholder="Например: острый слух, пасс. Восприятие 14"
                                className="w-full px-2.5 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-100"
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })()}

                    {/* SUB-TAB 3: СНАРЯЖЕНИЕ (Золото, Инвентарь, Владения оружием/доспехами, Личная заметка) */}
                    {playerSubTab === 'gear' && (() => {
                      const classDefaultProfSet = new Set(
                        getClassDefaultProficiencyIds(selectedPlayer.classId, catalogs)
                      );
                      const gearEncumbrance = computeHeroEncumbrance(selectedPlayer, catalogs);
                      const gearWeightPct = Math.min(
                        100,
                        Math.round(
                          (gearEncumbrance.totalWeightLb / Math.max(1, gearEncumbrance.maxCarryLb)) *
                            100
                        )
                      );
                      const gearBarColor =
                        gearEncumbrance.tier === 'max'
                          ? 'bg-red-500'
                          : gearEncumbrance.tier === 'heavy'
                            ? 'bg-rose-500'
                            : gearEncumbrance.tier === 'light'
                              ? 'bg-amber-400'
                              : 'bg-emerald-500';
                      return (
                        <div className="space-y-4">
                          {/* Gold Quick Editor */}
                          <div className="p-3 rounded-xl bg-[#0B0F17] border border-slate-800 flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold text-slate-200">Золото (зм)</span>
                            <div className="flex items-center gap-1.5">
                              {[-10, -1, 1, 10].map((d) => (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() =>
                                    send({
                                      type: 'dm:updateStats',
                                      playerId: selectedPlayer.id,
                                      gold: Math.max(0, selectedPlayer.gold + d),
                                    })
                                  }
                                  className="px-2 py-1 rounded bg-[#131A26] hover:bg-slate-800 border border-slate-800 font-mono text-[11px] text-slate-300"
                                >
                                  {d > 0 ? `+${d}` : d}
                                </button>
                              ))}
                              <input
                                type="number"
                                min={0}
                                value={selectedPlayer.gold}
                                onChange={(e) =>
                                  send({
                                    type: 'dm:updateStats',
                                    playerId: selectedPlayer.id,
                                    gold: Math.max(0, Number(e.target.value) || 0),
                                  })
                                }
                                className="w-20 px-2 py-1 rounded bg-[#131A26] border border-slate-700 font-mono tabular-nums text-xs text-amber-400 text-center font-semibold"
                              />
                            </div>
                          </div>

                          {/* Hero Weight Limit & Encumbrance Panel */}
                          <div
                            className={`p-3 rounded-xl border space-y-2 ${
                              gearEncumbrance.tier === 'max'
                                ? 'bg-red-950/30 border-red-500/60'
                                : gearEncumbrance.tier === 'heavy'
                                  ? 'bg-rose-950/25 border-rose-500/50'
                                  : gearEncumbrance.tier === 'light'
                                    ? 'bg-amber-950/20 border-amber-500/50'
                                    : 'bg-[#0B0F17] border-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                                <Scale className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>Лимит веса (СИЛ {gearEncumbrance.strScore} × 15)</span>
                              </span>
                              <div className="flex items-center gap-1.5">
                                {gearEncumbrance.conditionName && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                      gearEncumbrance.tier === 'light'
                                        ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                                        : 'bg-red-500/20 border-red-400/60 text-red-200'
                                    }`}
                                  >
                                    {gearEncumbrance.conditionName}
                                  </span>
                                )}
                                <span className="font-mono tabular-nums text-xs font-bold text-slate-100">
                                  {formatWeightLb(gearEncumbrance.totalWeightLb)} /{' '}
                                  {gearEncumbrance.maxCarryLb} фнт.
                                </span>
                              </div>
                            </div>
                            <div className="relative h-2 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full transition-all duration-200 ${gearBarColor}`}
                                style={{ width: `${gearWeightPct}%` }}
                              />
                              <span className="absolute top-0 bottom-0 left-1/3 w-px bg-slate-950/80" />
                              <span className="absolute top-0 bottom-0 left-2/3 w-px bg-slate-950/80" />
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                              <span>×5: {gearEncumbrance.lightThresholdLb}</span>
                              <span>×10: {gearEncumbrance.heavyThresholdLb}</span>
                              <span>×15: {gearEncumbrance.maxCarryLb} фнт.</span>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-snug">
                              {gearEncumbrance.summary}
                            </p>
                          </div>

                          {/* Hands Usage Summary Bar */}
                          {(() => {
                            const gearHands = computeEquippedHandsUsage(
                              selectedPlayer.inventory,
                              catalogs
                            );
                            return (
                              <div className="p-2.5 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-1.5">
                                <div className="flex items-center justify-between gap-2 text-xs">
                                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                                    <Swords className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <span>Занятость рук</span>
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold border ${
                                      gearHands.usedHands >= 2
                                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                                        : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                    }`}
                                  >
                                    {gearHands.usedHands} / 2 рук
                                  </span>
                                </div>
                                {gearHands.slots.length === 0 ? (
                                  <div className="text-[11px] text-slate-400">Обе руки свободны</div>
                                ) : (
                                  <div className="flex flex-wrap gap-1">
                                    {gearHands.slots.map((s) => (
                                      <span
                                        key={s.itemId}
                                        className="px-2 py-0.5 rounded bg-[#131A26] border border-slate-700/80 text-[11px] text-slate-200"
                                      >
                                        {s.name}{' '}
                                        <span className="text-[10px] font-mono text-amber-300">
                                          ({s.hands === 2 ? '2р' : '1р'})
                                        </span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Private Inventory Editor */}
                          <div className="space-y-2.5">
                            <div className="flex items-baseline justify-between">
                              <h2 className="text-xs font-semibold text-slate-200">
                                Инвентарь ({selectedPlayer.inventory.length})
                              </h2>
                              <span className="text-[11px] text-slate-400">Скрыто на ТВ</span>
                            </div>

                            <form
                              onSubmit={handleAddInventory}
                              className="p-3 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2"
                            >
                              <div className="flex gap-2">
                                <select
                                  value={itemCategory}
                                  onChange={(e) => {
                                    const nextCat = e.target.value as ItemCategory;
                                    setItemCategory(nextCat);
                                    setItemCatalogId('');
                                  }}
                                  className="px-2 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-200"
                                >
                                  <option value="gear">Вещи / Снаряжение</option>
                                  <option value="weapon">Оружие</option>
                                  <option value="armor">Доспех</option>
                                  <option value="potion">Зелье</option>
                                  <option value="quest">Особое</option>
                                </select>

                                {itemCategory === 'gear' && (
                                  <select
                                    value={itemCatalogId}
                                    onChange={(e) => {
                                      const id = e.target.value;
                                      setItemCatalogId(id);
                                      const found = catalogs.gearItems.find((g) => g.id === id);
                                      if (found) {
                                        setItemName(found.name);
                                        setItemQty(found.packQuantity ?? 1);
                                        setItemWeight(found.weight || '');
                                        setItemDesc(found.description || '');
                                      }
                                    }}
                                    className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-emerald-300"
                                  >
                                    <option value="">Из справочника вещей...</option>
                                    {catalogs.gearItems.map((g) => (
                                      <option key={g.id} value={g.id}>
                                        [{getGearKindLabel(g.kind)}] {g.name}
                                        {g.kind === 'ammunition' && g.packQuantity
                                          ? ` (${g.packQuantity} шт.)`
                                          : g.kind === 'container' && g.capacity
                                            ? ` (до ${g.capacity} шт.)`
                                            : ''}
                                      </option>
                                    ))}
                                  </select>
                                )}

                                {itemCategory === 'weapon' && (
                                  <select
                                    value={itemCatalogId}
                                    onChange={(e) => {
                                      const id = e.target.value;
                                      setItemCatalogId(id);
                                      const found = catalogs.weapons.find((w) => w.id === id);
                                      if (found) {
                                        setItemName(found.name);
                                        setItemWeaponCat(found.category);
                                        setItemWeaponRange(found.rangeType);
                                        setItemWeight(found.weight || '');
                                        setItemDesc(
                                          `${found.damage} · ${formatWeaponPropertiesSummary(found, catalogs)}`
                                        );
                                      }
                                    }}
                                    className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-amber-300"
                                  >
                                    <option value="">Из справочника оружия...</option>
                                    {catalogs.weapons.map((w) => (
                                      <option key={w.id} value={w.id}>
                                        [{getWeaponCategoryLabel(w.category)} · {getWeaponRangeLabel(w.rangeType)}] {w.name} ({w.damage})
                                      </option>
                                    ))}
                                  </select>
                                )}

                                {itemCategory === 'armor' && (
                                  <select
                                    value={itemCatalogId}
                                    onChange={(e) => {
                                      const id = e.target.value;
                                      setItemCatalogId(id);
                                      const found = catalogs.armors.find((a) => a.id === id);
                                      if (found) {
                                        setItemName(found.name);
                                        setItemArmorCat(found.category);
                                        setItemWeight(found.weight || '');
                                        setItemDesc(
                                          `КЗ ${found.armorClass}${found.strengthReq !== '—' ? ` · ${found.strengthReq}` : ''}`
                                        );
                                      }
                                    }}
                                    className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-sky-300"
                                  >
                                    <option value="">Из справочника доспехов и щитов...</option>
                                    {catalogs.armors.map((a) => (
                                      <option key={a.id} value={a.id}>
                                        [{getArmorCategoryLabel(a.category)}] {a.name} (КЗ {a.armorClass})
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>

                              {itemCategory === 'weapon' && !itemCatalogId && (
                                <div className="space-y-1.5 text-[11px]">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-slate-400">Категория:</span>
                                    <button
                                      type="button"
                                      onClick={() => setItemWeaponCat('simple')}
                                      className={`px-2 py-0.5 rounded border ${
                                        itemWeaponCat === 'simple'
                                          ? 'bg-amber-500/20 border-amber-500/70 text-amber-300'
                                          : 'border-slate-800 text-slate-400'
                                      }`}
                                    >
                                      Простое
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setItemWeaponCat('martial')}
                                      className={`px-2 py-0.5 rounded border ${
                                        itemWeaponCat === 'martial'
                                          ? 'bg-amber-500/20 border-amber-500/70 text-amber-300'
                                          : 'border-slate-800 text-slate-400'
                                      }`}
                                    >
                                      Воинское
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-slate-400">Дистанция:</span>
                                    <button
                                      type="button"
                                      onClick={() => setItemWeaponRange('melee')}
                                      className={`px-2 py-0.5 rounded border ${
                                        itemWeaponRange === 'melee'
                                          ? 'bg-sky-500/20 border-sky-500/70 text-sky-300'
                                          : 'border-slate-800 text-slate-400'
                                      }`}
                                    >
                                      Рукопашное
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setItemWeaponRange('ranged')}
                                      className={`px-2 py-0.5 rounded border ${
                                        itemWeaponRange === 'ranged'
                                          ? 'bg-sky-500/20 border-sky-500/70 text-sky-300'
                                          : 'border-slate-800 text-slate-400'
                                      }`}
                                    >
                                      Дальнобойное
                                    </button>
                                  </div>
                                </div>
                              )}

                              {itemCategory === 'armor' && !itemCatalogId && (
                                <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                                  <span className="text-slate-400">Тип:</span>
                                  {(
                                    [
                                      ['light', 'Лёгкие'],
                                      ['medium', 'Средние'],
                                      ['heavy', 'Тяжёлые'],
                                      ['shield', 'Щит'],
                                    ] as Array<[ArmorCategory, string]>
                                  ).map(([cat, lbl]) => (
                                    <button
                                      key={cat}
                                      type="button"
                                      onClick={() => setItemArmorCat(cat)}
                                      className={`px-2 py-0.5 rounded border ${
                                        itemArmorCat === cat
                                          ? 'bg-sky-500/20 border-sky-500/70 text-sky-300'
                                          : 'border-slate-800 text-slate-400'
                                      }`}
                                    >
                                      {lbl}
                                    </button>
                                  ))}
                                </div>
                              )}

                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Название предмета (напр. Ключ от склепа)"
                                  value={itemName}
                                  onChange={(e) => setItemName(e.target.value)}
                                  className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-100"
                                  required
                                />
                                <input
                                  type="text"
                                  placeholder="Вес (фнт.)"
                                  value={itemWeight}
                                  onChange={(e) => setItemWeight(e.target.value)}
                                  title="Вес 1 шт. в фунтах (например: 2 или 0,5)"
                                  className="w-20 px-2 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs font-mono text-slate-200 text-center"
                                />
                                <input
                                  type="number"
                                  min={1}
                                  value={itemQty}
                                  onChange={(e) => setItemQty(Number(e.target.value) || 1)}
                                  title="Количество"
                                  className="w-12 px-1.5 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs font-mono text-slate-100 text-center"
                                />
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Описание или заметка"
                                  value={itemDesc}
                                  onChange={(e) => setItemDesc(e.target.value)}
                                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-100"
                                />
                                <button
                                  type="submit"
                                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold whitespace-nowrap"
                                >
                                  Выдать
                                </button>
                              </div>
                            </form>

                            <div className="divide-y divide-slate-800/80 rounded-xl bg-[#0B0F17] border border-slate-800">
                              {selectedPlayer.inventory.length === 0 ? (
                                <div className="p-4 text-xs text-slate-400 text-center">
                                  Инвентарь пуст
                                </div>
                              ) : (
                                selectedPlayer.inventory.map((item) => {
                                  const gearRef =
                                    item.category === 'gear'
                                      ? resolveGearCatalogItem(item, catalogs)
                                      : undefined;
                                  const wpnHands =
                                    item.category === 'weapon'
                                      ? getWeaponRequiredHands(item, catalogs)
                                      : null;
                                  const ammoCap =
                                    gearRef?.kind === 'ammunition'
                                      ? getAmmoCapacityForPlayer(
                                          selectedPlayer.inventory,
                                          gearRef,
                                          catalogs
                                        )
                                      : null;
                                  return (
                                    <div
                                      key={item.id}
                                      className="px-3 py-2 flex items-center justify-between gap-2"
                                    >
                                      <div className="min-w-0">
                                        <div className="text-xs font-medium text-slate-100 flex items-center gap-1.5 flex-wrap">
                                          <span className="truncate">{item.name}</span>
                                          {wpnHands && (
                                            <span className="px-1 py-0.5 rounded bg-slate-800 text-[9px] font-mono text-slate-300">
                                              {wpnHands === 2 ? '2р' : '1р'}
                                            </span>
                                          )}
                                          {item.category === 'armor' &&
                                            item.armorCategory === 'shield' && (
                                              <span className="px-1 py-0.5 rounded bg-slate-800 text-[9px] font-mono text-sky-300">
                                                1р
                                              </span>
                                            )}
                                          {item.equipped && (
                                            <span className="text-[10px] text-amber-400 font-normal">
                                              · надето
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-slate-400 truncate">
                                          {item.weaponCategory
                                            ? (() => {
                                                const rangeInfo = resolveWeaponReachRange(
                                                  item,
                                                  catalogs
                                                );
                                                const rangeText =
                                                  rangeInfo.rangeType === 'ranged' &&
                                                  rangeInfo.maxFt > rangeInfo.normalFt
                                                    ? `${rangeInfo.normalFt}/${rangeInfo.maxFt} фт.`
                                                    : `${rangeInfo.normalFt} фт.`;
                                                return `${getWeaponCategoryLabel(item.weaponCategory)} · ${getWeaponRangeLabel(rangeInfo.rangeType)} (${rangeText})${item.damage ? ` · ${item.damage}` : ''}`;
                                              })()
                                            : item.armorCategory
                                              ? `${getArmorCategoryLabel(item.armorCategory)}${item.armorClass ? ` · КЗ ${item.armorClass}` : ''}`
                                              : ammoCap
                                                ? `${ammoCap.currentQty}${Number.isFinite(ammoCap.maxCapacity) ? `/${ammoCap.maxCapacity}` : ''} шт.${ammoCap.containerRef ? ` · ${ammoCap.containerRef.name}` : ''}`
                                                : gearRef?.kind === 'container'
                                                  ? `Вмещает до ${(gearRef.capacity ?? 20) * Math.max(1, item.quantity)} шт.`
                                                  : item.description || ''}
                                          {(() => {
                                            const uLb = getInventoryItemUnitWeightLb(
                                              item,
                                              catalogs
                                            );
                                            if (uLb <= 0) return null;
                                            const totLb =
                                              Math.round(uLb * Math.max(0, item.quantity) * 100) /
                                              100;
                                            return (
                                              <span className="ml-1.5 font-mono text-slate-500">
                                                · {formatWeightLb(totLb)} фнт.
                                              </span>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {(item.category === 'weapon' ||
                                          item.category === 'armor') && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              send({
                                                type: 'dm:updateInventoryItem',
                                                playerId: selectedPlayer.id,
                                                itemId: item.id,
                                                patch: { equipped: !item.equipped },
                                              })
                                            }
                                            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                                              item.equipped
                                                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                                                : 'bg-[#131A26] border-slate-700 text-slate-300 hover:text-slate-100'
                                            }`}
                                          >
                                            {item.equipped ? 'Снять' : 'Надеть'}
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (item.quantity <= 1) {
                                              send({
                                                type: 'dm:removeInventoryItem',
                                                playerId: selectedPlayer.id,
                                                itemId: item.id,
                                              });
                                            } else {
                                              send({
                                                type: 'dm:updateInventoryItem',
                                                playerId: selectedPlayer.id,
                                                itemId: item.id,
                                                patch: { quantity: item.quantity - 1 },
                                              });
                                            }
                                          }}
                                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100"
                                          aria-label="Уменьшить количество"
                                        >
                                          <Minus className="w-3.5 h-3.5" />
                                        </button>
                                        <span className="w-7 text-center text-xs font-mono tabular-nums text-amber-400">
                                          {item.quantity}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            send({
                                              type: 'dm:updateInventoryItem',
                                              playerId: selectedPlayer.id,
                                              itemId: item.id,
                                              patch: { quantity: item.quantity + 1 },
                                            })
                                          }
                                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100"
                                          aria-label="Увеличить количество"
                                        >
                                          <Plus className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            send({
                                              type: 'dm:removeInventoryItem',
                                              playerId: selectedPlayer.id,
                                              itemId: item.id,
                                            })
                                          }
                                          className="p-1 ml-1 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400"
                                          aria-label="Удалить предмет"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          {/* Proficiencies (Weapon / Armor — right beside Inventory) */}
                          <div className="space-y-2 pt-2 border-t border-slate-800">
                            <div className="flex items-baseline justify-between">
                              <h3 className="text-xs font-semibold text-slate-200">
                                Владения оружием и доспехами ({selectedPlayer.proficiencyIds.length})
                              </h3>
                              <span className="text-[11px] text-slate-400">БМ +{profBonus}</span>
                            </div>
                            <div className="grid grid-cols-1 gap-1.5">
                              {catalogs.proficiencies.map((pr) => {
                                const active = selectedPlayer.proficiencyIds.includes(pr.id);
                                const fromClass = classDefaultProfSet.has(pr.id);
                                return (
                                  <button
                                    key={pr.id}
                                    type="button"
                                    onClick={() => handleToggleProficiency(pr.id)}
                                    className={`px-3 py-1.5 rounded-lg border text-left flex items-center justify-between gap-2 text-xs transition-colors ${
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
                            {selectedClassRef?.weaponProficiencyNote && (
                              <p className="text-[11px] text-amber-200/90 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1.5">
                                {selectedClassRef.weaponProficiencyNote}
                              </p>
                            )}
                          </div>

                          {/* Private Note */}
                          <div className="space-y-1.5 pt-2 border-t border-slate-800">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-400">
                                Личная заметка (только на телефоне игрока)
                              </span>
                              {noteDraft !== selectedPlayer.privateNote && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    send({
                                      type: 'dm:updateStats',
                                      playerId: selectedPlayer.id,
                                      privateNote: noteDraft,
                                    })
                                  }
                                  className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                                >
                                  Сохранить
                                </button>
                              )}
                            </div>
                            <textarea
                              rows={2}
                              value={noteDraft}
                              onChange={(e) => setNoteDraft(e.target.value)}
                              onBlur={() => {
                                if (noteDraft !== selectedPlayer.privateNote) {
                                  send({
                                    type: 'dm:updateStats',
                                    playerId: selectedPlayer.id,
                                    privateNote: noteDraft,
                                  });
                                }
                              }}
                              placeholder="Секретная подсказка или наблюдение для этого игрока..."
                              className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-200 resize-none"
                            />
                          </div>
                        </div>
                      );
                    })()}

                    {/* SUB-TAB 4: АНКЕТА (Личность, Расположение, Опыт и Уровень, Черты, Умения класса и подкласса) */}
                    {playerSubTab === 'profile' && (
                      <div className="space-y-4">
                        {/* Identity from Catalogs */}
                        <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-3 text-xs">
                          <label className="block space-y-1">
                            <span className="text-[11px] text-slate-400">Имя персонажа</span>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={nameDraft}
                                onChange={(e) => setNameDraft(e.target.value)}
                                onBlur={() => {
                                  if (nameDraft.trim() && nameDraft.trim() !== selectedPlayer.name) {
                                    send({
                                      type: 'dm:updateStats',
                                      playerId: selectedPlayer.id,
                                      name: nameDraft.trim(),
                                    });
                                  }
                                }}
                                className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-100"
                              />
                              {nameDraft.trim() && nameDraft.trim() !== selectedPlayer.name && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    send({
                                      type: 'dm:updateStats',
                                      playerId: selectedPlayer.id,
                                      name: nameDraft.trim(),
                                    })
                                  }
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-semibold"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </label>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <label className="space-y-1">
                              <span className="text-[11px] text-slate-400">Класс</span>
                              <select
                                value={selectedPlayer.classId}
                                onChange={(e) =>
                                  send({
                                    type: 'dm:updateStats',
                                    playerId: selectedPlayer.id,
                                    classId: e.target.value,
                                  })
                                }
                                className="w-full px-2 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-100"
                              >
                                {catalogs.classes.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="space-y-1">
                              <span className="text-[11px] text-slate-400">Предыстория</span>
                              <select
                                value={selectedPlayer.backgroundId}
                                onChange={(e) =>
                                  send({
                                    type: 'dm:updateStats',
                                    playerId: selectedPlayer.id,
                                    backgroundId: e.target.value,
                                  })
                                }
                                className="w-full px-2 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-100"
                              >
                                {catalogs.backgrounds.map((b) => (
                                  <option key={b.id} value={b.id}>
                                    {b.name}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="space-y-1">
                              <span className="text-[11px] text-slate-400">Вид</span>
                              <select
                                value={selectedPlayer.speciesId}
                                onChange={(e) =>
                                  send({
                                    type: 'dm:updateStats',
                                    playerId: selectedPlayer.id,
                                    speciesId: e.target.value,
                                  })
                                }
                                className="w-full px-2 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-100"
                              >
                                {catalogs.species.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>

                          {/* Subclass Selector (Locked until Level 3) */}
                          <label className="block space-y-1">
                            <span className="text-[11px] text-slate-400 flex items-center justify-between gap-2">
                              <span className="flex items-center gap-1">
                                <GitBranch className="w-3 h-3 text-violet-400" />
                                <span>Подкласс</span>
                              </span>
                              {selectedPlayer.level < 3 && (
                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>Открывается с 3 уровня</span>
                                </span>
                              )}
                            </span>
                            <select
                              value={selectedPlayer.level >= 3 ? (selectedPlayer.subclassId ?? '') : ''}
                              disabled={selectedPlayer.level < 3}
                              onChange={(e) =>
                                send({
                                  type: 'dm:updateStats',
                                  playerId: selectedPlayer.id,
                                  subclassId: e.target.value,
                                })
                              }
                              className="w-full px-2 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-100 disabled:opacity-45 disabled:cursor-not-allowed"
                            >
                              <option value="">
                                {selectedPlayer.level < 3
                                  ? 'Доступно с 3 уровня'
                                  : '— Подкласс не выбран —'}
                              </option>
                              {selectedPlayer.level >= 3 &&
                                catalogs.subclasses
                                  .filter((s) => s.classId === selectedPlayer.classId)
                                  .map((sc) => (
                                    <option key={sc.id} value={sc.id}>
                                      {sc.name}
                                    </option>
                                  ))}
                            </select>
                          </label>

                          <label className="block space-y-1">
                            <span className="text-[11px] text-slate-400">Владелец (аккаунт участника)</span>
                            <select
                              value={selectedPlayer.ownerAccountId ?? ''}
                              onChange={(e) =>
                                send({
                                  type: 'dm:updateStats',
                                  playerId: selectedPlayer.id,
                                  ownerAccountId: e.target.value || undefined,
                                })
                              }
                              className="w-full px-2 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-100"
                            >
                              <option value="">— Не привязан —</option>
                              {dmState.accounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        {/* Persisted Character Location & Status Note */}
                        <div className="p-3 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-400 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-amber-400" />
                              <span>Расположение персонажа</span>
                            </span>
                            {selectedPlayer.locationId !== dmState.activeLocationId && (
                              <button
                                type="button"
                                onClick={() =>
                                  send({
                                    type: 'dm:movePlayerToLocation',
                                    playerId: selectedPlayer.id,
                                    locationId: dmState.activeLocationId,
                                  })
                                }
                                className="text-[11px] font-medium text-amber-400 hover:text-amber-300"
                              >
                                На текущую карту
                              </button>
                            )}
                          </div>

                          <select
                            value={selectedPlayer.locationId}
                            onChange={(e) =>
                              send({
                                type: 'dm:movePlayerToLocation',
                                playerId: selectedPlayer.id,
                                locationId: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-100"
                          >
                            {dmState.locations.map((loc) => (
                              <option key={loc.id} value={loc.id}>
                                {loc.kind === 'city' ? '[Город] ' : '[Бой] '}
                                {loc.name}
                              </option>
                            ))}
                          </select>

                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={locationNoteDraft}
                              onChange={(e) => setLocationNoteDraft(e.target.value)}
                              onBlur={() => {
                                if (locationNoteDraft.trim() !== (selectedPlayer.locationNote ?? '')) {
                                  send({
                                    type: 'dm:updateStats',
                                    playerId: selectedPlayer.id,
                                    locationNote: locationNoteDraft.trim(),
                                  });
                                }
                              }}
                              placeholder="Статус / место (напр. Спит в казармах)"
                              className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500"
                            />
                            {locationNoteDraft.trim() !== (selectedPlayer.locationNote ?? '') && (
                              <button
                                type="button"
                                onClick={() =>
                                  send({
                                    type: 'dm:updateStats',
                                    playerId: selectedPlayer.id,
                                    locationNote: locationNoteDraft.trim(),
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-semibold"
                                aria-label="Сохранить статус места"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Experience & Derived Level */}
                        <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2.5 text-xs">
                          <div className="flex items-baseline justify-between gap-2">
                            <div>
                              <span className="text-slate-400">Уровень (по опыту): </span>
                              <span className="font-mono tabular-nums text-sm font-bold text-amber-400">
                                {selectedPlayer.level}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono tabular-nums text-slate-400">
                              {nextLevelRef
                                ? `До ур. ${nextLevelRef.level}: ${Math.max(0, nextLevelRef.minXp - selectedPlayer.xp)} XP`
                                : 'Макс. уровень'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              value={selectedPlayer.xp}
                              onChange={(e) =>
                                send({
                                  type: 'dm:updateStats',
                                  playerId: selectedPlayer.id,
                                  xp: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                              className="w-28 px-2.5 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 font-mono tabular-nums text-slate-100"
                            />
                            <div className="flex-1 grid grid-cols-3 gap-1.5">
                              {[50, 100, 300].map((bonus) => (
                                <button
                                  key={bonus}
                                  type="button"
                                  onClick={() =>
                                    send({
                                      type: 'dm:updateStats',
                                      playerId: selectedPlayer.id,
                                      xp: selectedPlayer.xp + bonus,
                                    })
                                  }
                                  className="py-1.5 rounded-lg bg-[#131A26] hover:bg-slate-800 border border-slate-700 font-mono text-[11px] text-emerald-300 font-semibold transition-colors"
                                >
                                  +{bonus} XP
                                </button>
                              ))}
                            </div>
                          </div>

                          {selectedClassRef && (
                            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                              <span className="text-slate-400">
                                Хиты за ур.:{' '}
                                <span className="text-slate-200">
                                  {getClassHitDieInfo(selectedClassRef).hint}
                                </span>
                              </span>
                              <span className="font-mono font-semibold text-amber-300">
                                БМ +{profBonus}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Hero Feats (with Automation Badges) */}
                        {(() => {
                          const heroFeats = getHeroFeats(selectedPlayer, catalogs);
                          if (heroFeats.length === 0) return null;
                          return (
                            <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2">
                              <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                                <Award className="w-3.5 h-3.5 shrink-0" />
                                <span>Черты героя</span>
                              </div>
                              <div className="space-y-2 divide-y divide-slate-800/80">
                                {heroFeats.map((feat) => (
                                  <div key={feat.id} className="pt-2 first:pt-0 space-y-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-semibold text-slate-100">
                                        {feat.name}
                                      </span>
                                      {feat.automatedSummary && (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-[9px] font-medium text-emerald-300">
                                          <Zap className="w-2.5 h-2.5" />
                                          <span>Авто</span>
                                        </span>
                                      )}
                                    </div>
                                    {feat.automatedSummary && (
                                      <div className="text-[10px] text-emerald-300/95">
                                        {feat.automatedSummary}
                                      </div>
                                    )}
                                    <p className="text-[11px] text-slate-400 leading-relaxed">
                                      {feat.description}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Unlocked Class & Subclass Features */}
                        {(() => {
                          const classFeats = getHeroClassFeatures(
                            selectedPlayer.classId,
                            selectedPlayer.level,
                            catalogs
                          );
                          const subFeats = getHeroSubclassFeatures(
                            selectedPlayer.classId,
                            selectedPlayer.subclassId,
                            selectedPlayer.level,
                            catalogs
                          );
                          const combined = [
                            ...classFeats.map((f) => ({
                              id: f.id,
                              level: f.level,
                              name: f.name,
                              description: f.description,
                              automatedSummary: f.automatedSummary,
                              isSubclass: false,
                            })),
                            ...subFeats.map((f) => ({
                              id: f.id,
                              level: f.level,
                              name: f.name,
                              description: f.description,
                              automatedSummary: f.automatedSummary,
                              isSubclass: true,
                            })),
                          ].sort((a, b) => a.level - b.level);

                          if (combined.length === 0) return null;
                          return (
                            <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span>Умения класса ({combined.length})</span>
                                </span>
                                <span className="text-[10px] font-mono text-amber-300">
                                  Ур. {selectedPlayer.level} · БМ +{profBonus}
                                </span>
                              </div>

                              <div className="divide-y divide-slate-800/80">
                                {combined.map((feat) => {
                                  const open = expandedDmFeatureId === feat.id;
                                  return (
                                    <div key={feat.id} className="py-1.5 first:pt-0 last:pb-0">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedDmFeatureId(open ? null : feat.id)
                                        }
                                        className="w-full flex items-center justify-between gap-2 text-left"
                                      >
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <span
                                            className={`px-1 py-0.5 rounded font-mono text-[9px] font-semibold shrink-0 ${
                                              feat.isSubclass
                                                ? 'bg-violet-500/20 text-violet-300'
                                                : 'bg-amber-500/15 text-amber-300'
                                            }`}
                                          >
                                            Ур.{feat.level}
                                          </span>
                                          <span className="text-xs font-medium text-slate-100 truncate">
                                            {feat.name}
                                          </span>
                                          {feat.automatedSummary && (
                                            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-[9px] font-medium text-emerald-300 shrink-0">
                                              <Zap className="w-2.5 h-2.5" />
                                              <span>Авто</span>
                                            </span>
                                          )}
                                        </div>
                                        <ChevronDown
                                          className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform ${
                                            open ? 'rotate-180' : ''
                                          }`}
                                        />
                                      </button>
                                      {open && (
                                        <div className="mt-1.5 space-y-1">
                                          {feat.automatedSummary && (
                                            <div className="text-[10px] text-emerald-300 bg-emerald-950/25 border border-emerald-500/25 rounded px-2 py-1">
                                              Автоэффект: {feat.automatedSummary}
                                            </div>
                                          )}
                                          {feat.description && (
                                            <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-line">
                                              {feat.description}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* TAB 2: SCENE & EVENTS */}
            {activeTab === 'events' && (
              <div className="space-y-5">
                <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-3">
                  <div className="text-xs font-semibold text-slate-200">Текущая сцена</div>
                  <input
                    type="text"
                    value={dmState.scene.locationName}
                    onChange={(e) =>
                      send({ type: 'dm:setScene', patch: { locationName: e.target.value } })
                    }
                    placeholder="Название локации"
                    className="w-full px-3 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-100"
                  />
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'exploration', label: 'Исследование' },
                        { id: 'combat', label: 'Бой' },
                        { id: 'rest', label: 'Привал' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() =>
                          send({ type: 'dm:setScene', patch: { mode: m.id as SceneMode } })
                        }
                        className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          dmState.scene.mode === m.id
                            ? 'bg-amber-500/20 border-amber-500/70 text-amber-300'
                            : 'bg-[#131A26] border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* TV Audio Controls (Splash + Active Location Status + Mute) */}
                <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                      <Music className="w-3.5 h-3.5 text-amber-400" />
                      <span>Звук на ТВ (MP3)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        send({
                          type: 'dm:setAudioMuted',
                          muted: !dmState.tvDisplay.audioMuted,
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
                        dmState.tvDisplay.audioMuted
                          ? 'bg-rose-500/20 border-rose-500/60 text-rose-200 hover:bg-rose-500/30'
                          : 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200 hover:bg-emerald-500/25'
                      }`}
                    >
                      {dmState.tvDisplay.audioMuted ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5" />
                          <span>Отключён</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Включён</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Active location ambient summary */}
                  <div className="p-2.5 rounded-lg bg-[#131A26] border border-slate-800 flex items-center justify-between gap-2 text-[11px]">
                    <div className="min-w-0">
                      <div className="text-slate-400">
                        Текущая локация: <span className="text-slate-200">{activeLocation?.name}</span>
                      </div>
                      <div
                        className={`truncate font-medium ${
                          activeLocation?.ambientAudioUrl ? 'text-emerald-300' : 'text-slate-500'
                        }`}
                      >
                        {activeLocation?.ambientAudioUrl
                          ? activeLocation.ambientAudioName || 'Фоновый трек загружен'
                          : 'Аудио не загружено'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('/locations')}
                      className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0 transition-colors"
                    >
                      Настроить
                    </button>
                  </div>

                  {/* Initial Splash Screen Audio */}
                  <div className="space-y-2 pt-1 border-t border-slate-800/80">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-slate-300">
                        Аудио начальной заставки (MP3)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => splashAudioInputRef.current?.click()}
                          disabled={uploadingSplashAudio}
                          className="px-2.5 py-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-[11px] font-medium text-amber-200 transition-colors"
                        >
                          {uploadingSplashAudio
                            ? 'Загрузка...'
                            : dmState.tvDisplay.splashAudioUrl
                              ? 'Заменить'
                              : 'Загрузить MP3'}
                        </button>
                        {dmState.tvDisplay.splashAudioUrl && (
                          <button
                            type="button"
                            onClick={() => send({ type: 'dm:clearSplashAudio' })}
                            title="Удалить аудио начальной заставки"
                            className="p-1 rounded-md bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {dmState.tvDisplay.splashAudioUrl ? (
                      <div className="space-y-1.5">
                        <div className="text-[11px] text-emerald-300 truncate">
                          {dmState.tvDisplay.splashAudioName || 'Аудио заставки.mp3'}
                        </div>
                        <audio
                          controls
                          loop
                          preload="none"
                          src={dmState.tvDisplay.splashAudioUrl}
                          className="w-full h-8"
                        />
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500">
                        Загрузите MP3-файл, чтобы музыка зацикленно играла на ТВ во время титульной заставки.
                      </p>
                    )}

                    {splashAudioError && (
                      <p className="text-[11px] text-rose-400">{splashAudioError}</p>
                    )}
                  </div>
                </div>

                <form
                  onSubmit={handleSendEvent}
                  className="p-3.5 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-3"
                >
                  <div className="text-xs font-semibold text-slate-200">Запустить событие</div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEventScope('public')}
                      className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        eventScope === 'public'
                          ? 'bg-slate-800 border-amber-500/60 text-slate-100'
                          : 'bg-[#131A26] border-slate-800 text-slate-400'
                      }`}
                    >
                      На ТВ и всем
                    </button>
                    <button
                      type="button"
                      onClick={() => setEventScope('private')}
                      className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        eventScope === 'private'
                          ? 'bg-slate-800 border-amber-500/60 text-slate-100'
                          : 'bg-[#131A26] border-slate-800 text-slate-400'
                      }`}
                    >
                      Лично игроку
                    </button>
                  </div>

                  {eventScope === 'private' && (
                    <select
                      value={eventTargetPlayerId}
                      onChange={(e) => setEventTargetPlayerId(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-100"
                    >
                      {dmState.players.map((p) => (
                        <option key={p.id} value={p.id}>
                          Игроку: {p.name}
                        </option>
                      ))}
                    </select>
                  )}

                  <input
                    type="text"
                    placeholder="Заголовок события (напр. Засада гоблинов!)"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-100"
                    required
                  />

                  <textarea
                    rows={2}
                    placeholder="Описание или сообщение..."
                    value={eventMessage}
                    onChange={(e) => setEventMessage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-100 resize-none"
                  />

                  <div className="flex items-center justify-between gap-2">
                    <select
                      value={eventTone}
                      onChange={(e) => setEventTone(e.target.value as EventTone)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-200"
                    >
                      <option value="neutral">Нейтральное</option>
                      <option value="danger">Опасность / Бой</option>
                      <option value="reward">Награда / Находка</option>
                    </select>

                    {eventScope === 'public' && (
                      <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showBannerOnTv}
                          onChange={(e) => setShowBannerOnTv(e.target.checked)}
                          className="accent-amber-500"
                        />
                        <span>Баннер на ТВ</span>
                      </label>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Отправить событие</span>
                  </button>
                </form>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-400">Журнал событий</div>
                  <div className="space-y-2">
                    {dmState.eventLog.slice(0, 12).map((evt) => {
                      const target = evt.targetPlayerId
                        ? dmState.players.find((p) => p.id === evt.targetPlayerId)?.name
                        : null;
                      return (
                        <div
                          key={evt.id}
                          className="p-2.5 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs space-y-0.5"
                        >
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>
                              {evt.scope === 'private' ? `Лично: ${target || 'игроку'}` : 'Публичное'}
                            </span>
                            <span className="font-mono tabular-nums">
                              {new Date(evt.timestamp).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <div className="font-medium text-slate-100">{evt.title}</div>
                          {evt.message && <div className="text-slate-400">{evt.message}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: TOKENS & SESSION */}
            {activeTab === 'tokens' && (
              <div className="space-y-5">
                <form
                  onSubmit={handleAddToken}
                  className="p-3.5 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-3"
                >
                  <div className="text-xs font-semibold text-slate-200">Добавить фишку на карту</div>

                  {tokenKind === 'enemy' && (
                    <div className="flex items-center gap-2">
                      <select
                        value={tokenMonsterId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setTokenMonsterId(id);
                          const mon = catalogs.monsters.find((m) => m.id === id);
                          if (mon) {
                            setTokenLabel(mon.name);
                            setTokenInitiative(mon.initiative);
                            setTokenMaxHp(mon.maxHp);
                            setTokenAc(mon.ac);
                            setTokenColor('#EF4444');
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-red-300"
                      >
                        <option value="">Из справочника монстров ({catalogs.monsters.length})...</option>
                        {catalogs.monsters.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} (КЗ {m.ac} · {m.maxHp} HP · Иниц. {m.initiative} · {m.xpReward} XP)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Название (напр. Крыса или Орк)"
                      value={tokenLabel}
                      onChange={(e) => setTokenLabel(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-100"
                      required
                    />
                    <select
                      value={tokenKind}
                      onChange={(e) => {
                        const nextKind = e.target.value as TokenKind;
                        setTokenKind(nextKind);
                        if (nextKind !== 'enemy') {
                          setTokenMonsterId('');
                        }
                      }}
                      className="px-2 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-200"
                    >
                      <option value="enemy">Враг / Монстр</option>
                      <option value="npc">NPC</option>
                      <option value="object">Объект</option>
                    </select>
                  </div>

                  {tokenKind === 'enemy' && (
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <label className="flex items-center justify-between gap-1.5 px-2 py-1 rounded bg-[#131A26] border border-slate-800 text-slate-400">
                        <span>Хиты:</span>
                        <input
                          type="number"
                          min={1}
                          placeholder="—"
                          value={tokenMaxHp}
                          onChange={(e) =>
                            setTokenMaxHp(e.target.value === '' ? '' : Math.max(1, Number(e.target.value) || 1))
                          }
                          className="w-14 bg-transparent text-right font-mono text-emerald-300 focus:outline-none"
                        />
                      </label>
                      <label className="flex items-center justify-between gap-1.5 px-2 py-1 rounded bg-[#131A26] border border-slate-800 text-slate-400">
                        <span>КЗ:</span>
                        <input
                          type="number"
                          min={1}
                          placeholder="—"
                          value={tokenAc}
                          onChange={(e) =>
                            setTokenAc(e.target.value === '' ? '' : Math.max(1, Number(e.target.value) || 10))
                          }
                          className="w-14 bg-transparent text-right font-mono text-sky-300 focus:outline-none"
                        />
                      </label>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {['#EF4444', '#F59E0B', '#10B981', '#38BDF8', '#A855F7'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setTokenColor(c)}
                          className={`w-5 h-5 rounded-full border-2 ${
                            tokenColor === c ? 'border-white scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                          aria-label={`Цвет фишки ${c}`}
                        />
                      ))}
                    </div>
                    <label className="flex items-center gap-1 text-[11px] text-slate-400">
                      <span>Иниц:</span>
                      <input
                        type="number"
                        value={tokenInitiative}
                        onChange={(e) => setTokenInitiative(Number(e.target.value) || 0)}
                        className="w-12 px-1.5 py-1 rounded bg-[#131A26] border border-slate-800 font-mono text-xs text-sky-300 text-center"
                      />
                    </label>
                    <select
                      value={tokenSize}
                      onChange={(e) => setTokenSize(Number(e.target.value))}
                      className="px-2 py-1 rounded bg-[#131A26] border border-slate-800 text-xs text-slate-200"
                    >
                      <option value={1}>1×1</option>
                      <option value={2}>2×2</option>
                    </select>
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold"
                    >
                      Добавить
                    </button>
                  </div>
                </form>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-400">
                      Все фишки ({dmState.tokens.length})
                    </span>
                    <span className="text-[11px] text-slate-500">по инициативе ↓</span>
                  </div>
                  <div className="divide-y divide-slate-800/80 rounded-xl bg-[#0B0F17] border border-slate-800 overflow-hidden">
                    {(() => {
                      const sortedTokens = [...dmState.tokens].sort((a, b) => {
                        const aIsObj = a.kind === 'object';
                        const bIsObj = b.kind === 'object';
                        if (aIsObj !== bIsObj) return aIsObj ? 1 : -1;
                        if (aIsObj && bIsObj) return 0;
                        const aPlayer = a.playerId
                          ? dmState.players.find((p) => p.id === a.playerId)
                          : null;
                        const bPlayer = b.playerId
                          ? dmState.players.find((p) => p.id === b.playerId)
                          : null;
                        const aInit = aPlayer?.initiative ?? a.initiative ?? 0;
                        const bInit = bPlayer?.initiative ?? b.initiative ?? 0;
                        return bInit - aInit;
                      });

                      const initCounts = new Map<number, number>();
                      for (const t of sortedTokens) {
                        if (t.kind === 'object') continue;
                        const lp = t.playerId
                          ? dmState.players.find((p) => p.id === t.playerId)
                          : null;
                        const v = lp?.initiative ?? t.initiative ?? 0;
                        initCounts.set(v, (initCounts.get(v) ?? 0) + 1);
                      }

                      return sortedTokens.map((tok) => {
                        const isDead = tok.combatStatus === 'dead';
                        const isUnconscious =
                          !isDead &&
                          (tok.combatStatus === 'unconscious' ||
                            (tok.conditions ?? []).some((c) =>
                              c.toLowerCase().includes('бессознат')
                            ));
                        const isTurn = !isDead && dmState.scene.activeTurnTokenId === tok.id;
                        const linkedPlayer = tok.playerId
                          ? dmState.players.find((p) => p.id === tok.playerId)
                          : null;
                        const linkedMonster = tok.monsterId
                          ? catalogs.monsters.find((m) => m.id === tok.monsterId)
                          : null;
                        const tokInit = linkedPlayer?.initiative ?? tok.initiative ?? 0;
                        const isTied = tok.kind !== 'object' && (initCounts.get(tokInit) ?? 0) > 1;
                        const tokMaxHp = tok.maxHp ?? linkedMonster?.maxHp;
                        const tokHp = tok.hp ?? tokMaxHp;
                        const tokAc = tok.ac ?? linkedMonster?.ac;
                        const isMonsterExpanded = expandedMonsterTokenId === tok.id;
                        const monsterSkillLabels = linkedMonster
                          ? catalogs.skills
                              .filter(
                                (sk) =>
                                  linkedMonster.proficientSkillIds.includes(sk.id) ||
                                  (linkedMonster.expertiseSkillIds ?? []).includes(sk.id)
                              )
                              .map((sk) => {
                                const isExp = (linkedMonster.expertiseSkillIds ?? []).includes(
                                  sk.id
                                );
                                const abMod = getAbilityModifier(
                                  linkedMonster.abilities?.[sk.abilityId] ?? 10,
                                  catalogs.abilityModifiers
                                );
                                const bonus = abMod + (isExp ? 4 : 2);
                                return `${sk.name} ${formatModifier(bonus)}${isExp ? ' (×2)' : ''}`;
                              })
                          : [];
                        const monsterTraits = linkedMonster?.traits ?? [];
                        const monsterVisionLabels = linkedMonster
                          ? formatEntityVisions(linkedMonster.visions, catalogs.visions)
                          : [];
                        const tokConditions = tok.conditions ?? [];

                        return (
                          <div
                            key={tok.id}
                            className={`px-3 py-2.5 space-y-2 text-xs transition-colors ${
                              isTurn
                                ? 'bg-amber-500/10 border-l-2 border-l-amber-400'
                                : isDead
                                  ? 'opacity-65 bg-slate-950/60'
                                  : ''
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: isDead ? '#64748B' : tok.color }}
                                />
                                <div className="min-w-0">
                                  <div className="font-medium text-slate-100 truncate flex items-center gap-1.5 flex-wrap">
                                    <span className={isDead ? 'line-through text-slate-400' : 'truncate'}>
                                      {tok.label}
                                    </span>
                                    {linkedMonster && (
                                      <Skull className="w-3 h-3 text-red-400 shrink-0" />
                                    )}
                                    {isDead && (
                                      <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[9px] text-slate-300 shrink-0">
                                        Мёртв
                                      </span>
                                    )}
                                    {linkedPlayer?.deathSaves?.status === 'dying' && (
                                      <span className="px-1.5 py-0.5 rounded bg-red-500/20 border border-red-400/60 text-[9px] font-mono text-red-200 shrink-0">
                                        Умирает {linkedPlayer.deathSaves.successes}/{linkedPlayer.deathSaves.failures}
                                      </span>
                                    )}
                                    {linkedPlayer?.deathSaves?.status === 'stabilized' && (
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/50 text-[9px] text-emerald-300 shrink-0">
                                        Стабилиз.
                                      </span>
                                    )}
                                    {isUnconscious &&
                                      linkedPlayer?.deathSaves?.status !== 'dying' &&
                                      linkedPlayer?.deathSaves?.status !== 'stabilized' && (
                                        <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-[9px] text-amber-300 shrink-0">
                                          Без сознания
                                        </span>
                                      )}
                                    {linkedPlayer &&
                                      computeHeroEncumbrance(linkedPlayer, catalogs)
                                        .hasStrDexConDisadvantage && (
                                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-400/60 text-[9px] font-semibold text-rose-200 shrink-0">
                                          Помеха (вес)
                                        </span>
                                      )}
                                    {isTied && !isDead && (
                                      <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/50 text-[9px] font-mono text-amber-300 shrink-0">
                                        = Ничья
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] font-mono tabular-nums text-slate-400">
                                    ({activeLocation?.kind === 'city' ? (tok.x + 1).toFixed(1) : Math.round(tok.x) + 1},{' '}
                                    {activeLocation?.kind === 'city' ? (tok.y + 1).toFixed(1) : Math.round(tok.y) + 1}) ·{' '}
                                    {tok.size}×{tok.size}
                                    {typeof tokAc === 'number' && (
                                      <span className="text-sky-400"> · КЗ {tokAc}</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {tok.kind !== 'object' && (
                                  <input
                                    type="number"
                                    value={tokInit}
                                    title="Инициатива"
                                    aria-label={`Инициатива ${tok.label}`}
                                    onChange={(e) => {
                                      const nextInit = Number(e.target.value) || 0;
                                      if (linkedPlayer) {
                                        send({
                                          type: 'dm:updateStats',
                                          playerId: linkedPlayer.id,
                                          initiative: nextInit,
                                        });
                                      } else {
                                        send({
                                          type: 'dm:upsertToken',
                                          token: { ...tok, initiative: nextInit },
                                        });
                                      }
                                    }}
                                    className="w-11 px-1 py-1 rounded bg-[#131A26] border border-slate-800 font-mono text-[11px] text-sky-300 text-center"
                                  />
                                )}
                                {activeLocation?.kind !== 'city' && tok.kind !== 'object' && (
                                  <button
                                    type="button"
                                    disabled={isDead}
                                    onClick={() =>
                                      send({
                                        type: 'dm:setScene',
                                        patch: { activeTurnTokenId: isTurn ? null : tok.id },
                                      })
                                    }
                                    className={`px-2 py-1 rounded border text-[11px] transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${
                                      isTurn
                                        ? 'bg-amber-500/20 border-amber-500/70 text-amber-300'
                                        : 'border-slate-800 text-slate-400 hover:text-slate-200'
                                    }`}
                                  >
                                    Ход
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    send({
                                      type: 'dm:upsertToken',
                                      token: { ...tok, visibleOnTv: !tok.visibleOnTv },
                                    })
                                  }
                                  className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100"
                                  title={tok.visibleOnTv ? 'Скрыть на ТВ' : 'Показать на ТВ'}
                                >
                                  {tok.visibleOnTv ? (
                                    <Eye className="w-3.5 h-3.5" />
                                  ) : (
                                    <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => send({ type: 'dm:deleteToken', tokenId: tok.id })}
                                  className="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400"
                                  title="Удалить фишку"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Monster / Enemy HP tracker, Statuses & Stat-block actions */}
                            {tok.kind === 'enemy' && (typeof tokMaxHp === 'number' || linkedMonster) && (
                              <div className="pt-1.5 border-t border-slate-800/70 space-y-1.5">
                                <div className="flex items-center justify-between gap-2 text-[11px]">
                                  {typeof tokMaxHp === 'number' && typeof tokHp === 'number' ? (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-slate-400">HP:</span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          send({
                                            type: 'dm:upsertToken',
                                            token: {
                                              ...tok,
                                              hp: Math.max(0, tokHp - 1),
                                              maxHp: tokMaxHp,
                                            },
                                          })
                                        }
                                        className="px-1.5 py-0.5 rounded bg-red-950/50 border border-red-900/60 text-red-300 font-mono hover:bg-red-900/50"
                                      >
                                        -1
                                      </button>
                                      <span
                                        className={`font-mono tabular-nums font-semibold ${
                                          tokHp <= 0 ? 'text-red-400 line-through' : 'text-emerald-300'
                                        }`}
                                      >
                                        {tokHp}/{tokMaxHp}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          send({
                                            type: 'dm:upsertToken',
                                            token: {
                                              ...tok,
                                              hp: Math.min(tokMaxHp, tokHp + 1),
                                              maxHp: tokMaxHp,
                                            },
                                          })
                                        }
                                        className="px-1.5 py-0.5 rounded bg-emerald-950/50 border border-emerald-900/60 text-emerald-300 font-mono hover:bg-emerald-900/50"
                                      >
                                        +1
                                      </button>
                                    </div>
                                  ) : (
                                    <span />
                                  )}

                                  {linkedMonster && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedMonsterTokenId(isMonsterExpanded ? null : tok.id)
                                      }
                                      className="text-[11px] text-amber-400 hover:text-amber-300"
                                    >
                                      {isMonsterExpanded
                                        ? 'Скрыть блок'
                                        : `Статблок (${linkedMonster.actions.length}) · ${linkedMonster.xpReward} XP`}
                                    </button>
                                  )}
                                </div>

                                {/* Compact Monster Conditions Strip */}
                                {!isDead && (
                                  <div className="flex flex-wrap gap-1 pt-1">
                                    {catalogs.conditions.map((cond) => {
                                      const active = tokConditions.includes(cond.name);
                                      return (
                                        <button
                                          key={cond.id}
                                          type="button"
                                          onClick={() => handleToggleTokenCondition(tok, cond.name)}
                                          title={cond.automatedSummary || cond.description}
                                          className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                                            active
                                              ? 'bg-amber-500/20 border-amber-500/70 text-amber-200 font-medium'
                                              : 'bg-[#131A26] border-slate-800/80 text-slate-500 hover:text-slate-300'
                                          }`}
                                        >
                                          {cond.name}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}

                                {linkedMonster && isMonsterExpanded && (
                                  <div className="p-2 rounded-lg bg-[#131A26] border border-slate-800 space-y-1.5 text-[11px]">
                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-slate-400 font-mono tabular-nums">
                                      <span>КЗ {linkedMonster.ac}</span>
                                      <span>Скор. {linkedMonster.speed} фт.</span>
                                      <span>Опыт {linkedMonster.xpReward} XP</span>
                                    </div>
                                    {(monsterSkillLabels.length > 0 ||
                                      linkedMonster.resistances ||
                                      linkedMonster.immunities ||
                                      monsterVisionLabels.length > 0 ||
                                      linkedMonster.senses) && (
                                      <div className="space-y-0.5 pt-1 border-t border-slate-800/80 text-slate-300">
                                        {monsterSkillLabels.length > 0 && (
                                          <div>
                                            <span className="text-slate-500">Навыки: </span>
                                            <span className="font-mono tabular-nums">
                                              {monsterSkillLabels.join(', ')}
                                            </span>
                                          </div>
                                        )}
                                        {linkedMonster.resistances && (
                                          <div>
                                            <span className="text-slate-500">Сопротивления: </span>
                                            <span>{linkedMonster.resistances}</span>
                                          </div>
                                        )}
                                        {linkedMonster.immunities && (
                                          <div>
                                            <span className="text-slate-500">Иммунитеты: </span>
                                            <span>{linkedMonster.immunities}</span>
                                          </div>
                                        )}
                                        {monsterVisionLabels.length > 0 && (
                                          <div>
                                            <span className="text-slate-500">Зрение: </span>
                                            <span className="text-sky-300 font-medium">
                                              {monsterVisionLabels.join(', ')}
                                            </span>
                                          </div>
                                        )}
                                        {linkedMonster.senses && (
                                          <div>
                                            <span className="text-slate-500">Чувства: </span>
                                            <span>{linkedMonster.senses}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {monsterTraits.length > 0 && (
                                      <div className="space-y-1 pt-1 border-t border-slate-800/80">
                                        <div className="text-[10px] font-semibold text-slate-500">
                                          Особенности
                                        </div>
                                        {monsterTraits.map((trt) => (
                                          <div key={trt.id} className="text-slate-300 leading-snug">
                                            <span className="font-semibold text-sky-300">
                                              {trt.name}.{' '}
                                            </span>
                                            <span>{trt.description}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {linkedMonster.actions.length > 0 && (
                                      <div className="space-y-1 pt-1 border-t border-slate-800/80">
                                        <div className="text-[10px] font-semibold text-slate-500">
                                          Действия
                                        </div>
                                        {linkedMonster.actions.map((act) => {
                                          const reachStr = formatWeaponReachRange(act.attackType, act);
                                          return (
                                            <div key={act.id} className="text-slate-300 leading-snug">
                                              <span className="font-semibold text-amber-300">
                                                {act.name}.{' '}
                                              </span>
                                              {reachStr && (
                                                <span className="inline-block mr-1 px-1 rounded bg-rose-500/15 border border-rose-500/30 text-[10px] font-mono text-rose-300">
                                                  {reachStr}
                                                </span>
                                              )}
                                              <span>{act.description}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Reset Session */}
                <div className="pt-3 border-t border-slate-800">
                  {!confirmReset ? (
                    <button
                      type="button"
                      onClick={() => setConfirmReset(true)}
                      className="w-full py-2 rounded-lg bg-[#0B0F17] hover:bg-slate-800 border border-slate-800 text-xs text-slate-400 hover:text-red-300 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Сбросить стол к стартовому состоянию</span>
                    </button>
                  ) : (
                    <div className="p-3 rounded-xl bg-red-950/30 border border-red-900/60 space-y-2">
                      <p className="text-xs text-red-200">
                        Вернуть стартовую карту, героев, справочники и инвентарь?
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            send({ type: 'dm:resetSession' });
                            setConfirmReset(false);
                          }}
                          className="flex-1 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                        >
                          Да, сбросить
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmReset(false)}
                          className="flex-1 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Live DM Character Creation Modal */}
      {activeCreationRequest && (
        <CharacterCreationModal
          request={activeCreationRequest}
          catalogs={catalogs}
          onUpdateDraft={(patch) =>
            send({
              type: 'dm:updateCreationDraft',
              requestId: activeCreationRequest.id,
              patch,
            })
          }
          onFinalize={() => {
            send({
              type: 'dm:finalizeCreationRequest',
              requestId: activeCreationRequest.id,
            });
            setActiveCreationRequestId(null);
            setActiveTab('players');
          }}
          onReject={() => {
            send({
              type: 'dm:rejectCreationRequest',
              requestId: activeCreationRequest.id,
            });
            setActiveCreationRequestId(null);
          }}
          onMinimize={() => setActiveCreationRequestId(null)}
        />
      )}

      {/* BLOCKING INITIATIVE ROLL MODAL (Interrupts DM & TV when entering combat on a tactical map) */}
      {dmState.scene.initiativeSession?.active && (() => {
        const session = dmState.scene.initiativeSession;
        const entries = session.entries;
        const filledCount = entries.filter((e) => e.total !== null).length;
        const allFilled = entries.length > 0 && filledCount === entries.length;
        const hasMonsters = entries.some((e) => e.kind !== 'player');
        const totalCounts = new Map<number, number>();
        for (const e of entries) {
          if (e.total !== null) {
            totalCounts.set(e.total, (totalCounts.get(e.total) ?? 0) + 1);
          }
        }

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-[#131A26] border border-amber-500/50 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-5 py-4 border-b border-slate-800 bg-[#0D1320] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0">
                    <Dices className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-100">
                      Бросок инициативы — Начало боя
                    </h2>
                    <p className="text-xs text-slate-400">
                      Введите результат 1к20 (бонус прибавится сам) или итоговое число · Экран ТВ обновляется сразу
                    </p>
                  </div>
                </div>
                <span className="font-mono tabular-nums text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#0B0F17] border border-slate-700 text-amber-300 shrink-0">
                  {filledCount} / {entries.length}
                </span>
              </div>

              {hasMonsters && (
                <div className="px-5 py-2.5 border-b border-slate-800/80 bg-[#0B0F17]/70 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-400">
                    Бросить 1к20 + мод. ЛОВ автоматически за всех монстров и НИП:
                  </span>
                  <button
                    type="button"
                    onClick={() => send({ type: 'dm:autoRollMonstersInitiative' })}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-amber-500/45 text-xs font-semibold text-amber-300 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Dices className="w-3.5 h-3.5" />
                    <span>Бросить за монстров</span>
                  </button>
                </div>
              )}

              <div className="p-4 sm:p-5 overflow-y-auto space-y-2">
                {entries.map((entry) => {
                  const isTied = entry.total !== null && (totalCounts.get(entry.total) ?? 0) > 1;
                  const tokObj = dmState.tokens.find((t) => t.id === entry.tokenId);
                  const plObj = entry.playerId
                    ? dmState.players.find((p) => p.id === entry.playerId)
                    : null;
                  const entryCondEffects = getActiveConditionEffects(
                    plObj ? plObj.conditions : tokObj?.conditions ?? [],
                    plObj?.exhaustionLevel ?? 0
                  );

                  return (
                    <div
                      key={entry.tokenId}
                      className={`p-3 rounded-xl border flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 transition-colors ${
                        isTied
                          ? 'bg-amber-950/20 border-amber-500/50'
                          : entry.total !== null
                            ? 'bg-[#0B0F17] border-emerald-500/30'
                            : 'bg-[#0B0F17] border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: entry.color }}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5 flex-wrap">
                            <span className="truncate">{entry.label}</span>
                            <span className="text-[10px] font-normal text-slate-400">
                              {entry.kind === 'player'
                                ? 'Герой'
                                : entry.kind === 'enemy'
                                  ? 'Монстр'
                                  : 'НИП'}
                            </span>
                            {isTied && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/60 text-[10px] font-mono text-amber-300">
                                Ничья
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            Бонус: {entry.bonusBreakdown}
                            {entryCondEffects.initiativeAdvantage && (
                              <span className="ml-1.5 text-emerald-300 font-sans">
                                · Преимущество (Невидимый)
                              </span>
                            )}
                            {entryCondEffects.initiativeDisadvantage && (
                              <span className="ml-1.5 text-rose-300 font-sans">
                                · Помеха (Недееспособный)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const roll = Math.floor(Math.random() * 20) + 1;
                            send({
                              type: 'dm:setInitiativeEntry',
                              tokenId: entry.tokenId,
                              roll,
                              total: roll + entry.initiativeBonus,
                            });
                          }}
                          className="px-2 py-1.5 rounded-lg bg-[#131A26] hover:bg-slate-800 border border-slate-700 text-xs text-amber-300 flex items-center gap-1 transition-colors"
                          title="Бросить 1к20"
                        >
                          <Dices className="w-3.5 h-3.5" />
                          <span className="font-mono text-[11px]">1к20</span>
                        </button>

                        <label className="flex flex-col items-center">
                          <span className="text-[9px] text-slate-500 mb-0.5">Кубик</span>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            placeholder="1-20"
                            value={entry.roll ?? ''}
                            onChange={(e) => {
                              const raw = e.target.value.trim();
                              if (raw === '') {
                                send({
                                  type: 'dm:setInitiativeEntry',
                                  tokenId: entry.tokenId,
                                  roll: null,
                                  total: null,
                                });
                                return;
                              }
                              const roll = Number(raw);
                              if (!Number.isFinite(roll)) return;
                              send({
                                type: 'dm:setInitiativeEntry',
                                tokenId: entry.tokenId,
                                roll,
                                total: roll + entry.initiativeBonus,
                              });
                            }}
                            className="w-14 px-2 py-1 rounded-lg bg-[#131A26] border border-slate-700 font-mono tabular-nums text-xs text-slate-200 text-center"
                          />
                        </label>

                        <span className="text-slate-500 font-mono text-xs pt-3">=</span>

                        <label className="flex flex-col items-center">
                          <span className="text-[9px] text-amber-400 mb-0.5">Итог</span>
                          <input
                            type="number"
                            placeholder="—"
                            value={entry.total ?? ''}
                            onChange={(e) => {
                              const raw = e.target.value.trim();
                              if (raw === '') {
                                send({
                                  type: 'dm:setInitiativeEntry',
                                  tokenId: entry.tokenId,
                                  roll: null,
                                  total: null,
                                });
                                return;
                              }
                              const total = Number(raw);
                              if (!Number.isFinite(total)) return;
                              send({
                                type: 'dm:setInitiativeEntry',
                                tokenId: entry.tokenId,
                                roll: null,
                                total,
                              });
                            }}
                            className="w-16 px-2 py-1 rounded-lg bg-[#131A26] border border-amber-500/50 font-mono tabular-nums text-sm font-bold text-amber-300 text-center"
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-5 py-3.5 border-t border-slate-800 bg-[#0D1320] flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => send({ type: 'dm:cancelInitiativeRoll' })}
                  className="px-3.5 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-xs text-slate-300 transition-colors"
                >
                  Пропустить
                </button>
                <button
                  type="button"
                  disabled={!allFilled}
                  onClick={() => send({ type: 'dm:completeInitiativeRoll' })}
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-xs font-bold flex items-center gap-2 transition-colors"
                >
                  <Swords className="w-4 h-4" />
                  <span>
                    {allFilled
                      ? 'Начать бой'
                      : `Заполните все поля (${filledCount}/${entries.length})`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MONSTER 0-HP CHOICE MODAL (Strictly for Monsters kind === 'enemy', NEVER for Heroes) */}
      {(() => {
        const pendingMonster = dmState.tokens.find(
          (t) => t.kind === 'enemy' && t.pendingZeroHpChoice
        );
        if (!pendingMonster) return null;

        return (
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-[#131A26] border border-rose-500/50 shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 bg-[#0D1320] flex items-center gap-3">
                <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-rose-500/70 bg-[#0B0F17] flex items-center justify-center shrink-0">
                  {pendingMonster.portraitUrl ? (
                    <img
                      src={pendingMonster.portraitUrl}
                      alt={pendingMonster.label}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <Skull className="w-5 h-5 text-rose-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-400">
                    0 хитов у монстра
                  </div>
                  <h3 className="text-base font-bold text-slate-100 truncate">
                    {pendingMonster.label}
                  </h3>
                </div>
              </div>

              <div className="p-5 space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Хиты этого монстра опустились до 0. Выберите его судьбу — отображение на ТВ и тактической карте обновится сразу:
                </p>

                <button
                  type="button"
                  onClick={() =>
                    send({
                      type: 'dm:resolveMonsterZeroHp',
                      tokenId: pendingMonster.id,
                      outcome: 'dead',
                    })
                  }
                  className="w-full p-3.5 rounded-xl bg-red-950/35 hover:bg-red-950/55 border border-red-500/50 text-left flex items-start gap-3 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-red-500/15 border border-red-500/40 flex items-center justify-center shrink-0 mt-0.5">
                    <Skull className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-red-200">Монстр умер</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      Портрет заменится на иконку черепа, карточка станет серой, а ход будет автоматически пропускаться.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    send({
                      type: 'dm:resolveMonsterZeroHp',
                      tokenId: pendingMonster.id,
                      outcome: 'unconscious',
                    })
                  }
                  className="w-full p-3.5 rounded-xl bg-amber-950/25 hover:bg-amber-950/45 border border-amber-500/50 text-left flex items-start gap-3 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-amber-200">Монстр без сознания</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      Получит статус «Бессознательный» и вращающиеся звёздочки над головой. Не пропускается в очереди ходов.
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
