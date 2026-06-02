import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Схема переменных окружения backend-приложения.
 * Проверяется один раз при старте (ConfigModule.validate) — если
 * обязательная переменная отсутствует или невалидна, приложение
 * падает сразу с понятной ошибкой, а не в рантайме.
 */
export class EnvironmentVariables {
  // --- Обязательные ---
  @IsString()
  @MinLength(1)
  DATABASE_URL!: string;

  @IsString()
  @MinLength(16, {
    message: 'JWT_SECRET должен быть не короче 16 символов',
  })
  JWT_SECRET!: string;

  @IsString()
  @MinLength(16, {
    message: 'JWT_REFRESH_SECRET должен быть не короче 16 символов',
  })
  JWT_REFRESH_SECRET!: string;

  // --- Окружение / сеть ---
  @IsOptional()
  @IsEnum(NodeEnv, {
    message: 'NODE_ENV должен быть development | production | test',
  })
  NODE_ENV?: NodeEnv;

  @IsOptional()
  @IsInt()
  PORT?: number;

  @IsOptional()
  @IsString()
  APP_URL?: string;

  @IsOptional()
  @IsString()
  PUBLIC_BASE_URL?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  @IsOptional()
  @IsString()
  REDIS_URL?: string;

  // --- AI (OpenRouter) ---
  @IsOptional()
  @IsString()
  OPENROUTER_API_KEY?: string;

  @IsOptional()
  @IsString()
  OPENROUTER_BASE_URL?: string;

  @IsOptional()
  @IsString()
  AI_MODEL?: string;

  // --- Почта (SMTP). Не заданы → ссылки сброса пишутся в лог ---
  @IsOptional()
  @IsString()
  SMTP_HOST?: string;

  @IsOptional()
  @IsInt()
  SMTP_PORT?: number;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASS?: string;

  @IsOptional()
  @IsString()
  SMTP_FROM?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const details = errors
      .map((e) => {
        const constraints = Object.values(e.constraints ?? {}).join('; ');
        return `  - ${e.property}: ${constraints}`;
      })
      .join('\n');
    throw new Error(
      `Невалидные переменные окружения:\n${details}\n` +
        'Проверьте .env (см. .env.example).',
    );
  }

  return validated;
}
