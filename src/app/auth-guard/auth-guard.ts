import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  UrlTree
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../../entities/user/model/auht.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.checkAuth().pipe(
      map((isAuthenticated) => {
        return isAuthenticated
          ? true
          : this.router.createUrlTree(['/login']);
      }),
      catchError(() => {
        return of(this.router.createUrlTree(['/login']));
      })
    );
  }
}
