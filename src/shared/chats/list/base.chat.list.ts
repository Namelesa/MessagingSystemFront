import { OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs';

import { Component } from '@angular/core';

@Component({
  template: ''
})

export abstract class BaseChatListComponent<TChat> implements OnInit {
  chats$!: Observable<TChat[]>;
  loading$!: Observable<boolean>;
  error$!: Observable<string | null>;
  selectedNickname?: string;
  selectedNicknameImage?: string;
  searchQuery = '';
  searchResults: string[] = [];

  @Input() accessToken!: string;
  @Output() selectChat = new EventEmitter<{ nickname: string; image: string }>();

  protected abstract apiService: {
    connect(): void;
    chats$: Observable<TChat[]>;
    loading$: Observable<boolean>;
    error$: Observable<string | null>;
  };

  ngOnInit(): void {
    this.apiService.connect();
    this.chats$ = this.apiService.chats$;
    this.loading$ = this.apiService.loading$;
    this.error$ = this.apiService.error$;
  }

  onSelectChat(nickname: string, image: string): void {
    this.selectedNickname = nickname;
    this.selectedNicknameImage = image;
    this.selectChat.emit({ nickname, image });
  }

  onSearchChange(): void {
    if (this.searchQuery.trim()) {
      console.log('Searching for:', this.searchQuery);
    } else {
      this.searchResults = [];
    }
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
  }

  startChat(nickName: string, image: string): void {
    this.clearSearch();
    this.onSelectChat(nickName, image);
  }
}
