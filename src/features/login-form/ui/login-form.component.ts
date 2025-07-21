import { Component, Output, EventEmitter } from '@angular/core';
import { LoginApi } from '../api/login.api';
import { validateLoginForm } from '../model/validate-login';
import { LoginContract } from '../../../entities/user/api/login-contract';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common'; 
import { ButtonComponent, InputComponent, ToastService, ToastComponent } from '../../../shared/ui-elements';
import {LucideAngularModule, Eye, EyeOff, FolderIcon } from 'lucide-angular';
import { Router } from '@angular/router';
import { AuthService } from '../../../entities/user/api/auht.service';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [FormsModule, CommonModule, ButtonComponent, InputComponent, LucideAngularModule, ToastComponent],
  templateUrl: './login-form.component.html',
})
export class LoginFormComponent {

  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;
  readonly FolderIcon = FolderIcon;

  toastMessage: string | null = null;
  toastType: 'success' | 'error' = 'success';

  passwordVisible = false;

  errors: string[] = [];
  isSubmitting = false;

  formData: LoginContract = {
    login: '',
    nickName: '',
    password: ''
  };

  @Output() passwordVisibleChange = new EventEmitter<boolean>();
  @Output() passwordLengthChange = new EventEmitter<number>();

  constructor(
    private loginapi: LoginApi, 
    private toastService: ToastService, 
    private router: Router,
    private authService: AuthService) {}

  onPasswordInput(value: string) {
    this.formData.password = value;
    this.passwordLengthChange.emit(value.length);
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
    this.passwordVisibleChange.emit(this.passwordVisible);
  }

  onSubmit() {
    this.errors = validateLoginForm(this.formData);
    if (this.errors.length > 0) return;
  
    this.isSubmitting = true;
  
    this.loginapi.loginUser(this.formData).subscribe({
      next: (result) => {
        if (result.message == 'True') {
          this.authService.setNickName(this.formData.nickName);
          
          this.authService.getUserProfile().subscribe({
            next: (profile) => {
              this.authService.setLoggedIn(true);
              this.router.navigate(['/profile']);
            },
            error: (error) => {
              console.error('Failed to load user profile:', error);
              this.authService.setLoggedIn(true);
              this.router.navigate(['/profile']);
            }
          });
        } else {
          this.toastService.show('Login failed. Please try again.', 'error');
        }
  
        this.isSubmitting = false;
      },
      error: () => {
        this.toastService.show('An error occurred. Please try again later.', 'error');
        this.isSubmitting = false;
      }
    });
  }
  
  getFieldErrors(fieldName: string): string[] {
    const fieldMapping: { [key: string]: string } = {
      'login': 'Login',
      'nickName': 'NickName',
      'password': 'Password'
    };
    
    const fieldDisplayName = fieldMapping[fieldName];
    if (!fieldDisplayName) return [];
    
    return this.errors.filter(error => 
      error.startsWith(`* ${fieldDisplayName}`) || 
      error.startsWith(`${fieldDisplayName}`)
    );
  }
}