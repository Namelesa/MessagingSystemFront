import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Eye, EyeOff } from 'lucide-angular';
import { RegisterPageStore } from '../model/register.store';
import { AuthPageLayoutComponent } from '../../../widgets/auth-layout';
import { ButtonComponent, InputComponent, ToastComponent } from '../../../shared/ui-elements';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [
    AuthPageLayoutComponent,
    ButtonComponent,
    InputComponent,
    CommonModule,
    FormsModule,
    LucideAngularModule,
    ToastComponent
],
  providers: [RegisterPageStore],
  templateUrl: './register-page.component.html',
})
export class RegisterPageComponent implements OnDestroy {
  isPasswordVisible = false;
  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;
  readonly bottomText = "Already have an account?";

  constructor(public store: RegisterPageStore) {}

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

  onFirstNameChange(value: string) {
    this.store.updateField('firstName', value);
  }

  onLastNameChange(value: string) {
    this.store.updateField('lastName', value);
  }

  onLoginChange(value: string) {
    this.store.updateField('login', value);
  }

  onEmailChange(value: string) {
    this.store.updateField('email', value);
  }

  onNickNameChange(value: string) {
    this.store.updateField('nickName', value);
  }

  onPasswordInput(value: string) {
    this.store.updateField('password', value);
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : undefined;
    this.store.updateImage(file);
  }

  onSubmit() {
    this.store.submit().subscribe({
      next: (result) => this.store.handleRegisterResult(result),
      error: () => {
        this.store.toastService.show('An unexpected error occurred.', 'error');
      }
    });
  }

  ngOnDestroy(): void {
    this.store.dispose();
  }
}