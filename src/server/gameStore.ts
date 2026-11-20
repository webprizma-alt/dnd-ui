import fs from 'fs';
import path from 'path';
import {
  canPlayerEquipItem,
  computeLevelFromXp,
  computePlayerAc,
  computePlayerInitiative,
  createDefaultCatalogs,
  formatArmorClassFormula,
  inferWeaponRangeType,
  inferWeaponReachRange,
  parseLegacyArmorClass,
  resolveInventoryArmorCategory,
  sortAbilityModifiers,
  sortLevels,
} from '../shared/catalogDefaults.ts';
import type {
  ArmorCategory,
  CatalogKey,
  CharacterCreationRequest,
  CharacterDraft,
  ClientMessage,
  EntityVisionEntry,
  FullGameState,
  GameCatalogs,
  GameEventEntry,
  GameLocation,
  LocationHotspot,
  MapLighting,
  MapToken,
  PlayerCharacter,
  PlayerGameState,
  PublicPlayerInfo,
  TvGameState,
  UserAccount,
  VisionBehavior,
} from '../shared/types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'game-state.json');

const CITY_ASHBORN_MAP_URL = '/src/assets/images/city_map_ashborn_1795109786517.jpg';
const TAVERN_MAP_URL = '/src/assets/images/tavern_interior_map_1795109793991.jpg';
const DUNGEON_HALL_MAP_URL = '/src/assets/images/default_tactical_dungeon_map_1794960614065.jpg';
const TITLE_CREST_URL = '/src/assets/images/game_title_crest_1795109790353.jpg';
const TRAVEL_BACKDROP_URL = '/src/assets/images/travel_journey_backdrop_1795109762212.jpg';

const DEFAULT_CITY_ID = 'loc-city-ashborn';

const LEGACY_SEEDED_PLAYER_IDS = new Set(['player-torin', 'player-elara', 'player-morden']);
const LEGACY_SEEDED_TOKEN_IDS = new Set([
  'token-torin',
  'token-elara',
  'token-morden',
  'token-goblin-1',
  'token-goblin-2',
]);
const TOKEN_PALETTE = ['#F59E0B', '#10B981', '#38BDF8', '#A855F7', '#EC4899', '#EF4444'];

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundCoord(value: number, snapToGrid: boolean): number {
  if (snapToGrid) return Math.round(value);
  return Math.round(value * 100) / 100;
}

function normalizeMapLighting(value: unknown, fallback: MapLighting = 'bright'): MapLighting {
  if (value === 'bright' || value === 'dim' || value === 'darkness') return value;
  return fallback;
}

function normalizeVisionBehavior(value: unknown): VisionBehavior {
  if (
    value === 'normal' ||
    value === 'darkvision' ||
    value === 'blindsight' ||
    value === 'truesight' ||
    value === 'tremorsense'
  ) {
    return value;
  }
  return 'normal';
}

function normalizeEntityVisions(
  raw: unknown,
  validVisionIds?: Set<string>
): EntityVisionEntry[] {
  if (!Array.isArray(raw)) return [];
  const byId = new Map<string, EntityVisionEntry>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const visionId = String((item as EntityVisionEntry).visionId || '').trim();
    if (!visionId) continue;
    if (validVisionIds && !validVisionIds.has(visionId)) continue;
    const rawRange = (item as EntityVisionEntry).rangeFt;
    const rangeFt =
      typeof rawRange === 'number' && Number.isFinite(rawRange) && rawRange > 0
        ? clamp(Math.round(rawRange), 5, 1200)
        : null;
    byId.set(visionId, { visionId, rangeFt });
  }
  return Array.from(byId.values());
}

function getDefaultSpawnPosition(loc: GameLocation, index: number): { x: number; y: number } {
  if (loc.kind === 'city') {
    const centerX = Math.max(1, loc.map.cols * 0.48 + ((index % 3) - 1) * 0.85);
    const centerY = Math.max(1, loc.map.rows * 0.56 + Math.floor(index / 3) * 0.85);
    return {
      x: roundCoord(clamp(centerX, 0.5, Math.max(0.5, loc.map.cols - 1.2)), false),
      y: roundCoord(clamp(centerY, 0.5, Math.max(0.5, loc.map.rows - 1.2)), false),
    };
  }
  const col = clamp(2 + Math.floor(index / 4), 0, Math.max(0, loc.map.cols - 1));
  const row = clamp(2 + (index % 4), 0, Math.max(0, loc.map.rows - 1));
  return { x: col, y: row };
}

export function createDefaultLocations(): GameLocation[] {
  return [
    {
      id: DEFAULT_CITY_ID,
      name: 'Эшборн — Торговый город',
      kind: 'city',
      description:
        'Укрепленный северный город на перекрестке торговых путей. Стартовая точка партии с таверной, площадью, кузней, казармами и выходом к северным руинам.',
      parentLocationId: null,
      graphX: 430,
      graphY: 250,
      map: {
        imageUrl: CITY_ASHBORN_MAP_URL,
        cols: 16,
        rows: 9,
        showGrid: false,
        gridOpacity: 0.2,
        lighting: 'bright',
      },
      hotspots: [
        {
          id: 'hs-ashborn-tavern',
          label: 'Таверна «Сломанный щит»',
          category: 'tavern',
          x: 61,
          y: 70,
          targetLocationId: 'loc-tavern',
          description: 'Шумная таверна с эльфийским элем, слухами и теплым очагом.',
          visibleOnTv: true,
        },
        {
          id: 'hs-ashborn-board',
          label: 'Доска объявлений',
          category: 'board',
          x: 51,
          y: 55,
          targetLocationId: 'loc-notice-board',
          description: 'Рыночная площадь, контракты наемников и городские указы.',
          visibleOnTv: true,
        },
        {
          id: 'hs-ashborn-armory',
          label: 'Оружейная кузня',
          category: 'armory',
          x: 35,
          y: 74,
          targetLocationId: 'loc-armory',
          description: 'Кузница Железного Молота: оружие, щиты и ремонт доспехов.',
          visibleOnTv: true,
        },
        {
          id: 'hs-ashborn-barracks',
          label: 'Казармы стражи',
          category: 'barracks',
          x: 20,
          y: 50,
          targetLocationId: 'loc-barracks',
          description: 'Гарнизон городской стражи, плац и казармы для солдат.',
          visibleOnTv: true,
        },
        {
          id: 'hs-ashborn-inn',
          label: 'Гостиный двор',
          category: 'inn',
          x: 61,
          y: 31,
          targetLocationId: 'loc-inn',
          description: 'Постоялый двор «Ржавая кружка» — комнаты для длительного отдыха.',
          visibleOnTv: true,
        },
        {
          id: 'hs-ashborn-ruins',
          label: 'Северные руины',
          category: 'dungeon',
          x: 21,
          y: 17,
          targetLocationId: 'loc-dungeon-hall',
          description: 'Дорога за Северными воротами к Залу древних колонн (тактический бой).',
          visibleOnTv: true,
        },
      ],
      tokens: [],
    },
    {
      id: 'loc-tavern',
      name: 'Таверна «Сломанный щит»',
      kind: 'city',
      description: 'Уютный зал таверны: барная стойка, камин и дубовые столы для встреч с нанимателями.',
      parentLocationId: DEFAULT_CITY_ID,
      graphX: 770,
      graphY: 420,
      map: {
        imageUrl: TAVERN_MAP_URL,
        cols: 16,
        rows: 9,
        showGrid: false,
        gridOpacity: 0.2,
      },
      hotspots: [
        {
          id: 'hs-tavern-exit',
          label: 'Выход в Эшборн',
          category: 'portal',
          x: 16,
          y: 88,
          targetLocationId: DEFAULT_CITY_ID,
          description: 'Вернуться на улицы города Эшборн.',
          visibleOnTv: true,
        },
      ],
      tokens: [],
    },
    {
      id: 'loc-notice-board',
      name: 'Площадь и доска объявлений',
      kind: 'city',
      description: 'Центральная рыночная площадь с заказами на чудовищ, наградами и новостями королевства.',
      parentLocationId: DEFAULT_CITY_ID,
      graphX: 780,
      graphY: 250,
      map: {
        imageUrl: null,
        cols: 16,
        rows: 9,
        showGrid: false,
        gridOpacity: 0.2,
      },
      hotspots: [
        {
          id: 'hs-board-exit',
          label: 'Вернуться на карту города',
          category: 'portal',
          x: 15,
          y: 84,
          targetLocationId: DEFAULT_CITY_ID,
          description: 'Вернуться к общему плану Эшборна.',
          visibleOnTv: true,
        },
        {
          id: 'hs-board-ruins',
          label: 'Контракт: Северные руины',
          category: 'dungeon',
          x: 80,
          y: 26,
          targetLocationId: 'loc-dungeon-hall',
          description: 'Отправиться по объявлению к Залу древних колонн.',
          visibleOnTv: true,
        },
      ],
      tokens: [],
    },
    {
      id: 'loc-armory',
      name: 'Оружейная кузня',
      kind: 'city',
      description: 'Мастерская кузнеца Железного Молота: торговля клинками, доспехами и снаряжением.',
      parentLocationId: DEFAULT_CITY_ID,
      graphX: 110,
      graphY: 430,
      map: {
        imageUrl: null,
        cols: 16,
        rows: 9,
        showGrid: false,
        gridOpacity: 0.2,
      },
      hotspots: [
        {
          id: 'hs-armory-exit',
          label: 'Выход в Эшборн',
          category: 'portal',
          x: 15,
          y: 85,
          targetLocationId: DEFAULT_CITY_ID,
          description: 'Вернуться на улицы города.',
          visibleOnTv: true,
        },
      ],
      tokens: [],
    },
    {
      id: 'loc-barracks',
      name: 'Казармы стражи',
      kind: 'city',
      description: 'Западный бастион и казармы. Место службы и ночлега стражников и солдат.',
      parentLocationId: DEFAULT_CITY_ID,
      graphX: 90,
      graphY: 250,
      map: {
        imageUrl: null,
        cols: 16,
        rows: 9,
        showGrid: false,
        gridOpacity: 0.2,
      },
      hotspots: [
        {
          id: 'hs-barracks-exit',
          label: 'Выход в Эшборн',
          category: 'portal',
          x: 84,
          y: 84,
          targetLocationId: DEFAULT_CITY_ID,
          description: 'Вернуться на карту города.',
          visibleOnTv: true,
        },
      ],
      tokens: [],
    },
    {
      id: 'loc-inn',
      name: 'Гостиный двор «Ржавая кружка»',
      kind: 'city',
      description: 'Тихий постоялый двор у Северных ворот для отдыха и восстановления сил партии.',
      parentLocationId: DEFAULT_CITY_ID,
      graphX: 760,
      graphY: 85,
      map: {
        imageUrl: null,
        cols: 16,
        rows: 9,
        showGrid: false,
        gridOpacity: 0.2,
      },
      hotspots: [
        {
          id: 'hs-inn-exit',
          label: 'Выход в Эшборн',
          category: 'portal',
          x: 16,
          y: 84,
          targetLocationId: DEFAULT_CITY_ID,
          description: 'Выйти на городскую площадь.',
          visibleOnTv: true,
        },
      ],
      tokens: [],
    },
    {
      id: 'loc-dungeon-hall',
      name: 'Зал древних колонн',
      kind: 'tactical',
      description: 'Заброшенное каменное святилище к северу от Эшборна. Тактическая боевая карта с сеткой.',
      parentLocationId: DEFAULT_CITY_ID,
      graphX: 110,
      graphY: 85,
      map: {
        imageUrl: DUNGEON_HALL_MAP_URL,
        cols: 16,
        rows: 9,
        showGrid: true,
        gridOpacity: 0.25,
        lighting: 'dim',
      },
      hotspots: [
        {
          id: 'hs-dungeon-exit',
          label: 'Назад в Эшборн',
          category: 'portal',
          x: 8,
          y: 50,
          targetLocationId: DEFAULT_CITY_ID,
          description: 'Покинуть руины и вернуться в город.',
          visibleOnTv: true,
        },
      ],
      tokens: [],
    },
  ];
}

