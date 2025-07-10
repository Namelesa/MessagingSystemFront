import { Component, Output, EventEmitter} from '@angular/core';
import { RegisterApi } from '../api/register.api';
import { validateRegisterForm } from '../model/validate-register';
import { RegisterContract } from '../../../entities/user/api/register-contract';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common'; 
import { ButtonComponent, InputComponent, ToastService, ToastComponent } from '../../../shared/ui-elements';
import {LucideAngularModule, Eye, EyeOff, FolderIcon } from 'lucide-angular';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-register-form',
  standalone: true,
  imports: [FormsModule, CommonModule, ButtonComponent, InputComponent, LucideAngularModule, ToastComponent],
  templateUrl: './register-form.component.html',
})
export class RegisterFormComponent {

  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;
  readonly FolderIcon = FolderIcon;

  toastMessage: string | null = null;
  toastType: 'success' | 'error' = 'success';

  passwordVisible = false;

  errors: string[] = [];
  isSubmitting = false;

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

  constructor(private registerApi: RegisterApi, private toastService: ToastService, private router: Router) {}

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
        if (result.message == 'User registered and need to confirm email') {
          this.toastService.show('Registration successful!', 'success');
          this.resetForm();
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        }   
        else {
          this.toastService.show('Registration failed. Please try again.', 'error');
        }
        this.isSubmitting = false;
      },
      error: (err : HttpErrorResponse) => {
        if(err.status === 400) {
          this.toastService.show("A user with these parameters already exists.", 'error');
        } else {
          this.toastService.show('An unexpected error occurred.', 'error');
        }
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

  private resetForm() {
    this.formData = {
      firstName: '',
      lastName: '',
      login: '',
      email: '',
      nickName: '',
      password: '',
      image: undefined,
    };
    this.errors = [];
  }
}
