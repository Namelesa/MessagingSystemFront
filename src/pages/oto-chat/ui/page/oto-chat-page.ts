import { Observable, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { Component, Input, ViewChild, OnInit, ChangeDetectorRef, OnDestroy, HostListener } from '@angular/core';
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
      try {
        parsedContent = JSON.parse(editData.content);
        if (parsedContent.files && parsedContent.files.length > 0) {
          for (const file of parsedContent.files) {
            if (!file.url || file.url.includes('s3.amazonaws.com')) {
              try {
                const downloadUrls = await this.fileUploadApi.getDownloadUrls([file.fileName], this.currentUserNickName);
                if (downloadUrls && downloadUrls.length > 0) {
                  file.url = downloadUrls[0].url;
                }
              } catch (error) {
              }
            }

            delete file._forceUpdate;
            delete file._typeChanged;
            delete file._replacementKey;
            delete file._isNew;
            delete file._addedKey;
          }
          
          editData.content = JSON.stringify(parsedContent);
        }
      } catch (parseError) {
      }

      if (this.editingOriginalFiles && this.editingOriginalFiles.length > 0) {
        const finalFiles = parsedContent?.files || [];
        await this.deleteRemovedFilesAfterEdit(this.editingOriginalFiles, finalFiles);
      }
      
      await this.messageService.editMessage(editData.messageId, editData.content);
            
      if (this.messagesComponent) {
        
        this.messagesComponent['messageContentCache'].delete(editData.messageId);
        
        const message = this.messagesComponent.messages.find(m => m.messageId === editData.messageId);
        if (message) {
          delete (message as any).parsedContent;
          delete (message as any)._hasTemporaryChanges;
          message.content = editData.content;
          
          (message as any)._savedSuccessfully = Date.now();
        }
      }

      this.editingMessage = undefined;
      this.editingOriginalFiles = [];
      this.cdr.detectChanges();
      
      this.forceCompleteMessageUpdate(editData.messageId);

      setTimeout(() => {
        if (this.messagesComponent) {
          this.messagesComponent.scrollToBottomAfterNewMessage();
        }
      }, 150);
      
    } catch (error) {
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

  onEditCancel() {
    this.editingMessage = undefined;
    this.editingOriginalFiles = [];
  }

  get isEditFileUploading(): boolean {
    return this.editFileUploadingCount > 0;
  }

  async onEditFile(editData: { messageId: string; file: any }) {
    this.editFileUploadingCount = (this.editFileUploadingCount || 0) + 1;
    this.cdr.detectChanges();
  
    try {
      const newFile: File = editData.file?.file;
      const messageId = editData.messageId;
  
      if (!newFile || !messageId || !this.editingMessage) {
        return;
      }
  
      const oldFile = editData.file;
  
      try {
        if (oldFile?.uniqueFileName) {
          try {
            await this.fileUploadApi.deleteSpecificFileVersion(oldFile.uniqueFileName, this.currentUserNickName);
          } catch (error) {
          }
        }
  
        const [uploadUrl] = await this.fileUploadApi.getUploadUrls([newFile]);
        const uploadedFile = await this.uploadNewFile(newFile, uploadUrl.url);
  
        const rawUrl = await this.getDownloadUrl(uploadedFile.fileName).catch(() => uploadedFile.url);
        const downloadUrl = `${rawUrl}?v=${Date.now()}`;
  
        const newFileData = {
          fileName: uploadedFile.fileName,
          uniqueFileName: uploadedFile.uniqueFileName,
          url: downloadUrl,
          type: newFile.type,
          size: newFile.size,
          uniqueId: `${uploadedFile.uniqueFileName}_${Date.now()}`,
          _refreshKey: `replacement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          _forceUpdate: Date.now(),
          _typeChanged: (oldFile?.type !== newFile.type),
          _replacementKey: `replace_${Date.now()}_${Math.random()}`
        };
  
        this.updateEditingMessageOnly(oldFile, newFileData);
  
        if (this.messagesComponent) {
          try {
            this.messagesComponent.clearMessageCacheBase(messageId);
            setTimeout(() => this.messagesComponent?.forceFileRefresh(messageId, oldFile?.uniqueId), 50);
            setTimeout(() => this.messagesComponent?.fullMessageRerender(messageId), 100);
          } catch (e) {
          }
        }
  
      } catch (err) {
      }
    } finally {
      this.editFileUploadingCount = Math.max(0, (this.editFileUploadingCount || 1) - 1);
      try {
        this.cdr.detectChanges();
      } catch (e) {
      }
    }
  }  
  
  private updateEditingMessageOnly(oldFile: any, newFileData: any): void {
    if (!this.editingMessage) return;
  
    let parsed: any;
    try {
      parsed = JSON.parse(this.editingMessage.content || '{}');
    } catch {
      parsed = { text: this.editingMessage.content || '', files: [] };
    }
  
    parsed.files = parsed.files || [];
    
    const fileIndex = this.findFileIndex(parsed.files, oldFile);
    
    if (fileIndex >= 0) {
      const oldFileData = { ...parsed.files[fileIndex] };
      
      parsed.files[fileIndex] = {
        ...newFileData,
        _forceUpdate: Date.now(), 
        _typeChanged: oldFileData.type !== newFileData.type, 
        _replacementKey: `replacement_${Date.now()}_${Math.random()}`
      };
      
    } else {
    
      const newFile = {
        ...newFileData,
        _isNew: true,
        _forceUpdate: Date.now(),
        _addedKey: `added_${Date.now()}_${Math.random()}`
      };
      
      parsed.files.push(newFile);
      parsed.files = this.removeDuplicateFiles(parsed.files);
    }
  
    this.editingMessage = {
      ...this.editingMessage,
      content: JSON.stringify(parsed),
      _hasTemporaryChanges: true, 
      lastUpdated: Date.now(),
      forceRefresh: true,
      _contentUpdated: Date.now() 
    } as OtoMessage;
  
    (this.editingMessage as any).parsedFiles = parsed.files;
    
    if (this.messagesComponent) {
      this.messagesComponent.clearMessageCacheBase(this.editingMessage.messageId);
      
      setTimeout(() => {
        if (this.messagesComponent) {
          this.messagesComponent.fullMessageRerender(this.editingMessage!.messageId);
        }
      }, 50);
    }
    
    this.cdr.markForCheck();
    this.cdr.detectChanges();
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
  
  private removeDuplicateFiles(files: any[]): any[] {
    const seen = new Set<string>();
    return files.filter(file => {
      const key = file.fileName;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  
  private async getDownloadUrl(fileName: string): Promise<string> {
    const downloadUrls = await this.fileUploadApi.getDownloadUrls([fileName], this.currentUserNickName);
    return downloadUrls?.[0]?.url || '';
  }
  
  private findFileIndex(files: any[], targetFile: any): number {
    const searchStrategies = [
      (f: any) => f.uniqueFileName === targetFile.uniqueFileName,
      
      (f: any) => f.uniqueId === targetFile.uniqueId || f.uniqueFileName === targetFile.uniqueId,
      
      (f: any) => f.url === targetFile.url && f.url,
      
      (f: any) => f.fileName === targetFile.fileName && f.type === targetFile.type,
      
      (f: any) => f.fileName === targetFile.fileName,
      
      (f: any) => f.fileName === targetFile.fileName && f.size === targetFile.size,

      (f: any, index: number) => index === 0 && files.length === 1
    ];
  
    for (let i = 0; i < searchStrategies.length; i++) {
      const strategy = searchStrategies[i];
      const index = files.findIndex((f, idx) => strategy(f, idx));
      
      if (index >= 0) {
        return index;
      }
    }
    return -1;
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