function buildDefaultAbilities(
  catalogs: GameCatalogs,
  overrides?: Record<string, number | null>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const ab of catalogs.abilities) {
    result[ab.id] = 10;
  }
  if (overrides) {
    for (const [k, v] of Object.entries(overrides)) {
      if (typeof v === 'number' && Number.isFinite(v)) {
        result[k] = Math.max(1, Math.min(30, Math.round(v)));
      }
    }
  }
  return result;
}

function createEmptyDraft(catalogs: GameCatalogs, colorIndex: number): CharacterDraft {
  const abilities: Record<string, number | null> = {};
  for (const ab of catalogs.abilities) {
    abilities[ab.id] = null;
  }
  return {
    name: '',
    classId: '',
    backgroundId: '',
    speciesId: '',
    color: TOKEN_PALETTE[colorIndex % TOKEN_PALETTE.length],
    maxHp: null,
    ac: null,
    xp: 0,
    gold: 0,
    abilities,
    proficientSkillIds: [],
    expertiseSkillIds: [],
    proficiencyIds: [],
    senses: '',
    visions: [{ visionId: 'normal', rangeFt: null }],
    privateNote: '',
  };
}

export function createDefaultState(): FullGameState {
  const now = Date.now();
  const catalogs = createDefaultCatalogs();
  const locations = createDefaultLocations();
  const startLocation = locations[0];

  return {
    version: 1,
    updatedAt: now,
    accounts: [],
    creationRequests: [],
    catalogs,
    locations,
    activeLocationId: startLocation.id,
    tvDisplay: {
      phase: 'title_splash',
      campaignTitle: 'Хроники Эшборна',
      campaignSubtitle: 'Настольное приключение в землях Севера',
      titleCrestUrl: TITLE_CREST_URL,
      travelBackdropUrl: TRAVEL_BACKDROP_URL,
      startedAt: now,
    },
    scene: {
      locationName: startLocation.name,
      mode: 'exploration',
      round: 1,
      activeTurnTokenId: null,
      activeEvent: null,
    },
    map: { ...startLocation.map },
    players: [],
    tokens: [],
    eventLog: [
      {
        id: 'evt-init-1',
        scope: 'public',
        title: 'Стол готов',
        message: 'Стартовая локация: Эшборн — Торговый город. Мастер может подготовить карту и начать игру.',
        timestamp: now,
        tone: 'neutral',
      },
    ],
  };
}

