import { Observable, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { Component, Input, ViewChild, OnInit, ChangeDetectorRef, OnDestroy, HostListener, NgZone} from '@angular/core';
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
               ChatLayoutComponent, OtoChatMessagesWidget, SendAreaComponent, FileDropDirective, 
               FileDropOverlayComponent, ToastComponent, TranslateModule],
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

  draftText: string = '';

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
  private editFileUploadingCount = 0;

  private editingOriginalFiles: Array<any> = [];

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
    private toastService: ToastService,
    private ngZone: NgZone
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
          this.messagesComponent.scrollToBottomAfterNewMessage();
        }
      }, 300);
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
          
          setTimeout(() => {
            if (this.messagesComponent) {
              this.messagesComponent.scrollToBottomAfterNewMessage();
            }
          }, 150);
        }).catch(error => {
        });
      } else {
        this.messageService.sendMessage(this.selectedChat, content).catch(error => {
        });
        this.draftText = '';
        
        setTimeout(() => {
          if (this.messagesComponent) {
            this.messagesComponent.scrollToBottomAfterNewMessage();
          }
        }, 150);
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
      if (this.editingMessage) {
        this.addFilesToEditingMessage(validFiles, fileUploadEvent.message);
      } else {
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
  }

  private async addFilesToEditingMessage(files: File[], message?: string) {
    if (!this.editingMessage) return;
  
    try {
      const uploadUrls = await this.fileUploadApi.getUploadUrls(files);
      const nameToUrl = new Map(uploadUrls.map(u => [u.originalName, u.url] as const));
  
      const uploadedFiles: Array<{ fileName: string; uniqueFileName: string; url: string; type: string; size: number }> = [];
      
      await Promise.all(files.map(file => new Promise<void>((resolve, reject) => {
        const url = nameToUrl.get(file.name);
        if (!url) {
          reject(new Error(`No URL for file ${file.name}`));
          return;
        }
  
        const { observable } = this.fileUploadApi.uploadFileWithProgress(file, url, this.currentUserNickName);
        
        observable.subscribe({
          next: (result: { progress: number; fileData?: { fileName: string; uniqueFileName: string; url: string } }) => {
            if (result.fileData) {
              uploadedFiles.push({
                ...result.fileData,
                type: file.type,
                size: file.size
              });
            }
          },
          error: (err: any) => reject(err),
          complete: () => resolve()
        });
      })));
  
      if (uploadedFiles.length > 0) {
        try {
          const fileNames = uploadedFiles.map(f => f.fileName);
          const downloadUrls = await this.fileUploadApi.getDownloadUrls(fileNames);
          
          uploadedFiles.forEach(file => {
            const downloadUrl = downloadUrls.find(d => d.originalName === file.fileName);
            if (downloadUrl) {
              file.url = downloadUrl.url;
            }
          });
        } catch (error) {
        }
      }

      let parsed: any;
      try {
        parsed = JSON.parse(this.editingMessage.content);
      } catch {
        parsed = { text: this.editingMessage.content || '', files: [] };
      }
  
      if (message !== undefined) {
        parsed.text = message;
      }

      parsed.files = parsed.files || [];
      
      const newFiles = uploadedFiles.map(file => ({
        fileName: file.fileName,
        uniqueFileName: file.uniqueFileName,
        url: file.url,
        type: file.type,
        size: file.size,
        uniqueId: file.uniqueFileName
      }));
  
      parsed.files.push(...newFiles);
  
      const newEditingMessage = {
        ...this.editingMessage,
        content: JSON.stringify(parsed)
      } as OtoMessage;
  
      (newEditingMessage as any).parsedFiles = parsed.files;
  
      this.editingMessage = newEditingMessage;
      this.cdr.detectChanges();
  
    } catch (error) {
      this.toastService.show('Failed to add files to message', 'error');
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
      if (this.editingMessage) {
        this.addFilesToEditingMessage(validFiles);
      } else {
        const newItems = validFiles.map(f => ({ 
          file: f, 
          name: f.name, 
          size: f.size, 
          progress: 0 
        }));
        this.uploadItems.push(...newItems);

        if (this.draftText.trim()) {
          this.uploadCaption = this.draftText;
        }
  
        if (!this.isUploadModalOpen) {
          this.isUploadModalOpen = true;
        }
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
          this.draftText = '';

          setTimeout(() => {
            if (this.messagesComponent) {
              this.messagesComponent.scrollToBottomAfterNewMessage();
            }
          }, 50);

        } catch (error) {
          const content = JSON.stringify({ text: this.uploadCaption || '', files: uploadedFiles });
          await this.messageService.sendMessage(this.selectedChat, content);

          setTimeout(() => {
            if (this.messagesComponent) {
              this.messagesComponent.scrollToBottomAfterNewMessage();
            }
          }, 50);
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
      const editableMessage: OtoMessage & { parsedFiles?: any[] } = {
        ...message,
        content: JSON.stringify({
          text: parsedContent.text || '',
          files: parsedContent.files || []
        }),
        parsedFiles: parsedContent.files || []
      };
  
      this.editingMessage = editableMessage;

      this.editingOriginalFiles = (parsedContent.files || []).map((f: any) => ({
        ...f,
        originalUniqueId: f.uniqueId || f.uniqueFileName,
        originalFileName: f.fileName,
        originalUniqueFileName: f.uniqueFileName
      }));

    } else {
      let parsed: any;
      try {
        parsed = JSON.parse(message.content);
      } catch {
        parsed = { text: message.content, files: [] };
      }
  
      this.editingMessage = {
        ...message,
        content: JSON.stringify(parsed),
        parsedFiles: parsed.files || []
      } as OtoMessage & { parsedFiles?: any[] };

      this.editingOriginalFiles = (parsed.files || []).map((f: any) => ({
        ...f,
        originalUniqueId: f.uniqueId || f.uniqueFileName,
        originalFileName: f.fileName,
        originalUniqueFileName: f.uniqueFileName
      }));
    }
  
    this.replyingToMessage = undefined;
  } 

  async onEditComplete(editData: { messageId: string; content: string }) {
    try {
      let parsedContent: any;
      const filesToDeleteFromServer: string[] = [];
      
      try {
        parsedContent = JSON.parse(editData.content);
        
        if (parsedContent.files && parsedContent.files.length > 0) {
          for (const file of parsedContent.files) {
            if (file._replacesFile) {
              filesToDeleteFromServer.push(file._replacesFile);
              delete file._replacesFile;
            }
            
            if (!file.url || file.url.includes('s3.amazonaws.com')) {
              try {
                const downloadUrls = await this.fileUploadApi.getDownloadUrls([file.fileName], this.currentUserNickName);
                if (downloadUrls && downloadUrls.length > 0) {
                  file.url = downloadUrls[0].url;
                }
              } catch (error) {
                console.error('Error getting download URL:', error);
              }
            }
  
            delete file._isTemporary;
            delete file._forceUpdate;
            delete file._typeChanged;
            delete file._replacementKey;
            delete file._isNew;
            delete file._addedKey;
            delete file._oldFile;
            delete file._version;
          }
          
          editData.content = JSON.stringify(parsedContent);
        }
      } catch (parseError) {
        console.error('Parse error:', parseError);
      }
  
      if (this.editingOriginalFiles && this.editingOriginalFiles.length > 0) {
        const finalFiles = parsedContent?.files || [];
        await this.deleteRemovedFilesAfterEdit(this.editingOriginalFiles, finalFiles);
      }
  
      if (filesToDeleteFromServer.length > 0) await this.deleteReplacedFiles(filesToDeleteFromServer);

      await this.messageService.editMessage(editData.messageId, editData.content);
            
      if (this.messagesComponent) {
        this.messagesComponent['messageContentCache'].delete(editData.messageId);
        const message = this.messagesComponent.messages.find(m => m.messageId === editData.messageId);
        if (message) {
          delete (message as any).parsedContent;
          delete (message as any)._hasTemporaryChanges;
          message.content = editData.content;
          (message as any)._version = Date.now();
        }

        if (parsedContent?.files) {
          parsedContent.files.forEach((file: any) => {
            const cacheKeys = [file.uniqueFileName, file.fileName].filter(Boolean);
            cacheKeys.forEach(key => {
              this.messagesComponent!.urlCache.set(key, {
                url: file.url,
                timestamp: Date.now()
              });
            });
          });
        }
        
        setTimeout(() => {
          if (this.messagesComponent) {
            this.messagesComponent.fullMessageRerender(editData.messageId);
          }
        }, 100);
      }
  
      this.editingMessage = undefined;
      this.editingOriginalFiles = [];
      this.cdr.detectChanges();
      
      setTimeout(() => {
        if (this.messagesComponent) {
          this.messagesComponent.scrollToBottomAfterNewMessage();
        }
      }, 150);
      
    } catch (error) {
      console.error('Error in onEditComplete:', error);
      this.toastService.show('Failed to save changes', 'error');
    }
  }

  private async deleteReplacedFiles(uniqueFileNames: string[]): Promise<void> {
    if (uniqueFileNames.length === 0) return;
  
    try {
      const deletionPromises = uniqueFileNames.map(async (uniqueFileName) => {
        try {
          const success = await this.fileUploadApi.deleteSpecificFileVersion(
            uniqueFileName, 
            this.currentUserNickName
          );
          return { uniqueFileName, success };
        } catch (error) {
          console.error(`❌ Failed to delete replaced file: ${uniqueFileName}`, error);
          return { uniqueFileName, success: false, error };
        }
      });
  
      await Promise.all(deletionPromises);
    } catch (error) {
      console.error('Error deleting replaced files:', error);
    }
  }

  private async deleteRemovedFilesAfterEdit(originalFiles: any[], finalFiles: any[]): Promise<void> {
    try {
      const filesToDelete = originalFiles.filter(originalFile => {
        const stillExists = finalFiles.some(finalFile => {
          return originalFile.uniqueFileName === finalFile.uniqueFileName ||
                 originalFile.fileName === finalFile.fileName ||
                 originalFile.uniqueId === finalFile.uniqueId;
        });
        return !stillExists;
      });
  
      if (filesToDelete.length === 0) {
        return;
      }
    
      const deletionPromises = filesToDelete.map(async (file) => {
        try {
          if (file.uniqueFileName) {
            const success = await this.fileUploadApi.deleteSpecificFileVersion(
              file.uniqueFileName, 
              this.currentUserNickName
            );
            
            return { 
              fileName: file.fileName, 
              uniqueFileName: file.uniqueFileName, 
              success 
            };
          }
          return { 
            fileName: file.fileName, 
            uniqueFileName: file.uniqueFileName, 
            success: false, 
            error: 'No uniqueFileName' 
          };
        } catch (error) {
          return { 
            fileName: file.fileName, 
            uniqueFileName: file.uniqueFileName, 
            success: false, 
            error: error 
          };
        }
      });
  
      const results = await Promise.all(deletionPromises);
      const failed = results.filter(r => !r.success);
      
      if (failed.length > 0) {
        this.toastService.show(
          `Warning: ${failed.length} file(s) could not be deleted from storage`, 
          'error'
        );
      }
  
    } catch (error) {
    }
  }

  async onEditCancel() {
    if (this.editingMessage) {
      try {
        const parsed = JSON.parse(this.editingMessage.content);
        const temporaryFiles = parsed.files?.filter((f: any) => f._isTemporary) || [];
        
        if (temporaryFiles.length > 0) {          
          const deletionPromises = temporaryFiles.map(async (file: any) => {
            try {
              if (file.uniqueFileName) {
                await this.fileUploadApi.deleteSpecificFileVersion(
                  file.uniqueFileName, 
                  this.currentUserNickName
                );
              }
            } catch (error) {
              console.warn('⚠️ Could not delete temporary file:', error);
            }
          });
          
          await Promise.all(deletionPromises);
        }
      } catch (e) {
        console.error('Error cleaning up temporary files:', e);
      }
    }
    
    this.editingMessage = undefined;
    this.editingOriginalFiles = [];
    this.cdr.detectChanges();
  }

  get isEditFileUploading(): boolean {
    return this.editFileUploadingCount > 0;
  }

  async onEditFile(editData: { messageId: string; file: any }) {
    this.editFileUploadingCount++;
    this.cdr.detectChanges();
  
    try {
      const newFile: File = editData.file?.file;
      const messageId = editData.messageId;
      const oldFile = editData.file;
  
      if (!newFile || !messageId || !this.editingMessage) return;
      
      const [uploadUrl] = await this.fileUploadApi.getUploadUrls([newFile]);
      const uploadedFile = await this.uploadNewFile(newFile, uploadUrl.url);
      const rawUrl = await this.getDownloadUrl(uploadedFile.fileName);
      const timestamp = Date.now();
      const randomKey = Math.random().toString(36).substr(2, 9);
      
      const newFileData = {
        fileName: uploadedFile.fileName,
        uniqueFileName: uploadedFile.uniqueFileName,
        url: rawUrl,
        type: newFile.type,
        size: newFile.size,
        uniqueId: `FILE_${timestamp}_${randomKey}_${uploadedFile.fileName.replace(/[^a-zA-Z0-9]/g, '_')}`,
        _version: timestamp,
        _refreshKey: `${timestamp}_${randomKey}`,
        _isTemporary: true,
        _replacesFile: oldFile?.uniqueFileName || oldFile?.fileName
      };
  
      this.updateEditingMessageAndComponent(oldFile, newFileData, messageId);
      this.forceImageReload(messageId);
  
    } catch (err) {
      this.toastService.show('Failed to replace file', 'error');
    } finally {
      this.editFileUploadingCount = Math.max(0, this.editFileUploadingCount - 1);
      this.cdr.detectChanges();
    }
  }

  private forceImageReload(messageId: string): void {
    [0, 50, 100, 200, 400].forEach(delay => {
      setTimeout(() => this.forceImageReloadInternal(messageId), delay);
    });
  }
  
  private forceImageReloadInternal(messageId: string): void {
    const messageElements = document.querySelectorAll(`[data-message-id="${messageId}"]`);
    
    messageElements.forEach(msgEl => {
      const images = msgEl.querySelectorAll('img[src]');
      
      images.forEach((img) => {
        const imgElement = img as HTMLImageElement;
        const currentSrc = imgElement.src;
        
        if (!currentSrc || currentSrc === '') return;
        
        imgElement.removeAttribute('src');
        void imgElement.offsetHeight; 
        imgElement.setAttribute('src', currentSrc);
      });
      
      const videos = msgEl.querySelectorAll('video');
      videos.forEach((video) => {
        const videoElement = video as HTMLVideoElement;
        videoElement.load();
      });
    });
  }

private updateEditingMessageAndComponent(
  oldFile: any, 
  newFileData: any, 
  messageId: string
): void {
  if (!this.editingMessage || !this.messagesComponent) return;

  const versionTimestamp = Date.now();
  const randomKey = Math.random().toString(36).substr(2, 9);
    
  const enhancedNewFileData = {
    fileName: newFileData.fileName,
    uniqueFileName: newFileData.uniqueFileName,
    url: newFileData.url, 
    type: newFileData.type,
    size: newFileData.size,
    uniqueId: `FILE_${versionTimestamp}_${randomKey}_${newFileData.fileName.replace(/[^a-zA-Z0-9]/g, '_')}`,
    _version: versionTimestamp,
    _refreshKey: `${versionTimestamp}_${randomKey}`,
    _forceUpdate: versionTimestamp,
    _typeKey: `${newFileData.type}_${versionTimestamp}`,
    _replacesFile: oldFile?.uniqueFileName || oldFile?.fileName,
    _isTemporary: true
  };

  let parsedEditing: any;
  try {
    parsedEditing = JSON.parse(this.editingMessage.content || '{}');
  } catch {
    parsedEditing = { text: this.editingMessage.content || '', files: [] };
  }

  parsedEditing.files = parsedEditing.files || [];

  const editingFileIndex = parsedEditing.files.findIndex((f: any) =>
    f.uniqueFileName === oldFile.uniqueFileName ||
    f.uniqueId === oldFile.uniqueId ||
    f.fileName === oldFile.fileName
  );

  const newFilesArray = [...parsedEditing.files];
  if (editingFileIndex >= 0) {
    newFilesArray[editingFileIndex] = { ...enhancedNewFileData };
  } else {
    newFilesArray.push({ ...enhancedNewFileData, _isNew: true });
  }
  
  parsedEditing.files = newFilesArray;
  this.editingMessage = {
    messageId: this.editingMessage.messageId,
    sender: this.editingMessage.sender,
    sentAt: this.editingMessage.sentAt,
    content: JSON.stringify(parsedEditing),
    isDeleted: this.editingMessage.isDeleted,
    isEdited: this.editingMessage.isEdited,
    editedAt: this.editingMessage.editedAt,
    replyFor: this.editingMessage.replyFor,
    _hasTemporaryChanges: true,
    _version: versionTimestamp,
    _refreshKey: `${versionTimestamp}_${randomKey}`
  } as any;

  const messageIndex = this.messagesComponent.messages.findIndex(
    m => m.messageId === messageId
  );

  if (messageIndex !== -1) {
    const message = this.messagesComponent.messages[messageIndex];
    let parsedMessage: any;
    
    try {
      parsedMessage = JSON.parse(message.content || '{}');
    } catch {
      parsedMessage = { text: message.content || '', files: [] };
    }

    parsedMessage.files = parsedMessage.files || [];

    const messageFileIndex = parsedMessage.files.findIndex((f: any) =>
      f.uniqueFileName === oldFile.uniqueFileName ||
      f.uniqueId === oldFile.uniqueId ||
      f.fileName === oldFile.fileName
    );

    const newMessageFilesArray = [...parsedMessage.files];
    if (messageFileIndex >= 0) {
      newMessageFilesArray[messageFileIndex] = { ...enhancedNewFileData };
    } else {
      newMessageFilesArray.push({ ...enhancedNewFileData, _isNew: true });
    }
    
    parsedMessage.files = newMessageFilesArray;

    const updatedMessage: OtoMessage = {
      messageId: message.messageId,
      sender: message.sender,
      sentAt: message.sentAt,
      content: JSON.stringify(parsedMessage),
      isDeleted: message.isDeleted,
      isEdited: message.isEdited,
      editedAt: message.editedAt,
      replyFor: message.replyFor,
      _version: versionTimestamp,
      _refreshKey: `${versionTimestamp}_${randomKey}`,
      _forceRerender: versionTimestamp
    } as any;

    this.messagesComponent.messages = [
      ...this.messagesComponent.messages.slice(0, messageIndex),
      updatedMessage,
      ...this.messagesComponent.messages.slice(messageIndex + 1)
    ];

    this.messagesComponent['messageContentCache'].clear();

    const oldCacheKeys = [
      oldFile.uniqueFileName,
      oldFile.fileName,
      oldFile.uniqueId
    ].filter(Boolean);

    oldCacheKeys.forEach(key => {
      this.messagesComponent!.urlCache.delete(key);
    });

    const newCacheKeys = [
      enhancedNewFileData.uniqueFileName,
      enhancedNewFileData.fileName
    ].filter(Boolean);

    newCacheKeys.forEach(key => {
      this.messagesComponent!.urlCache.set(key, {
        url: enhancedNewFileData.url,
        timestamp: Date.now()
      });
    });    
  }
  this.ngZone.run(() => {
    this.cdr.detectChanges();
    if (this.messagesComponent) {
      this.messagesComponent.cdr.detectChanges();
    }

    setTimeout(() => {
      if (this.messagesComponent) {
        this.messagesComponent['messageContentCache'].clear();
        this.messagesComponent.cdr.detach();
        this.messagesComponent.cdr.reattach();
        this.messagesComponent.cdr.detectChanges();
      }
      this.cdr.detectChanges();
    }, 50);
  });
}
  
  private async uploadNewFile(
    file: File, 
    uploadUrl: string
  ): Promise<{ fileName: string; uniqueFileName: string; url: string }> {
    const { observable } = this.fileUploadApi.uploadFileWithProgress(
      file, 
      uploadUrl, 
      this.currentUserNickName
    );
  
    return new Promise((resolve, reject) => {
      let finalFileData: any = null;
  
      const subscription = observable.subscribe({
        next: result => {
          if (result.fileData) {
            finalFileData = result.fileData;
          }
        },
        error: error => {
          subscription.unsubscribe();
          reject(error);
        },
        complete: () => {
          subscription.unsubscribe();
          if (finalFileData) {
            resolve(finalFileData);
          } else {
            reject(new Error('Upload completed but no file data received'));
          }
        }
      });
    });
  }
  
  private async getDownloadUrl(fileName: string): Promise<string> {
    const downloadUrls = await this.fileUploadApi.getDownloadUrls([fileName], this.currentUserNickName);
    return downloadUrls?.[0]?.url || '';
  }
    
  onDeleteMessage(message: OtoMessage) {
    this.messageToDelete = message;
    this.isDeleteModalOpen = true;
  }

  deleteForBoth: boolean = false;

  public forceCompleteMessageUpdate(messageId: string): void {
    
    if (this.messagesComponent) {
      const message = this.messagesComponent.messages.find(m => m.messageId === messageId);
      if (message) {
        
        delete (message as any).parsedContent;
        delete (message as any).parsedFiles;
        this.messagesComponent['messageContentCache'].delete(messageId);
        
        (message as any).forceRefresh = true;
        (message as any).lastUpdated = Date.now();
        (message as any)._hasTemporaryChanges = false;
        (message as any)._forceRerender = Date.now();
        
        try {
          const parsed = JSON.parse(message.content);
          if (parsed.files) {
            parsed.files.forEach((file: any) => {
              if (file.type?.startsWith('video/')) {
                file._videoRefreshKey = Date.now();
              }
            });
            message.content = JSON.stringify(parsed);
          }
        } catch (e) {
        }
      }
      
      this.messagesComponent.fullMessageRerender(messageId);

      
      setTimeout(() => {
        if (this.messagesComponent) {
          this.messagesComponent.fullMessageRerender(messageId);
        }
      }, 100);
    }

    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }  

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
      }
    }
  }

  isMyMessage(msg: OtoMessage): boolean {
    return msg.sender?.trim().toLowerCase() === this.currentUserNickName.trim().toLowerCase();
  }

  private async deleteFilesFromMessage(message: OtoMessage) {
    try {
      let parsed: any;
      
      try {
        parsed = JSON.parse(message.content);
      } catch (parseError) {
        return;
      }
      
      if (!parsed.files || !Array.isArray(parsed.files) || parsed.files.length === 0) {
        return;
      }
      
      const filesToDelete = parsed.files
        .filter((file: any) => file.fileName && file.uniqueFileName)
        .map((file: any) => ({
          fileName: file.fileName,
          uniqueFileName: file.uniqueFileName
        }));
            
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
          return { fileName: file.fileName, uniqueFileName: file.uniqueFileName, success: false, error };
        }
      });
      
      const results = await Promise.all(deletionPromises);
      const failed = results.filter(r => !r.success).map(r => r.fileName);
                    
      if (failed.length > 0) {
      }
      
    } catch (error) {
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

  onUploadEnter(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!this.isUploading && this.uploadItems.length > 0) {
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
      this.cdr.detectChanges();
      this.closeUploadModal();
    }
  }
}