import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, tap } from 'rxjs';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../../entities/session';
import { E2eeService } from '../../features/keys-generator';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let e2eeService: jasmine.SpyObj<E2eeService>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['waitForAuthInit'], {
      isLoggedIn$: of(false)
    });
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const e2eeServiceSpy = jasmine.createSpyObj('E2eeService', ['hasKeys']);

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: E2eeService, useValue: e2eeServiceSpy }
      ]
    });

    guard = TestBed.inject(AuthGuard);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    e2eeService = TestBed.inject(E2eeService) as jasmine.SpyObj<E2eeService>;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  describe('canActivate', () => {
    it('should return true when user is logged in and has E2EE keys', (done) => {
      authService.waitForAuthInit.and.returnValue(of(true));
      Object.defineProperty(authService, 'isLoggedIn$', {
        get: () => of(true)
      });
      e2eeService.hasKeys.and.returnValue(true);

      guard.canActivate().subscribe(result => {
        expect(result).toBeTrue();
        expect(router.navigate).not.toHaveBeenCalled();
        expect(e2eeService.hasKeys).toHaveBeenCalled();
        done();
      });
    });

    it('should return true and log warning when user is logged in but has no E2EE keys', (done) => {
      authService.waitForAuthInit.and.returnValue(of(false));
      Object.defineProperty(authService, 'isLoggedIn$', {
        get: () => of(true)
      });
      e2eeService.hasKeys.and.returnValue(false);
      spyOn(console, 'warn');

      guard.canActivate().subscribe(result => {
        expect(result).toBeTrue();
        expect(router.navigate).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalledWith('⚠️ User is logged in but E2EE keys are not loaded');
        done();
      });
    });

    it('should return false and navigate to login when user is not logged in', (done) => {
      authService.waitForAuthInit.and.returnValue(of(false));
      Object.defineProperty(authService, 'isLoggedIn$', {
        get: () => of(false)
      });

      guard.canActivate().subscribe(result => {
        expect(result).toBeFalse();
        expect(router.navigate).toHaveBeenCalledWith(['/login']);
        expect(e2eeService.hasKeys).not.toHaveBeenCalled();
        done();
      });
    });

    it('should wait for auth initialization before checking login status', (done) => {
      let authInitCalled = false;
      authService.waitForAuthInit.and.returnValue(of(true).pipe(
        tap(() => authInitCalled = true)
      ));
      Object.defineProperty(authService, 'isLoggedIn$', {
        get: () => of(true)
      });
      e2eeService.hasKeys.and.returnValue(true);

      guard.canActivate().subscribe(() => {
        expect(authInitCalled).toBeTrue();
        expect(authService.waitForAuthInit).toHaveBeenCalled();
        done();
      });
    });

    it('should take only one value from isLoggedIn$ observable', (done) => {
      authService.waitForAuthInit.and.returnValue(of(false));
      let emissionCount = 0;
      Object.defineProperty(authService, 'isLoggedIn$', {
        get: () => of(true).pipe(tap(() => emissionCount++))
      });
      e2eeService.hasKeys.and.returnValue(true);

      guard.canActivate().subscribe(() => {
        expect(emissionCount).toBe(1);
        done();
      });
    });
  });
});