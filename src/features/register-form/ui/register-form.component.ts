import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common'; 
import { RegisterApi } from '../api/register.api';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { LucideAngularModule, Eye, EyeOff, FolderIcon } from 'lucide-angular';
import { RegisterContract } from '../../../entities/user';
import { RegisterFieldValidationHelper } from '../../../shared/helper';
import { ButtonComponent, InputComponent, ToastService, ToastComponent } from '../../../shared/ui-elements';

@Component({
  selector: 'app-register-form',
  standalone: true,
  imports: [FormsModule, CommonModule, ButtonComponent, InputComponent, LucideAngularModule, ToastComponent],
  templateUrl: './register-form.component.html',
})
export class RegisterFormComponent implements OnInit {

  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;
  readonly FolderIcon = FolderIcon;

  toastMessage: string | null = null;
  toastType: 'success' | 'error' = 'success';

  passwordVisible = false;

  fieldErrors: { [key: string]: string[] } = {
    firstName: [],
    lastName: [],
    login: [],
    email: [],
    nickName: [],
    password: [],
    image: []
  };

  fieldTouched: { [key: string]: boolean } = {
    firstName: false,
    lastName: false,
    login: false,
    email: false,
    nickName: false,
    password: false,
    image: false
  };

  isSubmitting = false;

  formData: RegisterContract = {
    firstName: '',
    lastName: '',
    email: '',
    login: '',
    nickName: '',
    password: '',
    image: undefined,
  };

  private validationSubjects: { [key: string]: Subject<string> } = {
    firstName: new Subject<string>(),
    lastName: new Subject<string>(),
    login: new Subject<string>(),
    email: new Subject<string>(),
    nickName: new Subject<string>(),
    password: new Subject<string>()
  };

  @Output() passwordVisibleChange = new EventEmitter<boolean>();
  @Output() passwordLengthChange = new EventEmitter<number>();

  constructor(
    private registerApi: RegisterApi, 
    private toastService: ToastService, 
    private router: Router
  ) {}

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
      this.fieldErrors[fieldName] = RegisterFieldValidationHelper.validateField(
        fieldName as 'firstName' | 'lastName' | 'login' | 'email' | 'nickName' | 'password', 
        value
      );
    }
  }

  onFirstNameChange(value: string) {
    this.formData.firstName = value;
    this.fieldTouched['firstName'] = true;
    this.validationSubjects['firstName'].next(value);
  }

  onLastNameChange(value: string) {
    this.formData.lastName = value;
    this.fieldTouched['lastName'] = true;
    this.validationSubjects['lastName'].next(value);
  }

  onLoginChange(value: string) {
    this.formData.login = value;
    this.fieldTouched['login'] = true;
    this.validationSubjects['login'].next(value);
  }

  onEmailChange(value: string) {
    this.formData.email = value;
    this.fieldTouched['email'] = true;
    this.validationSubjects['email'].next(value);
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

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.fieldTouched['image'] = true;
    
    if (input.files && input.files.length) {
      this.formData.image = input.files[0];
    } else {
      this.formData.image = undefined;
    }

    this.fieldErrors['image'] = RegisterFieldValidationHelper.validateImage(this.formData.image);
  }

  getFieldErrors(fieldName: string): string[] {
    return this.fieldErrors[fieldName] || [];
  }

  get isFormValid(): boolean {
    return !RegisterFieldValidationHelper.hasErrors(this.fieldErrors) && this.isFormComplete();
  }

  isFormComplete(): boolean {
    return !!(this.formData.firstName && 
              this.formData.lastName && 
              this.formData.login && 
              this.formData.email && 
              this.formData.nickName && 
              this.formData.password &&
              this.formData.image);
  }

  onSubmit() {
    Object.keys(this.fieldTouched).forEach(key => {
      this.fieldTouched[key] = true;
    });

    this.fieldErrors = RegisterFieldValidationHelper.validateAllFields(this.formData);

    if (RegisterFieldValidationHelper.hasErrors(this.fieldErrors)) {
      const errorCount = RegisterFieldValidationHelper.getAllErrors(this.fieldErrors).length;
      this.toastService.show(`Please fix ${errorCount} error${errorCount > 1 ? 's' : ''} before submitting`, 'error');
      return;
    }

    this.isSubmitting = true;

    this.registerApi.registerUser(this.formData).subscribe({
      next: (result) => {
        if (result.message == 'User registered and need to confirm email') {
          this.toastService.show('Registration successfull. Please confirm email', 'success');
          this.resetForm();
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        } else {
          this.toastService.show('Registration failed. Please try again.', 'error');
        }
        this.isSubmitting = false;
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 400) {
          this.toastService.show("A user with these parameters already exists.", 'error');
        } else {
          this.toastService.show('An unexpected error occurred.', 'error');
        }
        this.isSubmitting = false;
      }
    });
  }

  hasAnyFieldBeenTouched(): boolean {
    return Object.values(this.fieldTouched).some(touched => touched);
  }

  getTotalErrorCount(): number {
    return RegisterFieldValidationHelper.getAllErrors(this.fieldErrors).length;
  }

  getFormCompletionPercentage(): number {
    const fields = ['firstName', 'lastName', 'login', 'email', 'nickName', 'password', 'image'];
    const completedFields = fields.filter(field => {
      if (field === 'image') {
        return !!this.formData.image;
      }
      return !!(this.formData as any)[field];
    });
    
    return Math.round((completedFields.length / fields.length) * 100);
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
    
    Object.keys(this.fieldErrors).forEach(key => {
      this.fieldErrors[key] = [];
      this.fieldTouched[key] = false;
    });
  }

  ngOnDestroy() {
    Object.values(this.validationSubjects).forEach(subject => {
      subject.complete();
    });
  }
}