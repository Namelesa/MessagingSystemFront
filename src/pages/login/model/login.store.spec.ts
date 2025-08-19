import { LoginPageStore } from './login.store';
import { of, throwError } from 'rxjs';

describe('LoginPageStore', () => {
  let store: LoginPageStore;
  let mockApi: any;
  let mockToastService: any;
  let mockRouter: any;
  let mockAuthService: any;

  beforeEach(() => {
    mockApi = jasmine.createSpyObj('LoginApi', ['submit']);
    mockToastService = jasmine.createSpyObj('ToastService', ['show']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockAuthService = jasmine.createSpyObj('AuthService', [
      'setNickName',
      'getUserProfile',
      'setLoggedIn'
    ]);

    mockAuthService.setNickName.and.returnValue(Promise.resolve());
    mockAuthService.getUserProfile.and.returnValue(of({}));

    store = new LoginPageStore(
      mockApi,
      mockToastService,
      mockRouter,
      mockAuthService
    );
  });

  it('should create the store', () => {
    expect(store).toBeTruthy();
  });

  it('should update form field and password length', () => {
    store.updateField('password', 'abc123');
    expect(store.formData.password).toBe('abc123');
    expect(store.passwordLength).toBe(6);
  });

  it('should return field errors', () => {
    store.fieldErrors = { login: ['Required'] };
    expect(store.getFieldErrors('login')).toEqual(['Required']);
    expect(store.getFieldErrors('nickName')).toEqual([]);
  });

  describe('handleLoginResult', () => {
    it('should handle successful login with nickname', async () => {
      store.formData.nickName = 'John';
      await store.handleLoginResult({ message: 'True' });

      expect(mockToastService.show).toHaveBeenCalledWith('Login successful', 'success');
      expect(mockAuthService.setNickName).toHaveBeenCalledWith('John');
      expect(mockAuthService.setLoggedIn).toHaveBeenCalledWith(true);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/profile']);
    });

    it('should handle successful login without nickname', async () => {
      store.formData.nickName = '';
      await store.handleLoginResult({ message: 'True' });

      expect(mockToastService.show).toHaveBeenCalledWith('Login successful', 'success');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/profile']);
    });

    it('should handle invalid form error', () => {
      store.handleLoginResult({ message: 'Invalid form' });
      expect(mockToastService.show).toHaveBeenCalledWith(
        'Please fix form errors before submitting',
        'error'
      );
    });

    it('should handle generic login failure', () => {
      store.handleLoginResult({ message: 'Something else' });
      expect(mockToastService.show).toHaveBeenCalledWith(
        'Login failed. Please try again.',
        'error'
      );
    });
  });

  it('should dispose subscriptions', () => {
    spyOn((store as any).subs, 'unsubscribe');
    store.dispose();
    expect((store as any).subs.unsubscribe).toHaveBeenCalled();
  });

  it('should call submit on store when submit() is invoked', () => {
    const mockSubmit$ = of('submitted');
    spyOn((store as any).store, 'submit').and.returnValue(mockSubmit$);
    spyOn((store as any).store, 'markAllTouched');
  
    const result$ = store.submit();
  
    expect((store as any).store.markAllTouched).toHaveBeenCalled();
    expect((store as any).store.submit).toHaveBeenCalled();
    result$.subscribe(value => {
      expect(value).toBe('submitted');
    });
  });
  
  it('should handle login when getUserProfile errors', async () => {
    store.formData.nickName = 'John';
    mockAuthService.getUserProfile.and.returnValue(throwError(() => new Error('fail')));
  
    await store.handleLoginResult({ message: 'True' });
  
    expect(mockToastService.show).toHaveBeenCalledWith('Login successful', 'success');
    expect(mockAuthService.setNickName).toHaveBeenCalledWith('John');
    expect(mockAuthService.setLoggedIn).toHaveBeenCalledWith(true);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/profile']);
  });
});
