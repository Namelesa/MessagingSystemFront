import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SearchUser } from '../../../entities/search-user';
import { FindUserStore } from '../../../features/search-user';

export interface GroupUserSearchState {
  isSearchFocused: boolean;
  searchQuery: string;
}

@Injectable({ providedIn: 'root' })
export class GroupSearchService {
  private searchStateSubject = new BehaviorSubject<GroupUserSearchState>({
    isSearchFocused: false,
    searchQuery: ''
  });
  public searchState$ = this.searchStateSubject.asObservable();
  public user$: Observable<SearchUser | null>;

  constructor(private findUserStore: FindUserStore) {
    this.user$ = this.findUserStore.user$;
  }

  get state(): GroupUserSearchState {
    return this.searchStateSubject.value;
  }

  private update(updates: Partial<GroupUserSearchState>): void {
    this.searchStateSubject.next({ ...this.state, ...updates });
  }

  onSearchQueryChange(query: string): void {
    this.update({ searchQuery: query });
    const trimmed = query.trim();
    if (trimmed) {
      this.findUserStore.findUser(trimmed);
    } else {
      this.clear();
    }
  }

  onFocus(): void {
    this.update({ isSearchFocused: true });
    this.findUserStore.clearUser();
  }

  clear(): void {
    this.update({ isSearchFocused: false, searchQuery: '' });
    this.findUserStore.clearUser();
  }
}


