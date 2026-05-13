import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, gte, lte, asc, isNotNull, inArray } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { DrizzleService } from '../db/db.service';
import {
  users,
  workoutSessions,
  workoutExercises,
  exercises,
} from '../db/schema';

@Injectable()
export class CalendarService {
  constructor(private drizzle: DrizzleService) {}

  /**
   * Lazy-init токена webcal-подписки. Если уже есть — возвращает существующий.
   * Это значит, что одна и та же ссылка остаётся валидной между сессиями
   * (и подписка в календаре пользователя не рвётся).
   */
  async getOrCreateToken(userId: string): Promise<string> {
    const [user] = await this.drizzle.db
      .select({ id: users.id, calendarToken: users.calendarToken })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) throw new NotFoundException('Пользователь не найден');
    if (user.calendarToken) return user.calendarToken;

    const token = randomUUID();
    await this.drizzle.db
      .update(users)
      .set({ calendarToken: token, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return token;
  }

  /**
   * Отдать ICS-feed расписания тренировок по токену.
   * Окно: 30 дней назад → 90 дней вперёд.
   */
  async getFeedByToken(token: string): Promise<string> {
    const [user] = await this.drizzle.db
      .select({ id: users.id, displayName: users.displayName, name: users.name })
      .from(users)
      .where(eq(users.calendarToken, token))
      .limit(1);

    if (!user) throw new NotFoundException('Календарь не найден');

    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    const to = new Date(now);
    to.setDate(to.getDate() + 90);

    const sessions = await this.drizzle.db
      .select({
        id: workoutSessions.id,
        title: workoutSessions.title,
        startedAt: workoutSessions.startedAt,
        finishedAt: workoutSessions.finishedAt,
      })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, user.id),
          isNotNull(workoutSessions.startedAt),
          gte(workoutSessions.startedAt, from),
          lte(workoutSessions.startedAt, to),
        ),
      )
      .orderBy(asc(workoutSessions.startedAt));

    // Подгружаем упражнения по всем сессиям одним запросом
    const sessionIds = sessions.map((s) => s.id);
    const exRows = sessionIds.length === 0
      ? []
      : await this.drizzle.db
          .select({
            sessionId: workoutExercises.sessionId,
            orderIndex: workoutExercises.orderIndex,
            name: exercises.name,
          })
          .from(workoutExercises)
          .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
          .where(inArray(workoutExercises.sessionId, sessionIds))
          .orderBy(asc(workoutExercises.sessionId), asc(workoutExercises.orderIndex));

    // Группируем упражнения по sessionId
    const exBySession = new Map<string, string[]>();
    for (const ex of exRows) {
      if (!exBySession.has(ex.sessionId)) exBySession.set(ex.sessionId, []);
      exBySession.get(ex.sessionId)!.push(ex.name);
    }

    return this.renderIcs(sessions, exBySession);
  }

  private renderIcs(
    sessions: Array<{
      id: string;
      title: string | null;
      startedAt: Date | null;
      finishedAt: Date | null;
    }>,
    exBySession: Map<string, string[]>,
  ): string {
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ForzaFit//Workout Plan//RU',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:ForzaFit — Тренировки',
      'X-WR-CALDESC:Ваше расписание тренировок ForzaFit',
      'X-WR-TIMEZONE:Europe/Moscow',
      'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
      'X-PUBLISHED-TTL:PT1H',
    ];

    const dtstamp = this.toIcsDate(new Date());

    for (const s of sessions) {
      if (!s.startedAt) continue;
      const start = s.startedAt;
      const end = s.finishedAt ?? new Date(start.getTime() + 60 * 60 * 1000);
      const exList = exBySession.get(s.id) ?? [];
      const description = exList.length
        ? exList.map((n, i) => `${i + 1}. ${n}`).join('\n')
        : 'Откройте тренировку в ForzaFit, чтобы посмотреть упражнения.';

      lines.push(
        'BEGIN:VEVENT',
        `UID:workout-${s.id}@forzafit.ru`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${this.toIcsDate(start)}`,
        `DTEND:${this.toIcsDate(end)}`,
        `SUMMARY:${this.escapeText(s.title ?? 'Тренировка')}`,
        `DESCRIPTION:${this.escapeText(description)}`,
        `URL:https://forzafit.ru/workouts/${s.id}`,
        'END:VEVENT',
      );
    }

    lines.push('END:VCALENDAR');
    // RFC 5545: строки >75 октетов должны быть «folded» — на новую строку с пробелом.
    // Без этого строгие парсеры (часть Google/Apple конфигураций) обрезают или пропускают события.
    return lines.map((l) => this.foldLine(l)).join('\r\n') + '\r\n';
  }

  /**
   * Folding по RFC 5545: первая строка ≤75 октетов, продолжения начинаются с пробела и тоже ≤75.
   * Режем по code-points, чтобы не разорвать UTF-8 multi-byte символы.
   */
  private foldLine(line: string): string {
    const limit = 75;
    if (Buffer.byteLength(line, 'utf8') <= limit) return line;

    const segments: string[] = [];
    let current = '';
    let currentBytes = 0;
    let isFirst = true;

    for (const ch of line) {
      const chBytes = Buffer.byteLength(ch, 'utf8');
      const cap = isFirst ? limit : limit - 1; // продолжающие строки имеют ведущий пробел
      if (currentBytes + chBytes > cap) {
        segments.push(isFirst ? current : ' ' + current);
        current = '';
        currentBytes = 0;
        isFirst = false;
      }
      current += ch;
      currentBytes += chBytes;
    }
    if (current) segments.push(isFirst ? current : ' ' + current);
    return segments.join('\r\n');
  }

  private toIcsDate(d: Date): string {
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  }

  private escapeText(s: string): string {
    return s
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');
  }
}
