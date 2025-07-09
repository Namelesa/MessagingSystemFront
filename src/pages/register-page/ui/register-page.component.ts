import { Component } from '@angular/core';
import { RegisterWidgetComponent } from '../../../widgets/register-widget';
import { PasswordAvatarComponent } from '../../../shared/ui-elements/password-avatar';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [RegisterWidgetComponent, PasswordAvatarComponent],
  templateUrl: './register-page.component.html',
})
export class RegisterPageComponent {
  isPasswordVisible = false;
  passwordLength = 0;
}
