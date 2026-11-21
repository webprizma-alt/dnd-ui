import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Clock,
  Compass,
  Eye,
  EyeOff,
  GitBranch,
  Grid3X3,
  ImagePlus,
  Map as MapIcon,
  MapPin,
  Moon,
  Music,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Sunset,
  Swords,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { getMapLightingDescription } from '../../shared/catalogDefaults';
import type {
  GameLocation,
  HotspotCategory,
  LocationHotspot,
  LocationKind,
  MapLighting,
} from '../../shared/types';
import {
  getHotspotCategoryLabel,
  HotspotIcon,
  TacticalMap,
} from '../components/TacticalMap';
import { useGameSocket } from '../useGameSocket';

interface LocationsViewProps {
  onNavigate: (path: string) => void;
}

type EditorMode = 'graph' | 'map';

const HOTSPOT_CATEGORIES: HotspotCategory[] = [
  'tavern',
  'board',
  'armory',
  'barracks',
  'inn',
  'dungeon',
  'portal',
  'other',
];

const NODE_WIDTH = 216;
const NODE_HEIGHT = 96;

export function LocationsView({ onNavigate }: LocationsViewProps) {
  const { status, dmState, send } = useGameSocket({ role: 'dm' });
  const [editorMode, setEditorMode] = useState<EditorMode>('graph');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [audioUploadError, setAudioUploadError] = useState<string | null>(null);
  const [uploadingSplashAudio, setUploadingSplashAudio] = useState(false);
  const [splashAudioError, setSplashAudioError] = useState<string | null>(null);

  // New location quick creator modal
  const [showNewLocation, setShowNewLocation] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocKind, setNewLocKind] = useState<LocationKind>('city');
  const [newLocParentId, setNewLocParentId] = useState<string>('');
  const [newLocDesc, setNewLocDesc] = useState('');
  const [newLocCols, setNewLocCols] = useState(16);
  const [newLocRows, setNewLocRows] = useState(9);
  const [newLocTimeOfDay, setNewLocTimeOfDay] = useState(false);
  const pendingCreatedNameRef = useRef<string | null>(null);
  const prevLocationIdsRef = useRef<Set<string>>(new Set());

  // Selected location form drafts
  const [locNameDraft, setLocNameDraft] = useState('');
  const [locDescDraft, setLocDescDraft] = useState('');

  // Hotspot form drafts
  const [hsLabelDraft, setHsLabelDraft] = useState('');
  const [hsCategoryDraft, setHsCategoryDraft] = useState<HotspotCategory>('tavern');
  const [hsTargetIdDraft, setHsTargetIdDraft] = useState('');
  const [hsDescDraft, setHsDescDraft] = useState('');
  const [hsVisibleDraft, setHsVisibleDraft] = useState(true);

  // Mind-Map drag state
  const graphRef = useRef<HTMLDivElement | null>(null);
  const [nodeDrag, setNodeDrag] = useState<{
    id: string;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const locationAudioInputRef = useRef<HTMLInputElement | null>(null);
  const splashAudioInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!dmState) return;
    if (pendingCreatedNameRef.current) {
      const newlyAdded = dmState.locations.find(
        (l) => !prevLocationIdsRef.current.has(l.id) && l.name === pendingCreatedNameRef.current
      );
      if (newlyAdded) {
        pendingCreatedNameRef.current = null;
        setSelectedLocationId(newlyAdded.id);
        setSelectedHotspotId(null);
      }
    }
    prevLocationIdsRef.current = new Set(dmState.locations.map((l) => l.id));

    if (!selectedLocationId || !dmState.locations.some((l) => l.id === selectedLocationId)) {
      setSelectedLocationId(dmState.activeLocationId || dmState.locations[0]?.id || '');
    }
  }, [dmState, selectedLocationId]);

  useEffect(() => {
    if (!showNewLocation) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowNewLocation(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showNewLocation]);

  const selectedLocation: GameLocation | null = useMemo(() => {
    if (!dmState) return null;
    return dmState.locations.find((l) => l.id === selectedLocationId) ?? dmState.locations[0] ?? null;
  }, [dmState, selectedLocationId]);

  const selectedHotspot: LocationHotspot | null = useMemo(() => {
    if (!selectedLocation || !selectedHotspotId) return null;
    return selectedLocation.hotspots.find((h) => h.id === selectedHotspotId) ?? null;
  }, [selectedLocation, selectedHotspotId]);

  useEffect(() => {
    if (selectedLocation) {
      setLocNameDraft(selectedLocation.name);
      setLocDescDraft(selectedLocation.description);
    }
  }, [selectedLocation?.id, selectedLocation?.name, selectedLocation?.description]);

  useEffect(() => {
    if (selectedHotspot) {
      setHsLabelDraft(selectedHotspot.label);
      setHsCategoryDraft(selectedHotspot.category);
      setHsTargetIdDraft(selectedHotspot.targetLocationId || '');
      setHsDescDraft(selectedHotspot.description);
      setHsVisibleDraft(selectedHotspot.visibleOnTv);
    }
  }, [selectedHotspot?.id, selectedHotspot?.label, selectedHotspot?.category, selectedHotspot?.targetLocationId, selectedHotspot?.description, selectedHotspot?.visibleOnTv]);

  // Build Mind-Map transition edges from hotspots + parentLocationId
  const graphEdges = useMemo(() => {
    if (!dmState) return [];
    const edges: Array<{
      key: string;
      from: GameLocation;
      to: GameLocation;
      label: string;
      kind: 'hotspot' | 'parent';
    }> = [];
    const seenPairs = new Set<string>();

    for (const loc of dmState.locations) {
      for (const hs of loc.hotspots) {
        if (!hs.targetLocationId) continue;
        const target = dmState.locations.find((l) => l.id === hs.targetLocationId);
        if (!target || target.id === loc.id) continue;
        const pairKey = [loc.id, target.id].sort().join('::');
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);
        edges.push({
          key: `${loc.id}-${hs.id}`,
          from: loc,
          to: target,
          label: hs.label,
          kind: 'hotspot',
        });
      }
    }

    for (const loc of dmState.locations) {
      if (!loc.parentLocationId) continue;
      const parent = dmState.locations.find((l) => l.id === loc.parentLocationId);
      if (!parent || parent.id === loc.id) continue;
      const pairKey = [parent.id, loc.id].sort().join('::');
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);
      edges.push({
        key: `parent-${parent.id}-${loc.id}`,
        from: parent,
        to: loc,
        label: '',
        kind: 'parent',
      });
    }

    return edges;
  }, [dmState]);

  if (!dmState || !selectedLocation) {
    return (
      <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="text-base font-medium text-slate-200">Загрузка карты мира...</p>
          <p className="text-sm text-slate-400">Подключение к игровому серверу</p>
        </div>
      </div>
    );
  }

  const getNodePos = (loc: GameLocation) => {
    if (nodeDrag && nodeDrag.id === loc.id) {
      return { x: nodeDrag.x, y: nodeDrag.y };
    }
    return { x: loc.graphX, y: loc.graphY };
  };

  const handleNodePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    loc: GameLocation
  ) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const container = graphRef.current;
    if (!container) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = container.getBoundingClientRect();
    const pointerX = e.clientX - rect.left + container.scrollLeft;
    const pointerY = e.clientY - rect.top + container.scrollTop;
    setSelectedLocationId(loc.id);
    setSelectedHotspotId(null);
    setNodeDrag({
      id: loc.id,
      x: loc.graphX,
      y: loc.graphY,
      offsetX: pointerX - loc.graphX,
      offsetY: pointerY - loc.graphY,
    });
  };

  const handleNodePointerMove = (
    e: React.PointerEvent<HTMLDivElement>,
    loc: GameLocation
  ) => {
    if (!nodeDrag || nodeDrag.id !== loc.id || !graphRef.current) return;
    const container = graphRef.current;
    const rect = container.getBoundingClientRect();
    const pointerX = e.clientX - rect.left + container.scrollLeft;
    const pointerY = e.clientY - rect.top + container.scrollTop;
    const nextX = Math.max(20, Math.min(1800, Math.round(pointerX - nodeDrag.offsetX)));
    const nextY = Math.max(20, Math.min(1100, Math.round(pointerY - nodeDrag.offsetY)));
    setNodeDrag((prev) => (prev ? { ...prev, x: nextX, y: nextY } : null));
  };

  const handleNodePointerUp = (
    e: React.PointerEvent<HTMLDivElement>,
    loc: GameLocation
  ) => {
    if (!nodeDrag || nodeDrag.id !== loc.id) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const finalX = nodeDrag.x;
    const finalY = nodeDrag.y;
    setNodeDrag(null);
    if (finalX !== loc.graphX || finalY !== loc.graphY) {
      send({ type: 'dm:moveLocationNode', locationId: loc.id, graphX: finalX, graphY: finalY });
    }
  };

  const handleUploadLocationMap = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedLocation) return;
    setUploadError(null);
    setUploading(true);
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
          locationId: selectedLocation.id,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Ошибка загрузки карты');
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUploadLocationAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setAudioUploadError('Файл слишком большой (максимум 25 МБ)');
      if (locationAudioInputRef.current) locationAudioInputRef.current.value = '';
      return;
    }
    setUploadingAudio(true);
    setAudioUploadError(null);
    try {
      const url = `/api/audio/upload?target=location&locationId=${encodeURIComponent(selectedLocation.id)}&filename=${encodeURIComponent(file.name)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'audio/mpeg',
        },
        body: file,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Ошибка загрузки MP3');
      }
    } catch (err) {
      setAudioUploadError(err instanceof Error ? err.message : 'Ошибка загрузки MP3');
    } finally {
      setUploadingAudio(false);
      if (locationAudioInputRef.current) locationAudioInputRef.current.value = '';
    }
  };

  const handleUploadSplashAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setSplashAudioError('Файл слишком большой (максимум 25 МБ)');
      if (splashAudioInputRef.current) splashAudioInputRef.current.value = '';
      return;
    }
    setUploadingSplashAudio(true);
    setSplashAudioError(null);
    try {
      const url = `/api/audio/upload?target=splash&filename=${encodeURIComponent(file.name)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'audio/mpeg',
        },
        body: file,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Ошибка загрузки MP3 заставки');
      }
    } catch (err) {
      setSplashAudioError(err instanceof Error ? err.message : 'Ошибка загрузки MP3 заставки');
    } finally {
      setUploadingSplashAudio(false);
      if (splashAudioInputRef.current) splashAudioInputRef.current.value = '';
    }
  };

  const openNewLocationModal = () => {
    setNewLocParentId(selectedLocation?.id ?? '');
    setNewLocName('');
    setNewLocDesc('');
    setNewLocKind('city');
    setNewLocCols(16);
    setNewLocRows(9);
    setNewLocTimeOfDay(false);
    setShowNewLocation(true);
  };

  const handleCreateLocation = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newLocName.trim();
    if (!cleanName) return;
    pendingCreatedNameRef.current = cleanName;
    send({
      type: 'dm:upsertLocation',
      location: {
        name: cleanName,
        kind: newLocKind,
        description: newLocDesc.trim(),
        parentLocationId: newLocParentId || null,
        affectedByTimeOfDay: newLocTimeOfDay,
        map:
          newLocKind === 'tactical'
            ? {
                cols: Math.max(6, Math.min(32, Math.round(newLocCols) || 16)),
                rows: Math.max(4, Math.min(24, Math.round(newLocRows) || 9)),
                showGrid: true,
              }
            : { showGrid: false },
      },
    });
    setNewLocName('');
    setNewLocDesc('');
    setNewLocTimeOfDay(false);
    setShowNewLocation(false);
  };

  const handleSaveLocationMeta = () => {
    if (!locNameDraft.trim()) return;
    send({
      type: 'dm:upsertLocation',
      location: {
        id: selectedLocation.id,
        name: locNameDraft.trim(),
        kind: selectedLocation.kind,
        description: locDescDraft.trim(),
        parentLocationId: selectedLocation.parentLocationId,
      },
    });
  };

  const handleAddHotspotOnClick = (pctX: number, pctY: number) => {
    const defaultLabel = `Точка ${selectedLocation.hotspots.length + 1}`;
    send({
      type: 'dm:upsertHotspot',
      locationId: selectedLocation.id,
      hotspot: {
        label: defaultLabel,
        category: selectedLocation.kind === 'tactical' ? 'portal' : 'other',
        x: pctX,
        y: pctY,
        targetLocationId: null,
        description: '',
        visibleOnTv: true,
      },
    });
  };

  const handleSaveHotspot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHotspot || !hsLabelDraft.trim()) return;
    send({
      type: 'dm:upsertHotspot',
      locationId: selectedLocation.id,
      hotspot: {
        id: selectedHotspot.id,
        label: hsLabelDraft.trim(),
        category: hsCategoryDraft,
        x: selectedHotspot.x,
        y: selectedHotspot.y,
        targetLocationId: hsTargetIdDraft || null,
        description: hsDescDraft.trim(),
        visibleOnTv: hsVisibleDraft,
      },
    });
  };

  const handleTravelToLocation = (locId: string) => {
    send({
      type: 'dm:beginLocationTransition',
      targetLocationId: locId,
      moveParty: true,
    });
    onNavigate('/dm');
  };

  const playersInSelected = dmState.players.filter((p) => p.locationId === selectedLocation.id);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0B0F17] text-slate-100 flex flex-col">
      {/* Unified DM Top Bar */}
      <header className="h-14 shrink-0 px-3 sm:px-5 border-b border-slate-800 bg-[#0B0F17] flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="hidden sm:block text-sm font-semibold text-slate-100 hover:text-amber-400 transition-colors whitespace-nowrap shrink-0"
          >
            Tabletop Sync
          </button>

          <nav
            aria-label="Разделы мастера"
            className="flex items-center gap-1 p-1 rounded-lg bg-[#131A26] border border-slate-800 shrink-0"
          >
            <button
              type="button"
              onClick={() => onNavigate('/dm')}
              className="px-2.5 sm:px-3 py-1 rounded-md text-xs font-medium text-slate-400 hover:text-slate-100 flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Пульт мастера</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/locations')}
              className="px-2.5 sm:px-3 py-1 rounded-md text-xs font-medium bg-slate-800 text-amber-400 flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Карта мира</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/catalogs')}
              className="px-2.5 sm:px-3 py-1 rounded-md text-xs font-medium text-slate-400 hover:text-slate-100 flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Справочники</span>
            </button>
          </nav>

          <div className="hidden xl:flex items-center gap-2 text-xs text-slate-400 whitespace-nowrap shrink-0">
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              aria-hidden="true"
            />
            <span>Локаций: {dmState.locations.length}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={openNewLocationModal}
            className="px-3 sm:px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Новая локация</span>
          </button>

          <a
            href="/tv"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:flex px-3 py-2 rounded-lg bg-[#131A26] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap"
          >
            Открыть ТВ
          </a>
        </div>
      </header>

      {/* Main Split: Canvas (World Mind-Map OR Map & Hotspots Editor) + Right Inspector */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Left/Center Main Canvas */}
        <section className="flex-1 min-h-[280px] min-w-0 flex flex-col bg-[#0B0F17]">
          {/* Mode Switcher Toolbar */}
          <div className="shrink-0 px-4 py-2.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#131A26] border border-slate-800">
              <button
                type="button"
                onClick={() => setEditorMode('graph')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  editorMode === 'graph'
                    ? 'bg-slate-800 text-amber-400'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Граф мира (Mind-Map)</span>
              </button>
              <button
                type="button"
                onClick={() => setEditorMode('map')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  editorMode === 'map'
                    ? 'bg-slate-800 text-amber-400'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Карта и точки: {selectedLocation.name}</span>
              </button>
            </div>

            <div className="text-xs text-slate-400">
              {editorMode === 'graph'
                ? 'Перетаскивайте узлы локаций · Линии показывают вложенные переходы'
                : 'Кликните по карте, чтобы добавить точку активности, или перетащите маркер'}
            </div>
          </div>

          {/* VIEW 1: INTERACTIVE MIND-MAP WORLD GRAPH */}
          {editorMode === 'graph' && (
            <div
              ref={graphRef}
              className="flex-1 min-h-0 overflow-auto relative"
              style={{
                backgroundImage:
                  'radial-gradient(rgba(148, 163, 184, 0.14) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            >
              <div className="relative w-[1320px] h-[820px]">
                {/* SVG Transition Edges */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <defs>
                    <marker
                      id="world-arrow"
                      markerWidth="8"
                      markerHeight="8"
                      refX="6"
                      refY="4"
                      orient="auto"
                    >
                      <path d="M0,0 L8,4 L0,8 Z" fill="#F59E0B" opacity="0.7" />
                    </marker>
                  </defs>
                  {graphEdges.map((edge) => {
                    const p1 = getNodePos(edge.from);
                    const p2 = getNodePos(edge.to);
                    const x1 = p1.x + NODE_WIDTH / 2;
                    const y1 = p1.y + NODE_HEIGHT / 2;
                    const x2 = p2.x + NODE_WIDTH / 2;
                    const y2 = p2.y + NODE_HEIGHT / 2;
                    const mx = (x1 + x2) / 2;
                    const my = (y1 + y2) / 2;
                    const pathD = `M ${x1} ${y1} Q ${mx} ${y1}, ${mx} ${my} T ${x2} ${y2}`;

                    return (
                      <g key={edge.key}>
                        <path
                          d={pathD}
                          fill="none"
                          stroke={edge.kind === 'hotspot' ? '#F59E0B' : '#475569'}
                          strokeOpacity={edge.kind === 'hotspot' ? 0.55 : 0.45}
                          strokeWidth={edge.kind === 'hotspot' ? 2 : 1.5}
                          strokeDasharray={edge.kind === 'parent' ? '6 5' : undefined}
                        />
                        {edge.label && (
                          <text
                            x={mx}
                            y={my - 6}
                            textAnchor="middle"
                            fill="#94A3B8"
                            fontSize="10"
                            fontFamily="Plus Jakarta Sans, sans-serif"
                          >
                            {edge.label.length > 24 ? `${edge.label.slice(0, 22)}…` : edge.label}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Draggable Location Nodes */}
                {dmState.locations.map((loc) => {
                  const pos = getNodePos(loc);
                  const isSelected = loc.id === selectedLocation.id;
                  const isActive = loc.id === dmState.activeLocationId;
                  const heroCount = dmState.players.filter((p) => p.locationId === loc.id).length;

                  return (
                    <div
                      key={loc.id}
                      onPointerDown={(e) => handleNodePointerDown(e, loc)}
                      onPointerMove={(e) => handleNodePointerMove(e, loc)}
                      onPointerUp={(e) => handleNodePointerUp(e, loc)}
                      onPointerCancel={(e) => handleNodePointerUp(e, loc)}
                      onDoubleClick={() => {
                        setSelectedLocationId(loc.id);
                        setEditorMode('map');
                      }}
                      className={`absolute rounded-xl bg-[#131A26] border p-3 cursor-grab active:cursor-grabbing select-none touch-none transition-shadow ${
                        isSelected
                          ? 'border-amber-400 shadow-xl shadow-amber-500/10 z-20'
                          : isActive
                            ? 'border-emerald-500/70 z-10'
                            : 'border-slate-700/90 hover:border-slate-500 z-10'
                      }`}
                      style={{
                        left: `${pos.x}px`,
                        top: `${pos.y}px`,
                        width: `${NODE_WIDTH}px`,
                        minHeight: `${NODE_HEIGHT}px`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              loc.kind === 'tactical'
                                ? 'bg-red-950/70 text-red-300 border border-red-900/70'
                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {loc.kind === 'tactical' ? (
                              <Swords className="w-3.5 h-3.5" />
                            ) : (
                              <Compass className="w-3.5 h-3.5" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-100 truncate">
                              {loc.name}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                              <span>
                                {loc.kind === 'tactical' ? 'Тактическая карта' : 'Карта города'}
                                {isActive ? ' · На экране' : ''}
                              </span>
                              {loc.affectedByTimeOfDay && (
                                <Clock
                                  className="w-3 h-3 text-amber-400 shrink-0"
                                  aria-label="Зависит от времени суток"
                                />
                              )}
                              {loc.ambientAudioUrl && (
                                <Music
                                  className="w-3 h-3 text-emerald-400 shrink-0"
                                  aria-label="Загружен фоновый звук"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-800/90 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-mono tabular-nums">
                          Точек: {loc.hotspots.length}
                          {heroCount > 0 ? ` · Герои: ${heroCount}` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLocationId(loc.id);
                            setEditorMode('map');
                          }}
                          className="text-amber-400 hover:text-amber-300 font-medium"
                        >
                          Открыть →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 2: MAP & HOTSPOT EDITOR */}
          {editorMode === 'map' && (
            <div className="flex-1 min-h-0 p-4 flex flex-col gap-3">
              <div className="flex-1 min-h-0">
                <TacticalMap
                  map={selectedLocation.map}
                  tokens={selectedLocation.tokens}
                  locationKind={selectedLocation.kind}
                  hotspots={selectedLocation.hotspots}
                  interactive={true}
                  hotspotEditMode={true}
                  selectedHotspotId={selectedHotspotId}
                  onHotspotClick={(hs) => setSelectedHotspotId(hs.id)}
                  onMoveHotspot={(hsId, x, y) => {
                    const hs = selectedLocation.hotspots.find((h) => h.id === hsId);
                    if (!hs) return;
                    send({
                      type: 'dm:upsertHotspot',
                      locationId: selectedLocation.id,
                      hotspot: {
                        ...hs,
                        x,
                        y,
                      },
                    });
                  }}
                  onMapClick={handleAddHotspotOnClick}
                />
              </div>
            </div>
          )}
        </section>

        {/* Right Inspector Sidebar */}
        <aside className="w-full lg:w-[420px] xl:w-[450px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-800 bg-[#131A26] overflow-y-auto p-4 space-y-5">
          {/* Location Selector Strip + Direct Create Button */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-200">
                Справочник локаций ({dmState.locations.length})
              </span>
              <div className="flex items-center gap-2">
                {selectedLocation.id !== dmState.activeLocationId && (
                  <button
                    type="button"
                    onClick={() => handleTravelToLocation(selectedLocation.id)}
                    className="text-slate-300 hover:text-amber-300 font-medium flex items-center gap-1 transition-colors"
                  >
                    <span>Перейти</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={openNewLocationModal}
                  className="px-2.5 py-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/50 text-amber-300 text-[11px] font-semibold flex items-center gap-1 transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Добавить</span>
                </button>
              </div>
            </div>
            <select
              value={selectedLocation.id}
              onChange={(e) => {
                setSelectedLocationId(e.target.value);
                setSelectedHotspotId(null);
              }}
              className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-700 text-xs font-medium text-slate-100"
            >
              {dmState.locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.kind === 'tactical' ? '[Бой] ' : '[Город] '}
                  {loc.name}
                  {loc.id === dmState.activeLocationId ? ' (текущая)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Location Details */}
          <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold text-slate-200">Параметры локации</h2>
              {dmState.locations.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    send({ type: 'dm:deleteLocation', locationId: selectedLocation.id })
                  }
                  className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800"
                  title="Удалить локацию"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <input
                type="text"
                value={locNameDraft}
                onChange={(e) => setLocNameDraft(e.target.value)}
                onBlur={handleSaveLocationMeta}
                className="w-full px-2.5 py-2 rounded-lg bg-[#131A26] border border-slate-800 text-slate-100 font-medium"
                placeholder="Название локации"
              />

              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-[11px] text-slate-400">Тип карты</span>
                  <select
                    value={selectedLocation.kind}
                    onChange={(e) =>
                      send({
                        type: 'dm:upsertLocation',
                        location: {
                          id: selectedLocation.id,
                          name: locNameDraft.trim() || selectedLocation.name,
                          kind: e.target.value as LocationKind,
                          map: { showGrid: e.target.value === 'tactical' },
                        },
                      })
                    }
                    className="w-full px-2 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-slate-100"
                  >
                    <option value="city">Город (свободно)</option>
                    <option value="tactical">Тактическая (клетки)</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-[11px] text-slate-400">Родительская локация</span>
                  <select
                    value={selectedLocation.parentLocationId || ''}
                    onChange={(e) =>
                      send({
                        type: 'dm:upsertLocation',
                        location: {
                          id: selectedLocation.id,
                          name: locNameDraft.trim() || selectedLocation.name,
                          kind: selectedLocation.kind,
                          parentLocationId: e.target.value || null,
                        },
                      })
                    }
                    className="w-full px-2 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-slate-100"
                  >
                    <option value="">Корневая</option>
                    {dmState.locations
                      .filter((l) => l.id !== selectedLocation.id)
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              <textarea
                rows={2}
                value={locDescDraft}
                onChange={(e) => setLocDescDraft(e.target.value)}
                onBlur={handleSaveLocationMeta}
                placeholder="Описание локации..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#131A26] border border-slate-800 text-slate-200 resize-none"
              />

              {/* Background Image Upload & Grid Controls */}
              <div className="pt-2 border-t border-slate-800/90 space-y-2.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleUploadLocationMap}
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex-1 py-2 px-3 rounded-lg bg-[#131A26] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5"
                  >
                    <ImagePlus className="w-3.5 h-3.5 text-amber-400" />
                    <span>{uploading ? 'Загрузка...' : 'Загрузить фон карты'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      send({
                        type: 'dm:updateMap',
                        locationId: selectedLocation.id,
                        patch: { showGrid: !selectedLocation.map.showGrid },
                      })
                    }
                    className={`py-2 px-3 rounded-lg border text-xs flex items-center gap-1.5 ${
                      selectedLocation.map.showGrid
                        ? 'bg-slate-800 border-slate-600 text-amber-400'
                        : 'bg-[#131A26] border-slate-800 text-slate-400'
                    }`}
                  >
                    <Grid3X3 className="w-3.5 h-3.5" />
                    <span>Сетка</span>
                  </button>
                </div>
                {uploadError && <p className="text-[11px] text-red-400">{uploadError}</p>}

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span>Сетка локации (кл.):</span>
                    <input
                      type="number"
                      min={6}
                      max={32}
                      value={selectedLocation.map.cols}
                      onChange={(e) =>
                        send({
                          type: 'dm:updateMap',
                          locationId: selectedLocation.id,
                          patch: { cols: Number(e.target.value) || 16 },
                        })
                      }
                      className="w-14 px-2 py-1 rounded bg-[#131A26] border border-slate-800 font-mono tabular-nums text-slate-100 text-center"
                    />
                    <span>×</span>
                    <input
                      type="number"
                      min={4}
                      max={24}
                      value={selectedLocation.map.rows}
                      onChange={(e) =>
                        send({
                          type: 'dm:updateMap',
                          locationId: selectedLocation.id,
                          patch: { rows: Number(e.target.value) || 9 },
                        })
                      }
                      className="w-14 px-2 py-1 rounded bg-[#131A26] border border-slate-800 font-mono tabular-nums text-slate-100 text-center"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Размерность сохраняется отдельно для каждой карты; на пульте мастера доступно только включение/выключение сетки.
                  </p>
                </div>

                {/* Map Lighting Selector (all map types) */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <span className="text-[11px] text-slate-400">Освещённость карты</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'bright', label: 'Яркий свет', Icon: Sun, activeClass: 'bg-amber-500/20 border-amber-500/60 text-amber-300' },
                        { id: 'dim', label: 'Полумрак', Icon: Sunset, activeClass: 'bg-sky-500/20 border-sky-500/60 text-sky-300' },
                        { id: 'darkness', label: 'Темнота', Icon: Moon, activeClass: 'bg-indigo-500/25 border-indigo-400/60 text-indigo-200' },
                      ] as Array<{ id: MapLighting; label: string; Icon: React.ComponentType<{ className?: string }>; activeClass: string }>
                    ).map(({ id, label, Icon, activeClass }) => {
                      const active = (selectedLocation.map.lighting ?? 'bright') === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          title={getMapLightingDescription(id)}
                          onClick={() =>
                            send({
                              type: 'dm:updateMap',
                              locationId: selectedLocation.id,
                              patch: { lighting: id },
                            })
                          }
                          className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1 transition-colors ${
                            active
                              ? activeClass
                              : 'bg-[#131A26] border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-snug">
                    {getMapLightingDescription(selectedLocation.map.lighting ?? 'bright')}
                  </p>
                </div>

                {/* Dynamic Day/Night Toggle (In-Game Clock Integration) */}
                <label className="pt-2 border-t border-slate-800/80 flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(selectedLocation.affectedByTimeOfDay)}
                    onChange={(e) =>
                      send({
                        type: 'dm:upsertLocation',
                        location: {
                          id: selectedLocation.id,
                          name: locNameDraft.trim() || selectedLocation.name,
                          kind: selectedLocation.kind,
                          affectedByTimeOfDay: e.target.checked,
                        },
                      })
                    }
                    className="mt-0.5 rounded border-slate-600 bg-[#131A26] text-amber-500 focus:ring-amber-500"
                  />
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-medium text-slate-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Зависит от игрового времени (день/ночь)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-snug">
                      Карта динамически меняет оттенок и освещённость по игровым часам (утро, день, закат, ночь). Рекомендуется для открытых карт города и улицы.
                    </p>
                  </div>
                </label>

                {/* Location Ambient Audio (Looping MP3 on TV) */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <input
                    ref={locationAudioInputRef}
                    type="file"
                    accept=".mp3,audio/mpeg,audio/mp3"
                    onChange={handleUploadLocationAudio}
                    className="hidden"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-slate-200 flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Фоновый звук локации (MP3)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => locationAudioInputRef.current?.click()}
                      disabled={uploadingAudio}
                      className="px-2.5 py-1 rounded-md bg-[#131A26] hover:bg-slate-800 border border-slate-700 text-[11px] font-medium text-emerald-300 transition-colors"
                    >
                      {uploadingAudio
                        ? 'Загрузка...'
                        : selectedLocation.ambientAudioUrl
                          ? 'Заменить MP3'
                          : 'Загрузить MP3'}
                    </button>
                  </div>

                  {selectedLocation.ambientAudioUrl ? (
                    <div className="p-2 rounded-lg bg-[#131A26] border border-emerald-500/30 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-emerald-200 truncate font-medium">
                          {selectedLocation.ambientAudioName || 'ambient.mp3'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            send({
                              type: 'dm:clearLocationAudio',
                              locationId: selectedLocation.id,
                            })
                          }
                          className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 shrink-0"
                          title="Удалить аудиофайл локации"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <audio
                        key={selectedLocation.ambientAudioUrl}
                        controls
                        loop
                        src={selectedLocation.ambientAudioUrl}
                        className="w-full h-8"
                      />
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500 leading-snug">
                      Когда локация открывается на ТВ, загруженный MP3-файл начинает играть автоматически и зациклен до бесконечности (управляется кнопкой звука в панели ДМ).
                    </p>
                  )}
                  {audioUploadError && (
                    <p className="text-[11px] text-red-400">{audioUploadError}</p>
                  )}
                </div>
              </div>

              {playersInSelected.length > 0 && (
                <div className="pt-2 border-t border-slate-800/90 flex items-center gap-2 text-[11px] text-emerald-400">
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    Здесь находятся: {playersInSelected.map((p) => p.name).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Initial Game Splash Screen Audio Settings */}
          <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2.5">
            <input
              ref={splashAudioInputRef}
              type="file"
              accept=".mp3,audio/mpeg,audio/mp3"
              onChange={handleUploadSplashAudio}
              className="hidden"
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Звук начальной заставки (ТВ)</span>
              </div>
              <button
                type="button"
                onClick={() => splashAudioInputRef.current?.click()}
                disabled={uploadingSplashAudio}
                className="px-2.5 py-1 rounded-md bg-[#131A26] hover:bg-slate-800 border border-slate-700 text-[11px] font-medium text-amber-300 transition-colors"
              >
                {uploadingSplashAudio
                  ? 'Загрузка...'
                  : dmState.tvDisplay.splashAudioUrl
                    ? 'Заменить MP3'
                    : 'Загрузить MP3'}
              </button>
            </div>

            {dmState.tvDisplay.splashAudioUrl ? (
              <div className="p-2 rounded-lg bg-[#131A26] border border-amber-500/30 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-amber-200 truncate font-medium">
                    {dmState.tvDisplay.splashAudioName || 'splash.mp3'}
                  </span>
                  <button
                    type="button"
                    onClick={() => send({ type: 'dm:clearSplashAudio' })}
                    className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 shrink-0"
                    title="Удалить аудиофайл заставки"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <audio
                  key={dmState.tvDisplay.splashAudioUrl}
                  controls
                  loop
                  src={dmState.tvDisplay.splashAudioUrl}
                  className="w-full h-8"
                />
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 leading-snug">
                Загрузите MP3-трек для титульной заставки «{dmState.tvDisplay.campaignTitle}» — он будет играть зацикленно на ТВ до нажатия «Начать игру».
              </p>
            )}
            {splashAudioError && <p className="text-[11px] text-red-400">{splashAudioError}</p>}
          </div>

          {/* Hotspots / Activity Points Section */}
          <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold text-slate-200">
                Точки активности и переходы ({selectedLocation.hotspots.length})
              </h2>
              <button
                type="button"
                onClick={() => {
                  setEditorMode('map');
                  handleAddHotspotOnClick(50, 50);
                }}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-amber-400 font-medium flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Добавить</span>
              </button>
            </div>

            {selectedLocation.hotspots.length === 0 ? (
              <p className="text-xs text-slate-500">
                Переключитесь в «Карта и точки» и кликните на здание или проход, чтобы добавить точку перехода.
              </p>
            ) : (
              <div className="divide-y divide-slate-800/80 rounded-lg border border-slate-800 overflow-hidden">
                {selectedLocation.hotspots.map((hs) => {
                  const targetLoc = hs.targetLocationId
                    ? dmState.locations.find((l) => l.id === hs.targetLocationId)
                    : null;
                  const isSel = selectedHotspotId === hs.id;
                  return (
                    <div
                      key={hs.id}
                      onClick={() => {
                        setSelectedHotspotId(hs.id);
                        setEditorMode('map');
                      }}
                      className={`px-3 py-2 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                        isSel ? 'bg-slate-800/90' : 'bg-[#131A26]/60 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <HotspotIcon
                          category={hs.category}
                          className={`w-3.5 h-3.5 shrink-0 ${
                            hs.visibleOnTv ? 'text-amber-400' : 'text-slate-500'
                          }`}
                        />
                        <div className="min-w-0">
                          <div
                            className={`text-xs font-medium truncate ${
                              hs.visibleOnTv ? 'text-slate-100' : 'text-slate-500 line-through'
                            }`}
                          >
                            {hs.label}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {targetLoc ? `→ ${targetLoc.name}` : 'Без перехода'}
                            {!hs.visibleOnTv ? ' · Скрыта' : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextVisible = !hs.visibleOnTv;
                            send({
                              type: 'dm:upsertHotspot',
                              locationId: selectedLocation.id,
                              hotspot: {
                                id: hs.id,
                                label: hs.label,
                                category: hs.category,
                                x: hs.x,
                                y: hs.y,
                                targetLocationId: hs.targetLocationId,
                                description: hs.description,
                                visibleOnTv: nextVisible,
                              },
                            });
                            if (selectedHotspotId === hs.id) {
                              setHsVisibleDraft(nextVisible);
                            }
                          }}
                          className={`p-1 rounded transition-colors ${
                            hs.visibleOnTv
                              ? 'text-slate-300 hover:text-amber-400 hover:bg-slate-800'
                              : 'text-slate-600 hover:text-slate-200 hover:bg-slate-800'
                          }`}
                          title={hs.visibleOnTv ? 'Скрыть точку на карте и ТВ' : 'Показать точку на карте и ТВ'}
                          aria-label={hs.visibleOnTv ? 'Скрыть точку' : 'Показать точку'}
                        >
                          {hs.visibleOnTv ? (
                            <Eye className="w-3.5 h-3.5" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            send({
                              type: 'dm:deleteHotspot',
                              locationId: selectedLocation.id,
                              hotspotId: hs.id,
                            });
                            if (selectedHotspotId === hs.id) setSelectedHotspotId(null);
                          }}
                          className="p-1 rounded text-slate-500 hover:text-red-400"
                          aria-label="Удалить точку"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Selected Hotspot Editor Form */}
            {selectedHotspot && (
              <form
                onSubmit={handleSaveHotspot}
                className="pt-3 border-t border-slate-800 space-y-2.5 text-xs"
              >
                <div className="text-[11px] font-semibold text-amber-400">
                  Редактирование точки ({selectedHotspot.x}%, {selectedHotspot.y}%)
                </div>
                <input
                  type="text"
                  value={hsLabelDraft}
                  onChange={(e) => setHsLabelDraft(e.target.value)}
                  placeholder="Название точки (напр. Таверна)"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#131A26] border border-slate-700 text-slate-100"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={hsCategoryDraft}
                    onChange={(e) => setHsCategoryDraft(e.target.value as HotspotCategory)}
                    className="px-2 py-1.5 rounded-lg bg-[#131A26] border border-slate-700 text-slate-100"
                  >
                    {HOTSPOT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {getHotspotCategoryLabel(cat)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={hsTargetIdDraft}
                    onChange={(e) => setHsTargetIdDraft(e.target.value)}
                    className="px-2 py-1.5 rounded-lg bg-[#131A26] border border-slate-700 text-slate-100"
                  >
                    <option value="">Без перехода</option>
                    {dmState.locations
                      .filter((l) => l.id !== selectedLocation.id)
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          → {l.name}
                        </option>
                      ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={hsDescDraft}
                  onChange={(e) => setHsDescDraft(e.target.value)}
                  placeholder="Пояснение (что находится в этом месте)"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#131A26] border border-slate-700 text-slate-200"
                />
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hsVisibleDraft}
                      onChange={(e) => setHsVisibleDraft(e.target.checked)}
                      className="rounded border-slate-600"
                    />
                    <span>Показывать маркер на ТВ</span>
                  </label>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold"
                  >
                    Сохранить точку
                  </button>
                </div>
              </form>
            )}
          </div>
        </aside>
      </div>

      {/* Centered Modal Dialog for Creating a New Location */}
      {showNewLocation && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-location-modal-title"
          onClick={() => setShowNewLocation(false)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleCreateLocation}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-[#131A26] border border-slate-700 shadow-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 id="new-location-modal-title" className="text-base font-semibold text-slate-100">
                  Новая локация
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Создайте карту города или тактическую арену для боя
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewLocation(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                aria-label="Закрыть окно"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block space-y-1.5">
                <span className="text-slate-300 font-medium">Название локации</span>
                <input
                  type="text"
                  autoFocus
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  placeholder="Напр. Подвал таверны или Логово гоблинов"
                  className="w-full px-3 py-2.5 rounded-lg bg-[#0B0F17] border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                  required
                />
              </label>

              <div className="space-y-1.5">
                <span className="text-slate-300 font-medium block">Тип карты</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewLocKind('city')}
                    className={`px-3 py-2.5 rounded-lg border text-left flex items-center gap-2 transition-colors ${
                      newLocKind === 'city'
                        ? 'bg-amber-500/15 border-amber-500/70 text-amber-300 font-medium'
                        : 'bg-[#0B0F17] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Compass className="w-4 h-4 shrink-0" />
                    <div>
                      <div className="text-xs leading-tight">Город / Сцена</div>
                      <div className="text-[10px] opacity-75">Свободно + точки</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewLocKind('tactical')}
                    className={`px-3 py-2.5 rounded-lg border text-left flex items-center gap-2 transition-colors ${
                      newLocKind === 'tactical'
                        ? 'bg-red-500/15 border-red-500/70 text-red-300 font-medium'
                        : 'bg-[#0B0F17] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Swords className="w-4 h-4 shrink-0" />
                    <div>
                      <div className="text-xs leading-tight">Тактическая</div>
                      <div className="text-[10px] opacity-75">Бой по сетке</div>
                    </div>
                  </button>
                </div>
              </div>

              {newLocKind === 'tactical' && (
                <div className="p-3 rounded-lg bg-[#0B0F17] border border-slate-800 flex items-center justify-between gap-3">
                  <span className="text-slate-300">Размер сетки (кл.):</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={6}
                      max={32}
                      value={newLocCols}
                      onChange={(e) => setNewLocCols(Number(e.target.value) || 16)}
                      className="w-14 px-2 py-1 rounded bg-[#131A26] border border-slate-700 font-mono tabular-nums text-slate-100 text-center"
                    />
                    <span className="text-slate-500">×</span>
                    <input
                      type="number"
                      min={4}
                      max={24}
                      value={newLocRows}
                      onChange={(e) => setNewLocRows(Number(e.target.value) || 9)}
                      className="w-14 px-2 py-1 rounded bg-[#131A26] border border-slate-700 font-mono tabular-nums text-slate-100 text-center"
                    />
                  </div>
                </div>
              )}

              <label className="block space-y-1.5">
                <span className="text-slate-300 font-medium">Родительская локация (необязательно)</span>
                <select
                  value={newLocParentId}
                  onChange={(e) => setNewLocParentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-700 text-slate-100"
                >
                  <option value="">Корневая локация (без родителя)</option>
                  {dmState.locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      Внутри: {l.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-slate-300 font-medium">Описание</span>
                <textarea
                  rows={2}
                  value={newLocDesc}
                  onChange={(e) => setNewLocDesc(e.target.value)}
                  placeholder="Краткое описание локации для мастера и игроков..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-700 text-slate-100 resize-none"
                />
              </label>

              <label className="p-2.5 rounded-lg bg-[#0B0F17] border border-slate-800 flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newLocTimeOfDay}
                  onChange={(e) => setNewLocTimeOfDay(e.target.checked)}
                  className="mt-0.5 rounded border-slate-600 bg-[#131A26] text-amber-500 focus:ring-amber-500"
                />
                <div>
                  <div className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Зависит от игрового времени (день/ночь)</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Включите для уличных локаций, чтобы карта автоматически темнела ночью и окрашивалась на закате.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowNewLocation(false)}
                className="px-4 py-2 rounded-lg bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors"
              >
                Создать локацию
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
