import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsNumber,
  IsDateString,
  IsIn,
  IsInt,
  Min,
  Max,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class UpsertBodyGoalDto {
  @ApiPropertyOptional({ example: 75 })
  @IsOptional()
  @IsNumber()
  weightKg?: number | null;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  bodyFatPct?: number | null;

  @ApiPropertyOptional({ example: 105 })
  @IsOptional()
  @IsNumber()
  chestCm?: number | null;

  @ApiPropertyOptional({ example: 78 })
  @IsOptional()
  @IsNumber()
  waistCm?: number | null;

  @ApiPropertyOptional({ example: 95 })
  @IsOptional()
  @IsNumber()
  hipsCm?: number | null;

  @ApiPropertyOptional({ example: 38 })
  @IsOptional()
  @IsNumber()
  armCm?: number | null;

  @ApiPropertyOptional({ example: 58 })
  @IsOptional()
  @IsNumber()
  thighCm?: number | null;

  @ApiPropertyOptional({ description: 'Целевая дата (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  targetDate?: string | null;
}

export class AiSuggestGoalDto {
  @ApiProperty({
    enum: ['lose', 'gain', 'maintain', 'strength'],
    isArray: true,
    description: 'Можно комбинировать намерения (например, lose+strength = рекомпозиция).',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @IsIn(['lose', 'gain', 'maintain', 'strength'], { each: true })
  intent!: ('lose' | 'gain' | 'maintain' | 'strength')[];

  @ApiPropertyOptional({ example: 3, minimum: 2, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(12)
  targetMonths?: number;
}
