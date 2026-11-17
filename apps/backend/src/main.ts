import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { env } from './config/env';

async function bootstrap() {
  const config = env(); // falha aqui, antes de abrir porta, se o .env estiver incompleto
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: config.CORS_ORIGINS, credentials: true });
  app.setGlobalPrefix('api');
  // whitelist: campos fora do DTO são descartados; transform: query/params viram os tipos declarados
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }));

  await app.listen(config.PORT);
  new Logger('Bootstrap').log(`API em http://localhost:${config.PORT}/api (${config.NODE_ENV})`);
}

bootstrap();
