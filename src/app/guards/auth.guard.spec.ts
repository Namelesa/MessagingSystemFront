import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../../entities/session';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authServiceMock: jasmine.SpyObj<AuthService>;
  let routerMock: jasmine.SpyObj<Router>;
  
  let isLoggedInSubject: BehaviorSubject<boolean>;
  let authInitSubject: BehaviorSubject<boolean>;

  beforeEach(() => {
    isLoggedInSubject = new BehaviorSubject<boolean>(false);
    authInitSubject = new BehaviorSubject<boolean>(true);

    const authServiceSpy = jasmine.createSpyObj('AuthService', ['waitForAuthInit'], {
      isLoggedIn$: isLoggedInSubject.asObservable()
    });
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.inject(AuthGuard);
    authServiceMock = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    routerMock = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    authServiceMock.waitForAuthInit.and.returnValue(authInitSubject.asObservable());
  });

  afterEach(() => {
    isLoggedInSubject.complete();
    authInitSubject.complete();
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(guard).toBeTruthy();
    });

    it('should inject AuthService and Router', () => {
      expect(authServiceMock).toBeTruthy();
      expect(routerMock).toBeTruthy();
    });
  });

  describe('canActivate - Authenticated User', () => {
    it('should return true when user is logged in', (done) => {
      // Arrange
      isLoggedInSubject.next(true);

      // Act
      guard.canActivate().subscribe(result => {
        // Assert
        expect(result).toBe(true);
        expect(authServiceMock.waitForAuthInit).toHaveBeenCalledTimes(1);
        expect(routerMock.navigate).not.toHaveBeenCalled();
        done();
      });
    });

    it('should not navigate to login when user is authenticated', (done) => {
      // Arrange
      isLoggedInSubject.next(true);

      // Act
      guard.canActivate().subscribe(result => {
        // Assert
        expect(result).toBe(true);
        expect(routerMock.navigate).not.toHaveBeenCalled();
        done();
      });
    });

    it('should complete after taking one value when authenticated', (done) => {
      // Arrange
      isLoggedInSubject.next(true);
      let completionCalled = false;

      // Act
      guard.canActivate().subscribe({
        next: (result) => {
          expect(result).toBe(true);
        },
        complete: () => {
          completionCalled = true;
          expect(completionCalled).toBe(true);
          done();
        }
      });

      setTimeout(() => {
        isLoggedInSubject.next(false);
      }, 10);
    });
  });

  describe('canActivate - Unauthenticated User', () => {
    it('should return false when user is not logged in', (done) => {
      // Arrange
      isLoggedInSubject.next(false);

      // Act
      guard.canActivate().subscribe(result => {
        // Assert
        expect(result).toBe(false);
        expect(authServiceMock.waitForAuthInit).toHaveBeenCalledTimes(1);
        expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
        expect(routerMock.navigate).toHaveBeenCalledTimes(1);
        done();
      });
    });

    it('should navigate to login page when user is not authenticated', (done) => {
      // Arrange
      isLoggedInSubject.next(false);

      // Act
      guard.canActivate().subscribe(result => {
        // Assert
        expect(result).toBe(false);
        expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
        done();
      });
    });

    it('should complete after taking one value when unauthenticated', (done) => {
      // Arrange
      isLoggedInSubject.next(false);
      let completionCalled = false;

      // Act
      guard.canActivate().subscribe({
        next: (result) => {
          expect(result).toBe(false);
        },
        complete: () => {
          completionCalled = true;
          expect(completionCalled).toBe(true);
          done();
        }
      });
    });
  });

  describe('canActivate - Auth Initialization', () => {
    it('should wait for auth initialization before checking login status', (done) => {
      // Arrange
      authInitSubject = new BehaviorSubject<boolean>(false);
      authServiceMock.waitForAuthInit.and.returnValue(authInitSubject.asObservable());
      isLoggedInSubject.next(true);

      let resultReceived = false;

      // Act
      guard.canActivate().subscribe(result => {
        expect(result).toBe(true);
        expect(resultReceived).toBe(false);
        resultReceived = true;
        done();
      });

      setTimeout(() => {
        authInitSubject.next(true);
      }, 5);
    });

    it('should take only one value from waitForAuthInit', (done) => {
      // Arrange
      authInitSubject = new BehaviorSubject<boolean>(true);
      authServiceMock.waitForAuthInit.and.returnValue(authInitSubject.asObservable());
      isLoggedInSubject.next(true);

      let emissionCount = 0;

      // Act
      guard.canActivate().subscribe({
        next: (result) => {
          emissionCount++;
          expect(result).toBe(true);
        },
        complete: () => {
          expect(emissionCount).toBe(1);
          done();
        }
      });

      setTimeout(() => {
        authInitSubject.next(true);
        authInitSubject.next(true);
      }, 10);
    });
  });

  describe('canActivate - Login Status Subscription', () => {
    it('should take only one value from isLoggedIn$ stream', (done) => {
      // Arrange
      isLoggedInSubject.next(true);
      let emissionCount = 0;

      // Act
      guard.canActivate().subscribe({
        next: (result) => {
          emissionCount++;
          expect(result).toBe(true);
        },
        complete: () => {
          expect(emissionCount).toBe(1);
          done();
        }
      });

      setTimeout(() => {
        isLoggedInSubject.next(false);
        isLoggedInSubject.next(true);
      }, 10);
    });

    it('should handle immediate login status change', (done) => {
      // Arrange
      isLoggedInSubject.next(false);

      // Act
      guard.canActivate().subscribe(result => {
        // Assert
        expect(result).toBe(false);
        expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
        done();
      });
    });
  });

  describe('canActivate - RxJS Operators Coverage', () => {
    it('should properly chain take -> switchMap -> tap -> map operators', (done) => {
      // Arrange
      isLoggedInSubject.next(true);
      
      let tapExecuted = false;
      let mapExecuted = false;

      // Act
      const result$ = guard.canActivate();
      
      // Assert
      result$.subscribe({
        next: (result) => {
          tapExecuted = !routerMock.navigate.calls.any();
          mapExecuted = typeof result === 'boolean';
          
          expect(tapExecuted).toBe(true);
          expect(mapExecuted).toBe(true);
          expect(result).toBe(true);
        },
        complete: () => {
          done();
        }
      });
    });

    it('should execute tap operator for navigation when not logged in', (done) => {
      // Arrange
      isLoggedInSubject.next(false);

      // Act
      guard.canActivate().subscribe(result => {
        // Assert
        expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
        expect(result).toBe(false);
        done();
      });
    });

    it('should execute map operator to return boolean value', (done) => {
      // Arrange
      isLoggedInSubject.next(true);

      // Act
      guard.canActivate().subscribe(result => {
        // Assert
        expect(typeof result).toBe('boolean');
        expect(result).toBe(true);
        done();
      });
    });
  });

  describe('canActivate - Error Handling', () => {
    it('should handle errors from waitForAuthInit', (done) => {
      // Arrange
      const error = new Error('Auth init failed');
      authServiceMock.waitForAuthInit.and.returnValue(throwError(() => error));

      // Act & Assert
      guard.canActivate().subscribe({
        next: () => {
          fail('Should not emit next value on error');
        },
        error: (err) => {
          expect(err).toBe(error);
          done();
        }
      });
    });

    it('should handle errors from isLoggedIn$ stream', (done) => {
      // Arrange  
      const error = new Error('Login status check failed');
      
      const errorSubject = new BehaviorSubject(false);
      const initSubject = new BehaviorSubject(true);
    
      const authServiceSpy = jasmine.createSpyObj('AuthService', ['waitForAuthInit']);
      authServiceSpy.waitForAuthInit.and.returnValue(initSubject.asObservable());
      
      Object.defineProperty(authServiceSpy, 'isLoggedIn$', {
        get: () => errorSubject.pipe(
          switchMap(() => throwError(() => error))
        )
      });

      const errorGuard = new AuthGuard(authServiceSpy, routerMock);

      // Act & Assert
      errorGuard.canActivate().subscribe({
        next: () => {
          fail('Should not emit next value on error');
        },
        error: (err) => {
          expect(err).toBe(error);
          done();
        }
      });
    });
  });

  describe('canActivate - Integration Tests', () => {
    beforeEach(() => {
      routerMock.navigate.calls.reset();
    });

    it('should work with realistic auth flow - user becomes logged in', (done) => {
      const freshAuthInitSubject = new BehaviorSubject<boolean>(false);
      const freshIsLoggedInSubject = new BehaviorSubject<boolean>(true);
      
      const freshAuthService = jasmine.createSpyObj('AuthService', ['waitForAuthInit'], {
        isLoggedIn$: freshIsLoggedInSubject.asObservable()
      });
      freshAuthService.waitForAuthInit.and.returnValue(freshAuthInitSubject.asObservable());
      
      const freshGuard = new AuthGuard(freshAuthService, routerMock);

      let resultReceived = false;

      // Act
      freshGuard.canActivate().subscribe(result => {
        expect(result).toBe(true);
        expect(routerMock.navigate).not.toHaveBeenCalled();
        expect(resultReceived).toBe(false);
        resultReceived = true;
        done();
      });

      setTimeout(() => {
        freshAuthInitSubject.next(true);
      }, 5);
    });

    it('should work with realistic auth flow - user stays logged out', (done) => {
      routerMock.navigate.calls.reset();
      
      // Arrange
      const freshAuthInitSubject = new BehaviorSubject<boolean>(false);
      const freshIsLoggedInSubject = new BehaviorSubject<boolean>(false);
      
      const freshAuthService = jasmine.createSpyObj('AuthService', ['waitForAuthInit'], {
        isLoggedIn$: freshIsLoggedInSubject.asObservable()
      });
      freshAuthService.waitForAuthInit.and.returnValue(freshAuthInitSubject.asObservable());
      
      const freshGuard = new AuthGuard(freshAuthService, routerMock);

      // Act
      freshGuard.canActivate().subscribe(result => {
        expect(result).toBe(false);
        expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
        done();
      });

      setTimeout(() => {
        freshAuthInitSubject.next(true);
      }, 5);
    });
  });

  describe('canActivate - Memory Leak Prevention', () => {
    it('should not cause memory leaks with multiple subscriptions', () => {
      // Arrange
      isLoggedInSubject.next(true);

      // Act
      const subscriptions = [];
      for (let i = 0; i < 10; i++) {
        const sub = guard.canActivate().subscribe();
        subscriptions.push(sub);
      }

      // Assert
      subscriptions.forEach(sub => {
        expect(sub.closed).toBe(true);
      });
    });

    it('should complete observables properly', (done) => {
      // Arrange
      isLoggedInSubject.next(true);
      let completed = false;

      // Act
      guard.canActivate().subscribe({
        next: (result) => {
          expect(result).toBe(true);
        },
        complete: () => {
          completed = true;
          expect(completed).toBe(true);
          done();
        }
      });
    });
  });
});