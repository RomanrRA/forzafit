import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFriendRequestDto {
  @ApiProperty({ example: 'roman_fit' })
  @IsString()
  @MinLength(3)
  @MaxLength(24)
  username!: string;
}
