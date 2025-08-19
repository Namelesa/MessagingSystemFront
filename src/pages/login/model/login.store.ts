import { Subscription, Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { LoginContract } from '../../../entities/user';
import { LoginApi, LoginFormStore } from '../../../features/auth';
import { AuthService } from '../../../entities/session';
import { ToastService } from '../../../shared/ui-elements';
import { Router } from '@angular/router';

@Injectable()
export class LoginPageStore {
  private subs = new Subscription();
  private store: LoginFormStore;

  fieldErrors: { [key: string]: string[] } = {
    login: [],
    nickName: [],
    password: [],
  };

  isSubmitting = false;
  isFormValid = false;
  passwordLength = 0;
  formData: LoginContract = {
    login: '',
    nickName: '',
    password: '',
  };

  constructor(
    api: LoginApi,
    public toastService: ToastService,
    private router: Router,
    private authService: AuthService,
  ) {
    this.store = new LoginFormStore(api);
    this.initSubscriptions();
  }

  private initSubscriptions() {
    this.subs.add(this.store.allErrors$.subscribe(e => this.fieldErrors = e));
    this.subs.add(this.store.isSubmitting$.subscribe(v => this.isSubmitting = v));
    this.subs.add(this.store.isFormValid$.subscribe(v => this.isFormValid = v));
  }

  updateField(field: keyof LoginContract, value: string) {
    this.formData[field] = value;
    if (field === 'password') {
      this.passwordLength = value.length;
    }
    this.store.updateField(field, value);
  }

  getFieldErrors(fieldName: string): string[] {
    return this.fieldErrors[fieldName] || [];
  }

  submit(): Observable<any> {
    this.store.markAllTouched();
    return this.store.submit();
  }

  handleLoginResult(result: any) {
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
  }

  dispose() {
    this.subs.unsubscribe();
  }
}