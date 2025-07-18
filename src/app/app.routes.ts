import { Routes } from '@angular/router';
import { RegisterPageComponent } from '../pages/register-page';
import { LoginPageComponent } from '../pages/login-page';
import { EmailConfirmedPageComponent } from '../pages/email-confirmation-page';
import { ProfilePageComponent } from '../pages/user-profile-page';
import { AuthGuard } from './auth-guard/auth-guard';
import { MainLayoutComponent } from './layouts/main-layout';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  {
    path: '',
    canActivate: [AuthGuard],
    component: MainLayoutComponent,
    children: [
      { path: 'profile', component: ProfilePageComponent },
    ]
  },

  { path: 'register', component: RegisterPageComponent },
  { path: 'login', component: LoginPageComponent },
  { path: 'email-confirmed', loadComponent: () => EmailConfirmedPageComponent },
];
