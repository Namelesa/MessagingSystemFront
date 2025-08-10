import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthApiResult } from './auth-api-result';
import { RegisterContract } from '../model/register-contract';
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

    return this.http.post<AuthApiResult>(`${environment.apiUrl}auth/register`, formData);
  }
}