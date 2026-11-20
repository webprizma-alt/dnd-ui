export function renderTvMsxHtml(): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Tabletop Sync — TV (MSX)</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: #0B0F17;
      color: #F1F5F9;
      font-family: Arial, Helvetica, sans-serif;
    }
    .viewport {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      overflow: hidden;
      background-color: #0B0F17;
    }
    .arena-wrap {
      position: absolute;
      top: 6px;
      left: 8px;
      right: 8px;
      bottom: 6px;
      z-index: 10;
    }
    .arena-wrap-combat {
      bottom: 102px;
    }
    .arena-box {
      width: 100%;
      height: 100%;
      position: relative;
    }
    .board {
      position: absolute;
      background-color: #0F1521;
      border: 1px solid #1E293B;
      border-radius: 8px;
      overflow: hidden;
    }
    .map-img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
    .map-scrim {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(2, 6, 23, 0.16);
    }
    .grid-layer {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
    }
    .grid-v {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 1px;
    }
    .grid-h {
      position: absolute;
      left: 0;
      right: 0;
      height: 1px;
    }
    .token-wrap {
      position: absolute;
      padding: 4px;
      z-index: 20;
      transition: left 0.2s ease-out, top 0.2s ease-out;
    }
    .token-circle {
      width: 100%;
      height: 100%;
      border-radius: 999px;
      background-color: #131A26;
      border: 3px solid #F59E0B;
      position: relative;
      text-align: center;
      overflow: hidden;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.65);
    }
    .token-turn {
      box-shadow: 0 0 0 3px #0B0F17, 0 0 0 6px #F59E0B;
    }
    .token-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top center;
      display: block;
    }
    .token-initials {
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      margin-top: -8px;
      font-size: 13px;
      font-weight: bold;
      color: #F8FAFC;
      font-family: monospace;
    }
    .token-label {
      position: absolute;
      bottom: -18px;
      left: 50%;
      width: 120px;
      margin-left: -60px;
      text-align: center;
    }
    .token-label span {
      display: inline-block;
      padding: 1px 6px;
      background-color: rgba(11, 15, 23, 0.92);
      border: 1px solid #1E293B;
      border-radius: 4px;
      font-size: 11px;
      color: #F1F5F9;
      white-space: nowrap;
    }
    .banner {
      position: absolute;
      top: 16px;
      left: 16%;
      right: 16%;
      z-index: 30;
      padding: 12px 18px;
      border-radius: 10px;
      background-color: rgba(19, 26, 38, 0.94);
      border: 1px solid #F59E0B;
      text-align: left;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7);
    }
    .banner-danger {
      background-color: rgba(69, 10, 10, 0.94);
      border-color: #EF4444;
    }
    .banner-reward {
      background-color: rgba(6, 78, 59, 0.94);
      border-color: #10B981;
    }
    .banner-title {
      font-size: 18px;
      font-weight: bold;
      color: #F8FAFC;
    }
    .banner-desc {
      margin-top: 4px;
      font-size: 14px;
      color: #E2E8F0;
    }
    .hotspot-pin {
      position: absolute;
      z-index: 15;
      margin-left: -14px;
      margin-top: -14px;
      text-align: center;
    }
    .hotspot-dot {
      display: inline-block;
      width: 24px;
      height: 24px;
      line-height: 20px;
      border-radius: 12px;
      background-color: rgba(11, 15, 23, 0.92);
      border: 2px solid #F59E0B;
      color: #F59E0B;
      font-size: 12px;
      font-weight: bold;
    }
    .hotspot-text {
      display: block;
      margin-top: 2px;
      padding: 1px 6px;
      border-radius: 4px;
      background-color: rgba(11, 15, 23, 0.92);
      border: 1px solid #334155;
      color: #F8FAFC;
      font-size: 11px;
      white-space: nowrap;
    }
    .stage-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 40;
      background-color: rgba(11, 15, 23, 0.9);
      display: none;
    }
    .stage-bg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.42;
    }
    .stage-table {
      position: relative;
      z-index: 2;
      display: table;
      width: 100%;
      height: 100%;
    }
    .stage-cell {
      display: table-cell;
      vertical-align: middle;
      text-align: center;
      padding: 24px;
    }
    .stage-card {
      display: inline-block;
      max-width: 620px;
      padding: 26px 34px;
      border-radius: 14px;
      background-color: rgba(11, 15, 23, 0.86);
      border: 1px solid #F59E0B;
    }
    .stage-crest {
      width: 128px;
      height: 128px;
      border-radius: 64px;
      border: 2px solid #F59E0B;
      margin-bottom: 14px;
    }
    .stage-kicker {
      font-size: 12px;
      letter-spacing: 2px;
      color: #F59E0B;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .stage-title {
      font-size: 32px;
      font-weight: bold;
      color: #FEF3C7;
      margin-bottom: 8px;
    }
    .stage-sub {
      font-size: 15px;
      color: #CBD5E1;
      line-height: 1.45;
      margin-bottom: 12px;
    }
    .stage-route {
      font-size: 13px;
      color: #F59E0B;
      font-family: monospace;
      margin-top: 10px;
    }
    /* Bottom Half-Playing-Card Turn-Order Deck (Combat Only, Overlaps bottom ~14px of Map) */
    .turn-deck {
      position: fixed;
      left: 12px;
      right: 204px;
      bottom: 0;
      z-index: 25;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      pointer-events: none;
      padding-top: 20px;
      display: none;
    }
    .play-card {
      display: inline-block;
      vertical-align: bottom;
      position: relative;
      width: 102px;
      height: 116px;
      margin: 0 5px;
      border-radius: 12px 12px 0 0;
      border: 1px solid #475569;
      border-bottom: none;
      background-color: #0E1420;
      overflow: hidden;
      box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.72);
      transition: margin-bottom 0.2s ease-out;
    }
    .play-card-active {
      border: 2px solid #F59E0B;
      border-bottom: none;
      margin-bottom: 12px;
      height: 122px;
      width: 108px;
      box-shadow: 0 -8px 26px rgba(245, 158, 11, 0.45);
    }
    .play-card-art {
      width: 100%;
      height: 100%;
      position: relative;
      -webkit-filter: grayscale(100%) brightness(75%);
      filter: grayscale(100%) brightness(75%);
      opacity: 0.86;
    }
    .play-card-active .play-card-art {
      -webkit-filter: none;
      filter: none;
      opacity: 1;
    }
    .play-card-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top center;
      display: block;
    }
    .play-card-fallback {
      width: 100%;
      height: 100%;
      display: table;
      text-align: center;
    }
    .play-card-fallback-cell {
      display: table-cell;
      vertical-align: middle;
      padding-bottom: 18px;
      font-size: 24px;
      font-weight: bold;
      color: #F8FAFC;
      font-family: Georgia, serif;
    }
    .play-card-frame {
      position: absolute;
      top: 3px;
      left: 3px;
      right: 3px;
      bottom: 0;
      border-radius: 8px 8px 0 0;
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-bottom: none;
      pointer-events: none;
    }
    .play-card-active .play-card-frame {
      border-color: rgba(252, 211, 77, 0.6);
    }
    .play-card-name {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      padding: 18px 6px 6px 6px;
      background: linear-gradient(to top, rgba(5, 8, 15, 0.98) 0%, rgba(5, 8, 15, 0.85) 60%, rgba(5, 8, 15, 0) 100%);
      font-size: 12px;
      font-weight: bold;
      color: #E2E8F0;
      text-align: center;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .play-card-active .play-card-name {
      color: #FDE68A;
    }
    /* Bottom-Right Floating QR Button */
    .qr-btn {
      position: fixed;
      right: 14px;
      bottom: 14px;
      z-index: 60;
      padding: 9px 14px;
      background-color: rgba(14, 21, 35, 0.92);
      border: 1px solid #334155;
      border-radius: 10px;
      color: #F8FAFC;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.55);
    }
    .qr-btn-accent {
      color: #F59E0B;
      margin-right: 6px;
    }
    .qr-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 90;
      background-color: rgba(2, 6, 23, 0.85);
      display: none;
      text-align: center;
    }
    .qr-overlay-table {
      display: table;
      width: 100%;
      height: 100%;
    }
    .qr-overlay-cell {
      display: table-cell;
      vertical-align: middle;
      text-align: center;
      padding: 20px;
    }
    .qr-modal {
      display: inline-block;
      width: 360px;
      max-width: 92%;
      background-color: #131A26;
      border: 1px solid #334155;
      border-radius: 14px;
      padding: 22px;
      text-align: center;
    }
    .qr-title {
      font-size: 18px;
      font-weight: bold;
      color: #F8FAFC;
      margin-bottom: 8px;
    }
    .qr-sub {
      font-size: 13px;
      color: #94A3B8;
      line-height: 1.4;
      margin-bottom: 16px;
    }
    .qr-img-box {
      display: inline-block;
      background-color: #F8FAFC;
      padding: 10px;
      border-radius: 10px;
      margin-bottom: 12px;
    }
    .qr-img-box img {
      display: block;
      width: 210px;
      height: 210px;
    }
    .qr-url {
      font-family: monospace;
      font-size: 12px;
      color: #F59E0B;
      word-break: break-all;
      margin-bottom: 14px;
    }
    .qr-close {
      padding: 8px 18px;
      background-color: #F59E0B;
      color: #0B0F17;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: bold;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="viewport">
    <div id="arenaWrap" class="arena-wrap">
      <div id="arenaBox" class="arena-box">
        <div id="board" class="board">
          <img id="mapImg" class="map-img" alt="Карта" style="display:none;" />
          <div class="map-scrim"></div>
          <div id="gridLayer" class="grid-layer"></div>
          <div id="hotspotsLayer"></div>
          <div id="tokensLayer"></div>
        </div>
        <div id="banner" class="banner" style="display:none;">
          <div id="bannerTitle" class="banner-title"></div>
          <div id="bannerDesc" class="banner-desc"></div>
        </div>
      </div>
    </div>

    <div id="stageOverlay" class="stage-overlay">
      <img id="stageBgImg" class="stage-bg" alt="" style="display:none;" />
      <div class="stage-table">
        <div class="stage-cell">
          <div class="stage-card">
            <img id="stageCrestImg" class="stage-crest" alt="" style="display:none;" />
            <div id="stageKicker" class="stage-kicker"></div>
            <div id="stageTitle" class="stage-title"></div>
            <div id="stageSub" class="stage-sub"></div>
            <div id="stageRoute" class="stage-route"></div>
          </div>
        </div>
      </div>
    </div>

    <div id="turnDeck" class="turn-deck"></div>

    <button type="button" id="qrToggleBtn" class="qr-btn">
      <span class="qr-btn-accent">[QR]</span>Подключить игрока
    </button>
  </div>

  <div id="qrOverlay" class="qr-overlay">
    <div class="qr-overlay-table">
      <div class="qr-overlay-cell">
        <div class="qr-modal">
          <div class="qr-title">Вход для игроков</div>
          <div class="qr-sub">Отсканируйте QR-код камерой телефона, чтобы открыть лист персонажа и личный инвентарь.</div>
          <div class="qr-img-box">
            <img id="qrImg" alt="QR-код" />
          </div>
          <div id="qrUrlText" class="qr-url"></div>
          <button type="button" id="qrCloseBtn" class="qr-close">Закрыть</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    (function () {
      var latestState = null;
      var qrOpen = false;
      var ws = null;
      var retryTimer = null;

      var arenaWrapEl = document.getElementById('arenaWrap');
      var arenaBoxEl = document.getElementById('arenaBox');
      var boardEl = document.getElementById('board');
      var mapImgEl = document.getElementById('mapImg');
      var gridLayerEl = document.getElementById('gridLayer');
      var hotspotsLayerEl = document.getElementById('hotspotsLayer');
      var tokensLayerEl = document.getElementById('tokensLayer');
      var stageOverlayEl = document.getElementById('stageOverlay');
      var stageBgImgEl = document.getElementById('stageBgImg');
      var stageCrestImgEl = document.getElementById('stageCrestImg');
      var stageKickerEl = document.getElementById('stageKicker');
      var stageTitleEl = document.getElementById('stageTitle');
      var stageSubEl = document.getElementById('stageSub');
      var stageRouteEl = document.getElementById('stageRoute');
      var bannerEl = document.getElementById('banner');
      var bannerTitleEl = document.getElementById('bannerTitle');
      var bannerDescEl = document.getElementById('bannerDesc');
      var turnDeckEl = document.getElementById('turnDeck');
      var qrOverlayEl = document.getElementById('qrOverlay');
      var qrImgEl = document.getElementById('qrImg');
      var qrUrlTextEl = document.getElementById('qrUrlText');
      var qrToggleBtn = document.getElementById('qrToggleBtn');
      var qrCloseBtn = document.getElementById('qrCloseBtn');

      var playUrl = window.location.protocol + '//' + window.location.host + '/play';
      qrImgEl.src = '/api/qr?format=png&url=' + encodeURIComponent(playUrl);
      qrUrlTextEl.textContent = playUrl;

      function esc(str) {
        return String(str || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      }

      function setQrOpen(next) {
        qrOpen = Boolean(next);
        qrOverlayEl.style.display = qrOpen ? 'block' : 'none';
      }

      qrToggleBtn.onclick = function () { setQrOpen(!qrOpen); };
      qrCloseBtn.onclick = function () { setQrOpen(false); };
      qrOverlayEl.onclick = function (e) {
        if (e.target === qrOverlayEl || e.target.className === 'qr-overlay-cell') {
          setQrOpen(false);
        }
      };

      document.onkeydown = function (e) {
        var code = e.keyCode || e.which;
        if (code === 13) {
          setQrOpen(!qrOpen);
        } else if (code === 27 || code === 461 || code === 8) {
          if (qrOpen) {
            setQrOpen(false);
            if (e.preventDefault) e.preventDefault();
          }
        }
      };

      function fitBoard() {
        if (!latestState || !latestState.map) return;
        var cols = latestState.map.cols || 16;
        var rows = latestState.map.rows || 9;
        var availW = arenaBoxEl.clientWidth;
        var availH = arenaBoxEl.clientHeight;
        if (availW <= 0 || availH <= 0) return;

        var targetRatio = cols / rows;
        if (mapImgEl.style.display !== 'none' && mapImgEl.naturalWidth > 0 && mapImgEl.naturalHeight > 0) {
          targetRatio = mapImgEl.naturalWidth / mapImgEl.naturalHeight;
        }
        var boxRatio = availW / availH;
        var w, h;
        if (boxRatio > targetRatio) {
          h = availH;
          w = Math.floor(h * targetRatio);
        } else {
          w = availW;
          h = Math.floor(w / targetRatio);
        }
        var left = Math.floor((availW - w) / 2);
        var top = Math.floor((availH - h) / 2);
        boardEl.style.width = w + 'px';
        boardEl.style.height = h + 'px';
        boardEl.style.left = left + 'px';
        boardEl.style.top = top + 'px';
      }

      mapImgEl.onload = fitBoard;
      window.onresize = fitBoard;

      function renderState(state) {
        latestState = state;

        var scene = state.scene || {};
        var map = state.map || { cols: 16, rows: 9, showGrid: true, gridOpacity: 0.25 };
        var tokens = state.tokens || [];
        var hotspots = state.hotspots || [];
        var players = state.players || [];
        var tvDisplay = state.tvDisplay || { phase: 'live', campaignTitle: 'Tabletop Sync' };
        var isCity = state.locationKind === 'city';

        // Title Splash or Travel Transition overlay
        if (tvDisplay.phase === 'title_splash') {
          stageOverlayEl.style.display = 'block';
          qrToggleBtn.style.display = 'block';
          if (map.imageUrl) {
            stageBgImgEl.src = map.imageUrl;
            stageBgImgEl.style.display = 'block';
          } else {
            stageBgImgEl.style.display = 'none';
          }
          if (tvDisplay.titleCrestUrl) {
            stageCrestImgEl.src = tvDisplay.titleCrestUrl;
            stageCrestImgEl.style.display = 'inline-block';
          } else {
            stageCrestImgEl.style.display = 'none';
          }
          stageKickerEl.textContent = players.length > 0 ? 'ПРОДОЛЖЕНИЕ КАМПАНИИ' : 'НОВОЕ ПРИКЛЮЧЕНИЕ';
          stageTitleEl.textContent = tvDisplay.campaignTitle || 'Хроники Эшборна';
          stageSubEl.textContent = tvDisplay.campaignSubtitle || 'Ожидание начала сессии мастером';
          stageRouteEl.textContent = 'Локация: ' + (scene.locationName || '');
        } else if (tvDisplay.phase === 'traveling') {
          stageOverlayEl.style.display = 'block';
          qrToggleBtn.style.display = 'none';
          if (tvDisplay.travelBackdropUrl) {
            stageBgImgEl.src = tvDisplay.travelBackdropUrl;
            stageBgImgEl.style.display = 'block';
          } else {
            stageBgImgEl.style.display = 'none';
          }
          stageCrestImgEl.style.display = 'none';
          stageKickerEl.textContent = 'ПАРТИЯ В ПУТИ';
          stageTitleEl.textContent = tvDisplay.toLocationName || scene.locationName || 'Переход';
          stageSubEl.textContent = tvDisplay.travelMessage || 'Мастер подготавливает локацию...';
          stageRouteEl.textContent = (tvDisplay.fromLocationName || '') + '  →  ' + (tvDisplay.toLocationName || '');
        } else {
          stageOverlayEl.style.display = 'none';
          qrToggleBtn.style.display = 'block';
        }

        // Build combat turn-order cards (ONLY on tactical maps!)
        var entries = [];
        if (tvDisplay.phase === 'live' && !isCity) {
          var covered = {};
          for (var ti = 0; ti < tokens.length; ti++) {
            var tk = tokens[ti];
            if (tk.kind === 'object') continue;
            if (tk.kind === 'player' && tk.playerId) {
              var foundPl = null;
              for (var pi = 0; pi < players.length; pi++) {
                if (players[pi].id === tk.playerId) {
                  foundPl = players[pi];
                  break;
                }
              }
              covered[tk.playerId] = true;
              entries.push({
                label: foundPl ? foundPl.name : tk.label,
                color: foundPl ? foundPl.color : tk.color,
                initiative: foundPl && typeof foundPl.initiative === 'number' ? foundPl.initiative : (tk.initiative || 0),
                isTurn: scene.activeTurnTokenId === tk.id,
                portraitUrl: (foundPl && foundPl.portraitUrl) || tk.portraitUrl || null
              });
            } else {
              entries.push({
                label: tk.label,
                color: tk.color,
                initiative: typeof tk.initiative === 'number' ? tk.initiative : 0,
                isTurn: scene.activeTurnTokenId === tk.id,
                portraitUrl: tk.portraitUrl || null
              });
            }
          }
          for (var pj = 0; pj < players.length; pj++) {
            var pl2 = players[pj];
            if (pl2.locationId === state.activeLocationId && !covered[pl2.id]) {
              entries.push({
                label: pl2.name,
                color: pl2.color,
                initiative: typeof pl2.initiative === 'number' ? pl2.initiative : 0,
                isTurn: false,
                portraitUrl: pl2.portraitUrl || null
              });
            }
          }
          entries.sort(function (a, b) { return b.initiative - a.initiative; });
        }

        var showDeck = tvDisplay.phase === 'live' && !isCity && entries.length > 0;
        arenaWrapEl.className = showDeck ? 'arena-wrap arena-wrap-combat' : 'arena-wrap';
        fitBoard();

        if (map.imageUrl) {
          if (mapImgEl.getAttribute('src') !== map.imageUrl) {
            mapImgEl.src = map.imageUrl;
          }
          mapImgEl.style.display = 'block';
        } else {
          mapImgEl.style.display = 'none';
        }

        // Render Grid Lines without CSS Grid
        if (map.showGrid) {
          var alpha = typeof map.gridOpacity === 'number' ? map.gridOpacity : 0.25;
          var lineColor = 'rgba(226, 232, 240, ' + alpha + ')';
          var gridHtml = '';
          for (var c = 1; c < map.cols; c++) {
            var leftPct = (c / map.cols) * 100;
            gridHtml += '<div class="grid-v" style="left:' + leftPct + '%;background-color:' + lineColor + ';"></div>';
          }
          for (var r = 1; r < map.rows; r++) {
            var topPct = (r / map.rows) * 100;
            gridHtml += '<div class="grid-h" style="top:' + topPct + '%;background-color:' + lineColor + ';"></div>';
          }
          gridLayerEl.innerHTML = gridHtml;
        } else {
          gridLayerEl.innerHTML = '';
        }

        // Render Activity Hotspots
        var hsHtml = '';
        for (var h = 0; h < hotspots.length; h++) {
          var hs = hotspots[h];
          var hsColor = hs.category === 'dungeon' ? '#EF4444' : (hs.category === 'portal' ? '#38BDF8' : '#F59E0B');
          hsHtml +=
            '<div class="hotspot-pin" style="left:' + hs.x + '%;top:' + hs.y + '%;">' +
              '<span class="hotspot-dot" style="border-color:' + hsColor + ';color:' + hsColor + ';">•</span>' +
              '<span class="hotspot-text">' + esc(hs.label) + '</span>' +
            '</div>';
        }
        hotspotsLayerEl.innerHTML = hsHtml;

        // Render Tokens
        var tokensHtml = '';
        for (var t = 0; t < tokens.length; t++) {
          var tok = tokens[t];
          var tx = (tok.x / map.cols) * 100;
          var ty = (tok.y / map.rows) * 100;
          var tw = (tok.size / map.cols) * 100;
          var th = (tok.size / map.rows) * 100;
          var isTurn = !isCity && scene.activeTurnTokenId === tok.id;
          var initials = (tok.label || '?').slice(0, 2).toUpperCase();
          var circleClass = isTurn ? 'token-circle token-turn' : 'token-circle';
          var innerTok = tok.portraitUrl
            ? '<img class="token-img" src="' + esc(tok.portraitUrl) + '" alt="" />'
            : '<span class="token-initials">' + esc(initials) + '</span>';
          tokensHtml +=
            '<div class="token-wrap" style="left:' + tx + '%;top:' + ty + '%;width:' + tw + '%;height:' + th + '%;">' +
              '<div class="' + circleClass + '" style="border-color:' + esc(tok.color || '#F59E0B') + ';">' +
                innerTok +
              '</div>' +
              '<div class="token-label"><span>' + esc(tok.label) + '</span></div>' +
            '</div>';
        }
        tokensLayerEl.innerHTML = tokensHtml;

        // Render Active Event Banner
        if (scene.activeEvent) {
          var bClass = 'banner';
          if (scene.activeEvent.tone === 'danger') bClass += ' banner-danger';
          else if (scene.activeEvent.tone === 'reward') bClass += ' banner-reward';
          bannerEl.className = bClass;
          bannerTitleEl.textContent = scene.activeEvent.title || '';
          bannerDescEl.textContent = scene.activeEvent.description || '';
          bannerDescEl.style.display = scene.activeEvent.description ? 'block' : 'none';
          bannerEl.style.display = 'block';
        } else {
          bannerEl.style.display = 'none';
        }

        // Render Half-Playing-Card Turn-Order Deck (Combat Only; Hidden on City Maps)
        if (showDeck) {
          var cardsHtml = '';
          for (var ei = 0; ei < entries.length; ei++) {
            var en = entries[ei];
            var cardCls = en.isTurn ? 'play-card play-card-active' : 'play-card';
            var artInner = en.portraitUrl
              ? '<img class="play-card-img" src="' + esc(en.portraitUrl) + '" alt="" />'
              : '<div class="play-card-fallback" style="background:radial-gradient(circle at 50% 35%, ' +
                  esc(en.color || '#F59E0B') + '55 0%, #111827 78%, #070B12 100%);">' +
                  '<div class="play-card-fallback-cell">' + esc((en.label || '?').slice(0, 2).toUpperCase()) + '</div>' +
                '</div>';
            cardsHtml +=
              '<div class="' + cardCls + '">' +
                '<div class="play-card-art">' + artInner + '</div>' +
                '<div class="play-card-frame"></div>' +
                '<div class="play-card-name">' + esc(en.label) + '</div>' +
              '</div>';
          }
          turnDeckEl.innerHTML = cardsHtml;
          turnDeckEl.style.display = 'block';
        } else {
          turnDeckEl.innerHTML = '';
          turnDeckEl.style.display = 'none';
        }
      }

      function connectWs() {
        var proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        var wsUrl = proto + '//' + window.location.host + '/ws';
        ws = new WebSocket(wsUrl);

        ws.onopen = function () {
          ws.send(JSON.stringify({ type: 'join', role: 'tv' }));
        };

        ws.onmessage = function (ev) {
          try {
            var msg = JSON.parse(ev.data);
            if (msg && msg.type === 'tv:state' && msg.payload) {
              renderState(msg.payload);
            }
          } catch (err) {}
        };

        ws.onclose = function () {
          if (retryTimer) clearTimeout(retryTimer);
          retryTimer = setTimeout(connectWs, 2000);
        };
      }

      connectWs();
    })();
  </script>
</body>
</html>`;
}
