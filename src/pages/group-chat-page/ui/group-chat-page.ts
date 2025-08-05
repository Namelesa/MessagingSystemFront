import { Component,  Input, ViewChild, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroupChatListComponent } from '../../../features/group-chats';
import { GroupChatApiService } from '../../../features/group-chats';
import { FormsModule } from '@angular/forms';
import { BaseChatPageComponent, ChatLayoutComponent } from '../../../shared/chats';
import { GroupInfoModalComponent } from '../../../features/group-info';
import { GroupMessage, GroupMessagesComponent } from '../../../features/group-messages';
import { AuthService } from '../../../entities/user/api/auht.service';
import { SendAreaComponent } from '../../../shared/chats-ui-elements';
import { GroupMessagesApiService } from '../../../features/group-messages';
import { StorageService } from '../../../shared/storage/storage.service';
import { GroupInfoApiService } from '../../../features/group-info';
import { GroupMember } from '../../../entities/group-member';

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
  editingMessage?: GroupMessage;

  isDeleteModalOpen: boolean = false;
  messageToDelete?: GroupMessage;

  replyingToMessage?: GroupMessage;

  forceMessageComponentReload = false;

  currentUserNickName: string = '';
  groupMembers: GroupMember[] = [];

  @Input() edit: string = '';

  @ViewChild(GroupMessagesComponent) messagesComponent?: GroupMessagesComponent;
  @ViewChild(GroupChatListComponent) chatListComponent?: GroupChatListComponent;

  constructor(
    private groupChatApi: GroupChatApiService, 
    private groupMessages: GroupMessagesApiService,
    private authService: AuthService, 
    private storageService: StorageService,
    private groupInfoApi: GroupInfoApiService,
    private cdr: ChangeDetectorRef
  ) {
    super();
    this.apiService = this.groupChatApi;
    this.authService.waitForAuthInit().subscribe(() => {
      this.currentUserNickName = this.authService.getNickName() || '';
    });
  }

  override onChatSelected(nickname: string, image: string, groupId?: string): void {
    this.selectedChat$.next(nickname); 
    this.selectedChat = nickname;      
    this.selectedChatImage = image;
    this.selectedGroupId = groupId;
    this.editingMessage = undefined;
    this.replyingToMessage = undefined;

    this.forceMessageComponentReload = true;
    setTimeout(() => {
      this.forceMessageComponentReload = false;
      this.cdr.detectChanges();
    }, 0);
    
    if (groupId) {
      this.apiService.loadChatHistory(groupId, 20, 0);
      this.loadGroupMembers(groupId);
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
      if (this.replyingToMessage) {
        this.groupMessages.replyToMessage(this.replyingToMessage.id, message, this.selectedGroupId);
        this.replyingToMessage = undefined;
      } else {
        this.groupMessages.sendMessage(this.selectedGroupId, message);
      }
    }
  }

  onEditMessage(message: GroupMessage) {
    this.editingMessage = message;
    this.replyingToMessage = undefined;
  }

  async onEditComplete(editData: { messageId: string; content: string }) {
    try {
      await this.groupMessages.editMessage(editData.messageId, editData.content, this.selectedGroupId!);
      this.editingMessage = undefined;
    } catch (error) {
    }
  }

  onEditCancel() {
    this.editingMessage = undefined;
  }

  onDeleteMessage(message: GroupMessage) {
    this.messageToDelete = message;
    this.isDeleteModalOpen = true;
  }

  deleteForBoth: boolean = false;

  async onConfirmDelete() {
    if (this.messageToDelete && this.selectedChat) {
      const deleteType = this.deleteForBoth ? 'hard' : 'soft';
      console.log(`Deleting message ${this.messageToDelete.id} for ${deleteType} in group ${this.selectedGroupId}`);
      if (deleteType === 'hard') {
        await this.groupMessages.deleteMessage(this.messageToDelete.id, this.selectedGroupId!);
      } else {
        await this.groupMessages.softDeleteMessage(this.messageToDelete.id, this.selectedGroupId!);
      }
      this.closeDeleteModal();
    }
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.messageToDelete = undefined;
    this.deleteForBoth = false;
  }

  onReplyToMessage(message: GroupMessage) {
    this.replyingToMessage = message;
    this.editingMessage = undefined; 
  }

  onCancelReply() {
    this.replyingToMessage = undefined;
  }

  onScrollToMessage(messageId: string) {
    if (this.messagesComponent) {
      this.messagesComponent.scrollToMessage(messageId);
    }
  }

  private loadGroupMembers(groupId: string) {
    this.groupInfoApi.getGroupInfo(groupId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.groupMembers = response.data.members;
        }
      },
      error: (error) => {
        console.error('Error loading group members:', error);
        this.groupMembers = [];
      }
    });
  }
}