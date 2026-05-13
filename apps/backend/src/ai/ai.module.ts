import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { OpenRouterService } from './openrouter.service';
import { PlanTemplatesModule } from '../plan-templates/plan-templates.module';
import { ExercisesModule } from '../workouts/exercises/exercises.module';

@Module({
  imports: [PlanTemplatesModule, ExercisesModule],
  controllers: [AiController],
  providers: [AiService, OpenRouterService],
})
export class AiModule {}
