import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { OtoChat } from '../../../entities/oto-chats';
import { OtoChatApiService } from '../api/oto-chat-hub.api';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-oto-chat-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './oto-chat-list.component.html',
})
export class OtoChatListComponent implements OnInit {
  chats$!: Observable<OtoChat[]>;
  loading$!: Observable<boolean>;
  error$!: Observable<string | null>;
  selectedNickname?: string;
  selectedNicknameImage?: string;
  searchQuery = '';
  searchResults: string[] = [];
  image: string = '';

  @Input() accessToken!: string;
  @Output() selectChat = new EventEmitter<{ nickname: string, image: string }>();

  constructor(private otoChatApi: OtoChatApiService) {}

  ngOnInit(): void { 
      this.otoChatApi.connect();
      this.chats$ = this.otoChatApi.chats$;
      this.loading$ = this.otoChatApi.loading$;
      this.error$ = this.otoChatApi.error$;
  }

  onSelectChat(nickname: string, image: string): void {
    this.selectedNickname = nickname;
    this.selectedNicknameImage = image;
    this.selectChat.emit({ nickname, image });
  }

  onSearchChange() {
    if (this.searchQuery.trim()) {
      console.log('Searching for:', this.searchQuery);
    } else {
      this.searchResults = [];
    }
  }
  
  clearSearch() {
    this.searchQuery = '';
    this.searchResults = [];
  }
  
  startChat(nickName: string, image: string) {
    this.clearSearch();
    this.onSelectChat(nickName, image);
  }
}
