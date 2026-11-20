import React, { useMemo, useState } from 'react';
import {
  Check,
  Compass,
  Copy,
  Footprints,
  MapPin,
  QrCode,
  Shield,
  Skull,
  Swords,
  X,
} from 'lucide-react';
import { TacticalMap } from '../components/TacticalMap';
import { useGameSocket } from '../useGameSocket';

interface TvViewProps {
  onNavigate: (path: string) => void;
}

const TRAVEL_EMBERS = [
  { left: '16%', bottom: '18%', delay: '0s', duration: '5.6s' },
  { left: '34%', bottom: '24%', delay: '1.3s', duration: '6.4s' },
  { left: '52%', bottom: '14%', delay: '2.2s', duration: '5.2s' },
  { left: '68%', bottom: '22%', delay: '0.7s', duration: '6.8s' },
  { left: '82%', bottom: '16%', delay: '1.9s', duration: '5.9s' },
];

export function TvView({ onNavigate: _onNavigate }: TvViewProps) {
  const { tvState } = useGameSocket({ role: 'tv' });
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);

  const playUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/play';
    return `${window.location.origin}/play`;
  }, []);

  const qrImageUrl = useMemo(
    () => `/api/qr?url=${encodeURIComponent(playUrl)}`,
    [playUrl]
  );

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(playUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may be restricted in some contexts
    }
  };

  if (!tvState) {
    return (
      <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="text-base font-medium text-slate-200">Подключение к игровому серверу...</p>
          <p className="text-sm text-slate-400">Ожидание синхронизации стола</p>
        </div>
      </div>
    );
  }

  const { scene, map, tokens, hotspots, players, tvDisplay, locationKind, activeLocationId } = tvState;
  const isCityMap = locationKind === 'city';

  // Build tactical turn-order playing cards: heroes on this map + monsters/NPCs sorted by initiative desc
  const tacticalTurnEntries = !isCityMap
    ? (() => {
        const entries: Array<{
          key: string;
          tokenId: string | null;
          label: string;
          color: string;
          kind: 'player' | 'enemy' | 'npc';
          initiative: number;
          isTurn: boolean;
          portraitUrl: string | null;
        }> = [];
        const coveredPlayerIds = new Set<string>();

        for (const tok of tokens) {
          if (tok.kind === 'object') continue;
          if (tok.kind === 'player' && tok.playerId) {
            const pl = players.find((p) => p.id === tok.playerId);
            coveredPlayerIds.add(tok.playerId);
            entries.push({
              key: tok.id,
              tokenId: tok.id,
              label: pl?.name ?? tok.label,
              color: pl?.color ?? tok.color,
              kind: 'player',
              initiative: pl?.initiative ?? tok.initiative ?? 0,
              isTurn: scene.activeTurnTokenId === tok.id,
              portraitUrl: pl?.portraitUrl ?? tok.portraitUrl ?? null,
            });
          } else {
            entries.push({
              key: tok.id,
              tokenId: tok.id,
              label: tok.label,
              color: tok.color,
              kind: tok.kind === 'enemy' ? 'enemy' : 'npc',
              initiative: tok.initiative ?? 0,
              isTurn: scene.activeTurnTokenId === tok.id,
              portraitUrl: tok.portraitUrl ?? null,
            });
          }
        }

        // Include any hero located on this tactical map even if their token was temporarily hidden/removed
        for (const pl of players) {
          if (pl.locationId === activeLocationId && !coveredPlayerIds.has(pl.id)) {
            entries.push({
              key: `player-${pl.id}`,
              tokenId: null,
              label: pl.name,
              color: pl.color,
              kind: 'player',
              initiative: pl.initiative ?? 0,
              isTurn: false,
              portraitUrl: pl.portraitUrl ?? null,
            });
          }
        }

        return entries.sort((a, b) => b.initiative - a.initiative);
      })()
    : [];

  const showCombatDeck =
    tvDisplay.phase === 'live' && !isCityMap && tacticalTurnEntries.length > 0;

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0B0F17] text-slate-100 relative">
      {/* Main Full-Viewport Canvas: Title Splash / Animated Travel Screen / Live Map */}
      <main className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {/* PHASE 1: GAME TITLE SPLASH OVER CITY MAP */}
        {tvDisplay.phase === 'title_splash' && (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {map.imageUrl && (
              <img
                src={map.imageUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover scale-105 blur-[3px] opacity-40 animate-tv-pan pointer-events-none"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-[#0B0F17]/75 to-[#0B0F17]/85 pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto px-8 py-10 text-center flex flex-col items-center space-y-5">
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden border border-amber-500/40 shadow-2xl shadow-black/70 bg-[#0B0F17] flex items-center justify-center">
                <img
                  src={tvDisplay.titleCrestUrl}
                  alt={tvDisplay.campaignTitle}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-2.5">
                <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-wider text-amber-100 text-balance drop-shadow-lg">
                  {tvDisplay.campaignTitle}
                </h1>
                {tvDisplay.campaignSubtitle && (
                  <p className="text-sm sm:text-base text-slate-300 tracking-wide">
                    {tvDisplay.campaignSubtitle}
                  </p>
                )}
              </div>

              <div className="w-40 h-px bg-gradient-to-r from-transparent via-amber-500/70 to-transparent" />

              <div className="space-y-1.5 text-xs sm:text-sm text-slate-300">
                <p>
                  {players.length > 0
                    ? `Продолжение приключения · Локация: ${scene.locationName}`
                    : `Стартовая локация: ${scene.locationName}`}
                </p>
                <p className="text-slate-400">
                  Ожидание начала игры мастером · Игроки могут подключиться с телефонов по QR-коду
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PHASE 2: ANIMATED PARTY TRAVEL SCREEN (UNTIL DM PRESSES "ГОТОВО") */}
        {tvDisplay.phase === 'traveling' && (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <img
              src={tvDisplay.travelBackdropUrl}
              alt="Партия в пути"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover opacity-75 animate-tv-pan pointer-events-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-[#0B0F17]/55 to-[#0B0F17]/70 pointer-events-none" />

            {TRAVEL_EMBERS.map((ember, idx) => (
              <span
                key={idx}
                aria-hidden="true"
                className="absolute w-1.5 h-1.5 rounded-full bg-amber-300/80 shadow-sm shadow-amber-400 animate-tv-ember pointer-events-none"
                style={{
                  left: ember.left,
                  bottom: ember.bottom,
                  animationDelay: ember.delay,
                  animationDuration: ember.duration,
                }}
              />
            ))}

            <div className="relative z-10 w-full max-w-2xl mx-4 rounded-2xl bg-[#0B0F17]/82 backdrop-blur-md border border-amber-500/35 px-7 py-8 shadow-2xl space-y-6 text-center">
              <div className="space-y-2">
                <div className="text-xs font-medium tracking-widest text-amber-400">
                  ПАРТИЯ В ПУТИ
                </div>
                <h2 className="font-display text-2xl sm:text-4xl font-bold text-slate-50 text-balance">
                  {tvDisplay.toLocationName || scene.locationName}
                </h2>
                {tvDisplay.travelMessage && (
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl mx-auto">
                    {tvDisplay.travelMessage}
                  </p>
                )}
              </div>

              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300 px-1 gap-4">
                  <span className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {tvDisplay.fromLocationName || 'Предыдущая локация'}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-300 font-medium truncate">
                    {tvDisplay.toLocationKind === 'tactical' ? (
                      <Swords className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    ) : (
                      <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    <span className="truncate">{tvDisplay.toLocationName || scene.locationName}</span>
                  </span>
                </div>

                <div className="relative h-11 rounded-xl bg-[#131A26]/90 border border-slate-800 overflow-hidden flex items-center px-4">
                  <div className="w-full border-t-2 border-dashed border-amber-500/35" />
                  <div className="absolute inset-y-0 left-3 right-16 flex items-center pointer-events-none">
                    <div className="w-full animate-tv-march">
                      <div className="inline-flex animate-tv-bob items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B0F17]/95 border border-amber-500/50 shadow-lg text-amber-400">
                        <Footprints className="w-4 h-4 text-amber-400 shrink-0" />
                        {players.slice(0, 4).map((p) => (
                          <span
                            key={p.id}
                            className="w-2.5 h-2.5 rounded-full border border-slate-950 shrink-0"
                            style={{ backgroundColor: p.color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400">
                Мастер подготавливает сцену и расстановку...
              </p>
            </div>
          </div>
        )}

        {/* PHASE 3: LIVE LOCATION MAP (CITY OR TACTICAL) — MAXIMIZED VERTICALLY */}
        {tvDisplay.phase === 'live' && (
          <div
            className={`relative z-10 w-full h-full pt-1.5 px-2 flex items-center justify-center ${
              showCombatDeck ? 'pb-[102px] sm:pb-[112px]' : 'pb-1.5'
            }`}
          >
            <TacticalMap
              map={map}
              tokens={tokens}
              locationKind={locationKind}
              hotspots={hotspots}
              activeTurnTokenId={isCityMap ? null : scene.activeTurnTokenId}
              interactive={false}
            />

            {/* Public Event Banner Overlay */}
            {scene.activeEvent && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4 pointer-events-none">
                <div
                  className={`rounded-xl px-5 py-3.5 border backdrop-blur-md shadow-2xl ${
                    scene.activeEvent.tone === 'danger'
                      ? 'bg-red-950/85 border-red-700/80 text-red-50'
                      : scene.activeEvent.tone === 'reward'
                        ? 'bg-emerald-950/85 border-emerald-700/80 text-emerald-50'
                        : 'bg-[#131A26]/90 border-amber-500/60 text-slate-100'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <h2 className="text-base sm:text-lg font-semibold tracking-tight">
                      {scene.activeEvent.title}
                    </h2>
                    <span className="text-xs text-slate-300/80 whitespace-nowrap">
                      Событие сцены
                    </span>
                  </div>
                  {scene.activeEvent.description && (
                    <p className="mt-1 text-sm text-slate-200/90 leading-snug">
                      {scene.activeEvent.description}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* COMBAT ONLY: Bottom Half-Playing-Card Turn-Order Deck (overlaps bottom ~14px of the map!) */}
      {showCombatDeck && (
        <div
          aria-label="Порядок ходов"
          className="fixed bottom-0 left-0 right-0 z-20 pointer-events-none pl-4 pr-48 sm:pr-52 pt-5 flex items-end justify-center"
        >
          <div className="flex items-end justify-center gap-2 sm:gap-2.5 max-w-full overflow-x-auto no-scrollbar pt-5 px-2">
            {tacticalTurnEntries.map((entry) => {
              const initials = entry.label.trim().slice(0, 2).toUpperCase();
              return (
                <div
                  key={entry.key}
                  className={`relative w-[92px] sm:w-[106px] lg:w-[114px] h-[116px] sm:h-[126px] rounded-t-xl border-x border-t overflow-hidden shrink-0 transition-all duration-200 will-change-transform bg-[#0E1420] ${
                    entry.isTurn
                      ? 'border-2 border-b-0 border-amber-400 -translate-y-3 scale-[1.05] z-20 shadow-[0_-8px_28px_rgba(245,158,11,0.42)]'
                      : 'border-b-0 border-slate-600/80 translate-y-0 z-10 shadow-[0_-4px_16px_rgba(0,0,0,0.65)]'
                  }`}
                >
                  {/* Portrait Layer (Full Color when Active Turn, Grayscale when Waiting) */}
                  <div
                    className={`w-full h-full transition-all duration-200 ${
                      entry.isTurn
                        ? 'grayscale-0 brightness-105 contrast-105'
                        : 'grayscale brightness-75 contrast-95 opacity-85'
                    }`}
                  >
                    {entry.portraitUrl ? (
                      <img
                        src={entry.portraitUrl}
                        alt={entry.label}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex flex-col items-center justify-center pb-5"
                        style={{
                          background: `radial-gradient(circle at 50% 35%, ${entry.color}55 0%, #111827 78%, #070B12 100%)`,
                        }}
                      >
                        {entry.kind === 'enemy' ? (
                          <Skull
                            className="w-9 h-9 opacity-90"
                            style={{ color: entry.isTurn ? '#FBBF24' : entry.color }}
                          />
                        ) : entry.kind === 'npc' ? (
                          <Shield
                            className="w-9 h-9 opacity-90"
                            style={{ color: entry.isTurn ? '#FBBF24' : entry.color }}
                          />
                        ) : (
                          <span className="font-display text-2xl font-bold tracking-wider text-slate-100 drop-shadow">
                            {initials}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Subtle Inner Playing-Card Ornamental Frame */}
                  <div
                    className={`absolute inset-[3px] bottom-0 rounded-t-lg pointer-events-none border-x border-t ${
                      entry.isTurn ? 'border-amber-300/60' : 'border-slate-400/20'
                    }`}
                  />

                  {/* Bottom Name Scrim (ONLY name — zero HP, levels, or AC) */}
                  <div className="absolute inset-x-0 bottom-0 pt-7 pb-1.5 px-2 bg-gradient-to-t from-[#05080F] via-[#05080F]/90 to-transparent text-center">
                    <div
                      className={`text-xs sm:text-[13px] leading-tight truncate drop-shadow ${
                        entry.isTurn
                          ? 'font-bold text-amber-200'
                          : 'font-semibold text-slate-200/95'
                      }`}
                    >
                      {entry.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom-Right Compact QR Button (replaces old "Порядок ходов" and stays available on City & Title screens) */}
      {tvDisplay.phase !== 'traveling' && (
        <button
          type="button"
          onClick={() => setShowQr((prev) => !prev)}
          className="fixed bottom-3 right-3 z-30 px-3.5 py-2 rounded-xl bg-[#0E1523]/90 hover:bg-slate-800/95 backdrop-blur-md border border-slate-700/85 hover:border-amber-500/60 text-xs font-medium text-slate-100 shadow-xl shadow-black/50 flex items-center gap-2 transition-colors whitespace-nowrap"
        >
          <QrCode className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Подключить игрока</span>
        </button>
      )}

      {/* QR Join Overlay */}
      {showQr && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowQr(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#131A26] border border-slate-700 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Вход для игроков</h2>
              <button
                type="button"
                onClick={() => setShowQr(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                aria-label="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Наведите камеру смартфона на QR-код, чтобы открыть лист своего персонажа и личный инвентарь без установки приложений.
            </p>

            <div className="mx-auto w-56 h-56 rounded-xl bg-slate-50 p-3 flex items-center justify-center">
              <img
                src={qrImageUrl}
                alt="QR-код для подключения игрока"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={playUrl}
                className="flex-1 px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs font-mono text-slate-300 truncate"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Готово' : 'Копия'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
