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
export type MapLighting = 'bright' | 'dim' | 'darkness';
export type VisionBehavior = 'normal' | 'darkvision' | 'blindsight' | 'truesight' | 'tremorsense';

export interface UserAccount {
  id: string;
  name: string;
  createdAt: number;
}

export interface CharacterDraft {
  name: string;
  classId: string;
  subclassId?: string;
  backgroundId: string;
  speciesId: string;
  color: string;
  maxHp: number | null;
  ac: number | null;
  xp: number;
  gold: number;
  abilities: Record<string, number | null>;
  backgroundAbilityBonuses?: Record<string, number>;
  proficientSkillIds: string[];
  expertiseSkillIds?: string[];
  proficiencyIds: string[];
  senses?: string;
  visions?: EntityVisionEntry[];
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

export interface FeatRef {
  id: string;
  name: string;
  description: string;
  automatedSummary?: string;
}

export interface ConditionRef {
  id: string;
  name: string;
  description: string;
  automationKey?: string;
  automatedSummary?: string;
}

export interface ClassResourceScaling {
  id: string;
  name: string;
  /** Values for levels 1..20 (index 0 = level 1, index 19 = level 20) */
  values: string[];
}

export interface ClassRef {
  id: string;
  name: string;
  description: string;
  /** Hit die sides (e.g. 6, 8, 10, 12) */
  hitDie?: number;
  /** Human-readable HP per level hint (e.g. "1к10 (или 6) + ваш модификатор Телосложения (суммарно минимум 1)") */
  hpPerLevelHint?: string;
  /** Proficiency bonus progression for levels 1..20 */
  proficiencyBonusByLevel?: number[];
  /** Scaling class table columns (e.g. Второе дыхание, Оружейное мастерство, Ярость) */
  classResources?: ClassResourceScaling[];
  /** Saving throw proficiencies (ability IDs, shown strictly to DM) */
  savingThrowAbilityIds?: string[];
  /** Number of class skills selectable at character creation */
  skillChoiceCount?: number;
  /** Allowed skill IDs for this class (ignored if anySkillAllowed is true) */
  allowedSkillIds?: string[];
  /** True when the class may choose from any skill (e.g. Bard) */
  anySkillAllowed?: boolean;
  /** Default weapon proficiency IDs linked to catalogs.proficiencies */
  weaponProficiencyIds?: string[];
  /** Optional extra weapon rule note (e.g. Monk Light martial / Rogue Finesse or Light martial) */
  weaponProficiencyNote?: string;
  /** Default armor training proficiency IDs linked to catalogs.proficiencies */
  armorProficiencyIds?: string[];
}

export interface SubclassRef {
  id: string;
  classId: string;
  name: string;
  description: string;
}

export interface ClassFeatureRef {
  id: string;
  classId: string;
  level: number;
  name: string;
  description: string;
  automatedSummary?: string;
}

export interface SubclassFeatureRef {
  id: string;
  classId: string;
  subclassId: string;
  level: number;
  name: string;
  description: string;
  automatedSummary?: string;
}

export interface BackgroundRef {
  id: string;
  name: string;
  description: string;
  /** Three eligible ability IDs for the 3-point (+2/+1 or +1/+1/+1) background bonus */
  abilityIds?: string[];
  /** Linked origin feat ID from catalogs.feats */
  featId?: string | null;
  /** Fixed skill IDs granted automatically by the background */
  skillIds?: string[];
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

export interface VisionRef {
  id: string;
  name: string;
  behavior: VisionBehavior;
  description: string;
}

export interface EntityVisionEntry {
  visionId: string;
  /** Distance in feet (5 ft = 1 tactical cell). Null/undefined = unlimited within lit area (e.g. normal vision). */
  rangeFt: number | null;
}

export interface WeaponPropertyRef {
  id: string;
  name: string;
  description: string;
}

export interface WeaponMasteryRef {
  id: string;
  name: string;
  description: string;
}

export type GearItemKind = 'ammunition' | 'container' | 'equipment';

export interface GearItemRef {
  id: string;
  name: string;
  kind: GearItemKind;
  price: string;
  weight: string;
  /** Pack quantity corresponding to the listed weight/price (e.g. 20 arrows weigh 1 lb) */
  packQuantity?: number;
  /** For ammunition: required container gear item ID (e.g. gear-quiver) */
  containerId?: string | null;
  /** For ammunition: compatible weapon IDs */
  compatibleWeaponIds?: string[];
  /** For container: max ammunition quantity held per 1 container */
  capacity?: number;
  /** For container: ammunition gear item ID stored inside */
  storedAmmoId?: string | null;
  description: string;
}

export interface WeaponRef {
  id: string;
  category: WeaponCategory;
  rangeType: WeaponRangeType;
  name: string;
  damage: string;
  /** Optional two-handed damage dice when weapon has the Versatile property (e.g. "1к8" or "1к10") */
  versatileDamage?: string;
  /** Melee reach in feet (e.g. 5 or 10) */
  reachFt?: number;
  /** Ranged normal distance in feet (e.g. 80 or 150) */
  rangeNormalFt?: number;
  /** Ranged maximum distance in feet (e.g. 320 or 600) */
  rangeMaxFt?: number;
  /** Thrown normal distance in feet for melee weapons with Thrown property (default 20) */
  thrownNormalFt?: number;
  /** Thrown max distance in feet for melee weapons with Thrown property (default 60) */
  thrownMaxFt?: number;
  /** Linked weapon property IDs from catalogs.weaponProperties */
  propertyIds?: string[];
  properties: string;
  /** Linked weapon mastery ID from catalogs.weaponMasteries */
  masteryId?: string | null;
  mastery: string;
  /** Linked ammunition item ID from catalogs.gearItems (for weapons with Ammunition property) */
  ammoItemId?: string | null;
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
  /** Optional attack reach/range for tactical map highlighting */
  attackType?: WeaponRangeType | null;
  reachFt?: number | null;
  rangeNormalFt?: number | null;
  rangeMaxFt?: number | null;
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
  expertiseSkillIds?: string[];
  immunities?: string;
  resistances?: string;
  senses?: string;
  visions?: EntityVisionEntry[];
  traits?: MonsterActionRef[];
  xpReward: number;
  actions: MonsterActionRef[];
  portraitUrl?: string | null;
}

export interface GameCatalogs {
  abilities: AbilityRef[];
  abilityModifiers: AbilityModifierRef[];
  classes: ClassRef[];
  subclasses: SubclassRef[];
  classFeatures: ClassFeatureRef[];
  subclassFeatures: SubclassFeatureRef[];
  backgrounds: BackgroundRef[];
  feats: FeatRef[];
  species: SpeciesRef[];
  levels: LevelThresholdRef[];
  skills: SkillRef[];
  proficiencies: ProficiencyRef[];
  visions: VisionRef[];
  conditions: ConditionRef[];
  weaponProperties: WeaponPropertyRef[];
  weaponMasteries: WeaponMasteryRef[];
  weapons: WeaponRef[];
  armors: ArmorRef[];
  gearItems: GearItemRef[];
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
  reachFt?: number;
  rangeNormalFt?: number;
  rangeMaxFt?: number;
  thrownNormalFt?: number;
  thrownMaxFt?: number;
  versatileDamage?: string;
  propertyIds?: string[];
  masteryId?: string | null;
  ammoItemId?: string | null;
  gearKind?: GearItemKind;
  packQuantity?: number;
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
  lighting?: MapLighting;
}

export type MonsterCombatStatus = 'alive' | 'unconscious' | 'dead';

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
  combatStatus?: MonsterCombatStatus;
  conditions?: string[];
  pendingZeroHpChoice?: boolean;
}

export interface GameLocation {
  id: string;
  name: string;
  kind: LocationKind;
  description: string;
  parentLocationId: string | null;
  /** Whether the in-game clock dynamically tints this map and drives its lighting */
  affectedByTimeOfDay?: boolean;
  /** Optional looping MP3 ambient track played on TV when this location opens */
  ambientAudioUrl?: string | null;
  ambientAudioName?: string | null;
  /** Coordinates on the World Mind-Map canvas */
  graphX: number;
  graphY: number;
  map: MapConfig;
  hotspots: LocationHotspot[];
  /** Non-player tokens (enemies, NPCs, objects) persisted per location */
  tokens: MapToken[];
}

export type DeathSaveStatus = 'none' | 'dying' | 'stabilized' | 'dead';

export interface DeathSavesState {
  successes: number;
  failures: number;
  status: DeathSaveStatus;
  /** Round number when the most recent turn death save was rolled */
  lastRollRound?: number;
}

export interface GameClockState {
  /** Total elapsed in-game minutes since Day 1 00:00 at anchorRealMs */
  anchorGameMinutes: number;
  /** Real-world epoch ms when anchorGameMinutes was captured */
  anchorRealMs: number;
  /** In-game minutes per 1 real minute (6 = 24 in-game hours per 4 real hours) */
  timeScale: number;
  paused: boolean;
}

export interface TvDisplayState {
  phase: TvPhase;
  campaignTitle: string;
  campaignSubtitle: string;
  titleCrestUrl: string;
  travelBackdropUrl: string;
  /** Optional looping MP3 track played on TV during the initial title splash screen */
  splashAudioUrl?: string | null;
  splashAudioName?: string | null;
  /** DM-controlled global mute switch for TV background audio */
  audioMuted?: boolean;
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
  subclassId?: string;
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
  speed?: number;
  exhaustionLevel?: number;
  deathSaves?: DeathSavesState;
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
  /** Last hero level acknowledged/processed by DM (used for level-up checklist reminders) */
  acknowledgedLevel?: number;
  abilities: Record<string, number>;
  proficientSkillIds: string[];
  expertiseSkillIds?: string[];
  proficiencyIds: string[];
  featIds?: string[];
  senses?: string;
  visions?: EntityVisionEntry[];
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

export interface InitiativeEntry {
  tokenId: string;
  kind: 'player' | 'enemy' | 'npc';
  label: string;
  color: string;
  portraitUrl?: string | null;
  dexMod: number;
  initiativeBonus: number;
  bonusBreakdown?: string;
  roll: number | null;
  total: number | null;
  playerId?: string;
}

export interface InitiativeRollSession {
  active: boolean;
  locationId: string;
  entries: InitiativeEntry[];
}

export interface SceneState {
  locationName: string;
  mode: SceneMode;
  round: number;
  activeTurnTokenId: string | null;
  activeEvent: ActiveBanner | null;
  initiativeSession?: InitiativeRollSession | null;
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
  gameClock: GameClockState;
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
  locationAffectedByTimeOfDay: boolean;
  locationAmbientAudioUrl?: string | null;
  locationAmbientAudioName?: string | null;
  gameClock: GameClockState;
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
  locationAffectedByTimeOfDay: boolean;
  gameClock: GameClockState;
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
  | { type: 'dm:setAudioMuted'; muted: boolean }
  | { type: 'dm:clearLocationAudio'; locationId: string }
  | { type: 'dm:clearSplashAudio' }
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
        affectedByTimeOfDay?: boolean;
        ambientAudioUrl?: string | null;
        ambientAudioName?: string | null;
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
        subclassId?: string;
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
        expertiseSkillIds?: string[];
        proficiencyIds?: string[];
        featIds?: string[];
        senses?: string;
        visions?: EntityVisionEntry[];
      };
    }
  | { type: 'dm:deletePlayer'; playerId: string }
  | {
      type: 'dm:updateStats';
      playerId: string;
      ownerAccountId?: string;
      name?: string;
      classId?: string;
      subclassId?: string;
      backgroundId?: string;
      speciesId?: string;
      color?: string;
      xp?: number;
      acknowledgedLevel?: number;
      hp?: number;
      maxHp?: number;
      tempHp?: number;
      ac?: number;
      initiative?: number;
      speed?: number;
      exhaustionLevel?: number;
      gold?: number;
      conditions?: string[];
      privateNote?: string;
      locationId?: string;
      locationNote?: string;
      abilities?: Record<string, number>;
      proficientSkillIds?: string[];
      expertiseSkillIds?: string[];
      proficiencyIds?: string[];
      featIds?: string[];
      senses?: string;
      visions?: EntityVisionEntry[];
    }
  | { type: 'dm:addInventoryItem'; playerId: string; item: Omit<InventoryItem, 'id'> }
  | { type: 'dm:updateInventoryItem'; playerId: string; itemId: string; patch: Partial<InventoryItem> }
  | { type: 'dm:removeInventoryItem'; playerId: string; itemId: string }
  | { type: 'dm:setScene'; patch: Partial<SceneState> }
  | { type: 'dm:startInitiativeRoll' }
  | { type: 'dm:setInitiativeEntry'; tokenId: string; roll?: number | null; total: number | null }
  | { type: 'dm:autoRollMonstersInitiative' }
  | { type: 'dm:completeInitiativeRoll' }
  | { type: 'dm:cancelInitiativeRoll' }
  | { type: 'dm:resolveMonsterZeroHp'; tokenId: string; outcome: 'dead' | 'unconscious' }
  | {
      type: 'dm:recordDeathSave';
      playerId: string;
      outcome:
        | 'success'
        | 'failure'
        | 'nat1'
        | 'nat20'
        | 'damage_1'
        | 'damage_2'
        | 'stabilize'
        | 'reset';
    }
  | {
      type: 'dm:updateGameClock';
      setMinuteOfDay?: number;
      setDay?: number;
      addMinutes?: number;
      paused?: boolean;
      timeScale?: number;
    }
  | { type: 'dm:setTokenConditions'; tokenId: string; conditions: string[] }
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
  | { type: 'dm:upsertCatalogItem'; catalog: 'subclasses'; item: SubclassRef }
  | { type: 'dm:upsertCatalogItem'; catalog: 'classFeatures'; item: ClassFeatureRef }
  | { type: 'dm:upsertCatalogItem'; catalog: 'subclassFeatures'; item: SubclassFeatureRef }
  | { type: 'dm:upsertCatalogItem'; catalog: 'backgrounds'; item: BackgroundRef }
  | { type: 'dm:upsertCatalogItem'; catalog: 'feats'; item: FeatRef }
  | { type: 'dm:upsertCatalogItem'; catalog: 'species'; item: SpeciesRef }
  | { type: 'dm:upsertCatalogItem'; catalog: 'levels'; item: LevelThresholdRef }
  | { type: 'dm:upsertCatalogItem'; catalog: 'skills'; item: SkillRef }
  | { type: 'dm:upsertCatalogItem'; catalog: 'proficiencies'; item: ProficiencyRef }
  | { type: 'dm:upsertCatalogItem'; catalog: 'visions'; item: VisionRef }
  | { type: 'dm:upsertCatalogItem'; catalog: 'conditions'; item: ConditionRef }
  | { type: 'dm:upsertCatalogItem'; catalog: 'weaponProperties'; item: WeaponPropertyRef }
  | { type: 'dm:upsertCatalogItem'; catalog: 'weaponMasteries'; item: WeaponMasteryRef }
  | { type: 'dm:upsertCatalogItem'; catalog: 'weapons'; item: WeaponRef }
  | { type: 'dm:upsertCatalogItem'; catalog: 'armors'; item: ArmorRef }
  | { type: 'dm:upsertCatalogItem'; catalog: 'gearItems'; item: GearItemRef }
  | { type: 'dm:upsertCatalogItem'; catalog: 'monsters'; item: MonsterRef }
  | { type: 'dm:deleteCatalogItem'; catalog: CatalogKey; itemId: string }
  | { type: 'dm:resetCatalogs' }
  | { type: 'dm:resetSession' }
  | { type: 'player:toggleEquip'; playerId: string; itemId: string }
  | { type: 'player:useConsumable'; playerId: string; itemId: string }
  | {
      type: 'player:spendAmmo';
      playerId: string;
      ammoItemId: string;
      delta?: number;
    };

export type ServerMessage =
  | { type: 'tv:state'; payload: TvGameState }
  | { type: 'player:state'; payload: PlayerGameState }
  | { type: 'dm:state'; payload: FullGameState }
  | { type: 'account:registered'; account: UserAccount }
  | { type: 'error'; message: string };
