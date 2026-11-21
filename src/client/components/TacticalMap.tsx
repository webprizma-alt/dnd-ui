import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BedDouble,
  Beer,
  Compass,
  Hammer,
  MapPin,
  ScrollText,
  Shield,
  Skull,
  Sparkles,
  Swords,
  User,
} from 'lucide-react';
import { computeGridDistanceFt } from '../../shared/catalogDefaults';
import type {
  HotspotCategory,
  LocationHotspot,
  LocationKind,
  MapConfig,
  MapToken,
} from '../../shared/types';

export interface DmTacticalOverlay {
  tokenId: string;
  clearRangeFt: number;
  visibleRangeFt: number;
  attackNormalFt: number | null;
  attackMaxFt: number | null;
  attackIncludesSelf?: boolean;
}

export interface TimeOfDayTint {
  overlayCss: string;
  filterCss?: string;
}

interface TacticalMapProps {
  map: MapConfig;
  tokens: MapToken[];
  locationKind?: LocationKind;
  hotspots?: LocationHotspot[];
  activeTurnTokenId?: string | null;
  interactive?: boolean;
  hotspotEditMode?: boolean;
  selectedTokenId?: string | null;
  selectedHotspotId?: string | null;
  dmOverlay?: DmTacticalOverlay | null;
  timeOfDayTint?: TimeOfDayTint | null;
  onSelectToken?: (tokenId: string) => void;
  onMoveToken?: (tokenId: string, x: number, y: number) => void;
  onHotspotClick?: (hotspot: LocationHotspot) => void;
  onMoveHotspot?: (hotspotId: string, x: number, y: number) => void;
  onMapClick?: (pctX: number, pctY: number) => void;
}

export function getHotspotCategoryLabel(cat: HotspotCategory): string {
  switch (cat) {
    case 'tavern':
      return 'Таверна';
    case 'board':
      return 'Доска объявлений';
    case 'armory':
      return 'Оружейная';
    case 'barracks':
      return 'Казармы';
    case 'inn':
      return 'Гостиный двор';
    case 'dungeon':
      return 'Бой / Подземелье';
    case 'portal':
      return 'Переход / Выход';
    default:
      return 'Точка интереса';
  }
}

export function HotspotIcon({
  category,
  className = 'w-3.5 h-3.5',
}: {
  category: HotspotCategory;
  className?: string;
}) {
  switch (category) {
    case 'tavern':
      return <Beer className={className} />;
    case 'board':
      return <ScrollText className={className} />;
    case 'armory':
      return <Hammer className={className} />;
    case 'barracks':
      return <Shield className={className} />;
    case 'inn':
      return <BedDouble className={className} />;
    case 'dungeon':
      return <Swords className={className} />;
    case 'portal':
      return <Compass className={className} />;
    default:
      return <MapPin className={className} />;
  }
}

function getHotspotAccent(category: HotspotCategory): string {
  if (category === 'dungeon') return '#EF4444';
  if (category === 'portal') return '#38BDF8';
  if (category === 'inn' || category === 'barracks') return '#10B981';
  return '#F59E0B';
}

