import { Subject } from 'rxjs'; 
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Component, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common'; 
import { Router } from '@angular/router';
import {LucideAngularModule, Eye, EyeOff, FolderIcon } from 'lucide-angular';
import { LoginApi } from '../api/login.api';
import { LoginContract } from '../../../entities/user';
import { LoginFieldValidationHelper } from '../../../shared/helper';
import { ButtonComponent, InputComponent, ToastService, ToastComponent } from '../../../shared/ui-elements';
import { AuthService } from '../../../shared/auth-guard';

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

  fieldTouched: { [key: string]: boolean } = {
    login: false,
    nickName: false,
    password: false,
  };

  fieldErrors: { [key: string]: string[] } = {
    login: [],
    nickName: [],
    password: []
  };

  private validationSubjects: { [key: string]: Subject<string> } = {
    login: new Subject<string>(),
    nickName: new Subject<string>(),
    password: new Subject<string>()
  };

  @Output() passwordVisibleChange = new EventEmitter<boolean>();
  @Output() passwordLengthChange = new EventEmitter<number>();

  constructor(
    private loginapi: LoginApi, 
    private toastService: ToastService, 
    private router: Router,
    private authService: AuthService) {}


    ngOnInit() {
      Object.keys(this.validationSubjects).forEach(fieldName => {
        this.validationSubjects[fieldName]
          .pipe(
            debounceTime(300),
            distinctUntilChanged()
          )
          .subscribe(value => {
            this.validateField(fieldName, value);
          });
      });
    }

    private validateField(fieldName: string, value: string) {
      if (!this.fieldTouched[fieldName]) return;
  
      if (fieldName in { firstName: 1, lastName: 1, login: 1, email: 1, nickName: 1, password: 1 }) {
        this.fieldErrors[fieldName] = LoginFieldValidationHelper.validateField(
          fieldName as 'login' | 'nickName' | 'password', 
          value
        );
      }
    }

    onLoginChange(value: string) {
      this.formData.login = value;
      this.fieldTouched['login'] = true;
      this.validationSubjects['login'].next(value);
    }

    onNickNameChange(value: string) {
      this.formData.nickName = value;
      this.fieldTouched['nickName'] = true;
      this.validationSubjects['nickName'].next(value);
    }
  
    onPasswordInput(value: string) {
      this.formData.password = value;
      this.fieldTouched['password'] = true;
      this.passwordLengthChange.emit(value.length);
      this.validationSubjects['password'].next(value);
    }
  
    togglePasswordVisibility() {
      this.passwordVisible = !this.passwordVisible;
      this.passwordVisibleChange.emit(this.passwordVisible);
    }

    getFieldErrors(fieldName: string): string[] {
      return this.fieldErrors[fieldName] || [];
    }
  
    get isFormValid(): boolean {
      return !LoginFieldValidationHelper.hasErrors(this.fieldErrors) && this.isFormComplete();
    }
  
    isFormComplete(): boolean {
      return !!(this.formData.login && 
                this.formData.nickName && 
                this.formData.password);
    }

  onSubmit() {
    Object.keys(this.fieldTouched).forEach(key => {
      this.fieldTouched[key] = true;
    });

    this.fieldErrors = LoginFieldValidationHelper.validateAllFields(this.formData);

    if (LoginFieldValidationHelper.hasErrors(this.fieldErrors)) {
      const errorCount = LoginFieldValidationHelper.getAllErrors(this.fieldErrors).length;
      this.toastService.show(`Please fix ${errorCount} error${errorCount > 1 ? 's' : ''} before submitting`, 'error');
      return;
    }

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

  hasAnyFieldBeenTouched(): boolean {
    return Object.values(this.fieldTouched).some(touched => touched);
  }

  getTotalErrorCount(): number {
    return LoginFieldValidationHelper.getAllErrors(this.fieldErrors).length;
  }

  getFormCompletionPercentage(): number {
    const fields = ['login', 'nickName', 'password', 'image'];
    const completedFields = fields.filter(field => {
      return !!(this.formData as any)[field];
    });
    
    return Math.round((completedFields.length / fields.length) * 100);
  }

  ngOnDestroy() {
    Object.values(this.validationSubjects).forEach(subject => {
      subject.complete();
    });
  }
}