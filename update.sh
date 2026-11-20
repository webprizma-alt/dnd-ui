#!/usr/bin/env bash
set -euo pipefail

# Скрипт автоматического обновления и перезапуска Tabletop Sync — DnD.
# Использование:
#   ./update.sh                  # автоопределение способа запуска (pm2 / systemd / node)
#   ./update.sh my-service-name  # явное указание имени сервиса systemd или pm2

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

SERVICE_NAME="${1:-${SERVICE_NAME:-}}"
PORT="${PORT:-3000}"
if [ -f ".env" ]; then
  ENV_PORT="$(grep -E '^PORT=' .env | tail -n 1 | cut -d '=' -f2- | tr -d '[:space:]"' | tr -d "'")" || true
  if [ -n "${ENV_PORT:-}" ]; then
    PORT="$ENV_PORT"
  fi
fi

echo "==> [1/4] Загрузка обновлений из Git..."
git pull --ff-only

echo "==> [2/4] Установка зависимостей..."
npm install

echo "==> [3/4] Очистка кеша и пересборка фронтенда..."
rm -rf dist node_modules/.vite
npm run build

echo "==> [4/4] Перезапуск сервера..."

restart_via_systemd() {
  local svc="$1"
  echo "    Перезапуск systemd-сервиса: $svc"
  if [ "$(id -u)" -eq 0 ]; then
    systemctl restart "$svc"
  else
    sudo systemctl restart "$svc"
  fi
}

restart_via_pm2() {
  local target="$1"
  echo "    Перезапуск PM2-процесса: $target"
  pm2 restart "$target" --update-env
}

RESTARTED=0

# 1. Явно передано имя сервиса/процесса
if [ -n "$SERVICE_NAME" ]; then
  if command -v pm2 >/dev/null 2>&1 && pm2 describe "$SERVICE_NAME" >/dev/null 2>&1; then
    restart_via_pm2 "$SERVICE_NAME"
    RESTARTED=1
  elif command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files "${SERVICE_NAME}.service" 2>/dev/null | grep -q "$SERVICE_NAME"; then
    restart_via_systemd "$SERVICE_NAME"
    RESTARTED=1
  else
    echo "    Внимание: сервис '$SERVICE_NAME' не найден ни в PM2, ни в systemd. Пробую автоопределение..."
  fi
fi

# 2. Автоопределение PM2 по текущей директории проекта
if [ "$RESTARTED" -eq 0 ] && command -v pm2 >/dev/null 2>&1; then
  PM2_MATCH="$(pm2 jlist 2>/dev/null | node -e "
    const fs = require('fs');
    const dir = process.argv[1];
    try {
      const list = JSON.parse(fs.readFileSync(0, 'utf8'));
      const found = list.find(p =>
        p?.pm2_env?.pm_cwd === dir ||
        (p?.pm2_env?.pm_exec_path || '').startsWith(dir + '/')
      );
      if (found) process.stdout.write(String(found.name || found.pm_id));
    } catch {}
  " "$SCRIPT_DIR")" || true

  if [ -n "${PM2_MATCH:-}" ]; then
    restart_via_pm2 "$PM2_MATCH"
    RESTARTED=1
  fi
fi

# 3. Автоопределение systemd-сервиса по WorkingDirectory
if [ "$RESTARTED" -eq 0 ] && command -v systemctl >/dev/null 2>&1; then
  SYSTEMD_MATCH="$(grep -rl "WorkingDirectory=$SCRIPT_DIR" /etc/systemd/system 2>/dev/null | head -n 1 | xargs -r basename | sed 's/\.service$//')" || true
  if [ -n "${SYSTEMD_MATCH:-}" ]; then
    restart_via_systemd "$SYSTEMD_MATCH"
    RESTARTED=1
  fi
fi

# 4. Фолбэк: перезапуск обычного фонового процесса node/tsx server.ts
if [ "$RESTARTED" -eq 0 ]; then
  PIDS="$(pgrep -f "(node|tsx).*server\.ts" || true)"
  if [ -n "$PIDS" ]; then
    echo "    Остановка текущего процесса сервера (PID: $PIDS)..."
    kill $PIDS 2>/dev/null || true
    sleep 1
  fi
  echo "    Запуск сервера в фоне (NODE_ENV=production)..."
  NODE_ENV=production nohup npm start > "$SCRIPT_DIR/server.log" 2>&1 &
  RESTARTED=1
fi

# Проверка доступности /api/health
echo "==> Проверка готовности сервера на порту $PORT..."
for i in $(seq 1 15); do
  if curl -sf "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1; then
    echo "✅ Обновление завершено! Сервер запущен и отвечает на http://127.0.0.1:${PORT}"
    exit 0
  fi
  sleep 1
done

echo "⚠️  Сервер перезапущен, но /api/health не ответил за 15 секунд. Проверьте логи (pm2 logs / journalctl / server.log)."
exit 1
