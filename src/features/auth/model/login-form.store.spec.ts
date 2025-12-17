import { fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { LoginFormStore } from './login-form.store';
import { LoginApi } from '../api/login-user.api';
import { LoginFieldValidationHelper as V } from '../lib/login-validation';
import { AuthApiResult } from '../../../entities/user';

describe('LoginFormStore', () => {
  let store: LoginFormStore;
  let apiSpy: jasmine.SpyObj<LoginApi>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('LoginApi', ['loginUser']);
    store = new LoginFormStore(apiSpy);
  });

  it('should initialize with empty form and not submitting', () => {
    expect(store.getValue()).toEqual({ login: '', nickName: '', password: '' });
    store.isSubmitting$.subscribe(val => expect(val).toBeFalse());
  });

  it('should update field and mark touched', fakeAsync(() => {
    store.updateField('login', 'user1');
    tick(300);
    expect(store.getValue().login).toBe('user1');
  }));

  it('should mark fields as touched', () => {
    store.markTouched('login');
    store.markAllTouched();
    // @ts-ignore
    expect(store.touched.has('login')).toBeTrue();
    // @ts-ignore
    expect(store.touched.size).toBe(3);
  });

  it('should reset form', () => {
    store.updateField('login', 'user1');
    store.reset();
    expect(store.getValue()).toEqual({ login: '', nickName: '', password: '' });
    // @ts-ignore
    expect(store.touched.size).toBe(0);
  });

  it('should submit invalid form when errors exist', fakeAsync(() => {
    store.updateField('login', '');
    tick(300);

    let result: AuthApiResult | undefined;
    store.submit().subscribe(r => result = r);
    tick();

    expect(result).toBeDefined();
    expect(result!.message).toBe('Invalid form');
  }));

  it('should update fieldErrors$ when touched and invalid', fakeAsync(() => {
    spyOn(V, 'validateField').and.returnValue(['error']);
    store.markTouched('login');
    store.updateField('login', 'bad');

    let errors: string[] | undefined;
    store.fieldErrors$.login.subscribe(e => errors = e);

    tick(300); 
    expect(errors).toEqual(['error']);
  }));

  it('should correctly calculate isFormComplete$ and isFormValid$', fakeAsync(() => {
    let complete = false;
    let valid = false;

    store.isFormComplete$.subscribe(val => complete = val);
    store.isFormValid$.subscribe(val => valid = val);
    expect(complete).toBeFalse();
    expect(valid).toBeTrue(); 

    store.markAllTouched();
    spyOn(V, 'validateField').and.returnValue([]); 

    store.updateField('login', 'l');
    store.updateField('nickName', 'n');
    store.updateField('password', 'p');

    tick(300);
    expect(complete).toBeTrue();
    expect(valid).toBeTrue();
  }));

  it('should submit valid form and call API', fakeAsync(() => {
    spyOn(V, 'validateField').and.returnValue([]); 
    apiSpy.loginUser.and.returnValue(of({ message: 'ok' } as AuthApiResult));

    store.markAllTouched();
    store.updateField('login', 'l');
    store.updateField('nickName', 'n');
    store.updateField('password', 'p');

    tick(300);

    let submitting = false;
    let result: AuthApiResult | undefined;
    store.isSubmitting$.subscribe(val => submitting = val);

    store.submit().subscribe(r => result = r);
    tick();

    expect(submitting).toBeFalse();
    expect(result).toBeDefined();
    expect(result!.message).toBe('ok');
    expect(apiSpy.loginUser).toHaveBeenCalledWith({ login: 'l', nickName: 'n', password: 'p' });
  }));
});
