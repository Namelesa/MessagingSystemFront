import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OtoChatListComponent } from '../../../features/oto-chats';
import { OtoChatApiService } from '../../../features/oto-chats';
import { FormsModule } from '@angular/forms';
import { BaseChatPageComponent, ChatLayoutComponent} from '../../../shared/chats';
import { OtoChat } from '../../../entities/oto-chats';
import { OtoChatMessagesComponent } from '../../../features/oto-messages';
import { AuthService } from '../../../entities/user/api/auht.service';

@Component({
  selector: 'app-oto-chat-page',
  standalone: true,
  imports: [CommonModule, OtoChatListComponent, FormsModule, ChatLayoutComponent, OtoChatMessagesComponent],
  templateUrl: './oto-chat-page.html',
})
export class OtoChatPageComponent extends BaseChatPageComponent {
  protected override apiService: OtoChatApiService;

  declare selectedChat?: string;
  declare selectedChatImage?: string;
  selectedOtoChat?: OtoChat;
  currentUserNickName: string = '';

  constructor(private otoChatApi: OtoChatApiService, private authService: AuthService) {
    super();
    this.apiService = this.otoChatApi;
    this.currentUserNickName = this.authService.getNickName() || '';
  }

  onOtoChatSelected(chat: OtoChat) {
    this.selectedChat = chat.nickName;
    this.selectedChatImage = chat.image;
    this.selectedOtoChat = chat;
  }

  get displayChatName(): string {
    if (this.selectedOtoChat && this.selectedOtoChat.nickName === this.currentUserNickName) {
      return 'SavedMessage';
    }
    return this.selectedOtoChat?.nickName || '';
  }

  get displayChatImage(): string {
    if (this.selectedOtoChat && this.selectedOtoChat.nickName === this.currentUserNickName) {
      return 'assets/bookmark.svg';
    }
    return this.selectedOtoChat?.image || '';
  }
}
