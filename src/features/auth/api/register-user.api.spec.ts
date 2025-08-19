import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { RegisterApi } from './register-user.api';
import { AuthApiResult, RegisterContract } from '../../../entities/user';
import { environment } from '../../../shared/api-urls';
import { fakeAsync, tick, flush } from '@angular/core/testing';

describe('RegisterApi', () => {
  let service: RegisterApi;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}auth/register`;

  const mockRegisterData: RegisterContract = {
    firstName: 'John',
    lastName: 'Doe',
    login: 'johndoe',
    email: 'test@example.com',
    nickName: 'johnny',
    password: 'password123',
    image: undefined
  };

  const mockSuccessResponse: AuthApiResult = {
    statusCode: '200',
    message: 'Registration successful'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RegisterApi]
    });

    service = TestBed.inject(RegisterApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('registerUser', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should send POST request to correct URL with FormData', () => {
      // Act
      service.registerUser(mockRegisterData).subscribe();

      // Assert
      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.url).toBe(apiUrl);
      expect(req.request.body).toBeInstanceOf(FormData);

      const formData = req.request.body as FormData;
      expect(formData.get('email')).toBe(mockRegisterData.email);
      expect(formData.get('password')).toBe(mockRegisterData.password);
      expect(formData.get('firstName')).toBe(mockRegisterData.firstName);
      expect(formData.get('lastName')).toBe(mockRegisterData.lastName);
      expect(formData.get('login')).toBe(mockRegisterData.login);
      expect(formData.get('nickName')).toBe(mockRegisterData.nickName);

      req.flush(mockSuccessResponse);
    });

    it('should return successful response when registration succeeds', () => {
      // Act & Assert
      service.registerUser(mockRegisterData).subscribe({
        next: (response) => {
          expect(response).toEqual(mockSuccessResponse);
          expect(response.statusCode).toBe('200');
          expect(response.message).toBe('Registration successful');
        }
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush(mockSuccessResponse);
    });

    it('should exclude undefined and null values from FormData', () => {
      // Arrange
      const dataWithNulls: RegisterContract = {
        firstName: 'John',
        lastName: null as any,
        login: 'johndoe',
        email: 'test@example.com',
        nickName: undefined as any,
        password: 'password123',
        image: undefined
      };

      // Act
      service.registerUser(dataWithNulls).subscribe();

      // Assert
      const req = httpMock.expectOne(apiUrl);
      const formData = req.request.body as FormData;
      
      expect(formData.get('email')).toBe('test@example.com');
      expect(formData.get('password')).toBe('password123');
      expect(formData.get('firstName')).toBe('John');
      expect(formData.get('login')).toBe('johndoe');
      expect(formData.get('lastName')).toBeNull(); 
      expect(formData.get('nickName')).toBeNull(); 
      expect(formData.get('image')).toBeNull(); 

      req.flush(mockSuccessResponse);
    });

    it('should handle empty string values in FormData', () => {
      // Arrange
      const dataWithEmptyStrings: RegisterContract = {
        firstName: '',
        lastName: 'Doe',
        login: 'johndoe',
        email: 'test@example.com',
        nickName: '',
        password: 'password123',
        image: undefined
      };

      // Act
      service.registerUser(dataWithEmptyStrings).subscribe();

      // Assert
      const req = httpMock.expectOne(apiUrl);
      const formData = req.request.body as FormData;
      
      expect(formData.get('email')).toBe('test@example.com');
      expect(formData.get('firstName')).toBe('');
      expect(formData.get('nickName')).toBe(''); 
      expect(formData.get('lastName')).toBe('Doe');

      req.flush(mockSuccessResponse);
    });

    it('should handle boolean and number values in FormData', () => {
      // Arrange
      const dataWithDifferentTypes = {
        email: 'test@example.com',
        password: 'password123',
        age: 25,
        isActive: true,
        score: 0,
        isVerified: false
      };

      // Act
      service.registerUser(dataWithDifferentTypes as any).subscribe();

      // Assert
      const req = httpMock.expectOne(apiUrl);
      const formData = req.request.body as FormData;
      
      expect(formData.get('email')).toBe('test@example.com');
      expect(formData.get('age')).toBe('25'); 
      expect(formData.get('isActive')).toBe('true'); 
      expect(formData.get('score')).toBe('0'); 
      expect(formData.get('isVerified')).toBe('false');

      req.flush(mockSuccessResponse);
    });

    it('should retry failed requests up to 3 times with delay', fakeAsync(() => {
      let responseCount = 0;
      const errorResponse = new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Server Error'
      });

      // Act
      service.registerUser(mockRegisterData).subscribe({
        next: (response) => {
          expect(response).toEqual(mockSuccessResponse);
          expect(responseCount).toBe(3); 
        },
        error: fail
      });

      // Assert
      let req = httpMock.expectOne(apiUrl);
      expect(req.request.body).toBeInstanceOf(FormData);
      req.error(new ErrorEvent('Network error'), errorResponse);
      responseCount++;

      tick(300);

      // Assert
      req = httpMock.expectOne(apiUrl);
      expect(req.request.body).toBeInstanceOf(FormData);
      req.error(new ErrorEvent('Network error'), errorResponse);
      responseCount++;

      tick(300);

      // Assert
      req = httpMock.expectOne(apiUrl);
      expect(req.request.body).toBeInstanceOf(FormData);
      req.error(new ErrorEvent('Network error'), errorResponse);
      responseCount++;

      tick(300);

      // Assert
      req = httpMock.expectOne(apiUrl);
      expect(req.request.body).toBeInstanceOf(FormData);
      req.flush(mockSuccessResponse);

      flush();
    }));

    it('should fail after maximum retries (3 attempts)', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        status: 409,
        statusText: 'Conflict'
      });

      let errorReceived = false;

      // Act
      service.registerUser(mockRegisterData).subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(error).toBeInstanceOf(HttpErrorResponse);
          expect(error.status).toBe(409);
          expect(error.statusText).toBe('Conflict');
          errorReceived = true;
        }
      });

      // Assert
      let req = httpMock.expectOne(apiUrl);
      req.error(new ErrorEvent('Network error'), errorResponse);

      tick(300);
      req = httpMock.expectOne(apiUrl);
      req.error(new ErrorEvent('Network error'), errorResponse);

      tick(300);
      req = httpMock.expectOne(apiUrl);
      req.error(new ErrorEvent('Network error'), errorResponse);

      tick(300);
      req = httpMock.expectOne(apiUrl);
      req.error(new ErrorEvent('Network error'), errorResponse);

      flush();
      expect(errorReceived).toBe(true);
    }));

    it('should succeed on first attempt without retries', () => {
      // Act
      service.registerUser(mockRegisterData).subscribe({
        next: (response) => {
          expect(response).toEqual(mockSuccessResponse);
        },
        error: () => fail('Should not error')
      });

      // Assert
      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeInstanceOf(FormData);
      req.flush(mockSuccessResponse);

      httpMock.verify();
    });

    it('should succeed on second attempt after one failure', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        status: 503,
        statusText: 'Service Unavailable'
      });

      // Act
      service.registerUser(mockRegisterData).subscribe({
        next: (response) => {
          expect(response).toEqual(mockSuccessResponse);
        },
        error: () => fail('Should not error')
      });

      // Assert
      let req = httpMock.expectOne(apiUrl);
      req.error(new ErrorEvent('Network error'), errorResponse);

      tick(300);

      // Assert
      req = httpMock.expectOne(apiUrl);
      req.flush(mockSuccessResponse);

      flush();
    }));

    it('should handle validation errors from server', fakeAsync(() => {
      const validationError = new HttpErrorResponse({
        status: 422,
        statusText: 'Unprocessable Entity',
        error: {
          message: 'Validation failed',
          errors: {
            email: ['Email already exists'],
            password: ['Password too weak']
          }
        }
      });

      // Act
      service.registerUser(mockRegisterData).subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(error).toBeInstanceOf(HttpErrorResponse);
          expect(error.status).toBe(422);
          if (error.error && error.error.errors) {
            expect(error.error.errors.email).toContain('Email already exists');
            expect(error.error.errors.password).toContain('Password too weak');
          }
        }
      });

      for (let attempt = 0; attempt < 4; attempt++) {
        const req = httpMock.expectOne(apiUrl);
        req.error(new ErrorEvent('Network error'), validationError);
        if (attempt < 3) {
          tick(300);
        }
      }

      flush();
    }));

    it('should maintain FormData structure through retries', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Server Error'
      });

      // Act
      service.registerUser(mockRegisterData).subscribe({
        next: (response) => {
          expect(response).toEqual(mockSuccessResponse);
        }
      });

      let req = httpMock.expectOne(apiUrl);
      expect(req.request.body).toBeInstanceOf(FormData);
      let formData = req.request.body as FormData;
      expect(formData.get('email')).toBe(mockRegisterData.email);
      req.error(new ErrorEvent('Network error'), errorResponse);

      tick(300);

      req = httpMock.expectOne(apiUrl);
      expect(req.request.body).toBeInstanceOf(FormData);
      formData = req.request.body as FormData;
      expect(formData.get('email')).toBe(mockRegisterData.email);
      expect(formData.get('password')).toBe(mockRegisterData.password);
      req.flush(mockSuccessResponse);

      flush();
    }));

    it('should handle empty registration data', () => {
      const emptyData = {} as RegisterContract;

      // Act
      service.registerUser(emptyData).subscribe();

      // Assert
      const req = httpMock.expectOne(apiUrl);
      expect(req.request.body).toBeInstanceOf(FormData);
      const formData = req.request.body as FormData;
      
      let hasEntries = false;
      formData.forEach(() => { hasEntries = true; });
      expect(hasEntries).toBe(false);

      req.flush(mockSuccessResponse);
    });

    it('should use 300ms delay between retries', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Server Error'
      });

      let requestTimes: number[] = [];
      const startTime = Date.now();

      // Act
      service.registerUser(mockRegisterData).subscribe({
        next: () => {},
        error: () => {}
      });

      let req = httpMock.expectOne(apiUrl);
      requestTimes.push(Date.now() - startTime);
      req.error(new ErrorEvent('Network error'), errorResponse);

      tick(300);
      req = httpMock.expectOne(apiUrl);
      requestTimes.push(Date.now() - startTime);
      req.error(new ErrorEvent('Network error'), errorResponse);

      tick(300);
      req = httpMock.expectOne(apiUrl);
      requestTimes.push(Date.now() - startTime);
      req.flush(mockSuccessResponse);

      expect(requestTimes[1] - requestTimes[0]).toBeCloseTo(300, -1);
      expect(requestTimes[2] - requestTimes[1]).toBeCloseTo(300, -1);

      flush();
    }));

    it('should handle File objects in FormData', () => {
      // Arrange
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const dataWithFile = {
        ...mockRegisterData,
        avatar: file
      };

      // Act
      service.registerUser(dataWithFile as any).subscribe();

      // Assert
      const req = httpMock.expectOne(apiUrl);
      const formData = req.request.body as FormData;
      
      expect(formData.get('email')).toBe(mockRegisterData.email);
      expect(formData.get('avatar')).toBe(file);
      expect(formData.get('avatar')).toBeInstanceOf(File);

      req.flush(mockSuccessResponse);
    });
  });

  describe('FormData conversion', () => {
    it('should convert all object entries to FormData correctly', () => {
      const complexData = {
        email: 'test@example.com',
        password: 'password123',
        age: 25,
        isActive: true,
        score: 0,
        isVerified: false,
        emptyString: '',
        nullValue: null,
        undefinedValue: undefined
      };

      // Act
      service.registerUser(complexData as any).subscribe();

      // Assert
      const req = httpMock.expectOne(apiUrl);
      const formData = req.request.body as FormData;
      
      expect(formData.get('email')).toBe('test@example.com');
      expect(formData.get('password')).toBe('password123');
      expect(formData.get('age')).toBe('25');
      expect(formData.get('isActive')).toBe('true');
      expect(formData.get('score')).toBe('0');
      expect(formData.get('isVerified')).toBe('false');
      expect(formData.get('emptyString')).toBe('');
      expect(formData.get('nullValue')).toBeNull();
      expect(formData.get('undefinedValue')).toBeNull();

      req.flush(mockSuccessResponse);
    });
  });

  describe('error handling', () => {
    it('should handle network errors without retries limit', fakeAsync(() => {
      const networkError = new HttpErrorResponse({
        status: 0,
        statusText: 'Unknown Error',
        error: new ProgressEvent('error')
      });

      // Act
      service.registerUser(mockRegisterData).subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(error).toBeInstanceOf(HttpErrorResponse);
          expect(error.status).toBe(0);
        }
      });

      for (let attempt = 0; attempt < 4; attempt++) {
        const req = httpMock.expectOne(apiUrl);
        req.error(new ErrorEvent('Network error'), networkError);
        if (attempt < 3) {
          tick(300);
        }
      }

      flush();
    }));
  });
});