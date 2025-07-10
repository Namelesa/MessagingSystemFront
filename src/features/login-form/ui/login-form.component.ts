import { Component, Output, EventEmitter } from '@angular/core';
import { LoginApi } from '../api/login.api';
import { validateLoginForm } from '../model/validate-login';
import { LoginContract } from '../../../entities/user/api/login-contract';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common'; 
import { ButtonComponent, InputComponent } from '../../../shared/ui-elements';
import {LucideAngularModule, Eye, EyeOff, FolderIcon } from 'lucide-angular';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [FormsModule, CommonModule, ButtonComponent, InputComponent, LucideAngularModule],
  templateUrl: './login-form.component.html',
})
export class LoginFormComponent {

  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;
  readonly FolderIcon = FolderIcon;

  formData: LoginContract = {
    login: '',
    nickName: '',
    password: ''
  };

  @Output() passwordVisibleChange = new EventEmitter<boolean>();
  @Output() passwordLengthChange = new EventEmitter<number>();

  passwordVisible = false;

  errors: string[] = [];
  isSubmitting = false;

  constructor(private loginapi: LoginApi) {}

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
        console.log('✅ Login success:', result);

        if (result && typeof result === 'object') {
          if ('success' in result && !result.success) {
            this.errors = [result.message || 'Login failed.'];
          } else {
            alert(result.message || 'Login successful!');
          }
        } else {
          alert('Login successful!');
        }
  
        this.isSubmitting = false;
      },
  
      error: (errorResponse) => {
        console.error('❌ Login error:', errorResponse);
  
        if (errorResponse.error?.errors) {
          this.errors = Object.entries(errorResponse.error.errors)
            .flatMap(([field, messages]: [string, any]) =>
              (messages as string[]).map(msg => `${field}: ${msg}`)
            );
        } else if (errorResponse.error?.message) {
          this.errors = [errorResponse.error.message];
        } else {
          this.errors = ['Login failed. Please try again later.'];
        }
  
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
