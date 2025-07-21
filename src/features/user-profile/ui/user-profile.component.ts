import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserProfileApi } from '../api/user-profile.api';
import { ProfileApiResult } from '../../../shared/api-result';
import { ToastService, ToastComponent } from '../../../shared/ui-elements';
import { InputComponent } from '../../../shared/ui-elements';
import { validateUpdateForm } from '../model/validate-update';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { EditUserContract } from '../../../entities';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, InputComponent, ToastComponent],
  templateUrl: './user-profile.component.html',
})
export class UserProfileComponent implements OnInit {
  userProfile: ProfileApiResult | null = null;
  isLoading = true;
  hasError = false;
  isEditing = false;

  toastMessage: string | null = null;
  toastType: 'success' | 'error' = 'success';

  editableProfile: Partial<ProfileApiResult> = {};
  selectedAvatarFile: File | null = null;

  errors: string[] = [];

  formData: EditUserContract = {
    firstName: '',
    lastName: '',
    login: '',
    email: '',
    nickName: '',
    imageFile: undefined,
  };

  constructor(
    private userProfileApi: UserProfileApi,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userProfileApi.getUserProfile().subscribe({
      next: (profile) => {
        this.userProfile = profile;
        this.editableProfile = { ...profile };
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('[UserProfile] Error loading profile:', error);
        this.hasError = true;
        this.isLoading = false;
        this.toastService.show('Can not load user profile', 'error');
        this.router.navigate(['/login']);
      },
    });
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    if (this.isEditing && this.userProfile) {
      this.editableProfile = { ...this.userProfile };
    }
  }

  saveChanges(): void {
    const { firstName, lastName, login, email, nickName } = this.editableProfile;
  
    this.formData = {
      firstName: firstName || '',
      lastName: lastName || '',
      login: login || '',
      email: email || '',
      nickName: nickName || '',
      imageFile: this.selectedAvatarFile ?? undefined,
    };
  
    this.errors = validateUpdateForm(this.formData);
    if (this.errors.length > 0) return;
  
    this.userProfileApi.updateUserProfile(this.formData).subscribe({
      next: (response) => {
        this.toastService.show(response.message, 'success');
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1000);
      },
      error: (err: HttpErrorResponse) => {
        this.toastService.show(
          err.error?.message || 'Can not update profile',
          'error'
        );
      },
    });
  }  

  cancelEdit(): void {
    this.isEditing = false;
    if (this.userProfile) {
      this.editableProfile = { ...this.userProfile };
    }
    this.selectedAvatarFile = null;
    this.errors = [];
  }

  onAvatarChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedAvatarFile = file;

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          this.editableProfile.image = reader.result;
          if (this.userProfile) {
            this.userProfile.image = reader.result;
          }
        }
      };
      reader.readAsDataURL(file);
    }
  }

  onDeleteAccount(): void {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      this.userProfileApi.deleteUserProfile().subscribe({
        next: (response) => {
          this.toastService.show(response.message, 'success');
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 1000);
        },
        error: (err: HttpErrorResponse) => {
          this.toastService.show(
            err.error?.message || 'Can not delete profile',
            'error'
          );
        },
      });
    }
  }

  getFieldErrors(fieldName: string): string[] {
    const fieldMapping: { [key: string]: string } = {
      firstName: 'first name',
      lastName: 'last name',
      login: 'login',
      email: 'email',
      nickName: 'nick name',
    };
  
    const fieldNameLower = fieldMapping[fieldName];
    if (!fieldNameLower) return [];
  
    const filtered = this.errors.filter(e => e.toLowerCase().includes(fieldNameLower));
    return filtered;
  }  
}
