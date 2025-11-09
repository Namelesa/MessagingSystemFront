import { Observable } from 'rxjs';
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
import { GroupFileUploadService} from '../../model/group-file-state.service';
import { GroupFileEditService } from '../../model/group-edit-file.service';
import { GroupModalStateService } from '../../model/group-modal-state.service';

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
  isDragOver = false;
  draftText: string = '';
  user$: Observable<SearchUser | null>;
  userSuggestion: SearchUser[] = [];

  @Input() edit: string = '';
  @ViewChild(GroupMessagesWidget) messagesComponent?: GroupMessagesWidget;
  @ViewChild(GroupChatListComponent) chatListComponent?: GroupChatListComponent;

  constructor(
    private groupChatApi: GroupChatApiService,
    public groupMessages: GroupMessagesApiService,
    public fileUploadService: GroupFileUploadService,
    private cdr: ChangeDetectorRef,
    private findUserStore: FindUserStore,
    public fileEditService: GroupFileEditService,
    public groupUserState: GroupUserStateService,
    public groupMessageState: GroupMessageStateService,
    private groupNavigation: GroupNavigationService,
    private groupSearch: GroupSearchService,
    public modalState: GroupModalStateService,
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
      
      setTimeout(() => {
        if (this.messagesComponent) {
          this.messagesComponent.scrollToBottomAfterNewMessage();
        }
      }, 300);
    }
  }

  onHeaderClick() {
    this.modalState.openGroupInfoModal();
  }

  closeGroupInfoModal() {
    this.modalState.closeGroupInfoModal();
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
      this.fileUploadService.setUploadItems(fileUploadEvent.files);
      
      let currentText = '';
      try {
        const parsed = JSON.parse(this.editingMessage.content);
        currentText = parsed.text || '';
      } catch {
        currentText = this.editingMessage.content || '';
      }
      
      this.fileUploadService.openUploadModal(currentText, true);
      return;
    }
  
    if (!this.selectedGroupId || fileUploadEvent.files.length === 0) return;
    
    this.fileUploadService.setUploadItems(fileUploadEvent.files);
    this.fileUploadService.openUploadModal(fileUploadEvent.message || this.draftText || '', false);
  }

  onEditMessage(message: GroupMessage) {
    this.groupMessageState.startEditMessage(message);
  }

  async onEditComplete(editData: { messageId: string; content: string }) {
    try {
      const pendingEdit = this.fileEditService.getPendingFileEdit();
      if (pendingEdit && pendingEdit.messageId === editData.messageId) {
        this.cdr.detectChanges();
  
        const result = await this.fileEditService.executeFileReplacement(
          editData.messageId,
          this.currentUserNickName
        );
  
        if (!result.success) {
          throw new Error(result.error || 'File replacement failed');
        }
  
        await this.groupMessageState.completeEditWithFile(
          editData.messageId,
          editData.content,
          { oldFile: pendingEdit.oldFile, newFileData: result.newFileData },
          async (uniqueFileName: string) => {
            await this.fileUploadService.deleteSpecificFile(
              uniqueFileName,
              this.currentUserNickName
            );
          }
        );
        
        this.cdr.detectChanges();
      } 
      else {
        await this.groupMessageState.completeEdit(editData.messageId, editData.content);
      }
      
      this.scrollToBottom();
      
    } catch (error) {
      console.error('❌ [EDIT COMPLETE] Error:', error);
    }
  }

  async onEditFile(editData: { messageId: string; file: any }) {
    const newFile: File = editData.file?.file;
    const messageId = editData.messageId;
    const oldFile = editData.file;
  
    if (!newFile || !messageId || !this.editingMessage) {
      return;
    }
  
    this.fileEditService.handleEditFile(messageId, oldFile, newFile);
  }

  onEditCancel() { 
    this.fileEditService.clearPendingFileEdit();
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

  @HostListener('document:keydown.escape')
    onEscapePressed() {
    this.resetSelectedChat();
  }

  private resetSelectedChat(): void {
    this.selectedChat = undefined;
    this.selectedChatImage = undefined;
    this.groupMessageState.resetAll();
    this.fileUploadService.closeUploadModal();
    this.modalState.closeAllModals(); 
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
      await this.fileUploadService.deleteFilesFromMessage(msg.content, this.currentUserNickName);
    }
    await this.groupMessageState.confirmDelete();
  }

  onModalFileInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      this.fileUploadService.addUploadItems(files);
      input.value = '';
    }
  }

  async startUploadAndSend() {
    try {
      const uploadedFiles = await this.fileUploadService.uploadFiles(this.currentUserNickName);
      
      if (uploadedFiles.length === 0) {
        this.fileUploadService.closeUploadModal();
        return;
      }
  
      const filesWithUrls = await this.getFilesWithDownloadUrls(uploadedFiles);
      const caption = this.fileUploadService.uploadCaption || '';
  
      if (this.fileUploadService.isEditingWithFiles && this.editingMessage) {
        await this.groupMessageState.addFilesToMessage(
          this.editingMessage.id!,
          filesWithUrls
        );
      } 
      else if (this.selectedGroupId) {
        await this.groupMessageState.sendMessageWithFiles(caption, filesWithUrls);
        this.draftText = '';
      }
  
      this.fileUploadService.closeUploadModal();
      this.scrollToBottom();
      
    } catch (error) {
      console.error('❌ [UPLOAD] Failed:', error);
    }
  }
  
  private async getFilesWithDownloadUrls(uploadedFiles: any[]): Promise<any[]> {
    const fileNames = uploadedFiles.map(f => f.fileName);
    
    try {
      const downloadUrls = await this.fileUploadService.getDownloadUrls(
        fileNames,
        this.currentUserNickName
      );
      
      return uploadedFiles.map(file => {
        const downloadUrl = downloadUrls.find(x => x.originalName === file.fileName);
        return { ...file, url: downloadUrl?.url || file.url };
      });
    } catch (error) {
      console.warn('⚠️ Failed to get download URLs, using upload URLs', error);
      return uploadedFiles;
    }
  }
  
  private scrollToBottom() {
    setTimeout(() => {
      if (this.messagesComponent) {
        this.messagesComponent.scrollToBottomAfterNewMessage();
      }
    }, 200);
  }

  onUploadEnter(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!this.fileUploadService.isUploading && this.fileUploadService.uploadItems.length > 0) {
        this.startUploadAndSend();
      }
    }
  }

  get isUploading(): boolean {
    return this.fileUploadService.isUploading;
  }

  get uploadCaption(): string {
    return this.fileUploadService.uploadCaption;
  }
  
  set uploadCaption(value: string) {
    this.fileUploadService.setUploadCaption(value);
  }

  get groupInfoModalOpen(): boolean {
    return this.modalState.isGroupInfoModalOpen;
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (this.fileUploadService.isUploadModalOpen) {
        this.fileUploadService.closeUploadModal();
        return;
      }
      if (this.modalState.isGroupInfoModalOpen) {
        this.modalState.closeGroupInfoModal();
        return;
      }
      if (this.modalState.isDeleteModalOpen) {
        this.modalState.closeDeleteModal();
        return;
      }
    }
  }
}

export interface __GroupChatPageBindings {}