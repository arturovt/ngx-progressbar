import { provideZoneChangeDetection, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// The e2e tests set this flag to run the demo in zone mode. Without it the
// demo stays zoneless, which is what Angular 22 does by default.
const zoneless = (window as { __zoneless?: boolean }).__zoneless !== false;

async function bootstrap(): Promise<void> {
  if (!zoneless) {
    // zone.js is not a polyfill any more, so it has to load before Angular.
    await import('zone.js');
  }

  await bootstrapApplication(AppComponent, {
    ...appConfig,
    providers: [
      zoneless ? provideZonelessChangeDetection() : provideZoneChangeDetection(),
      ...appConfig.providers
    ]
  });
}

bootstrap().catch((err) => console.error(err));
