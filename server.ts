import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import QRCode from 'qrcode';
import { WebSocket, WebSocketServer } from 'ws';
import { GameStore } from './src/server/gameStore.ts';
import {
  generateHeroPortrait,
  generateMonsterPortrait,
  parseImageDataUrl,
  savePortraitBuffer,
} from './src/server/portraitGenerator.ts';
import { renderTvMsxHtml } from './src/server/tvMsxHtml.ts';
import type { ClientMessage, ClientRole, ServerMessage } from './src/shared/types.ts';

interface ConnectedClient {
  ws: WebSocket;
  role: ClientRole | null;
  accountId?: string;
  playerId?: string;
  isAlive: boolean;
}

const PORT = Number(process.env.PORT || 3000);
const UPLOADS_DIR = path.resolve(process.cwd(), 'data', 'uploads');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const store = new GameStore();
const clients = new Set<ConnectedClient>();

function getConnectedPlayerIds(): Set<string> {
  const ids = new Set<string>();
  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN && client.role === 'player' && client.playerId) {
      ids.add(client.playerId);
    }
  }
  return ids;
}

function sendJson(ws: WebSocket, message: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function sendStateToClient(client: ConnectedClient, connectedPlayerIds: Set<string>) {
  if (!client.role || client.ws.readyState !== WebSocket.OPEN) return;

  if (client.role === 'tv') {
    sendJson(client.ws, {
      type: 'tv:state',
      payload: store.projectForTv(connectedPlayerIds),
    });
  } else if (client.role === 'dm') {
    sendJson(client.ws, {
      type: 'dm:state',
      payload: store.projectForDm(connectedPlayerIds),
    });
  } else if (client.role === 'player') {
    sendJson(client.ws, {
      type: 'player:state',
      payload: store.projectForPlayer(client.accountId, client.playerId, connectedPlayerIds),
    });
  }
}

function broadcastState() {
  const connectedPlayerIds = getConnectedPlayerIds();
  const tvPayload = store.projectForTv(connectedPlayerIds);
  const dmPayload = store.projectForDm(connectedPlayerIds);

  for (const client of clients) {
    if (client.ws.readyState !== WebSocket.OPEN || !client.role) continue;
    if (client.role === 'tv') {
      sendJson(client.ws, { type: 'tv:state', payload: tvPayload });
    } else if (client.role === 'dm') {
      sendJson(client.ws, { type: 'dm:state', payload: dmPayload });
    } else if (client.role === 'player') {
      sendJson(client.ws, {
        type: 'player:state',
        payload: store.projectForPlayer(client.accountId, client.playerId, connectedPlayerIds),
      });
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '16mb' }));

  app.use('/uploads', express.static(UPLOADS_DIR));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/players', (_req, res) => {
    res.json({ players: store.getPublicPlayers(getConnectedPlayerIds()) });
  });

  app.get('/tv-msx', (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderTvMsxHtml());
  });

  app.get('/api/qr', async (req, res) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url : '';
    const format = typeof req.query.format === 'string' ? req.query.format : 'svg';
    const fallbackOrigin = `${req.protocol}://${req.get('host')}/play`;
    const targetUrl = rawUrl || fallbackOrigin;

    try {
      if (format === 'png') {
        const pngBuffer = await QRCode.toBuffer(targetUrl, {
          type: 'png',
          margin: 1,
          width: 240,
          color: {
            dark: '#0B0F17',
            light: '#F8FAFC',
          },
        });
        res.setHeader('Content-Type', 'image/png');
        res.send(pngBuffer);
        return;
      }

      const svg = await QRCode.toString(targetUrl, {
        type: 'svg',
        margin: 1,
        width: 220,
        color: {
          dark: '#0B0F17',
          light: '#F8FAFC',
        },
      });
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(svg);
    } catch (err) {
      console.error('QR generation error:', err);
      res.status(500).json({ error: 'Не удалось сгенерировать QR-код' });
    }
  });

  app.post('/api/map/upload', (req, res) => {
    const { dataUrl, locationId } = req.body as {
      dataUrl?: string;
      filename?: string;
      locationId?: string;
    };
    if (!dataUrl || typeof dataUrl !== 'string') {
      res.status(400).json({ error: 'Отсутствуют данные изображения' });
      return;
    }

    const match = /^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!match) {
      res.status(400).json({ error: 'Неверный формат изображения (поддерживаются PNG, JPG, WEBP)' });
      return;
    }

    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 12 * 1024 * 1024) {
      res.status(413).json({ error: 'Файл слишком большой (максимум 12 МБ)' });
      return;
    }

    const filename = `map-${Date.now()}.${ext}`;
    const targetPath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(targetPath, buffer);

    const publicUrl = `/uploads/${filename}`;
    store.setMapImage(publicUrl, typeof locationId === 'string' ? locationId : undefined);
    broadcastState();
    res.json({ imageUrl: publicUrl });
  });

  function isValidMp3Buffer(buf: Buffer): boolean {
    if (buf.length < 4) return false;
    // Check ID3v2 header ("ID3")
    if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
      return true;
    }
    // Check MPEG audio frame sync (11 set bits: 0xFF followed by 0xE0..0xFF, non-reserved layer)
    const scanLimit = Math.min(buf.length - 2, 4096);
    for (let i = 0; i < scanLimit; i++) {
      if (buf[i] === 0xff && (buf[i + 1] & 0xe0) === 0xe0) {
        const layerBits = (buf[i + 1] >> 1) & 0x03;
        if (layerBits !== 0) {
          return true;
        }
      }
    }
    return false;
  }

  function sanitizeAudioDisplayName(raw: unknown): string {
    if (typeof raw !== 'string') return 'audio.mp3';
    const base = path.basename(raw).replace(/[\u0000-\u001f<>:"/\\|?*]+/g, '').trim();
    if (!base) return 'audio.mp3';
    return base.slice(0, 80);
  }

  app.post(
    '/api/audio/upload',
    express.raw({
      type: ['audio/mpeg', 'audio/mp3', 'audio/x-mpeg', 'application/octet-stream'],
      limit: '25mb',
    }),
    (req, res) => {
      const target = req.query.target === 'splash' ? 'splash' : 'location';
      const locationId = typeof req.query.locationId === 'string' ? req.query.locationId.trim() : '';
      let rawFilename = 'track.mp3';
      if (typeof req.query.filename === 'string') {
        rawFilename = req.query.filename;
      } else if (typeof req.headers['x-audio-filename'] === 'string') {
        try {
          rawFilename = decodeURIComponent(req.headers['x-audio-filename']);
        } catch {
          rawFilename = req.headers['x-audio-filename'];
        }
      }

      const buffer = Buffer.isBuffer(req.body) ? req.body : null;
      if (!buffer || buffer.length === 0) {
        res.status(400).json({ error: 'Отсутствуют данные аудиофайла' });
        return;
      }
      if (buffer.length > 25 * 1024 * 1024) {
        res.status(413).json({ error: 'Аудиофайл слишком большой (максимум 25 МБ)' });
        return;
      }
      if (!isValidMp3Buffer(buffer)) {
        res.status(400).json({ error: 'Поддерживаются только корректные аудиофайлы в формате MP3' });
        return;
      }

      if (target === 'location' && !locationId) {
        res.status(400).json({ error: 'Не указана локация для привязки аудио' });
        return;
      }

      const safeFilename = `audio-${target}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.mp3`;
      const targetPath = path.resolve(UPLOADS_DIR, safeFilename);
      if (!targetPath.startsWith(UPLOADS_DIR + path.sep)) {
        res.status(400).json({ error: 'Некорректный путь сохранения файла' });
        return;
      }

      const displayName = sanitizeAudioDisplayName(rawFilename);
      try {
        fs.writeFileSync(targetPath, buffer);
      } catch (err) {
        console.error('Audio upload write error:', err);
        res.status(500).json({ error: 'Не удалось сохранить аудиофайл на сервере' });
        return;
      }
      const publicUrl = `/uploads/${safeFilename}`;

      const updated =
        target === 'splash'
          ? store.setSplashAudio(publicUrl, displayName)
          : store.setLocationAudio(locationId, publicUrl, displayName);

      if (!updated) {
        try {
          fs.unlinkSync(targetPath);
        } catch {
          // ignore cleanup failure
        }
        res.status(404).json({ error: 'Локация не найдена' });
        return;
      }

      broadcastState();
      res.json({ audioUrl: publicUrl, audioName: displayName });
    }
  );

  app.post('/api/portraits/hero', async (req, res) => {
    const { playerId, photoDataUrl } = req.body as {
      playerId?: string;
      photoDataUrl?: string;
    };

    if (!playerId || typeof playerId !== 'string') {
      res.status(400).json({ error: 'Не указан персонаж для генерации портрета' });
      return;
    }

    const ctx = store.getPlayerWithContext(playerId);
    if (!ctx) {
      res.status(404).json({ error: 'Персонаж не найден. Сначала завершите создание героя у мастера.' });
      return;
    }

    try {
      const faceImage = parseImageDataUrl(photoDataUrl || '');
      const generated = await generateHeroPortrait({
        player: ctx.player,
        classRef: ctx.classRef,
        speciesRef: ctx.speciesRef,
        backgroundRef: ctx.backgroundRef,
        faceImage,
      });

      const portraitUrl = savePortraitBuffer(
        UPLOADS_DIR,
        `hero-${ctx.player.id}`,
        generated.buffer,
        generated.mimeType
      );
      store.setPlayerPortrait(ctx.player.id, portraitUrl);
      broadcastState();
      res.json({ portraitUrl });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка генерации портрета героя';
      console.error('Hero portrait generation error:', err);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/portraits/monster/upload', (req, res) => {
    const { monsterId, dataUrl } = req.body as {
      monsterId?: string;
      dataUrl?: string;
    };

    if (!monsterId || typeof monsterId !== 'string') {
      res.status(400).json({ error: 'Не указан монстр' });
      return;
    }

    const ctx = store.getMonsterWithContext(monsterId);
    if (!ctx) {
      res.status(404).json({ error: 'Монстр не найден в справочнике' });
      return;
    }

    try {
      const parsed = parseImageDataUrl(dataUrl || '');
      const portraitUrl = savePortraitBuffer(
        UPLOADS_DIR,
        `monster-${ctx.monster.id}`,
        parsed.buffer,
        parsed.mimeType
      );
      store.setMonsterPortrait(ctx.monster.id, portraitUrl);
      broadcastState();
      res.json({ portraitUrl });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось загрузить изображение монстра';
      res.status(400).json({ error: message });
    }
  });

  app.post('/api/portraits/monster/generate', async (req, res) => {
    const { monsterId, referenceDataUrl, extraPrompt } = req.body as {
      monsterId?: string;
      referenceDataUrl?: string | null;
      extraPrompt?: string;
    };

    if (!monsterId || typeof monsterId !== 'string') {
      res.status(400).json({ error: 'Не указан монстр для генерации' });
      return;
    }

    const ctx = store.getMonsterWithContext(monsterId);
    if (!ctx) {
      res.status(404).json({ error: 'Монстр не найден в справочнике' });
      return;
    }

    try {
      const referenceImage =
        referenceDataUrl && typeof referenceDataUrl === 'string' && referenceDataUrl.trim()
          ? parseImageDataUrl(referenceDataUrl)
          : null;

      const generated = await generateMonsterPortrait({
        monster: ctx.monster,
        abilities: ctx.abilities,
        referenceImage,
        extraPrompt: typeof extraPrompt === 'string' ? extraPrompt : undefined,
      });

      const portraitUrl = savePortraitBuffer(
        UPLOADS_DIR,
        `monster-ai-${ctx.monster.id}`,
        generated.buffer,
        generated.mimeType
      );
      store.setMonsterPortrait(ctx.monster.id, portraitUrl);
      broadcastState();
      res.json({ portraitUrl });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка генерации портрета монстра';
      console.error('Monster portrait generation error:', err);
      res.status(500).json({ error: message });
    }
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    const client: ConnectedClient = {
      ws,
      role: null,
      isAlive: true,
    };
    clients.add(client);

    ws.on('pong', () => {
      client.isAlive = true;
    });

    ws.on('message', (rawData) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(rawData.toString()) as ClientMessage;
      } catch {
        sendJson(ws, { type: 'error', message: 'Некорректный формат сообщения' });
        return;
      }

      if (msg.type === 'join') {
        const prevRole = client.role;
        const prevAccountId = client.accountId;
        const prevPlayerId = client.playerId;
        client.role = msg.role;
        client.accountId = msg.accountId;
        client.playerId = msg.playerId;

        const connectedIds = getConnectedPlayerIds();
        sendStateToClient(client, connectedIds);

        if (
          prevRole !== msg.role ||
          prevAccountId !== msg.accountId ||
          prevPlayerId !== msg.playerId
        ) {
          broadcastState();
        }
        return;
      }

      if (msg.type === 'account:register') {
        const account = store.registerOrGetAccount(msg.name);
        if (!account) {
          sendJson(ws, { type: 'error', message: 'Введите имя участника' });
          return;
        }
        client.role = 'player';
        client.accountId = account.id;
        client.playerId = undefined;
        sendJson(ws, { type: 'account:registered', account });
        broadcastState();
        return;
      }

      const result = store.tryApplyAction(msg);
      if (result.error) {
        sendJson(ws, { type: 'error', message: result.error });
      }
      if (result.changed) {
        broadcastState();
      }
    });

    ws.on('close', () => {
      const wasPlayer = client.role === 'player' && Boolean(client.playerId);
      clients.delete(client);
      if (wasPlayer) {
        broadcastState();
      }
    });
  });

  const heartbeat = setInterval(() => {
    for (const client of clients) {
      if (!client.isAlive) {
        client.ws.terminate();
        clients.delete(client);
        continue;
      }
      client.isAlive = false;
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.ping();
      }
    }
  }, 30000);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(
      express.static(distDir, {
        index: false,
        setHeaders(res, filePath) {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          }
        },
      })
    );
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Tabletop Sync server listening on http://0.0.0.0:${PORT}`);
  });

  const shutdown = () => {
    clearInterval(heartbeat);
    store.flushSave();
    wss.close();
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
