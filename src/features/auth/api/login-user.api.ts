import { Observable, throwError } from 'rxjs';
import { retry, retryWhen, scan, delay, catchError } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthApiResult, LoginContract } from '../../../entities/user';
import { environment } from '../../../shared/api-urls';

@Injectable({ providedIn: 'root' })
export class LoginApi {
  constructor(private http: HttpClient) {}

  loginUser(data: LoginContract): Observable<AuthApiResult> {
    const maxRetries = 3;
    const baseDelayMs = 300;
    return this.http.post<AuthApiResult>(
      `${environment.apiUrl}auth/login`,
      data,
      { withCredentials: true }
    ).pipe(
      retryWhen(errors => errors.pipe(
        scan((acc, err) => {
          if (acc >= maxRetries) {
            throw err;
          }
          return acc + 1;
        }, 0),
        delay(baseDelayMs)
      )),
      catchError(err => throwError(() => err))
    );
  }
}
