import { Component, Input, Output, EventEmitter } from '@angular/core';
import { BaseChatListComponent } from '../../../shared/chats';
import { OtoChat } from '../../../entities/oto-chats';
import { OtoChatApiService } from '../api/oto-chat-hub.api';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatListItemComponent, SearchInputComponent } from '../../../shared/chats-ui-elements';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-oto-chat-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatListItemComponent, SearchInputComponent],
  templateUrl: './oto-chat.list.component.html',
})
export class OtoChatListComponent extends BaseChatListComponent<OtoChat> {
  protected apiService: OtoChatApiService;

  public image: string | null = null;

  @Input() searchPlaceholder = 'Search...';
  @Input() emptyListText = 'Chats not found ;(';
  @Input() currentUserNickName!: string;
  @Input() declare selectedNickname?: string;
  @Output() chatSelected = new EventEmitter<OtoChat>();

  constructor(private otoChatApi: OtoChatApiService) {
    super();
    this.apiService = this.otoChatApi;
  }

  getChatName(chat: OtoChat): string {
    return chat.nickName;
  }  

  onChatClick(chat: OtoChat) {
    this.chatSelected.emit(chat);
  }

  get sortedChats$() {
    return this.chats$.pipe(
      map(chats => {
        if (!chats) return [];
        return [...chats].sort((a, b) => {
          if (a.nickName === this.currentUserNickName) return -1;
          if (b.nickName === this.currentUserNickName) return 1;
          return 0;
        });
      })
    );
  }

  isSavedMessagesChat(chat: OtoChat): boolean {
    return chat.nickName === this.currentUserNickName;
  }

  getChatDisplayName(chat: OtoChat): string {
    return this.isSavedMessagesChat(chat) ? 'SavedMessage' : chat.nickName;
  }
}
