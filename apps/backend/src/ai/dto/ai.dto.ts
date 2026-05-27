import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  Max,
  IsIn,
  ArrayMaxSize,
} from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 'Хочу набрать мышечную массу' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}

export class StartConversationDto {
  @ApiPropertyOptional({
    description:
      'Предзаполненные ответы визарда. Если указано — AI пропустит опрос и сразу выдаст план.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  initialMessage?: string;

  @ApiPropertyOptional({
    description:
      'Намерения по форме/тренингу. Если массив непустой — AI сначала подберёт целевые показатели через suggest_body_goal, потом план под них. Можно комбинировать (например, lose+strength = рекомпозиция).',
    enum: ['lose', 'gain', 'maintain', 'strength'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsIn(['lose', 'gain', 'maintain', 'strength'], { each: true })
  intent?: ('lose' | 'gain' | 'maintain' | 'strength')[];

  @ApiPropertyOptional({
    description: 'Желаемый срок достижения цели в месяцах (2..12).',
    minimum: 2,
    maximum: 12,
  })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(12)
  targetMonths?: number;
}

// SSE event shapes (for documentation only — not used as class-validator DTOs)
export interface SseMetaEvent {
  type: 'meta';
  conversationId: string;
}

export interface SseTokenEvent {
  type: 'token';
  content: string;
}

export interface SseToolCallEvent {
  type: 'tool_call';
  name: string;
  args: Record<string, unknown>;
}

export interface SseDoneEvent {
  type: 'done';
}

export interface SseErrorEvent {
  type: 'error';
  message: string;
}

export type SseEvent =
  | SseMetaEvent
  | SseTokenEvent
  | SseToolCallEvent
  | SseDoneEvent
  | SseErrorEvent;

export class FinalizeBodyGoalDto {
  @ApiPropertyOptional() weightKg?: number | null;
  @ApiPropertyOptional() bodyFatPct?: number | null;
  @ApiPropertyOptional() chestCm?: number | null;
  @ApiPropertyOptional() waistCm?: number | null;
  @ApiPropertyOptional() hipsCm?: number | null;
  @ApiPropertyOptional() armCm?: number | null;
  @ApiPropertyOptional() thighCm?: number | null;
  @ApiPropertyOptional() targetDate?: string | null;
  @ApiPropertyOptional() rationale?: string;
}

export class FinalizeResponseDto {
  @ApiProperty({ description: 'ID созданного шаблона плана тренировок' })
  planTemplateId: string;

  @ApiPropertyOptional({
    description:
      'Целевые показатели тела, если AI подобрал их в этой беседе. null если intent не передавали.',
    type: () => FinalizeBodyGoalDto,
  })
  bodyGoal?: FinalizeBodyGoalDto | null;
}

export class StartConversationResponseDto {
  @ApiPropertyOptional({ description: 'ID созданной беседы (также приходит в SSE meta-событии)' })
  conversationId?: string;
}

export class ApplyAdjustmentsDto {
  @ApiProperty({
    description: 'Индексы выбранных правок из массива adjustments в tool call',
    type: [Number],
  })
  @IsArray()
  @ArrayMaxSize(50)
  @IsInt({ each: true })
  @Min(0, { each: true })
  indices!: number[];
}

export class ApplyAdjustmentsResponseDto {
  @ApiProperty({ description: 'ID обновлённого плана' })
  planTemplateId!: string;

  @ApiProperty({ description: 'Сколько правок применено' })
  applied!: number;
}
