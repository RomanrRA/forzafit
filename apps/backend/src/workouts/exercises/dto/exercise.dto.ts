import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
} from 'class-validator';

export class CreateExerciseDto {
  @ApiProperty({ example: 'Жим лёжа' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ type: [String], example: ['chest', 'triceps'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  muscleGroups?: string[];

  @ApiPropertyOptional({ example: 'barbell' })
  @IsOptional()
  @IsString()
  equipment?: string;

  @ApiPropertyOptional({ enum: ['beginner', 'intermediate', 'advanced'] })
  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'advanced'])
  difficulty?: 'beginner' | 'intermediate' | 'advanced';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'URL изображения или GIF анимации упражнения' })
  @IsOptional()
  @IsString()
  animationUrl?: string;
}

export class ExerciseFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  muscleGroup?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  equipment?: string;

  @ApiPropertyOptional({ enum: ['beginner', 'intermediate', 'advanced'] })
  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'advanced'])
  difficulty?: 'beginner' | 'intermediate' | 'advanced';

  @ApiPropertyOptional({ description: 'Только пользовательские упражнения' })
  @IsOptional()
  @IsBoolean()
  custom?: boolean;
}
