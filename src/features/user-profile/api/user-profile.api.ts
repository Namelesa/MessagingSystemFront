import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment, ProfileApiResult, AuthApiResult } from '../../../shared/api-result';
import { Observable } from 'rxjs';
import { AuthService } from '../../../entities/user/model/auht.service';
import { EditUserContract } from '../../../entities';

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
  
    return this.http.put<AuthApiResult>(
      `${environment.apiUrl}user/edit`,
      formData,
      {
        params: { nickName: oldNickName },
        withCredentials: true
      }
    );
  }
  
  deleteUserProfile(): Observable<AuthApiResult>{
    const nickName = this.authService.getNickName();
    if (!nickName) {
      throw new Error('Nickname is not set in AuthService');
    }
  
    const queryString = `nickName=${encodeURIComponent(nickName)}`;
    
    return this.http.delete<AuthApiResult>(
      `${environment.apiUrl}user/delete?${queryString}`,
      {
        withCredentials: true
      }
    );
  }
}
