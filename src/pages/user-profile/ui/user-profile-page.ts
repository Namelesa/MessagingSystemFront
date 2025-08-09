import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserProfileComponent } from '../../../features/user-profile';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, UserProfileComponent],
  templateUrl: './user-profile-page.html',
})
export class ProfilePageComponent {}
