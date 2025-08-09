import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RegisterContract } from '../../../entities/user';
import { AuthApiResult, environment } from '../../../shared/api-result';

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
