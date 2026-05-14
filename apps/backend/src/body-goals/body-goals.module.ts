import { Module } from '@nestjs/common';
import { BodyGoalsController } from './body-goals.controller';
import { BodyGoalsService } from './body-goals.service';

@Module({
  controllers: [BodyGoalsController],
  providers: [BodyGoalsService],
  exports: [BodyGoalsService],
})
export class BodyGoalsModule {}
