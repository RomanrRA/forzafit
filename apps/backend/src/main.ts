import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { globalValidationPipe } from './common/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  const corsOrigins = process.env.CORS_ORIGINS?.split(',').map((o) => o.trim());
  app.enableCors({
    origin: corsOrigins ?? (process.env.NODE_ENV === 'production' ? false : true),
    credentials: true,
  });

  // Global validation
  app.useGlobalPipes(globalValidationPipe);

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('FitLog API')
    .setDescription('Backend API для FitLog — трекер тренировок и питания')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Аутентификация')
    .addTag('Users', 'Профиль пользователя')
    .addTag('Workouts', 'Тренировки')
    .addTag('Exercises', 'База упражнений')
    .addTag('Sync', 'Синхронизация данных')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  console.log(`🚀 FitLog API запущен на http://localhost:${port}`);
  console.log(`📖 Swagger UI: http://localhost:${port}/api`);
}

bootstrap();
