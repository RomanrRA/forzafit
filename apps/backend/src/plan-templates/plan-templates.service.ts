import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and, desc, count } from 'drizzle-orm';
import { DrizzleService } from '../db/db.service';
import { planTemplates, workoutSessions, workoutExercises, workoutSets } from '../db/schema';
import { CreatePlanTemplateDto, UpdatePlanTemplateDto } from './dto/plan-template.dto';
import { WorkoutsService } from '../workouts/workouts.service';
import { ExercisesService } from '../workouts/exercises/exercises.service';

@Injectable()
export class PlanTemplatesService {
  constructor(
    private drizzle: DrizzleService,
    private workoutsService: WorkoutsService,
    private exercisesService: ExercisesService,
  ) {}

  async findAll(userId: string) {
    const db = this.drizzle.db;

    const [{ total }] = await db
      .select({ total: count() })
      .from(planTemplates)
      .where(eq(planTemplates.userId, userId));

    const items = await db
      .select()
      .from(planTemplates)
      .where(eq(planTemplates.userId, userId))
      .orderBy(desc(planTemplates.createdAt));

    return { items, total };
  }

  async findOne(id: string, userId: string) {
    const [plan] = await this.drizzle.db
      .select()
      .from(planTemplates)
      .where(and(eq(planTemplates.id, id), eq(planTemplates.userId, userId)))
      .limit(1);

    if (!plan) throw new NotFoundException('План не найден');
    return plan;
  }

  async create(userId: string, dto: CreatePlanTemplateDto) {
    const [plan] = await this.drizzle.db
      .insert(planTemplates)
      .values({
        userId,
        name: dto.name,
        description: dto.description,
        goal: dto.goal,
        difficulty: dto.difficulty as any,
        type: dto.type,
        daysPerWeek: dto.daysPerWeek ?? 3,
        duration: dto.duration,
        days: dto.days ?? [],
      })
      .returning();

    return plan;
  }

  async update(id: string, userId: string, dto: UpdatePlanTemplateDto) {
    await this.assertOwner(id, userId);

    const patch: Record<string, any> = { updatedAt: new Date() };
    if (dto.name !== undefined)        patch.name = dto.name;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.goal !== undefined)        patch.goal = dto.goal;
    if (dto.difficulty !== undefined)  patch.difficulty = dto.difficulty;
    if (dto.type !== undefined)        patch.type = dto.type;
    if (dto.daysPerWeek !== undefined) patch.daysPerWeek = dto.daysPerWeek;
    if (dto.duration !== undefined)    patch.duration = dto.duration;
    if (dto.days !== undefined) patch.days = dto.days;

    const [plan] = await this.drizzle.db
      .update(planTemplates)
      .set(patch)
      .where(eq(planTemplates.id, id))
      .returning();

    return plan;
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.assertOwner(id, userId);
    await this.drizzle.db.delete(planTemplates).where(eq(planTemplates.id, id));
  }

  async schedule(id: string, userId: string, weeks: number) {
    const plan = await this.findOne(id, userId);
    const days = (plan.days as any[]) ?? [];
    const trainingDays = days.filter((d: any) => !d.isRest && (d.exercises ?? []).length >= 0);

    if (trainingDays.length === 0) return { created: 0 };

    const trainingDayNums = new Set(trainingDays.map((d: any) => Number(d.dayNumber)));

    const today = new Date();
    today.setHours(9, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(today.getDate() + weeks * 7);

    let created = 0;
    const current = new Date(today);

    while (current <= endDate) {
      const jsDay = current.getDay(); // 0=Sun..6=Sat
      const planDayNum = jsDay === 0 ? 7 : jsDay; // 1=Mon..7=Sun

      if (trainingDayNums.has(planDayNum)) {
        const dayConfig = trainingDays.find((d: any) => Number(d.dayNumber) === planDayNum);
        const dayName = typeof dayConfig?.name === 'string' ? dayConfig.name.trim() : '';
        const [workout] = await this.drizzle.db
          .insert(workoutSessions)
          .values({
            userId,
            title: dayName ? `${plan.name} — ${dayName}` : plan.name,
            startedAt: new Date(current),
          })
          .returning();

        const exercises = (dayConfig.exercises ?? []) as any[];
        for (let i = 0; i < exercises.length; i++) {
          const ex = exercises[i];
          // Defensive: для старых планов, сохранённых до фикса AI finalize, exerciseId
          // может быть пустым — резолвим по имени, иначе тренировка получится пустой.
          let exerciseId: string | undefined = ex.exerciseId;
          if (!exerciseId && ex.name) {
            exerciseId =
              (await this.exercisesService.resolveByName(userId, ex.name)) ?? undefined;
          }
          if (exerciseId) {
            const [we] = await this.drizzle.db.insert(workoutExercises).values({
              sessionId: workout.id,
              exerciseId,
              orderIndex: i,
            }).returning();

            // Copy sets from last completed workout; fallback to plan's sets count
            const lastSets = await this.workoutsService.getLastSetsForExercise(userId, exerciseId);
            if (lastSets.length > 0) {
              await this.drizzle.db.insert(workoutSets).values(
                lastSets.map((s) => ({
                  workoutExerciseId: we.id,
                  weightKg: s.weightKg,
                  reps: s.reps,
                  restTimerSec: s.restTimerSec,
                  completed: false,
                })),
              );
            } else {
              const setsCount = typeof ex.sets === 'number' && ex.sets > 0 ? ex.sets : 3;
              const planReps = ex.reps ? parseInt(ex.reps) || null : null;
              const planWeight = ex.weightKg != null ? Number(ex.weightKg) : null;
              await this.drizzle.db.insert(workoutSets).values(
                Array.from({ length: setsCount }, () => ({
                  workoutExerciseId: we.id,
                  weightKg: planWeight,
                  reps: planReps,
                  completed: false,
                })),
              );
            }
          }
        }
        created++;
      }

      current.setDate(current.getDate() + 1);
    }

    return { created };
  }

  private async assertOwner(id: string, userId: string) {
    const [plan] = await this.drizzle.db
      .select({ id: planTemplates.id, userId: planTemplates.userId })
      .from(planTemplates)
      .where(eq(planTemplates.id, id))
      .limit(1);

    if (!plan) throw new NotFoundException('План не найден');
    if (plan.userId !== userId) throw new ForbiddenException('Нет доступа');
  }
}
