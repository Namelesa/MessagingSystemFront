import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { switchMap, take, tap, map } from 'rxjs/operators';
import { AuthService } from '../../entities/user/model/auht.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.authService.waitForAuthInit().pipe(
      take(1),
      switchMap(() => this.authService.isLoggedIn$.pipe(take(1))),
      tap(isLoggedIn => {
        if (!isLoggedIn) {
          this.router.navigate(['/login']);
        }
      }),
      map(isLoggedIn => isLoggedIn)
    );
  }
}
