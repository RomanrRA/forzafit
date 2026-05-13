import { Module } from '@nestjs/common';
import { PlanTemplatesController } from './plan-templates.controller';
import { PlanTemplatesService } from './plan-templates.service';
import { WorkoutsModule } from '../workouts/workouts.module';
import { ExercisesModule } from '../workouts/exercises/exercises.module';

@Module({
  imports: [WorkoutsModule, ExercisesModule],
  controllers: [PlanTemplatesController],
  providers: [PlanTemplatesService],
  exports: [PlanTemplatesService],
})
export class PlanTemplatesModule {}
