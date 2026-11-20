import React, { useMemo } from 'react';
import { Monitor, SlidersHorizontal, Smartphone, ArrowRight } from 'lucide-react';

interface LauncherViewProps {
  onNavigate: (path: string) => void;
}

export function LauncherView({ onNavigate }: LauncherViewProps) {
  const playUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/play';
    return `${window.location.origin}/play`;
  }, []);

  const qrUrl = useMemo(() => `/api/qr?url=${encodeURIComponent(playUrl)}`, [playUrl]);

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col">
      <header className="h-16 px-6 border-b border-slate-800/90 flex items-center justify-between gap-8 max-w-6xl w-full mx-auto">
        <span className="text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
          Tabletop Sync
        </span>
        <nav className="hidden sm:flex items-center gap-6 text-sm text-slate-400">
          <button
            type="button"
            onClick={() => onNavigate('/tv')}
            className="hover:text-slate-100 transition-colors whitespace-nowrap"
          >
            Экран ТВ
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/dm')}
            className="hover:text-slate-100 transition-colors whitespace-nowrap"
          >
            Пульт мастера
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/catalogs')}
            className="hover:text-slate-100 transition-colors whitespace-nowrap"
          >
            Справочники
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/play')}
            className="hover:text-slate-100 transition-colors whitespace-nowrap"
          >
            Лист игрока
          </button>
        </nav>
        <button
          type="button"
          onClick={() => onNavigate('/dm')}
          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          Открыть пульт ДМ
        </button>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-12 flex flex-col justify-center gap-12">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-4">
            <p className="text-xs font-medium text-amber-400 tracking-wide">
              Локальный сервер синхронизации D&D
            </p>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-100 leading-tight [text-wrap:balance]">
              Общий стол на телевизоре и личный лист на телефоне
            </h1>
            <p className="text-base text-slate-400 max-w-2xl leading-relaxed">
              Единый сервер в реальном времени обновляет тактическую карту на большом экране и
              рассылает персональный инвентарь, здоровье и секретные заметки каждому игроку в комнате.
            </p>
          </div>

          <div className="lg:col-span-5 flex items-center gap-5 p-5 rounded-2xl bg-[#131A26] border border-slate-800">
            <div className="w-28 h-28 rounded-xl bg-slate-50 p-2 shrink-0">
              <img
                src={qrUrl}
                alt="QR-код для входа игроков"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="space-y-1.5 min-w-0">
              <div className="text-sm font-semibold text-slate-100">Быстрый вход с телефона</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Игроки сканируют код камерой и выбирают своего героя без установки приложений.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('/play')}
                className="text-xs font-medium text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 pt-1"
              >
                <span>Открыть страницу игрока</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Three Role Destinations */}
        <div className="grid md:grid-cols-3 gap-5">
          <button
            type="button"
            onClick={() => onNavigate('/tv')}
            className="group p-6 rounded-2xl bg-[#131A26] hover:bg-slate-800/70 border border-slate-800 hover:border-slate-700 text-left space-y-4 transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-[#0B0F17] border border-slate-800 flex items-center justify-center text-amber-400">
              <Monitor className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold text-slate-100 flex items-center justify-between">
                <span>Экран телевизора</span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Тактическая сетка, карта подземелья, плавно двигающиеся фишки и общие события сцены. Личный инвентарь скрыт.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/play')}
            className="group p-6 rounded-2xl bg-[#131A26] hover:bg-slate-800/70 border border-slate-800 hover:border-slate-700 text-left space-y-4 transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-[#0B0F17] border border-slate-800 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold text-slate-100 flex items-center justify-between">
                <span>Смартфон игрока</span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Персональный рюкзак с предметами, золото, точное HP и секретные заметки от мастера в реальном времени.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/dm')}
            className="group p-6 rounded-2xl bg-[#131A26] hover:bg-slate-800/70 border border-slate-800 hover:border-slate-700 text-left space-y-4 transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-[#0B0F17] border border-slate-800 flex items-center justify-center text-sky-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold text-slate-100 flex items-center justify-between">
                <span>Панель мастера</span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 transition-colors" />
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Загрузка своей карты, перетаскивание фишек (drag-and-drop), выдача лута в инвентарь и запуск событий.
              </p>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
}
