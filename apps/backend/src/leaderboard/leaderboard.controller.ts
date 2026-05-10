import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import {
  LeaderboardService,
  LeaderboardMetric,
  LeaderboardScope,
} from './leaderboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const ALLOWED_METRICS: LeaderboardMetric[] = [
  'streak',
  'achievements',
  'prCount',
];
const ALLOWED_SCOPES: LeaderboardScope[] = ['friends', 'all'];

@ApiTags('Leaderboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private leaderboard: LeaderboardService) {}

  @Get()
  @ApiOperation({ summary: 'Топ юзеров по метрике (streak/achievements/prCount)' })
  @ApiQuery({ name: 'metric', enum: ALLOWED_METRICS, required: false })
  @ApiQuery({ name: 'scope', enum: ALLOWED_SCOPES, required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  list(
    @CurrentUser('userId') userId: string,
    @Query('metric') metric?: string,
    @Query('scope') scope?: string,
    @Query('limit') limit?: string,
  ) {
    const m = (metric ?? 'streak') as LeaderboardMetric;
    const s = (scope ?? 'friends') as LeaderboardScope;
    if (!ALLOWED_METRICS.includes(m))
      throw new BadRequestException('Невалидный metric');
    if (!ALLOWED_SCOPES.includes(s))
      throw new BadRequestException('Невалидный scope');
    return this.leaderboard.getLeaderboard(userId, m, s, limit ? Number(limit) : 50);
  }
}
