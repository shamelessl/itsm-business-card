import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535');
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: '64kb' }));
  app.enableShutdownHooks();
  await app.listen(port, process.env.HOST || '127.0.0.1');
}
bootstrap().catch((error) => { console.error(error); process.exitCode = 1; });
