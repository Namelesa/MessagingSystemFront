import { OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';

import { Component } from '@angular/core';

@Component({
  template: ''
})

export abstract class BaseChatListComponent<TChat> implements OnInit, OnDestroy {
  chats$!: Observable<TChat[]>;
  loading$!: Observable<boolean>;
  error$!: Observable<string | null>;
  selectedNickname?: string;
  selectedNicknameImage?: string;
  searchQuery = '';
  searchResults: string[] = [];

  @Input() accessToken!: string;
  @Output() selectChat = new EventEmitter<{ nickname: string; image: string; groupId?: string }>();

  protected abstract apiService: {
    connected(): void;
    disconnect(): void;
    chats$: Observable<TChat[]>;
    loading$: Observable<boolean>;
    error$: Observable<string | null>;
  };

  ngOnInit(): void {
    this.apiService.connected(); // Устанавливаем соединение
    this.chats$ = this.apiService.chats$;
    this.loading$ = this.apiService.loading$;
    this.error$ = this.apiService.error$;
  }

  ngOnDestroy(): void {
    this.apiService.disconnect(); // Отключаем соединение
  }

  onSelectChat(nickname: string, image: string, groupId?: string): void {
    this.selectedNickname = nickname;
    this.selectedNicknameImage = image;
    this.selectChat.emit({ nickname, image, groupId });
  }

  onSearchChange(): void {
    if (this.searchQuery.trim()) {
    } else {
      this.searchResults = [];
    }
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
  }

  startChat(nickName: string, image: string, groupId?: string): void {
    this.clearSearch();
    this.onSelectChat(nickName, image, groupId);
  }
}
