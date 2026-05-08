#!/usr/bin/env bash
# deploy.sh — деплой ForzaFit на сервер
# Использование: bash deploy.sh <apex-domain>
# Пример:        bash deploy.sh forzafit.ru

set -euo pipefail

DOMAIN="${1:?Укажи apex-домен: bash deploy.sh forzafit.ru}"
SERVER="root@147.45.243.93"
REMOTE_DIR="/opt/forzafit"
NGINX_CONF="/opt/n8n-nginx/conf.d/${DOMAIN}.conf"
LE_EMAIL="romanra.rr@gmail.com"

echo "▶ Деплой ForzaFit → ${DOMAIN}"

# ── 1. Синхронизация кода ──────────────────────────────────────
echo "▶ Отправка кода на сервер (tar via ssh)..."
ssh "${SERVER}" "
  mkdir -p ${REMOTE_DIR}
  docker network create nginx-shared 2>/dev/null || true
"
tar czf - \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='apps/web/node_modules' \
  --exclude='apps/backend/node_modules' \
  --exclude='packages/types/node_modules' \
  --exclude='apps/web/.next' \
  --exclude='apps/backend/dist' \
  --exclude='.env' \
  --exclude='.env.prod' \
  --exclude='.env.local' \
  . | ssh "${SERVER}" "tar xzf - -C ${REMOTE_DIR}"

# ── 2. Отправка .env.prod ──────────────────────────────────────
echo "▶ Отправка .env.prod..."
scp .env.prod "${SERVER}:${REMOTE_DIR}/.env.prod"

# ── 3. nginx конфиг ───────────────────────────────────────────
echo "▶ Установка nginx конфига..."
sed "s/DOMAIN/${DOMAIN}/g" nginx/forzafit.conf | \
  ssh "${SERVER}" "cat > ${NGINX_CONF}"

# ── 4. SSL сертификат (apex + www в одном SAN-сертификате) ────
# Сертификат живёт в volume контейнера certbot-renewer, поэтому проверяем
# через docker exec, а не на хосте. Обновлением занимается сам certbot-renewer
# (cron внутри контейнера) — здесь только инициализация для нового домена.
echo "▶ Проверка SSL сертификата..."
ssh "${SERVER}" "
  if docker exec certbot-renewer test -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem; then
    echo 'SSL сертификат уже существует'
  else
    echo 'Получаем SSL сертификат для ${DOMAIN}...'
    docker exec certbot-renewer certbot certonly \
      --webroot -w /var/www/certbot \
      --non-interactive --agree-tos \
      --email ${LE_EMAIL} \
      -d ${DOMAIN}
  fi
"

# ── 5. Сборка и запуск контейнеров ───────────────────────────
# Контейнеры поднимаем ДО reload nginx: nginx резолвит upstream при load,
# и если имена/IP контейнеров поменялись, reload падает на «host not found».
# Старые контейнеры продолжают обслуживать запросы, пока новые не встанут.
echo "▶ Сборка и запуск ForzaFit..."
ssh "${SERVER}" "
  cd ${REMOTE_DIR}
  docker compose -f docker-compose.prod.yml --env-file .env.prod pull || true
  docker compose -f docker-compose.prod.yml --env-file .env.prod up --build -d
"

# ── 6. Перезагрузка nginx ─────────────────────────────────────
# После up — nginx подхватит новые IP контейнеров.
echo "▶ Перезагрузка nginx..."
ssh "${SERVER}" "docker exec n8n-nginx nginx -s reload"

# ── 7. Миграции БД ────────────────────────────────────────────
echo "▶ Запуск миграций..."
ssh "${SERVER}" "
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

# ── 8. Очистка старых Docker-образов ────────────────────────
echo "▶ Очистка неиспользуемых Docker-образов..."
ssh "${SERVER}" "docker image prune -f"

echo ""
echo "✅ Деплой завершён!"
echo "   Сайт доступен: https://${DOMAIN}"
