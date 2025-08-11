import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SearchUser } from '../../../entities/search-user';
import { FindUserApi } from '../api/search-user.api';

@Injectable({ providedIn: 'root' })
export class FindUserStore {
  private readonly userSubject = new BehaviorSubject<SearchUser | null>(null);
  readonly user$ = this.userSubject.asObservable();

  private readonly api = new FindUserApi();

  findUser(nick: string) {
    this.api.searchUser(nick).subscribe({
      next: (res) => {
        this.userSubject.next(res.data); 
      },
      error: (err) => {
        this.userSubject.next(null);
      },
    });
  }

  clearUser() {
    this.userSubject.next(null);
  }
}
