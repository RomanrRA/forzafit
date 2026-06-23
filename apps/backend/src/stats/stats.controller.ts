import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Stats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(private stats: StatsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Мои характеристики (6 статов 0–100 + уровень)' })
  getMine(@CurrentUser('userId') userId: string) {
    return this.stats.getMyStats(userId);
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: 'Характеристики пользователя (друг или публичный профиль)',
  })
  getUser(
    @CurrentUser('userId') viewerId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.stats.getStatsForUser(viewerId, targetUserId);
  }
}
