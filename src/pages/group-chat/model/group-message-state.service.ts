import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GroupMessage } from '../../../entities/group-message';
import { GroupMessagesApiService } from '../api/group-message/group-messages.api';
import { GroupUserStateService } from './group-user-state.service';

export interface GroupMessageState {
  editingMessage?: GroupMessage;
  replyingToMessage?: GroupMessage;
  messageToDelete?: GroupMessage;
  isDeleteModalOpen: boolean;
  deleteForBoth: boolean;
  forceMessageComponentReload: boolean;
}

export interface UploadedFile {
  fileName: string;
  uniqueFileName: string;
  url: string;
  type?: string;
  size?: number;
}

export interface FileEditData {
  oldFile: any;
  newFileData: any;
}

export interface MessageContent {
  text: string;
  files?: UploadedFile[];
}

@Injectable({ providedIn: 'root' })
export class GroupMessageStateService {
  private stateSubject = new BehaviorSubject<GroupMessageState>({
    isDeleteModalOpen: false,
    deleteForBoth: false,
    forceMessageComponentReload: false
  });
  public state$ = this.stateSubject.asObservable();

  constructor(
    private messagesApi: GroupMessagesApiService,
    private userState: GroupUserStateService
  ) {}

  get state(): GroupMessageState { return this.stateSubject.value; }
  getEditingMessage(): GroupMessage | undefined { return this.state.editingMessage; }
  getReplyingToMessage(): GroupMessage | undefined { return this.state.replyingToMessage; }
  getIsDeleteModalOpen(): boolean { return this.state.isDeleteModalOpen; }
  getDeleteForBoth(): boolean { return this.state.deleteForBoth; }
  getMessageToDelete(): GroupMessage | undefined { return this.state.messageToDelete; }

  private update(updates: Partial<GroupMessageState>): void {
    this.stateSubject.next({ ...this.state, ...updates });
  }

  private getGroupMemberIds(): string[] {
    const members = this.userState.getGroupMembers();
    if (!members || members.length === 0) {
      console.warn('⚠️ No group members found');
      return [];
    }
    return members.map(m => m.nickName);
  }

  async sendMessage(content: string): Promise<void> {
    const groupId = this.userState.getSelectedGroupId();
    var membersId = this.getGroupMemberIds();
    if (!groupId || !content.trim()) return;
    if (this.state.replyingToMessage) {
      await this.messagesApi.replyToMessage(this.state.replyingToMessage.id, content, groupId, membersId);
      this.cancelReply();
    } else {
      await this.messagesApi.sendMessage(groupId, content, membersId);
    }
  }

  startEditMessage(message: GroupMessage): void { this.update({ editingMessage: message, replyingToMessage: undefined }); }
  async completeEdit(messageId: string, content: string): Promise<void> { const gid = this.userState.getSelectedGroupId(); if (!gid) return; await this.messagesApi.editMessage(messageId, content, gid, this.getGroupMemberIds()); this.cancelEdit(); }
  cancelEdit(): void { this.update({ editingMessage: undefined }); }

  startDeleteMessage(message: GroupMessage): void { this.update({ messageToDelete: message, isDeleteModalOpen: true }); }
  async confirmDelete(): Promise<void> { const gid = this.userState.getSelectedGroupId(); const { messageToDelete, deleteForBoth } = this.state; if (!gid || !messageToDelete) return; if (deleteForBoth) { await this.messagesApi.deleteMessage(messageToDelete.id, gid); } else { await this.messagesApi.softDeleteMessage(messageToDelete.id, gid); } this.closeDeleteModal(); }
  closeDeleteModal(): void { this.update({ isDeleteModalOpen: false, messageToDelete: undefined, deleteForBoth: false }); }
  setDeleteForBoth(value: boolean): void { this.update({ deleteForBoth: value }); }

  startReplyToMessage(message: GroupMessage): void { this.update({ replyingToMessage: message, editingMessage: undefined }); }
  cancelReply(): void { this.update({ replyingToMessage: undefined }); }
  forceMessageComponentReload(): void { this.update({ forceMessageComponentReload: true }); setTimeout(() => this.update({ forceMessageComponentReload: false }), 0); }
  resetAll(): void { this.stateSubject.next({ isDeleteModalOpen: false, deleteForBoth: false, forceMessageComponentReload: false }); }

