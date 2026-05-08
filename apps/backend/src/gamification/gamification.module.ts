import { Module } from '@nestjs/common';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';
import { StreakService } from './streak.service';
import { PrDetectorService } from './pr-detector.service';
import { AchievementsService } from './achievements.service';

@Module({
  controllers: [GamificationController],
  providers: [
    GamificationService,
    StreakService,
    PrDetectorService,
    AchievementsService,
  ],
  exports: [GamificationService],
})
export class GamificationModule {}
