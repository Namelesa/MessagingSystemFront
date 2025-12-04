import { RegisterPageStore } from './register.store';
import { of, Subject } from 'rxjs';

describe('RegisterPageStore', () => {
  let store: RegisterPageStore;
  let mockApi: any;
  let mockToastService: any;
  let mockRouter: any;
  let formStoreMock: any;

  beforeEach(() => {
    mockApi = jasmine.createSpyObj('RegisterApi', ['submit']);
    mockToastService = jasmine.createSpyObj('ToastService', ['show']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    formStoreMock = {
      allErrors$: new Subject<any>(),
      isSubmitting$: new Subject<boolean>(),
      isFormValid$: new Subject<boolean>(),
      updateField: jasmine.createSpy('updateField'),
      updateImage: jasmine.createSpy('updateImage'),
      markAllTouched: jasmine.createSpy('markAllTouched'),
      submit: jasmine.createSpy('submit').and.returnValue(of('submitted')),
      reset: jasmine.createSpy('reset'),
    };

    store = new RegisterPageStore(mockApi, mockToastService, mockRouter);
    (store as any).store = formStoreMock;
  });

  it('should create the store', () => {
    expect(store).toBeTruthy();
  });

  it('should initialize formData and fieldErrors', () => {
    expect(store.formData.firstName).toBe('');
    expect(store.fieldErrors['firstName']).toEqual([]);
    expect(store.isSubmitting).toBe(false);
  });

  it('should update fields and passwordLength', () => {
    store.updateField('firstName', 'John');
    store.updateField('password', '12345');

    expect(store.formData.firstName).toBe('John');
    expect(store.formData.password).toBe('12345');
    expect(store.passwordLength).toBe(5);
    expect(formStoreMock.updateField).toHaveBeenCalledWith('firstName', 'John');
    expect(formStoreMock.updateField).toHaveBeenCalledWith('password', '12345');
  });

  it('should update image', () => {
    const file = new File([], 'photo.png');
    store.updateImage(file);
    expect(store.formData.image).toBe(file);
    expect(formStoreMock.updateImage).toHaveBeenCalledWith(file);
  });

  it('should return field errors', () => {
    store.fieldErrors['login'] = ['Required'];
    expect(store.getFieldErrors('login')).toEqual(['Required']);
    expect(store.getFieldErrors('nonexistent')).toEqual([]);
  });

  it('should call submit and mark all touched', (done) => {
    const result$ = store.submit();
    expect(formStoreMock.markAllTouched).toHaveBeenCalled();
    expect(formStoreMock.submit).toHaveBeenCalled();
    result$.subscribe(value => {
      expect(value).toBe('submitted');
      done();
    });
  });

  it('should handle registration result - invalid form', () => {
    store.handleRegisterResult({ message: 'Invalid form' });
    expect(mockToastService.show).toHaveBeenCalledWith(
      'Please fix form errors before submitting', 'error'
    );
  });

  it('should handle registration result - other errors', () => {
    store.handleRegisterResult({ message: 'Some error' });
    expect(mockToastService.show).toHaveBeenCalledWith(
      'Registration failed. Please try again.', 'error'
    );
  });

  it('should reset form correctly', () => {
    (store as any).resetForm();
    expect(store.formData.firstName).toBe('');
    expect(store.formData.password).toBe('');
    expect(formStoreMock.reset).toHaveBeenCalled();
  });

  it('should dispose subscriptions', () => {
    spyOn(store['subs'], 'unsubscribe');
    store.dispose();
    expect(store['subs'].unsubscribe).toHaveBeenCalled();
  });

  it('should handle registration result - successful registration', (done) => {
    jasmine.clock().install();
    
    store.handleRegisterResult({ message: 'User registered and need to confirm email' });
    
    expect(mockToastService.show).toHaveBeenCalledWith(
      'Registration successful. Please confirm email', 'success'
    );
    expect(store.formData.firstName).toBe('');
    expect(store.formData.email).toBe('');
    expect(formStoreMock.reset).toHaveBeenCalled();
    
    expect(mockRouter.navigate).not.toHaveBeenCalled();
    
    jasmine.clock().tick(3000);
    
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    
    jasmine.clock().uninstall();
    done();
  });
});