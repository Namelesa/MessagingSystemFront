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
import { FileUploadStateService } from '../../model/file-state-service';
import { MessageStateService } from '../../model/message-state.service';
import { FileEditStateService } from '../../model/file-edit-state-service';

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
  draftText: string = '';
  
  @Input() foundedUser?: { nick: string, image: string };
  @Input() edit: string = '';

  @ViewChild(OtoChatMessagesWidget) 
  set messagesComponent(widget: OtoChatMessagesWidget | undefined) {
    this._messagesComponent = widget;
    this.messageStateService.setMessagesWidget(widget);
  }

  get messagesComponent(): OtoChatMessagesWidget | undefined {
    return this._messagesComponent;
  }
  private _messagesComponent?: OtoChatMessagesWidget;

  @ViewChild(OtoChatListComponent) chatListComponent?: OtoChatListComponent;
  @ViewChild('modalFileInput') modalFileInput?: any;
  
  private subscriptions: Subscription[] = [];
  user$: Observable<SearchUser | null>;
  
  isDragOver = false;

  constructor(
    public otoChatApi: OtoChatApiService, 
    private authService: AuthService, 
    private messageService: OtoMessagesService,
    private fileUploadApi: FileUploadApiService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private findUserStore: FindUserStore,
    private toastService: ToastService,
    private ngZone: NgZone,
    public fileUploadStateService: FileUploadStateService,
    private messageStateService: MessageStateService,
    private fileEditStateService: FileEditStateService
  ) {
    super();
    this.apiService = this.otoChatApi;
    this.authService.waitForAuthInit().subscribe(() => {
      this.currentUserNickName = this.authService.getNickName() || '';
    });
    this.user$ = this.findUserStore.user$;
  }

  get uploadState$() {
    return this.fileUploadStateService.uploadState$;
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.checkForOpenChatUser();
    this.subscribeToUserDeletion();
  }

  override ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.messageStateService.setMessagesWidget(undefined); 
    this.fileEditStateService.resetState();
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
    this.fileUploadStateService.hideErrorNotification();
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
          this.messageStateService.scrollToBottom();
        }).catch(error => {
          console.error('Error sending reply:', error);
        });
      } else {
        this.messageService.sendMessage(this.selectedChat, content).catch(error => {
          console.error('Error sending message:', error);
        });
        this.draftText = '';
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
      this.editingMessage = await this.fileEditStateService.addFilesToEditingMessage(
        this.editingMessage,
        files,
        message,
        this.currentUserNickName
      );
      
      this.cdr.detectChanges();
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
    
    setTimeout(() => {
      this.hideErrorNotification();
    }, 500);
  }

  onFileDrop(files: File[]) {
    if (!this.selectedChat || files.length === 0) return;
  
    const result = this.fileUploadStateService.handleFileDrop(
      files, 
      this.draftText,
      !!this.editingMessage
    );
  
    if (result.errors.length > 0) {
      result.errors.forEach(error => {
        this.toastService.show(error.message, "error");
      });
    }
  
    if (result.validFiles.length > 0 && this.editingMessage) {
      this.addFilesToEditingMessage(result.validFiles);
    }
  }

  onModalFileInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      
      const result = this.fileUploadStateService.handleModalFileInput(files);
  
      if (result.errors.length > 0) {
        result.errors.forEach(error => {
          this.toastService.show(error.message, "error");
        });
      }
  
      input.value = '';
    }
  }

  async startUploadAndSend() {
    const state = this.fileUploadStateService.getUploadState();
    
    if (!this.selectedChat || state.uploadItems.length === 0 || state.isUploading) return;
    
    this.fileUploadStateService.setIsUploading(true);
  
    if(state.uploadItems.length >= 40){
      this.toastService.show("You can upload max 40 files at once", "error");
    }
  
    try {
      const files = state.uploadItems.map(i => i.file);
      const uploadUrls = await this.fileUploadApi.getUploadUrls(files);
      const nameToUrl = new Map(uploadUrls.map(u => [u.originalName, u.url] as const));
      const uploadedFiles: Array<{ fileName: string; uniqueFileName: string; url: string }> = [];
      
      await Promise.all(state.uploadItems.map((item, index) => new Promise<void>((resolve) => {
        const url = nameToUrl.get(item.name);
        if (!url) {
          this.fileUploadStateService.updateUploadItem(index, { error: 'No URL' });
          resolve();
          return;
        }
        
        const uploadResult = this.fileUploadApi.uploadFileWithProgress(item.file, url, this.currentUserNickName);
        const abort = uploadResult.abort;
        
        const subscription = uploadResult.observable.subscribe({
          next: (result: { progress: number; fileData?: { fileName: string; uniqueFileName: string; url: string } }) => {
            this.fileUploadStateService.updateUploadItem(index, { 
              progress: result.progress,
              abort,
              subscription
            });
            if (result.fileData) {
              uploadedFiles.push(result.fileData);
            }
          },
          error: (err: any) => { 
            this.fileUploadStateService.updateUploadItem(index, {
              error: String(err),
              progress: 0
            });
            resolve();
            if (subscription) subscription.unsubscribe();
          },
          complete: () => { 
            this.fileUploadStateService.updateUploadItem(index, {
              url: url,
              progress: 100
            });
            resolve();
            if (subscription) subscription.unsubscribe();
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
          
          const content = JSON.stringify({ text: state.uploadCaption || '', files: updatedFiles });
          await this.messageService.sendMessage(this.selectedChat, content);
          this.draftText = '';
  
          this.messageStateService.scrollToBottom();
        } catch (error) {
          const content = JSON.stringify({ text: state.uploadCaption || '', files: uploadedFiles });
          await this.messageService.sendMessage(this.selectedChat, content);
          
          this.messageStateService.scrollToBottom();
        }
      }
      this.closeUploadModal();
    } catch (e) {
      this.fileUploadStateService.setIsUploading(false);
    }
  }

  cancelFileUpload(index: number) {
    this.fileUploadStateService.removeUploadItem(index);
  }

  removeFileFromList(index: number) {
    this.fileUploadStateService.removeUploadItem(index);
  }

  closeUploadModal() {
    this.fileUploadStateService.closeUploadModal();
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

      const originalFiles = (parsedContent.files || []).map((f: any) => ({
        ...f,
        originalUniqueId: f.uniqueId || f.uniqueFileName,
        originalFileName: f.fileName,
        originalUniqueFileName: f.uniqueFileName
      }));
      this.fileEditStateService.setEditingOriginalFiles(originalFiles);  

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

      const originalFiles = (parsed.files || []).map((f: any) => ({
        ...f,
        originalUniqueId: f.uniqueId || f.uniqueFileName,
        originalFileName: f.fileName,
        originalUniqueFileName: f.uniqueFileName
      }));
      this.fileEditStateService.setEditingOriginalFiles(originalFiles);
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
          }
          
          parsedContent.files = await this.fileEditStateService.updateFileDownloadUrls(
            parsedContent.files,
            this.currentUserNickName
          );
          
          editData.content = JSON.stringify(parsedContent);
        }
      } catch (parseError) {
        console.error('Parse error:', parseError);
      }
  
      const originalFiles = this.fileEditStateService.editingOriginalFiles;
      if (originalFiles && originalFiles.length > 0) {
        const finalFiles = parsedContent?.files || [];
        const result = await this.fileEditStateService.deleteRemovedFilesAfterEdit(
          originalFiles,
          finalFiles,
          this.currentUserNickName
        );
        
        if (!result.success && result.failedCount > 0) {
          this.toastService.show(
            `Warning: ${result.failedCount} file(s) could not be deleted from storage`,
            'error'
          );
        }
      }
  
      if (filesToDeleteFromServer.length > 0) {
        await this.fileEditStateService.deleteReplacedFiles(
          filesToDeleteFromServer,
          this.currentUserNickName
        );
      }
  
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
      }
  
      this.messageStateService.forceMessageUpdate(editData.messageId);
      this.messageStateService.scrollToBottom();
  
      this.editingMessage = undefined;
      this.fileEditStateService.clearEditingOriginalFiles();
      this.cdr.detectChanges();
      
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
    await this.fileEditStateService.cleanupTemporaryFiles(
      this.editingMessage,
      this.currentUserNickName
    );
    
    this.editingMessage = undefined;
    this.fileEditStateService.clearEditingOriginalFiles(); 
    this.cdr.detectChanges();
  }

  get isEditFileUploading(): boolean {
    return this.fileEditStateService.isEditFileUploading;
  }

  async onEditFile(editData: { messageId: string; file: any }) {
    this.fileEditStateService.incrementEditFileUploadingCount();
    this.cdr.detectChanges();
  
    try {
      const newFile: File = editData.file?.file;
      const messageId = editData.messageId;
      const oldFile = editData.file;
  
      if (!newFile || !messageId || !this.editingMessage) return;
      
      const newFileData = await this.fileEditStateService.replaceFileInMessage(
        oldFile,
        newFile,
        this.currentUserNickName
      );
  
      this.updateEditingMessageAndComponent(oldFile, newFileData, messageId);
      this.forceImageReload(messageId);
  
    } catch (err) {
      this.toastService.show('Failed to replace file', 'error');
    } finally {
      this.fileEditStateService.decrementEditFileUploadingCount();
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
      const messageId = this.messageToDelete.messageId;
      
      try {
        if (deleteType === 'hard') {
          const result = await this.fileEditStateService.deleteFilesFromMessage(
            this.messageToDelete,
            this.currentUserNickName
          );
          
          if (result.failedFiles.length > 0) {
            console.warn('Some files failed to delete:', result.failedFiles);
          }
        }
        
        // ✅ Просто вызываем API - пусть SignalR обновит UI
        await this.messageService.deleteMessage(messageId, deleteType);
        
        // ❌ УДАЛИ весь этот блок мануального обновления UI
        // SignalR сам обновит через handleNewMessages
        
        this.closeDeleteModal();
      } catch (error) {
        console.error('Error deleting message:', error);
        this.toastService.show('Failed to delete message', 'error');
      }
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
      this.cdr.detectChanges();
      this.closeUploadModal();
    }
  }
}