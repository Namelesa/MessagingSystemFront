import { Observable, Subject, take, takeUntil, timer } from 'rxjs';
import { Router } from '@angular/router';
import { Component, Input, ViewChild, OnInit, ChangeDetectorRef, OnDestroy, HostListener, NgZone, ChangeDetectionStrategy, afterNextRender, Injector} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { OtoChat } from '../../model/oto.chat';
import { OtoMessage } from '../../../../entities/oto-message';
import { AuthService } from '../../../../entities/session';
import { SearchUser } from '../../../../entities/search-user';
import { OtoChatListComponent } from '../list/oto-chat.list.component';
import { OtoChatApiService } from '../../api/oto-chat/oto-chat-hub.api';
import { OtoMessagesService} from '../../api/oto-message/oto-messages.api';
import { FindUserStore } from '../../../../features/search-user';
import { OtoChatMessagesWidget } from '../../../../widgets/chat-messages';
import { ChatLayoutComponent } from '../../../../widgets/chat-layout';
import { BaseChatPageComponent} from '../../../../shared/chat';
import { ToastService, ToastComponent } from '../../../../shared/ui-elements';
import { SendAreaComponent, FileDropDirective, FileDropOverlayComponent } from '../../../../shared/send-message-area';
import { FileUploadStateService } from '../../model/file-state-service';
import { MessageStateService } from '../../model/message-state.service';
import { FileEditStateService } from '../../model/file-edit-state-service';
import { ChatFacadeService } from '../../model/chat-facade';
import { MessageOperationsService } from '../../model/message-operations-service';
import { E2eeService } from '../../../../features/keys-generator';

