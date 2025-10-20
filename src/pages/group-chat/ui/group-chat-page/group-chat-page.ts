import { Observable, Subscription } from 'rxjs';
import { Component,  Input, ViewChild, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { GroupMessagesApiService } from '../../api/group-message/group-messages.api';
import { GroupChatApiService } from '../../api/group-chat/group-chat-hub.api';
import { GroupMember } from '../../model/group-info.model';
import { GroupChat } from '../../model/group.chat';
import { GroupUserStateService } from '../../model/group-user-state.service';
import { GroupMessageStateService } from '../../model/group-message-state.service';
import { GroupSearchService } from '../../model/group-search.service';
import { GroupNavigationService } from '../../model/group-navigation.service';
import { GroupChatListComponent } from '../group-chat-list/group-chat.list.component';
import { GroupInfoModalComponent } from '../group-info-modal/group-info-modal.component';
import { GroupMessage } from '../../../../entities/group-message';
import { SearchUser } from '../../../../entities/search-user';
import { FindUserStore } from '../../../../features/search-user';
import { ChatLayoutComponent } from '../../../../widgets/chat-layout';
import { GroupMessagesWidget } from '../../../../widgets/chat-messages';
import { BaseChatPageComponent } from '../../../../shared/realtime';
import { SendAreaComponent, FileDropDirective, FileDropOverlayComponent } from '../../../../shared/send-message-area';
import { FileUploadApiService } from '../../../../features/file-sender';

@Component({
  selector: 'app-group-chat-page',
  standalone: true,
  imports: [CommonModule, GroupChatListComponent,
    FormsModule, ChatLayoutComponent, GroupInfoModalComponent,
    GroupMessagesWidget, SendAreaComponent, FileDropDirective, FileDropOverlayComponent, TranslateModule],
  templateUrl: './group-chat-page.html',
})
export class GroupChatPageComponent extends BaseChatPageComponent {
  protected apiService: GroupChatApiService;

  groupInfoModalOpen = false;
  isDragOver = false;

  @Input() edit: string = '';

  @ViewChild(GroupMessagesWidget) messagesComponent?: GroupMessagesWidget;
  @ViewChild(GroupChatListComponent) chatListComponent?: GroupChatListComponent;

  user$: Observable<SearchUser | null>;
  userSuggestion: SearchUser[] = [];

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
  maxFileSize: number = 1024 * 1024 * 1024;
  fileValidationErrors: Array<{
    fileName: string;
    error: 'size' | 'type';
    actualSize?: number;
    actualType?: string;
    message?: string;
  }> = [];
  showErrorNotification = false;
  private isEditingWithFiles = false;

  constructor(
    private groupChatApi: GroupChatApiService,
    public groupMessages: GroupMessagesApiService,
    private fileUploadApi: FileUploadApiService,
    private cdr: ChangeDetectorRef,
    private findUserStore: FindUserStore,
    
    public groupUserState: GroupUserStateService,
    public groupMessageState: GroupMessageStateService,
    private groupNavigation: GroupNavigationService,
    private groupSearch: GroupSearchService,
    private router: Router
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
      }
    });
  }

  override onChatSelected(nickname: string, image: string, groupId?: string): void {
    this.selectedChat$.next(nickname);
    this.selectedChat = nickname;
    this.selectedChatImage = image;
    
    if (groupId) {
      this.groupNavigation.selectGroupByIds(groupId, nickname, image);
      
      // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Автоскролл после выбора чата
      setTimeout(() => {
        if (this.messagesComponent) {
          this.messagesComponent.scrollToBottomAfterNewMessage();
        }
      }, 300);
    }
  }

  private pendingFileEdit: {
    messageId: string;
    oldFile: any;
    newFile: File;
  } | null = null;
  
  get hasPendingFileEdit(): boolean {
    return this.pendingFileEdit !== null;
  }

  onHeaderClick() {
    this.groupInfoModalOpen = true;
  }

  closeGroupInfoModal() {
    this.groupInfoModalOpen = false;
  }

  onGroupUpdated() {
    const groupId = this.groupUserState.getSelectedGroupId();
    if (groupId) this.groupUserState.loadGroupInfo(groupId);
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
      replaceUrl: true,
    });
  }

  sendMessage(message: string) {
    this.groupMessageState.sendMessage(message);
  
  setTimeout(() => {
    if (this.messagesComponent) {
      this.messagesComponent.scrollToBottomAfterNewMessage();
    }
  }, 150);
  }

  onFileUpload(fileUploadEvent: { files: File[]; message?: string }) {
    if (this.editingMessage) {
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
        
        let currentText = '';
        try {
          const parsed = JSON.parse(this.editingMessage.content);
          currentText = parsed.text || '';
        } catch {
          currentText = this.editingMessage.content || '';
        }
        
        this.uploadCaption = currentText;
        this.isUploadModalOpen = true;
        this.isEditingWithFiles = true;
        this.checkUploadSizeLimit();
        this.cdr.detectChanges();
      }
      return;
    }

    if (!this.selectedGroupId || fileUploadEvent.files.length === 0) return;
  
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
      this.uploadCaption = fileUploadEvent.message || this.draftText || '';
      this.isUploadModalOpen = true;
      this.isEditingWithFiles = false;
      this.checkUploadSizeLimit();
      this.cdr.detectChanges();
    }
  }

  onEditMessage(message: GroupMessage) {
    this.groupMessageState.startEditMessage(message);
  }

  async onEditComplete(editData: { messageId: string; content: string }) {
    try {
      if (this.pendingFileEdit && this.pendingFileEdit.messageId === editData.messageId) {
      
        this.editFileUploadingCount = 1;
        this.cdr.detectChanges();
  
        try {
          const { oldFile, newFile } = this.pendingFileEdit;
  
          if (oldFile?.uniqueFileName) {
            try {
              await this.fileUploadApi.deleteSpecificFileVersion(
                oldFile.uniqueFileName,
                this.currentUserNickName
              );
            } catch (error) {
              console.warn('⚠️ [EDIT FILE] Failed to delete old file:', error);
            }
          }
  
          const uploadUrlsResponse = await this.fileUploadApi.getUploadUrls([newFile]);
  
          if (!uploadUrlsResponse || uploadUrlsResponse.length === 0) {
            throw new Error('No upload URL received');
          }
  
          const uploadUrl = uploadUrlsResponse[0];
          const uploadedFile = await this.uploadNewFile(newFile, uploadUrl.url);
          let downloadUrl: string;
          try {
            downloadUrl = await this.getDownloadUrl(uploadedFile.fileName);
          } catch (error) {
            downloadUrl = uploadedFile.url;
          }
  
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
  
          const updatedMessage = this.updateEditingMessageOnly(
            this.editingMessage as GroupMessage,
            oldFile,
            newFileData
          );    
          await this.groupMessageState.completeEdit(editData.messageId, updatedMessage.content);
          this.pendingFileEdit = null;
  
        } catch (error) {
          console.error('❌ [EDIT FILE] Error during file replacement:', error);
          throw error;
        } finally {
          this.editFileUploadingCount = 0;
          this.cdr.detectChanges();
        }
  
      } else {
        await this.groupMessageState.completeEdit(editData.messageId, editData.content);
      }
      
      // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Скролл после завершения редактирования
      setTimeout(() => {
        if (this.messagesComponent) {
          this.messagesComponent.scrollToBottomAfterNewMessage();
        }
      }, 150);
      
    } catch (error) {
      console.error('❌ [EDIT COMPLETE] Error:', error);
    }
  }

  private editFileUploadingCount = 0;
  get isEditFileUploading(): boolean { return this.editFileUploadingCount > 0; }

  async onEditFile(editData: { messageId: string; file: any }) {
    const newFile: File = editData.file?.file;
    const messageId = editData.messageId;
    const oldFile = editData.file;
  
    if (!newFile || !messageId || !this.editingMessage) {
      return;
    }

    this.pendingFileEdit = {
      messageId,
      oldFile,
      newFile
    };
  }

  private updateEditingMessageOnly(message: GroupMessage, oldFile: any, newFileData: any): GroupMessage {
    let parsed: any;
    try { parsed = JSON.parse(message.content || '{}'); } catch { parsed = { text: message.content || '', files: [] }; }
    parsed.files = parsed.files || [];
    const idx = this.findFileIndex(parsed.files, oldFile);
    if (idx >= 0) {
      const oldFileData = { ...parsed.files[idx] };
      parsed.files[idx] = { ...newFileData, _forceUpdate: Date.now(), _typeChanged: oldFileData.type !== newFileData.type, _replacementKey: `replacement_${Date.now()}_${Math.random()}` };
    } else {
      const newF = { ...newFileData, _isNew: true, _forceUpdate: Date.now(), _addedKey: `added_${Date.now()}_${Math.random()}` };
      parsed.files.push(newF);
      parsed.files = this.removeDuplicateFiles(parsed.files);
    }
    const newMessage = { ...message, content: JSON.stringify(parsed) } as GroupMessage;
    (newMessage as any).parsedFiles = parsed.files;
    return newMessage;
  }

  private removeDuplicateFiles(files: any[]): any[] {
    const seen = new Set<string>();
    return files.filter(file => { const key = file.fileName; if (seen.has(key)) return false; seen.add(key); return true; });
  }

  private async uploadNewFile(file: File, uploadUrl: string): Promise<{
    fileName: string;
    uniqueFileName: string;
    url: string;
  }> {
    const { observable } = this.fileUploadApi.uploadFileWithProgress(
      file,
      uploadUrl,
      this.currentUserNickName
    );
  
    return new Promise((resolve, reject) => {
      let finalFileData: any = null;
      let lastProgress = 0;
  
      const subscription = observable.subscribe({
        next: (result: any) => {
          if (result.progress !== undefined && result.progress !== lastProgress) {
            lastProgress = result.progress;
          }
          
          if (result.fileData) {
            finalFileData = result.fileData;
          }
        },
        error: (error: any) => {
          subscription.unsubscribe();
          reject(error);
        },
        complete: () => {
          subscription.unsubscribe();
          
          if (finalFileData) {
            resolve(finalFileData);
          } else {
            console.error('❌ [UPLOAD NEW FILE] No file data received');
            reject(new Error('Upload completed but no file data received'));
          }
        }
      });
    });
  }

  private async getDownloadUrl(fileName: string): Promise<string> {    
    const downloadUrls = await this.fileUploadApi.getDownloadUrls(
      [fileName],
      this.currentUserNickName
    );
        
    const url = downloadUrls?.[0]?.url || '';
    
    if (!url) {
      console.warn('⚠️ [GET DOWNLOAD URL] No URL received for:', fileName);
    }
    
    return url;
  }

  private findFileIndex(files: any[], targetFile: any): number {
    const strategies = [
      (f: any) => f.uniqueFileName === targetFile.uniqueFileName,
      (f: any) => f.uniqueId === targetFile.uniqueId || f.uniqueFileName === targetFile.uniqueId,
      (f: any) => f.url === targetFile.url && f.url,
      (f: any) => f.fileName === targetFile.fileName && f.type === targetFile.type,
      (f: any) => f.fileName === targetFile.fileName,
      (f: any) => f.fileName === targetFile.fileName && f.size === targetFile.size,
      (_f: any, index: number) => index === 0 && files.length === 1
    ];
    for (let i = 0; i < strategies.length; i++) { const s = strategies[i]; const index = files.findIndex((f, idx) => s(f, idx)); if (index >= 0) return index; }
    return -1;
  }

  onEditCancel() { 
    this.pendingFileEdit = null;
    this.groupMessageState.cancelEdit(); 
  }
  
  onDeleteMessage(message: GroupMessage) { this.groupMessageState.startDeleteMessage(message); }

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
    this.closeUploadModal();
  }

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

  async onConfirmDelete() {
    const msg = this.groupMessageState.getMessageToDelete();
    if (msg && this.deleteForBoth) {
      await this.deleteFilesFromMessage(msg);
    }
    await this.groupMessageState.confirmDelete();
  }

  private async deleteFilesFromMessage(message: GroupMessage) {
    try {
      let parsed: any;
      try { parsed = JSON.parse(message.content); } catch { return; }
      if (!parsed.files || !Array.isArray(parsed.files) || parsed.files.length === 0) return;
      const filesToDelete = parsed.files
        .filter((file: any) => file.fileName && file.uniqueFileName)
        .map((file: any) => ({ fileName: file.fileName, uniqueFileName: file.uniqueFileName }));
      const deletionPromises = filesToDelete.map(async (file: { fileName: string; uniqueFileName: string }) => {
        try { return { ...file, success: await this.fileUploadApi.deleteSpecificFileVersion(file.uniqueFileName, this.currentUserNickName) }; }
        catch (error) { return { ...file, success: false, error }; }
      });
      const results = await Promise.all(deletionPromises);
      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        console.warn('❌ [DELETE FILES] Some files failed to delete:', failed);
      }
    } catch {}
  }

  isImageFile(file: File): boolean { return file.type.startsWith('image/'); }
  formatFileSize(size: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let index = 0; let formatted = size;
    while (formatted >= 1024 && index < units.length - 1) { formatted /= 1024; index++; }
    return `${formatted.toFixed(2)} ${units[index]}`;
  }

  private validateFiles(files: File[]): { validFiles: File[], errors: Array<{ fileName: string; error: 'size' | 'type'; actualSize?: number; actualType?: string; }> } {
    const validFiles: File[] = [];
    const errors: Array<{ fileName: string; error: 'size' | 'type'; actualSize?: number; actualType?: string; }> = [];
    files.forEach(file => {
      if (file.size > this.maxFileSize) {
        errors.push({ fileName: file.name, error: 'size', actualSize: file.size, actualType: file.type });
      } else {
        validFiles.push(file);
      }
    });
    return { validFiles, errors };
  }

  onFileValidationError(errors: Array<{ fileName: string; error: 'size' | 'type'; actualSize?: number; actualType?: string; }>) {
    this.fileValidationErrors = errors.map(error => {
      if (error.error === 'size') {
        const actualSize = this.formatFileSize(error.actualSize || 0);
        const maxSize = this.formatFileSize(this.maxFileSize);
        console.warn(`❌ File "${error.fileName}" exceeds size limit: ${actualSize} > ${maxSize}`);
      } else if (error.error === 'type') {
        const fileType = error.actualType || 'unknown';
        console.warn(`❌ File "${error.fileName}" has unsupported type: ${fileType}`);
      }
      return { ...error };
    });
    this.showErrorNotification = true;
    setTimeout(() => { this.showErrorNotification = false; this.cdr.detectChanges(); }, 500);
  }

  private getTotalUploadSize(): number { return this.uploadItems.reduce((sum, i) => sum + i.size, 0); }
  private checkUploadSizeLimit(): void {
    const total = this.getTotalUploadSize();
    const max = this.maxFileSize; const warn = max * 0.9;
    if (total > max) {
      console.warn(`❌ Total upload size ${this.formatFileSize(total)} exceeds limit (${this.formatFileSize(max)})`);
    } else if (total > warn) {
      console.warn(`⚠️ Total upload size ${this.formatFileSize(total)} is nearing limit (${this.formatFileSize(max)})`);
    }
  }

  onModalFileInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      const { validFiles, errors } = this.validateFiles(files);
      if (errors.length > 0) this.onFileValidationError(errors);
      if (validFiles.length > 0) {
        const newItems = validFiles.map(f => ({ file: f, name: f.name, size: f.size, progress: 0 }));
        this.uploadItems.push(...newItems);
        this.cdr.detectChanges();
      }
      input.value = '';
    }
  }

  async startUploadAndSend() {
    if (this.isEditingWithFiles && this.editingMessage) {
      if (this.uploadItems.length === 0 || this.isUploading) return;
      this.isUploading = true;
      
      try {
        const files = this.uploadItems.map(i => i.file);
        const uploadUrls = await this.fileUploadApi.getUploadUrls(files);
        const nameToUrl = new Map(uploadUrls.map(u => [u.originalName, u.url] as const));
        const uploadedFiles: Array<{ fileName: string; uniqueFileName: string; url: string }> = [];
  
        await Promise.all(this.uploadItems.map(item => new Promise<void>((resolve) => {
          const url = nameToUrl.get(item.name);
          if (!url) { item.error = 'No URL'; resolve(); return; }
          const uploadResult = this.fileUploadApi.uploadFileWithProgress(item.file, url, this.currentUserNickName);
          item.abort = uploadResult.abort;
          item.subscription = uploadResult.observable.subscribe({
            next: (result: { progress: number; fileData?: { fileName: string; uniqueFileName: string; url: string } }) => {
              item.progress = result.progress;
              if (result.fileData) uploadedFiles.push(result.fileData);
            },
            error: () => { item.error = 'Upload error'; item.progress = 0; resolve(); if (item.subscription) item.subscription.unsubscribe(); },
            complete: () => { item.url = url; item.progress = 100; resolve(); if (item.subscription) item.subscription.unsubscribe(); }
          });
        })));
  
        if (uploadedFiles.length) {
          const fileNames = uploadedFiles.map(f => f.fileName);
          try {
            const downloadUrls = await this.fileUploadApi.getDownloadUrls(fileNames);
            const updatedFiles = uploadedFiles.map(file => {
              const d = downloadUrls.find(x => x.originalName === file.fileName);
              return { ...file, url: d?.url || file.url };
            });
  
            let existingFiles: any[] = [];
            try {
              const parsed = JSON.parse(this.editingMessage.content);
              existingFiles = parsed.files || [];
            } catch {}
  
            const allFiles = [...existingFiles, ...updatedFiles];
            
            const content = JSON.stringify({ 
              text: this.uploadCaption || '', 
              files: allFiles 
            });
  
            await this.groupMessageState.completeEdit(this.editingMessage.id!, content);
            
          } catch (error) {
            console.error('❌ [UPLOAD] Failed to get download URLs:', error);
          }
        }
        
        this.closeUploadModal();
        this.isEditingWithFiles = false;
        
        // ✅ ИСПРАВЛЕНИЕ: Скролл после редактирования с файлами
        setTimeout(() => {
          if (this.messagesComponent) {
            this.messagesComponent.scrollToBottomAfterNewMessage();
          }
        }, 200);
        
      } catch (error) {
        console.error('❌ [UPLOAD] Upload failed:', error);
        this.isUploading = false;
      }
      return;
    }
  
    if (!this.selectedGroupId || this.uploadItems.length === 0 || this.isUploading) return;
    this.isUploading = true;
    
    if (this.uploadItems.length >= 40) {
      console.warn('⚠️ Uploading a large number of files may take some time.');
    }
    
    try {
      const files = this.uploadItems.map(i => i.file);
      const uploadUrls = await this.fileUploadApi.getUploadUrls(files);
      const nameToUrl = new Map(uploadUrls.map(u => [u.originalName, u.url] as const));
      const uploadedFiles: Array<{ fileName: string; uniqueFileName: string; url: string }> = [];
  
      await Promise.all(this.uploadItems.map(item => new Promise<void>((resolve) => {
        const url = nameToUrl.get(item.name);
        if (!url) { item.error = 'No URL'; resolve(); return; }
        const uploadResult = this.fileUploadApi.uploadFileWithProgress(item.file, url, this.currentUserNickName);
        item.abort = uploadResult.abort;
        item.subscription = uploadResult.observable.subscribe({
          next: (result: { progress: number; fileData?: { fileName: string; uniqueFileName: string; url: string } }) => {
            item.progress = result.progress;
            if (result.fileData) uploadedFiles.push(result.fileData);
          },
          error: () => { item.error = 'Upload error'; item.progress = 0; resolve(); if (item.subscription) item.subscription.unsubscribe(); },
          complete: () => { item.url = url; item.progress = 100; resolve(); if (item.subscription) item.subscription.unsubscribe(); }
        });
      })));
  
      if (uploadedFiles.length) {
        const fileNames = uploadedFiles.map(f => f.fileName);
        try {
          const downloadUrls = await this.fileUploadApi.getDownloadUrls(fileNames);
          const updatedFiles = uploadedFiles.map(file => {
            const d = downloadUrls.find(x => x.originalName === file.fileName);
            return { ...file, url: d?.url || file.url };
          });
          const content = JSON.stringify({ text: this.uploadCaption || '', files: updatedFiles });
          await this.groupMessageState.sendMessage(content);
          this.draftText = '';
          
          // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Скролл после отправки файлов
          setTimeout(() => {
            if (this.messagesComponent) {
              this.messagesComponent.scrollToBottomAfterNewMessage();
            }
          }, 200);
          
        } catch {
          const fallback = JSON.stringify({ text: this.uploadCaption || '', files: uploadedFiles });
          await this.groupMessageState.sendMessage(fallback);
          
          // ✅ Скролл в fallback тоже
          setTimeout(() => {
            if (this.messagesComponent) {
              this.messagesComponent.scrollToBottomAfterNewMessage();
            }
          }, 200);
        }
      }
      this.closeUploadModal();
    } catch {
      this.isUploading = false;
    }
  }

  cancelFileUpload(index: number) {
    const item = this.uploadItems[index];
    if (item.abort) item.abort();
    if (item.subscription) item.subscription.unsubscribe();
    this.uploadItems.splice(index, 1);
    if (this.uploadItems.length === 0) this.closeUploadModal();
  }

  removeFileFromList(index: number) { this.cancelFileUpload(index); }

  closeUploadModal() {
    this.isUploadModalOpen = false;
    this.isUploading = false;
    this.uploadItems = [];
    this.uploadCaption = '';
    this.isEditingWithFiles = false;
  }

  onUploadEnter(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!this.isUploading && this.uploadItems.length > 0) this.startUploadAndSend();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (this.isUploadModalOpen) { this.closeUploadModal(); return; }
    }
  }
}

export interface __GroupChatPageBindings {}