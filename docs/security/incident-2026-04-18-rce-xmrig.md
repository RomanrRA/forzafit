# Инцидент безопасности: RCE + XMRig майнер в fitlog-frontend

**Дата обнаружения:** 2026-04-18 00:47 MSK
**Дата компрометации:** 2026-04-16 11:49 UTC (разница ~37 часов до обнаружения)
**Статус:** устранён 2026-04-18 ~02:00 MSK
**Автор отчёта:** Claude Code (Opus 4.7) + Roman

---

## Коротко

Production-контейнер `fitlog-frontend` на VPS 147.45.243.93 был скомпрометирован через критическую уязвимость **CVE-2025-55182 (React2Shell)** — insecure deserialization в React Server Components Flight protocol у Next.js 15.0.3. Атакующий получил RCE, доставил в `/tmp/npm_update` XMRig-майнер и майнил Monero ~1.5 дня, грузя CPU на 84%.

Хост и соседние контейнеры (fitlog-backend, postgres, redis, n8n, xray, wg-easy) **не пострадали**. Компрометация изолирована в одном контейнере.

---

## Таймлайн

| Время (UTC) | Событие |
|---|---|
| 2026-03-31 10:02 | `fitlog-frontend` задеплоен с Next.js 15.0.3 (уязвимая версия) |
| 2025-12-03 | Публично раскрыт CVE-2025-55182 (за 4 месяца до атаки) |
| 2026-04-14 11:29 UTC | Первая волна probing: `SyntaxError: Bad escaped character in JSON at position 210/226/201` |
| 2026-04-14 11:35 UTC | `SyntaxError: missing ) after argument list` — признак JS-инъекции |
| 2026-04-14 15:47-15:55 UTC | Вторая волна fuzzing (8 попыток) |
| 2026-04-15 02:27 UTC | `TypeError: Invalid character in header content ["x-action-redirect"]` — атака на Server Actions |
| **2026-04-16 11:49 UTC** | **Успех**: создан файл `/tmp/npm_update` (XMRig, 8.3 MB), запущен майнер |
| 2026-04-18 00:40 MSK | Обнаружено сторонней сессией при деплое другого проекта (аномально высокий load average) |
| 2026-04-18 00:49 MSK | Evidence собран, снапшот контейнера сохранён |
| 2026-04-18 00:57 MSK | `kill -9` майнера, `docker stop fitlog-frontend` |
| 2026-04-18 01:15 MSK | Ротация JWT_SECRET, JWT_REFRESH_SECRET, POSTGRES_PASSWORD; `DELETE FROM refresh_tokens` (170 записей) |
| 2026-04-18 01:55 MSK | Пересобран и задеплоен `fitlog-frontend` с Next.js 15.5.15 |

**Dwell time:** ~37 часов от успеха эксплуатации до обнаружения.

---

## Root cause

### CVE-2025-55182 / CVE-2025-66478 ("React2Shell")

- **CVSS 10.0** (критический)
- **Класс**: insecure deserialization в Flight protocol RSC
- **Затрагивает**: React 19.0.0, 19.1.0, 19.1.1, 19.2.0 и фреймворки на их основе
- **Next.js affected**: **15.0 — 15.5** (и 16.0)
- **Next.js fixed**: 15.0.5, 15.1.9, 15.2.6, 15.3.6, 15.4.8, 15.5.7 → 15.5.15, 16.0.7, 16.2.4
- **Эксплойт**: near-100% надёжность, не требует специальной конфигурации
- **Вектор**: malformed HTTP payload (обычно POST) с `Next-Action` / `x-action-redirect` заголовком → ошибка валидации структуры данных → attacker-controlled данные влияют на серверное исполнение → RCE

### Почему пролезло у нас

- Проект был задеплоен с Next.js 15.0.3 (октябрь 2024)
- Между релизом и атакой прошло 17 дней после деплоя — обновлений не было
- Уязвимость публично раскрыта 2025-12-03, а патч применён только 2026-04-18 — окно для массовых ботов ~4.5 месяца
- Отсутствие `npm audit` / `dependabot` / проверок при деплое

---

## Indicators of Compromise (IOCs)

### Файлы

- Бинарник малвари: `/tmp/npm_update` внутри контейнера fitlog-frontend
  - Размер: 8 297 712 байт
  - Тип: ELF 64-bit LSB executable, x86-64, statically linked, stripped
  - **SHA256: `b0e1ae6d73d656b203514f498b59cbcf29f067edf6fbd3803a3de7d21960848d`**
  - BuildID: `93921a7ed626d1ae5e6c5cfdb348432739394400`
- Артефакт дроппера (уже удалённый): `/tmp/XXfjFJln` (0 байт, права 0, status deleted)

### Сеть

