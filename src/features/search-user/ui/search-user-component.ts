import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AsyncPipe } from '@angular/common';
import { FindUserStore } from '../model/search-user-store';
import { SearchInputComponent } from '../../../shared/search';

@Component({
  selector: 'app-find-user-component',
  standalone: true,
  imports: [CommonModule, AsyncPipe, SearchInputComponent],
  templateUrl: './search-user-component.html',
})

export class SearchUserComponent {

  @Input() isSearchActive = false;
  @Output() searchActiveChange = new EventEmitter<boolean>();
  @Output() searchFocus = new EventEmitter<void>();
  @Output() searchQueryChange = new EventEmitter<string>();
  @Output() foundedUser = new EventEmitter<{ nick: string, image: string }>();

    searchQuery = '';
    user$;
  
    constructor(private readonly store: FindUserStore) {
      this.user$ = this.store.user$;
    }
  
    onSearchChange(query: string) {
      this.searchQuery = query;
      this.searchQueryChange.emit(this.searchQuery);
      const trimmed = query.trim();
      if (trimmed) {
        this.store.findUser(trimmed);
        this.searchActiveChange.emit(true);
      } else {
        this.store.clearUser();
        this.searchActiveChange.emit(false);
      }
    }
  
    onClearSearch() {
      this.searchQuery = '';
      this.store.clearUser();
      this.searchActiveChange.emit(false);
    }
  
    startChat(nick: string, image: string) {
      this.foundedUser.emit({ nick, image });
      this.onClearSearch();
    }
  }