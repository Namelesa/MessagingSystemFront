import { Observable } from 'rxjs';
import { Component,  Input, ViewChild, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GroupMessagesApiService } from '../../api/group-message/group-messages.api';
import { GroupInfoApiService } from '../../api/group-chat/group-info.api';
import { GroupChatApiService } from '../../api/group-chat/group-chat-hub.api';
import { GroupMember } from '../../model/group-info.model';
import { GroupChatListComponent } from '../group-chat-list/group-chat.list.component';
import { GroupMessage } from '../../../../entities/group-message';
import { AuthService } from '../../../../entities/session';
import { SearchUser } from '../../../../entities/search-user';
import { GroupInfoModalComponent } from '../group-info-modal/group-info-modal.component';
import { FindUserStore } from '../../../../features/search-user';
import { ChatLayoutComponent } from '../../../../widgets/chat-layout';
import { GroupMessagesWidget } from '../../../../widgets/chat-messages';
import { BaseChatPageComponent } from '../../../../shared/chat';
import { SendAreaComponent } from '../../../../shared/send-message-area';

@Component({
  selector: 'app-group-chat-page',
  standalone: true,
  imports: [CommonModule, GroupChatListComponent, 
    FormsModule, ChatLayoutComponent, GroupInfoModalComponent, 
    GroupMessagesWidget, SendAreaComponent],
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

  @ViewChild(GroupMessagesWidget) messagesComponent?: GroupMessagesWidget;
  @ViewChild(GroupChatListComponent) chatListComponent?: GroupChatListComponent;

  user$: Observable<SearchUser | null>;
  userSuggestion: SearchUser[] = [];

  constructor(
    private groupChatApi: GroupChatApiService, 
    public groupMessages: GroupMessagesApiService,
    private authService: AuthService, 
    private groupInfoApi: GroupInfoApiService,
    private cdr: ChangeDetectorRef,
    private findUserStore: FindUserStore,
    private router: Router,
  ) {
    super();
    this.apiService = this.groupChatApi;
    this.authService.waitForAuthInit().subscribe(() => {
      this.currentUserNickName = this.authService.getNickName() || '';
    });
    this.user$ = this.findUserStore.user$;
    this.findUserStore.user$.subscribe(u => {
      this.userSuggestion = u ? [u] : [];
    });
  }

  override ngOnInit(): void {
    super.ngOnInit();

    this.groupChatApi.groupUpdated$.subscribe((updatedGroup) => {
      if (updatedGroup && updatedGroup.groupId === this.selectedGroupId) {
        this.selectedChat = updatedGroup.groupName;
        this.selectedChatImage = updatedGroup.image;
        this.cdr.detectChanges();
      }
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
    if (this.selectedGroupId) {
      setTimeout(() => {
        this.loadGroupInfo();
      }, 100);
    }
  }

  private loadGroupInfo() {
    if (!this.selectedGroupId) return;
    
    this.groupInfoApi.getGroupInfo(this.selectedGroupId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.selectedChat = response.data.groupName;
          this.selectedChatImage = response.data.image;
          this.groupMembers = response.data.members;
          
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Error loading updated group info:', error);
      }
    });
  }

  onUserSearchQueryChange(query: string) {
    const trimmed = query.trim();
    if (trimmed) {
      this.findUserStore.findUser(trimmed);
    } else {
      this.findUserStore.clearUser();
    }
  }

  onUserSearchFocus() {
    this.findUserStore.clearUser();
  }

  onUserSearchClear() {
    this.findUserStore.clearUser();
  }

  onModalUserSearchQueryChange(q: string) {
    const trimmed = q.trim();
    trimmed ? this.findUserStore.findUser(trimmed) : this.findUserStore.clearUser();
  }

  async onAddMembersRequested(nicks: string[]) {
    if (!this.selectedGroupId || nicks.length === 0) return;
    try {
      await this.groupChatApi.addGroupMembers(this.selectedGroupId, { users: nicks });
      this.groupChatApi.refreshGroups();
      this.onGroupUpdated();
    } catch {}
  }

  async onRemoveMemberRequested(nick: string) {
    if (!this.selectedGroupId) return;
    try {
      await this.groupChatApi.removeGroupMembers(this.selectedGroupId, { users: [nick] });
      this.groupChatApi.refreshGroups();
      this.onGroupUpdated();
    } catch {}
  }

  async onDeleteGroupRequested() {
    if (!this.selectedGroupId) return;
    try {
      await this.groupChatApi.deleteGroup(this.selectedGroupId);
      this.groupChatApi.refreshGroups();
      this.closeGroupInfoModal();
    } catch {}
  }

  onOpenChatWithUser(userData: { nickName: string, image: string }) {
    this.router.navigate(['/otoChats'], {
      state: { openChatWithUser: userData },
      queryParams: { openChatUser: userData.nickName, openChatImage: userData.image || '' },
    });
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
          
          if (groupId === this.selectedGroupId) {
            this.selectedChat = response.data.groupName;
            this.selectedChatImage = response.data.image;
            this.cdr.detectChanges();
          }
        }
      },
      error: (error) => {
        console.error('Error loading group members:', error);
        this.groupMembers = [];
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscapePressed() {
  this.resetSelectedChat();
}

private resetSelectedChat(): void {
  this.selectedChat = undefined;
  this.selectedChatImage = undefined;
  this.editingMessage = undefined;
  this.replyingToMessage = undefined;
  this.closeDeleteModal();
  this.cdr.detectChanges();
}
}