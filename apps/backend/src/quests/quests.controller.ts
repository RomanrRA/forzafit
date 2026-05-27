import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { QuestsService } from './quests.service';
import { QuestAiService } from './quest-ai.service';
import { QuestsCronService } from './quests-cron.service';
import { CreateManualQuestDto } from './dto/quest.dto';

@ApiTags('Quests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quests')
export class QuestsController {
  constructor(
    private quests: QuestsService,
    private questAi: QuestAiService,
    private cron: QuestsCronService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Активный квест + предложения + последние завершённые',
  })
  overview(@CurrentUser('userId') userId: string) {
    return this.quests.getOverview(userId);
  }

  @Post('generate')
  @ApiOperation({
    summary: 'Запросить у AI-тренера новые предложения квестов (заменяют текущие suggested)',
  })
  async generate(@CurrentUser('userId') userId: string) {
    const drafts = await this.questAi.generateForUser(userId);
    const rows = await this.quests.replaceSuggestions(userId, drafts, 'ai');
    return rows.map((r) => this.quests.toDtoPublic(r));
  }

  @Post('cron-regenerate')
  @ApiOperation({
    summary: 'DEV: запустить понедельничный прогон автогенерации для всех юзеров вручную',
  })
  async runCronManually() {
    return this.cron.regenerateForEligibleUsers();
  }

  @Post('manual')
  @ApiOperation({
    summary: 'Создать квест вручную (для тестов и кастомных целей)',
  })
  async createManual(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateManualQuestDto,
  ) {
    const row = await this.quests.createManual(userId, dto);
    return this.quests.toDtoPublic(row);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Принять предложение — переводит в active' })
  async accept(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const row = await this.quests.accept(id, userId);
    return this.quests.toDtoPublic(row);
  }

  @Post(':id/abandon')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отказаться от квеста (active или suggested)' })
  async abandon(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const row = await this.quests.abandon(id, userId);
    return this.quests.toDtoPublic(row);
  }
}
