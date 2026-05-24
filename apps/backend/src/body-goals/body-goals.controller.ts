import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BodyGoalsService } from './body-goals.service';
import { UpsertBodyGoalDto } from './dto/body-goal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Body Goals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('body-goals')
export class BodyGoalsController {
  constructor(private service: BodyGoalsService) {}

  @Get()
  @ApiOperation({ summary: 'Текущая цель по телосложению (или null)' })
  findMine(@CurrentUser('userId') userId: string) {
    return this.service.findMine(userId);
  }

  @Put()
  @ApiOperation({ summary: 'Создать/обновить цель' })
  upsert(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpsertBodyGoalDto,
  ) {
    return this.service.upsert(userId, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить цель' })
  async delete(@CurrentUser('userId') userId: string): Promise<void> {
    await this.service.delete(userId);
  }
}
