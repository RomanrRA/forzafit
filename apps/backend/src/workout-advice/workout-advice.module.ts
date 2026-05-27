import { Module } from '@nestjs/common';
import { WorkoutAdviceController } from './workout-advice.controller';
import { WorkoutAdviceService } from './workout-advice.service';
import { WorkoutAdviceAiService } from './workout-advice-ai.service';

@Module({
  controllers: [WorkoutAdviceController],
  providers: [WorkoutAdviceService, WorkoutAdviceAiService],
  exports: [WorkoutAdviceService],
})
export class WorkoutAdviceModule {}
