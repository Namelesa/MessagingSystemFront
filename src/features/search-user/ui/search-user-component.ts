import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AsyncPipe } from '@angular/common';
import { SearchInputComponent } from '../../../shared/chats-ui-elements';
import { FindUserStore } from '../model/search-user-store';

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
      console.log('Start chat with:', nick, image);
    }
  }