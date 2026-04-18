# Changelog

## [1.2.0] — 2026-04-18

### Auth (миграция с Firebase на локальную)
- Полный отказ от Firebase Auth: регистрация, вход, хранение паролей — на своём бэкенде
- Пароли: bcrypt cost 12, минимум 8 символов
- JWT access (15 мин) + refresh (30 дней) с ротацией и детекцией повторного использования
- Эндпоинты: `POST /auth/register`, `POST /auth/login` (passport-local), `POST /auth/refresh`, `DELETE /auth/logout`, `POST /auth/change-password`, `POST /auth/forgot-password`, `POST /auth/reset-password`
- Сброс пароля: токен 32 байта (sha256 в БД), TTL 1ч, одноразовый; ссылка `${APP_URL}/reset-password?token=...`
- Throttler на чувствительных эндпоинтах (login, register, change-password, forgot-password)
- Модуль `mail`: Nodemailer SMTP; если `SMTP_HOST` пуст — ссылки сброса пишутся в лог (dev-режим)
- Миграция БД: 0004_local_auth (удалены users, добавлены `password_hash`, `password_resets`; убран `firebase_uid`)

### Frontend
- Удалены Firebase Web SDK, `lib/firebase.ts`, все `NEXT_PUBLIC_FIREBASE_*` env
- `useAuthInit` теперь инициализируется через `POST /auth/refresh`
- Логин/регистрация/забыли пароль — на `/login` (вкладки) вместо Firebase UI
- Новая страница `/reset-password` (со Suspense-обёрткой для Next.js 15)
- Смена пароля в профиле через `POST /auth/change-password`

### DevOps
- Убраны Firebase Admin-секреты и `NEXT_PUBLIC_FIREBASE_*` из Dockerfile, docker-compose.prod.yml, .env шаблонов
- `.gitignore`: добавлены `*.stackdump` (Cygwin/Git Bash)

## [1.1.1] — 2026-03-31

### Backend
- Таблица `body_measurements` в БД (PostgreSQL) — замеры тела хранятся на сервере вместо localStorage
- CRUD API: `GET/POST /body-measurements`, `GET/PATCH/DELETE /body-measurements/:id`
- Фильтрация по дате, пагинация, кастомные поля (jsonb)
- Миграция БД: 0003_aberrant_invaders

## [1.1.0] — 2026-03-30

### Dashboard
- Убран список всех тренировок — только ближайшая + пропущенные (сворачиваемый блок)
- Виджет «Замеры тела»: компактные дельты с цветовой индикацией (набор/сброс), настройка показателей и целей
- Напоминание о замерах (по умолчанию раз в 3 недели, настраивается)
- Блок «Лучшие показатели» — топ-3 персональных рекорда

### Body (Замеры)
- Мульти-метрика на графике: выбор показателей чипами, цвет линии по цели (набор/сброс)
- Настройка напоминаний (включение/выключение, интервал)
- Inline-редактирование старых замеров
- Кастомные поля замеров: добавление, удаление (иконка корзины в форме)

### Workouts (Тренировки)
- Режим «свой вес» в подходах (вместо ввода кг) — для упражнений с собственным весом
- Подсказка «прошлый раз» вынесена в отдельную строку над инпутами
- Таймер отдыха между подходами

### Mobile / Responsive
- Адаптивная компоновка всех страниц: Тренировки, Планы, Замеры, Дашборд
- Компактные карточки тренировок, табы с короткими названиями
- Увеличенные touch-target для мобильных (h-8)
- Фильтры в столбик на маленьких экранах
- Навигация: «Замеры» вместо «Прогресс» в нижнем меню

### Backend
- Эндпоинт для получения предыдущих подходов упражнения
- Поле `restTimerSec` в workout_exercises
- Миграция БД: 0002_dizzy_paibok

### DevOps
- `.dockerignore` для оптимизации сборки Docker-образов
- Обновлены Dockerfile (backend + frontend)
- Очистка: удалены скриншоты, мокапы, прототипы, тестовые файлы, неиспользуемые компоненты, docker-compose.dev.yml

## [1.0.0] — 2026-03-12

Начальный релиз — Sprint 1 + Sprint 2:
- Auth (Firebase + JWT), Users, Workouts CRUD, Exercises, Sync
- Plan Templates (создание/редактирование пользовательских планов)
- PWA с иконками и манифестом
- Деплой на TimeWeb Cloud (Docker + nginx)
