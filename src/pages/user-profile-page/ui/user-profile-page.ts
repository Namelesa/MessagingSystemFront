import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserProfileWidgetComponent } from '../../../widgets/user-profile-widget';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, UserProfileWidgetComponent],
  templateUrl: './user-profile-page.html',
})
export class ProfilePageComponent {}
