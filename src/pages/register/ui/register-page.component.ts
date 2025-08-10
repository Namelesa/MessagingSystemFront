import { Subscription } from 'rxjs';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, Eye, EyeOff } from 'lucide-angular';
import { RegisterApi, RegisterContract, RegisterFormStore } from '../../../entities/user';
import { AuthPageLayoutComponent } from '../../../features/auth-layout';
import { ButtonComponent, InputComponent, ToastService, ToastComponent } from '../../../shared/ui-elements';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [AuthPageLayoutComponent, ButtonComponent, InputComponent, ToastComponent, CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './register-page.component.html',
})
export class RegisterPageComponent implements OnInit, OnDestroy {
  isPasswordVisible = false;
  passwordLength = 0;

  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;
  readonly FolderIcon = undefined as unknown as never;

  formData: RegisterContract = {
    firstName: '',
    lastName: '',
    email: '',
    login: '',
    nickName: '',
    password: '',
    image: undefined,
  };

  fieldErrors: { [key: string]: string[] } = {
    firstName: [],
    lastName: [],
    login: [],
    email: [],
    nickName: [],
    password: [],
    image: [],
  };

  isSubmitting = false;
  isFormValid = false;

  private store: RegisterFormStore;
  private subs = new Subscription();

  constructor(
    api: RegisterApi,
    private toastService: ToastService,
    private router: Router,
  ) {
    this.store = new RegisterFormStore(api);
  }

  ngOnInit(): void {
    this.subs.add(this.store.allErrors$.subscribe(e => this.fieldErrors = e));
    this.subs.add(this.store.isSubmitting$.subscribe(v => this.isSubmitting = v));
    this.subs.add(this.store.isFormValid$.subscribe(v => this.isFormValid = v));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  getFieldErrors(fieldName: string): string[] {
    return this.fieldErrors[fieldName] || [];
  }

  onFirstNameChange(value: string) {
    this.formData.firstName = value;
    this.store.updateField('firstName', value);
  }

  onLastNameChange(value: string) {
    this.formData.lastName = value;
    this.store.updateField('lastName', value);
  }

  onLoginChange(value: string) {
    this.formData.login = value;
    this.store.updateField('login', value);
  }

  onEmailChange(value: string) {
    this.formData.email = value;
    this.store.updateField('email', value);
  }

  onNickNameChange(value: string) {
    this.formData.nickName = value;
    this.store.updateField('nickName', value);
  }

  onPasswordInput(value: string) {
    this.formData.password = value;
    this.passwordLength = value.length;
    this.store.updateField('password', value);
  }

  togglePasswordVisibility() {
    this.isPasswordVisible = !this.isPasswordVisible;
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : undefined;
    this.formData.image = file;
    this.store.updateImage(file);
  }

  onSubmit() {
    this.store.markAllTouched();
    this.store.submit().subscribe({
      next: (result) => {
        if (result?.message === 'User registered and need to confirm email') {
          this.toastService.show('Registration successfull. Please confirm email', 'success');
          this.resetForm();
          setTimeout(() => this.router.navigate(['/login']), 3000);
        } else if (result?.message === 'Invalid form') {
          this.toastService.show('Please fix form errors before submitting', 'error');
        } else {
          this.toastService.show('Registration failed. Please try again.', 'error');
        }
      },
      error: () => {
        this.toastService.show('An unexpected error occurred.', 'error');
      }
    });
  }

  private resetForm() {
    this.formData = {
      firstName: '', lastName: '', email: '', login: '', nickName: '', password: '', image: undefined,
    };
    this.store.reset();
  }
}