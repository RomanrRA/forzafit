import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { PlanTemplatesModule } from '../plan-templates/plan-templates.module';
import { ExercisesModule } from '../workouts/exercises/exercises.module';
import { BodyGoalsModule } from '../body-goals/body-goals.module';

@Module({
  imports: [PlanTemplatesModule, ExercisesModule, BodyGoalsModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
