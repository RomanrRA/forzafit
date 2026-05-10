import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FriendsService, FriendshipStatus } from './friends.service';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Friends')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('friends')
export class FriendsController {
  constructor(private friends: FriendsService) {}

  @Post('requests')
  @ApiOperation({ summary: 'Отправить запрос дружбы по username' })
  createRequest(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateFriendRequestDto,
  ) {
    return this.friends.createRequest(userId, dto.username);
  }

  @Post('requests/:friendshipId/accept')
  @ApiOperation({ summary: 'Принять входящий запрос' })
  accept(
    @CurrentUser('userId') userId: string,
    @Param('friendshipId') friendshipId: string,
  ) {
    return this.friends.acceptRequest(userId, friendshipId);
  }

  @Delete('requests/:friendshipId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Отклонить входящий или отменить исходящий запрос' })
  decline(
    @CurrentUser('userId') userId: string,
    @Param('friendshipId') friendshipId: string,
  ) {
    return this.friends.deleteFriendship(userId, friendshipId);
  }

  @Delete(':friendshipId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить дружбу (расфрендить)' })
  unfriend(
    @CurrentUser('userId') userId: string,
    @Param('friendshipId') friendshipId: string,
  ) {
    return this.friends.deleteFriendship(userId, friendshipId);
  }

  @Get()
  @ApiOperation({ summary: 'Список друзей / запросов' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['accepted', 'pending', 'blocked'],
  })
  list(
    @CurrentUser('userId') userId: string,
    @Query('status') status?: FriendshipStatus,
  ) {
    return this.friends.listFriends(userId, status ?? 'accepted');
  }
}
