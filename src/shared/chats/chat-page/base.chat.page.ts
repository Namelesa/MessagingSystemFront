import { Component, OnInit } from '@angular/core';
import { BaseChatApiService } from '../api/base.chat.hub.api';
import { BehaviorSubject } from 'rxjs';

@Component({
  template: '' 
})

export abstract class BaseChatPageComponent implements OnInit {
  accessToken?: string;
  selectedChat?: string;
  selectedChatImage?: string;

  protected abstract apiService: BaseChatApiService<any>;
  public selectedChat$ = new BehaviorSubject<any | null>(null);

  ngOnInit(): void {
    this.apiService.connect();
  }

  onChatSelected(chat: string, image: string): void {
    this.selectedChat$.next(chat);
    this.selectedChatImage = image;
    this.apiService
    .loadChatHistory(this.selectedChat$.getValue(), 20, 0);
  }
}
