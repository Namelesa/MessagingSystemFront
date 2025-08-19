import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserProfileApi } from './user-profile.api';
import { AuthService, ProfileApiResult } from '../../../entities/session';
import { EditUserContract, AuthApiResult } from '../../../entities/user';
import { environment } from '../../../shared/api-urls';

describe('UserProfileApi', () => {
  let service: UserProfileApi;
  let httpMock: HttpTestingController;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  const mockProfile: ProfileApiResult = {
    statusCode: '200',
    firstName: 'John',
    lastName: 'Doe',
    login: 'johndoe',
    email: 'john@test.com',
    nickName: 'John',
    image: undefined,
  };

  const mockEditResult: AuthApiResult = {
    statusCode: '200',
    message: 'Updated',
  };

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['getNickName']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        UserProfileApi,
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    service = TestBed.inject(UserProfileApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getUserProfile with retry', () => {
    it('should retry 3 times and then throw error', fakeAsync(() => {
        mockAuthService.getNickName.and.returnValue('John');
      
        let finalError: any;
        service.getUserProfile().subscribe({
          next: () => fail('Expected error, got success'),
          error: (err) => finalError = err
        });
      
        const req1 = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=John`);
        req1.flush('error', { status: 500, statusText: 'Server Error' });
      
        tick(1000);
        const req2 = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=John`);
        req2.flush('error', { status: 500, statusText: 'Server Error' });
      
        tick(1000);
        const req3 = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=John`);
        req3.flush('error', { status: 500, statusText: 'Server Error' });

        tick(1000);
        const req4 = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=John`);
        req4.flush('error', { status: 500, statusText: 'Server Error' });
      
        expect(finalError.status).toBe(500);
      }));
  });

  describe('updateUserProfile', () => {
    it('should update user profile', (done) => {
      mockAuthService.getNickName.and.returnValue('John');
      const data: EditUserContract = { firstName: 'Jane', lastName: 'Doe', login: 'jane.doe', email: 'jane@test.com', nickName: 'Jane' };

      service.updateUserProfile(data).subscribe(result => {
        expect(result).toEqual(mockEditResult);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}user/edit?nickName=John`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.has('firstName')).toBeTrue();
      expect(req.request.body.has('lastName')).toBeTrue();
      req.flush(mockEditResult);
    });

    it('should throw error if nickname is not set', () => {
      mockAuthService.getNickName.and.returnValue('');
      const data: EditUserContract = { firstName: 'Jane', lastName: 'Doe', login: 'jane.doe', email: 'jane@test.com', nickName: 'Jane' };
      expect(() => service.updateUserProfile(data)).toThrowError('Nickname is not set in AuthService');
    });
  });

  describe('deleteUserProfile', () => {
    it('should delete user profile', (done) => {
      mockAuthService.getNickName.and.returnValue('John');

      service.deleteUserProfile().subscribe(result => {
        expect(result).toEqual(mockEditResult);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}user/delete?nickName=John`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockEditResult);
    });

    it('should throw error if nickname is not set', () => {
      mockAuthService.getNickName.and.returnValue('');
      expect(() => service.deleteUserProfile()).toThrowError('Nickname is not set in AuthService');
    });
  });

  it('should retry updateUserProfile and then throw error', fakeAsync(() => {
    mockAuthService.getNickName.and.returnValue('John');
    const data: EditUserContract = { firstName: 'Jane', lastName: 'Doe', login: 'jane', email: 'jane@test.com', nickName: 'Jane' };
  
    let finalError: any;
    service.updateUserProfile(data).subscribe({
      next: () => fail('Expected error'),
      error: (err) => finalError = err
    });
  
    const url = `${environment.apiUrl}user/edit?nickName=John`;
  
    httpMock.expectOne(url).flush('err', { status: 500, statusText: 'Server Error' });
    tick(1000);
  
    httpMock.expectOne(url).flush('err', { status: 500, statusText: 'Server Error' });
    tick(1000);
  
    httpMock.expectOne(url).flush('err', { status: 500, statusText: 'Server Error' });
    tick(1000);
  
    httpMock.expectOne(url).flush('err', { status: 500, statusText: 'Server Error' });
  
    expect(finalError.status).toBe(500);
  }));
  

  it('should throw error if nickname is not set in getUserProfile', () => {
    mockAuthService.getNickName.and.returnValue('');
    expect(() => service.getUserProfile()).toThrowError('Nickname is not set in AuthService');
  });
  
  it('should retry deleteUserProfile exactly 3 times and throw error from scan', fakeAsync(() => {
    mockAuthService.getNickName.and.returnValue('John');
  
    let finalError: any;
    let successResult: AuthApiResult | undefined;
    
    service.deleteUserProfile().subscribe({
      next: (result) => successResult = result,
      error: (err) => finalError = err
    });
  
    const url = `${environment.apiUrl}user/delete?nickName=John`;
  
    httpMock.expectOne(url).flush('Server Error', { status: 500, statusText: 'Server Error' });
    tick(300);
  
    httpMock.expectOne(url).flush('Server Error', { status: 500, statusText: 'Server Error' });
    tick(300);
  
    httpMock.expectOne(url).flush('Server Error', { status: 500, statusText: 'Server Error' });
    tick(300);
  
    httpMock.expectOne(url).flush('Server Error', { status: 500, statusText: 'Server Error' });
    tick(100);
  
    expect(successResult).toBeUndefined();
    expect(finalError).toBeTruthy();
    expect(finalError.status).toBe(500);
  }));
    
});
