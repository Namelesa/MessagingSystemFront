import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroupChatListComponent } from '../../../features/group-chats';
import { GroupChatApiService } from '../../../features/group-chats';
import { FormsModule } from '@angular/forms';
import { BaseChatPageComponent, ChatLayoutComponent } from '../../../shared/chats';
import { GroupInfoModalComponent } from '../../../features/group-info';
import { GroupMessagesComponent } from '../../../features/group-messages';
import { SendAreaComponent } from '../../../shared/chats-ui-elements';
import { GroupMessagesApiService } from '../../../features/group-messages';
import { StorageService } from '../../../shared/storage/storage.service';

@Component({
  selector: 'app-group-chat-page',
  standalone: true,
  imports: [CommonModule, GroupChatListComponent, 
    FormsModule, ChatLayoutComponent, GroupInfoModalComponent, 
    GroupMessagesComponent, SendAreaComponent],
  templateUrl: './group-chat-page.html',
})
export class GroupChatPageComponent extends BaseChatPageComponent {
  protected apiService: GroupChatApiService;

  selectedGroupId?: string;
  groupInfoModalOpen = false;

  constructor(
    private groupChatApi: GroupChatApiService, 
    private groupMessages: GroupMessagesApiService,
    private storageService: StorageService
  ) {
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

  onOpenChatWithUser(userData: { nickName: string, image: string }) {
    this.storageService.navigateToOtoChat(userData);
  }

  sendMessage(message: string) {
    if (this.selectedGroupId && message.trim()) {
      this.groupMessages.sendMessage(this.selectedGroupId, message);
    }
  }
}
