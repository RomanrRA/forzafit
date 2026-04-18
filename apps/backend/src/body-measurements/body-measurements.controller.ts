import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
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
import { BodyMeasurementsService } from './body-measurements.service';
import {
  CreateBodyMeasurementDto,
  UpdateBodyMeasurementDto,
  BodyMeasurementQueryDto,
} from './dto/body-measurement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Body Measurements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('body-measurements')
export class BodyMeasurementsController {
  constructor(private service: BodyMeasurementsService) {}

  @Get()
  @ApiOperation({ summary: 'Список замеров тела (с пагинацией и фильтром по дате)' })
  findAll(
    @CurrentUser('userId') userId: string,
    @Query() query: BodyMeasurementQueryDto,
  ) {
    return this.service.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Один замер по ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.service.findOne(id, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Создать замер тела' })
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateBodyMeasurementDto,
  ) {
    return this.service.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить замер тела' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateBodyMeasurementDto,
  ) {
    return this.service.update(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить замер тела' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<void> {
    await this.service.delete(id, userId);
  }
}