export class GameStore {
  private state: FullGameState;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    this.state = this.loadFromDisk();
  }

  private getLocationById(locationId: string | undefined): GameLocation {
    if (locationId) {
      const found = this.state.locations.find((l) => l.id === locationId);
      if (found) return found;
    }
    return this.state.locations[0];
  }

  private buildTokensForLocation(loc: GameLocation): MapToken[] {
    const playerTokens: MapToken[] = this.state.players
      .filter((p) => p.locationId === loc.id)
      .map((p) => ({
        id: `token-player-${p.id}`,
        label: p.name,
        kind: 'player' as const,
        playerId: p.id,
        color: p.color,
        x: p.posX,
        y: p.posY,
        size: 1,
        visibleOnTv: true,
        initiative: p.initiative,
        portraitUrl: p.portraitUrl ?? null,
      }));
    const npcTokens: MapToken[] = (loc.tokens || [])
      .filter((t) => t.kind !== 'player')
      .map((t) => {
        const linkedMonster = t.monsterId
          ? this.state.catalogs.monsters.find((m) => m.id === t.monsterId)
          : undefined;
        return {
          ...t,
          portraitUrl: linkedMonster?.portraitUrl ?? t.portraitUrl ?? null,
        };
      });
    return [...playerTokens, ...npcTokens];
  }

  private syncActiveLocationView() {
    if (!this.state.locations || this.state.locations.length === 0) {
      this.state.locations = createDefaultLocations();
    }
    const activeLoc = this.getLocationById(this.state.activeLocationId);
    this.state.activeLocationId = activeLoc.id;
    this.state.map = { ...activeLoc.map };
    this.state.scene.locationName = activeLoc.name;
    this.state.tokens = this.buildTokensForLocation(activeLoc);

    if (
      this.state.scene.activeTurnTokenId &&
      !this.state.tokens.some((t) => t.id === this.state.scene.activeTurnTokenId)
    ) {
      this.state.scene.activeTurnTokenId = null;
    }
  }

  private migrateState(parsed: Partial<FullGameState>): FullGameState {
    const fallback = createDefaultState();
    const defaults = createDefaultCatalogs();
    const rawCatalogs = parsed.catalogs || ({} as Partial<GameCatalogs>);

    const hadModifiersSchema = Array.isArray(rawCatalogs.abilityModifiers) && rawCatalogs.abilityModifiers.length > 0;
    const rawAbilities =
      Array.isArray(rawCatalogs.abilities) && rawCatalogs.abilities.length > 0
        ? rawCatalogs.abilities
        : defaults.abilities;

    const rawProficiencies =
      Array.isArray(rawCatalogs.proficiencies) && rawCatalogs.proficiencies.length > 0
        ? [...rawCatalogs.proficiencies]
        : [...defaults.proficiencies];
    if (!hadModifiersSchema && !rawProficiencies.some((p) => p.id === 'armor_shield')) {
      const shieldProf = defaults.proficiencies.find((p) => p.id === 'armor_shield');
      if (shieldProf) rawProficiencies.push(shieldProf);
    }

    const rawWeapons =
      Array.isArray(rawCatalogs.weapons) && rawCatalogs.weapons.length > 0
        ? rawCatalogs.weapons.map((w) => {
            const rangeType =
              w.rangeType === 'melee' || w.rangeType === 'ranged'
                ? w.rangeType
                : inferWeaponRangeType(w.name, w.properties);
            const inferred = inferWeaponReachRange(rangeType, w.properties);
            if (rangeType === 'ranged') {
              const normal =
                typeof w.rangeNormalFt === 'number' && Number.isFinite(w.rangeNormalFt) && w.rangeNormalFt >= 0
                  ? Math.round(w.rangeNormalFt)
                  : inferred.rangeNormalFt ?? 80;
              const max =
                typeof w.rangeMaxFt === 'number' && Number.isFinite(w.rangeMaxFt) && w.rangeMaxFt >= 0
                  ? Math.max(normal, Math.round(w.rangeMaxFt))
                  : Math.max(normal, inferred.rangeMaxFt ?? normal * 4);
              return {
                ...w,
                category: w.category === 'martial' ? ('martial' as const) : ('simple' as const),
                rangeType,
                reachFt: undefined,
                rangeNormalFt: normal,
                rangeMaxFt: max,
              };
            }
            const reach =
              typeof w.reachFt === 'number' && Number.isFinite(w.reachFt) && w.reachFt >= 0
                ? Math.round(w.reachFt)
                : inferred.reachFt ?? 5;
            return {
              ...w,
              category: w.category === 'martial' ? ('martial' as const) : ('simple' as const),
              rangeType,
              reachFt: reach,
              rangeNormalFt: undefined,
              rangeMaxFt: undefined,
            };
          })
        : defaults.weapons;

    const rawArmors =
      Array.isArray(rawCatalogs.armors) && rawCatalogs.armors.length > 0
        ? rawCatalogs.armors.map((a) => {
            const cat: ArmorCategory =
              a.category === 'shield'
                ? 'shield'
                : a.category === 'heavy'
                  ? 'heavy'
                  : a.category === 'medium'
                    ? 'medium'
                    : 'light';
            const parsedAc = parseLegacyArmorClass(a.armorClass, cat);
            const acBase = typeof a.acBase === 'number' && Number.isFinite(a.acBase) ? Math.round(a.acBase) : parsedAc.acBase;
            const acAbilityId = a.acAbilityId !== undefined ? a.acAbilityId : parsedAc.acAbilityId;
            const acMaxBonus = a.acMaxBonus !== undefined ? a.acMaxBonus : parsedAc.acMaxBonus;
            return {
              ...a,
              category: cat,
              acBase,
              acAbilityId,
              acMaxBonus,
              armorClass: formatArmorClassFormula({ category: cat, acBase, acAbilityId, acMaxBonus }, rawAbilities),
            };
          })
        : [...defaults.armors];

    if (!hadModifiersSchema && !rawArmors.some((a) => a.category === 'shield')) {
      const defaultShield = defaults.armors.find((a) => a.category === 'shield');
      if (defaultShield) rawArmors.push(defaultShield);
    }

    const rawVisions =
      Array.isArray(rawCatalogs.visions) && rawCatalogs.visions.length > 0
        ? rawCatalogs.visions.map((v) => ({
            id: v.id || makeId('vis'),
            name: (v.name || '').trim() || 'Зрение',
            behavior: normalizeVisionBehavior(v.behavior ?? v.id),
            description: (v.description || '').trim(),
          }))
        : defaults.visions;
    const validVisionIds = new Set(rawVisions.map((v) => v.id));

    const catalogs: GameCatalogs = {
      abilities: rawAbilities,
      abilityModifiers: hadModifiersSchema
        ? sortAbilityModifiers(rawCatalogs.abilityModifiers!)
        : defaults.abilityModifiers,
      classes:
        Array.isArray(rawCatalogs.classes) && rawCatalogs.classes.length > 0
          ? rawCatalogs.classes
          : defaults.classes,
      backgrounds:
        Array.isArray(rawCatalogs.backgrounds) && rawCatalogs.backgrounds.length > 0
          ? rawCatalogs.backgrounds
          : defaults.backgrounds,
      species:
        Array.isArray(rawCatalogs.species) && rawCatalogs.species.length > 0
          ? rawCatalogs.species
          : defaults.species,
      levels:
        Array.isArray(rawCatalogs.levels) && rawCatalogs.levels.length > 0
          ? sortLevels(rawCatalogs.levels)
          : defaults.levels,
      skills:
        Array.isArray(rawCatalogs.skills) && rawCatalogs.skills.length > 0
          ? rawCatalogs.skills
          : defaults.skills,
      proficiencies: rawProficiencies,
      visions: rawVisions,
      weapons: rawWeapons,
      armors: rawArmors,
      monsters: Array.isArray(rawCatalogs.monsters)
        ? rawCatalogs.monsters.map((m) => ({
            ...m,
            visions: normalizeEntityVisions(m.visions, validVisionIds),
          }))
        : defaults.monsters,
    };

    const hadAccountsSchema = Array.isArray(parsed.accounts);
    const hadLocationsSchema = Array.isArray(parsed.locations) && parsed.locations.length > 0;
    const accounts: UserAccount[] = hadAccountsSchema ? (parsed.accounts as UserAccount[]) : [];
    const creationRequests: CharacterCreationRequest[] = Array.isArray(parsed.creationRequests)
      ? parsed.creationRequests
      : [];

    const locations: GameLocation[] = hadLocationsSchema
      ? (parsed.locations as GameLocation[]).map((loc, idx) => ({
          id: loc.id || makeId('loc'),
          name: loc.name || `Локация ${idx + 1}`,
          kind: loc.kind === 'tactical' ? 'tactical' : 'city',
          description: typeof loc.description === 'string' ? loc.description : '',
          parentLocationId: loc.parentLocationId ?? null,
          graphX: typeof loc.graphX === 'number' ? loc.graphX : 180 + (idx % 4) * 220,
          graphY: typeof loc.graphY === 'number' ? loc.graphY : 120 + Math.floor(idx / 4) * 180,
          map: {
            imageUrl: loc.map?.imageUrl ?? null,
            cols: clamp(Math.round(loc.map?.cols || 16), 6, 32),
            rows: clamp(Math.round(loc.map?.rows || 9), 4, 24),
            showGrid:
              typeof loc.map?.showGrid === 'boolean'
                ? loc.map.showGrid
                : loc.kind === 'tactical',
            gridOpacity: typeof loc.map?.gridOpacity === 'number' ? loc.map.gridOpacity : 0.25,
            lighting: normalizeMapLighting(loc.map?.lighting, 'bright'),
          },
          hotspots: Array.isArray(loc.hotspots) ? loc.hotspots : [],
          tokens: Array.isArray(loc.tokens)
            ? loc.tokens.filter((t) => t.kind !== 'player')
            : [],
        }))
      : createDefaultLocations();

    const activeLocationId =
      hadLocationsSchema &&
      parsed.activeLocationId &&
      locations.some((l) => l.id === parsed.activeLocationId)
        ? parsed.activeLocationId
        : locations[0].id;

    const activeLoc = locations.find((l) => l.id === activeLocationId) ?? locations[0];

    const defaultClassId = catalogs.classes[0]?.id ?? '';
    const defaultBackgroundId = catalogs.backgrounds[0]?.id ?? '';
    const defaultSpeciesId = catalogs.species[0]?.id ?? '';

    const rawPlayers = (parsed.players ?? []).filter((p) =>
      hadAccountsSchema ? true : !LEGACY_SEEDED_PLAYER_IDS.has(p.id)
    );
    const legacyTokens = (parsed.tokens ?? []).filter((t) =>
      hadAccountsSchema ? true : !LEGACY_SEEDED_TOKEN_IDS.has(t.id)
    );

    const migratedPlayers: PlayerCharacter[] = rawPlayers.map((raw, idx) => {
      const p = raw as Partial<PlayerCharacter>;
      let classId = p.classId ?? '';
      if (!classId && p.role) {
        const byName = catalogs.classes.find(
          (c) => c.name.toLowerCase() === p.role!.trim().toLowerCase()
        );
        classId = byName?.id ?? defaultClassId;
      }
      if (!classId) classId = defaultClassId;

      const resolvedClass = catalogs.classes.find((c) => c.id === classId);
      const xp = Math.max(0, Math.floor(Number(p.xp) || 0));
      const level = computeLevelFromXp(xp, catalogs.levels);

      const targetLocId =
        p.locationId && locations.some((l) => l.id === p.locationId)
          ? p.locationId
          : activeLoc.id;
      const targetLoc = locations.find((l) => l.id === targetLocId) ?? activeLoc;

      const legacyTok = legacyTokens.find((t) => t.playerId === p.id);
      const fallbackSpawn = getDefaultSpawnPosition(targetLoc, idx);
      const posX =
        typeof p.posX === 'number' && Number.isFinite(p.posX)
          ? clamp(p.posX, 0, Math.max(0, targetLoc.map.cols - 1))
          : legacyTok
            ? clamp(legacyTok.x, 0, Math.max(0, targetLoc.map.cols - 1))
            : fallbackSpawn.x;
      const posY =
        typeof p.posY === 'number' && Number.isFinite(p.posY)
          ? clamp(p.posY, 0, Math.max(0, targetLoc.map.rows - 1))
          : legacyTok
            ? clamp(legacyTok.y, 0, Math.max(0, targetLoc.map.rows - 1))
            : fallbackSpawn.y;

      const builtAbilities = buildDefaultAbilities(catalogs, p.abilities);
      const builtInventory = Array.isArray(p.inventory) ? p.inventory : [];
      const defaultInit = computePlayerInitiative(builtAbilities, catalogs);
      const computedAc = computePlayerAc(
        { abilities: builtAbilities, inventory: builtInventory },
        catalogs
      );

      return {
        id: p.id || makeId('player'),
        ownerAccountId: p.ownerAccountId,
        name: p.name || 'Безымянный',
        role: resolvedClass?.name || p.role || 'Без класса',
        classId,
        backgroundId: p.backgroundId || defaultBackgroundId,
        speciesId: p.speciesId || defaultSpeciesId,
        xp,
        level,
        color: p.color || '#F59E0B',
        hp: typeof p.hp === 'number' ? p.hp : 10,
        maxHp: typeof p.maxHp === 'number' ? Math.max(1, p.maxHp) : 10,
        tempHp: typeof p.tempHp === 'number' ? Math.max(0, p.tempHp) : 0,
        ac: computedAc,
        initiative:
          hadModifiersSchema && typeof p.initiative === 'number' && Number.isFinite(p.initiative)
            ? Math.round(p.initiative)
            : defaultInit,
        conditions: Array.isArray(p.conditions) ? p.conditions : [],
        isConnected: false,
        locationId: targetLoc.id,
        locationName: targetLoc.name,
        locationNote: typeof p.locationNote === 'string' ? p.locationNote : '',
        posX,
        posY,
        portraitUrl: typeof p.portraitUrl === 'string' ? p.portraitUrl : null,
        gold: typeof p.gold === 'number' ? Math.max(0, p.gold) : 0,
        abilities: builtAbilities,
        proficientSkillIds: Array.isArray(p.proficientSkillIds) ? p.proficientSkillIds : [],
        expertiseSkillIds: Array.isArray(p.expertiseSkillIds) ? p.expertiseSkillIds : [],
        proficiencyIds: Array.isArray(p.proficiencyIds) ? p.proficiencyIds : [],
        senses: typeof p.senses === 'string' ? p.senses : '',
        visions:
          Array.isArray(p.visions) && p.visions.length > 0
            ? normalizeEntityVisions(p.visions, validVisionIds)
            : validVisionIds.has('normal')
              ? [{ visionId: 'normal', rangeFt: null }]
              : [],
        inventory: builtInventory,
        privateNote: typeof p.privateNote === 'string' ? p.privateNote : '',
      };
    });

    // Always boot on the title splash screen so DM can prepare the restored board before revealing TV
    const rawTvDisplay = parsed.tvDisplay;
    const tvDisplay = {
      phase: 'title_splash' as const,
      campaignTitle:
        typeof rawTvDisplay?.campaignTitle === 'string' && rawTvDisplay.campaignTitle.trim()
          ? rawTvDisplay.campaignTitle.trim()
          : fallback.tvDisplay.campaignTitle,
      campaignSubtitle:
        typeof rawTvDisplay?.campaignSubtitle === 'string'
          ? rawTvDisplay.campaignSubtitle
          : fallback.tvDisplay.campaignSubtitle,
      titleCrestUrl: rawTvDisplay?.titleCrestUrl || TITLE_CREST_URL,
      travelBackdropUrl: rawTvDisplay?.travelBackdropUrl || TRAVEL_BACKDROP_URL,
      startedAt: Date.now(),
    };

    const migratedScene = parsed.scene
      ? {
          ...parsed.scene,
          locationName: activeLoc.name,
        }
      : {
          ...fallback.scene,
          locationName: activeLoc.name,
        };

    const nextState: FullGameState = {
      version: typeof parsed.version === 'number' ? parsed.version : 1,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
      accounts,
      creationRequests,
      catalogs,
      locations,
      activeLocationId: activeLoc.id,
      tvDisplay,
      scene: migratedScene,
      map: { ...activeLoc.map },
      tokens: [],
      players: migratedPlayers,
      eventLog: Array.isArray(parsed.eventLog) ? parsed.eventLog : fallback.eventLog,
    };

    this.state = nextState;
    this.syncActiveLocationView();
    return this.state;
  }

  private loadFromDisk(): FullGameState {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<FullGameState>;
        if (parsed && Array.isArray(parsed.players) && parsed.scene) {
          const migrated = this.migrateState(parsed);
          this.writeToDiskImmediate(migrated);
          return migrated;
        }
      }
    } catch (err) {
      console.error('Failed to load game-state.json, using default state:', err);
    }
    const fresh = createDefaultState();
    this.writeToDiskImmediate(fresh);
    return fresh;
  }

  private writeToDiskImmediate(snapshot: FullGameState) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const tmpPath = `${STATE_FILE}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(snapshot, null, 2), 'utf-8');
      fs.renameSync(tmpPath, STATE_FILE);
    } catch (err) {
      console.error('Failed to persist game-state.json:', err);
    }
  }

  public scheduleSave() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => {
      this.writeToDiskImmediate(this.state);
      this.saveTimer = null;
    }, 200);
  }

  public flushSave() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.writeToDiskImmediate(this.state);
  }

  public registerOrGetAccount(rawName: string): UserAccount | null {
    const cleanName = rawName.trim();
    if (!cleanName) return null;

    const existing = this.state.accounts.find(
      (a) => a.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (existing) {
      return existing;
    }

    const created: UserAccount = {
      id: makeId('acc'),
      name: cleanName,
      createdAt: Date.now(),
    };
    this.state.accounts.push(created);
    this.bumpVersion();
    this.scheduleSave();
    return created;
  }

  private resolvePlayer(player: PlayerCharacter, connectedPlayerIds: Set<string>): PlayerCharacter {
    const classRef = this.state.catalogs.classes.find((c) => c.id === player.classId);
    const level = computeLevelFromXp(player.xp, this.state.catalogs.levels);
    const loc = this.getLocationById(player.locationId);
    const computedAc = computePlayerAc(player, this.state.catalogs);
    return {
      ...player,
      role: classRef?.name || player.role || 'Без класса',
      level,
      ac: computedAc,
      locationId: loc.id,
      locationName: loc.name,
      isConnected: connectedPlayerIds.has(player.id),
    };
  }

  private toPublicPlayer(player: PlayerCharacter, connectedPlayerIds: Set<string>): PublicPlayerInfo {
    const resolved = this.resolvePlayer(player, connectedPlayerIds);
    return {
      id: resolved.id,
      ownerAccountId: resolved.ownerAccountId,
      name: resolved.name,
      role: resolved.role,
      classId: resolved.classId,
      speciesId: resolved.speciesId,
      backgroundId: resolved.backgroundId,
      xp: resolved.xp,
      level: resolved.level,
      color: resolved.color,
      hp: resolved.hp,
      maxHp: resolved.maxHp,
      tempHp: resolved.tempHp,
      ac: resolved.ac,
      initiative: resolved.initiative,
      conditions: resolved.conditions,
      isConnected: resolved.isConnected,
      locationId: resolved.locationId,
      locationName: resolved.locationName,
      locationNote: resolved.locationNote,
      posX: resolved.posX,
      posY: resolved.posY,
      portraitUrl: resolved.portraitUrl ?? null,
    };
  }

  public getPublicPlayers(connectedPlayerIds: Set<string>): PublicPlayerInfo[] {
    return this.state.players.map((p) => this.toPublicPlayer(p, connectedPlayerIds));
  }

  public projectForTv(connectedPlayerIds: Set<string>): TvGameState {
    const activeLoc = this.getLocationById(this.state.activeLocationId);
    const isTraveling = this.state.tvDisplay.phase === 'traveling';
    // Never leak new map tokens or hotspots while DM is still preparing during travel splash
    const visibleTokens = isTraveling
      ? []
      : this.state.tokens.filter((t) => t.visibleOnTv);
    const visibleHotspots = isTraveling
      ? []
      : activeLoc.hotspots.filter((h) => h.visibleOnTv);

    return {
      version: this.state.version,
      updatedAt: this.state.updatedAt,
      activeLocationId: activeLoc.id,
      locationKind: activeLoc.kind,
      tvDisplay: this.state.tvDisplay,
      scene: this.state.scene,
      map: this.state.map,
      hotspots: visibleHotspots,
      tokens: visibleTokens,
      players: this.getPublicPlayers(connectedPlayerIds),
      eventLog: this.state.eventLog.filter((e) => e.scope === 'public').slice(0, 20),
    };
  }

  public projectForPlayer(
    accountId: string | undefined,
    playerId: string | undefined,
    connectedPlayerIds: Set<string>
  ): PlayerGameState {
    const activeLoc = this.getLocationById(this.state.activeLocationId);
    const publicPlayers = this.getPublicPlayers(connectedPlayerIds);
    const currentAccount = accountId
      ? this.state.accounts.find((a) => a.id === accountId) ?? null
      : null;

    const myCharacters = currentAccount
      ? publicPlayers.filter((p) => p.ownerAccountId === currentAccount.id)
      : [];

    let self: PlayerCharacter | null = null;
    if (currentAccount && playerId) {
      const matched = this.state.players.find(
        (p) => p.id === playerId && p.ownerAccountId === currentAccount.id
      );
      if (matched) {
        self = this.resolvePlayer(matched, connectedPlayerIds);
      }
    }

    const myCreationRequest = currentAccount
      ? this.state.creationRequests.find((r) => r.accountId === currentAccount.id) ?? null
      : null;

    let queuePosition: number | null = null;
    if (myCreationRequest && myCreationRequest.status === 'queued') {
      const queuedOnly = this.state.creationRequests.filter((r) => r.status === 'queued');
      const idx = queuedOnly.findIndex((r) => r.id === myCreationRequest.id);
      queuePosition = idx >= 0 ? idx + 1 : null;
    }

    return {
      version: this.state.version,
      updatedAt: this.state.updatedAt,
      activeLocationId: activeLoc.id,
      locationKind: activeLoc.kind,
      tvDisplay: this.state.tvDisplay,
      catalogs: this.state.catalogs,
      accounts: this.state.accounts,
      currentAccount,
      myCharacters,
      myCreationRequest,
      queuePosition,
      scene: this.state.scene,
      map: this.state.map,
      tokens:
        this.state.tvDisplay.phase === 'traveling'
          ? []
          : this.state.tokens.filter((t) => t.visibleOnTv),
      publicPlayers,
      self,
      availablePlayers: myCharacters,
      eventLog: this.state.eventLog
        .filter((e) => e.scope === 'public' || (self && e.targetPlayerId === self.id))
        .slice(0, 30),
    };
  }

  public projectForDm(connectedPlayerIds: Set<string>): FullGameState {
    return {
      ...this.state,
      players: this.state.players.map((p) => this.resolvePlayer(p, connectedPlayerIds)),
    };
  }

  public setMapImage(imageUrl: string, locationId?: string): boolean {
    const targetLoc = this.getLocationById(locationId || this.state.activeLocationId);
    targetLoc.map = {
      ...targetLoc.map,
      imageUrl,
    };
    this.syncActiveLocationView();
    this.bumpVersion();
    this.scheduleSave();
    return true;
  }

  public getPlayerWithContext(playerId: string) {
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) return null;
    const classRef = this.state.catalogs.classes.find((c) => c.id === player.classId);
    const speciesRef = this.state.catalogs.species.find((s) => s.id === player.speciesId);
    const backgroundRef = this.state.catalogs.backgrounds.find((b) => b.id === player.backgroundId);
    return { player, classRef, speciesRef, backgroundRef };
  }

  public setPlayerPortrait(playerId: string, portraitUrl: string | null): boolean {
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) return false;
    player.portraitUrl = portraitUrl;
    this.syncActiveLocationView();
    this.bumpVersion();
    this.scheduleSave();
    return true;
  }

  public getMonsterWithContext(monsterId: string) {
    const monster = this.state.catalogs.monsters.find((m) => m.id === monsterId);
    if (!monster) return null;
    return {
      monster,
      abilities: this.state.catalogs.abilities,
      skills: this.state.catalogs.skills,
    };
  }

  public setMonsterPortrait(monsterId: string, portraitUrl: string | null): boolean {
    const monster = this.state.catalogs.monsters.find((m) => m.id === monsterId);
    if (!monster) return false;
    monster.portraitUrl = portraitUrl;
    for (const loc of this.state.locations) {
      for (const tok of loc.tokens) {
        if (tok.monsterId === monsterId) {
          tok.portraitUrl = portraitUrl;
        }
      }
    }
    this.syncActiveLocationView();
    this.bumpVersion();
    this.scheduleSave();
    return true;
  }

  private bumpVersion() {
    this.state.version += 1;
    this.state.updatedAt = Date.now();
  }

  private appendEvent(entry: Omit<GameEventEntry, 'id' | 'timestamp'>) {
    const item: GameEventEntry = {
      ...entry,
      id: makeId('evt'),
      timestamp: Date.now(),
    };
    this.state.eventLog = [item, ...this.state.eventLog].slice(0, 60);
  }

  private syncPlayersDerivedFields(recomputeInitiative = false) {
    for (const player of this.state.players) {
      player.level = computeLevelFromXp(player.xp, this.state.catalogs.levels);
      const classRef = this.state.catalogs.classes.find((c) => c.id === player.classId);
      if (classRef) {
        player.role = classRef.name;
      }
      const loc = this.getLocationById(player.locationId);
      player.locationId = loc.id;
      player.locationName = loc.name;
      for (const ab of this.state.catalogs.abilities) {
        if (typeof player.abilities[ab.id] !== 'number') {
          player.abilities[ab.id] = 10;
        }
      }
      player.ac = computePlayerAc(player, this.state.catalogs);
      if (recomputeInitiative) {
        player.initiative = computePlayerInitiative(player.abilities, this.state.catalogs);
      }
    }
    this.syncActiveLocationView();
  }

  public applyAction(msg: ClientMessage): boolean {
    return this.tryApplyAction(msg).changed;
  }

  public tryApplyAction(msg: ClientMessage): { changed: boolean; error?: string } {
    if (msg.type === 'player:toggleEquip') {
      const player = this.state.players.find((p) => p.id === msg.playerId);
      if (!player) return { changed: false };
      const item = player.inventory.find((i) => i.id === msg.itemId);
      if (!item) return { changed: false };

      if (!item.equipped) {
        const check = canPlayerEquipItem(player, item, this.state.catalogs);
        if (!check.allowed) {
          return { changed: false, error: check.reason };
        }
        // Keep at most 1 body armor and 1 shield equipped simultaneously
        if (item.category === 'armor') {
          const nextArmorCat = resolveInventoryArmorCategory(item, this.state.catalogs);
          const isNextShield = nextArmorCat === 'shield';
          for (const other of player.inventory) {
            if (other.id !== item.id && other.equipped && other.category === 'armor') {
              const otherCat = resolveInventoryArmorCategory(other, this.state.catalogs);
              const isOtherShield = otherCat === 'shield';
              if (isOtherShield === isNextShield) {
                other.equipped = false;
              }
            }
          }
        }
      }

      item.equipped = !item.equipped;
      player.ac = computePlayerAc(player, this.state.catalogs);
      this.bumpVersion();
      this.scheduleSave();
      return { changed: true };
    }

    const changed = this.applyActionInternal(msg);
    return { changed };
  }

  private applyActionInternal(msg: ClientMessage): boolean {
    switch (msg.type) {
      case 'join':
      case 'account:register':
        return false;

      case 'dm:startGame': {
        this.state.tvDisplay = {
          ...this.state.tvDisplay,
          phase: 'live',
          fromLocationName: undefined,
          toLocationId: undefined,
          toLocationName: undefined,
          toLocationKind: undefined,
          travelMessage: undefined,
          startedAt: Date.now(),
        };
        const activeLoc = this.getLocationById(this.state.activeLocationId);
        this.appendEvent({
          scope: 'public',
          title: 'Сессия началась',
          message: `Партия на локации «${activeLoc.name}».`,
          tone: 'neutral',
        });
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:showTitleSplash': {
        this.state.tvDisplay = {
          ...this.state.tvDisplay,
          phase: 'title_splash',
          startedAt: Date.now(),
        };
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:updateCampaignTitle': {
        const cleanTitle = msg.campaignTitle.trim();
        if (!cleanTitle) return false;
        this.state.tvDisplay = {
          ...this.state.tvDisplay,
          campaignTitle: cleanTitle,
          campaignSubtitle:
            typeof msg.campaignSubtitle === 'string'
              ? msg.campaignSubtitle.trim()
              : this.state.tvDisplay.campaignSubtitle,
        };
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:beginLocationTransition': {
        const targetLoc = this.state.locations.find((l) => l.id === msg.targetLocationId);
        if (!targetLoc) return false;
        const prevLoc = this.getLocationById(this.state.activeLocationId);

        // Move heroes who were in prevLoc (preserves heroes deliberately stationed in other buildings!)
        if (msg.moveParty !== false && prevLoc.id !== targetLoc.id) {
          const playersToMove = this.state.players.filter((p) => p.locationId === prevLoc.id);
          playersToMove.forEach((p, idx) => {
            const spawn = getDefaultSpawnPosition(targetLoc, idx);
            p.locationId = targetLoc.id;
            p.locationName = targetLoc.name;
            p.posX = spawn.x;
            p.posY = spawn.y;
          });
        }

        this.state.activeLocationId = targetLoc.id;
        this.state.scene.locationName = targetLoc.name;
        this.state.scene.mode = targetLoc.kind === 'tactical' ? 'combat' : 'exploration';
        this.state.scene.activeTurnTokenId = null;

        const defaultMsg =
          targetLoc.kind === 'tactical'
            ? `Отряд приближается к полю боя: ${targetLoc.name}...`
            : `Партия направляется в локацию: ${targetLoc.name}...`;

        this.state.tvDisplay = {
          ...this.state.tvDisplay,
          phase: 'traveling',
          fromLocationName: prevLoc.name,
          toLocationId: targetLoc.id,
          toLocationName: targetLoc.name,
          toLocationKind: targetLoc.kind,
          travelMessage: msg.travelMessage?.trim() || defaultMsg,
          startedAt: Date.now(),
        };

        this.syncActiveLocationView();
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:confirmLocationReady': {
        const activeLoc = this.getLocationById(this.state.activeLocationId);
        this.state.tvDisplay = {
          ...this.state.tvDisplay,
          phase: 'live',
          fromLocationName: undefined,
          toLocationId: undefined,
          toLocationName: undefined,
          toLocationKind: undefined,
          travelMessage: undefined,
          startedAt: Date.now(),
        };
        this.appendEvent({
          scope: 'public',
          title: `Прибытие: ${activeLoc.name}`,
          message:
            activeLoc.kind === 'tactical'
              ? 'Тактическая карта открыта. Приготовьтесь к действиям.'
              : activeLoc.description || `Партия вошла в локацию «${activeLoc.name}».`,
          tone: activeLoc.kind === 'tactical' ? 'danger' : 'neutral',
        });
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:upsertLocation': {
        const incoming = msg.location;
        const cleanName = incoming.name.trim();
        if (!cleanName) return false;

        if (incoming.id) {
          const existing = this.state.locations.find((l) => l.id === incoming.id);
          if (!existing) return false;
          existing.name = cleanName;
          existing.kind = incoming.kind === 'tactical' ? 'tactical' : 'city';
          if (typeof incoming.description === 'string') {
            existing.description = incoming.description.trim();
          }
          if ('parentLocationId' in incoming) {
            existing.parentLocationId =
              incoming.parentLocationId && incoming.parentLocationId !== existing.id
                ? incoming.parentLocationId
                : null;
          }
          if (typeof incoming.graphX === 'number') existing.graphX = Math.round(incoming.graphX);
          if (typeof incoming.graphY === 'number') existing.graphY = Math.round(incoming.graphY);
          if (incoming.map) {
            const cols =
              typeof incoming.map.cols === 'number'
                ? clamp(Math.round(incoming.map.cols), 6, 32)
                : existing.map.cols;
            const rows =
              typeof incoming.map.rows === 'number'
                ? clamp(Math.round(incoming.map.rows), 4, 24)
                : existing.map.rows;
            existing.map = {
              ...existing.map,
              ...incoming.map,
              cols,
              rows,
              lighting: normalizeMapLighting(incoming.map.lighting ?? existing.map.lighting, 'bright'),
            };
          }
          // Update player cached locationName
          for (const p of this.state.players) {
            if (p.locationId === existing.id) {
              p.locationName = existing.name;
            }
          }
        } else {
          const newId = makeId('loc');
          const parentLoc = incoming.parentLocationId
            ? this.state.locations.find((l) => l.id === incoming.parentLocationId)
            : null;
          const idx = this.state.locations.length;
          const newLoc: GameLocation = {
            id: newId,
            name: cleanName,
            kind: incoming.kind === 'tactical' ? 'tactical' : 'city',
            description: (incoming.description || '').trim(),
            parentLocationId: parentLoc ? parentLoc.id : null,
            graphX:
              typeof incoming.graphX === 'number'
                ? Math.round(incoming.graphX)
                : parentLoc
                  ? parentLoc.graphX + 240
                  : 220 + (idx % 4) * 240,
            graphY:
              typeof incoming.graphY === 'number'
                ? Math.round(incoming.graphY)
                : parentLoc
                  ? parentLoc.graphY + ((idx % 3) - 1) * 140
                  : 160 + Math.floor(idx / 4) * 180,
            map: {
              imageUrl: incoming.map?.imageUrl ?? null,
              cols: clamp(Math.round(incoming.map?.cols || 16), 6, 32),
              rows: clamp(Math.round(incoming.map?.rows || 9), 4, 24),
              showGrid:
                typeof incoming.map?.showGrid === 'boolean'
                  ? incoming.map.showGrid
                  : incoming.kind === 'tactical',
              gridOpacity:
                typeof incoming.map?.gridOpacity === 'number' ? incoming.map.gridOpacity : 0.25,
              lighting: normalizeMapLighting(incoming.map?.lighting, 'bright'),
            },
            hotspots: parentLoc
              ? [
                  {
                    id: makeId('hs'),
                    label: `Назад: ${parentLoc.name}`,
                    category: 'portal',
                    x: 12,
                    y: 86,
                    targetLocationId: parentLoc.id,
                    description: `Вернуться в «${parentLoc.name}».`,
                    visibleOnTv: true,
                  },
                ]
              : [],
            tokens: [],
          };
          this.state.locations.push(newLoc);
        }

        this.syncActiveLocationView();
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:deleteLocation': {
        if (this.state.locations.length <= 1) return false;
        const exists = this.state.locations.some((l) => l.id === msg.locationId);
        if (!exists) return false;

        this.state.locations = this.state.locations.filter((l) => l.id !== msg.locationId);
        const fallbackLoc = this.state.locations[0];

        // Clean up links pointing to deleted location
        for (const loc of this.state.locations) {
          if (loc.parentLocationId === msg.locationId) {
            loc.parentLocationId = null;
          }
          for (const hs of loc.hotspots) {
            if (hs.targetLocationId === msg.locationId) {
              hs.targetLocationId = null;
            }
          }
        }

        // Relocate any players stationed in deleted location
        this.state.players.forEach((p, idx) => {
          if (p.locationId === msg.locationId) {
            const spawn = getDefaultSpawnPosition(fallbackLoc, idx);
            p.locationId = fallbackLoc.id;
            p.locationName = fallbackLoc.name;
            p.posX = spawn.x;
            p.posY = spawn.y;
          }
        });

        if (this.state.activeLocationId === msg.locationId) {
          this.state.activeLocationId = fallbackLoc.id;
        }

        this.syncActiveLocationView();
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:moveLocationNode': {
        const loc = this.state.locations.find((l) => l.id === msg.locationId);
        if (!loc) return false;
        const nextX = clamp(Math.round(msg.graphX), 20, 2400);
        const nextY = clamp(Math.round(msg.graphY), 20, 1600);
        if (loc.graphX === nextX && loc.graphY === nextY) return false;
        loc.graphX = nextX;
        loc.graphY = nextY;
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:upsertHotspot': {
        const loc = this.state.locations.find((l) => l.id === msg.locationId);
        if (!loc) return false;
        const cleanLabel = msg.hotspot.label.trim();
        if (!cleanLabel) return false;

        const normalized: LocationHotspot = {
          id: msg.hotspot.id || makeId('hs'),
          label: cleanLabel,
          category: msg.hotspot.category || 'other',
          x: roundCoord(clamp(Number(msg.hotspot.x) || 50, 2, 98), false),
          y: roundCoord(clamp(Number(msg.hotspot.y) || 50, 2, 98), false),
          targetLocationId: msg.hotspot.targetLocationId || null,
          description: (msg.hotspot.description || '').trim(),
          visibleOnTv: msg.hotspot.visibleOnTv !== false,
        };

        const idx = loc.hotspots.findIndex((h) => h.id === normalized.id);
        if (idx >= 0) {
          loc.hotspots[idx] = normalized;
        } else {
          loc.hotspots.push(normalized);
        }

        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:deleteHotspot': {
        const loc = this.state.locations.find((l) => l.id === msg.locationId);
        if (!loc) return false;
        const before = loc.hotspots.length;
        loc.hotspots = loc.hotspots.filter((h) => h.id !== msg.hotspotId);
        if (loc.hotspots.length === before) return false;
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:movePlayerToLocation': {
        const player = this.state.players.find((p) => p.id === msg.playerId);
        const targetLoc = this.state.locations.find((l) => l.id === msg.locationId);
        if (!player || !targetLoc) return false;

        const existingInTarget = this.state.players.filter(
          (p) => p.locationId === targetLoc.id && p.id !== player.id
        ).length;
        const spawn = getDefaultSpawnPosition(targetLoc, existingInTarget);
        player.locationId = targetLoc.id;
        player.locationName = targetLoc.name;
        player.posX = spawn.x;
        player.posY = spawn.y;
        if (typeof msg.locationNote === 'string') {
          player.locationNote = msg.locationNote.trim();
        }

        this.syncActiveLocationView();
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'player:requestCharacterCreation': {
        const account = this.state.accounts.find((a) => a.id === msg.accountId);
        if (!account) return false;
        const already = this.state.creationRequests.find((r) => r.accountId === account.id);
        if (already) return false;

        const req: CharacterCreationRequest = {
          id: makeId('req'),
          accountId: account.id,
          accountName: account.name,
          status: 'queued',
          createdAt: Date.now(),
          draft: createEmptyDraft(
            this.state.catalogs,
            this.state.players.length + this.state.creationRequests.length
          ),
        };
        this.state.creationRequests.push(req);
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'player:cancelCharacterCreation': {
        const before = this.state.creationRequests.length;
        this.state.creationRequests = this.state.creationRequests.filter(
          (r) => !(r.id === msg.requestId && r.accountId === msg.accountId)
        );
        if (this.state.creationRequests.length === before) return false;
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:startCreationRequest': {
        const req = this.state.creationRequests.find((r) => r.id === msg.requestId);
        if (!req) return false;
        if (req.status === 'in_progress') return false;
        req.status = 'in_progress';
        for (const ab of this.state.catalogs.abilities) {
          if (!(ab.id in req.draft.abilities)) {
            req.draft.abilities[ab.id] = null;
          }
        }
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:updateCreationDraft': {
        const req = this.state.creationRequests.find((r) => r.id === msg.requestId);
        if (!req) return false;
        const { abilities, ...rest } = msg.patch;
        req.draft = {
          ...req.draft,
          ...rest,
          abilities: abilities
            ? { ...req.draft.abilities, ...abilities }
            : req.draft.abilities,
        };
        if (req.status === 'queued') {
          req.status = 'in_progress';
        }
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:finalizeCreationRequest': {
        const req = this.state.creationRequests.find((r) => r.id === msg.requestId);
        if (!req) return false;
        const cleanName = req.draft.name.trim();
        if (!cleanName) return false;

        const activeLoc = this.getLocationById(this.state.activeLocationId);
        const classId = req.draft.classId || this.state.catalogs.classes[0]?.id || '';
        const classRef = this.state.catalogs.classes.find((c) => c.id === classId);
        const backgroundId = req.draft.backgroundId || this.state.catalogs.backgrounds[0]?.id || '';
        const speciesId = req.draft.speciesId || this.state.catalogs.species[0]?.id || '';
        const safeXp = Math.max(0, Math.floor(Number(req.draft.xp) || 0));
        const derivedLevel = computeLevelFromXp(safeXp, this.state.catalogs.levels);
        const safeMaxHp = Math.max(1, Math.round(Number(req.draft.maxHp) || 10));
        const safeGold = Math.max(0, Math.round(Number(req.draft.gold) || 0));

        const spawn = getDefaultSpawnPosition(
          activeLoc,
          this.state.players.filter((p) => p.locationId === activeLoc.id).length
        );
        const newId = makeId('player');
        const builtAbilities = buildDefaultAbilities(this.state.catalogs, req.draft.abilities);
        const computedAc = computePlayerAc(
          { abilities: builtAbilities, inventory: [] },
          this.state.catalogs
        );
        const computedInit = computePlayerInitiative(builtAbilities, this.state.catalogs);
        const newPlayer: PlayerCharacter = {
          id: newId,
          ownerAccountId: req.accountId,
          name: cleanName,
          role: classRef?.name || 'Без класса',
          classId,
          backgroundId,
          speciesId,
          xp: safeXp,
          level: derivedLevel,
          color: req.draft.color || '#F59E0B',
          hp: safeMaxHp,
          maxHp: safeMaxHp,
          tempHp: 0,
          ac: computedAc,
          initiative: computedInit,
          conditions: [],
          isConnected: false,
          locationId: activeLoc.id,
          locationName: activeLoc.name,
          locationNote: '',
          posX: spawn.x,
          posY: spawn.y,
          gold: safeGold,
          abilities: builtAbilities,
          proficientSkillIds: Array.isArray(req.draft.proficientSkillIds)
            ? [...req.draft.proficientSkillIds]
            : [],
          expertiseSkillIds: Array.isArray(req.draft.expertiseSkillIds)
            ? req.draft.expertiseSkillIds.filter((id) =>
                (req.draft.proficientSkillIds || []).includes(id)
              )
            : [],
          proficiencyIds: Array.isArray(req.draft.proficiencyIds)
            ? [...req.draft.proficiencyIds]
            : [],
          senses: (req.draft.senses || '').trim(),
          visions: normalizeEntityVisions(
            req.draft.visions,
            new Set(this.state.catalogs.visions.map((v) => v.id))
          ),
          inventory: [],
          privateNote: (req.draft.privateNote || '').trim(),
        };

        this.state.players.push(newPlayer);
        this.state.creationRequests = this.state.creationRequests.filter((r) => r.id !== req.id);
        this.syncActiveLocationView();

        this.appendEvent({
          scope: 'public',
          title: `Новый персонаж: ${newPlayer.name}`,
          message: `${req.accountName} создал персонажа ${newPlayer.name} (${newPlayer.role}, Ур. ${newPlayer.level}).`,
          tone: 'reward',
        });

        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:rejectCreationRequest': {
        const before = this.state.creationRequests.length;
        this.state.creationRequests = this.state.creationRequests.filter(
          (r) => r.id !== msg.requestId
        );
        if (this.state.creationRequests.length === before) return false;
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:deleteAccount': {
        const before = this.state.accounts.length;
        this.state.accounts = this.state.accounts.filter((a) => a.id !== msg.accountId);
        if (this.state.accounts.length === before) return false;
        this.state.creationRequests = this.state.creationRequests.filter(
          (r) => r.accountId !== msg.accountId
        );
        for (const p of this.state.players) {
          if (p.ownerAccountId === msg.accountId) {
            p.ownerAccountId = undefined;
          }
        }
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:moveToken': {
        const activeLoc = this.getLocationById(this.state.activeLocationId);
        const snapToGrid = activeLoc.kind === 'tactical';

        // Player token?
        if (msg.tokenId.startsWith('token-player-')) {
          const playerId = msg.tokenId.slice('token-player-'.length);
          const player = this.state.players.find(
            (p) => p.id === playerId && p.locationId === activeLoc.id
          );
          if (!player) return false;
          const maxX = Math.max(0, activeLoc.map.cols - 1);
          const maxY = Math.max(0, activeLoc.map.rows - 1);
          const nextX = clamp(roundCoord(msg.x, snapToGrid), 0, maxX);
          const nextY = clamp(roundCoord(msg.y, snapToGrid), 0, maxY);
          if (player.posX === nextX && player.posY === nextY) return false;
          player.posX = nextX;
          player.posY = nextY;
          this.syncActiveLocationView();
          this.bumpVersion();
          this.scheduleSave();
          return true;
        }

        // Location NPC / Enemy / Object token
        const token = activeLoc.tokens.find((t) => t.id === msg.tokenId);
        if (!token) return false;
        const maxX = Math.max(0, activeLoc.map.cols - token.size);
        const maxY = Math.max(0, activeLoc.map.rows - token.size);
        const nextX = clamp(roundCoord(msg.x, snapToGrid), 0, maxX);
        const nextY = clamp(roundCoord(msg.y, snapToGrid), 0, maxY);
        if (token.x === nextX && token.y === nextY) return false;
        token.x = nextX;
        token.y = nextY;
        this.syncActiveLocationView();
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:upsertToken': {
        const activeLoc = this.getLocationById(this.state.activeLocationId);
        const snapToGrid = activeLoc.kind === 'tactical';
        const incoming = msg.token;
        if (incoming.kind === 'player' && incoming.playerId) {
          const player = this.state.players.find((p) => p.id === incoming.playerId);
          if (!player) return false;
          const maxX = Math.max(0, activeLoc.map.cols - 1);
          const maxY = Math.max(0, activeLoc.map.rows - 1);
          player.posX = clamp(roundCoord(incoming.x, snapToGrid), 0, maxX);
          player.posY = clamp(roundCoord(incoming.y, snapToGrid), 0, maxY);
          this.syncActiveLocationView();
          this.bumpVersion();
          this.scheduleSave();
          return true;
        }

        const size = clamp(Math.round(incoming.size || 1), 1, 4);
        const maxX = Math.max(0, activeLoc.map.cols - size);
        const maxY = Math.max(0, activeLoc.map.rows - size);
        const normalized: MapToken = {
          ...incoming,
          id: incoming.id || makeId('token'),
          x: clamp(roundCoord(incoming.x, snapToGrid), 0, maxX),
          y: clamp(roundCoord(incoming.y, snapToGrid), 0, maxY),
          size,
        };
        const idx = activeLoc.tokens.findIndex((t) => t.id === normalized.id);
        if (idx >= 0) {
          activeLoc.tokens[idx] = normalized;
        } else {
          activeLoc.tokens.push(normalized);
        }
        this.syncActiveLocationView();
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:deleteToken': {
        const activeLoc = this.getLocationById(this.state.activeLocationId);
        const before = activeLoc.tokens.length;
        activeLoc.tokens = activeLoc.tokens.filter((t) => t.id !== msg.tokenId);
        if (activeLoc.tokens.length === before) return false;
        if (this.state.scene.activeTurnTokenId === msg.tokenId) {
          this.state.scene.activeTurnTokenId = null;
        }
        this.syncActiveLocationView();
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:upsertPlayer': {
        const incoming = msg.player;
        const cleanName = incoming.name.trim();
        if (!cleanName) return false;

        const activeLoc = this.getLocationById(this.state.activeLocationId);
        const classId = incoming.classId || this.state.catalogs.classes[0]?.id || '';
        const classRef = this.state.catalogs.classes.find((c) => c.id === classId);
        const backgroundId = incoming.backgroundId || this.state.catalogs.backgrounds[0]?.id || '';
        const speciesId = incoming.speciesId || this.state.catalogs.species[0]?.id || '';
        const safeXp = Math.max(0, Math.floor(Number(incoming.xp) || 0));
        const derivedLevel = computeLevelFromXp(safeXp, this.state.catalogs.levels);

        if (incoming.id) {
          const existing = this.state.players.find((p) => p.id === incoming.id);
          if (!existing) return false;
          existing.name = cleanName;
          existing.ownerAccountId = incoming.ownerAccountId;
          existing.classId = classId;
          existing.role = classRef?.name || incoming.role?.trim() || existing.role;
          existing.backgroundId = backgroundId;
          existing.speciesId = speciesId;
          existing.xp = safeXp;
          existing.level = derivedLevel;
          existing.color = incoming.color || existing.color;
          existing.maxHp = Math.max(1, Math.round(incoming.maxHp || existing.maxHp));
          existing.hp = Math.min(existing.hp, existing.maxHp);
          if (incoming.abilities) {
            existing.abilities = buildDefaultAbilities(this.state.catalogs, incoming.abilities);
            existing.initiative = computePlayerInitiative(existing.abilities, this.state.catalogs);
          }
          if (typeof incoming.initiative === 'number' && Number.isFinite(incoming.initiative)) {
            existing.initiative = Math.round(incoming.initiative);
          }
          existing.ac = computePlayerAc(existing, this.state.catalogs);
          if (Array.isArray(incoming.proficientSkillIds)) {
            existing.proficientSkillIds = incoming.proficientSkillIds;
            existing.expertiseSkillIds = (existing.expertiseSkillIds ?? []).filter((id) =>
              existing.proficientSkillIds.includes(id)
            );
          }
          if (Array.isArray(incoming.expertiseSkillIds)) {
            const cleanExp = Array.from(new Set(incoming.expertiseSkillIds));
            existing.expertiseSkillIds = cleanExp;
            existing.proficientSkillIds = Array.from(
              new Set([...existing.proficientSkillIds, ...cleanExp])
            );
          }
          if (Array.isArray(incoming.proficiencyIds)) {
            existing.proficiencyIds = incoming.proficiencyIds;
          }
          if (typeof incoming.senses === 'string') {
            existing.senses = incoming.senses.trim();
          }
          if (Array.isArray(incoming.visions)) {
            existing.visions = normalizeEntityVisions(
              incoming.visions,
              new Set(this.state.catalogs.visions.map((v) => v.id))
            );
          }
        } else {
          const newId = makeId('player');
          const safeMaxHp = Math.max(1, Math.round(incoming.maxHp || 10));
          const spawn = getDefaultSpawnPosition(
            activeLoc,
            this.state.players.filter((p) => p.locationId === activeLoc.id).length
          );
          const builtAbilities = buildDefaultAbilities(this.state.catalogs, incoming.abilities);
          const computedAc = computePlayerAc(
            { abilities: builtAbilities, inventory: [] },
            this.state.catalogs
          );
          const validVisionIds = new Set(this.state.catalogs.visions.map((v) => v.id));
          const newPlayer: PlayerCharacter = {
            id: newId,
            ownerAccountId: incoming.ownerAccountId || undefined,
            name: cleanName,
            role: classRef?.name || incoming.role?.trim() || 'Без класса',
            classId,
            backgroundId,
            speciesId,
            xp: safeXp,
            level: derivedLevel,
            color: incoming.color || '#F59E0B',
            hp: safeMaxHp,
            maxHp: safeMaxHp,
            tempHp: 0,
            ac: computedAc,
            initiative:
              typeof incoming.initiative === 'number' && Number.isFinite(incoming.initiative)
                ? Math.round(incoming.initiative)
                : computePlayerInitiative(builtAbilities, this.state.catalogs),
            conditions: [],
            isConnected: false,
            locationId: activeLoc.id,
            locationName: activeLoc.name,
            locationNote: '',
            posX: spawn.x,
            posY: spawn.y,
            gold: 0,
            abilities: builtAbilities,
            proficientSkillIds: Array.isArray(incoming.proficientSkillIds)
              ? incoming.proficientSkillIds
              : [],
            expertiseSkillIds: Array.isArray(incoming.expertiseSkillIds)
              ? incoming.expertiseSkillIds
              : [],
            proficiencyIds: Array.isArray(incoming.proficiencyIds) ? incoming.proficiencyIds : [],
            senses: (incoming.senses || '').trim(),
            visions: Array.isArray(incoming.visions)
              ? normalizeEntityVisions(incoming.visions, validVisionIds)
              : validVisionIds.has('normal')
                ? [{ visionId: 'normal', rangeFt: null }]
                : [],
            privateNote: '',
            inventory: [],
          };
          this.state.players.push(newPlayer);
        }
        this.syncActiveLocationView();
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:deletePlayer': {
        const before = this.state.players.length;
        this.state.players = this.state.players.filter((p) => p.id !== msg.playerId);
        if (this.state.players.length === before) return false;
        this.syncActiveLocationView();
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:updateStats': {
        const player = this.state.players.find((p) => p.id === msg.playerId);
        if (!player) return false;

        if ('ownerAccountId' in msg) {
          player.ownerAccountId = msg.ownerAccountId || undefined;
        }
        if (typeof msg.name === 'string' && msg.name.trim()) {
          player.name = msg.name.trim();
        }
        if (typeof msg.color === 'string' && msg.color) {
          player.color = msg.color;
        }
        if (typeof msg.classId === 'string') {
          player.classId = msg.classId;
          const classRef = this.state.catalogs.classes.find((c) => c.id === msg.classId);
          player.role = classRef?.name || 'Без класса';
        }
        if (typeof msg.backgroundId === 'string') {
          player.backgroundId = msg.backgroundId;
        }
        if (typeof msg.speciesId === 'string') {
          player.speciesId = msg.speciesId;
        }
        if (typeof msg.xp === 'number' && Number.isFinite(msg.xp)) {
          player.xp = Math.max(0, Math.floor(msg.xp));
          player.level = computeLevelFromXp(player.xp, this.state.catalogs.levels);
        }
        if (typeof msg.maxHp === 'number') {
          player.maxHp = Math.max(1, Math.round(msg.maxHp));
          player.hp = Math.min(player.hp, player.maxHp);
        }
        if (typeof msg.hp === 'number') {
          player.hp = Math.max(0, Math.min(player.maxHp, Math.round(msg.hp)));
        }
        if (typeof msg.tempHp === 'number') {
          player.tempHp = Math.max(0, Math.round(msg.tempHp));
        }
        if (typeof msg.ac === 'number') {
          player.ac = Math.max(1, Math.round(msg.ac));
        }
        if (typeof msg.initiative === 'number' && Number.isFinite(msg.initiative)) {
          player.initiative = Math.max(-10, Math.min(50, Math.round(msg.initiative)));
        }
        if (typeof msg.gold === 'number') {
          player.gold = Math.max(0, Math.round(msg.gold));
        }
        if (Array.isArray(msg.conditions)) {
          player.conditions = msg.conditions;
        }
        if (typeof msg.privateNote === 'string') {
          player.privateNote = msg.privateNote;
        }
        if (typeof msg.locationNote === 'string') {
          player.locationNote = msg.locationNote;
        }
        if (typeof msg.locationId === 'string') {
          const targetLoc = this.state.locations.find((l) => l.id === msg.locationId);
          if (targetLoc && player.locationId !== targetLoc.id) {
            const countInTarget = this.state.players.filter(
              (p) => p.locationId === targetLoc.id && p.id !== player.id
            ).length;
            const spawn = getDefaultSpawnPosition(targetLoc, countInTarget);
            player.locationId = targetLoc.id;
            player.locationName = targetLoc.name;
            player.posX = spawn.x;
            player.posY = spawn.y;
          }
        }
        if (msg.abilities && typeof msg.abilities === 'object') {
          player.abilities = {
            ...player.abilities,
            ...Object.fromEntries(
              Object.entries(msg.abilities).map(([k, v]) => [
                k,
                Math.max(1, Math.min(30, Math.round(Number(v) || 10))),
              ])
            ),
          };
          if (typeof msg.initiative !== 'number') {
            player.initiative = computePlayerInitiative(player.abilities, this.state.catalogs);
          }
        }
        player.ac = computePlayerAc(player, this.state.catalogs);
        if (Array.isArray(msg.proficientSkillIds)) {
          player.proficientSkillIds = msg.proficientSkillIds;
          player.expertiseSkillIds = (player.expertiseSkillIds ?? []).filter((id) =>
            player.proficientSkillIds.includes(id)
          );
        }
        if (Array.isArray(msg.expertiseSkillIds)) {
          const cleanExp = Array.from(new Set(msg.expertiseSkillIds));
          player.expertiseSkillIds = cleanExp;
          player.proficientSkillIds = Array.from(
            new Set([...player.proficientSkillIds, ...cleanExp])
          );
        }
        if (Array.isArray(msg.proficiencyIds)) {
          player.proficiencyIds = msg.proficiencyIds;
        }
        if (typeof msg.senses === 'string') {
          player.senses = msg.senses;
        }
        if (Array.isArray(msg.visions)) {
          player.visions = normalizeEntityVisions(
            msg.visions,
            new Set(this.state.catalogs.visions.map((v) => v.id))
          );
        }
        this.syncActiveLocationView();
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:addInventoryItem': {
        const player = this.state.players.find((p) => p.id === msg.playerId);
        if (!player) return false;
        const name = msg.item.name.trim();
        if (!name) return false;
        const qty = Math.max(1, Math.round(msg.item.quantity || 1));

        const existingSame = player.inventory.find(
          (i) => i.name.toLowerCase() === name.toLowerCase() && i.category === msg.item.category
        );
        if (existingSame) {
          existingSame.quantity += qty;
          if (msg.item.description) existingSame.description = msg.item.description;
          if (msg.item.catalogItemId) existingSame.catalogItemId = msg.item.catalogItemId;
          if (msg.item.weaponCategory) existingSame.weaponCategory = msg.item.weaponCategory;
          if (msg.item.weaponRangeType) existingSame.weaponRangeType = msg.item.weaponRangeType;
          if (typeof msg.item.reachFt === 'number') existingSame.reachFt = msg.item.reachFt;
          if (typeof msg.item.rangeNormalFt === 'number') existingSame.rangeNormalFt = msg.item.rangeNormalFt;
          if (typeof msg.item.rangeMaxFt === 'number') existingSame.rangeMaxFt = msg.item.rangeMaxFt;
          if (msg.item.armorCategory) existingSame.armorCategory = msg.item.armorCategory;
          if (msg.item.damage) existingSame.damage = msg.item.damage;
          if (msg.item.properties) existingSame.properties = msg.item.properties;
          if (msg.item.mastery) existingSame.mastery = msg.item.mastery;
          if (typeof msg.item.acBase === 'number') existingSame.acBase = msg.item.acBase;
          if (msg.item.acAbilityId !== undefined) existingSame.acAbilityId = msg.item.acAbilityId;
          if (msg.item.acMaxBonus !== undefined) existingSame.acMaxBonus = msg.item.acMaxBonus;
          if (msg.item.armorClass) existingSame.armorClass = msg.item.armorClass;
          if (msg.item.strengthReq) existingSame.strengthReq = msg.item.strengthReq;
          if (msg.item.stealth) existingSame.stealth = msg.item.stealth;
          if (msg.item.weight) existingSame.weight = msg.item.weight;
          if (msg.item.price) existingSame.price = msg.item.price;
        } else {
          player.inventory.unshift({
            id: makeId('item'),
            name,
            quantity: qty,
            category: msg.item.category || 'gear',
            description: msg.item.description || '',
            equipped: Boolean(msg.item.equipped),
            catalogItemId: msg.item.catalogItemId,
            weaponCategory: msg.item.weaponCategory,
            weaponRangeType: msg.item.weaponRangeType,
            reachFt: msg.item.reachFt,
            rangeNormalFt: msg.item.rangeNormalFt,
            rangeMaxFt: msg.item.rangeMaxFt,
            armorCategory: msg.item.armorCategory,
            damage: msg.item.damage,
            properties: msg.item.properties,
            mastery: msg.item.mastery,
            acBase: msg.item.acBase,
            acAbilityId: msg.item.acAbilityId,
            acMaxBonus: msg.item.acMaxBonus,
            armorClass: msg.item.armorClass,
            strengthReq: msg.item.strengthReq,
            stealth: msg.item.stealth,
            weight: msg.item.weight,
            price: msg.item.price,
          });
        }
        player.ac = computePlayerAc(player, this.state.catalogs);

        this.appendEvent({
          scope: 'private',
          targetPlayerId: player.id,
          title: 'Получен предмет',
          message: `В инвентарь добавлено: ${name} (×${qty})`,
          tone: 'reward',
        });

        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:updateInventoryItem': {
        const player = this.state.players.find((p) => p.id === msg.playerId);
        if (!player) return false;
        const item = player.inventory.find((i) => i.id === msg.itemId);
        if (!item) return false;
        if (typeof msg.patch.name === 'string' && msg.patch.name.trim())
          item.name = msg.patch.name.trim();
        if (typeof msg.patch.quantity === 'number')
          item.quantity = Math.max(1, Math.round(msg.patch.quantity));
        if (typeof msg.patch.description === 'string') item.description = msg.patch.description;
        if (typeof msg.patch.equipped === 'boolean') item.equipped = msg.patch.equipped;
        if (msg.patch.category) item.category = msg.patch.category;
        if (typeof msg.patch.reachFt === 'number') item.reachFt = msg.patch.reachFt;
        if (typeof msg.patch.rangeNormalFt === 'number') item.rangeNormalFt = msg.patch.rangeNormalFt;
        if (typeof msg.patch.rangeMaxFt === 'number') item.rangeMaxFt = msg.patch.rangeMaxFt;
        player.ac = computePlayerAc(player, this.state.catalogs);
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:removeInventoryItem': {
        const player = this.state.players.find((p) => p.id === msg.playerId);
        if (!player) return false;
        const before = player.inventory.length;
        player.inventory = player.inventory.filter((i) => i.id !== msg.itemId);
        if (player.inventory.length === before) return false;
        player.ac = computePlayerAc(player, this.state.catalogs);
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:setScene': {
        this.state.scene = {
          ...this.state.scene,
          ...msg.patch,
        };
        if (typeof msg.patch.locationName === 'string' && msg.patch.locationName.trim()) {
          const activeLoc = this.getLocationById(this.state.activeLocationId);
          activeLoc.name = msg.patch.locationName.trim();
          for (const p of this.state.players) {
            if (p.locationId === activeLoc.id) {
              p.locationName = activeLoc.name;
            }
          }
        }
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:triggerEvent': {
        const title = msg.title.trim();
        const message = msg.message.trim();
        if (!title && !message) return false;
        const now = Date.now();
        this.appendEvent({
          scope: msg.scope,
          targetPlayerId: msg.targetPlayerId,
          title: title || 'Игровое событие',
          message,
          tone: msg.tone || 'neutral',
        });
        if (msg.scope === 'public' && msg.showBannerOnTv !== false) {
          this.state.scene.activeEvent = {
            id: makeId('banner'),
            title: title || 'Событие',
            description: message,
            tone: msg.tone || 'neutral',
            timestamp: now,
          };
        }
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:clearBanner': {
        if (!this.state.scene.activeEvent) return false;
        this.state.scene.activeEvent = null;
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:updateMap': {
        const targetLoc = this.getLocationById(msg.locationId || this.state.activeLocationId);
        const nextCols =
          typeof msg.patch.cols === 'number'
            ? clamp(Math.round(msg.patch.cols), 6, 32)
            : targetLoc.map.cols;
        const nextRows =
          typeof msg.patch.rows === 'number'
            ? clamp(Math.round(msg.patch.rows), 4, 24)
            : targetLoc.map.rows;
        targetLoc.map = {
          ...targetLoc.map,
          ...msg.patch,
          cols: nextCols,
          rows: nextRows,
          lighting: normalizeMapLighting(msg.patch.lighting ?? targetLoc.map.lighting, 'bright'),
        };
        targetLoc.tokens = targetLoc.tokens.map((t) => ({
          ...t,
          x: clamp(t.x, 0, Math.max(0, nextCols - t.size)),
          y: clamp(t.y, 0, Math.max(0, nextRows - t.size)),
        }));
        for (const p of this.state.players) {
          if (p.locationId === targetLoc.id) {
            p.posX = clamp(p.posX, 0, Math.max(0, nextCols - 1));
            p.posY = clamp(p.posY, 0, Math.max(0, nextRows - 1));
          }
        }
        this.syncActiveLocationView();
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:upsertCatalogItem': {
        let shouldRecomputeInit = false;
        if (msg.catalog === 'abilities') {
          const cleanName = msg.item.name.trim();
          if (!cleanName) return false;
          const normalized = {
            id: msg.item.id || makeId('ab'),
            name: cleanName,
            shortName: (msg.item.shortName || cleanName.slice(0, 3)).trim().toUpperCase(),
            description: (msg.item.description || '').trim(),
          };
          const list = this.state.catalogs.abilities;
          const idx = list.findIndex((x) => x.id === normalized.id);
          if (idx >= 0) list[idx] = normalized;
          else list.push(normalized);
        } else if (msg.catalog === 'abilityModifiers') {
          const rawMin = clamp(Math.round(Number(msg.item.minScore) || 1), 1, 30);
          const rawMax = clamp(Math.round(Number(msg.item.maxScore) || rawMin), 1, 30);
          const minScore = Math.min(rawMin, rawMax);
          const maxScore = Math.max(rawMin, rawMax);
          const modifier = clamp(Math.round(Number(msg.item.modifier) || 0), -10, 15);
          const normalized = {
            id: msg.item.id || makeId('mod'),
            minScore,
            maxScore,
            modifier,
          };
          const list = this.state.catalogs.abilityModifiers;
          const idx = list.findIndex((x) => x.id === normalized.id);
          if (idx >= 0) list[idx] = normalized;
          else list.push(normalized);
          this.state.catalogs.abilityModifiers = sortAbilityModifiers(list);
          shouldRecomputeInit = true;
        } else if (msg.catalog === 'classes') {
          const cleanName = msg.item.name.trim();
          if (!cleanName) return false;
          const normalized = {
            id: msg.item.id || makeId('cls'),
            name: cleanName,
            description: (msg.item.description || '').trim(),
          };
          const list = this.state.catalogs.classes;
          const idx = list.findIndex((x) => x.id === normalized.id);
          if (idx >= 0) list[idx] = normalized;
          else list.push(normalized);
        } else if (msg.catalog === 'backgrounds') {
          const cleanName = msg.item.name.trim();
          if (!cleanName) return false;
          const normalized = {
            id: msg.item.id || makeId('bg'),
            name: cleanName,
            description: (msg.item.description || '').trim(),
          };
          const list = this.state.catalogs.backgrounds;
          const idx = list.findIndex((x) => x.id === normalized.id);
          if (idx >= 0) list[idx] = normalized;
          else list.push(normalized);
        } else if (msg.catalog === 'species') {
          const cleanName = msg.item.name.trim();
          if (!cleanName) return false;
          const normalized = {
            id: msg.item.id || makeId('sp'),
            name: cleanName,
            description: (msg.item.description || '').trim(),
          };
          const list = this.state.catalogs.species;
          const idx = list.findIndex((x) => x.id === normalized.id);
          if (idx >= 0) list[idx] = normalized;
          else list.push(normalized);
        } else if (msg.catalog === 'levels') {
          const levelNum = Math.max(1, Math.round(Number(msg.item.level) || 1));
          const minXp = Math.max(0, Math.floor(Number(msg.item.minXp) || 0));
          const normalized = {
            id: msg.item.id || makeId('lvl'),
            level: levelNum,
            minXp,
          };
          const list = this.state.catalogs.levels;
          const idx = list.findIndex((x) => x.id === normalized.id);
          if (idx >= 0) list[idx] = normalized;
          else list.push(normalized);
          this.state.catalogs.levels = sortLevels(list);
        } else if (msg.catalog === 'skills') {
          const cleanName = msg.item.name.trim();
          if (!cleanName) return false;
          const fallbackAbility = this.state.catalogs.abilities[0]?.id ?? '';
          const normalized = {
            id: msg.item.id || makeId('skl'),
            name: cleanName,
            abilityId: msg.item.abilityId || fallbackAbility,
            usageExample: (msg.item.usageExample || '').trim(),
          };
          const list = this.state.catalogs.skills;
          const idx = list.findIndex((x) => x.id === normalized.id);
          if (idx >= 0) list[idx] = normalized;
          else list.push(normalized);
        } else if (msg.catalog === 'proficiencies') {
          const cleanName = msg.item.name.trim();
          if (!cleanName) return false;
          const normalized = {
            id: msg.item.id || makeId('prof'),
            name: cleanName,
            category: msg.item.category || 'other',
            description: (msg.item.description || '').trim(),
          };
          const list = this.state.catalogs.proficiencies;
          const idx = list.findIndex((x) => x.id === normalized.id);
          if (idx >= 0) list[idx] = normalized;
          else list.push(normalized);
        } else if (msg.catalog === 'visions') {
          const cleanName = msg.item.name.trim();
          if (!cleanName) return false;
          const normalized = {
            id: msg.item.id || makeId('vis'),
            name: cleanName,
            behavior: normalizeVisionBehavior(msg.item.behavior),
            description: (msg.item.description || '').trim(),
          };
          const list = this.state.catalogs.visions;
          const idx = list.findIndex((x) => x.id === normalized.id);
          if (idx >= 0) list[idx] = normalized;
          else list.push(normalized);
        } else if (msg.catalog === 'weapons') {
          const cleanName = msg.item.name.trim();
          if (!cleanName) return false;
          const rangeType = msg.item.rangeType === 'ranged' ? ('ranged' as const) : ('melee' as const);
          const inferred = inferWeaponReachRange(rangeType, msg.item.properties);
          const reachFt =
            rangeType === 'melee'
              ? clamp(
                  Math.round(
                    typeof msg.item.reachFt === 'number' && Number.isFinite(msg.item.reachFt) && msg.item.reachFt >= 0
                      ? msg.item.reachFt
                      : inferred.reachFt ?? 5
                  ),
                  0,
                  100
                )
              : undefined;
          const rangeNormalFt =
            rangeType === 'ranged'
              ? clamp(
                  Math.round(
                    typeof msg.item.rangeNormalFt === 'number' &&
                      Number.isFinite(msg.item.rangeNormalFt) &&
                      msg.item.rangeNormalFt >= 0
                      ? msg.item.rangeNormalFt
                      : inferred.rangeNormalFt ?? 80
                  ),
                  0,
                  2000
                )
              : undefined;
          const rangeMaxFt =
            rangeType === 'ranged'
              ? clamp(
                  Math.max(
                    rangeNormalFt ?? 0,
                    Math.round(
                      typeof msg.item.rangeMaxFt === 'number' &&
                        Number.isFinite(msg.item.rangeMaxFt) &&
                        msg.item.rangeMaxFt >= 0
                        ? msg.item.rangeMaxFt
                        : inferred.rangeMaxFt ?? (rangeNormalFt ?? 80) * 4
                    )
                  ),
                  0,
                  4000
                )
              : undefined;
          const normalized = {
            id: msg.item.id || makeId('wpn'),
            category: msg.item.category === 'martial' ? ('martial' as const) : ('simple' as const),
            rangeType,
            name: cleanName,
            damage: (msg.item.damage || '').trim(),
            reachFt,
            rangeNormalFt,
            rangeMaxFt,
            properties: (msg.item.properties || '').trim(),
            mastery: (msg.item.mastery || '').trim(),
            weight: (msg.item.weight || '').trim(),
            price: (msg.item.price || '').trim(),
          };
          const list = this.state.catalogs.weapons;
          const idx = list.findIndex((x) => x.id === normalized.id);
          if (idx >= 0) list[idx] = normalized;
          else list.push(normalized);
        } else if (msg.catalog === 'armors') {
          const cleanName = msg.item.name.trim();
          if (!cleanName) return false;
          const cat: ArmorCategory =
            msg.item.category === 'shield'
              ? 'shield'
              : msg.item.category === 'heavy'
                ? 'heavy'
                : msg.item.category === 'medium'
                  ? 'medium'
                  : 'light';
          const acBase = clamp(Math.round(Number(msg.item.acBase) || (cat === 'shield' ? 2 : 10)), 0, 30);
          const acAbilityId = msg.item.acAbilityId ? String(msg.item.acAbilityId) : null;
          const acMaxBonus =
            acAbilityId && typeof msg.item.acMaxBonus === 'number' && Number.isFinite(msg.item.acMaxBonus)
              ? clamp(Math.round(msg.item.acMaxBonus), 0, 20)
              : null;
          const armorClass = formatArmorClassFormula(
            { category: cat, acBase, acAbilityId, acMaxBonus },
            this.state.catalogs.abilities
          );
          const normalized = {
            id: msg.item.id || makeId('arm'),
            category: cat,
            name: cleanName,
            acBase,
            acAbilityId,
            acMaxBonus,
            armorClass,
            strengthReq: (msg.item.strengthReq || '—').trim() || '—',
            stealth: (msg.item.stealth || '—').trim() || '—',
            weight: (msg.item.weight || '').trim(),
            price: (msg.item.price || '').trim(),
          };
          const list = this.state.catalogs.armors;
          const idx = list.findIndex((x) => x.id === normalized.id);
          if (idx >= 0) list[idx] = normalized;
          else list.push(normalized);
        } else if (msg.catalog === 'monsters') {
          const cleanName = msg.item.name.trim();
          if (!cleanName) return false;
          const builtAbilities = buildDefaultAbilities(this.state.catalogs, msg.item.abilities);
          const normalizedTraits = Array.isArray(msg.item.traits)
            ? msg.item.traits
                .filter((tr) => tr && tr.name && tr.name.trim())
                .map((tr) => ({
                  id: tr.id || makeId('trt'),
                  name: tr.name.trim(),
                  description: (tr.description || '').trim(),
                }))
            : [];
          const normalizedActions = Array.isArray(msg.item.actions)
            ? msg.item.actions
                .filter((act) => act && act.name && act.name.trim())
                .map((act) => {
                  const attackType =
                    act.attackType === 'melee' || act.attackType === 'ranged'
                      ? act.attackType
                      : null;
                  const reachFt =
                    attackType === 'melee' &&
                    typeof act.reachFt === 'number' &&
                    Number.isFinite(act.reachFt) &&
                    act.reachFt >= 0
                      ? clamp(Math.round(act.reachFt), 0, 200)
                      : null;
                  const rangeNormalFt =
                    attackType === 'ranged' &&
                    typeof act.rangeNormalFt === 'number' &&
                    Number.isFinite(act.rangeNormalFt) &&
                    act.rangeNormalFt >= 0
                      ? clamp(Math.round(act.rangeNormalFt), 0, 2000)
                      : null;
                  const rangeMaxFt =
                    attackType === 'ranged' &&
                    typeof act.rangeMaxFt === 'number' &&
                    Number.isFinite(act.rangeMaxFt) &&
                    act.rangeMaxFt >= 0
                      ? clamp(Math.max(rangeNormalFt ?? 0, Math.round(act.rangeMaxFt)), 0, 4000)
                      : null;
                  return {
                    id: act.id || makeId('act'),
                    name: act.name.trim(),
                    description: (act.description || '').trim(),
                    attackType,
                    reachFt,
                    rangeNormalFt,
                    rangeMaxFt,
                  };
                })
            : [];
          const list = this.state.catalogs.monsters;
          const existingMonster = msg.item.id ? list.find((x) => x.id === msg.item.id) : undefined;
          const portraitUrl =
            msg.item.portraitUrl !== undefined
              ? msg.item.portraitUrl
              : existingMonster?.portraitUrl ?? null;
          const validVisionIds = new Set(this.state.catalogs.visions.map((v) => v.id));
          const normalized = {
            id: msg.item.id || makeId('mon'),
            name: cleanName,
            ac: clamp(Math.round(Number(msg.item.ac) || 10), 1, 40),
            maxHp: Math.max(1, Math.round(Number(msg.item.maxHp) || 1)),
            hpFormula: (msg.item.hpFormula || '').trim() || undefined,
            initiative: clamp(
              Math.round(
                typeof msg.item.initiative === 'number' && Number.isFinite(msg.item.initiative)
                  ? msg.item.initiative
                  : computePlayerInitiative(builtAbilities, this.state.catalogs)
              ),
              -10,
              50
            ),
            speed: clamp(Math.round(Number(msg.item.speed) || 30), 0, 300),
            abilities: builtAbilities,
            proficientSkillIds: Array.from(
              new Set([
                ...(Array.isArray(msg.item.proficientSkillIds) ? msg.item.proficientSkillIds : []),
                ...(Array.isArray(msg.item.expertiseSkillIds) ? msg.item.expertiseSkillIds : []),
              ])
            ),
            expertiseSkillIds: Array.isArray(msg.item.expertiseSkillIds)
              ? Array.from(new Set(msg.item.expertiseSkillIds))
              : [],
            immunities: (msg.item.immunities || '').trim() || undefined,
            resistances: (msg.item.resistances || '').trim() || undefined,
            senses: (msg.item.senses || '').trim() || undefined,
            visions: normalizeEntityVisions(msg.item.visions, validVisionIds),
            traits: normalizedTraits,
            xpReward: Math.max(0, Math.floor(Number(msg.item.xpReward) || 0)),
            actions: normalizedActions,
            portraitUrl,
          };
          const idx = list.findIndex((x) => x.id === normalized.id);
          if (idx >= 0) list[idx] = normalized;
          else list.push(normalized);
        } else {
          return false;
        }

        this.syncPlayersDerivedFields(shouldRecomputeInit);
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:deleteCatalogItem': {
        const key: CatalogKey = msg.catalog;
        const list = this.state.catalogs[key] as Array<{ id: string }>;
        if (!Array.isArray(list)) return false;
        const before = list.length;
        const next = list.filter((item) => item.id !== msg.itemId);
        if (next.length === before) return false;

        (this.state.catalogs as unknown as Record<string, unknown>)[key] = next;

        if (key === 'abilities') {
          const fallbackAbility = this.state.catalogs.abilities[0]?.id ?? '';
          for (const skill of this.state.catalogs.skills) {
            if (skill.abilityId === msg.itemId) skill.abilityId = fallbackAbility;
          }
          for (const p of this.state.players) {
            delete p.abilities[msg.itemId];
          }
          for (const req of this.state.creationRequests) {
            delete req.draft.abilities[msg.itemId];
          }
        } else if (key === 'skills') {
          for (const p of this.state.players) {
            p.proficientSkillIds = p.proficientSkillIds.filter((id) => id !== msg.itemId);
            p.expertiseSkillIds = (p.expertiseSkillIds ?? []).filter((id) => id !== msg.itemId);
          }
          for (const req of this.state.creationRequests) {
            req.draft.proficientSkillIds = req.draft.proficientSkillIds.filter(
              (id) => id !== msg.itemId
            );
            req.draft.expertiseSkillIds = (req.draft.expertiseSkillIds ?? []).filter(
              (id) => id !== msg.itemId
            );
          }
          for (const m of this.state.catalogs.monsters) {
            m.proficientSkillIds = m.proficientSkillIds.filter((id) => id !== msg.itemId);
            m.expertiseSkillIds = (m.expertiseSkillIds ?? []).filter((id) => id !== msg.itemId);
          }
        } else if (key === 'proficiencies') {
          for (const p of this.state.players) {
            p.proficiencyIds = p.proficiencyIds.filter((id) => id !== msg.itemId);
          }
          for (const req of this.state.creationRequests) {
            req.draft.proficiencyIds = req.draft.proficiencyIds.filter((id) => id !== msg.itemId);
          }
        } else if (key === 'visions') {
          for (const p of this.state.players) {
            p.visions = (p.visions ?? []).filter((v) => v.visionId !== msg.itemId);
          }
          for (const req of this.state.creationRequests) {
            req.draft.visions = (req.draft.visions ?? []).filter((v) => v.visionId !== msg.itemId);
          }
          for (const m of this.state.catalogs.monsters) {
            m.visions = (m.visions ?? []).filter((v) => v.visionId !== msg.itemId);
          }
        } else if (key === 'classes') {
          const fallbackClass = this.state.catalogs.classes[0]?.id ?? '';
          for (const p of this.state.players) {
            if (p.classId === msg.itemId) p.classId = fallbackClass;
          }
        } else if (key === 'backgrounds') {
          const fallbackBg = this.state.catalogs.backgrounds[0]?.id ?? '';
          for (const p of this.state.players) {
            if (p.backgroundId === msg.itemId) p.backgroundId = fallbackBg;
          }
        } else if (key === 'species') {
          const fallbackSp = this.state.catalogs.species[0]?.id ?? '';
          for (const p of this.state.players) {
            if (p.speciesId === msg.itemId) p.speciesId = fallbackSp;
          }
        }

        this.syncPlayersDerivedFields(key === 'abilityModifiers');
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:resetCatalogs': {
        this.state.catalogs = createDefaultCatalogs();
        this.syncPlayersDerivedFields(true);
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'dm:resetSession': {
        this.state = createDefaultState();
        this.writeToDiskImmediate(this.state);
        return true;
      }

      case 'player:toggleEquip': {
        const player = this.state.players.find((p) => p.id === msg.playerId);
        if (!player) return false;
        const item = player.inventory.find((i) => i.id === msg.itemId);
        if (!item) return false;
        item.equipped = !item.equipped;
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      case 'player:useConsumable': {
        const player = this.state.players.find((p) => p.id === msg.playerId);
        if (!player) return false;
        const item = player.inventory.find((i) => i.id === msg.itemId);
        if (!item) return false;
        const usedName = item.name;
        if (item.quantity > 1) {
          item.quantity -= 1;
        } else {
          player.inventory = player.inventory.filter((i) => i.id !== msg.itemId);
        }
        this.appendEvent({
          scope: 'public',
          title: `${player.name} использовал предмет`,
          message: `Использовано: ${usedName}`,
          tone: 'neutral',
        });
        this.bumpVersion();
        this.scheduleSave();
        return true;
      }

      default:
        return false;
    }
  }
}
