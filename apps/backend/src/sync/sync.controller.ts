import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { SyncPushDto, SyncPullQueryDto } from './dto/sync.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sync')
export class SyncController {
  constructor(private sync: SyncService) {}

  @Post('push')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отправить offline-изменения на сервер' })
  @ApiResponse({
    status: 200,
    schema: {
      properties: {
        processed: { type: 'number' },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  push(
    @CurrentUser('userId') userId: string,
    @Body() dto: SyncPushDto,
  ) {
    return this.sync.push(userId, dto);
  }

  @Get('pull')
  @ApiOperation({ summary: 'Получить изменения сервера (с опционального timestamp)' })
  pull(
    @CurrentUser('userId') userId: string,
    @Query() query: SyncPullQueryDto,
  ) {
    return this.sync.pull(userId, query.since);
  }
}
