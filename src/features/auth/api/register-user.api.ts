import { Observable, throwError } from 'rxjs';
import { retryWhen, scan, delay, catchError } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthApiResult, RegisterContract } from '../../../entities/user';
import { environment } from '../../../shared/api-urls';

@Injectable({ providedIn: 'root' })
export class RegisterApi {
  constructor(private http: HttpClient) {}

  registerUser(data: RegisterContract): Observable<AuthApiResult> {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value as any);
      }
    });

    const maxRetries = 3;
    const baseDelayMs = 300;
    return this.http.post<AuthApiResult>(`${environment.apiUrl}auth/register`, formData).pipe(
      retryWhen(errors => errors.pipe(
        scan((acc, err) => {
          if (acc >= maxRetries) throw err;
          return acc + 1;
        }, 0),
        delay(baseDelayMs)
      )),
      catchError(err => throwError(() => err))
    );
  }
}