export type ClientRole = 'tv' | 'player' | 'dm';
export type ItemCategory = 'weapon' | 'armor' | 'potion' | 'quest' | 'gear';
export type WeaponCategory = 'simple' | 'martial';
export type WeaponRangeType = 'melee' | 'ranged';
export type ArmorCategory = 'light' | 'medium' | 'heavy' | 'shield';
export type EventTone = 'neutral' | 'danger' | 'reward';
export type SceneMode = 'exploration' | 'combat' | 'rest';
export type TokenKind = 'player' | 'enemy' | 'npc' | 'object';
export type ProficiencyCategory = 'weapon' | 'armor' | 'other';
export type CreationRequestStatus = 'queued' | 'in_progress';
export type LocationKind = 'city' | 'tactical';
export type HotspotCategory =
  | 'tavern'
  | 'board'
  | 'armory'
  | 'barracks'
  | 'inn'
  | 'dungeon'
  | 'portal'
  | 'other';
export type TvPhase = 'title_splash' | 'traveling' | 'live';

export interface UserAccount {
  id: string;
  name: string;
  createdAt: number;
}

export interface CharacterDraft {
  name: string;
  classId: string;
  backgroundId: string;
  speciesId: string;
  color: string;
  maxHp: number | null;
  ac: number | null;
  xp: number;
  gold: number;
  abilities: Record<string, number | null>;
  proficientSkillIds: string[];
  proficiencyIds: string[];
  privateNote: string;
}

export interface CharacterCreationRequest {
  id: string;
  accountId: string;
  accountName: string;
  status: CreationRequestStatus;
  createdAt: number;
  draft: CharacterDraft;
}

export interface AbilityRef {
  id: string;
  name: string;
  shortName: string;
  description: string;
}

export interface AbilityModifierRef {
  id: string;
  minScore: number;
  maxScore: number;
  modifier: number;
}

export interface ClassRef {
  id: string;
  name: string;
  description: string;
}

export interface BackgroundRef {
  id: string;
  name: string;
  description: string;
}

export interface SpeciesRef {
  id: string;
  name: string;
  description: string;
}

export interface LevelThresholdRef {
  id: string;
  level: number;
  minXp: number;
}

export interface SkillRef {
  id: string;
  name: string;
  abilityId: string;
  usageExample: string;
}

export interface ProficiencyRef {
  id: string;
  name: string;
  category: ProficiencyCategory;
  description: string;
}

export interface WeaponRef {
  id: string;
  category: WeaponCategory;
  rangeType: WeaponRangeType;
  name: string;
  damage: string;
  properties: string;
  mastery: string;
  weight: string;
  price: string;
}

export interface ArmorRef {
  id: string;
  category: ArmorCategory;
  name: string;
  /** Structured AC formula fields */
  acBase: number;
  acAbilityId: string | null;
  acMaxBonus: number | null;
  /** Human-readable formatted formula string */
  armorClass: string;
  strengthReq: string;
  stealth: string;
  weight: string;
  price: string;
}

export interface MonsterActionRef {
  id: string;
  name: string;
  description: string;
}

export interface MonsterRef {
  id: string;
  name: string;
  ac: number;
  maxHp: number;
  hpFormula?: string;
  initiative: number;
  speed: number;
  abilities: Record<string, number>;
  proficientSkillIds: string[];
  xpReward: number;
  actions: MonsterActionRef[];
  portraitUrl?: string | null;
}

export interface GameCatalogs {
  abilities: AbilityRef[];
  abilityModifiers: AbilityModifierRef[];
  classes: ClassRef[];
  backgrounds: BackgroundRef[];
  species: SpeciesRef[];
  levels: LevelThresholdRef[];
  skills: SkillRef[];
  proficiencies: ProficiencyRef[];
  weapons: WeaponRef[];
  armors: ArmorRef[];
  monsters: MonsterRef[];
}

export type CatalogKey = keyof GameCatalogs;

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  category: ItemCategory;
  description: string;
  equipped: boolean;
  catalogItemId?: string;
  weaponCategory?: WeaponCategory;
  weaponRangeType?: WeaponRangeType;
  armorCategory?: ArmorCategory;
  damage?: string;
  properties?: string;
  mastery?: string;
  acBase?: number;
  acAbilityId?: string | null;
  acMaxBonus?: number | null;
  armorClass?: string;
  strengthReq?: string;
  stealth?: string;
  weight?: string;
  price?: string;
}

export interface LocationHotspot {
  id: string;
  label: string;
  category: HotspotCategory;
  /** Horizontal position in percent (0..100) */
  x: number;
  /** Vertical position in percent (0..100) */
  y: number;
  targetLocationId: string | null;
  description: string;
  visibleOnTv: boolean;
}

export interface MapConfig {
  imageUrl: string | null;
  cols: number;
  rows: number;
  showGrid: boolean;
  gridOpacity: number;
}

