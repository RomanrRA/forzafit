import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { globalValidationPipe } from './common/pipes/validation.pipe';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Доверять ближайшему reverse-proxy (nginx), чтобы @nestjs/throttler
  // и req.ip видели реальный клиентский IP из X-Forwarded-For.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Security
  app.use(helmet());
  const corsOrigins = process.env.CORS_ORIGINS?.split(',').map((o) => o.trim());
  app.enableCors({
    origin: corsOrigins ?? (process.env.NODE_ENV === 'production' ? false : true),
    credentials: true,
  });

  // Global validation
  app.useGlobalPipes(globalValidationPipe);

  // Централизованная обработка ошибок + структурное логирование
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('ForzaFit API')
    .setDescription('Backend API для ForzaFit — трекер тренировок и питания')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Аутентификация')
    .addTag('Users', 'Профиль пользователя')
    .addTag('Workouts', 'Тренировки')
    .addTag('Exercises', 'База упражнений')
    .addTag('Plan Templates', 'Шаблоны тренировочных планов')
    .addTag('Body Measurements', 'Замеры тела')
    .addTag('Sync', 'Синхронизация данных')
    .addTag('AI Plan Wizard', 'AI-тренер: генерация планов тренировок')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  console.log(`🚀 ForzaFit API запущен на http://localhost:${port}`);
  console.log(`📖 Swagger UI: http://localhost:${port}/api`);
}

bootstrap();
