import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // Global exception filter
    app.useGlobalFilters(new AllExceptionsFilter());

    // Global logging interceptor
    app.useGlobalInterceptors(new LoggingInterceptor());

    // CORS
    app.enableCors({
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    });

    // Swagger/OpenAPI
    const config = new DocumentBuilder()
      .setTitle('Gym SaaS API')
      .setDescription('Multi-tenant SaaS platform for gyms and fitness centers')
      .setVersion('1.0.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('gyms', 'Gym management')
      .addTag('classes', 'Class scheduling')
      .addTag('reservations', 'Reservation system')
      .addTag('memberships', 'Membership management')
      .addTag('payments', 'Payment processing')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const port = parseInt(process.env.API_PORT || '3001', 10);
    await app.listen(port);

    logger.log(`✅ API running on http://localhost:${port}`);
    logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  } catch (error) {
    logger.error('Failed to start API', error);
    process.exit(1);
  }
}

bootstrap();