export interface MapToken {
  id: string;
  label: string;
  kind: TokenKind;
  playerId?: string;
  monsterId?: string;
  color: string;
  x: number;
  y: number;
  size: number;
  visibleOnTv: boolean;
  initiative?: number;
  hp?: number;
  maxHp?: number;
  ac?: number;
  portraitUrl?: string | null;
}

export interface GameLocation {
  id: string;
  name: string;
  kind: LocationKind;
  description: string;
  parentLocationId: string | null;
  /** Coordinates on the World Mind-Map canvas */
  graphX: number;
  graphY: number;
  map: MapConfig;
  hotspots: LocationHotspot[];
  /** Non-player tokens (enemies, NPCs, objects) persisted per location */
  tokens: MapToken[];
}

export interface TvDisplayState {
  phase: TvPhase;
  campaignTitle: string;
  campaignSubtitle: string;
  titleCrestUrl: string;
  travelBackdropUrl: string;
  fromLocationName?: string;
  toLocationId?: string;
  toLocationName?: string;
  toLocationKind?: LocationKind;
  travelMessage?: string;
  startedAt: number;
}

export interface PublicPlayerInfo {
  id: string;
  ownerAccountId?: string;
  name: string;
  role: string;
  classId: string;
  speciesId: string;
  backgroundId: string;
  xp: number;
  level: number;
  color: string;
  hp: number;
  maxHp: number;
  tempHp: number;
  ac: number;
  initiative: number;
  conditions: string[];
  isConnected: boolean;
  /** Persisted location & position of this hero */
  locationId: string;
  locationName: string;
  locationNote: string;
  posX: number;
  posY: number;
  portraitUrl?: string | null;
}

export interface PlayerCharacter extends PublicPlayerInfo {
  abilities: Record<string, number>;
  proficientSkillIds: string[];
  proficiencyIds: string[];
  inventory: InventoryItem[];
  gold: number;
  privateNote: string;
}

export interface ActiveBanner {
  id: string;
  title: string;
  description: string;
  tone: EventTone;
  timestamp: number;
}

export interface SceneState {
  locationName: string;
  mode: SceneMode;
  round: number;
  activeTurnTokenId: string | null;
  activeEvent: ActiveBanner | null;
}

export interface GameEventEntry {
  id: string;
  scope: 'public' | 'private';
  targetPlayerId?: string;
  title: string;
  message: string;
  timestamp: number;
  tone: EventTone;
}

export interface FullGameState {
  version: number;
  updatedAt: number;
  accounts: UserAccount[];
  creationRequests: CharacterCreationRequest[];
  catalogs: GameCatalogs;
  locations: GameLocation[];
  activeLocationId: string;
  tvDisplay: TvDisplayState;
  scene: SceneState;
  /** Synchronized mirror of the active location's map */
  map: MapConfig;
  /** Combined tokens (location NPCs/enemies + players currently in activeLocationId) */
  tokens: MapToken[];
  players: PlayerCharacter[];
  eventLog: GameEventEntry[];
}

export interface TvGameState {
  version: number;
  updatedAt: number;
  activeLocationId: string;
  locationKind: LocationKind;
  tvDisplay: TvDisplayState;
  scene: SceneState;
  map: MapConfig;
  hotspots: LocationHotspot[];
  tokens: MapToken[];
  players: PublicPlayerInfo[];
  eventLog: GameEventEntry[];
}

export interface PlayerGameState {
  version: number;
  updatedAt: number;
  activeLocationId: string;
  locationKind: LocationKind;
  tvDisplay: TvDisplayState;
  catalogs: GameCatalogs;
  accounts: UserAccount[];
  currentAccount: UserAccount | null;
  myCharacters: PublicPlayerInfo[];
  myCreationRequest: CharacterCreationRequest | null;
  queuePosition: number | null;
  scene: SceneState;
  map: MapConfig;
  tokens: MapToken[];
  publicPlayers: PublicPlayerInfo[];
  self: PlayerCharacter | null;
  availablePlayers: PublicPlayerInfo[];
  eventLog: GameEventEntry[];
}