- C2/Pool: **`31.220.80.26:3333`** (Monero mining pool)
- Соединение из net-namespace контейнера (172.18.0.5 → 31.220.80.26)

### Wallet

- Monero адрес: `46RS6nKCGwRhndfpksLJomXuo4dZ7N9Afj3P1vHZxnwoQhHLw4yEzcocy1XseBdAvvb3Avx2o5PDKND8hdcRumi63ix8Ers`
- Worker name: `3000_ORDU_XMR`

### Команда запуска

```
/tmp/npm_update -a rx/0 -o 31.220.80.26:3333 \
  -u 46RS...XMR -p x --background
```

Алгоритм `rx/0` = RandomX (стандартный PoW Monero).

### Сигнатуры в логах Next.js

Последовательность ошибок, указывающая на эксплуатацию:

1. `SyntaxError: Bad escaped character in JSON at position N` — malformed payload
2. `TypeError: Invalid character in header content ["x-action-redirect"]` — Server Actions атака
3. `SyntaxError: missing ) after argument list` — JS-инъекция через Flight deserialization
4. Спавн дочернего процесса от `next-server` с аномально высоким CPU

---

## Область воздействия

### Скомпрометировано

- **Контейнер `fitlog-frontend`** — полностью
  - RCE с правами `root` внутри контейнера
  - cwd процесса: `/app/apps/web`
  - Доступ к env variables: `NODE_ENV`, `PORT`, `NEXT_BACKEND_URL=http://fitlog-backend:3001`, `NEXT_PUBLIC_FIREBASE_*` (публичные ключи Web SDK)
  - Доступ к docker network `n8n-nginx_default` — мог делать HTTP-запросы к fitlog-backend:3001, postgres:5432, redis:6379

### НЕ скомпрометировано (проверено)

- **Хост VPS**: cron чист, systemd без новых unit-файлов, нет новых пользователей, `authorized_keys` изменён 2026-04-10 (за 6 дней ДО атаки — легитимная работа), iptables стандартный
- **Контейнер `fitlog-backend`**: только `dumb-init` + `node dist/main.js` (PID 1 и 6), `/tmp` и `/var/tmp` пустые, сетевых соединений нет
- **PostgreSQL**: никаких посторонних подключений, схема не менялась
- **Redis**: нет признаков вмешательства
- **Соседние контейнеры на VPS** (n8n, xray, wg-easy, vpn-dev): не связаны одной сетью с fitlog, изоляция docker сохранилась

### Возможно (но не доказано) затронуто

- Атакующий находился в docker network с backend и БД — **теоретически** мог пытаться:
  - Подделывать JWT (но JWT_SECRET из env backend был недоступен)
  - Эксплуатировать backend API
  - Brute-forcing SQL через backend
- Прямых следов активности нет, но **на всякий случай ротировали секреты**

---

## Предпринятые действия

### 1. Containment (≈10 минут)

- `kill -9 2382992` — убит процесс XMRig
- `docker stop fitlog-frontend` — остановлен контейнер
- Подтверждено: egress на `31.220.80.26:3333` прекратился
- Load average: 3.66 → 1.15

### 2. Forensics

- Собрано в `/root/forensics-2026-04-18/` на VPS:
  - Бинарник малвари (`miner_binary`)
  - Снапшот контейнера: `docker image fitlog-frontend-evidence-2026-04-18` (sha256:2509d29ff506474e0f95bd8b16296ba4b0b879beca8917967b91fbce0b110f46)
  - Raw json-логи контейнера
  - Nginx логи за 48 часов (увы бесполезны — см. ниже)
  - Метаданные процесса майнера (cmdline, environ, fd, cgroup)
  - Docker inspect контейнера
  - Docker top — процессы внутри контейнера

### 3. Remediation

- `next`: **15.0.3 → 15.5.15** (security patch)
- `eslint-config-next`: 15.0.3 → 15.5.15
- Мелкие апдейты: `axios 1.7.7 → 1.15.0`, `@tanstack/react-query 5.59 → 5.99`
- `JWT_SECRET` и `JWT_REFRESH_SECRET` — сгенерированы новые (128 hex char)
- `POSTGRES_PASSWORD` — сгенерирован новый (32 char), `ALTER ROLE fitlog WITH PASSWORD ...`
- `DELETE FROM refresh_tokens` — инвалидированы все 170 активных сессий
- Пересобран и задеплоен `fitlog-frontend` на проде
- `.env.prod` забэкаплен в `.env.prod.bak.20260418-011659`

### 4. Verification

- `npm audit`: Next.js больше не в списке уязвимостей
- `npm run build`: проходит успешно (15 страниц, PWA service worker)
- Прод: `https://forzafit.myalfanews.com/` → HTTP 200
- Backend: `Nest application successfully started`, Firebase Admin SDK OK
- Load average на VPS вернулся к норме

