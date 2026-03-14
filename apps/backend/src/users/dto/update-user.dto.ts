import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
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
}
