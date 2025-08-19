import { ProfilePageStore } from './user-profile.store';
import { UserProfileApi } from '../api/user-profile.api';
import { ToastService } from '../../../shared/ui-elements';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthApiResult, EditUserContract } from '../../../entities/user';
import { ProfileApiResult } from '../../../entities/session';
import { HttpErrorResponse } from '@angular/common/http';
import { validateSingleField } from './validate-update';

describe('ProfilePageStore', () => {
  let store: ProfilePageStore;
  let mockApi: jasmine.SpyObj<UserProfileApi>;
  let mockToast: jasmine.SpyObj<ToastService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockProfile: ProfileApiResult = {
    firstName: 'John',
    lastName: 'Doe',
    login: 'johndoe',
    email: 'john@example.com',
    nickName: 'Johnny',
    image: 'avatar.png',
    statusCode: '200'
  };

  beforeEach(() => {
    mockApi = jasmine.createSpyObj('UserProfileApi', ['getUserProfile', 'updateUserProfile', 'deleteUserProfile']);
    mockToast = jasmine.createSpyObj('ToastService', ['show']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    mockApi.getUserProfile.and.returnValue(of(mockProfile));

    store = new ProfilePageStore(mockApi, mockToast, mockRouter);
  });

  afterEach(() => {
    store.dispose();
  });

  it('should load user profile on init', () => {
    expect(store.userProfile).toEqual(mockProfile);
    expect(store.editableProfile).toEqual(mockProfile);
    expect(store.isLoading).toBeFalse();
  });

  it('should handle load profile error', () => {
    const errorResponse = new HttpErrorResponse({ error: 'fail', status: 500 });
    mockApi.getUserProfile.and.returnValue(throwError(() => errorResponse));
    store = new ProfilePageStore(mockApi, mockToast, mockRouter);

    expect(store.hasError).toBeTrue();
    expect(store.isLoading).toBeFalse();
    expect(mockToast.show).toHaveBeenCalledWith('Can not load user profile', 'error');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should update field and mark as touched', () => {
    store.updateField('firstName', 'Jane');
    expect(store.editableProfile.firstName).toBe('Jane');
    expect(store.touchedFields['firstName']).toBeTrue();
  });

  it('should validate field on blur', () => {
    store.editableProfile.firstName = '';
    store.onFieldBlur('firstName');
    expect(store.touchedFields['firstName']).toBeTrue();
    expect(store.fieldErrors['firstName'].length).toBeGreaterThan(0);
  });

  it('should toggle edit mode and reset validation', () => {
    store.toggleEdit();
    expect(store.isEditing).toBeTrue();
    expect(store.editableProfile).toEqual(store.userProfile || {});
    expect(Object.values(store.touchedFields).every(v => v === false)).toBeTrue();
    expect(Object.values(store.fieldErrors).every(arr => arr.length === 0)).toBeTrue();
  });

  it('should save changes and show toast for validation errors', () => {
    store.editableProfile.firstName = '';
    store.touchedFields['firstName'] = true;

    store.saveChanges();

    expect(mockToast.show).toHaveBeenCalledWith('Please fix validation errors', 'error');
  });

  it('should call API on saveChanges with valid data', (done) => {
    const apiResponse: AuthApiResult = { statusCode: '200', message: 'Updated successfully' };
    mockApi.updateUserProfile.and.returnValue(of(apiResponse));
  
    store.editableProfile = {
      firstName: 'John',
      lastName: 'Doe',
      login: 'johndoe@1234',
      email: 'john@example.com',
      nickName: '@Johnny1234',
      image: 'Image.png'
    };
  
    Object.keys(store.touchedFields).forEach(key => store.touchedFields[key] = true);
  
    store.saveChanges();
  
    setTimeout(() => {
      expect(mockToast.show).toHaveBeenCalledWith('Updated successfully', 'success');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
      done();
    }, 1100);
  });
  
  it('should handle API error on saveChanges', (done) => {
    const errorResponse = new HttpErrorResponse({ error: { message: 'API error' }, status: 500 });
    mockApi.updateUserProfile.and.returnValue(throwError(() => errorResponse));
  
    store.editableProfile = {
      firstName: 'John',
      lastName: 'Doe',
      login: 'johndoe@123',
      email: 'john@example.com',
      nickName: '@Johnny123',
      image: ''
    };
  
    Object.keys(store.touchedFields).forEach(key => store.touchedFields[key] = true);
  
    store.saveChanges();
  
    setTimeout(() => {
      expect(mockToast.show).toHaveBeenCalledWith('API error', 'error');
      done();
    }, 100);
  });
  
  

  it('should update avatar and set touched field', (done) => {
    const file = new File(['data'], 'avatar.png', { type: 'image/png' });
    const event = { target: { files: [file] } } as unknown as Event;

    store.updateAvatar(event);

    setTimeout(() => {
      expect(store.selectedAvatarFile).toBe(file);
      expect(store.touchedFields['imageFile']).toBeTrue();
      expect(store.editableProfile.image).toContain('data:image/png;base64');
      done();
    }, 100);
  });

  it('should show and cancel delete modal', () => {
    store.showDeleteConfirmation();
    expect(store.showDeleteModal).toBeTrue();

    store.cancelDelete();
    expect(store.showDeleteModal).toBeFalse();
  });

  it('should call API on confirmDelete', (done) => {
    const apiResponse: AuthApiResult = { statusCode: '200', message: 'Deleted successfully' };
    mockApi.deleteUserProfile.and.returnValue(of(apiResponse));

    store.confirmDelete();

    setTimeout(() => {
      expect(mockToast.show).toHaveBeenCalledWith('Deleted successfully', 'success');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
      done();
    }, 1100);
  });

  it('should handle API error on confirmDelete', () => {
    const errorResponse = new HttpErrorResponse({ error: { message: 'Delete error' }, status: 500 });
    mockApi.deleteUserProfile.and.returnValue(throwError(() => errorResponse));

    store.confirmDelete();
    expect(mockToast.show).toHaveBeenCalledWith('Delete error', 'error');
  });

  it('should return correct field errors and validation status', () => {
    store.fieldErrors['firstName'] = ['Error'];
    store.touchedFields['firstName'] = true;

    expect(store.getFieldErrors('firstName')).toEqual(['Error']);
    expect(store.hasFieldError('firstName')).toBeTrue();
    expect(store.isFieldValid('firstName')).toBeFalse();
  });

  it('should unsubscribe and complete subjects on dispose', () => {
    const spyComplete = jasmine.createSpy();
    Object.values(store['validationSubjects']).forEach(subj => subj.subscribe({ complete: spyComplete }));
    store.dispose();
    expect(store['subs'].closed).toBeTrue();
  });

  it('should reset editableProfile, selectedAvatarFile and validation state on cancelEdit', () => {
    store.isEditing = true;
    store.selectedAvatarFile = new File(['data'], 'avatar.png', { type: 'image/png' });
    store.editableProfile.firstName = 'Changed';
  
    store.cancelEdit();
  
    expect(store.isEditing).toBeFalse();
    expect(store.editableProfile).toEqual(store.userProfile || {});
    expect(store.selectedAvatarFile).toBeNull();
    expect(Object.values(store.touchedFields).every(v => v === false)).toBeTrue();
    expect(Object.values(store.fieldErrors).every(arr => arr.length === 0)).toBeTrue();
  });
  
  it('should log unassigned errors in distributeErrors', () => {
    spyOn(console, 'warn');
  
    (store as any).distributeErrors(['Some unknown error']);
  
    expect(console.warn).toHaveBeenCalledWith('Unassigned error:', 'Some unknown error');
  });

  it('should validate field when validationSubjects emit value', (done) => {
    store.touchedFields['firstName'] = true;
  
    store['validationSubjects']['firstName'].next('NewName');
  
    setTimeout(() => {
      expect(store.fieldErrors['firstName']).toEqual(
        jasmine.arrayContaining(validateSingleField('firstName', 'NewName'))
      );
      done();
    }, 350);
  });
  
  it('should not validate field if it is not touched', (done) => {
    store['validationSubjects']['firstName'].next('NewName');
  
    setTimeout(() => {
      expect(store.fieldErrors['firstName']).toEqual([]); 
      done();
    }, 350);
  });

  it('should prepare formData with empty fields and no avatar', () => {
    store.editableProfile = {};
    store.selectedAvatarFile = null;
  
    store.saveChanges();
  
    expect(store.formData).toEqual({
      firstName: '',
      lastName: '',
      login: '',
      email: '',
      nickName: '',
      imageFile: undefined
    });
  });  

  it('should cancel delete modal', () => {
    store.showDeleteModal = true;
    store.cancelDelete();
    expect(store.showDeleteModal).toBeFalse();
  });
  
  it('should return field errors or empty array', () => {
    store.fieldErrors['firstName'] = ['Error'];
    expect(store.getFieldErrors('firstName')).toEqual(['Error']);
    expect(store.getFieldErrors('nonExistent')).toEqual([]);
  });
  
  it('should show default error message when API error has no message', (done) => {
    const errorResponse = new HttpErrorResponse({ error: null, status: 500 });
    mockApi.updateUserProfile.and.returnValue(throwError(() => errorResponse));

    store.editableProfile = {
      firstName: 'John',
      lastName: 'Doe',
      login: 'johndoe@123',
      email: 'john@example.com',
      nickName: '@Johnny123',
      image: 'avatar.png'
    };

    Object.keys(store.touchedFields).forEach(key => store.touchedFields[key] = true);

    store.saveChanges();
  
    setTimeout(() => {
      expect(mockToast.show).toHaveBeenCalledWith('Can not update profile', 'error');
      done();
    }, 100);
  });  

  it('should show default error message when delete API error has no message', () => {
    const errorResponse = new HttpErrorResponse({ error: null, status: 500 });
    mockApi.deleteUserProfile.and.returnValue(throwError(() => errorResponse));
  
    store.confirmDelete();
  
    expect(mockToast.show).toHaveBeenCalledWith('Can not delete profile', 'error');
  });  
});