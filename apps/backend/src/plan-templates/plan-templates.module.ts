import { Module } from '@nestjs/common';
import { PlanTemplatesController } from './plan-templates.controller';
import { PlanTemplatesService } from './plan-templates.service';
import { WorkoutsModule } from '../workouts/workouts.module';

@Module({
  imports: [WorkoutsModule],
  controllers: [PlanTemplatesController],
  providers: [PlanTemplatesService],
})
export class PlanTemplatesModule {}
