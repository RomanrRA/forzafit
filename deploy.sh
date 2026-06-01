#!/usr/bin/env bash
# deploy.sh — деплой ForzaFit на RU-сервер (85.239.41.235)
# Использование: bash deploy.sh [forzafit.ru]
#
# ⚠️ Инфраструктура RU (отличается от старого NL-бокса 147.45.243.93):
#   • forzafit живёт на 85.239.41.235, dir /opt/forzafit
#   • Контейнеры публикуются НА LOOPBACK через docker-compose.ru.override.yml
#       frontend → 127.0.0.1:3010, backend → 127.0.0.1:3011
#     БЕЗ этого override backend не проброшен и весь /api/v1/ отдаёт 502.
#   • Фронтит ХОСТОВЫЙ nginx (systemd, /usr/sbin/nginx), конфиг
#       /etc/nginx/sites-available/forzafit.conf — НЕ контейнерный n8n-nginx.
#   • TLS — ХОСТОВЫЙ certbot (certbot.timer), серты /etc/letsencrypt/live/forzafit.ru.
#   nginx-конфиг и сертификат уже настроены на сервере вручную и НЕ трогаются
#   этим скриптом (иначе затрём рабочий certbot-managed конфиг). Только reload.

set -euo pipefail

DOMAIN="${1:-forzafit.ru}"
SERVER="root@85.239.41.235"
REMOTE_DIR="/opt/forzafit"
SSH="ssh -o ControlPath=none ${SERVER}"

COMPOSE="docker compose -f docker-compose.prod.yml -f docker-compose.ru.override.yml --env-file .env.prod"

echo "▶ Деплой ForzaFit → ${DOMAIN} (RU ${SERVER})"

# ── 1. Синхронизация кода ──────────────────────────────────────
echo "▶ Отправка кода на сервер (tar via ssh)..."
${SSH} "mkdir -p ${REMOTE_DIR}; docker network create nginx-shared 2>/dev/null || true"
tar czf - \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='apps/web/node_modules' \
  --exclude='apps/backend/node_modules' \
  --exclude='packages/types/node_modules' \
  --exclude='apps/web/.next' \
  --exclude='apps/backend/dist' \
  --exclude='tmp' \
  --exclude='.env' \
  --exclude='.env.prod' \
  --exclude='.env.local' \
  . | ${SSH} "tar xzf - -C ${REMOTE_DIR}"

# ── 2. Отправка .env.prod ──────────────────────────────────────
# Не перетираем существующий .env.prod, если локального нет (на RU там боевые секреты).
if [ -f .env.prod ]; then
  echo "▶ Отправка .env.prod..."
  scp -o ControlPath=none .env.prod "${SERVER}:${REMOTE_DIR}/.env.prod"
else
  echo "▶ Локального .env.prod нет — оставляю серверный как есть."
fi

# ── 3. Сборка и запуск контейнеров (с RU-override!) ───────────
echo "▶ Сборка и запуск ForzaFit..."
${SSH} "cd ${REMOTE_DIR} && ${COMPOSE} up --build -d"

# ── 4. Миграции БД ────────────────────────────────────────────
echo "▶ Запуск миграций..."
${SSH} "
  cd ${REMOTE_DIR}
  sleep 5
  docker exec forzafit-backend sh -c 'cd /app && node -e \"
    const { drizzle } = require(\\\"drizzle-orm/node-postgres\\\");
    const { migrate } = require(\\\"drizzle-orm/node-postgres/migrator\\\");
    const { Pool } = require(\\\"pg\\\");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);
    migrate(db, { migrationsFolder: \\\"./drizzle/migrations\\\" }).then(() => {
      console.log(\\\"Миграции применены\\\");
      pool.end();
    }).catch(e => { console.error(e); pool.end(); process.exit(1); });
  \"'
"

# ── 5. Reload хостового nginx ─────────────────────────────────
# Контейнеры публикуются на фиксированные loopback-порты (3010/3011), поэтому
# при пересоздании контейнеров адрес upstream не меняется — reload нужен лишь
# чтобы подхватить правки самого forzafit.conf, если они были. nginx -t сначала.
echo "▶ Reload хостового nginx..."
${SSH} "nginx -t && systemctl reload nginx"

# ── 6. Очистка старых Docker-образов ──────────────────────────
echo "▶ Очистка неиспользуемых Docker-образов..."
${SSH} "docker image prune -f"

# ── 7. Health-check ───────────────────────────────────────────
echo "▶ Проверка..."
${SSH} "
  curl -s -o /dev/null -w 'backend 127.0.0.1:3011 -> %{http_code}\n' http://127.0.0.1:3011/ --max-time 5 || true
  curl -s -o /dev/null -w 'https://${DOMAIN}/ -> %{http_code}\n' https://${DOMAIN}/ --max-time 8 || true
"

echo ""
echo "✅ Деплой завершён!"
echo "   Сайт доступен: https://${DOMAIN}"
