import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthApiResult } from './auth-api-result';
import { LoginContract } from '../model/login-contract';
import { environment } from '../../../shared/api-urls';

@Injectable({ providedIn: 'root' })
export class LoginApi {
  constructor(private http: HttpClient) {}

  loginUser(data: LoginContract): Observable<AuthApiResult> {
    return this.http.post<AuthApiResult>(
      `${environment.apiUrl}auth/login`,
      data,
      { withCredentials: true }
    );
  }
}