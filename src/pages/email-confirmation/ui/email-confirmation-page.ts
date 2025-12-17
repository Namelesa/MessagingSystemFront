import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { EmailService } from '../service/email-confirmation.service';
import { E2eeService } from '../../../features/keys-generator';
import { ToastService, ToastComponent } from '../../../shared/ui-elements';

@Component({
  selector: 'app-email-confirmation-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastComponent],
  templateUrl: './email-confirmation-page.html',
})
export class EmailConfirmedPageComponent {
  status = '';
  message = '';
  showMnemonicModal = false;
  showConfirmInputs = false;
  showPasswordInput = false;
  mnemonic = '';
  confirmWords: string[] = [];
  userConfirmInput: string[] = [];
  backupPassword = '';
  confirmPassword = '';
  passwordError: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private emailService: EmailService,
    private e2ee: E2eeService,
    public toastService: ToastService,
  ) {
    this.route.queryParams.subscribe(async params => {
      this.status = params['status'];
      this.message = params['message'] || '';

      if (this.status === 'success') {
        this.mnemonic = this.e2ee.generateMnemonic(256);
        this.prepareConfirmationWords();
        this.showMnemonicModal = true;
        this.showConfirmInputs = false;
        this.showPasswordInput = false;
      }
    });
  }

  prepareConfirmationWords() {
    const words = this.mnemonic.split(' ');
    const indexes = new Set<number>();
    while (indexes.size < 3) indexes.add(Math.floor(Math.random() * words.length));
    this.confirmWords = Array.from(indexes).map(i => words[i]);
  }

  async confirmMnemonic() {
    const isCorrect = this.confirmWords.every((w, i) => w === this.userConfirmInput[i]);
    if (!isCorrect) {
      this.toastService.show('❌ Seed phrase confirmation failed. Try again.', 'error');
      return;
    }

    this.showConfirmInputs = false;
    this.showPasswordInput = true;
  }

  async createBackup() {
    this.passwordError = null;

    if (this.backupPassword) {
      this.passwordError = this.validatePassword(this.backupPassword);
      if (this.passwordError) {
        this.toastService.show(`❌ ${this.passwordError}`, 'error');
        return;
      }

      if (this.backupPassword !== this.confirmPassword) {
        this.passwordError = 'Passwords do not match';
        this.toastService.show('❌ Passwords do not match', 'error');
        return;
      }
    }

    try {
      const seed32 = await this.e2ee.mnemonicToSeed32(this.mnemonic);
      const ed = await this.e2ee.keypairFromSeed32(seed32);
      const x = await this.e2ee.convertEdToX(ed.edPublicKey, ed.edPrivateKey);
      const publicKeyBase64 = this.e2ee.toBase64(x.xPublicKey);

      const nickName = this.route.snapshot.queryParamMap.get('nickName') || 'User';
      this.emailService.createUser({ nickName, key: publicKeyBase64 }).subscribe({
        error: err => {
          console.error('Error uploading key');
          this.toastService.show('❌ Error uploading key', 'error');
        },
      });

      await this.e2ee.createEncryptedBackupAndDownload(
        ed.edPrivateKey, 
        this.mnemonic, 
        this.backupPassword
      );

      this.showMnemonicModal = false;
      this.showPasswordInput = false;
      this.toastService.show('✅ Setup complete! You can now log in.', 'success');
    } catch (error) {
      console.error('Backup creation error:', error);
      this.toastService.show('❌ Failed to create backup', 'error');
    }
  }

  onMnemonicSaved() {
    this.showConfirmInputs = true;
  }

  async copyMnemonic() {
    try {
      await navigator.clipboard.writeText(this.mnemonic);
      this.toastService.show('✅ Seed phrase copied to clipboard!', 'success');
      this.showConfirmInputs = true;
    } catch {
      this.toastService.show('❌ Failed to copy. Please copy manually.', 'error');
    }
  }

  skipPassword() {
    this.backupPassword = '';
    this.confirmPassword = '';
    this.passwordError = null;
    this.createBackup();
  }

  validatePassword(password: string): string | null {
    if (!password) return 'Password is required';
  
    const pattern = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!_@])[a-zA-Z\d!_@]{5,115}$/;
    if (!pattern.test(password)) {
      return 'Password must be 5 to 115 characters and include at least one letter, one number, and one special character (!, _, @)';
    }
  
    return null;
  }

  onPasswordInput() {
    if (this.passwordError) {
      this.passwordError = null;
    }
  }
}