export type ClientMessage =
  | { type: 'join'; role: ClientRole; accountId?: string; playerId?: string }
  | { type: 'account:register'; name: string }
  | { type: 'player:requestCharacterCreation'; accountId: string }
  | { type: 'player:cancelCharacterCreation'; accountId: string; requestId: string }
  | { type: 'dm:startCreationRequest'; requestId: string }
  | { type: 'dm:updateCreationDraft'; requestId: string; patch: Partial<CharacterDraft> }
  | { type: 'dm:finalizeCreationRequest'; requestId: string }
  | { type: 'dm:rejectCreationRequest'; requestId: string }
  | { type: 'dm:deleteAccount'; accountId: string }
  | { type: 'dm:startGame' }
  | { type: 'dm:showTitleSplash' }
  | { type: 'dm:updateCampaignTitle'; campaignTitle: string; campaignSubtitle?: string }
  | {
      type: 'dm:beginLocationTransition';
      targetLocationId: string;
      moveParty?: boolean;
      travelMessage?: string;
    }
  | { type: 'dm:confirmLocationReady' }
  | {
      type: 'dm:upsertLocation';
      location: {
        id?: string;
        name: string;
        kind: LocationKind;
        description?: string;
        parentLocationId?: string | null;
        graphX?: number;
        graphY?: number;
        map?: Partial<MapConfig>;
      };
    }
  | { type: 'dm:deleteLocation'; locationId: string }
  | { type: 'dm:moveLocationNode'; locationId: string; graphX: number; graphY: number }
  | {
      type: 'dm:upsertHotspot';
      locationId: string;
      hotspot: {
        id?: string;
        label: string;
        category: HotspotCategory;
        x: number;
        y: number;
        targetLocationId: string | null;
        description?: string;
        visibleOnTv?: boolean;
      };
    }
  | { type: 'dm:deleteHotspot'; locationId: string; hotspotId: string }
  | {
      type: 'dm:movePlayerToLocation';
      playerId: string;
      locationId: string;
      locationNote?: string;
    }
  | { type: 'dm:moveToken'; tokenId: string; x: number; y: number }
  | { type: 'dm:upsertToken'; token: MapToken }
  | { type: 'dm:deleteToken'; tokenId: string }
  | {
      type: 'dm:upsertPlayer';
      player: {
        id?: string;
        ownerAccountId?: string;
        name: string;
        classId?: string;
        backgroundId?: string;
        speciesId?: string;
        role?: string;
        color: string;
        maxHp: number;
        ac?: number;
        initiative?: number;
        xp?: number;
        abilities?: Record<string, number>;
        proficientSkillIds?: string[];
        proficiencyIds?: string[];
      };
    }
  | { type: 'dm:deletePlayer'; playerId: string }
  | {
      type: 'dm:updateStats';
      playerId: string;
      ownerAccountId?: string;
      name?: string;
      classId?: string;
      backgroundId?: string;
      speciesId?: string;
      color?: string;
      xp?: number;
      hp?: number;
      maxHp?: number;
      tempHp?: number;
      ac?: number;
      initiative?: number;
      gold?: number;
      conditions?: string[];
      privateNote?: string;
      locationId?: string;
      locationNote?: string;
      abilities?: Record<string, number>;
      proficientSkillIds?: string[];
      proficiencyIds?: string[];
    }
  | { type: 'dm:addInventoryItem'; playerId: string; item: Omit<InventoryItem, 'id'> }
  | { type: 'dm:updateInventoryItem'; playerId: string; itemId: string; patch: Partial<InventoryItem> }
  | { type: 'dm:removeInventoryItem'; playerId: string; itemId: string }
  | { type: 'dm:setScene'; patch: Partial<SceneState> }
  | {
      type: 'dm:triggerEvent';
      scope: 'public' | 'private';
      targetPlayerId?: string;
      title: string;
      message: string;
      tone: EventTone;
      showBannerOnTv?: boolean;
    }
  | { type: 'dm:clearBanner' }
  | { type: 'dm:updateMap'; locationId?: string; patch: Partial<MapConfig> }
  | { type: 'dm:upsertCatalogItem'; catalog: 'abilities'; item: AbilityRef }
  | { type: 'dm:upsertCatalogItem'; catalog: 'abilityModifiers'; item: AbilityModifierRef }
  | { type: 'dm:upsertCatalogItem'; catalog: 'classes'; item: ClassRef }
  | { type: 'dm:upsertCatalogItem'; catalog: 'backgrounds'; item: BackgroundRef }
  | { type: 'dm:upsertCatalogItem'; catalog: 'species'; item: SpeciesRef }
  | { type: 'dm:upsertCatalogItem'; catalog: 'levels'; item: LevelThresholdRef }
  | { type: 'dm:upsertCatalogItem'; catalog: 'skills'; item: SkillRef }
  | { type: 'dm:upsertCatalogItem'; catalog: 'proficiencies'; item: ProficiencyRef }
  | { type: 'dm:upsertCatalogItem'; catalog: 'weapons'; item: WeaponRef }
  | { type: 'dm:upsertCatalogItem'; catalog: 'armors'; item: ArmorRef }
  | { type: 'dm:upsertCatalogItem'; catalog: 'monsters'; item: MonsterRef }
  | { type: 'dm:deleteCatalogItem'; catalog: CatalogKey; itemId: string }
  | { type: 'dm:resetCatalogs' }
  | { type: 'dm:resetSession' }
  | { type: 'player:toggleEquip'; playerId: string; itemId: string }
  | { type: 'player:useConsumable'; playerId: string; itemId: string };

export type ServerMessage =
  | { type: 'tv:state'; payload: TvGameState }
  | { type: 'player:state'; payload: PlayerGameState }
  | { type: 'dm:state'; payload: FullGameState }
  | { type: 'account:registered'; account: UserAccount }
  | { type: 'error'; message: string };
