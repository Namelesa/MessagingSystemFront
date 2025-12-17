import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { LucideAngularModule, MessageSquare, Users, Settings, User, LogOutIcon } from 'lucide-angular';
import { routes } from './app.routes';
import { UnauthorizedRedirectInterceptor } from './unauthorized-redirect.interceptor';
import { provideTranslateLoader, provideTranslateService } from '@ngx-translate/core';
import { CustomTranslateLoader } from '../assets';

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
    { provide: HTTP_INTERCEPTORS, useClass: UnauthorizedRedirectInterceptor, multi: true },

    provideTranslateService({
      loader: provideTranslateLoader(CustomTranslateLoader),
      fallbackLang: 'en',
    }),
  ],
};
