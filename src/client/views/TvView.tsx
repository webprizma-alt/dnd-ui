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
  Smartphone,
  Swords,
  Tent,
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

export function TvView({ onNavigate }: TvViewProps) {
  const { status, tvState } = useGameSocket({ role: 'tv' });
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
  const activeTurnToken = !isCityMap
    ? tokens.find((t) => t.id === scene.activeTurnTokenId) ?? null
    : null;

  const modeLabel =
    scene.mode === 'combat' ? 'Бой' : scene.mode === 'rest' ? 'Привал' : 'Исследование';

  const ModeIcon = scene.mode === 'combat' ? Swords : scene.mode === 'rest' ? Tent : Compass;

  // Build tactical turn-order tabs: heroes on this map + monsters/NPCs sorted by initiative desc
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
            });
          }
        }

        return entries.sort((a, b) => b.initiative - a.initiative);
      })()
    : [];

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0B0F17] text-slate-100 flex flex-col relative">
      {/* Compact Top Bar */}
      <header className="h-14 shrink-0 px-5 border-b border-slate-800/90 bg-[#0B0F17] flex items-center justify-between gap-6 z-30">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="text-sm font-semibold tracking-tight text-slate-100 hover:text-amber-400 transition-colors whitespace-nowrap shrink-0"
          >
            {tvDisplay.campaignTitle}
          </button>
          <span className="text-slate-700" aria-hidden="true">/</span>
          <h1 className="text-base font-semibold text-slate-100 truncate">
            {tvDisplay.phase === 'traveling'
              ? `В пути → ${tvDisplay.toLocationName || scene.locationName}`
              : scene.locationName}
          </h1>
          {tvDisplay.phase === 'live' && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 whitespace-nowrap shrink-0">
              <ModeIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>{modeLabel}</span>
              {!isCityMap && scene.mode === 'combat' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-slate-200">Раунд {scene.round}</span>
                </>
              )}
              {!isCityMap && activeTurnToken && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    Ход: <strong className="text-amber-400 font-semibold">{activeTurnToken.label}</strong>
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400 whitespace-nowrap">
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              aria-hidden="true"
            />
            <span>{status === 'connected' ? 'Синхронизировано' : 'Переподключение...'}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowQr((prev) => !prev)}
            className="px-3.5 py-2 rounded-lg bg-[#131A26] hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-100 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <QrCode className="w-4 h-4 text-amber-400" />
            <span>Подключить телефон</span>
          </button>
        </div>
      </header>

      {/* Main Viewport: Title Splash / Animated Travel Screen / Live Map */}
      <main className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        {/* PHASE 1: GAME TITLE SPLASH OVER CITY MAP */}
        {tvDisplay.phase === 'title_splash' && (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {/* Softly blurred starting/saved city map behind the title screen */}
            {map.imageUrl && (
              <img
                src={map.imageUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover scale-105 blur-[3px] opacity-40 animate-tv-pan pointer-events-none"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-[#0B0F17]/75 to-[#0B0F17]/85 pointer-events-none" />

            {/* Centered Game Logo & Title */}
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
                <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-wider text-amber-100 text-balance drop-shadow-lg">
                  {tvDisplay.campaignTitle}
                </h2>
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

            {/* Subtle Floating Lantern Embers */}
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

            {/* Centered Journey Card */}
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

              {/* Animated Route Track: From -> Marching Party -> Destination */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300 px-1 gap-4">
                  <span className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{tvDisplay.fromLocationName || 'Предыдущая локация'}</span>
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

                {/* Animated Road Bar with Marching Footsteps / Party Silhouettes */}
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

        {/* PHASE 3: LIVE LOCATION MAP (CITY OR TACTICAL) */}
        {tvDisplay.phase === 'live' && (
          <div className="relative w-full h-full p-3 sm:p-5 flex items-center justify-center">
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
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4 pointer-events-none">
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
                    <span className="text-xs text-slate-300/80 whitespace-nowrap">Событие сцены</span>
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

      {/* Bottom Compact Turn-Order Tabs (NO HP, NO levels, NO AC — shown only on player phones) */}
      <footer className="shrink-0 border-t border-slate-800/90 bg-[#131A26] px-5 py-2.5 z-20">
        {isCityMap ? (
          players.length === 0 ? (
            <div className="py-1.5 text-center text-xs text-slate-400">
              В партии пока нет персонажей · Подключите смартфоны через QR-код
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 overflow-x-auto">
              <div className="flex items-center gap-2 flex-nowrap">
                {players.map((player) => {
                  const isElsewhere = player.locationId !== activeLocationId;
                  return (
                    <div
                      key={player.id}
                      className={`px-3 py-1.5 rounded-lg bg-[#0B0F17] border border-slate-800 flex items-center gap-2 shrink-0 ${
                        isElsewhere ? 'opacity-65' : ''
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: player.color }}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-semibold text-slate-100 whitespace-nowrap">
                        {player.name}
                      </span>
                      {isElsewhere && (
                        <span className="text-[11px] text-sky-300 whitespace-nowrap">
                          · {player.locationName}
                        </span>
                      )}
                      <Smartphone
                        className={`w-3 h-3 shrink-0 ${
                          player.isConnected ? 'text-emerald-400' : 'text-slate-600'
                        }`}
                        aria-label={player.isConnected ? 'Телефон подключен' : 'Телефон не подключен'}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 whitespace-nowrap shrink-0">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                <span>Свободный ход · все ходят одновременно</span>
              </div>
            </div>
          )
        ) : tacticalTurnEntries.length === 0 ? (
          <div className="py-1.5 text-center text-xs text-slate-400">
            На тактической карте пока нет участников · Расставьте героев и врагов в пульте мастера
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 overflow-x-auto">
            <div className="flex items-center gap-2 flex-nowrap">
              {tacticalTurnEntries.map((entry) => (
                <div
                  key={entry.key}
                  className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 shrink-0 transition-colors ${
                    entry.isTurn
                      ? 'bg-amber-500/15 border-amber-400 text-amber-200 shadow-md shadow-amber-500/10'
                      : 'bg-[#0B0F17] border-slate-800 text-slate-300'
                  }`}
                >
                  {entry.kind === 'enemy' ? (
                    <Skull
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: entry.isTurn ? '#FBBF24' : entry.color }}
                    />
                  ) : entry.kind === 'npc' ? (
                    <Shield
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: entry.isTurn ? '#FBBF24' : entry.color }}
                    />
                  ) : (
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: entry.color }}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`text-xs whitespace-nowrap ${
                      entry.isTurn ? 'font-bold text-amber-100' : 'font-medium text-slate-200'
                    }`}
                  >
                    {entry.label}
                  </span>
                  {entry.isTurn && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-400 whitespace-nowrap">
                      · Ход
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 whitespace-nowrap shrink-0">
              <Swords className="w-3.5 h-3.5 text-amber-400" />
              <span>Порядок ходов</span>
            </div>
          </div>
        )}
      </footer>

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
