import { Component, Input } from '@angular/core';
import { PasswordAvatarComponent } from '../../../ui-elements';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'auth-page-layout',
  imports: [PasswordAvatarComponent, RouterModule],
  templateUrl: './auth.component.html'
})
export class AuthPageLayoutComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() bottomText = '';
  @Input() bottomLink: { href: string; text: string } = { href: '', text: '' };

  @Input() isPasswordVisible = false;
  @Input() passwordLength = 0;
}
