import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

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

export type SseEvent = SseMetaEvent | SseTokenEvent | SseToolCallEvent | SseDoneEvent;

export class FinalizeResponseDto {
  @ApiProperty({ description: 'ID созданного шаблона плана тренировок' })
  planTemplateId: string;
}

export class StartConversationResponseDto {
  @ApiPropertyOptional({ description: 'ID созданной беседы (также приходит в SSE meta-событии)' })
  conversationId?: string;
}
