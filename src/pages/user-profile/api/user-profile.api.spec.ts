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

  const apiUrl = 'http://localhost:3000/api/users';

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

  describe('getUserProfile', () => {
    it('should get user profile successfully', (done) => {
      mockAuthService.getNickName.and.returnValue('John');

      service.getUserProfile().subscribe(result => {
        expect(result).toEqual(mockProfile);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=John`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBeTrue();
      req.flush(mockProfile);
    });

    it('should throw error if nickname is not set', () => {
      mockAuthService.getNickName.and.returnValue('');
      expect(() => service.getUserProfile()).toThrowError('Nickname is not set in AuthService');
    });

    it('should retry 3 times and then throw error', fakeAsync(() => {
      mockAuthService.getNickName.and.returnValue('John');
    
      let finalError: any;
      service.getUserProfile().subscribe({
        next: () => fail('Expected error, got success'),
        error: (err) => finalError = err
      });
    
      const req1 = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=John`);
      req1.flush('error', { status: 500, statusText: 'Server Error' });
    
      tick(300);
      const req2 = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=John`);
      req2.flush('error', { status: 500, statusText: 'Server Error' });
    
      tick(300);
      const req3 = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=John`);
      req3.flush('error', { status: 500, statusText: 'Server Error' });

      tick(300);
      const req4 = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=John`);
      req4.flush('error', { status: 500, statusText: 'Server Error' });
    
      expect(finalError.status).toBe(500);
    }));
  });

  describe('updateUserProfile', () => {
    it('should update user profile', (done) => {
      mockAuthService.getNickName.and.returnValue('John');
      const data: EditUserContract = { 
        firstName: 'Jane', 
        lastName: 'Doe', 
        login: 'jane.doe', 
        email: 'jane@test.com', 
        nickName: 'Jane' 
      };

      service.updateUserProfile(data).subscribe(result => {
        expect(result).toEqual(mockEditResult);
        done();
      });

      const req1 = httpMock.expectOne(`${apiUrl}/nickName/John`);
      expect(req1.request.method).toBe('PUT');
      expect(req1.request.body).toEqual({ newName: 'Jane' });
      expect(req1.request.withCredentials).toBeTrue();
      req1.flush(mockEditResult);

      const req2 = httpMock.expectOne(`${environment.apiUrl}user/edit?nickName=John`);
      expect(req2.request.method).toBe('PUT');
      expect(req2.request.body.has('firstName')).toBeTrue();
      expect(req2.request.body.has('lastName')).toBeTrue();
      expect(req2.request.withCredentials).toBeTrue();
      req2.flush(mockEditResult);
    });

    it('should throw error if nickname is not set', () => {
      mockAuthService.getNickName.and.returnValue('');
      const data: EditUserContract = { 
        firstName: 'Jane', 
        lastName: 'Doe', 
        login: 'jane.doe', 
        email: 'jane@test.com', 
        nickName: 'Jane' 
      };
      expect(() => service.updateUserProfile(data)).toThrowError('Nickname is not set in AuthService');
    });

    it('should retry updateUserProfile and then throw error', fakeAsync(() => {
      mockAuthService.getNickName.and.returnValue('John');
      const data: EditUserContract = { 
        firstName: 'Jane', 
        lastName: 'Doe', 
        login: 'jane', 
        email: 'jane@test.com', 
        nickName: 'Jane' 
      };
    
      let finalError: any;
      service.updateUserProfile(data).subscribe({
        next: () => fail('Expected error'),
        error: (err) => finalError = err
      });
    
      const url = `${apiUrl}/nickName/John`;
    
      httpMock.expectOne(url).flush('err', { status: 500, statusText: 'Server Error' });
      tick(300);
    
      httpMock.expectOne(url).flush('err', { status: 500, statusText: 'Server Error' });
      tick(300);
    
      httpMock.expectOne(url).flush('err', { status: 500, statusText: 'Server Error' });
      tick(300);
    
      httpMock.expectOne(url).flush('err', { status: 500, statusText: 'Server Error' });
      tick(100);
    
      expect(finalError.status).toBe(500);
    }));

    it('should handle error on second request', (done) => {
      mockAuthService.getNickName.and.returnValue('John');
      const data: EditUserContract = { 
        firstName: 'Jane', 
        lastName: 'Doe', 
        login: 'jane.doe', 
        email: 'jane@test.com', 
        nickName: 'Jane' 
      };

      service.updateUserProfile(data).subscribe({
        next: () => fail('Expected error'),
        error: (err) => {
          expect(err.status).toBe(500);
          done();
        }
      });

      const req1 = httpMock.expectOne(`${apiUrl}/nickName/John`);
      req1.flush(mockEditResult);

      const req2 = httpMock.expectOne(`${environment.apiUrl}user/edit?nickName=John`);
      req2.flush('Server Error', { status: 500, statusText: 'Server Error' });
    });
  });

  describe('deleteUserProfile', () => {
    it('should delete user profile', (done) => {
      mockAuthService.getNickName.and.returnValue('John');

      service.deleteUserProfile().subscribe(result => {
        expect(result).toEqual(mockEditResult);
        done();
      });

      const req1 = httpMock.expectOne(`${apiUrl}/nickName/John`);
      expect(req1.request.method).toBe('DELETE');
      expect(req1.request.withCredentials).toBeTrue();
      req1.flush(mockEditResult);

      const req2 = httpMock.expectOne(`${environment.apiUrl}user/delete?nickName=John`);
      expect(req2.request.method).toBe('DELETE');
      expect(req2.request.withCredentials).toBeTrue();
      req2.flush(mockEditResult);
    });

    it('should throw error if nickname is not set', () => {
      mockAuthService.getNickName.and.returnValue('');
      expect(() => service.deleteUserProfile()).toThrowError('Nickname is not set in AuthService');
    });

    it('should retry deleteUserProfile exactly 3 times and throw error', fakeAsync(() => {
      mockAuthService.getNickName.and.returnValue('John');
    
      let finalError: any;
      let successResult: AuthApiResult | undefined;
      
      service.deleteUserProfile().subscribe({
        next: (result) => successResult = result,
        error: (err) => finalError = err
      });
    
      const url = `${apiUrl}/nickName/John`;
    
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

    it('should handle error on second request', (done) => {
      mockAuthService.getNickName.and.returnValue('John');

      service.deleteUserProfile().subscribe({
        next: () => fail('Expected error'),
        error: (err) => {
          expect(err.status).toBe(404);
          done();
        }
      });

      const req1 = httpMock.expectOne(`${apiUrl}/nickName/John`);
      req1.flush(mockEditResult);

      const req2 = httpMock.expectOne(`${environment.apiUrl}user/delete?nickName=John`);
      req2.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('URL encoding', () => {
    it('should properly encode nickName in URLs', (done) => {
      const nickNameWithSpaces = 'John Doe';
      mockAuthService.getNickName.and.returnValue(nickNameWithSpaces);

      service.deleteUserProfile().subscribe();

      const req1 = httpMock.expectOne(`${apiUrl}/nickName/John%20Doe`);
      req1.flush(mockEditResult);

      const req2 = httpMock.expectOne(`${environment.apiUrl}user/delete?nickName=John%20Doe`);
      req2.flush(mockEditResult);
      
      done();
    });

    it('should properly encode special characters in nickName', (done) => {
      const nickNameWithSpecial = 'John+Doe&Test';
      mockAuthService.getNickName.and.returnValue(nickNameWithSpecial);

      service.updateUserProfile({
        firstName: 'John',
        lastName: 'Doe',
        login: 'john',
        email: 'john@test.com',
        nickName: 'NewName'
      }).subscribe();

      const req1 = httpMock.expectOne(`${apiUrl}/nickName/John%2BDoe%26Test`);
      req1.flush(mockEditResult);

      const req2 = httpMock.expectOne(`${environment.apiUrl}user/edit?nickName=John%2BDoe%26Test`);
      req2.flush(mockEditResult);
      
      done();
    });
  });
});