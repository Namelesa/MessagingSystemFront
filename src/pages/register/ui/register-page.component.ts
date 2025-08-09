import { Component } from '@angular/core';
import { RegisterFormComponent } from '../../../features/register-form';
import { AuthPageLayoutComponent } from '../../../shared/layouts';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [AuthPageLayoutComponent, RegisterFormComponent],
  templateUrl: './register-page.component.html',
})
export class RegisterPageComponent {
  isPasswordVisible = false;
  passwordLength = 0;
}
