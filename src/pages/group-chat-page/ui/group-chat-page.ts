import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroupChatListComponent } from '../../../features/group-chats';
import { GroupChatApiService } from '../../../features/group-chats';
import { FormsModule } from '@angular/forms';
import { BaseChatPageComponent, ChatLayoutComponent } from '../../../shared/chats';
import { GroupInfoModalComponent } from '../../../features/group-info';
import { GroupMessagesComponent } from '../../../features/group-messages';

@Component({
  selector: 'app-group-chat-page',
  standalone: true,
  imports: [CommonModule, GroupChatListComponent, FormsModule, ChatLayoutComponent, GroupInfoModalComponent, GroupMessagesComponent],
  templateUrl: './group-chat-page.html',
})
export class GroupChatPageComponent extends BaseChatPageComponent {
  protected apiService: GroupChatApiService;

  selectedGroupId?: string;
  groupInfoModalOpen = false;

  constructor(private groupChatApi: GroupChatApiService) {
    super();
    this.apiService = this.groupChatApi;
  }

  override onChatSelected(nickname: string, image: string, groupId?: string): void {
    this.selectedChat$.next(nickname); 
    this.selectedChat = nickname;      
    this.selectedChatImage = image;
    this.selectedGroupId = groupId;
    if (groupId) {
      this.apiService.loadChatHistory(groupId, 20, 0);
    }
  }

  onHeaderClick() {
    this.groupInfoModalOpen = true;
  }

  closeGroupInfoModal() {
    this.groupInfoModalOpen = false;
  }

  onGroupUpdated() {
    this.selectedChat = undefined;
    this.selectedChatImage = undefined;
  } 
}
