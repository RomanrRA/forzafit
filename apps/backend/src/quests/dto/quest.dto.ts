import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { QuestType } from '../quests.types';

const QUEST_TYPES: QuestType[] = [
  'workout_count',
  'streak_keep',
  'pr_in_exercise',
  'total_volume',
  'exercise_frequency',
  'weekday_consistency',
];

/** Один сгенерированный/созданный квест. Используется в AI-output и в manual API. */
export class QuestDraftDto {
  @ApiProperty({ example: '5 тренировок за неделю' })
  @IsString()
  @MinLength(4)
  @MaxLength(80)
  title!: string;

  @ApiProperty({
    example: 'Поддержи отличную форму — 5 любых тренировок до конца недели.',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(400)
  description!: string;

  @ApiProperty({ enum: QUEST_TYPES })
  @IsEnum(QUEST_TYPES)
  type!: QuestType;

  @ApiProperty({
    description:
      'Параметры цели. Структура зависит от type — см. QuestTarget в quests.types.ts',
    example: { type: 'workout_count', value: 5 },
  })
  @IsObject()
  target!: Record<string, unknown>;

  @ApiProperty({ example: 7, minimum: 3, maximum: 21 })
  @IsInt()
  @Min(3)
  @Max(21)
  durationDays!: number;

  @ApiProperty({ example: 30, minimum: 1, maximum: 500 })
  @IsInt()
  @Min(1)
  @Max(500)
  rewardPoints!: number;

  @ApiPropertyOptional({
    description: 'Почему AI выбрал эту цель (для UI «AI-тренер советует…»)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  aiReason?: string;
}

/** Ручное создание квеста (status сразу = suggested). */
export class CreateManualQuestDto extends QuestDraftDto {}

/** Ответ: оборачивает запись из БД для фронта. */
export class QuestResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ enum: QUEST_TYPES }) type!: QuestType;
  @ApiProperty() target!: Record<string, unknown>;
  @ApiProperty() progress!: Record<string, unknown>;
  @ApiProperty() rewardPoints!: number;
  @ApiProperty() status!: string;
  @ApiProperty() source!: string;
  @ApiProperty() durationDays!: number;
  @ApiPropertyOptional({ type: String }) startedAt!: string | null;
  @ApiPropertyOptional({ type: String }) expiresAt!: string | null;
  @ApiPropertyOptional({ type: String }) completedAt!: string | null;
  @ApiPropertyOptional() aiReason!: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
  /** 0..1, считается фронтом или сервером для удобства */
  @ApiPropertyOptional() progressRatio?: number;
}

export class QuestsOverviewDto {
  @ApiPropertyOptional({ type: QuestResponseDto, nullable: true })
  active!: QuestResponseDto | null;

  @ApiProperty({ type: [QuestResponseDto] })
  suggestions!: QuestResponseDto[];

  @ApiProperty({ type: [QuestResponseDto] })
  recent!: QuestResponseDto[];
}
