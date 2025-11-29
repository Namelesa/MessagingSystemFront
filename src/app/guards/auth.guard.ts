import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { switchMap, take, tap, map } from 'rxjs/operators';
import { AuthService } from '../../entities/session';
import { E2eeService } from '../../features/keys-generator';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router, private e2eeService : E2eeService) {}

  canActivate(): Observable<boolean> {
    return this.authService.waitForAuthInit().pipe(
      take(1),
      switchMap(() => this.authService.isLoggedIn$.pipe(take(1))),
      tap(isLoggedIn => {
        if (!isLoggedIn) {
          this.router.navigate(['/login']);
          return;
        }
        if (!this.e2eeService.hasKeys()) {
          console.warn('⚠️ User is logged in but E2EE keys are not loaded');
        }
      }),
      map(isLoggedIn => isLoggedIn)
    );
  }
}