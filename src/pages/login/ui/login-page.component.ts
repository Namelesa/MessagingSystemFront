import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Eye, EyeOff } from 'lucide-angular';
import { AuthPageLayoutComponent } from '../../../widgets/auth-layout';
import { ButtonComponent, InputComponent, ToastComponent, ToastService } from '../../../shared/ui-elements';
import { LoginPageStore } from '../api/login.store';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    AuthPageLayoutComponent,
    ButtonComponent,
    InputComponent,
    ToastComponent,
    CommonModule,
    FormsModule,
    LucideAngularModule
  ],
  providers: [LoginPageStore],
  templateUrl: './login-page.component.html',
})
export class LoginPageComponent implements OnDestroy {
  isPasswordVisible = false;
  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;

  constructor(public store: LoginPageStore) {}

  get formData() {
    return this.store.formData;
  }

  get passwordLength() {
    return this.store.passwordLength;
  }

  getFieldErrors(fieldName: string): string[] {
    return this.store.getFieldErrors(fieldName);
  }

  togglePasswordVisibility() {
    this.isPasswordVisible = !this.isPasswordVisible;
  }

  onLoginChange(value: string) {
    this.store.updateField('login', value);
  }

  onNickNameChange(value: string) {
    this.store.updateField('nickName', value);
  }

  onPasswordChange(value: string) {
    this.store.updateField('password', value);
  }

  onSubmit() {
    this.store.submit().subscribe({
      next: (result) => this.store.handleLoginResult(result),
      error: () => {
        this.store.toastService.show('An error occurred. Please try again later.', 'error');
      }
    });
  }

  ngOnDestroy(): void {
    this.store.dispose();
  }
}