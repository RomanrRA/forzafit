import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GamificationService } from './gamification.service';
import { AchievementsService } from './achievements.service';
import { PrDetectorService } from './pr-detector.service';

@ApiTags('Gamification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gamification')
export class GamificationController {
  constructor(
    private gamification: GamificationService,
    private achievements: AchievementsService,
    private prs: PrDetectorService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Сводка для виджета: streak, ачивки, PR' })
  getOverview(@CurrentUser('userId') userId: string) {
    return this.gamification.getOverview(userId);
  }

  @Get('achievements')
  @ApiOperation({ summary: 'Все ачивки с моим прогрессом' })
  async getAchievements(@CurrentUser('userId') userId: string) {
    await this.gamification.ensureBackfilled(userId);
    return this.achievements.getMineWithProgress(userId);
  }

  @Get('prs')
  @ApiOperation({ summary: 'Все мои личные рекорды' })
  async getPrs(@CurrentUser('userId') userId: string) {
    await this.gamification.ensureBackfilled(userId);
    return this.prs.getAllForUser(userId);
  }

  @Post('backfill')
  @ApiOperation({ summary: 'Принудительный пересчёт streak/PR/ачивок по истории' })
  backfill(@CurrentUser('userId') userId: string) {
    return this.gamification.backfillForUser(userId);
  }

  @Get('prs/:exerciseId/history')
  @ApiOperation({ summary: 'История рекордов по упражнению' })
  getPrHistory(
    @CurrentUser('userId') userId: string,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
  ) {
    return this.prs.getHistoryForExercise(userId, exerciseId);
  }
}
