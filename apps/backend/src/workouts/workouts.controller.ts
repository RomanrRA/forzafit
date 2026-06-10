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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WorkoutsService } from './workouts.service';
import {
  CreateWorkoutDto,
  UpdateWorkoutDto,
  WorkoutQueryDto,
  BulkDeleteWorkoutsDto,
  AddExerciseToWorkoutDto,
  UpdateWorkoutExerciseDto,
  AddSetDto,
} from './dto/workout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Workouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workouts')
export class WorkoutsController {
  constructor(private workouts: WorkoutsService) {}

  // ─── Sessions ──────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'История тренировок (с пагинацией и фильтром по дате)' })
  findAll(
    @CurrentUser('userId') userId: string,
    @Query() query: WorkoutQueryDto,
  ) {
    return this.workouts.findAll(userId, query);
  }

  @Get('progress')
  @ApiOperation({ summary: 'История прогресса по упражнению' })
  getProgress(
    @CurrentUser('userId') userId: string,
    @Query('exerciseId') exerciseId: string,
  ) {
    return this.workouts.getProgress(userId, exerciseId);
  }

  @Get('records')
  @ApiOperation({ summary: 'Личные рекорды' })
  getPersonalRecords(@CurrentUser('userId') userId: string) {
    return this.workouts.getPersonalRecords(userId);
  }

  @Get('stats/muscles')
  @ApiOperation({ summary: 'Статистика мышечных групп' })
  getMuscleStats(
    @CurrentUser('userId') userId: string,
    @Query('period') period?: '7days' | 'month' | 'all',
  ) {
    return this.workouts.getMuscleStats(userId, period ?? '7days');
  }

  @Get('last-sets/:exerciseId')
  @ApiOperation({ summary: 'Последние подходы по упражнению из завершённой тренировки' })
  getLastSets(
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.workouts.getLastSetsForExercise(userId, exerciseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Детали тренировки с упражнениями и подходами' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.workouts.findOne(id, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Создать тренировку' })
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateWorkoutDto,
  ) {
    return this.workouts.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить тренировку' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateWorkoutDto,
  ) {
    return this.workouts.update(id, userId, dto);
  }

  @Post('bulk-delete')
  @ApiOperation({ summary: 'Удалить несколько тренировок одним запросом' })
  bulkDelete(
    @CurrentUser('userId') userId: string,
    @Body() dto: BulkDeleteWorkoutsDto,
  ) {
    return this.workouts.deleteMany(dto.ids, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить тренировку' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<void> {
    await this.workouts.delete(id, userId);
  }

  // ─── Exercises within session ──────────────────────────────────────────────

  @Post(':id/exercises')
  @ApiOperation({ summary: 'Добавить упражнение в тренировку' })
  addExercise(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: AddExerciseToWorkoutDto,
  ) {
    return this.workouts.addExercise(sessionId, userId, dto);
  }

  @Patch(':id/exercises/:weId')
  @ApiOperation({ summary: 'Обновить упражнение в тренировке (отдых, заметки)' })
  updateExercise(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Param('weId', ParseUUIDPipe) weId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateWorkoutExerciseDto,
  ) {
    return this.workouts.updateExercise(sessionId, weId, userId, dto);
  }

  @Delete(':id/exercises/:weId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Убрать упражнение из тренировки' })
  async removeExercise(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Param('weId', ParseUUIDPipe) weId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<void> {
    await this.workouts.removeExercise(sessionId, weId, userId);
  }

  // ─── Sets ──────────────────────────────────────────────────────────────────

  @Post(':id/exercises/:weId/sets')
  @ApiOperation({ summary: 'Добавить подход к упражнению в тренировке' })
  addSet(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Param('weId', ParseUUIDPipe) weId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: AddSetDto,
  ) {
    return this.workouts.addSet(sessionId, weId, userId, dto);
  }

  @Patch(':id/exercises/:weId/sets/:setId')
  @ApiOperation({ summary: 'Обновить подход' })
  updateSet(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Param('setId', ParseUUIDPipe) setId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: AddSetDto,
  ) {
    return this.workouts.updateSet(sessionId, setId, userId, dto);
  }

  @Delete(':id/exercises/:weId/sets/:setId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить подход' })
  async deleteSet(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Param('setId', ParseUUIDPipe) setId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<void> {
    await this.workouts.deleteSet(sessionId, setId, userId);
  }
}
