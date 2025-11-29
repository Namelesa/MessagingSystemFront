import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, Eye, EyeOff, Upload } from 'lucide-angular';
import { AuthPageLayoutComponent } from '../../../widgets/auth-layout';
import { ButtonComponent, InputComponent, ToastComponent } from '../../../shared/ui-elements';
import { LoginPageStore } from '../model/login.store';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    AuthPageLayoutComponent,
    ButtonComponent,
    InputComponent,
    CommonModule,
    FormsModule,
    LucideAngularModule,
    ToastComponent,
    TranslateModule
  ],
  providers: [LoginPageStore],
  templateUrl: './login-page.component.html',
})
export class LoginPageComponent implements OnDestroy {
  isPasswordVisible = false;
  showBackupModal = false;
  backupPassword = '';
  selectedFile: File | null = null;
  
  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;
  readonly UploadIcon = Upload;

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

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
    }
  }

  onSubmit() {
    this.store.submit().subscribe({
      next: (result) => {
        if (result?.message === 'True') {
          this.showBackupModal = true;
        } else {
          this.store.handleLoginError(result);
        }
      },
      error: () => {
        this.store.toastService.show('An error occurred. Please try again later.', 'error');
      }
    });
  }

  async confirmBackup() {
    if (!this.selectedFile) {
      this.store.toastService.show('Please select a backup file', 'error');
      return;
    }

    try {
      const fileContent = await this.selectedFile.text();
      const backupJson = JSON.parse(fileContent);
      
      await this.store.restoreKeysFromBackup(backupJson, this.backupPassword);
      
      this.showBackupModal = false;
      this.store.toastService.show('Login successful', 'success');
      this.store.navigateToProfile();
    } catch (error) {
      console.error('Backup restore error:', error);
      this.store.toastService.show('Invalid backup file or password', 'error');
    }
  }

  ngOnDestroy(): void {
    this.store.dispose();
  }
}
