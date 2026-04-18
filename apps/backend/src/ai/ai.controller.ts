import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AiService } from './ai.service';
import { SendMessageDto, FinalizeResponseDto, StartConversationDto } from './dto/ai.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SseEvent } from './dto/ai.dto';

@ApiTags('AI Plan Wizard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/plans')
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('start')
  @ApiOperation({ summary: 'Начать диалог с AI тренером (SSE stream)' })
  @ApiResponse({ status: 200, description: 'text/event-stream — мета + токены + done' })
  async start(
    @CurrentUser('userId') userId: string,
    @Body() dto: StartConversationDto,
    @Res() res: Response,
  ): Promise<void> {
    this.initSse(res);
    try {
      for await (const event of this.aiService.startConversationStream(userId, dto?.initialMessage)) {
        this.writeEvent(res, event);
      }
    } catch (err) {
      this.writeEvent(res, { type: 'done' });
    } finally {
      res.end();
    }
  }

  @Post(':id/message')
  @ApiOperation({ summary: 'Отправить сообщение в беседу (SSE stream)' })
  @ApiResponse({ status: 200, description: 'text/event-stream — токены + done' })
  async message(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ): Promise<void> {
    this.initSse(res);
    try {
      for await (const event of this.aiService.sendMessage(id, userId, dto.content)) {
        this.writeEvent(res, event);
      }
    } catch (err: any) {
      // Send HTTP-level error via SSE then close
      const errEvent = { type: 'error', message: err?.message ?? 'Ошибка сервера' };
      this.writeEvent(res, errEvent as any);
    } finally {
      res.end();
    }
  }

  @Post(':id/finalize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Сохранить план из последнего tool_call в plan_templates' })
  @ApiResponse({ status: 200, type: FinalizeResponseDto })
  @ApiResponse({ status: 409, description: 'Агент ещё не сгенерировал план' })
  finalize(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<FinalizeResponseDto> {
    return this.aiService.finalizeConversation(id, userId);
  }

  private initSse(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
    res.flushHeaders();
  }

  private writeEvent(res: Response, event: SseEvent | Record<string, unknown>): void {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    // Express response doesn't have flush, but we can cast if compress middleware is present
    if (typeof (res as any).flush === 'function') {
      (res as any).flush();
    }
  }
}
