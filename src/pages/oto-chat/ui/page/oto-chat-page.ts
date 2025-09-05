import { Observable, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { Component, Input, ViewChild, OnInit, ChangeDetectorRef, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OtoChat } from '../../model/oto.chat';
import { OtoMessage } from '../../../../entities/oto-message';
import { AuthService } from '../../../../entities/session';
import { SearchUser } from '../../../../entities/search-user';
import { OtoChatListComponent } from '../list/oto-chat.list.component';
import { OtoChatApiService } from '../../api/oto-chat/oto-chat-hub.api';
import { OtoMessagesService} from '../../api/oto-message/oto-messages.api';
import { FileUploadApiService } from '../../../../features/file-sender';
import { FindUserStore } from '../../../../features/search-user';
import { OtoChatMessagesWidget } from '../../../../widgets/chat-messages';
import { ChatLayoutComponent } from '../../../../widgets/chat-layout';
import { BaseChatPageComponent} from '../../../../shared/chat';
import { ToastService, ToastComponent } from '../../../../shared/ui-elements';
import { SendAreaComponent, FileDropDirective, FileDropOverlayComponent } from '../../../../shared/send-message-area';

@Component({
  selector: 'app-oto-chat-page',
  standalone: true,
     imports: [CommonModule, OtoChatListComponent, FormsModule,
    ChatLayoutComponent, OtoChatMessagesWidget, SendAreaComponent, FileDropDirective, FileDropOverlayComponent, ToastComponent],
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
  isDragOver = false;

  isUploadModalOpen = false;
  uploadCaption: string = '';
  uploadItems: Array<{ 
    file: File; 
    name: string; 
    size: number; 
    progress: number; 
    url?: string; 
    error?: string;
    abort?: () => void;
    subscription?: any;
  }> = [];
  isUploading = false;
  
  @Input() foundedUser?: { nick: string, image: string };
  @Input() edit: string = '';

  @ViewChild(OtoChatMessagesWidget) messagesComponent?: OtoChatMessagesWidget;
  @ViewChild(OtoChatListComponent) chatListComponent?: OtoChatListComponent;
  @ViewChild('modalFileInput') modalFileInput?: any;
  
  private subscriptions: Subscription[] = [];
  user$: Observable<SearchUser | null>;

  maxFileSize: number = 1024 * 1024 * 1024;

  fileValidationErrors: Array<{
    fileName: string;
    error: 'size' | 'type';
    actualSize?: number;
    actualType?: string;
    message: string;
  }> = [];
  showErrorNotification = false;
 
  constructor(
    public otoChatApi: OtoChatApiService, 
    private authService: AuthService, 
    private messageService: OtoMessagesService,
    private fileUploadApi: FileUploadApiService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private findUserStore: FindUserStore,
    private toastService: ToastService
  ) {
    super();
    this.apiService = this.otoChatApi;
    this.authService.waitForAuthInit().subscribe(() => {
      this.currentUserNickName = this.authService.getNickName() || '';
    });
    this.user$ = this.findUserStore.user$;
  }

  override ngOnInit(): void {
    super.ngOnInit();
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

  hideErrorNotification(): void {
    this.showErrorNotification = false;
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
        if (queryNick) {
          this.router.navigate([], { queryParams: {}, replaceUrl: true });
        }
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

  isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
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

  public formatFileSize(size: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let index = 0;
    let formattedSize = size;

    while (formattedSize >= 1024 && index < units.length - 1) {
      formattedSize /= 1024;
      index++;
    }

    return `${formattedSize.toFixed(2)} ${units[index]}`;
  }

  onFileUpload(fileUploadEvent: { files: File[]; message?: string }) {
    if (!this.selectedChat || fileUploadEvent.files.length === 0) return;
    
    const { validFiles, errors } = this.validateFiles(fileUploadEvent.files);
  
    if (errors.length > 0) {
      this.onFileValidationError(errors);
    }
  
    if (validFiles.length > 0) {
      this.uploadItems = validFiles.map(f => ({ 
        file: f, 
        name: f.name, 
        size: f.size, 
        progress: 0 
      }));
      this.uploadCaption = fileUploadEvent.message || '';
      this.isUploadModalOpen = true;
  
      this.checkUploadSizeLimit();
    }
  }  

  private validateFiles(files: File[]): { validFiles: File[], errors: Array<{
    fileName: string;
    error: 'size' | 'type';
    actualSize?: number;
    actualType?: string;
  }> } {
    const validFiles: File[] = [];
    const errors: Array<{
      fileName: string;
      error: 'size' | 'type';
      actualSize?: number;
      actualType?: string;
    }> = [];
  
    files.forEach(file => {
      if (file.size > this.maxFileSize) {
        errors.push({
          fileName: file.name,
          error: 'size',
          actualSize: file.size,
          actualType: file.type
        });
        return;
      }

      validFiles.push(file);
    });
  
    return { validFiles, errors };
  }

  private getTotalUploadSize(): number {
    return this.uploadItems.reduce((sum, item) => sum + item.size, 0);
  }

  private checkUploadSizeLimit(): void {
    const totalSize = this.getTotalUploadSize();
    const maxSize = this.maxFileSize;
    const warningThreshold = maxSize * 0.9; 
  
    if (totalSize > maxSize) {
      this.toastService.show(
        `Total file size ${this.formatFileSize(totalSize)} exceeds max limit of ${this.formatFileSize(maxSize)}.`,
        "error"
      );
    } else if (totalSize > warningThreshold) {
      this.toastService.show(
        `Warning: total file size ${this.formatFileSize(totalSize)} is close to the limit (${this.formatFileSize(maxSize)}).`,
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

    this.fileValidationErrors = errors.map(error => {
      let message = '';
      
      if (error.error === 'size') {
        const actualSize = this.formatFileSize(error.actualSize!);
        const maxSize = this.formatFileSize(this.maxFileSize);
        this.toastService.show(`File "${error.fileName}" to big (${actualSize}). Max size: ${maxSize}`, "error");
      } else if (error.error === 'type') {
        const fileType = error.actualType || 'unknown';
        this.toastService.show(`File type "${error.fileName}" is not supported (${fileType})`, "error");
      }
      
      return {
        ...error,
        message
      };
    });
    
    this.showErrorNotification = true;
    
    setTimeout(() => {
      this.hideErrorNotification();
    }, 500);
  }

  onFileDrop(files: File[]) {
    if (!this.selectedChat || files.length === 0) return;

    const { validFiles, errors } = this.validateFiles(files);
  
    if (errors.length > 0) {
      this.onFileValidationError(errors);
    }
  
    if (validFiles.length > 0) {
      const newItems = validFiles.map(f => ({ 
        file: f, 
        name: f.name, 
        size: f.size, 
        progress: 0 
      }));
      this.uploadItems.push(...newItems);
  
      if (!this.isUploadModalOpen) {
        this.isUploadModalOpen = true;
      }
    }
  }

  onModalFileInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
    
      const { validFiles, errors } = this.validateFiles(files);
  
      if (errors.length > 0) {
        this.onFileValidationError(errors);
      }
  
      if (validFiles.length > 0) {
        const newItems = validFiles.map(f => ({ 
          file: f, 
          name: f.name, 
          size: f.size, 
          progress: 0 
        }));
        this.uploadItems.push(...newItems);
      }
  
      input.value = '';
    }
  }

  async startUploadAndSend() {
    if (!this.selectedChat || this.uploadItems.length === 0 || this.isUploading) return;
    this.isUploading = true;

    if(this.uploadItems.length >= 40){
      this.toastService.show("You can upload max 40 files at once", "error");
    }

    try {
      const files = this.uploadItems.map(i => i.file);
      const uploadUrls = await this.fileUploadApi.getUploadUrls(files);

      const nameToUrl = new Map(uploadUrls.map(u => [u.originalName, u.url] as const));

      const uploadedFiles: Array<{ fileName: string; uniqueFileName: string; url: string }> = [];
      
      await Promise.all(this.uploadItems.map(item => new Promise<void>((resolve) => {
        const url = nameToUrl.get(item.name);
        if (!url) {
          item.error = 'No URL';
          resolve();
          return;
        }
        const uploadResult = this.fileUploadApi.uploadFileWithProgress(item.file, url, this.currentUserNickName);
        item.abort = uploadResult.abort;
        item.subscription = uploadResult.observable.subscribe({
          next: (result: { progress: number; fileData?: { fileName: string; uniqueFileName: string; url: string } }) => {
            item.progress = result.progress;
            if (result.fileData) {
              uploadedFiles.push(result.fileData);
            }
          },
          error: (err: any) => { 
            item.error = String(err); 
            item.progress = 0; 
            resolve(); 
            if (item.subscription) item.subscription.unsubscribe(); 
          },
          complete: () => { 
            item.url = url;
            item.progress = 100; 
            resolve(); 
            if (item.subscription) item.subscription.unsubscribe(); 
          }
        });
      })));

      if (uploadedFiles.length) {
        const fileNames = uploadedFiles.map(f => f.fileName);
        try {
          const downloadUrls = await this.fileUploadApi.getDownloadUrls(fileNames);
          
          const updatedFiles = uploadedFiles.map(file => {
            const downloadUrl = downloadUrls.find(d => d.originalName === file.fileName);
            return {
              ...file,
              url: downloadUrl?.url || file.url 
            };
          });
          
          const content = JSON.stringify({ text: this.uploadCaption || '', files: updatedFiles });
          await this.messageService.sendMessage(this.selectedChat, content);
        } catch (error) {
          console.error('Failed to get download URLs, using upload URLs:', error);
          const content = JSON.stringify({ text: this.uploadCaption || '', files: uploadedFiles });
          await this.messageService.sendMessage(this.selectedChat, content);
        }
      }
      this.closeUploadModal();
    } catch (e) {
      this.isUploading = false;
    }
  }

  cancelFileUpload(index: number) {
    const item = this.uploadItems[index];
    if (item.abort) {
      item.abort();
    }
    if (item.subscription) {
      item.subscription.unsubscribe();
    }
    this.uploadItems.splice(index, 1);
    
    if (this.uploadItems.length === 0) {
      this.closeUploadModal();
    }
  }

  removeFileFromList(index: number) {
    const item = this.uploadItems[index];
    if (item.abort) {
      item.abort();
    }
    if (item.subscription) {
      item.subscription.unsubscribe();
    }
    this.uploadItems.splice(index, 1);
    
    if (this.uploadItems.length === 0) {
      this.closeUploadModal();
    }
  }

  closeUploadModal() {
    this.isUploadModalOpen = false;
    this.isUploading = false;
    this.uploadItems = [];
    this.uploadCaption = '';
  }

  onEditMessage(message: OtoMessage) {
    if (this.messagesComponent) {
      const parsedContent = this.messagesComponent.parseContent(message);
      
      const editableMessage: OtoMessage = {
        ...message,
        content: parsedContent.text || ''
      };
  
      this.editingMessage = {
        ...editableMessage,
        parsedFiles: parsedContent.files || []
      } as OtoMessage & { parsedFiles?: any[] };
    } else {
      this.editingMessage = message;
    }
  
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

async onEditFile(editData: { messageId: string; file: any }) {
  const newFile: File = editData.file?.file;
  if (!newFile) return;

  try {
    // 1. Получаем URL для загрузки
    const [fileUrl] = await this.fileUploadApi.getUploadUrls([newFile]);

    // 2. Загружаем файл с прогрессом
    const { observable } = this.fileUploadApi.uploadFileWithProgress(newFile, fileUrl.url, this.currentUserNickName);

    const uploaded = await new Promise<{ fileName: string; uniqueFileName: string; url: string }>((resolve, reject) => {
      const sub = observable.subscribe({
        next: ev => {
          if (ev.fileData) {
            sub.unsubscribe();
            resolve(ev.fileData);
          }
        },
        error: err => {
          sub.unsubscribe();
          reject(err);
        }
      });
    });

    // 3. Парсим текущее содержимое сообщения
    let parsed: any;
    try {
      parsed = JSON.parse(this.editingMessage?.content || '{}');
    } catch {
      parsed = { text: this.editingMessage?.content || '', files: [] };
    }

    // 4. Заменяем старый файл
    parsed.files = parsed.files || [];
    const idx = parsed.files.findIndex((f: any) =>
      f.uniqueFileName === editData.file.uniqueFileName || f.fileName === editData.file.fileName
    );

    const newMeta = {
      fileName: uploaded.fileName,
      uniqueFileName: uploaded.uniqueFileName,
      url: uploaded.url,
      type: newFile.type,
      size: newFile.size
    };

    if (idx >= 0) {
      parsed.files[idx] = newMeta;
    } else {
      parsed.files.push(newMeta);
    }

    // 5. Обновляем сообщение
    this.editingMessage = {
      ...this.editingMessage!,
      content: JSON.stringify(parsed)
    };

    console.log('✅ editingMessage после редактирования файла:', this.editingMessage);

  } catch (err) {
    console.error('❌ Ошибка при замене файла:', err);
    this.toastService.show('Не удалось загрузить новый файл', 'error');
  }
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
        if (deleteType === 'hard') {
          await this.deleteFilesFromMessage(this.messageToDelete);
        }
        
        await this.messageService.deleteMessage(this.messageToDelete.messageId, deleteType);
        this.closeDeleteModal();
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    }
  }

  isMyMessage(msg: OtoMessage): boolean {
    return msg.sender?.trim().toLowerCase() === this.currentUserNickName.trim().toLowerCase();
  }

  private async deleteFilesFromMessage(message: OtoMessage) {
    try {
      const parsed = JSON.parse(message.content);
      
      if (parsed.files && Array.isArray(parsed.files)) {
        const filesToDelete = parsed.files
          .filter((file: any) => file.fileName && file.uniqueFileName)
          .map((file: any) => ({
            fileName: file.fileName,
            uniqueFileName: file.uniqueFileName
          }));
        
        if (filesToDelete.length > 0) {          
          const deletionPromises = filesToDelete.map(async (file: { fileName: string; uniqueFileName: string }) => {
            try {
              const success = await this.fileUploadApi.deleteSpecificFileVersion(
                file.uniqueFileName, 
                this.currentUserNickName
              );
              
              if (success && this.messagesComponent) {
                await this.messagesComponent.removeFileFromMessage(message.messageId, file.uniqueFileName);
              }
              
              return { fileName: file.fileName, uniqueFileName: file.uniqueFileName, success };
            } catch (error) {
              console.error(`❌ Failed to delete file ${file.uniqueFileName}:`, error);
              return { fileName: file.fileName, uniqueFileName: file.uniqueFileName, success: false, error };
            }
          });
          
          const results = await Promise.all(deletionPromises);
          const failed = results.filter(r => !r.success).map(r => r.fileName);
                    
          if (failed.length > 0) {
            console.warn('⚠️ Failed to delete file versions:', failed);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error deleting files from message:', error);
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
      this.cdr.detectChanges();
      this.closeUploadModal();
    }
  }
}