@Component({
  selector: 'app-oto-chat-page',
  standalone: true,
     imports: [CommonModule, OtoChatListComponent, FormsModule,
               ChatLayoutComponent, OtoChatMessagesWidget, SendAreaComponent, FileDropDirective, 
               FileDropOverlayComponent, ToastComponent, TranslateModule],
  templateUrl: './oto-chat-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtoChatPageComponent extends BaseChatPageComponent implements OnInit, OnDestroy {
  protected override apiService: OtoChatApiService;

  private destroy$ = new Subject<void>();
  private _messagesComponent?: OtoChatMessagesWidget;
 
  declare selectedChat?: string;
  declare selectedChatImage?: string;
  selectedOtoChat?: OtoChat;
  currentUserNickName: string = '';
  editingMessage?: OtoMessage;
  isDeleteModalOpen: boolean = false;
  messageToDelete?: OtoMessage;
  replyingToMessage?: OtoMessage;
  showUserDeletedNotification = false;
  deletedUserName = '';
  isDragOver = false;

  get draftText(): string {
    return this.chatFacade.getCurrentDraft();
  }

  set draftText(value: string) {
    this.chatFacade.setCurrentDraft(value);
  }
  
  @Input() foundedUser?: { nick: string, image: string };
  @Input() edit: string = '';
  @ViewChild(OtoChatMessagesWidget) 
  set messagesComponent(widget: OtoChatMessagesWidget | undefined) {
    this._messagesComponent = widget;
    this.messageStateService.setMessagesWidget(widget);
    this.chatFacade.setMessagesWidget(widget);
  }

  get messagesComponent(): OtoChatMessagesWidget | undefined {
    return this._messagesComponent;
  }

  @ViewChild(OtoChatListComponent) chatListComponent?: OtoChatListComponent;
  @ViewChild('modalFileInput') modalFileInput?: any;
  user$: Observable<SearchUser | null>;
  
  constructor(
    public otoChatApi: OtoChatApiService, 
    private authService: AuthService, 
    private messageService: OtoMessagesService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private findUserStore: FindUserStore,
    private toastService: ToastService,
    public fileUploadStateService: FileUploadStateService,
    private messageStateService: MessageStateService,
    private fileEditStateService: FileEditStateService,
    private chatFacade: ChatFacadeService,
    private messageOpsService: MessageOperationsService,
    private injector: Injector,
    private e2eeService: E2eeService
  ) {
    super();
    this.apiService = this.otoChatApi;
    this.authService.waitForAuthInit()
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => {
      this.currentUserNickName = this.authService.getNickName() || '';
      this.messageService.setCurrentUserId(this.currentUserNickName);
    });
  
  this.user$ = this.findUserStore.user$;
  }

  get uploadState$() {
    return this.fileUploadStateService.uploadState$;
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.setupUserDeletionSubscription();
    this.checkForOpenChatUser();
    this.setupMessagesWidgetAfterRender();
    this.initializeUserKeys();
  }

  private async initializeUserKeys(): Promise<void> {
    if (this.e2eeService.hasKeys()) {
      return;
    }
  
    console.warn('⚠️ No keys in memory - redirecting to login');
    this.router.navigate(['/login'], { 
      queryParams: { returnUrl: this.router.url } 
    });
  }

  override ngOnDestroy(): void {
    this.saveChatState();
    this.cleanupResources();
    this.destroy$.next();
    this.destroy$.complete();
  }

  decryptMessageMethod(sender: string, content: string, messageId?: string): Promise<string> {    
    return this.messageService.decryptMessageContent(sender, content, messageId).then(result => result || '');
  }

  loadHistoryMethod = (nick: string, take: number, skip: number): Observable<OtoMessage[]> => {
    return this.otoChatApi.loadChatHistory(nick, take, skip);
  };

  private setupUserDeletionSubscription(): void {
    this.apiService.userInfoDeleted$
      .pipe(takeUntil(this.destroy$))
      .subscribe(deletedUserInfo => {
        this.handleUserDeletion(deletedUserInfo);
      });
  }

  private setupMessagesWidgetAfterRender(): void {
    afterNextRender(() => {
      if (this.messagesComponent) {
        this.chatFacade.setMessagesWidget(this.messagesComponent);
      }
    }, { injector: this.injector });
  }

  private saveChatState(): void {
    if (this.selectedChat) {
      this.chatFacade.saveDraftForChat(this.selectedChat, this.draftText);
    }
  }

  private cleanupResources(): void {
    this.chatFacade.setMessagesWidget(undefined);
    this.messageStateService.setMessagesWidget(undefined);
    this.fileEditStateService.resetState();
  }

  hasDraft(chatNickName: string): boolean {
    return this.chatFacade.hasDraftForChat(chatNickName);
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

  onUserDeleted(deletedUserInfo: { userName: string }): void {
    this.handleUserDeletion(deletedUserInfo);
  }

  private resetChatState(options?: { saveDraft?: boolean; clearMessages?: boolean }): void {
  if (options?.saveDraft && this.selectedChat) {
    this.chatFacade.deleteDraftForChat(this.selectedChat);
  }

  if (options?.clearMessages && this.messagesComponent) {
    this.messagesComponent.clearMessagesForDeletedUser();
  }

  this.selectedChat = undefined;
  this.selectedChatImage = undefined;
  this.selectedOtoChat = undefined;
  this.editingMessage = undefined;
  this.replyingToMessage = undefined;
  this.closeDeleteModal();
  
  this.cdr.markForCheck();
  }

private closeChatWithDeletedUser(userName: string): void {
  this.resetChatState({ saveDraft: true, clearMessages: true });
  this.showUserDeletedNotification = true;
  this.deletedUserName = userName;
}

onChatClosedDueToUserDeletion(): void {
  this.resetChatState();
}

onChatUserDeletedFromMessages(): void {
  this.resetChatState();
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
      
      this.cdr.markForCheck();
    }
  }

  hideErrorNotification(): void {
    this.fileUploadStateService.hideErrorNotification();
  }

  private checkForOpenChatUser(): void {
    const nav = this.router.getCurrentNavigation();
    const stateFromNav = nav?.extras?.state as { openChatWithUser?: { nickName: string; image: string } } | undefined;
    const stateFromHistory = (window.history?.state as any) || {};
    const url = new URL(window.location.href);
    const queryNick = url.searchParams.get('openChatUser');
    const queryImage = url.searchParams.get('openChatImage');
    const userData = stateFromNav?.openChatWithUser || 
                     stateFromHistory.openChatWithUser || 
                     (queryNick ? { nickName: queryNick, image: queryImage || '' } : undefined);
    
    if (userData) {
      afterNextRender(() => {
        this.onOpenChatWithUser(userData);
        if (queryNick) {
          this.router.navigate([], { queryParams: {}, replaceUrl: true });
        }
      }, { injector: this.injector });
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
    if (this.selectedChat) {
      this.chatFacade.saveDraftForChat(this.selectedChat, this.draftText);
    }
  
    this.selectedChat = chat.nickName;
    this.selectedChatImage = chat.image;
    this.selectedOtoChat = { ...chat };
    this.editingMessage = undefined;
    this.replyingToMessage = undefined;
    this.chatFacade.switchToChatDraft(chat.nickName);
    
    afterNextRender(() => {
      if (this.messagesComponent) {
        this.messagesComponent.scrollToBottomAfterNewMessage();
      }
    }, { injector: this.injector });
  }

  onFoundedUser(userData: { nick: string, image: string }) {
    const foundedUserChat: OtoChat = {
      nickName: userData.nick,
      image: userData.image,
    };

    this.onOtoChatSelected(foundedUserChat);
    this.cdr.markForCheck();
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
          this.messageStateService.scrollToBottom();
        }).catch(error => {
          console.error('Error sending reply:', error);
        });
      } else {
        this.messageService.sendMessage(this.selectedChat, content).catch(error => {
          console.error('Error sending message:', error);
        });
        
        this.chatFacade.clearCurrentDraft();
        
        this.messageStateService.scrollToBottom();
      }
    }
  }

  onFileUpload(fileUploadEvent: { files: File[]; message?: string }) {
    if (!this.selectedChat || fileUploadEvent.files.length === 0) return;
    
    const result = this.fileUploadStateService.handleFileUpload(
      fileUploadEvent.files, 
      fileUploadEvent.message,
      !!this.editingMessage
    );
  
    if (result.errors.length > 0) {
      result.errors.forEach(error => {
        this.toastService.show(error.message, "error");
      });
    }
  
    if (result.validFiles.length > 0) {
      if (this.editingMessage) {
        this.addFilesToEditingMessage(result.validFiles, fileUploadEvent.message);
      } else {
        this.checkUploadSizeLimit();
      }
    }
  }

  private async addFilesToEditingMessage(files: File[], message?: string) {
    if (!this.editingMessage) return;
    
    try {
      this.editingMessage = await this.messageOpsService.addFilesToEditingMessage(
        this.editingMessage,
        files,
        message,
        this.currentUserNickName
      );
      this.cdr.markForCheck();
    } catch (error) {
      this.toastService.show('Failed to add files to message', 'error');
    }
  }

  private checkUploadSizeLimit(): void {
    const check = this.fileUploadStateService.checkUploadSizeLimit();
    if (check.isOverLimit) {
      this.toastService.show(
        `Total file size ${this.fileUploadStateService.formatFileSize(check.totalSize)} exceeds max limit of ${this.fileUploadStateService.formatFileSize(check.maxSize)}.`,
        "error"
      );
    } else if (check.isNearLimit) {
      this.toastService.show(
        `Warning: total file size ${this.fileUploadStateService.formatFileSize(check.totalSize)} is close to the limit (${this.fileUploadStateService.formatFileSize(check.maxSize)}).`,
        "error"
      );
    }
  }

  onFileValidationError(errors: Array<{
    fileName: string;
    error: 'size' | 'type';
    actualSize?: number;
    actualType?: string;
  }>) {
    const formattedErrors = this.fileUploadStateService.setFileValidationErrors(errors);
  
  formattedErrors.forEach(error => {
    this.toastService.show(error.message, "error");
  });
  
  timer(500).pipe(
    take(1),
    takeUntil(this.destroy$)
  ).subscribe(() => {
    this.hideErrorNotification();
  });
  }

  onFileDrop(files: File[]) {
    if (!this.selectedChat) return;
    
    const result = this.chatFacade.handleFileDrop(
      files,
      this.selectedChat,
      this.draftText,
      !!this.editingMessage
    );
    
    if (result.validFiles.length > 0 && this.editingMessage) {
      this.addFilesToEditingMessage(result.validFiles);
    }
  }

  onModalFileInputChange(event: Event) {
    this.chatFacade.handleModalFileInput(event);
  }

  async startUploadAndSend() {
    if (!this.selectedChat) return;
    
    const result = await this.chatFacade.uploadAndSendFiles(
      this.selectedChat,
      this.currentUserNickName
    );
    
    if (!result.success) {
      this.toastService.show('Upload failed', 'error');
    }
  }
      
  cancelFileUpload(index: number) {
    this.chatFacade.cancelFileUpload(index);
  }

  removeFileFromList(index: number) {
    this.chatFacade.removeFileFromList(index);
  }

  closeUploadModal() {
    this.chatFacade.closeUploadModal();
  }

  onEditMessage(message: OtoMessage) {
    const result = this.messageOpsService.startEditMessage(
      message, 
      this.messagesComponent
    );
    
    this.editingMessage = result.editingMessage;
    this.replyingToMessage = undefined;
    this.cdr.markForCheck();
  }
  
  async onEditComplete(editData: { messageId: string; content: string }) {
    const result = await this.messageOpsService.completeEdit(
      editData,
      this.currentUserNickName,
      this.messagesComponent
    );
    
    if (result.success) {
      this.editingMessage = undefined;
      this.cdr.markForCheck();
    } else {
      this.toastService.show('Failed to save changes', 'error');
    }
  }

  async onEditCancel() {
    await this.messageOpsService.cancelEdit(
      this.editingMessage,
      this.currentUserNickName
    );
    
    this.editingMessage = undefined;
    this.cdr.markForCheck();
  }

  get isEditFileUploading(): boolean {
    return this.fileEditStateService.isEditFileUploading;
  }

  async onEditFile(editData: { messageId: string; file: any }) {
    if (!editData.file?.file || !editData.messageId || !this.editingMessage) return;
    
    this.fileEditStateService.incrementEditFileUploadingCount();
    this.cdr.markForCheck();
  
    try {
      const result = await this.messageOpsService.replaceFileInMessage(
        editData.file,
        editData.file.file,
        editData.messageId,
        this.editingMessage,
        this.currentUserNickName,
        this.messagesComponent
      );
  
      this.editingMessage = result.updatedEditingMessage;
      
      if (result.updatedMessagesArray && this.messagesComponent) {
        this.messagesComponent.messages = result.updatedMessagesArray;
      }
      
      this.cdr.markForCheck();
    } catch (err) {
      this.toastService.show('Failed to replace file', 'error');
    } finally {
      this.fileEditStateService.decrementEditFileUploadingCount();
      this.cdr.markForCheck();
    }
  }
        
  onDeleteMessage(message: OtoMessage) {
    this.messageToDelete = message;
    this.isDeleteModalOpen = true;
  }

  deleteForBoth: boolean = false;

  public forceCompleteMessageUpdate(messageId: string): void {
    this.chatFacade.forceCompleteMessageUpdate(messageId, this.cdr);
  }

  async onConfirmDelete() {
    if (!this.messageToDelete) return;
  
    const result = await this.messageOpsService.deleteMessage(
      this.messageToDelete,
      this.deleteForBoth,
      this.currentUserNickName
    );
  
    if (result.success) {
      this.closeDeleteModal();
    } else {
      this.toastService.show('Failed to delete message', 'error');
    }
  }  

  isMyMessage(msg: OtoMessage): boolean {
    return msg.sender?.trim().toLowerCase() === this.currentUserNickName.trim().toLowerCase();
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
    this.messageStateService.scrollToMessage(messageId);
  }

  onUploadEnter(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const state = this.fileUploadStateService.getUploadState();
      if (!state.isUploading && state.uploadItems.length > 0) {
        this.startUploadAndSend();
      }
    }
  }
  
  @HostListener('document:keydown', ['$event'])
  onDocumentKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (this.isDeleteModalOpen) {
        this.closeDeleteModal();
        return;
      }
      if (this.editingMessage) {
        this.onEditCancel();
        return;
      }
      if (this.replyingToMessage) {
        this.onCancelReply();
        return;
      }
      this.selectedChat = undefined;
      this.selectedChatImage = undefined;
      this.selectedOtoChat = undefined;
      this.cdr.markForCheck();
      this.closeUploadModal();
    }
  }
}