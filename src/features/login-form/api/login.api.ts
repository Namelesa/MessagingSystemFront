import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LoginContract } from '../../../entities/user/api/login-contract';
import { AuthApiResult, environment } from '../../../shared/api-result';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoginApi {
  constructor(private http: HttpClient) {}

  loginUser(data: LoginContract): Observable<AuthApiResult> {
    return this.http.post<AuthApiResult>(
      `${environment.apiUrl}auth/login`,
      data
    );
  }
}

