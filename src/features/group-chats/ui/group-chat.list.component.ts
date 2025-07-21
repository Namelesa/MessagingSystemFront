import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { GroupChat } from '../../../entities/group-chats';
import { GroupChatApiService } from '../api/group-chat-hub.api';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-group-chat-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group-chat.list.component.html',
})
export class GroupChatListComponent implements OnInit {
  chats$!: Observable<GroupChat[]>;
  loading$!: Observable<boolean>;
  error$!: Observable<string | null>;
  selectedNickname?: string;
  selectedNicknameImage?: string;
  searchQuery = '';
  searchResults: string[] = [];
  image: string = '';

  @Input() accessToken!: string;
  @Output() selectChat = new EventEmitter<{ nickname: string, image: string }>();

  constructor(private groupChatApi: GroupChatApiService) {}

  ngOnInit(): void { 
      this.groupChatApi.connect();
      this.chats$ = this.groupChatApi.chats$;
      this.loading$ = this.groupChatApi.loading$;
      this.error$ = this.groupChatApi.error$;
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
