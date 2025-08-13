import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SearchUser } from '../../../entities/search-user';
import { FindUserStore } from '../../../features/search-user';

export interface UserSearchState {
  isSearchFocused: boolean;
  searchQuery: string;
  searchResults: string[];
  foundUser?: { nick: string; image: string };
}

@Injectable({
  providedIn: 'root'
})
export class UserSearchService {
  private searchStateSubject = new BehaviorSubject<UserSearchState>({
    isSearchFocused: false,
    searchQuery: '',
    searchResults: []
  });

  public searchState$ = this.searchStateSubject.asObservable();
  public user$: Observable<SearchUser | null>;

  constructor(private findUserStore: FindUserStore) {
    this.user$ = this.findUserStore.user$;
  }

  getCurrentSearchState(): UserSearchState {
    return this.searchStateSubject.value;
  }

  private updateState(updates: Partial<UserSearchState>): void {
    const currentState = this.getCurrentSearchState();
    this.searchStateSubject.next({ ...currentState, ...updates });
  }

  onSearchQueryChange(query: string): void {
    const trimmed = query.trim();
    this.updateState({ searchQuery: query });

    if (trimmed) {
      this.findUserStore.findUser(trimmed);
    } else {
      this.clearSearch();
    }
  }

  onSearchFocus(): void {
    this.updateState({ isSearchFocused: true });
    this.findUserStore.clearUser();
  }

  onSearchActiveChange(isActive: boolean): void {
    this.updateState({ isSearchFocused: isActive });
    
    if (!isActive) {
      this.clearSearch();
    }
  }

  clearSearch(): void {
    this.updateState({
      isSearchFocused: false,
      searchQuery: '',
      searchResults: [],
      foundUser: undefined
    });
    this.findUserStore.clearUser();
  }

  onSearchResult(results: string[]): void {
    this.updateState({ searchResults: results });
  }

  onFoundUser(userData: { nick: string; image: string }): void {
    this.updateState({ foundUser: userData });
    this.clearSearch();
  }

  startChatWithUser(userData: { nick: string; image: string }): void {
    this.onFoundUser(userData);
  }
}