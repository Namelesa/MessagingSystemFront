import { Routes } from '@angular/router';
import { RegisterPageComponent } from '../pages/register-page';
import { LoginPageComponent } from '../pages/login-page';
import { EmailConfirmedPageComponent } from '../pages/email-confirmation-page';
import { ProfilePageComponent } from '../pages/user-profile-page';
import { AuthGuard } from './auth-guard/auth-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'register', component: RegisterPageComponent },
  { path: 'login', component: LoginPageComponent },
  {path: 'email-confirmed', loadComponent: () => EmailConfirmedPageComponent},
  {path: 'profile', component: ProfilePageComponent, canActivate: [AuthGuard] },
];
