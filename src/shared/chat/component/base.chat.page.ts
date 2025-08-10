import { BehaviorSubject } from 'rxjs';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { BaseChatApiService } from '../service/base.chat.hub.api';

@Component({
  template: '' 
})

export abstract class BaseChatPageComponent implements OnInit, OnDestroy {
  accessToken?: string;
  selectedChat?: string;
  selectedChatImage?: string;

  protected abstract apiService: BaseChatApiService<any>;
  public selectedChat$ = new BehaviorSubject<any | null>(null);

  ngOnInit(): void {
    this.apiService.connect();
  }

  ngOnDestroy(): void {
    this.apiService.disconnect();
  }

  onChatSelected(chat: string, image: string): void {
    this.selectedChat$.next(chat);
    this.selectedChatImage = image;
    this.apiService
    .loadChatHistory(this.selectedChat$.getValue(), 20, 0);
  }
}
