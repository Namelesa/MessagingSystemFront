import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, Observable } from 'rxjs';
import { RegisterApi, RegisterContract, RegisterFormStore } from '../../../entities/user';
import { ToastService } from '../../../shared/ui-elements';

@Injectable()
export class RegisterPageStore {
  private subs = new Subscription();
  private store: RegisterFormStore;

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
  passwordLength = 0;
  
  formData: RegisterContract = {
    firstName: '',
    lastName: '',
    email: '',
    login: '',
    nickName: '',
    password: '',
    image: undefined,
  };

  constructor(
    api: RegisterApi,
    public toastService: ToastService,
    private router: Router,
  ) {
    this.store = new RegisterFormStore(api);
    this.initSubscriptions();
  }

  private initSubscriptions() {
    this.subs.add(this.store.allErrors$.subscribe(e => this.fieldErrors = e));
    this.subs.add(this.store.isSubmitting$.subscribe(v => this.isSubmitting = v));
    this.subs.add(this.store.isFormValid$.subscribe(v => this.isFormValid = v));
  }

  updateField(field: 'firstName' | 'lastName' | 'login' | 'email' | 'nickName' | 'password', value: string) {
    this.formData[field] = value;
    if (field === 'password') {
      this.passwordLength = value.length;
    }
    this.store.updateField(field, value);
  }

  updateImage(file: File | undefined) {
    this.formData.image = file;
    this.store.updateImage(file);
  }

  getFieldErrors(fieldName: string): string[] {
    return this.fieldErrors[fieldName] || [];
  }

  submit(): Observable<any> {
    this.store.markAllTouched();
    return this.store.submit();
  }

  handleRegisterResult(result: any) {
    if (result?.message === 'User registered and need to confirm email') {
      this.toastService.show('Registration successful. Please confirm email', 'success');
      this.resetForm();
      setTimeout(() => this.router.navigate(['/login']), 3000);
    } else if (result?.message === 'Invalid form') {
      this.toastService.show('Please fix form errors before submitting', 'error');
    } else {
      this.toastService.show('Registration failed. Please try again.', 'error');
    }
  }

  private resetForm() {
    this.formData = {
      firstName: '',
      lastName: '',
      email: '',
      login: '',
      nickName: '',
      password: '',
      image: undefined,
    };
    this.store.reset();
  }

  dispose() {
    this.subs.unsubscribe();
  }
}