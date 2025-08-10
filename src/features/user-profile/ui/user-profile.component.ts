import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { validateUpdateForm, validateSingleField } from '../model/validate-update';
import { UserProfileApi } from '../api/user-profile.api';
import { ProfileApiResult } from '../../../entities/session';
import { EditUserContract } from '../../../entities/user';
import { InputComponent, ToastService, ToastComponent } from '../../../shared/ui-elements';

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
  showDeleteModal = false;

  toastMessage: string | null = null;
  toastType: 'success' | 'error' = 'success';

  editableProfile: Partial<ProfileApiResult> = {};
  selectedAvatarFile: File | null = null;

  fieldErrors: { [key: string]: string[] } = {
    firstName: [],
    lastName: [],
    login: [],
    email: [],
    nickName: [],
    imageFile: []
  };

  touchedFields: { [key: string]: boolean } = {
    firstName: false,
    lastName: false,
    login: false,
    email: false,
    nickName: false,
    imageFile: false
  };

  formData: EditUserContract = {
    firstName: '',
    lastName: '',
    login: '',
    email: '',
    nickName: '',
    imageFile: undefined,
  };

  private validationSubjects: { [key: string]: Subject<string> } = {
    firstName: new Subject<string>(),
    lastName: new Subject<string>(),
    login: new Subject<string>(),
    email: new Subject<string>(),
    nickName: new Subject<string>()
  };

  constructor(
    private userProfileApi: UserProfileApi,
    private toastService: ToastService,
    private router: Router
  ) {
    this.setupDynamicValidation();
  }

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

  private setupDynamicValidation(): void {
    Object.keys(this.validationSubjects).forEach(fieldName => {
      this.validationSubjects[fieldName]
        .pipe(
          debounceTime(300),
          distinctUntilChanged()
        )
        .subscribe(value => {
          this.validateField(fieldName as keyof EditUserContract, value);
        });
    });
  }

  private validateField(fieldName: keyof EditUserContract, value: any): void {
    if (!this.touchedFields[fieldName]) return;

    const errors = validateSingleField(fieldName, value);
    this.fieldErrors[fieldName] = errors;
  }

  onFieldChange(fieldName: keyof EditUserContract, value: any): void {
    (this.editableProfile as any)[fieldName] = value;
    
    this.touchedFields[fieldName] = true;
    
    if (this.validationSubjects[fieldName]) {
      this.validationSubjects[fieldName].next(value);
    }
  }

  onFieldBlur(fieldName: keyof EditUserContract): void {
    this.touchedFields[fieldName] = true;
    
    const value = (this.editableProfile as any)[fieldName];
    this.validateField(fieldName, value);
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    if (this.isEditing && this.userProfile) {
      this.editableProfile = { ...this.userProfile };
      this.resetValidationState();
    }
  }

  private resetValidationState(): void {
    Object.keys(this.fieldErrors).forEach(key => {
      this.fieldErrors[key] = [];
    });
    
    Object.keys(this.touchedFields).forEach(key => {
      this.touchedFields[key] = false;
    });
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

    Object.keys(this.touchedFields).forEach(key => {
      this.touchedFields[key] = true;
    });

    const allErrors = validateUpdateForm(this.formData);
    
    this.distributeErrors(allErrors);
    
    const hasErrors = Object.values(this.fieldErrors).some(errors => errors.length > 0);
    
    if (hasErrors) {
      this.toastService.show('Please fix validation errors', 'error');
      return;
    }
  
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

  private distributeErrors(errors: string[]): void {
    Object.keys(this.fieldErrors).forEach(key => {
      this.fieldErrors[key] = [];
    });

    const fieldMapping: { [key: string]: string } = {
      'first name': 'firstName',
      'last name': 'lastName',
      'login': 'login',
      'email': 'email',
      'nickname': 'nickName',
      'image': 'imageFile'
    };

    errors.forEach(error => {
      const errorLower = error.toLowerCase();
      let assigned = false;

      Object.entries(fieldMapping).forEach(([keyword, fieldName]) => {
        if (errorLower.includes(keyword) && !assigned) {
          this.fieldErrors[fieldName].push(error);
          assigned = true;
        }
      });

      if (!assigned) {
        console.warn('Unassigned error:', error);
      }
    });
  }

  cancelEdit(): void {
    this.isEditing = false;
    if (this.userProfile) {
      this.editableProfile = { ...this.userProfile };
    }
    this.selectedAvatarFile = null;
    this.resetValidationState();
  }

  onAvatarChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedAvatarFile = file;

      this.touchedFields['imageFile'] = true;
      
      this.validateField('imageFile', file);

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
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    this.showDeleteModal = false;
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

  cancelDelete(): void {
    this.showDeleteModal = false;
  }

  getFieldErrors(fieldName: string): string[] {
    return this.fieldErrors[fieldName] || [];
  }

  hasFieldError(fieldName: string): boolean {
    return this.touchedFields[fieldName] && this.fieldErrors[fieldName].length > 0;
  }

  isFieldValid(fieldName: string): boolean {
    return this.touchedFields[fieldName] && this.fieldErrors[fieldName].length === 0;
  }

  ngOnDestroy(): void {
    Object.values(this.validationSubjects).forEach(subject => {
      subject.complete();
    });
  }
}