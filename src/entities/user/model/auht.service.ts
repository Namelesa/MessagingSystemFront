import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../shared/api-result/urls/api.urls';
import { ProfileApiResult } from '../../../shared/api-result';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  private userProfileSubject = new BehaviorSubject<ProfileApiResult | null>(null);
  public userProfile$ = this.userProfileSubject.asObservable();

  private nickName: string | null = null; 
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  setNickName(nick: string) {
    this.nickName = nick;
  }

  getNickName(): string | null {
    return this.nickName;
  }

  getUserProfile(): Observable<ProfileApiResult> {
    if (!this.nickName) {
      throw new Error('User nickname is not set');
    }

    return this.http.get<ProfileApiResult>(`${this.apiUrl}user/profile`, {
      withCredentials: true,
      params: { nickName: this.nickName }
    }).pipe(
      tap((profile) => {
        this.userProfileSubject.next(profile);
        this.isLoggedInSubject.next(true);
      }),
      catchError((error) => {
        this.isLoggedInSubject.next(false);
        this.userProfileSubject.next(null);
        throw error;
      })
    );
  }

  getCurrentProfile(): ProfileApiResult | null {
    return this.userProfileSubject.value;
  }

  checkAuth(): Observable<boolean> {
    if (!this.nickName) return of(false); 

    return this.http.get(`${this.apiUrl}user/profile`, {
      withCredentials: true,
      params: { nickName: this.nickName }
    }).pipe(
      tap(() => this.isLoggedInSubject.next(true)),
      map(() => true),
      catchError(() => {
        this.isLoggedInSubject.next(false);
        return of(false);
      })
    );
  }

  setLoggedIn(status: boolean) {
    this.isLoggedInSubject.next(status);
    if (!status) {
      this.userProfileSubject.next(null);
      this.nickName = null;
    }
  }

  getUserAvatarUrl(): string | undefined {
    const profile = this.getCurrentProfile();
    return profile?.image;
  }
}