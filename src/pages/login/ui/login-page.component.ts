import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LoginFormComponent } from '../../../features/login-form';
import { AuthPageLayoutComponent } from '../../../shared/layouts';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [LoginFormComponent, RouterModule, AuthPageLayoutComponent],
  templateUrl: './login-page.component.html',
})
export class LoginPageComponent {
  isPasswordVisible = false;
  passwordLength = 0;
}
