import { Module } from '@nestjs/common';
import { QuestsController } from './quests.controller';
import { QuestsService } from './quests.service';
import { QuestTrackerService } from './quest-tracker.service';
import { QuestAiService } from './quest-ai.service';
import { QuestsCronService } from './quests-cron.service';

@Module({
  controllers: [QuestsController],
  providers: [
    QuestsService,
    QuestTrackerService,
    QuestAiService,
    QuestsCronService,
  ],
  exports: [QuestsService, QuestTrackerService, QuestAiService],
})
export class QuestsModule {}
