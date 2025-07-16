import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserProfileComponent } from '../../../features/user-profile';

@Component({
  selector: 'app-user-profile-widget',
  standalone: true,
  imports: [CommonModule, UserProfileComponent],
  templateUrl: './user-profile-widget.component.html',
})
export class UserProfileWidgetComponent {}
