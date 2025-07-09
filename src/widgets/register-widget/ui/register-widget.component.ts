import { Component, Output, EventEmitter } from '@angular/core';
import { RegisterFormComponent } from '../../../features/register-form';

@Component({
  selector: 'app-register-widget',
  standalone: true,
  imports: [RegisterFormComponent],
  template: `
      <app-register-form
          (passwordVisibleChange)="passwordVisibleChange.emit($event)"
          (passwordLengthChange)="passwordLengthChange.emit($event)"
        ></app-register-form>
  `,
})
export class RegisterWidgetComponent {
  @Output() passwordVisibleChange = new EventEmitter<boolean>();
  @Output() passwordLengthChange = new EventEmitter<number>();
}

