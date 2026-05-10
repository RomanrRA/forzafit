import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsBoolean,
  Matches,
  MaxLength,
  MinLength,
  IsUrl,
} from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ['male', 'female', 'other'] })
  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: 'male' | 'female' | 'other';

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dob?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  heightCm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @ApiPropertyOptional({
    enum: ['lose_weight', 'maintain', 'gain_muscle', 'improve_endurance'],
  })
  @IsOptional()
  @IsEnum(['lose_weight', 'maintain', 'gain_muscle', 'improve_endurance'])
  goal?: 'lose_weight' | 'maintain' | 'gain_muscle' | 'improve_endurance';

  @ApiPropertyOptional({ enum: ['workouts', 'nutrition', 'full'] })
  @IsOptional()
  @IsEnum(['workouts', 'nutrition', 'full'])
  appMode?: 'workouts' | 'nutrition' | 'full';

  // ── Соц. профиль ─────────────────────────────────────────────────
  @ApiPropertyOptional({
    description: 'Уникальный username, [a-z0-9_], 3-24 символа',
    example: 'roman_fit',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(24)
  @Matches(/^[a-z][a-z0-9_]{2,23}$/, {
    message:
      'username должен начинаться с латинской буквы, разрешены a-z, 0-9, _ (3-24 символа)',
  })
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Виден ли профиль другим юзерам' })
  @IsOptional()
  @IsBoolean()
  isProfilePublic?: boolean;
}
