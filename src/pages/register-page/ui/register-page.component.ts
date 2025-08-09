import { Component } from '@angular/core';
import { RegisterWidgetComponent } from '../../../widgets/register-widget';
import { AuthPageLayoutComponent } from '../../../shared/layouts';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [AuthPageLayoutComponent, RegisterWidgetComponent],
  templateUrl: './register-page.component.html',
})
export class RegisterPageComponent {
  isPasswordVisible = false;
  passwordLength = 0;
}
