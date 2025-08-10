import { Subscription } from 'rxjs';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, Eye, EyeOff } from 'lucide-angular';
import { AuthService } from '../../../entities/session';
import { LoginApi, LoginContract, LoginFormStore } from '../../../entities/user';
import { AuthPageLayoutComponent } from '../../../widgets/auth-layout';
import { ButtonComponent, InputComponent, ToastComponent, ToastService } from '../../../shared/ui-elements';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [AuthPageLayoutComponent, ButtonComponent, InputComponent, ToastComponent, CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './login-page.component.html',
})
export class LoginPageComponent implements OnInit, OnDestroy {
  isPasswordVisible = false;
  passwordLength = 0;

  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;

  formData: LoginContract = {
    login: '',
    nickName: '',
    password: '',
  };

  fieldErrors: { [key: string]: string[] } = {
    login: [],
    nickName: [],
    password: [],
  };

  isSubmitting = false;
  isFormValid = false;

  private store: LoginFormStore;
  private subs = new Subscription();

  constructor(
    api: LoginApi,
    private toastService: ToastService,
    private router: Router,
    private authService: AuthService,
  ) {
    this.store = new LoginFormStore(api);
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

  onLoginChange(value: string) {
    this.formData.login = value;
    this.store.updateField('login', value);
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

  onSubmit() {
    this.store.markAllTouched();
    this.store.submit().subscribe({
      next: (result) => {
        if (result?.message === 'True') {
          this.toastService.show('Login successful', 'success');
          const nick = this.formData.nickName;
          if (nick) {
            this.authService.setNickName(nick).then(() => {
              this.authService.getUserProfile().subscribe({
                next: () => {
                  this.authService.setLoggedIn(true);
                  this.router.navigate(['/profile']);
                },
                error: () => {
                  this.authService.setLoggedIn(true);
                  this.router.navigate(['/profile']);
                }
              });
            });
          } else {
            this.router.navigate(['/profile']);
          }
        } else if (result?.message === 'Invalid form') {
          this.toastService.show('Please fix form errors before submitting', 'error');
        } else {
          this.toastService.show('Login failed. Please try again.', 'error');
        }
      },
      error: () => {
        this.toastService.show('An error occurred. Please try again later.', 'error');
      }
    });
  }
}