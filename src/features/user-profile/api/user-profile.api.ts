import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment, ProfileApiResult } from '../../../shared/api-result';
import { Observable } from 'rxjs';
import { AuthService } from '../../../entities/user/model/auht.service';

@Injectable({ providedIn: 'root' })
export class UserProfileApi {
  constructor(private http: HttpClient, private authService: AuthService) {}

  getUserProfile(): Observable<ProfileApiResult> {
    const nickName = this.authService.getNickName();
    if (!nickName) {
      throw new Error('Nickname is not set in AuthService');
    }

    return this.http.get<ProfileApiResult>(
      `${environment.apiUrl}user/profile`,
      {
        withCredentials: true,
        params: { nickName }
      }
    );
  }
}
