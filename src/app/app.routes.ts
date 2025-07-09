import { Routes } from '@angular/router';
import { RegisterPageComponent } from '../pages/register-page';

export const routes: Routes = [
  { path: '', redirectTo: 'register', pathMatch: 'full' },
  { path: 'register', component: RegisterPageComponent },
];
