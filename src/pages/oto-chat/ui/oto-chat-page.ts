import { Observable, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { Component, Input, ViewChild, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OtoChat } from '../model/oto.chat';
import { OtoMessage } from '../../../entities/oto-message';
import { AuthService } from '../../../entities/session';
import { SearchUser } from '../../../entities/search-user';
import { OtoChatListComponent } from './oto-chat.list.component';
import { OtoChatApiService } from '../api/oto-chat-hub.api';
import { OtoMessagesService} from '../api/oto-messages.api';
import { FindUserStore } from '../../../features/search-user';
import { OtoChatMessagesWidget } from '../../../widgets/chat-messages';
import { ChatLayoutComponent } from '../../../widgets/chat-layout';
import { BaseChatPageComponent} from '../../../shared/chat';
import { SendAreaComponent } from '../../../shared/send-message-area';

@Component({
  selector: 'app-oto-chat-page',
  standalone: true,
   imports: [CommonModule, OtoChatListComponent, FormsModule, 
     ChatLayoutComponent, OtoChatMessagesWidget, SendAreaComponent],
  templateUrl: './oto-chat-page.html',
})
export class OtoChatPageComponent extends BaseChatPageComponent implements OnInit, OnDestroy {
  protected override apiService: OtoChatApiService;
 
  declare selectedChat?: string;
  declare selectedChatImage?: string;
  selectedOtoChat?: OtoChat;
  currentUserNickName: string = '';
  editingMessage?: OtoMessage;
  
  isDeleteModalOpen: boolean = false;
  messageToDelete?: OtoMessage;
  
  replyingToMessage?: OtoMessage;
  
  forceMessageComponentReload = false;
  
  showUserDeletedNotification = false;
  deletedUserName = '';
  
  @Input() foundedUser?: { nick: string, image: string };
  @Input() edit: string = '';

  @ViewChild(OtoChatMessagesWidget) messagesComponent?: OtoChatMessagesWidget;
  @ViewChild(OtoChatListComponent) chatListComponent?: OtoChatListComponent;
  
  private subscriptions: Subscription[] = [];
  user$: Observable<SearchUser | null>;
 
  constructor(
    private otoChatApi: OtoChatApiService, 
    private authService: AuthService, 
    private messageService: OtoMessagesService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private findUserStore: FindUserStore
  ) {
    super();
    this.apiService = this.otoChatApi;
    this.authService.waitForAuthInit().subscribe(() => {
      this.currentUserNickName = this.authService.getNickName() || '';
    });
    this.user$ = this.findUserStore.user$;
  }

  override ngOnInit(): void {
    this.checkForOpenChatUser();
    this.subscribeToUserDeletion();
  }

  override ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private subscribeToUserDeletion(): void {
    const userDeletedSubscription = this.apiService.userInfoDeleted$.subscribe(deletedUserInfo => {
      this.handleUserDeletion(deletedUserInfo);
    });

    this.subscriptions.push(userDeletedSubscription);
  }

  private handleUserDeletion(deletedUserInfo: { userName: string }): void {
    
    if (this.selectedChat === deletedUserInfo.userName) {
      this.closeChatWithDeletedUser(deletedUserInfo.userName);

      this.showUserDeletedNotification = true;
      this.deletedUserName = deletedUserInfo.userName;
    }
  }

  onUserSearchQueryChange(query: string) {
    const trimmed = query.trim();
    if (trimmed) this.findUserStore.findUser(trimmed);
    else this.findUserStore.clearUser();
  }

  onUserSearchFocus() {
    this.findUserStore.clearUser();
  }

  onUserSearchClear() {
    this.findUserStore.clearUser();
  }

  private closeChatWithDeletedUser(userName: string): void {
    this.selectedChat = undefined;
    this.selectedChatImage = undefined;
    this.selectedOtoChat = undefined;
    
    this.editingMessage = undefined;
    this.replyingToMessage = undefined;
    
    this.closeDeleteModal();
    
    if (this.messagesComponent) {
      this.messagesComponent.clearMessagesForDeletedUser();
    }
    
    this.cdr.detectChanges();
  }

  onChatClosedDueToUserDeletion(): void {
    this.selectedChat = undefined;
    this.selectedChatImage = undefined;
    this.selectedOtoChat = undefined;
    this.editingMessage = undefined;
    this.replyingToMessage = undefined;
    this.closeDeleteModal();
    this.cdr.detectChanges();
  }

  onUserDeleted(deletedUserInfo: { userName: string }): void {
  }

  onChatUserDeletedFromMessages(): void {
    this.selectedChat = undefined;
    this.selectedChatImage = undefined;
    this.selectedOtoChat = undefined;
    this.editingMessage = undefined;
    this.replyingToMessage = undefined;
    this.closeDeleteModal();
    this.cdr.detectChanges();
  }

  onSelectedChatUserUpdated(updateInfo: { oldNickName: string, newNickName: string, image?: string }): void {
    
    if (this.selectedChat === updateInfo.oldNickName) {
      this.selectedChat = updateInfo.newNickName;
      
      if (updateInfo.image) {
        this.selectedChatImage = updateInfo.image;
      }
      
      if (this.selectedOtoChat) {
        this.selectedOtoChat = {
          ...this.selectedOtoChat,
          nickName: updateInfo.newNickName,
          image: updateInfo.image || this.selectedOtoChat.image
        };
      }
      
      this.cdr.detectChanges();
    }
  }

  private checkForOpenChatUser(): void {
    const nav = this.router.getCurrentNavigation();
    const stateFromNav = nav?.extras?.state as { openChatWithUser?: { nickName: string; image: string } } | undefined;
    const stateFromHistory = (window.history?.state as any) || {};
    const url = new URL(window.location.href);
    const queryNick = url.searchParams.get('openChatUser');
    const queryImage = url.searchParams.get('openChatImage');
    const userData = stateFromNav?.openChatWithUser || stateFromHistory.openChatWithUser || (queryNick ? { nickName: queryNick, image: queryImage || '' } : undefined);
    if (userData) {
      setTimeout(() => {
        this.onOpenChatWithUser(userData);
      }, 100);
    }
  }

  onOpenChatWithUser(userData: { nickName: string, image: string }) {
    if (this.chatListComponent) {
      this.chatListComponent.openChatWithUser({ nick: userData.nickName, image: userData.image });
    } else {
      this.onFoundedUser({ nick: userData.nickName, image: userData.image });
    }
  }

  onOtoChatSelected(chat: OtoChat) {      
    this.selectedChat = chat.nickName;
    this.selectedChatImage = chat.image;
    this.selectedOtoChat = chat;
    this.editingMessage = undefined;
    this.replyingToMessage = undefined;
    
    this.forceMessageComponentReload = true;
    setTimeout(() => {
      this.forceMessageComponentReload = false;
      this.cdr.detectChanges();
    }, 0);
    
    if (this.messagesComponent) {
      this.selectedOtoChat = { ...chat };
      this.cdr.detectChanges();

      setTimeout(() => {
        if (this.messagesComponent) {
          this.cdr.detectChanges();
        }
      }, 100);
    }
  }

  onFoundedUser(userData: { nick: string, image: string }) {
    const foundedUserChat: OtoChat = {
      nickName: userData.nick,
      image: userData.image,
    };

    this.onOtoChatSelected(foundedUserChat);
    this.cdr.detectChanges();
  }

  onUserInfoUpdated(userInfo: { userName: string, image?: string, updatedAt: string, oldNickName: string }): void {
    
    if (userInfo.oldNickName === this.currentUserNickName || userInfo.userName === this.currentUserNickName) {
      this.currentUserNickName = userInfo.userName;
    }
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
 
  onSendMessage(content: string) {
    if (this.selectedChat) {
      if (this.replyingToMessage) {
        this.messageService.replyToMessage(
          this.replyingToMessage.messageId, 
          content, 
          this.selectedChat
        ).then(() => {
          this.replyingToMessage = undefined;
        }).catch(error => {
          console.error('Error sending reply:', error);
        });
      } else {
        this.messageService.sendMessage(this.selectedChat, content).catch(error => {
          console.error('Error sending message:', error);
        });
      }
    }
  }

  onEditMessage(message: OtoMessage) {
    this.editingMessage = message;
    this.replyingToMessage = undefined;
  }

  async onEditComplete(editData: { messageId: string; content: string }) {
    try {
      await this.messageService.editMessage(editData.messageId, editData.content);
      this.editingMessage = undefined;
    } catch (error) {
      console.error('Error editing message:', error);
    }
  }

  onEditCancel() {
    this.editingMessage = undefined;
  }

  onDeleteMessage(message: OtoMessage) {
    this.messageToDelete = message;
    this.isDeleteModalOpen = true;
  }

  deleteForBoth: boolean = false;

  async onConfirmDelete() {
    if (this.messageToDelete && this.selectedChat) {
      const deleteType = this.deleteForBoth ? 'hard' : 'soft';
      try {
        await this.messageService.deleteMessage(this.messageToDelete.messageId, deleteType);
        this.closeDeleteModal();
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    }
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.messageToDelete = undefined;
    this.deleteForBoth = false;
  }

  onReplyToMessage(message: OtoMessage) {
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
}