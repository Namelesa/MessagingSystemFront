import { Observable, throwError } from 'rxjs';
import { retryWhen, scan, delay, catchError, switchMap } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService, ProfileApiResult } from '../../../entities/session';
import { EditUserContract, AuthApiResult } from '../../../entities/user';
import { environment } from '../../../shared/api-urls';

@Injectable({ providedIn: 'root' })
export class UserProfileApi {
  constructor(private http: HttpClient, private authService: AuthService) {}

  private apiUrl = 'http://localhost:3000/api/users';

  getUserProfile(): Observable<ProfileApiResult> {
    const nickName = this.authService.getNickName();
    if (!nickName) {
      throw new Error('Nickname is not set in AuthService');
    }

    const maxRetries = 3;
    const baseDelayMs = 300;
    return this.http.get<ProfileApiResult>(
      `${environment.apiUrl}user/profile`,
      {
        withCredentials: true,
        params: { nickName }
      }
    ).pipe(
      retryWhen(errors => errors.pipe(
        scan((acc, err) => { if (acc >= maxRetries) throw err; return acc + 1; }, 0),
        delay(baseDelayMs)
      )),
      catchError(err => throwError(() => err))
    );
  }

  updateUserProfile(data: EditUserContract): Observable<AuthApiResult> {
    const oldNickName = this.authService.getNickName();
  
    if (!oldNickName) {
      throw new Error('Nickname is not set in AuthService');
    }
  
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value as any);
      }
    });
  
    const maxRetries = 3;
    const baseDelayMs = 300;

    return this.http.put<AuthApiResult>(
      `${this.apiUrl}/nickName/${encodeURIComponent(oldNickName)}`,
      { newName: data.nickName }, 
      { withCredentials: true }
    ).pipe(
      retryWhen(errors => errors.pipe(
        scan((acc, err) => { if (acc >= maxRetries) throw err; return acc + 1; }, 0),
        delay(baseDelayMs)
      )),

      switchMap(() => 
        this.http.put<AuthApiResult>(
          `${environment.apiUrl}user/edit`,
          formData,
          {
            params: { nickName: oldNickName },
            withCredentials: true
          }
        )
      ),
      catchError(err => throwError(() => err))
    );
  }

  deleteUserProfile(): Observable<AuthApiResult> {
    const nickName = this.authService.getNickName();
    if (!nickName) {
      throw new Error('Nickname is not set in AuthService');
    }

    const maxRetries = 3;
    const baseDelayMs = 300;

    return this.http.delete<AuthApiResult>(
      `${this.apiUrl}/nickName/${encodeURIComponent(nickName)}`,
      { withCredentials: true }
    ).pipe(
      retryWhen(errors => errors.pipe(
        scan((acc, err) => { if (acc >= maxRetries) throw err; return acc + 1; }, 0),
        delay(baseDelayMs)
      )),
      switchMap(() => 
        this.http.delete<AuthApiResult>(
          `${environment.apiUrl}user/delete?nickName=${encodeURIComponent(nickName)}`,
          { withCredentials: true }
        )
      ),
      catchError(err => throwError(() => err))
    );
  }
}