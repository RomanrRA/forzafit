#!/usr/bin/env bash
# deploy.sh — деплой FitLog на сервер
# Использование: bash deploy.sh <domain>
# Пример:        bash deploy.sh grind

set -euo pipefail

DOMAIN="${1:?Укажи домен: bash deploy.sh grind}"
FULL_DOMAIN="${DOMAIN}.myalfanews.com"
SERVER="root@147.45.243.93"
REMOTE_DIR="/opt/fitlog"
NGINX_CONF="/opt/n8n-nginx/conf.d/${DOMAIN}.conf"

echo "▶ Деплой FitLog → ${FULL_DOMAIN}"

# ── 1. Синхронизация кода ──────────────────────────────────────
echo "▶ Отправка кода на сервер..."
rsync -az --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='apps/*/node_modules' \
  --exclude='apps/web/.next' \
  --exclude='apps/backend/dist' \
  --exclude='.env*' \
  . "${SERVER}:${REMOTE_DIR}/"

# ── 2. Отправка .env.prod ──────────────────────────────────────
echo "▶ Отправка .env.prod..."
scp .env.prod "${SERVER}:${REMOTE_DIR}/.env.prod"

# ── 3. nginx конфиг ───────────────────────────────────────────
echo "▶ Установка nginx конфига..."
sed "s/DOMAIN/${DOMAIN}/g" nginx/fitlog.conf | \
  ssh "${SERVER}" "cat > ${NGINX_CONF}"

# ── 4. SSL сертификат (если нет) ──────────────────────────────
echo "▶ Проверка SSL сертификата..."
ssh "${SERVER}" "
  if [ ! -f /etc/letsencrypt/live/${FULL_DOMAIN}/fullchain.pem ]; then
    echo 'Получаем SSL сертификат...'
    docker exec n8n-nginx-certbot-1 certbot certonly \
      --webroot -w /var/www/certbot \
      --non-interactive --agree-tos \
      --email admin@myalfanews.com \
      -d ${FULL_DOMAIN}
  else
    echo 'SSL сертификат уже существует'
  fi
"

# ── 5. Перезагрузка nginx ─────────────────────────────────────
echo "▶ Перезагрузка nginx..."
ssh "${SERVER}" "docker exec n8n-nginx-nginx-1 nginx -s reload"

# ── 6. Сборка и запуск контейнеров ───────────────────────────
echo "▶ Сборка и запуск FitLog..."
ssh "${SERVER}" "
  cd ${REMOTE_DIR}
  docker compose -f docker-compose.prod.yml --env-file .env.prod pull || true
  docker compose -f docker-compose.prod.yml --env-file .env.prod up --build -d
"

# ── 7. Миграции БД ────────────────────────────────────────────
echo "▶ Запуск миграций..."
ssh "${SERVER}" "
  cd ${REMOTE_DIR}
  sleep 5
  docker exec fitlog-backend sh -c 'cd /app && node -e \"
    const { drizzle } = require(\\\"drizzle-orm/node-postgres\\\");
    const { migrate } = require(\\\"drizzle-orm/node-postgres/migrator\\\");
    const { Pool } = require(\\\"pg\\\");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);
    migrate(db, { migrationsFolder: \\\"./dist/db/migrations\\\" }).then(() => {
      console.log(\\\"Миграции применены\\\");
      pool.end();
    }).catch(e => { console.error(e); pool.end(); process.exit(1); });
  \"'
"

echo ""
echo "✅ Деплой завершён!"
echo "   Сайт доступен: https://${FULL_DOMAIN}"