  async sendMessageWithFiles(text: string, files: UploadedFile[]): Promise<void> {
    const groupId = this.userState.getSelectedGroupId();
    if (!groupId) return;
  
    const content: MessageContent = {
      text: text.trim(),
      files: files.length > 0 ? files : undefined
    };
  
    const jsonContent = JSON.stringify(content);
  
    if (this.state.replyingToMessage) {
      var membersId = this.getGroupMemberIds();
      await this.messagesApi.replyToMessage(
        this.state.replyingToMessage.id,
        jsonContent,
        groupId,
        membersId
      );
      this.cancelReply();
    } else {
      var membersId = this.getGroupMemberIds();
      await this.messagesApi.sendMessage(groupId, jsonContent, membersId);
    }
  }

  async completeEditWithFile(
    messageId: string,
    content: string,
    fileEditData?: FileEditData,
    onFileDelete?: (uniqueFileName: string) => Promise<void>
  ): Promise<void> {
    const gid = this.userState.getSelectedGroupId();
    if (!gid) return;
  
    let finalContent = content;

    if (fileEditData) {
      const { oldFile, newFileData } = fileEditData;
      
      if (oldFile?.uniqueFileName && onFileDelete) {
        try {
          await onFileDelete(oldFile.uniqueFileName);
        } catch (error) {
          console.warn('⚠️ Failed to delete old file:', error);
        }
      }
      
      finalContent = this.replaceFileInContent(content, oldFile, newFileData);
    }
    var membersId = this.getGroupMemberIds();
    await this.messagesApi.editMessage(messageId, finalContent, gid, membersId);
    this.cancelEdit();
  }

  async addFilesToMessage(messageId: string, newFiles: UploadedFile[]): Promise<void> {
    const gid = this.userState.getSelectedGroupId();
    if (!gid || !this.state.editingMessage) return;
  
    let existingContent: MessageContent;
    try {
      existingContent = JSON.parse(this.state.editingMessage.content);
    } catch {
      existingContent = {
        text: this.state.editingMessage.content || '',
        files: []
      };
    }
  
    const allFiles = [...(existingContent.files || []), ...newFiles];
    const updatedContent: MessageContent = {
      text: existingContent.text,
      files: allFiles.length > 0 ? allFiles : undefined
    };
  
    await this.messagesApi.editMessage(messageId, JSON.stringify(updatedContent), gid, this.getGroupMemberIds());
    this.cancelEdit();
  }

  async updateMessageText(messageId: string, newText: string): Promise<void> {
    const gid = this.userState.getSelectedGroupId();
    if (!gid || !this.state.editingMessage) return;
  
    let content: MessageContent;
    try {
      content = JSON.parse(this.state.editingMessage.content);
      content.text = newText.trim();
    } catch {
      content = { text: newText.trim() };
    }
  
    await this.messagesApi.editMessage(messageId, JSON.stringify(content), gid, this.getGroupMemberIds());
    this.cancelEdit();
  }

  parseMessageContent(message: GroupMessage): MessageContent {
    try {
      const parsed = JSON.parse(message.content);
      return {
        text: parsed.text || '',
        files: parsed.files || []
      };
    } catch {
      return {
        text: message.content || '',
        files: []
      };
    }
  }

  hasFiles(message: GroupMessage): boolean {
    try {
      const parsed = JSON.parse(message.content);
      return Array.isArray(parsed.files) && parsed.files.length > 0;
    } catch {
      return false;
    }
  }

  getMessageFiles(message: GroupMessage): UploadedFile[] {
    try {
      const parsed = JSON.parse(message.content);
      return parsed.files || [];
    } catch {
      return [];
    }
  }

  
  private replaceFileInContent(content: string, oldFile: any, newFileData: any): string {
    let parsed: MessageContent;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { text: content, files: [] };
    }
  
    if (!parsed.files) {
      parsed.files = [];
    }
  
    const fileIndex = this.findFileIndex(parsed.files, oldFile);
  
    if (fileIndex >= 0) {
      parsed.files[fileIndex] = {
        ...newFileData,
        _forceUpdate: Date.now(),
        _replacementKey: `replacement_${Date.now()}_${Math.random()}`
      };
    } else {
      parsed.files.push({
        ...newFileData,
        _isNew: true,
        _addedKey: `added_${Date.now()}_${Math.random()}`
      });
    }
  
    return JSON.stringify(parsed);
  }

  private findFileIndex(files: any[], targetFile: any): number {
    const strategies = [
      (f: any) => f.uniqueFileName === targetFile.uniqueFileName,
      (f: any) => f.uniqueId === targetFile.uniqueId,
      (f: any) => f.fileName === targetFile.fileName && f.type === targetFile.type,
      (f: any) => f.fileName === targetFile.fileName,
      (f: any) => f.url === targetFile.url && f.url
    ];
  
    for (const strategy of strategies) {
      const index = files.findIndex(strategy);
      if (index >= 0) return index;
    }
  
    return -1;
  }
}