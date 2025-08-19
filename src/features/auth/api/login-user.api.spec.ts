import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { LoginApi } from './login-user.api';
import { AuthApiResult, LoginContract } from '../../../entities/user';
import { environment } from '../../../shared/api-urls';
import { fakeAsync, tick, flush } from '@angular/core/testing';

describe('LoginApi', () => {
  let service: LoginApi;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}auth/login`;

  const mockLoginData: LoginContract = {
    login: 'testUser',
    password: 'password123',
    nickName: 'TestUser'
  };

  const mockSuccessResponse: AuthApiResult = {
    statusCode: '200',
    message: 'Login successful',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [LoginApi]
    });

    service = TestBed.inject(LoginApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('loginUser', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should send POST request to correct URL with credentials', () => {
      // Act
      service.loginUser(mockLoginData).subscribe();

      // Assert
      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockLoginData);
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.url).toBe(apiUrl);

      req.flush(mockSuccessResponse);
    });

    it('should return successful response when login succeeds', () => {
      // Act & Assert
      service.loginUser(mockLoginData).subscribe({
        next: (response) => {
          expect(response).toEqual(mockSuccessResponse);
          expect(response.statusCode).toBe('200');
          expect(response.message).toBe('Login successful');
        }
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush(mockSuccessResponse);
    });

    it('should retry failed requests up to 3 times with delay', fakeAsync(() => {
      let responseCount = 0;
      const errorResponse = new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Server Error'
      });

      // Act
      service.loginUser(mockLoginData).subscribe({
        next: (response) => {
          expect(response).toEqual(mockSuccessResponse);
          expect(responseCount).toBe(3);
        },
        error: fail
      });

      // Assert
      let req = httpMock.expectOne(apiUrl);
      expect(req.request.body).toEqual(mockLoginData);
      req.error(new ErrorEvent('Network error'), errorResponse);
      responseCount++;
      tick(300);

      // Assert
      req = httpMock.expectOne(apiUrl);
      expect(req.request.body).toEqual(mockLoginData);
      req.error(new ErrorEvent('Network error'), errorResponse);
      responseCount++;

      tick(300);

      // Assert 
      req = httpMock.expectOne(apiUrl);
      expect(req.request.body).toEqual(mockLoginData);
      req.error(new ErrorEvent('Network error'), errorResponse);
      responseCount++;

      tick(300);

      // Assert
      req = httpMock.expectOne(apiUrl);
      expect(req.request.body).toEqual(mockLoginData);
      req.flush(mockSuccessResponse);

      flush();
    }));

    it('should fail after maximum retries (3 attempts)', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Server Error',
        error: 'Server Error'
      });

      let errorReceived = false;

      // Act
      service.loginUser(mockLoginData).subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(error).toBeInstanceOf(HttpErrorResponse);
          expect(error.status).toBe(500);
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
      service.loginUser(mockLoginData).subscribe({
        next: (response) => {
          expect(response).toEqual(mockSuccessResponse);
        },
        error: () => fail('Should not error')
      });

      // Assert
      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      req.flush(mockSuccessResponse);

      httpMock.verify();
    });

    it('should succeed on second attempt after one failure', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        status: 503,
        statusText: 'Service Unavailable'
      });

      // Act
      service.loginUser(mockLoginData).subscribe({
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

    it('should handle different types of HTTP errors', fakeAsync(() => {
      const testCases = [
        { status: 400, statusText: 'Bad Request' },
        { status: 401, statusText: 'Unauthorized' },
        { status: 404, statusText: 'Not Found' },
        { status: 500, statusText: 'Internal Server Error' }
      ];

      testCases.forEach((errorCase, index) => {
        const errorResponse = new HttpErrorResponse({
          status: errorCase.status,
          statusText: errorCase.statusText
        });

        // Act
        service.loginUser(mockLoginData).subscribe({
          next: () => fail('Should not succeed'),
          error: (error) => {
            expect(error).toBeInstanceOf(HttpErrorResponse);
            expect(error.status).toBe(errorCase.status);
          }
        });

        for (let attempt = 0; attempt < 4; attempt++) {
          const req = httpMock.expectOne(apiUrl);
          req.error(new ErrorEvent('Network error'), errorResponse);
          if (attempt < 3) {
            tick(300);
          }
        }

        flush();
      });
    }));

    it('should maintain request configuration through retries', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Server Error'
      });

      // Act
      service.loginUser(mockLoginData).subscribe({
        next: (response) => {
          expect(response).toEqual(mockSuccessResponse);
        }
      });

      let req = httpMock.expectOne(apiUrl);
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.body).toEqual(mockLoginData);
      req.error(new ErrorEvent('Network error'), errorResponse);

      tick(300);

      req = httpMock.expectOne(apiUrl);
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.body).toEqual(mockLoginData);
      req.flush(mockSuccessResponse);

      flush();
    }));

    it('should handle empty response', () => {
      // Act
      service.loginUser(mockLoginData).subscribe({
        next: (response) => {
          expect(response).toBeNull();
        }
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush(null);
    });

    it('should handle malformed login data', () => {
      const malformedData = {} as LoginContract;

      // Act
      service.loginUser(malformedData).subscribe();

      // Assert
      const req = httpMock.expectOne(apiUrl);
      expect(req.request.body).toEqual(malformedData);
      req.flush(mockSuccessResponse);
    });
  });

  describe('error handling', () => {
    it('should preserve original error details after retries', fakeAsync(() => {
      const originalError = new HttpErrorResponse({
        status: 422,
        statusText: 'Unprocessable Entity',
        error: { 
          message: 'Invalid credentials',
          details: 'Email or password is incorrect'
        }
      });

      // Act
      service.loginUser(mockLoginData).subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(error).toBeInstanceOf(HttpErrorResponse);
          expect(error.status).toBe(422);
          expect(error.statusText).toBe('Unprocessable Entity');
        }
      });

      for (let attempt = 0; attempt < 4; attempt++) {
        const req = httpMock.expectOne(apiUrl);
        req.error(new ErrorEvent('Network error'), originalError);
        if (attempt < 3) {
          tick(300);
        }
      }

      flush();
    }));
  });

  describe('timing', () => {
    it('should use 300ms delay between retries', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Server Error'
      });

      let requestTimes: number[] = [];
      const startTime = Date.now();

      // Act
      service.loginUser(mockLoginData).subscribe({
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
  });
});