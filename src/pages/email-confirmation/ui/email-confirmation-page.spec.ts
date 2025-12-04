import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { EmailConfirmedPageComponent } from './email-confirmation-page';
import { ActivatedRoute } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { EmailService } from '../service/email-confirmation.service';
import { E2eeService } from '../../../features/keys-generator';
import { ToastService } from '../../../shared/ui-elements';

describe('EmailConfirmedPageComponent', () => {
  let component: EmailConfirmedPageComponent;
  let activatedRoute$: Subject<any>;

  let emailServiceMock: any;
  let e2eeMock: any;
  let toastServiceMock: any;

  beforeEach(() => {
    activatedRoute$ = new Subject();

    emailServiceMock = {
      createUser: jasmine.createSpy().and.returnValue(of({})),
    };

    e2eeMock = {
      generateMnemonic: jasmine.createSpy().and.returnValue('one two three four five six'),
      mnemonicToSeed32: jasmine.createSpy().and.resolveTo('seed32'),
      keypairFromSeed32: jasmine.createSpy().and.resolveTo({
        edPublicKey: 'pub',
        edPrivateKey: 'priv'
      }),
      convertEdToX: jasmine.createSpy().and.resolveTo({
        xPublicKey: new Uint8Array([1, 2, 3])
      }),
      toBase64: jasmine.createSpy().and.returnValue('base64Key'),
      createEncryptedBackupAndDownload: jasmine.createSpy().and.resolveTo(),
    };

    toastServiceMock = {
      show: jasmine.createSpy()
    };

    TestBed.configureTestingModule({
      imports: [EmailConfirmedPageComponent],
      providers: [
        { provide: EmailService, useValue: emailServiceMock },
        { provide: E2eeService, useValue: e2eeMock },
        { provide: ToastService, useValue: toastServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: activatedRoute$,
            snapshot: {
              queryParamMap: {
                get: () => 'Nick'
              }
            }
          }
        }
      ],
    });

    const fixture = TestBed.createComponent(EmailConfirmedPageComponent);
    component = fixture.componentInstance;
  });

  it('should process query params and generate mnemonic when status = success', fakeAsync(() => {
    activatedRoute$.next({ status: 'success', message: 'ok' });
    tick();

    expect(component.status).toBe('success');
    expect(component.message).toBe('ok');
    expect(e2eeMock.generateMnemonic).toHaveBeenCalled();
    expect(component.showMnemonicModal).toBeTrue();
  }));

  it('should prepare 3 confirmation words', () => {
    component.mnemonic = 'a b c d e f g';
    component.prepareConfirmationWords();
    expect(component.confirmWords.length).toBe(3);
  });

  it('should show error toast when mnemonic is wrong', () => {
    component.confirmWords = ['a', 'b', 'c'];
    component.userConfirmInput = ['x', 'y', 'z'];

    component.confirmMnemonic();

    expect(toastServiceMock.show).toHaveBeenCalled();
    expect(component.showPasswordInput).toBeFalse();
  });

  it('should proceed when mnemonic matches', () => {
    component.confirmWords = ['a', 'b', 'c'];
    component.userConfirmInput = ['a', 'b', 'c'];

    component.confirmMnemonic();

    expect(component.showPasswordInput).toBeTrue();
  });

  it('should reject password if invalid', fakeAsync(() => {
    component.mnemonic = 'one two three';
    component.backupPassword = '123';
    component.confirmPassword = '123';

    component.createBackup();
    tick();

    expect(toastServiceMock.show).toHaveBeenCalled();
    expect(component.passwordError).toBeTruthy();
  }));

  it('should reject password mismatch', fakeAsync(() => {
    component.backupPassword = 'Aa1!!';
    component.confirmPassword = 'Different';

    component.createBackup();
    tick();

    expect(component.passwordError).toBe('Passwords do not match');
    expect(toastServiceMock.show).toHaveBeenCalled();
  }));

  it('should show toast if createUser fails', fakeAsync(() => {
    emailServiceMock.createUser.and.returnValue(throwError(() => new Error()));

    component.backupPassword = 'Aa1!!';
    component.confirmPassword = 'Aa1!!';
    component.mnemonic = 'one two three';

    component.createBackup();
    tick();

    expect(toastServiceMock.show).toHaveBeenCalledWith('❌ Error uploading key', 'error');
  }));

  it('should succeed creating backup', fakeAsync(() => {
    component.backupPassword = 'Aa1!!';
    component.confirmPassword = 'Aa1!!';
    component.mnemonic = 'one two three';

    component.createBackup();
    tick();

    expect(toastServiceMock.show).toHaveBeenCalledWith(
      '✅ Setup complete! You can now log in.',
      'success'
    );
  }));

  it('should handle thrown error in backup creation', fakeAsync(() => {
    e2eeMock.mnemonicToSeed32.and.rejectWith('err');

    component.backupPassword = 'Aa1!!';
    component.confirmPassword = 'Aa1!!';
    component.mnemonic = 'one two three';

    component.createBackup();
    tick();

    expect(toastServiceMock.show).toHaveBeenCalledWith('❌ Failed to create backup', 'error');
  }));

  it('should enable confirm inputs', () => {
    component.onMnemonicSaved();
    expect(component.showConfirmInputs).toBeTrue();
  });

  it('should copy mnemonic successfully', fakeAsync(() => {
    spyOn(navigator.clipboard, 'writeText').and.resolveTo();

    component.mnemonic = 'abc';
    component.copyMnemonic();
    tick();

    expect(toastServiceMock.show).toHaveBeenCalledWith(
      '✅ Seed phrase copied to clipboard!',
      'success'
    );
  }));

  it('should show error if copy fails', fakeAsync(() => {
    spyOn(navigator.clipboard, 'writeText').and.rejectWith('err');

    component.mnemonic = 'abc';
    component.copyMnemonic();
    tick();

    expect(toastServiceMock.show).toHaveBeenCalledWith(
      '❌ Failed to copy. Please copy manually.',
      'error'
    );
  }));

  it('should clear password fields and call createBackup', fakeAsync(() => {
    const spyBackup = spyOn(component, 'createBackup').and.resolveTo();

    component.backupPassword = '123';
    component.confirmPassword = '345';

    component.skipPassword();
    tick();

    expect(component.backupPassword).toBe('');
    expect(component.confirmPassword).toBe('');
    expect(spyBackup).toHaveBeenCalled();
  }));

  it('should validate empty password', () => {
    expect(component.validatePassword('')).toBe('Password is required');
  });

  it('should validate wrong pattern', () => {
    expect(component.validatePassword('abc')).toContain('Password must be');
  });

  it('should pass valid password', () => {
    expect(component.validatePassword('Aa1!!')).toBeNull();
  });

  it('should clear passwordError', () => {
    component.passwordError = 'error';
    component.onPasswordInput();
    expect(component.passwordError).toBeNull();
  });

  it('should use default nickname "User" when nickName is missing', fakeAsync(() => {
    spyOn(component['route'].snapshot.queryParamMap, 'get').and.returnValue(null);
  
    component.backupPassword = 'Aa1!!';
    component.confirmPassword = 'Aa1!!';
    component.mnemonic = 'one two three';
  
    component.createBackup();
    tick();
  
    expect(emailServiceMock.createUser).toHaveBeenCalledWith({
      nickName: 'User',
      key: 'base64Key'
    });
  }));
  
  it('should set message to empty string when no message param provided', fakeAsync(() => {
    const fixture = TestBed.createComponent(EmailConfirmedPageComponent);
    const component = fixture.componentInstance;
  
    tick(); 
  
    activatedRoute$.next({ status: 'error' });
  
    tick();
  
    expect(component.status).toBe('error');
    expect(component.message).toBe('');
    expect(component.showMnemonicModal).toBeFalse();
  }));  
});
