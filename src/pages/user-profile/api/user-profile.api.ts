import { Observable, throwError } from 'rxjs';
import { retryWhen, scan, delay, catchError } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService, ProfileApiResult } from '../../../entities/session';
import { EditUserContract, AuthApiResult } from '../../../entities/user';
import { environment } from '../../../shared/api-urls';

@Injectable({ providedIn: 'root' })
export class UserProfileApi {
  constructor(private http: HttpClient, private authService: AuthService) {}

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
      `${environment.apiUrl}user/edit`,
      formData,
      {
        params: { nickName: oldNickName },
        withCredentials: true
      }
    ).pipe(
      retryWhen(errors => errors.pipe(
        scan((acc, err) => { if (acc >= maxRetries) throw err; return acc + 1; }, 0),
        delay(baseDelayMs)
      )),
      catchError(err => throwError(() => err))
    );
  }
  
  deleteUserProfile(): Observable<AuthApiResult>{
    const nickName = this.authService.getNickName();
    if (!nickName) {
      throw new Error('Nickname is not set in AuthService');
    }
  
    const queryString = `nickName=${encodeURIComponent(nickName)}`;
    
    const maxRetries = 3;
    const baseDelayMs = 300;
    return this.http.delete<AuthApiResult>(
      `${environment.apiUrl}user/delete?${queryString}`,
      {
        withCredentials: true
      }
    ).pipe(
      retryWhen(errors => errors.pipe(
        scan((acc, err) => { if (acc >= maxRetries) throw err; return acc + 1; }, 0),
        delay(baseDelayMs)
      )),
      catchError(err => throwError(() => err))
    );
  }
}