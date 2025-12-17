import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';
import { appConfig } from './app.config';
import { Buffer } from 'buffer';
(window as any).Buffer = Buffer;

bootstrapApplication(App, appConfig).catch(console.error);
