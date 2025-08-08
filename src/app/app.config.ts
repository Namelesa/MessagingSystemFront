import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { LucideAngularModule, MessageSquare, Users, Settings, User, LogOutIcon } from 'lucide-angular';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(FormsModule),
    importProvidersFrom(HttpClientModule),
    importProvidersFrom(
      LucideAngularModule.pick({
        MessageSquare,
        Users, 
        Settings,
        User,
        LogOutIcon
      })
    ),
    provideRouter(routes),
  ],
};