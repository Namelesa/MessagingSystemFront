import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserProfileApi } from '../api/user-profile.api';
import { ProfileApiResult } from '../../../shared/api-result';
import { ToastService } from '../../../shared/ui-elements';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-profile.component.html',
})
export class UserProfileComponent implements OnInit {
  userProfile: ProfileApiResult | null = null;
  isLoading = true;
  hasError = false;

  constructor(
    private userProfileApi: UserProfileApi,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.userProfileApi.getUserProfile().subscribe({
      next: (profile) => {
        this.userProfile = profile;
        this.isLoading = false;
      },
      error: () => {
        this.hasError = true;
        this.isLoading = false;
        this.toastService.show('Can not load user profile', 'error');
      },
    });
  }
}
