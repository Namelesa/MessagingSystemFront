import { Observable } from 'rxjs';
import { Component,  Input, ViewChild, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GroupMessagesApiService } from '../../api/group-message/group-messages.api';
import { GroupChatApiService } from '../../api/group-chat/group-chat-hub.api';
import { GroupMember } from '../../model/group-info.model';
import { GroupChat } from '../../model/group.chat';
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
import { GroupUserStateService } from '../../service/group-user-state.service';
import { GroupMessageStateService } from '../../service/group-message-state.service';
import { GroupNavigationService } from '../../service/group-navigation.service';
import { GroupSearchService } from '../../service/group-search.service';

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

  groupInfoModalOpen = false;

  @Input() edit: string = '';

  @ViewChild(GroupMessagesWidget) messagesComponent?: GroupMessagesWidget;
  @ViewChild(GroupChatListComponent) chatListComponent?: GroupChatListComponent;

  user$: Observable<SearchUser | null>;
  userSuggestion: SearchUser[] = [];

  constructor(
    private groupChatApi: GroupChatApiService,
    public groupMessages: GroupMessagesApiService,
    
    private cdr: ChangeDetectorRef,
    private findUserStore: FindUserStore,
    private router: Router,
    public groupUserState: GroupUserStateService,
    public groupMessageState: GroupMessageStateService,
    private groupNavigation: GroupNavigationService,
    private groupSearch: GroupSearchService,
  ) {
    super();
    this.apiService = this.groupChatApi;
    this.user$ = this.groupSearch.user$;
    this.findUserStore.user$.subscribe((u: SearchUser | null) => {
      this.userSuggestion = u ? [u] : [];
    });
  }

  override ngOnInit(): void {
    super.ngOnInit();

    this.groupChatApi.groupUpdated$.subscribe((updatedGroup: GroupChat) => {
      const selectedId = this.groupUserState.getSelectedGroupId();
      if (updatedGroup && updatedGroup.groupId === selectedId) {
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
    if (groupId) {
      this.groupNavigation.selectGroupByIds(groupId, nickname, image);
    }
  }

  onHeaderClick() {
    this.groupInfoModalOpen = true;
  }

  closeGroupInfoModal() {
    this.groupInfoModalOpen = false;
  }

  onGroupUpdated() {
    const groupId = this.groupUserState.getSelectedGroupId();
    if (groupId) {
      setTimeout(() => this.groupUserState.loadGroupInfo(groupId), 100);
    }
  }

  onUserSearchQueryChange(query: string) {
    this.groupSearch.onSearchQueryChange(query);
  }

  onUserSearchFocus() {
    this.groupSearch.onFocus();
  }

  onUserSearchClear() {
    this.groupSearch.clear();
  }

  onModalUserSearchQueryChange(q: string) {
    const trimmed = q.trim();
    trimmed ? this.findUserStore.findUser(trimmed) : this.findUserStore.clearUser();
  }

  async onAddMembersRequested(nicks: string[]) {
    const groupId = this.groupUserState.getSelectedGroupId();
    if (!groupId || nicks.length === 0) return;
    try {
      await this.groupUserState.addMembers(groupId, nicks);
      this.onGroupUpdated();
    } catch {}
  }

  async onRemoveMemberRequested(nick: string) {
    const groupId = this.groupUserState.getSelectedGroupId();
    if (!groupId) return;
    try {
      await this.groupUserState.removeMember(groupId, nick);
      this.onGroupUpdated();
    } catch {}
  }

  async onDeleteGroupRequested() {
    const groupId = this.groupUserState.getSelectedGroupId();
    if (!groupId) return;
    try {
      await this.groupUserState.deleteGroup(groupId);
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
    this.groupMessageState.sendMessage(message);
  }

  onEditMessage(message: GroupMessage) {
    this.groupMessageState.startEditMessage(message);
  }

  async onEditComplete(editData: { messageId: string; content: string }) {
    try { await this.groupMessageState.completeEdit(editData.messageId, editData.content); } catch {}
  }

  onEditCancel() { this.groupMessageState.cancelEdit(); }

  onDeleteMessage(message: GroupMessage) { this.groupMessageState.startDeleteMessage(message); }

  async onConfirmDelete() { await this.groupMessageState.confirmDelete(); }

  closeDeleteModal() { this.groupMessageState.closeDeleteModal(); }

  onReplyToMessage(message: GroupMessage) { this.groupMessageState.startReplyToMessage(message); }

  onCancelReply() { this.groupMessageState.cancelReply(); }

  onScrollToMessage(messageId: string) {
    if (this.messagesComponent) {
      this.messagesComponent.scrollToMessage(messageId);
    }
  }

  private loadGroupMembers(groupId: string) { this.groupUserState.loadGroupInfo(groupId); }

  @HostListener('document:keydown.escape')
  onEscapePressed() {
  this.resetSelectedChat();
}

  private resetSelectedChat(): void {
    this.selectedChat = undefined;
    this.selectedChatImage = undefined;
    this.groupMessageState.resetAll();
    this.cdr.detectChanges();
  }

  // Derived state for template
  get selectedGroupId(): string | undefined {
    return this.groupUserState.getSelectedGroupId();
  }

  get groupMembers(): GroupMember[] {
    return this.groupUserState.getMembers();
  }

  get currentUserNickName(): string {
    return this.groupUserState.getCurrentUserNickName();
  }

  get editingMessage(): GroupMessage | undefined {
    return this.groupMessageState.getEditingMessage();
  }

  get replyingToMessage(): GroupMessage | undefined {
    return this.groupMessageState.getReplyingToMessage();
  }

  get isDeleteModalOpen(): boolean {
    return this.groupMessageState.getIsDeleteModalOpen();
  }

  get deleteForBoth(): boolean {
    return this.groupMessageState.getDeleteForBoth();
  }
  set deleteForBoth(value: boolean) {
    this.groupMessageState.setDeleteForBoth(value);
  }
}

// Expose derived state for template bindings
export interface __GroupChatPageBindings {}