import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { UnauthorizedRedirectInterceptor } from './unauthorized-redirect.interceptor';

describe('UnauthorizedRedirectInterceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let mockRouter: jasmine.SpyObj<Router>;
  let interceptor: UnauthorizedRedirectInterceptor;

  beforeEach(() => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate'], {
      url: '/dashboard'
    });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        UnauthorizedRedirectInterceptor,
        { provide: Router, useValue: routerSpy },
        {
          provide: HTTP_INTERCEPTORS,
          useClass: UnauthorizedRedirectInterceptor,
          multi: true
        }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    interceptor = TestBed.inject(UnauthorizedRedirectInterceptor);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  describe('intercept', () => {
    it('should redirect to /login when receiving 401 error and not on login page', () => {
      // Arrange
      const testUrl = '/api/test';
      Object.defineProperty(mockRouter, 'url', { writable: true, value: '/dashboard' });

      // Act
      httpClient.get(testUrl).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          // Assert
          expect(error).toBeInstanceOf(HttpErrorResponse);
          expect(error.status).toBe(401);
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
        }
      });

      // Assert
      const req = httpTestingController.expectOne(testUrl);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should NOT redirect to /login when receiving 401 error and already on login page', () => {
      // Arrange
      const testUrl = '/api/test';
      Object.defineProperty(mockRouter, 'url', { writable: true, value: '/login' });

      // Act
      httpClient.get(testUrl).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          // Assert
          expect(error).toBeInstanceOf(HttpErrorResponse);
          expect(error.status).toBe(401);
          expect(mockRouter.navigate).not.toHaveBeenCalled();
        }
      });

      // Assert
      const req = httpTestingController.expectOne(testUrl);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should NOT redirect when URL contains /login path', () => {
      // Arrange
      const testUrl = '/api/test';
      Object.defineProperty(mockRouter, 'url', { writable: true, value: '/auth/login/form' });

      // Act
      httpClient.get(testUrl).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          // Assert
          expect(error).toBeInstanceOf(HttpErrorResponse);
          expect(error.status).toBe(401);
          expect(mockRouter.navigate).not.toHaveBeenCalled();
        }
      });

      // Assert
      const req = httpTestingController.expectOne(testUrl);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle empty router URL gracefully', () => {
      // Arrange
      const testUrl = '/api/test';
      Object.defineProperty(mockRouter, 'url', { writable: true, value: '' });

      // Act
      httpClient.get(testUrl).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          // Assert
          expect(error).toBeInstanceOf(HttpErrorResponse);
          expect(error.status).toBe(401);
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
        }
      });

      // Assert
      const req = httpTestingController.expectOne(testUrl);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle null router URL gracefully', () => {
      // Arrange
      const testUrl = '/api/test';
      (mockRouter as any).url = null;

      // Act
      httpClient.get(testUrl).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          // Assert
          expect(error).toBeInstanceOf(HttpErrorResponse);
          expect(error.status).toBe(401);
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
        }
      });

      // Assert
      const req = httpTestingController.expectOne(testUrl);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should NOT redirect for non-401 HTTP errors', () => {
      // Arrange
      const testUrl = '/api/test';
      Object.defineProperty(mockRouter, 'url', { writable: true, value: '/dashboard' });

      // Act 
      httpClient.get(testUrl).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          // Assert
          expect(error).toBeInstanceOf(HttpErrorResponse);
          expect(error.status).toBe(404);
          expect(mockRouter.navigate).not.toHaveBeenCalled();
        }
      });

      // Assert
      const req = httpTestingController.expectOne(testUrl);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should NOT redirect for 500 server errors', () => {
      // Arrange
      const testUrl = '/api/test';
      Object.defineProperty(mockRouter, 'url', { writable: true, value: '/dashboard' });

      // Act
      httpClient.get(testUrl).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          // Assert
          expect(error).toBeInstanceOf(HttpErrorResponse);
          expect(error.status).toBe(500);
          expect(mockRouter.navigate).not.toHaveBeenCalled();
        }
      });

      // Assert
      const req = httpTestingController.expectOne(testUrl);
      req.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should pass through successful requests without interference', () => {
      // Arrange
      const testUrl = '/api/test';
      const testData = { message: 'success' };
      Object.defineProperty(mockRouter, 'url', { writable: true, value: '/dashboard' });

      // Act
      httpClient.get(testUrl).subscribe(data => {
        // Assert
        expect(data).toEqual(testData);
        expect(mockRouter.navigate).not.toHaveBeenCalled();
      });

      // Assert
      const req = httpTestingController.expectOne(testUrl);
      req.flush(testData);
    });

    it('should work with different HTTP methods', () => {
      // Arrange
      const testUrl = '/api/test';
      Object.defineProperty(mockRouter, 'url', { writable: true, value: '/dashboard' });

      // Act
      httpClient.post(testUrl, {}).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          // Assert
          expect(error).toBeInstanceOf(HttpErrorResponse);
          expect(error.status).toBe(401);
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
        }
      });

      // Assert
      const req = httpTestingController.expectOne(testUrl);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('edge cases', () => {
    it('should handle multiple login paths correctly', () => {
      const testCases = [
        { url: '/login', shouldRedirect: false },
        { url: '/auth/login', shouldRedirect: false },
        { url: '/user/login/form', shouldRedirect: false },
        { url: '/dashboard', shouldRedirect: true },
        { url: '/profile', shouldRedirect: true }
      ];

      testCases.forEach(({ url, shouldRedirect }, index) => {
        Object.defineProperty(mockRouter, 'url', { writable: true, value: url });
        mockRouter.navigate.calls.reset();

        httpClient.get(`/api/test-${index}`).subscribe({
          next: () => fail('Expected error'),
          error: () => {
            if (shouldRedirect) {
              expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
            } else {
              expect(mockRouter.navigate).not.toHaveBeenCalled();
            }
          }
        });

        const req = httpTestingController.expectOne(`/api/test-${index}`);
        req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
      });
    });
  });
});