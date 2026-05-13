import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL ?? 'https://forzafit.ru').replace(/\/$/, '');

@ApiTags('Calendar')
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @Post('token')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Получить (или создать) токен webcal-подписки + ссылки' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        feedUrl: { type: 'string', description: 'https-URL ICS-фида' },
        webcalUrl: { type: 'string', description: 'webcal:// URL для Apple Calendar' },
        googleUrl: { type: 'string', description: 'Прямая ссылка для Google Calendar' },
      },
    },
  })
  async getToken(@CurrentUser('userId') userId: string) {
    const token = await this.calendar.getOrCreateToken(userId);
    const path = `/api/v1/calendar/feed/${token}.ics`;
    const feedUrl = `${PUBLIC_BASE_URL}${path}`;
    const webcalUrl = `webcal://${PUBLIC_BASE_URL.replace(/^https?:\/\//, '')}${path}`;
    // Google Calendar надёжнее открывать через add-by-url с https URL,
    // а не через cid=webcal:// — последний часто игнорируется как невалидный.
    const googleUrl = `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(feedUrl)}`;
    return { token, feedUrl, webcalUrl, googleUrl };
  }

  @Get('feed/:tokenWithExt')
  @ApiOperation({ summary: 'ICS-feed расписания тренировок (публичный по токену)' })
  @ApiResponse({ status: 200, description: 'text/calendar' })
  async getFeed(
    @Param('tokenWithExt') tokenWithExt: string,
    @Res() res: Response,
  ): Promise<void> {
    // Allow both /feed/<token> and /feed/<token>.ics
    const token = tokenWithExt.endsWith('.ics')
      ? tokenWithExt.slice(0, -'.ics'.length)
      : tokenWithExt;
    const body = await this.calendar.getFeedByToken(token);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, max-age=0');
    res.setHeader('Content-Disposition', 'inline; filename="forzafit.ics"');
    res.status(200).send(body);
  }
}
