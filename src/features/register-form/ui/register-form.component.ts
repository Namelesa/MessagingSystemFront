import { Component, Output, EventEmitter } from '@angular/core';
import { RegisterApi } from '../api/register.api';
import { validateRegisterForm } from '../model/validate-register';
import { RegisterContract } from '../../../entities/user/api/register-contract';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common'; 
import { ButtonComponent, InputComponent } from '../../../shared/ui-elements';
import {LucideAngularModule, Eye, EyeOff, FolderIcon } from 'lucide-angular';

@Component({
  selector: 'app-register-form',
  standalone: true,
  imports: [FormsModule, CommonModule, ButtonComponent, InputComponent, LucideAngularModule],
  templateUrl: './register-form.component.html',
})
export class RegisterFormComponent {

  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;
  readonly FolderIcon = FolderIcon;

  formData: RegisterContract = {
    firstName: '',
    lastName: '',
    login: '',
    email: '',
    nickName: '',
    password: '',
    image: undefined,
  };

  @Output() passwordVisibleChange = new EventEmitter<boolean>();
  @Output() passwordLengthChange = new EventEmitter<number>();

  passwordVisible = false;

  errors: string[] = [];
  isSubmitting = false;

  constructor(private registerApi: RegisterApi) {}

  onPasswordInput(value: string) {
    this.formData.password = value;
    this.passwordLengthChange.emit(value.length);
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
    this.passwordVisibleChange.emit(this.passwordVisible);
  }

  onSubmit() {
    this.errors = validateRegisterForm(this.formData);
    if (this.errors.length > 0) return;

    this.isSubmitting = true;
    this.registerApi.registerUser(this.formData).subscribe({
      next: (result) => {
        alert(result.message);
        this.isSubmitting = false;
      },
      error: () => {
        alert('Registration failed');
        this.isSubmitting = false;
      }
    });
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.formData.image = input.files[0];
    } else {
      this.formData.image = undefined;
    }
  }

  getFieldErrors(fieldName: string): string[] {
    const fieldMapping: { [key: string]: string } = {
      'firstName': 'First name',
      'lastName': 'Last name', 
      'login': 'Login',
      'email': 'Email',
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

  getGeneralErrors(): string[] {
    const fieldErrors = [
      '* First name is required',
      '* Last name is required', 
      '* Login is required',
      '* Email is required',
      '* NickName is required',
      '* Password is required'
    ];
    
    return this.errors.filter(error => 
      !fieldErrors.some(fieldError => error.startsWith(fieldError.substring(0, fieldError.indexOf(' is'))))
    );
  }
}
