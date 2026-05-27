import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ExercisesService } from './exercises.service';
import { CreateExerciseDto, ExerciseFilterDto } from './dto/exercise.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Exercises')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exercises')
export class ExercisesController {
  constructor(private exercises: ExercisesService) {}

  @Get()
  @ApiOperation({ summary: 'База упражнений (с фильтрами)' })
  findAll(
    @CurrentUser('userId') userId: string,
    @Query() filters: ExerciseFilterDto,
  ) {
    return this.exercises.findAll(userId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Детали упражнения' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.exercises.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Создать своё упражнение' })
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateExerciseDto,
  ) {
    return this.exercises.create(userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить пользовательское упражнение' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<void> {
    await this.exercises.delete(id, userId);
  }
}
