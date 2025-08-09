import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, from } from 'rxjs';
import { catchError, map, tap, switchMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment, ProfileApiResult } from '../../api-result';
import { StorageService } from '../../storage';
import { filter, take } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  private userProfileSubject = new BehaviorSubject<ProfileApiResult | null>(null);
  public userProfile$ = this.userProfileSubject.asObservable();

  private nickName: string | null = null; 
  private apiUrl = environment.apiUrl;
  private readonly storageKey = 'nickName';

  private authInitialized = false;
  private authInitSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private http: HttpClient,
    private storageService: StorageService,
    private router: Router
  ) {
    from(this.storageService.get(this.storageKey))
      .pipe(
        switchMap((storedNick) => {
          if (!storedNick) {
            this.nickName = null;
            this.authInitialized = true;
            this.authInitSubject.next(true);
            return of(false);
          }
          this.nickName = storedNick;
          return this.checkAuth();
        })
      )
      .subscribe({
        next: () => {
          this.authInitialized = true;
          this.authInitSubject.next(true);
        },
        error: () => {
          this.authInitialized = true;
          this.authInitSubject.next(true);
        }
      });
  }

  waitForAuthInit(): Observable<boolean> {
    if (this.authInitialized) return of(true);
    return this.authInitSubject.asObservable().pipe(
      filter(init => init),
      take(1)
    );
  }

  async setNickName(nick: string) {
    this.nickName = nick;
    await this.storageService.set(this.storageKey, nick);
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
        // proactive redirect on 401
        if (error?.status === 401) {
          this.router.navigate(['/login']);
        }
        throw error;
      })
    );
  }

  getCurrentProfile(): ProfileApiResult | null {
    return this.userProfileSubject.value;
  }

  checkAuth(): Observable<boolean> {
    if (!this.nickName) {
      return of(false);
    }
  
    return this.http.get<ProfileApiResult>(`${this.apiUrl}user/profile`, {
      withCredentials: true,
      params: { nickName: this.nickName }
    }).pipe(
      tap(profile => {
        this.userProfileSubject.next(profile);
        this.isLoggedInSubject.next(true);
      }),
      map(() => true),
      catchError((err) => {
        this.userProfileSubject.next(null);
        this.isLoggedInSubject.next(false);
        if (err?.status === 401) {
          this.router.navigate(['/login']);
        }
        return of(false);
      })
    );
  }
  
  async setLoggedIn(status: boolean) {
    this.isLoggedInSubject.next(status);
    if (!status) {
      this.userProfileSubject.next(null);
      this.nickName = null;
      await this.storageService.remove(this.storageKey);
    }
  }  

  getUserAvatarUrl(): string | undefined {
    const profile = this.getCurrentProfile();
    return profile?.image;
  }

  logout(): Observable<boolean> {
    return from(this.clearLocalAuthData()).pipe(
      map(() => {
        this.router.navigate(['/login']);
        return true;
      })
    );
  }

  private async clearLocalAuthData(): Promise<void> {
    this.nickName = null;
    this.isLoggedInSubject.next(false);
    this.userProfileSubject.next(null);
    await this.storageService.remove(this.storageKey);
  }
}