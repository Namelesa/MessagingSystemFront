import { fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { RegisterFormStore } from './register-form.store';
import { RegisterApi } from '../api/register-user.api';
import { RegisterFieldValidationHelper as V } from '../lib/register-validation';
import { AuthApiResult } from '../../../entities/user';

describe('RegisterFormStore', () => {
  let store: RegisterFormStore;
  let apiSpy: jasmine.SpyObj<RegisterApi>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('RegisterApi', ['registerUser']);
    store = new RegisterFormStore(apiSpy);
  });

  it('should initialize with empty form and not submitting', () => {
    expect(store.getValue()).toEqual({
      firstName: '', lastName: '', email: '', login: '', nickName: '', password: '', image: undefined
    });
    store.isSubmitting$.subscribe(val => expect(val).toBeFalse());
  });

  it('should update string fields and mark touched', fakeAsync(() => {
    store.updateField('firstName', 'John');
    tick(300);
    expect(store.getValue().firstName).toBe('John');
  }));

  it('should update image and mark touched', () => {
    const file = new File(['dummy'], 'photo.png', { type: 'image/png' });
    store.updateImage(file);
    expect(store.getValue().image).toBe(file);
    // @ts-ignore
    expect(store.touched.has('image')).toBeTrue();
  });

  it('should mark fields as touched', () => {
    store.markTouched('login');
    store.markAllTouched();
    // @ts-ignore
    expect(store.touched.has('login')).toBeTrue();
    // @ts-ignore
    expect(store.touched.size).toBe(7);
  });

  it('should reset form', () => {
    store.updateField('firstName', 'John');
    store.updateImage(new File([], 'x.png'));
    store.reset();
    expect(store.getValue()).toEqual({
      firstName: '', lastName: '', email: '', login: '', nickName: '', password: '', image: undefined
    });
    // @ts-ignore
    expect(store.touched.size).toBe(0);
  });

  it('should submit invalid form when errors exist', fakeAsync(() => {
    store.updateField('firstName', '');
    tick(300);

    let result: AuthApiResult | undefined;
    store.submit().subscribe(r => result = r);
    tick();

    expect(result).toBeDefined();
    expect(result!.message).toBe('Invalid form');
  }));

  it('should update fieldErrors$ when touched and invalid', fakeAsync(() => {
    spyOn(V, 'validateField').and.returnValue(['error']);
    store.markTouched('firstName');
    store.updateField('firstName', 'bad');

    let errors: string[] | undefined;
    store.fieldErrors$.firstName.subscribe(e => errors = e);

    tick(300);
    expect(errors).toEqual(['error']);
  }));

  it('should update imageErrors$ when touched and invalid', () => {
    spyOn(V, 'validateImage').and.returnValue(['invalid']);
    store.markTouched('image');
    store.updateImage(new File([], 'x.png'));

    let errors: string[] | undefined;
    store.fieldErrors$.image.subscribe(e => errors = e);

    expect(errors).toEqual(['invalid']);
  });

  it('should correctly calculate isFormComplete$ and isFormValid$', fakeAsync(() => {
    let complete = false;
    let valid = false;

    store.isFormComplete$.subscribe(val => complete = val);
    store.isFormValid$.subscribe(val => valid = val);

    expect(complete).toBeFalse();
    expect(valid).toBeTrue();

    store.markAllTouched();
    spyOn(V, 'validateField').and.returnValue([]);
    spyOn(V, 'validateImage').and.returnValue([]);

    store.updateField('firstName', 'John');
    store.updateField('lastName', 'Doe');
    store.updateField('login', 'jdoe');
    store.updateField('email', 'j@x.com');
    store.updateField('nickName', 'jd');
    store.updateField('password', '123');
    store.updateImage(new File([], 'img.png'));

    tick(300);
    expect(complete).toBeTrue();
    expect(valid).toBeTrue();
  }));

  it('should submit valid form and call API', fakeAsync(() => {
    spyOn(V, 'validateField').and.returnValue([]);
    spyOn(V, 'validateImage').and.returnValue([]);
    apiSpy.registerUser.and.returnValue(of({ message: 'ok' } as AuthApiResult));

    store.markAllTouched();
    store.updateField('firstName', 'John');
    store.updateField('lastName', 'Doe');
    store.updateField('login', 'jdoe');
    store.updateField('email', 'j@x.com');
    store.updateField('nickName', 'jd');
    store.updateField('password', '123');
    store.updateImage(new File([], 'img.png'));

    tick(300);

    let submitting = false;
    let result: AuthApiResult | undefined;
    store.isSubmitting$.subscribe(val => submitting = val);

    store.submit().subscribe(r => result = r);
    tick();

    expect(submitting).toBeFalse();
    expect(result).toBeDefined();
    expect(result!.message).toBe('ok');
    expect(apiSpy.registerUser).toHaveBeenCalledWith({
      firstName: 'John',
      lastName: 'Doe',
      login: 'jdoe',
      email: 'j@x.com',
      nickName: 'jd',
      password: '123',
      image: jasmine.any(File)
    });
  }));
});
