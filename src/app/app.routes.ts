import { Routes } from '@angular/router';
import { RegisterPageComponent } from '../pages/register-page';
import { LoginPageComponent } from '../pages/login-page';
import { EmailConfirmedPageComponent } from '../pages/email-confirmation-page';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'register', component: RegisterPageComponent },
  { path: 'login', component: LoginPageComponent },
  {path: 'email-confirmed', loadComponent: () => EmailConfirmedPageComponent}
];
