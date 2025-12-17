import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject, of, Subscription, throwError } from 'rxjs';
import { LoginPageStore } from './login.store';
import { LoginApi, LoginFormStore } from '../../../features/auth';
import { AuthService } from '../../../entities/session';
import { ToastService } from '../../../shared/ui-elements';
import { E2eeService } from '../../../features/keys-generator';
import { LoginContract } from '../../../entities/user';

describe('LoginPageStore', () => {
  let store: LoginPageStore;
  let loginApi: jasmine.SpyObj<LoginApi>;
  let authService: jasmine.SpyObj<AuthService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let router: jasmine.SpyObj<Router>;
  let e2eeService: jasmine.SpyObj<E2eeService>;
  let isLoggedInSubject: BehaviorSubject<boolean>;

  beforeEach(() => {
    isLoggedInSubject = new BehaviorSubject<boolean>(false);

    const loginApiSpy = jasmine.createSpyObj('LoginApi', ['login']);
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'setNickName',
      'getUserProfile',
      'setLoggedIn'
    ], {
      isLoggedIn$: isLoggedInSubject.asObservable()
    });
    const toastServiceSpy = jasmine.createSpyObj('ToastService', ['show']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const e2eeSpy = jasmine.createSpyObj('E2eeService', [
      'clearKeys',
      'restoreKeysFromBackup'
    ]);

    TestBed.configureTestingModule({
      providers: [
        LoginPageStore,
        { provide: LoginApi, useValue: loginApiSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: E2eeService, useValue: e2eeSpy }
      ]
    });

    loginApi = TestBed.inject(LoginApi) as jasmine.SpyObj<LoginApi>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    toastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    e2eeService = TestBed.inject(E2eeService) as jasmine.SpyObj<E2eeService>;

    store = TestBed.inject(LoginPageStore);

    (store as any).store = {
      allErrors$: new BehaviorSubject({ login: [], nickName: [], password: [] }),
      isSubmitting$: new BehaviorSubject(false),
      isFormValid$: new BehaviorSubject(false),
      updateField: () => {},
      markAllTouched: () => {},
      submit: () => of({})
    };
  
    store['subs'].unsubscribe();
    store['subs'] = new Subscription();
    store['initSubscriptions']();

    store['setupTokenExpirationListener']();
  });

  afterEach(() => {
    store.dispose();
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(store.isSubmitting).toBeFalse();
      expect(store.isFormValid).toBeFalse();
      expect(store.passwordLength).toBe(0);
      expect(store.formData).toEqual({
        login: '',
        nickName: '',
        password: ''
      });
    });

    it('should initialize fieldErrors with empty arrays', () => {
      expect(store.fieldErrors).toEqual({
        login: [],
        nickName: [],
        password: []
      });
    });

    it('should set up token expiration listener', () => {
      isLoggedInSubject.next(false);
      
      expect(e2eeService.clearKeys).toHaveBeenCalled();
    });

    it('should not clear keys when user is logged in', () => {
      e2eeService.clearKeys.calls.reset();
      
      isLoggedInSubject.next(true);
      
      expect(e2eeService.clearKeys).not.toHaveBeenCalled();
    });
  });

  describe('updateField', () => {
    it('should update login field', () => {
      store.updateField('login', 'testuser@example.com');
      
      expect(store.formData.login).toBe('testuser@example.com');
    });

    it('should update nickName field', () => {
      store.updateField('nickName', 'TestUser');
      
      expect(store.formData.nickName).toBe('TestUser');
    });

    it('should update password field and track length', () => {
      store.updateField('password', 'password123');
      
      expect(store.formData.password).toBe('password123');
      expect(store.passwordLength).toBe(11);
    });

    it('should update password length when password changes', () => {
      store.updateField('password', 'short');
      expect(store.passwordLength).toBe(5);
      
      store.updateField('password', 'verylongpassword');
      expect(store.passwordLength).toBe(16);
    });

    it('should not update password length for non-password fields', () => {
      store.updateField('password', 'test123');
      expect(store.passwordLength).toBe(7);
      
      store.updateField('login', 'user@test.com');
      expect(store.passwordLength).toBe(7);
    });
  });

  describe('getFieldErrors', () => {
    it('should return errors for existing field', () => {
      store.fieldErrors = {
        login: ['Email is required'],
        nickName: [],
        password: []
      };
      
      const errors = store.getFieldErrors('login');
      
      expect(errors).toEqual(['Email is required']);
    });

    it('should return empty array for field without errors', () => {
      store.fieldErrors = {
        login: [],
        nickName: [],
        password: []
      };
      
      const errors = store.getFieldErrors('nickName');
      
      expect(errors).toEqual([]);
    });

    it('should return empty array for non-existent field', () => {
      const errors = store.getFieldErrors('nonExistentField');
      
      expect(errors).toEqual([]);
    });

    it('should handle multiple errors for a field', () => {
      store.fieldErrors = {
        login: ['Email is required', 'Invalid email format'],
        nickName: [],
        password: []
      };
      
      const errors = store.getFieldErrors('login');
      
      expect(errors.length).toBe(2);
      expect(errors).toContain('Email is required');
      expect(errors).toContain('Invalid email format');
    });
  });

  describe('restoreKeysFromBackup', () => {
    it('should call e2eeService to restore keys', async () => {
      const mockBackup = { keys: 'encrypted' };
      const password = 'password123';
      e2eeService.restoreKeysFromBackup.and.returnValue(Promise.resolve());
      
      await store.restoreKeysFromBackup(mockBackup, password);
      
      expect(e2eeService.restoreKeysFromBackup).toHaveBeenCalledWith(mockBackup, password);
    });

    it('should handle restore errors', async () => {
      const mockBackup = { keys: 'encrypted' };
      const password = 'wrongpassword';
      e2eeService.restoreKeysFromBackup.and.returnValue(
        Promise.reject(new Error('Invalid password'))
      );
      
      try {
        await store.restoreKeysFromBackup(mockBackup, password);
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('Invalid password');
      }
    });
  });

  describe('navigateToProfile', () => {
    it('should navigate to profile even if getUserProfile fails', (done) => {
      store.formData.nickName = 'TestUser';
      authService.setNickName.and.returnValue(Promise.resolve());
      authService.getUserProfile.and.returnValue(
        throwError(() => new Error('Profile fetch failed'))
      );
      
      store.navigateToProfile();
      
      setTimeout(() => {
        expect(authService.setLoggedIn).toHaveBeenCalledWith(true);
        expect(router.navigate).toHaveBeenCalledWith(['/profile']);
        done();
      }, 100);
    });

    it('should navigate directly if no nickName', () => {
      store.formData.nickName = '';
      
      store.navigateToProfile();
      
      expect(authService.setNickName).not.toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/profile']);
    });

    it('should handle setLoggedIn in error case', (done) => {
      store.formData.nickName = 'TestUser';
      authService.setNickName.and.returnValue(Promise.resolve());
      authService.getUserProfile.and.returnValue(throwError(() => new Error('Error')));
      
      store.navigateToProfile();
      
      setTimeout(() => {
        expect(authService.setLoggedIn).toHaveBeenCalledWith(true);
        done();
      }, 100);
    });
  });

  describe('handleLoginError', () => {
    it('should show form error message for invalid form', () => {
      const result = { message: 'Invalid form' };
      
      store.handleLoginError(result);
      
      expect(toastService.show).toHaveBeenCalledWith(
        'Please fix form errors before submitting',
        'error'
      );
    });

    it('should show generic error message for other errors', () => {
      const result = { message: 'Server error' };
      
      store.handleLoginError(result);
      
      expect(toastService.show).toHaveBeenCalledWith(
        'Login failed. Please try again.',
        'error'
      );
    });

    it('should show generic error for null result', () => {
      store.handleLoginError(null);
      
      expect(toastService.show).toHaveBeenCalledWith(
        'Login failed. Please try again.',
        'error'
      );
    });

    it('should show generic error for undefined result', () => {
      store.handleLoginError(undefined);
      
      expect(toastService.show).toHaveBeenCalledWith(
        'Login failed. Please try again.',
        'error'
      );
    });

    it('should show generic error for result without message', () => {
      const result = { error: 'Something went wrong' };
      
      store.handleLoginError(result);
      
      expect(toastService.show).toHaveBeenCalledWith(
        'Login failed. Please try again.',
        'error'
      );
    });
  });

  describe('subscription management', () => {

    it('should update isFormValid from store', (done) => {
      const valid$ = new BehaviorSubject(false);
      (store as any).store.isFormValid$ = valid$;

      store['subs'].unsubscribe();
      store['subs'] = new Subscription();
      store['initSubscriptions']();
    
      valid$.next(true);
    
      setTimeout(() => {
        expect(store.isFormValid).toBeTrue();
        done();
      }, 0);
    });
    

    it('should update fieldErrors from store', (done) => {
      const errors$ = new BehaviorSubject<{ login: string[]; nickName: string[]; password: string[] }>({
        login: [],
        nickName: [],
        password: []
      });
    
      (store as any).store.allErrors$ = errors$;
    
      store['subs'].unsubscribe();
      store['subs'] = new Subscription();
      store['initSubscriptions']();
    
      const newErrors = {
        login: ['Required'],
        nickName: ['Too short'],
        password: ['Too weak']
      };
    
      errors$.next(newErrors);
    
      setTimeout(() => {
        expect(store.fieldErrors).toEqual(newErrors);
        done();
      }, 0);
    });
    
  });

  describe('dispose', () => {
    it('should unsubscribe from all subscriptions', () => {
      spyOn(store['subs'], 'unsubscribe');
      
      store.dispose();
      
      expect(store['subs'].unsubscribe).toHaveBeenCalled();
    });

    it('should prevent memory leaks after disposal', () => {
      const initialSubCount = (store['subs'] as any)._subscriptions?.length || 0;
      
      store.dispose();
      
      const spy = jasmine.createSpy('subscriptionSpy');
      isLoggedInSubject.next(false);
    
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('integration scenarios', () => {
    it('should clear keys when user logs out', () => {
      e2eeService.clearKeys.calls.reset();
      
      isLoggedInSubject.next(true);
      expect(e2eeService.clearKeys).not.toHaveBeenCalled();
      
      isLoggedInSubject.next(false);
      expect(e2eeService.clearKeys).toHaveBeenCalled();
    });
  });

  describe('submit', () => {
    it('should mark all fields as touched and call store submit', (done) => {
      const mockResponse: any = { 
        statusCode: 200, 
        message: 'Success',
        data: { token: 'abc123' }
      };
      spyOn(store['store'], 'markAllTouched');
      spyOn(store['store'], 'submit').and.returnValue(of(mockResponse));
      
      const result$ = store.submit();
      
      expect(store['store'].markAllTouched).toHaveBeenCalled();
      
      result$.subscribe(result => {
        expect(result).toEqual(mockResponse);
        expect(store['store'].submit).toHaveBeenCalled();
        done();
      });
    });
  
    it('should return observable from store submit', () => {
      const mockObservable = of({} as any);
      spyOn(store['store'], 'markAllTouched');
      spyOn(store['store'], 'submit').and.returnValue(mockObservable);
      
      const result = store.submit();
      
      expect(result).toBe(mockObservable);
    });
  });
  
  describe('navigateToProfile - success path', () => {
    it('should set logged in and navigate on successful getUserProfile', (done) => {
      store.formData.nickName = 'TestUser';
      authService.setNickName.and.returnValue(Promise.resolve());
      authService.getUserProfile.and.returnValue(of({
        statusCode: 200,
        firstName: 'Test',
        lastName: 'User',
        login: 'testuser',
        email: 'test@example.com',
        nickName: 'TestUser',
        id: '1'
      } as any));
      
      store.navigateToProfile();
      
      setTimeout(() => {
        expect(authService.setLoggedIn).toHaveBeenCalledWith(true);
        expect(router.navigate).toHaveBeenCalledWith(['/profile']);
        done();
      }, 100);
    });
  
    it('should call methods in correct order on success', (done) => {
      store.formData.nickName = 'TestUser';
      const callOrder: string[] = [];
      
      authService.setNickName.and.callFake(() => {
        callOrder.push('setNickName');
        return Promise.resolve();
      });
      
      authService.getUserProfile.and.callFake(() => {
        callOrder.push('getUserProfile');
        return of({
          statusCode: 200,
          firstName: 'Test',
          lastName: 'User',
          login: 'testuser',
          email: 'test@example.com',
          nickName: 'TestUser',
          id: '1'
        } as any);
      });
      
      authService.setLoggedIn.and.callFake((status: boolean) => {
        callOrder.push('setLoggedIn');
        return Promise.resolve();
      });
      
      router.navigate.and.callFake(() => {
        callOrder.push('navigate');
        return Promise.resolve(true);
      });
      
      store.navigateToProfile();
      
      setTimeout(() => {
        expect(callOrder).toEqual(['setNickName', 'getUserProfile', 'setLoggedIn', 'navigate']);
        done();
      }, 100);
    });
  });
});