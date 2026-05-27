import { Module } from '@nestjs/common';
import { BodyGoalsController } from './body-goals.controller';
import { BodyGoalsService } from './body-goals.service';
import { BodyGoalAiService } from './body-goal-ai.service';

@Module({
  controllers: [BodyGoalsController],
  providers: [BodyGoalsService, BodyGoalAiService],
  exports: [BodyGoalsService],
})
export class BodyGoalsModule {}
