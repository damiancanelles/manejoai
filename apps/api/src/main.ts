import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // In dev there's no separate frontend origin (Vite proxies /api to this
  // server, so the browser only ever talks to one origin) - FRONTEND_URL is
  // unset and this falls back to allowing any origin. In production, once
  // the frontend is on its own domain (e.g. Netlify), set FRONTEND_URL so
  // only that origin is allowed.
  const frontendUrl = process.env.FRONTEND_URL;
  app.enableCors({ origin: frontendUrl || true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.setGlobalPrefix('api');

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`manejoai API listening on http://localhost:${port}/api`);
}
bootstrap();
