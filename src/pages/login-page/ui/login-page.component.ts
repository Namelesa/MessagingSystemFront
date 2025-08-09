import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LoginWidgetComponent } from '../../../widgets/login-widget';
import { AuthPageLayoutComponent } from '../../../shared/layouts';

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
