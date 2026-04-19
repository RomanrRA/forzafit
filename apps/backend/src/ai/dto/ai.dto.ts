import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsArray,
  IsInt,
  Min,
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

export class FinalizeResponseDto {
  @ApiProperty({ description: 'ID созданного шаблона плана тренировок' })
  planTemplateId: string;
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
