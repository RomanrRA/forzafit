import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WorkoutAdviceService } from './workout-advice.service';

@ApiTags('workout-advice')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workouts/:sessionId/advice')
export class WorkoutAdviceController {
  constructor(private service: WorkoutAdviceService) {}

  @Get()
  @ApiOperation({
    summary: 'AI-совет по весам/повторам на упражнения этой тренировки',
  })
  async getAdvice(
    @CurrentUser('userId') userId: string,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
  ) {
    const items = await this.service.getOrGenerate(sessionId, userId);
    return { items };
  }
}
