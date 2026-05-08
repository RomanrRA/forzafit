# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Общение
  - Всегда общаться на русском языке в чате. Использование русского языка в коде и файлах .md по запросу

## Project Overview

ForzaFit — кроссплатформенный трекер тренировок и питания.
Монорепо: apps/backend (NestJS), apps/web (Next.js 15), packages/types.

## Деплой

### Порядок деплоя (ОБЯЗАТЕЛЬНО)
1. Сначала поднимаешь локально на `localhost:5000` для тестирования
2. Ждёшь подтверждения от пользователя ("проверил", "ок", "катим" и т.п.)
3. Только после подтверждения раскатываешь на прод

**НИКОГДА не деплой на прод без явного подтверждения пользователя.**

### Прод
- Сервер: TimeWeb Cloud, 147.45.243.93
- Домен: https://forzafit.ru
- Remote dir: /opt/fitlog
- Команда: `docker compose -f docker-compose.prod.yml --env-file .env.prod up --build -d`
- На Windows нет rsync — используй `tar czf | ssh ... tar xzf` для передачи кода

### Локальный запуск
```bash
docker compose up -d                    # PostgreSQL + Redis
cd apps/backend && npm run start:dev    # Backend :3001
cd apps/web && npm run dev              # Frontend :3000
```

