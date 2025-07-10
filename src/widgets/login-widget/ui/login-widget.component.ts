import { Component, Output, EventEmitter } from '@angular/core';
import { LoginFormComponent } from '../../../features/login-form';

@Component({
  selector: 'app-login-widget',
  standalone: true,
  imports: [LoginFormComponent],
  template: `
      <app-login-form
          (passwordVisibleChange)="passwordVisibleChange.emit($event)"
          (passwordLengthChange)="passwordLengthChange.emit($event)"
        ></app-login-form>
  `,
})
export class LoginWidgetComponent {
  @Output() passwordVisibleChange = new EventEmitter<boolean>();
  @Output() passwordLengthChange = new EventEmitter<number>();
}