---

## Открытые пункты (TODO)

### Критично

- [ ] **Ротировать Firebase Private Key** — делается только через Firebase Console вручную. Project Settings → Service accounts → Generate new private key → заменить значение в `.env.prod` + перезапустить backend. Риск минимален (backend был чист), но требует завершения по процедуре гигиены.

### Важно

- [ ] **Починить nginx log_format** на `n8n-nginx`. Сейчас: `log_format main ' -  - ';` — все access-записи выглядят как ` -  - ` без IP/URL/status/user-agent. Это критический пробел для любого будущего incident response. Рекомендуемый формат: `$remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"`.
- [ ] **Автоматизировать security-апдейты**: настроить Dependabot / Renovate для `apps/web/package.json` и `apps/backend/package.json`, чтобы security-патчи приходили в виде PR автоматически.
- [ ] **Добавить `npm audit` в CI/pre-deploy** (`deploy.sh`): `cd apps/web && npm audit --audit-level=high && cd ../backend && npm audit --audit-level=high`. Деплой блокируется, если high/critical — деплой не пройдёт.

### Желательно

- [ ] **Мигрировать с Firebase на собственную auth** — замена на bcrypt + passport-local + Nodemailer (или Better-Auth). Обычный блокер таких миграций (Firebase не экспортирует password-хеши → все юзеры должны сбросить пароль) **в нашем случае отсутствует**: реальных активных пользователей в проде нет, БД можно чистить без жалости. Стоимость миграции — ~2-3 дня разработки, выигрыш — минус один vendor в supply chain, минус один private key в env.
- [ ] **Настроить мониторинг CPU/процессов** на хосте (например, через уже существующий Zabbix-agent на VPS) с алёртом при `load_avg > 2.5` дольше 10 минут. Это сократило бы dwell time с 37 часов до минут.
- [ ] **Передать бинарник майнера в VirusTotal / MalwareBazaar** для обогащения публичных баз IOC (SHA256 `b0e1ae6d73d656b203514f498b59cbcf29f067edf6fbd3803a3de7d21960848d`).
- [ ] **Забрать forensics-архив** с VPS локально (на случай если понадобится позже): `scp -r root@147.45.243.93:/root/forensics-2026-04-18 ./forensics-archive/`.
- [ ] **После всего — удалить forensics с VPS**: `rm -rf /root/forensics-2026-04-18 && docker rmi fitlog-frontend-evidence-2026-04-18`.

---

## Что сработало хорошо

1. **Docker изоляция** — благодаря тому, что frontend, backend, БД и соседние сервисы в разных контейнерах с разными правами, компрометация не распространилась. Если бы всё было на хосте напрямую — прокачка была бы совсем другая.
2. **Отдельные секреты на backend** — JWT_SECRET, пароль БД, Firebase private key были только в env backend. Атакующий их не видел.
3. **Раздельная docker network между проектами** — `fitlog-*` контейнеры в одной сети, но соседние проекты (n8n, xray) в своих — атакующий не мог прыгнуть между ними.
4. **Быстрая реакция на обнаружение** — от "что-то странное" до "майнер убит" прошло ~15 минут.

## Что сработало плохо

1. **Версии не обновлялись** — Next.js 15.0.3 был задеплоен 31 марта 2026 и не обновлялся 17 дней, хотя CVE опубликовали 3 декабря 2025 (фикс 15.0.5 был доступен ещё тогда).
2. **Не было автоматического security-скана** — ни `npm audit` в CI, ни Dependabot.
3. **Нет мониторинга нагрузки** — Zabbix на VPS есть, но алерта на аномальный CPU внутри контейнера — не было. Dwell time 37 часов.
4. **Сломанный nginx log_format** — не было возможности восстановить HTTP-запрос атакующего из access-логов.

---

## Ссылки

- Next.js Security Advisory (Dec 11, 2025): https://nextjs.org/blog/security-update-2025-12-11
- GHSA-9qr9-h5gf-34mp (RCE in React Server Components): https://github.com/vercel/next.js/security/advisories/GHSA-9qr9-h5gf-34mp
- React Security Advisory: https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components
- CVE-2025-55182 / CVE-2025-66478 (NVD / MITRE): опубликованы декабрь 2025
- Unit42 post-exploit analysis: https://unit42.paloaltonetworks.com/cve-2025-55182-react-and-cve-2025-66478-next/
- Oligo Security Analysis: https://www.oligo.security/blog/critical-react-next-js-rce-vulnerability-cve-2025-55182-cve-2025-66478-what-you-need-to-know
- Datadog Security Labs (React2Shell): https://securitylabs.datadoghq.com/articles/cve-2025-55182-react2shell-remote-code-execution-react-server-components/
