import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePlanTemplateDto {
  @ApiProperty({ example: 'Мой план на массу' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Набор мышечной массы' })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiPropertyOptional({ enum: ['beginner', 'intermediate', 'advanced'] })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiPropertyOptional({ enum: ['fullbody', 'split', 'cardio', 'crossfit', 'swimming', 'hybrid', 'beginner'] })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ default: 3, minimum: 0, maximum: 7 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(7)
  daysPerWeek?: number;

  @ApiPropertyOptional({ example: '8 недель' })
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  @IsArray()
  @Type(() => Object)
  days?: any[];
}

export class UpdatePlanTemplateDto extends PartialType(CreatePlanTemplateDto) {}

export class SchedulePlanDto {
  @ApiProperty({ description: 'Количество недель для планирования', minimum: 1, maximum: 52 })
  @IsInt()
  @Min(1)
  @Max(52)
  @Type(() => Number)
  weeks: number;
}
