import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsDateString } from 'class-validator';

export class UpsertBodyGoalDto {
  @ApiPropertyOptional({ example: 75 })
  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  bodyFatPct?: number;

  @ApiPropertyOptional({ example: 105 })
  @IsOptional()
  @IsNumber()
  chestCm?: number;

  @ApiPropertyOptional({ example: 78 })
  @IsOptional()
  @IsNumber()
  waistCm?: number;

  @ApiPropertyOptional({ example: 95 })
  @IsOptional()
  @IsNumber()
  hipsCm?: number;

  @ApiPropertyOptional({ example: 38 })
  @IsOptional()
  @IsNumber()
  armCm?: number;

  @ApiPropertyOptional({ example: 58 })
  @IsOptional()
  @IsNumber()
  thighCm?: number;

  @ApiPropertyOptional({ description: 'Целевая дата (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  targetDate?: string;
}
