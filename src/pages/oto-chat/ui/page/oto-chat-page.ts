import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { Component, Input, ViewChild, OnInit, ChangeDetectorRef, OnDestroy, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OtoChat } from '../../model/oto.chat';
import { OtoChatApiService } from '../../api/oto-chat/oto-chat-hub.api';
import { ChatFacadeService } from '../../service/chat-facade';
import { UserDeletionInfo, UserUpdateInfo } from '../../service/user-state.service';
import { OtoChatListComponent } from '../list/oto-chat.list.component';
import { OtoMessage } from '../../../../entities/oto-message';
import { OtoChatMessagesWidget } from '../../../../widgets/chat-messages';
import { ChatLayoutComponent } from '../../../../widgets/chat-layout';
import { BaseChatPageComponent} from '../../../../shared/chat';
import { SendAreaComponent } from '../../../../shared/send-message-area';

@Component({
  selector: 'app-oto-chat-page',
  standalone: true,
  imports: [CommonModule, OtoChatListComponent, FormsModule, 
     ChatLayoutComponent, OtoChatMessagesWidget, SendAreaComponent],
  templateUrl: './oto-chat-page.html',
})
export class OtoChatPageComponent extends BaseChatPageComponent implements OnInit, OnDestroy {
  protected override apiService = inject(OtoChatApiService);
  private chatFacade = inject(ChatFacadeService);

  completeChatState$ = this.chatFacade.completeChatState$;
  chatState$ = this.chatFacade.chatState$;
  displayChatInfo$ = this.chatFacade.displayChatInfo$;
  userDeletedNotification$ = this.chatFacade.userDeletedNotification$;
  messageState$ = this.chatFacade.messageState$;
  searchState$ = this.chatFacade.searchState$;
  user$ = this.chatFacade.user$;
  
  @Input() foundedUser?: { nick: string, image: string };
  @Input() edit: string = '';

  @ViewChild(OtoChatMessagesWidget) messagesComponent?: OtoChatMessagesWidget;
  @ViewChild(OtoChatListComponent) chatListComponent?: OtoChatListComponent;
  
  private subscriptions: Subscription[] = [];
 
  editingMessage$ = this.messageState$.pipe(
    map(state => state.editingMessage)
  );

  replyingToMessage$ = this.messageState$.pipe(
    map(state => state.replyingToMessage)
  );

  isDeleteModalOpen$ = this.messageState$.pipe(
    map(state => state.isDeleteModalOpen)
  );

  deleteForBoth$ = this.messageState$.pipe(
    map(state => state.deleteForBoth)
  );

  get editingMessage(): OtoMessage | undefined {
    return this.chatFacade.getCurrentMessageState().editingMessage;
  }

  get replyingToMessage(): OtoMessage | undefined {
    return this.chatFacade.getCurrentMessageState().replyingToMessage;
  }

  get isDeleteModalOpen(): boolean {
    return this.chatFacade.getCurrentMessageState().isDeleteModalOpen;
  }

  get deleteForBoth(): boolean {
    return this.chatFacade.getCurrentMessageState().deleteForBoth;
  }

  set deleteForBoth(value: boolean) {
    this.chatFacade.setDeleteForBoth(value);
  }

  constructor(
    private otoChatApi: OtoChatApiService,
    private cdr: ChangeDetectorRef,
  ) {
    super();
    this.apiService = this.otoChatApi;
    this.completeChatState$ = this.chatFacade.completeChatState$;
  }

  override ngOnInit(): void {
    this.chatFacade.initializeChat();
    this.subscribeToEvents();
    
    setTimeout(() => {
      this.chatFacade.handlePendingChatUser(this.chatListComponent);
    }, 100);
  }

  override ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private subscribeToEvents(): void {
    const userDeletedSub = this.chatFacade.subscribeToUserDeletion(
      deletedUserInfo => this.handleUserDeletion(deletedUserInfo)
    );

    const userInfoSub = this.chatFacade.subscribeToUserInfoUpdates(
      userInfo => this.handleUserInfoUpdate(userInfo)
    );

    this.subscriptions.push(userDeletedSub, userInfoSub);
  }

  private handleUserDeletion(deletedUserInfo: UserDeletionInfo): void {
    const result = this.chatFacade.handleUserDeletion(deletedUserInfo);
    
    if (result.shouldCloseChat) {
      this.closeChatWithDeletedUser();
    }
  }

  private handleUserInfoUpdate(userInfo: UserUpdateInfo): void {
    this.chatFacade.handleUserInfoUpdate(userInfo);
  }
  
  onUserSearchQueryChange = (query: string) => this.chatFacade.onSearchQueryChange(query);
  onUserSearchFocus = () => this.chatFacade.onSearchFocus();
  onUserSearchClear = () => this.chatFacade.clearSearch();
  
  onOtoChatSelected(chat: OtoChat): void {
    this.chatFacade.selectChat(chat);
    this.cdr.detectChanges();
  }

  onFoundedUser(userData: { nick: string, image: string }): void {
    this.chatFacade.selectFoundUser(userData);
    this.cdr.detectChanges();
  }

  onOpenChatWithUser(userData: { nickName: string, image: string }): void {
    if (this.chatListComponent) {
      this.chatListComponent.openChatWithUser({ nick: userData.nickName, image: userData.image });
    } else {
      this.onFoundedUser({ nick: userData.nickName, image: userData.image });
    }
  }
  
  onSendMessage = (content: string) => this.chatFacade.sendMessage(content);
  onEditMessage = (message: OtoMessage) => this.chatFacade.startEditMessage(message);
  onEditComplete = (editData: { messageId: string; content: string }) => 
    this.chatFacade.completeEdit(editData.messageId, editData.content);
  onEditCancel = () => this.chatFacade.cancelEdit();
  onDeleteMessage = (message: OtoMessage) => this.chatFacade.startDeleteMessage(message);
  onConfirmDelete = () => this.chatFacade.confirmDelete();
  closeDeleteModal = () => this.chatFacade.closeDeleteModal();
  onReplyToMessage = (message: OtoMessage) => this.chatFacade.startReplyToMessage(message);
  onCancelReply = () => this.chatFacade.cancelReply();

  onScrollToMessage(messageId: string): void {
    this.messagesComponent?.scrollToMessage(messageId);
  }

  private closeChatWithDeletedUser(): void {
    this.messagesComponent?.clearMessagesForDeletedUser();
    this.cdr.detectChanges();
  }

  onChatClosedDueToUserDeletion(): void {
    this.chatFacade.closeCurrentChat();
    this.cdr.detectChanges();
  }

  onChatUserDeletedFromMessages(): void {
    this.chatFacade.closeCurrentChat();
    this.cdr.detectChanges();
  }

  onSelectedChatUserUpdated(): void {
    this.cdr.detectChanges();
  }

  onUserDeleted = (deletedUserInfo: { userName: string }) => {};
  onUserInfoUpdated = (userInfo: { userName: string, image?: string, updatedAt: string, oldNickName: string }) => {};

  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    this.chatFacade.closeCurrentChat();
    this.cdr.detectChanges();
  }
}