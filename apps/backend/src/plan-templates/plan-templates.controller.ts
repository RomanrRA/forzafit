import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
} from '@nestjs/swagger';
import { PlanTemplatesService } from './plan-templates.service';
import { CreatePlanTemplateDto, UpdatePlanTemplateDto, SchedulePlanDto } from './dto/plan-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Plan Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('plan-templates')
export class PlanTemplatesController {
  constructor(private service: PlanTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Список своих планов тренировок' })
  findAll(@CurrentUser('userId') userId: string) {
    return this.service.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Один план тренировки' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.service.findOne(id, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Создать план тренировки' })
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePlanTemplateDto,
  ) {
    return this.service.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить план тренировки' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdatePlanTemplateDto,
  ) {
    return this.service.update(id, userId, dto);
  }

  @Post(':id/schedule')
  @ApiOperation({ summary: 'Запланировать тренировки на N недель' })
  schedule(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: SchedulePlanDto,
  ) {
    return this.service.schedule(id, userId, dto.weeks);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить план тренировки' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<void> {
    await this.service.delete(id, userId);
  }
}
