import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsEnum,
  IsDateString,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export type SyncEntityType =
  | 'workout'
  | 'workout_exercise'
  | 'workout_set'
  | 'exercise'
  | 'body_measurement'
  | 'food_entry';

export type SyncAction = 'create' | 'update' | 'delete';

export class SyncEventDto {
  @ApiProperty({ description: 'UUID события (генерируется клиентом)' })
  @IsUUID()
  id: string;

  @ApiProperty({
    enum: [
      'workout',
      'workout_exercise',
      'workout_set',
      'exercise',
      'body_measurement',
      'food_entry',
    ],
  })
  @IsEnum([
    'workout',
    'workout_exercise',
    'workout_set',
    'exercise',
    'body_measurement',
    'food_entry',
  ])
  entityType: SyncEntityType;

  @ApiProperty()
  @IsUUID()
  entityId: string;

  @ApiProperty({ enum: ['create', 'update', 'delete'] })
  @IsEnum(['create', 'update', 'delete'])
  action: SyncAction;

  @ApiPropertyOptional({ description: 'Данные сущности' })
  @IsOptional()
  payload?: Record<string, unknown>;

  @ApiProperty({ description: 'Время изменения на клиенте (ISO 8601)' })
  @IsDateString()
  clientUpdatedAt: string;
}

export class SyncPushDto {
  @ApiProperty({ type: [SyncEventDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncEventDto)
  events: SyncEventDto[];
}

export class SyncPullQueryDto {
  @ApiPropertyOptional({
    description: 'Получить изменения после этой даты (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  since?: string;
}
