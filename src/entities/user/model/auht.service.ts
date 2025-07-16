import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../shared/api-result/urls/api.urls';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  private nickName: string | null = null; 

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  setNickName(nick: string) {
    this.nickName = nick;
  }

  getNickName(): string | null {
    return this.nickName;
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
  }
}

