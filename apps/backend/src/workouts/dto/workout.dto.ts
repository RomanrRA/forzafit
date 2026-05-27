import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsBoolean,
  IsUUID,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWorkoutDto {
  @ApiPropertyOptional({ example: 'Грудь + Трицепс' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  finishedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateWorkoutDto extends CreateWorkoutDto {}

export class WorkoutQueryDto {
  @ApiPropertyOptional({ description: 'Фильтр с даты (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Фильтр по дату (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ enum: ['all', 'planned', 'completed'], default: 'all' })
  @IsOptional()
  @IsString()
  status?: 'all' | 'planned' | 'completed' = 'all';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}

// ─── Workout Exercise ─────────────────────────────────────────────────────────

export class AddExerciseToWorkoutDto {
  @ApiProperty()
  @IsUUID()
  exerciseId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({ description: 'Время отдыха между подходами (секунды)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  restTimerSec?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateWorkoutExerciseDto {
  @ApiPropertyOptional({ description: 'Время отдыха между подходами (секунды)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  restTimerSec?: number;

  @ApiPropertyOptional({ description: 'Порядок упражнения в тренировке (0-based)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── Workout Set ──────────────────────────────────────────────────────────────

export class AddSetDto {
  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  reps?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @ApiPropertyOptional({ description: 'Таймер отдыха в секундах' })
  @IsOptional()
  @IsInt()
  @Min(0)
  restTimerSec?: number;

  @ApiPropertyOptional({ description: 'RPE — субъективная тяжесть подхода (1..10)', minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  rpe?: number;
}
