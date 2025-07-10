import { Component } from '@angular/core';
import { LoginWidgetComponent } from '../../../widgets/login-widget';
import { AuthPageLayoutComponent } from '../../../shared/layouts/auth';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [LoginWidgetComponent, RouterModule, AuthPageLayoutComponent],
  templateUrl: './login-page.component.html',
})
export class LoginPageComponent {
  isPasswordVisible = false;
  passwordLength = 0;
}
