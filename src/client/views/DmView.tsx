import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  Compass,
  Crosshair,
  Eye,
  EyeOff,
  Grid3X3,
  ImagePlus,
  Map as MapIcon,
  MapPin,
  Minus,
  Moon,
  Play,
  Plus,
  RotateCcw,
  Send,
  Shield,
  Skull,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Sunset,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  computeEffectiveVisionRanges,
  computePlayerAcDetails,
  formatEntityVisions,
  formatModifier,
  formatWeaponReachRange,
  getAbilityModifier,
  getArmorCategoryLabel,
  getMapLightingDescription,
  getNextLevelThreshold,
  getProficiencyBonus,
  getWeaponCategoryLabel,
  getWeaponRangeLabel,
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
type PlayerSubTab = 'combat' | 'sheet' | 'skills';

const PRESET_CONDITIONS = ['Отравлен', 'Оглушен', 'Сбит с ног', 'Невидим', 'Сосредоточен'];
const PRESET_COLORS = ['#F59E0B', '#10B981', '#38BDF8', '#A855F7', '#EC4899', '#EF4444'];

export function DmView({ onNavigate }: DmViewProps) {
  const { status, dmState, send } = useGameSocket({ role: 'dm' });
  const [activeTab, setActiveTab] = useState<DmTab>('players');
  const [playerSubTab, setPlayerSubTab] = useState<PlayerSubTab>('combat');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [activeCreationRequestId, setActiveCreationRequestId] = useState<string | null>(null);
  const [uploadingMap, setUploadingMap] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
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
  const [itemDesc, setItemDesc] = useState('');
  const [itemCatalogId, setItemCatalogId] = useState('');
  const [itemWeaponCat, setItemWeaponCat] = useState<WeaponCategory>('simple');
  const [itemWeaponRange, setItemWeaponRange] = useState<WeaponRangeType>('melee');
  const [itemArmorCat, setItemArmorCat] = useState<ArmorCategory>('light');

  // Local Drafts for Name, Private Note, Location Note, Senses, Campaign Title & Hotspots
  const [nameDraft, setNameDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [locationNoteDraft, setLocationNoteDraft] = useState('');
  const [sensesDraft, setSensesDraft] = useState('');
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
    }
  }, [
    selectedPlayer?.id,
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

  const handleNextTurn = () => {
    if (activeLocation?.kind === 'city') return;
    const combatTokens = dmState.tokens.filter((t) => t.kind !== 'object');
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

    send({
      type: 'dm:addInventoryItem',
      playerId: selectedPlayer.id,
      item: {
        name: itemName.trim(),
        category: itemCategory,
        quantity: Math.max(1, itemQty),
        description: itemDesc.trim(),
        equipped: false,
        catalogItemId: selectedWeapon?.id ?? selectedArmor?.id,
        weaponCategory:
          itemCategory === 'weapon' ? (selectedWeapon?.category ?? itemWeaponCat) : undefined,
        weaponRangeType:
          itemCategory === 'weapon' ? (selectedWeapon?.rangeType ?? itemWeaponRange) : undefined,
        reachFt: itemCategory === 'weapon' ? selectedWeapon?.reachFt : undefined,
        rangeNormalFt: itemCategory === 'weapon' ? selectedWeapon?.rangeNormalFt : undefined,
        rangeMaxFt: itemCategory === 'weapon' ? selectedWeapon?.rangeMaxFt : undefined,
        armorCategory:
          itemCategory === 'armor' ? (selectedArmor?.category ?? itemArmorCat) : undefined,
        damage: selectedWeapon?.damage,
        properties: selectedWeapon?.properties,
        mastery: selectedWeapon?.mastery,
        armorClass: selectedArmor?.armorClass,
        acBase: selectedArmor?.acBase,
        acAbilityId: selectedArmor?.acAbilityId,
        acMaxBonus: selectedArmor?.acMaxBonus,
        strengthReq: selectedArmor?.strengthReq,
        stealth: selectedArmor?.stealth,
        weight: selectedWeapon?.weight ?? selectedArmor?.weight,
        price: selectedWeapon?.price ?? selectedArmor?.price,
      },
    });
    setItemName('');
    setItemQty(1);
    setItemDesc('');
    setItemCatalogId('');
  };

  const handleToggleCondition = (cond: string) => {
    if (!selectedPlayer) return;
    const exists = selectedPlayer.conditions.includes(cond);
    const next = exists
      ? selectedPlayer.conditions.filter((c) => c !== cond)
      : [...selectedPlayer.conditions, cond];
    send({
      type: 'dm:updateStats',
      playerId: selectedPlayer.id,
      conditions: next,
    });
  };

  const handleToggleSkill = (skillId: string) => {
    if (!selectedPlayer) return;
    const exists = selectedPlayer.proficientSkillIds.includes(skillId);
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
    const currentExp = selectedPlayer.expertiseSkillIds ?? [];
    const hasExp = currentExp.includes(skillId);
    if (hasExp) {
      send({
        type: 'dm:updateStats',
        playerId: selectedPlayer.id,
        expertiseSkillIds: currentExp.filter((id) => id !== skillId),
      });
    } else {
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
  const profBonus = selectedPlayer ? getProficiencyBonus(selectedPlayer.level) : 2;
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

        <div className="flex items-center gap-2.5 shrink-0">
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
            <button
              type="button"
              onClick={handleNextTurn}
              className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <span>След. ход</span>
              <ChevronRight className="w-4 h-4" />
            </button>
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
              <button
                type="button"
                onClick={() => send({ type: 'dm:startGame' })}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 shadow-md"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Начать игру</span>
              </button>
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
              {/* Map Lighting Selector (all map types) */}
              <div className="inline-flex items-center rounded border border-slate-800 bg-[#131A26] p-0.5">
                {(
                  [
                    { id: 'bright', label: 'Яркий', Icon: Sun, activeClass: 'bg-amber-500/20 text-amber-300' },
                    { id: 'dim', label: 'Полумрак', Icon: Sunset, activeClass: 'bg-sky-500/20 text-sky-300' },
                    { id: 'darkness', label: 'Темнота', Icon: Moon, activeClass: 'bg-indigo-500/30 text-indigo-200' },
                  ] as Array<{ id: MapLighting; label: string; Icon: React.ComponentType<{ className?: string }>; activeClass: string }>
                ).map(({ id, label, Icon, activeClass }) => {
                  const isActive = (dmState.map.lighting ?? 'bright') === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      title={getMapLightingDescription(id)}
                      onClick={() =>
                        send({
                          type: 'dm:updateMap',
                          locationId: dmState.activeLocationId,
                          patch: { lighting: id },
                        })
                      }
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

            const effectiveVision = turnToken
              ? computeEffectiveVisionRanges(
                  visionEntries,
                  catalogs.visions,
                  dmState.map.lighting ?? 'bright'
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
                          {selectedPlayer.role} · Ур. {selectedPlayer.level} ({selectedPlayer.xp} XP)
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

                    {/* Player Sub-Tabs */}
                    <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#0B0F17] border border-slate-800 text-[11px] font-medium">
                      <button
                        type="button"
                        onClick={() => setPlayerSubTab('combat')}
                        className={`py-1.5 px-2 rounded-md transition-colors whitespace-nowrap ${
                          playerSubTab === 'combat'
                            ? 'bg-[#131A26] text-amber-400'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Статы и вещи
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlayerSubTab('sheet')}
                        className={`py-1.5 px-2 rounded-md transition-colors whitespace-nowrap ${
                          playerSubTab === 'sheet'
                            ? 'bg-[#131A26] text-amber-400'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Анкета и XP
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlayerSubTab('skills')}
                        className={`py-1.5 px-2 rounded-md transition-colors whitespace-nowrap ${
                          playerSubTab === 'skills'
                            ? 'bg-[#131A26] text-amber-400'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Навыки ({selectedPlayer.proficientSkillIds.length})
                      </button>
                    </div>

                    {/* SUB-TAB 1: COMBAT STATS, LOCATION, CONDITIONS, PRIVATE NOTE & INVENTORY */}
                    {playerSubTab === 'combat' && (
                      <div className="space-y-4">
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
                                Перенести на текущую карту
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

                        <div className="p-3 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Здоровье</span>
                            <span className="font-mono tabular-nums text-sm font-bold text-slate-100">
                              {selectedPlayer.hp} / {selectedPlayer.maxHp}
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
                            <div
                              className="space-y-1"
                              title={computePlayerAcDetails(selectedPlayer, catalogs).breakdown}
                            >
                              <span className="text-[10px] text-slate-400">КЗ (авто)</span>
                              <div className="w-full px-1.5 py-1 rounded bg-[#131A26]/80 border border-slate-800/90 font-mono tabular-nums text-sky-300 font-semibold text-center">
                                {selectedPlayer.ac}
                              </div>
                            </div>
                            <label className="space-y-1">
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
                            <label className="space-y-1">
                              <span className="text-[10px] text-slate-400">Золото</span>
                              <input
                                type="number"
                                min={0}
                                value={selectedPlayer.gold}
                                onChange={(e) =>
                                  send({
                                    type: 'dm:updateStats',
                                    playerId: selectedPlayer.id,
                                    gold: Number(e.target.value) || 0,
                                  })
                                }
                                className="w-full px-1.5 py-1 rounded bg-[#131A26] border border-slate-800 font-mono text-amber-400"
                              />
                            </label>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            КЗ: {computePlayerAcDetails(selectedPlayer, catalogs).breakdown}
                          </div>
                        </div>

                        {/* Conditions */}
                        <div className="space-y-1.5">
                          <span className="text-xs text-slate-400">Состояния (видны на ТВ)</span>
                          <div className="flex flex-wrap gap-1.5">
                            {PRESET_CONDITIONS.map((cond) => {
                              const active = selectedPlayer.conditions.includes(cond);
                              return (
                                <button
                                  key={cond}
                                  type="button"
                                  onClick={() => handleToggleCondition(cond)}
                                  className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                                    active
                                      ? 'bg-amber-500/20 border-amber-500/70 text-amber-300 font-medium'
                                      : 'bg-[#0B0F17] border-slate-800 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  {cond}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Private Note */}
                        <div className="space-y-1.5">
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

                        {/* Private Inventory Editor */}
                        <div className="space-y-2.5 pt-2 border-t border-slate-800">
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
                                <option value="gear">Снаряжение</option>
                                <option value="weapon">Оружие</option>
                                <option value="armor">Доспех</option>
                                <option value="potion">Зелье</option>
                                <option value="quest">Особое</option>
                              </select>

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
                                      setItemDesc(`${found.damage} · ${found.properties}`);
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
                                className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs text-slate-100"
                                required
                              />
                              <input
                                type="number"
                                min={1}
                                value={itemQty}
                                onChange={(e) => setItemQty(Number(e.target.value) || 1)}
                                className="w-14 px-2 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-xs font-mono text-slate-100 text-center"
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
                              selectedPlayer.inventory.map((item) => (
                                <div
                                  key={item.id}
                                  className="px-3 py-2 flex items-center justify-between gap-2"
                                >
                                  <div className="min-w-0">
                                    <div className="text-xs font-medium text-slate-100 truncate">
                                      {item.name}
                                      {item.equipped && (
                                        <span className="ml-1.5 text-[10px] text-amber-400 font-normal">
                                          · надето
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-400 truncate">
                                      {item.weaponCategory
                                        ? (() => {
                                            const rangeInfo = resolveWeaponReachRange(item, catalogs);
                                            const rangeText =
                                              rangeInfo.rangeType === 'ranged' && rangeInfo.maxFt > rangeInfo.normalFt
                                                ? `${rangeInfo.normalFt}/${rangeInfo.maxFt} фт.`
                                                : `${rangeInfo.normalFt} фт.`;
                                            return `${getWeaponCategoryLabel(item.weaponCategory)} · ${getWeaponRangeLabel(rangeInfo.rangeType)} (${rangeText})${item.damage ? ` · ${item.damage}` : ''}`;
                                          })()
                                        : item.armorCategory
                                          ? `${getArmorCategoryLabel(item.armorCategory)}${item.armorClass ? ` · КЗ ${item.armorClass}` : ''}`
                                          : item.description || ''}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
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
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SUB-TAB 2: CHARACTER IDENTITY, XP/LEVEL & ABILITIES */}
                    {playerSubTab === 'sheet' && (
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
                        </div>

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
                              Настроить справочник →
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
                                          [ab.id]: Math.max(1, Math.min(30, Number(e.target.value) || 10)),
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
                      </div>
                    )}

                    {/* SUB-TAB 3: SKILLS & LEARNED PROFICIENCIES */}
                    {playerSubTab === 'skills' && (
                      <div className="space-y-5">
                        {/* Proficiencies (Weapon / Armor) */}
                        <div className="space-y-2">
                          <div className="flex items-baseline justify-between">
                            <h3 className="text-xs font-semibold text-slate-200">
                              Изученные владения ({selectedPlayer.proficiencyIds.length})
                            </h3>
                            <span className="text-[11px] text-slate-400">
                              Бонус мастерства +{profBonus}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-1.5">
                            {catalogs.proficiencies.map((pr) => {
                              const active = selectedPlayer.proficiencyIds.includes(pr.id);
                              return (
                                <button
                                  key={pr.id}
                                  type="button"
                                  onClick={() => handleToggleProficiency(pr.id)}
                                  className={`px-3 py-2 rounded-lg border text-left flex items-center justify-between gap-2 text-xs transition-colors ${
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

                        {/* Senses & Vision for Hero */}
                        <div className="space-y-2.5 pt-2 border-t border-slate-800">
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

                        {/* Skills & Expertise */}
                        <div className="space-y-2 pt-2 border-t border-slate-800">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-xs font-semibold text-slate-200">
                              Навыки (владение и экспертиза ×2)
                            </h3>
                            <span className="text-[11px] font-mono text-slate-400">
                              БМ +{profBonus} · ×2 = +{profBonus * 2}
                            </span>
                          </div>
                          <div className="divide-y divide-slate-800/80 rounded-xl bg-[#0B0F17] border border-slate-800 overflow-hidden">
                            {catalogs.skills.map((sk) => {
                              const isExp = (selectedPlayer.expertiseSkillIds ?? []).includes(sk.id);
                              const active =
                                isExp || selectedPlayer.proficientSkillIds.includes(sk.id);
                              const ab = catalogs.abilities.find((a) => a.id === sk.abilityId);
                              const score = selectedPlayer.abilities[sk.abilityId] ?? 10;
                              const bonusAdd = isExp ? profBonus * 2 : active ? profBonus : 0;
                              const totalMod =
                                getAbilityModifier(score, catalogs.abilityModifiers) + bonusAdd;

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
                                            : 'text-slate-400'
                                      }`}
                                    >
                                      {formatModifier(totalMod)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
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
                    {[...dmState.tokens]
                      .sort((a, b) => {
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
                      })
                      .map((tok) => {
                      const isTurn = dmState.scene.activeTurnTokenId === tok.id;
                      const linkedPlayer = tok.playerId
                        ? dmState.players.find((p) => p.id === tok.playerId)
                        : null;
                      const linkedMonster = tok.monsterId
                        ? catalogs.monsters.find((m) => m.id === tok.monsterId)
                        : null;
                      const tokInit = linkedPlayer?.initiative ?? tok.initiative ?? 0;
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
                              const isExp = (linkedMonster.expertiseSkillIds ?? []).includes(sk.id);
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

                      return (
                        <div
                          key={tok.id}
                          className={`px-3 py-2.5 space-y-2 text-xs transition-colors ${
                            isTurn ? 'bg-amber-500/10 border-l-2 border-l-amber-400' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: tok.color }}
                              />
                              <div className="min-w-0">
                                <div className="font-medium text-slate-100 truncate flex items-center gap-1.5">
                                  <span className="truncate">{tok.label}</span>
                                  {linkedMonster && (
                                    <Skull className="w-3 h-3 text-red-400 shrink-0" />
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
                                  onClick={() =>
                                    send({
                                      type: 'dm:setScene',
                                      patch: { activeTurnTokenId: isTurn ? null : tok.id },
                                    })
                                  }
                                  className={`px-2 py-1 rounded border text-[11px] transition-colors ${
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

                          {/* Monster / Enemy HP tracker & Stat-block actions (DM-only, hidden on TV) */}
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
                    })}
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
    </div>
  );
}
