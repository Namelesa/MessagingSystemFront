import { Component, Input, ViewChild, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OtoChatListComponent } from '../../../features/oto-chats';
import { OtoChatApiService } from '../../../features/oto-chats';
import { FormsModule } from '@angular/forms';
import { BaseChatPageComponent, ChatLayoutComponent} from '../../../shared/chats';
import { OtoChat } from '../../../entities/oto-chats';
import { OtoChatMessagesComponent } from '../../../features/oto-messages';
import { AuthService } from '../../../entities/user/api/auht.service';
import { SendAreaComponent } from '../../../shared/chats-ui-elements';
import { OtoMessagesService } from '../../../features/oto-messages';
import { OtoMessage } from '../../../entities/oto-message';
import { StorageService } from '../../../shared/storage/storage.service';

@Component({
  selector: 'app-oto-chat-page',
  standalone: true,
  imports: [CommonModule, OtoChatListComponent, FormsModule, 
     ChatLayoutComponent, OtoChatMessagesComponent, SendAreaComponent],
  templateUrl: './oto-chat-page.html',
})
export class OtoChatPageComponent extends BaseChatPageComponent implements OnInit {
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
  
  @Input() foundedUser?: { nick: string, image: string };
  @Input() edit: string = '';

  @ViewChild(OtoChatMessagesComponent) messagesComponent?: OtoChatMessagesComponent;
  @ViewChild(OtoChatListComponent) chatListComponent?: OtoChatListComponent;
 
  constructor(
    private otoChatApi: OtoChatApiService, 
    private authService: AuthService, 
    private messageService: OtoMessagesService,
    private storageService: StorageService,
    private cdr: ChangeDetectorRef
  ) {
    super();
    this.apiService = this.otoChatApi;
    this.authService.waitForAuthInit().subscribe(() => {
      this.currentUserNickName = this.authService.getNickName() || '';
    });
  }

  override ngOnInit(): void {
    this.checkForOpenChatUser();  
  }

  private checkForOpenChatUser(): void {
    const userData = this.storageService.getOpenChatUserData();
    if (userData) {
      setTimeout(() => {
        this.onOpenChatWithUser(userData);
      }, 100);
    } else {
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
    } else {
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
        });
      } else {
        this.messageService.sendMessage(this.selectedChat, content).catch(error => {
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