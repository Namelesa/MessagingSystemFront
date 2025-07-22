import { Component, Input } from '@angular/core';
import { BaseChatListComponent } from '../../../shared/chats/list/base.chat.list';
import { GroupChat } from '../../../entities/group-chats';
import { GroupChatApiService } from '../api/group-chat-hub.api';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatListItemComponent, SearchInputComponent } from '../../../shared/chats-ui-elements';

@Component({
  selector: 'app-group-chat-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatListItemComponent, SearchInputComponent],
  templateUrl: './group-chat.list.component.html',
})
export class GroupChatListComponent extends BaseChatListComponent<GroupChat> {
  protected apiService: GroupChatApiService;

  public image: string | null = null;
  @Input() searchPlaceholder = 'Search...';
  @Input() emptyListText = 'Chats not found ;(';

  constructor(private groupChatApi: GroupChatApiService) {
    super();
    this.apiService = this.groupChatApi;
  }

  getChatName(chat: GroupChat): string {
    return chat.groupName;
  }  
}