export function TacticalMap({
  map,
  tokens,
  locationKind = 'tactical',
  hotspots = [],
  activeTurnTokenId,
  interactive = false,
  hotspotEditMode = false,
  selectedTokenId,
  selectedHotspotId,
  dmOverlay = null,
  timeOfDayTint = null,
  onSelectToken,
  onMoveToken,
  onHotspotClick,
  onMoveHotspot,
  onMapClick,
}: TacticalMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [imgNaturalSize, setImgNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  const [dragState, setDragState] = useState<{
    tokenId: string;
    x: number;
    y: number;
    size: number;
  } | null>(null);
  const lastEmittedRef = useRef<{ tokenId: string; x: number; y: number; ts: number } | null>(null);

  const [hotspotDrag, setHotspotDrag] = useState<{
    hotspotId: string;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    setImgFailed(false);
    setImgNaturalSize(null);
  }, [map.imageUrl]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    };
    updateSize();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateSize);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const isTactical = locationKind === 'tactical';
  const targetRatio =
    imgNaturalSize && imgNaturalSize.w > 0 && imgNaturalSize.h > 0 && !imgFailed
      ? imgNaturalSize.w / imgNaturalSize.h
      : Math.max(0.25, map.cols / Math.max(1, map.rows));

  let boardStyle: React.CSSProperties = {
    aspectRatio: `${targetRatio}`,
    maxWidth: '100%',
    maxHeight: '100%',
  };
  if (containerSize.w > 0 && containerSize.h > 0) {
    const boxRatio = containerSize.w / containerSize.h;
    if (boxRatio > targetRatio) {
      // Height is the limiting side -> fit height 100%, center horizontally
      const h = containerSize.h;
      const w = Math.floor(h * targetRatio);
      boardStyle = { width: `${w}px`, height: `${h}px` };
    } else {
      // Width is the limiting side -> fit width 100%, center vertically
      const w = containerSize.w;
      const h = Math.floor(w / targetRatio);
      boardStyle = { width: `${w}px`, height: `${h}px` };
    }
  }

  const getCoordsFromClient = useCallback(
    (clientX: number, clientY: number, size: number) => {
      const el = boardRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;

      const relX = (clientX - rect.left) / rect.width;
      const relY = (clientY - rect.top) / rect.height;
      const maxCol = Math.max(0, map.cols - size);
      const maxRow = Math.max(0, map.rows - size);

      if (isTactical) {
        const rawCol = Math.floor(relX * map.cols);
        const rawRow = Math.floor(relY * map.rows);
        return {
          x: Math.max(0, Math.min(maxCol, rawCol)),
          y: Math.max(0, Math.min(maxRow, rawRow)),
        };
      }

      // City / social map: smooth free-form positioning centered on pointer
      const rawX = relX * map.cols - size / 2;
      const rawY = relY * map.rows - size / 2;
      return {
        x: Math.round(Math.max(0, Math.min(maxCol, rawX)) * 100) / 100,
        y: Math.round(Math.max(0, Math.min(maxRow, rawY)) * 100) / 100,
      };
    },
    [isTactical, map.cols, map.rows]
  );

  const getPercentFromClient = useCallback((clientX: number, clientY: number) => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const x = Math.round(Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100)) * 10) / 10;
    const y = Math.round(Math.max(2, Math.min(98, ((clientY - rect.top) / rect.height) * 100)) * 10) / 10;
    return { x, y };
  }, []);

  const handleTokenPointerDown = (e: React.PointerEvent<HTMLButtonElement>, token: MapToken) => {
    if (!interactive || hotspotEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    onSelectToken?.(token.id);
    setDragState({
      tokenId: token.id,
      x: token.x,
      y: token.y,
      size: token.size,
    });
  };

  const handleTokenPointerMove = (e: React.PointerEvent<HTMLButtonElement>, token: MapToken) => {
    if (!interactive || hotspotEditMode || !dragState || dragState.tokenId !== token.id) return;
    const next = getCoordsFromClient(e.clientX, e.clientY, token.size);
    if (!next) return;

    if (next.x !== dragState.x || next.y !== dragState.y) {
      setDragState({ tokenId: token.id, x: next.x, y: next.y, size: token.size });
      const now = Date.now();
      const prev = lastEmittedRef.current;
      if (!prev || prev.tokenId !== token.id || prev.x !== next.x || prev.y !== next.y) {
        if (!prev || now - prev.ts > 60) {
          lastEmittedRef.current = { tokenId: token.id, x: next.x, y: next.y, ts: now };
          onMoveToken?.(token.id, next.x, next.y);
        }
      }
    }
  };

  const handleTokenPointerUp = (e: React.PointerEvent<HTMLButtonElement>, token: MapToken) => {
    if (!interactive || !dragState || dragState.tokenId !== token.id) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const finalX = dragState.x;
    const finalY = dragState.y;
    setDragState(null);
    if (finalX !== token.x || finalY !== token.y) {
      onMoveToken?.(token.id, finalX, finalY);
    }
  };

  const handleHotspotPointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    hs: LocationHotspot
  ) => {
    if (!interactive) return;
    e.stopPropagation();
    if (hotspotEditMode && onMoveHotspot) {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setHotspotDrag({ hotspotId: hs.id, x: hs.x, y: hs.y, moved: false });
    }
  };

  const handleHotspotPointerMove = (
    e: React.PointerEvent<HTMLButtonElement>,
    hs: LocationHotspot
  ) => {
    if (!hotspotEditMode || !hotspotDrag || hotspotDrag.hotspotId !== hs.id) return;
    const pct = getPercentFromClient(e.clientX, e.clientY);
    if (!pct) return;
    setHotspotDrag({ hotspotId: hs.id, x: pct.x, y: pct.y, moved: true });
  };

  const handleHotspotPointerUp = (
    e: React.PointerEvent<HTMLButtonElement>,
    hs: LocationHotspot
  ) => {
    if (!hotspotEditMode || !hotspotDrag || hotspotDrag.hotspotId !== hs.id) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const { x, y, moved } = hotspotDrag;
    setHotspotDrag(null);
    if (moved) {
      onMoveHotspot?.(hs.id, x, y);
    } else {
      onHotspotClick?.(hs);
    }
  };

  const handleBoardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !hotspotEditMode || !onMapClick) return;
    const pct = getPercentFromClient(e.clientX, e.clientY);
    if (pct) {
      onMapClick(pct.x, pct.y);
    }
  };

  const renderTokenIcon = (token: MapToken) => {
    if (token.kind === 'enemy') {
      return <Skull className="w-3.5 h-3.5 opacity-90 shrink-0" />;
    }
    if (token.kind === 'npc') {
      return <Shield className="w-3.5 h-3.5 opacity-90 shrink-0" />;
    }
    if (token.kind === 'object') {
      return <Sparkles className="w-3.5 h-3.5 opacity-90 shrink-0" />;
    }
    return <User className="w-3.5 h-3.5 opacity-90 shrink-0" />;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden select-none"
    >
      <div
        ref={boardRef}
        onClick={handleBoardClick}
        className={`relative bg-[#0F1521] border border-slate-800/90 rounded-xl overflow-hidden shadow-2xl shrink-0 ${
          interactive && hotspotEditMode ? 'cursor-crosshair' : ''
        }`}
        style={boardStyle}
      >
        {/* Background Map Image or Clean Fallback */}
        {map.imageUrl && !imgFailed ? (
          <img
            src={map.imageUrl}
            alt="Игровая карта локации"
            referrerPolicy="no-referrer"
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
              }
            }}
            onError={() => setImgFailed(true)}
            draggable={false}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-[filter] duration-1000"
            style={
              timeOfDayTint?.filterCss && timeOfDayTint.filterCss !== 'none'
                ? { filter: timeOfDayTint.filterCss }
                : undefined
            }
          />
        ) : (
          <div
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% 45%, rgba(30, 41, 59, 0.5) 0%, rgba(11, 15, 23, 0.96) 100%)',
            }}
          >
            <div className="text-center space-y-1 px-6">
              <p className="text-xs font-medium text-slate-400">
                Фоновое изображение локации не загружено
              </p>
              <p className="text-[11px] text-slate-500">
                Вы можете загрузить карту этой локации в панели мастера или в разделе «Карта мира»
              </p>
            </div>
          </div>
        )}

        {/* Subtle Dark Contrast Vignette */}
        <div className="absolute inset-0 bg-slate-950/15 pointer-events-none" />

        {/* Dynamic Day/Night Atmospheric Tint Overlay (always beneath grid, hotspots & tokens) */}
        {timeOfDayTint && timeOfDayTint.overlayCss !== 'transparent' && (
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none transition-colors duration-1000 z-[2]"
            style={{ backgroundColor: timeOfDayTint.overlayCss }}
          />
        )}

        {/* DM-Only Tactical Vision & Attack Reach/Range Overlay */}
        {isTactical && dmOverlay && (() => {
          const anchorToken = tokens.find((t) => t.id === dmOverlay.tokenId);
          if (!anchorToken) return null;
          const isDraggingAnchor = dragState?.tokenId === anchorToken.id;
          const originX = isDraggingAnchor ? dragState.x : anchorToken.x;
          const originY = isDraggingAnchor ? dragState.y : anchorToken.y;
          const originSize = isDraggingAnchor ? dragState.size : anchorToken.size;

          const hasVisionShade =
            dmOverlay.clearRangeFt !== Infinity || dmOverlay.visibleRangeFt !== Infinity;
          const hasAttackRange =
            (dmOverlay.attackNormalFt !== null && dmOverlay.attackNormalFt >= 0) ||
            (dmOverlay.attackMaxFt !== null && dmOverlay.attackMaxFt >= 0);
          if (!hasVisionShade && !hasAttackRange) return null;

          const totalCells = map.cols * map.rows;
          return (
            <div
              className="absolute inset-0 pointer-events-none grid z-[5]"
              style={{
                gridTemplateColumns: `repeat(${map.cols}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${map.rows}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: totalCells }).map((_, idx) => {
                const cx = idx % map.cols;
                const cy = Math.floor(idx / map.cols);
                const distFt = computeGridDistanceFt(originX, originY, originSize, cx, cy);

                const isUnseen = distFt > dmOverlay.visibleRangeFt;
                const isDimZone = !isUnseen && distFt > dmOverlay.clearRangeFt;

                const inSelfAttack =
                  distFt === 0 &&
                  (dmOverlay.attackIncludesSelf === true || dmOverlay.attackNormalFt === 0);
                const inNormalAttack =
                  inSelfAttack ||
                  (distFt > 0 &&
                    dmOverlay.attackNormalFt !== null &&
                    dmOverlay.attackNormalFt > 0 &&
                    distFt <= dmOverlay.attackNormalFt);
                const inMaxAttack =
                  !inNormalAttack &&
                  distFt > 0 &&
                  dmOverlay.attackMaxFt !== null &&
                  dmOverlay.attackNormalFt !== null &&
                  dmOverlay.attackMaxFt > dmOverlay.attackNormalFt &&
                  distFt <= dmOverlay.attackMaxFt;

                const layers: string[] = [];
                if (inSelfAttack) {
                  layers.push('linear-gradient(rgba(239, 68, 68, 0.36), rgba(239, 68, 68, 0.36))');
                } else if (inNormalAttack) {
                  layers.push('linear-gradient(rgba(239, 68, 68, 0.25), rgba(239, 68, 68, 0.25))');
                } else if (inMaxAttack) {
                  layers.push('linear-gradient(rgba(239, 68, 68, 0.11), rgba(239, 68, 68, 0.11))');
                }

                if (isUnseen) {
                  layers.push('linear-gradient(rgba(2, 6, 23, 0.72), rgba(2, 6, 23, 0.72))');
                } else if (isDimZone) {
                  layers.push('linear-gradient(rgba(15, 23, 42, 0.36), rgba(15, 23, 42, 0.36))');
                }

                const boxShadow = inSelfAttack
                  ? 'inset 0 0 0 2px rgba(248, 113, 113, 0.8)'
                  : inNormalAttack
                    ? 'inset 0 0 0 1px rgba(248, 113, 113, 0.4)'
                    : inMaxAttack
                      ? 'inset 0 0 0 1px rgba(248, 113, 113, 0.2)'
                      : undefined;

                if (layers.length === 0 && !boxShadow) {
                  return <div key={idx} />;
                }

                return (
                  <div
                    key={idx}
                    style={{
                      backgroundImage: layers.join(', '),
                      boxShadow,
                    }}
                  />
                );
              })}
            </div>
          );
        })()}

        {/* Tactical Grid Overlay */}
        {map.showGrid && (
          <div
            className="absolute inset-0 pointer-events-none grid z-[6]"
            style={{
              gridTemplateColumns: `repeat(${map.cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${map.rows}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: map.cols * map.rows }).map((_, idx) => (
              <div
                key={idx}
                className="border-r border-b"
                style={{
                  borderColor: `rgba(226, 232, 240, ${map.gridOpacity})`,
                }}
              />
            ))}
          </div>
        )}

        {/* Drag Target Cell Highlight (Tactical mode only) */}
        {interactive && isTactical && dragState && (
          <div
            className="absolute pointer-events-none border-2 border-amber-400 bg-amber-400/20 rounded-md z-10 transition-transform duration-75"
            style={{
              left: `${(dragState.x / map.cols) * 100}%`,
              top: `${(dragState.y / map.rows) * 100}%`,
              width: `${(dragState.size / map.cols) * 100}%`,
              height: `${(dragState.size / map.rows) * 100}%`,
            }}
          />
        )}

        {/* Interactive Activity Hotspots (City buildings, doors, portals) */}
        {hotspots.map((hs) => {
          const isDraggingHs = hotspotDrag?.hotspotId === hs.id;
          const hx = isDraggingHs ? hotspotDrag.x : hs.x;
          const hy = isDraggingHs ? hotspotDrag.y : hs.y;
          const accent = getHotspotAccent(hs.category);
          const isSelectedHs = selectedHotspotId === hs.id;

          return (
            <button
              key={hs.id}
              type="button"
              onPointerDown={(e) => handleHotspotPointerDown(e, hs)}
              onPointerMove={(e) => handleHotspotPointerMove(e, hs)}
              onPointerUp={(e) => handleHotspotPointerUp(e, hs)}
              onPointerCancel={(e) => handleHotspotPointerUp(e, hs)}
              onClick={(e) => {
                e.stopPropagation();
                if (interactive && !hotspotEditMode) {
                  onHotspotClick?.(hs);
                }
              }}
              title={hs.description || hs.label}
              className={`absolute -translate-x-1/2 -translate-y-1/2 z-15 group flex flex-col items-center gap-1 ${
                interactive
                  ? hotspotEditMode
                    ? 'cursor-move touch-none'
                    : 'cursor-pointer'
                  : 'pointer-events-none'
              } ${isDraggingHs ? 'z-40 scale-105' : 'transition-transform duration-150'}`}
              style={{
                left: `${hx}%`,
                top: `${hy}%`,
              }}
            >
              <span
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shadow-lg border-2 transition-transform group-hover:scale-110 ${
                  isSelectedHs ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0B0F17]' : ''
                } ${!hs.visibleOnTv ? 'opacity-55 border-dashed' : ''}`}
                style={{
                  backgroundColor: 'rgba(11, 15, 23, 0.92)',
                  borderColor: accent,
                  color: accent,
                }}
              >
                <HotspotIcon category={hs.category} className="w-4 h-4" />
              </span>
              <span className="px-2 py-0.5 rounded bg-[#0B0F17]/92 border border-slate-700/90 text-[11px] font-medium text-slate-100 whitespace-nowrap shadow-md">
                {hs.label}
              </span>
            </button>
          );
        })}

        {/* Map Tokens */}
        {tokens.map((token) => {
          const isDragging = dragState?.tokenId === token.id;
          const displayX = isDragging ? dragState.x : token.x;
          const displayY = isDragging ? dragState.y : token.y;
          const isDead = token.combatStatus === 'dead';
          const isUnconscious =
            !isDead &&
            (token.combatStatus === 'unconscious' ||
              (token.conditions ?? []).some((c) => c.toLowerCase().includes('бессознат')));
          const isTurn = !isDead && activeTurnTokenId === token.id;
          const isSelected = selectedTokenId === token.id;
          const initials = token.label.trim().slice(0, 2).toUpperCase();

          return (
            <button
              key={token.id}
              type="button"
              onPointerDown={(e) => handleTokenPointerDown(e, token)}
              onPointerMove={(e) => handleTokenPointerMove(e, token)}
              onPointerUp={(e) => handleTokenPointerUp(e, token)}
              onPointerCancel={(e) => handleTokenPointerUp(e, token)}
              onClick={(e) => {
                e.stopPropagation();
                if (interactive && !hotspotEditMode) onSelectToken?.(token.id);
              }}
              aria-label={`Фишка ${token.label}`}
              className={`absolute p-1 flex items-center justify-center z-20 ${
                interactive && !hotspotEditMode
                  ? 'cursor-grab active:cursor-grabbing touch-none'
                  : 'pointer-events-none'
              } ${isDragging ? 'z-30 scale-105' : isTactical ? 'transition-all duration-200 ease-out' : 'transition-all duration-150 ease-out'}`}
              style={{
                left: `${(displayX / map.cols) * 100}%`,
                top: `${(displayY / map.rows) * 100}%`,
                width: `${(token.size / map.cols) * 100}%`,
                height: `${(token.size / map.rows) * 100}%`,
              }}
            >
              <div
                className={`relative w-full h-full max-w-[90%] max-h-[90%] rounded-full flex flex-col items-center justify-center shadow-lg border-2 ${
                  isTurn
                    ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#0B0F17]'
                    : isSelected
                      ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-[#0B0F17]'
                      : ''
                } ${isDead ? 'opacity-65 grayscale' : ''} ${!token.visibleOnTv ? 'opacity-55 border-dashed' : ''}`}
                style={{
                  backgroundColor: isDead ? '#0F172A' : '#131A26',
                  borderColor: isDead ? '#475569' : token.color,
                  color: '#F8FAFC',
                }}
              >
                {/* Animated Cartoon Dizzy Stars Above Unconscious Token */}
                {isUnconscious && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-10 h-5 pointer-events-none z-30 flex items-center justify-center"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="absolute w-3.5 h-3.5 text-amber-300 drop-shadow-[0_0_4px_rgba(251,191,36,0.95)] animate-dizzy-a"
                      fill="currentColor"
                    >
                      <path d="M12 1.8l2.6 5.9 6.4.6-4.8 4.2 1.4 6.2L12 15.4 6.4 18.7l1.4-6.2L3 8.3l6.4-.6L12 1.8z" />
                    </svg>
                    <svg
                      viewBox="0 0 24 24"
                      className="absolute w-3 h-3 text-yellow-200 drop-shadow-[0_0_4px_rgba(253,224,71,0.9)] animate-dizzy-b"
                      fill="currentColor"
                    >
                      <path d="M12 1.8l2.6 5.9 6.4.6-4.8 4.2 1.4 6.2L12 15.4 6.4 18.7l1.4-6.2L3 8.3l6.4-.6L12 1.8z" />
                    </svg>
                    <svg
                      viewBox="0 0 24 24"
                      className="absolute w-2.5 h-2.5 text-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.9)] animate-dizzy-c"
                      fill="currentColor"
                    >
                      <path d="M12 1.8l2.6 5.9 6.4.6-4.8 4.2 1.4 6.2L12 15.4 6.4 18.7l1.4-6.2L3 8.3l6.4-.6L12 1.8z" />
                    </svg>
                  </span>
                )}

                <div
                  className="w-full h-full rounded-full overflow-hidden flex items-center justify-center gap-0.5 font-semibold text-[11px] sm:text-xs tracking-tight"
                  style={{
                    background: isDead
                      ? 'radial-gradient(circle at 50% 40%, #334155 0%, #090D14 88%)'
                      : `radial-gradient(circle at 35% 30%, ${token.color}44, #0B0F17 85%)`,
                  }}
                >
                  {isDead ? (
                    <Skull className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
                  ) : token.portraitUrl ? (
                    <img
                      src={token.portraitUrl}
                      alt={token.label}
                      draggable={false}
                      className="w-full h-full object-cover object-top pointer-events-none"
                    />
                  ) : token.kind === 'player' ? (
                    <span className="font-mono font-bold leading-none">{initials}</span>
                  ) : (
                    renderTokenIcon(token)
                  )}
                </div>

                {/* Compact Label Below Token */}
                <span
                  className={`absolute -bottom-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-[#0B0F17]/92 border text-[10px] font-medium whitespace-nowrap pointer-events-none shadow ${
                    isDead
                      ? 'border-slate-800/80 text-slate-400 line-through'
                      : 'border-slate-800 text-slate-100'
                  }`}
                >
                  {token.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
