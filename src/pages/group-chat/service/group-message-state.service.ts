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
  deleteForBoth: boolean; // soft vs hard
  forceMessageComponentReload: boolean;
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

  get state(): GroupMessageState {
    return this.stateSubject.value;
  }

  getEditingMessage(): GroupMessage | undefined { return this.state.editingMessage; }
  getReplyingToMessage(): GroupMessage | undefined { return this.state.replyingToMessage; }
  getIsDeleteModalOpen(): boolean { return this.state.isDeleteModalOpen; }
  getDeleteForBoth(): boolean { return this.state.deleteForBoth; }

  private update(updates: Partial<GroupMessageState>): void {
    this.stateSubject.next({ ...this.state, ...updates });
  }

  async sendMessage(content: string): Promise<void> {
    const groupId = this.userState['selectedGroupIdSubject'].value as string | undefined;
    if (!groupId || !content.trim()) return;

    if (this.state.replyingToMessage) {
      await this.messagesApi.replyToMessage(this.state.replyingToMessage.id, content, groupId);
      this.cancelReply();
    } else {
      await this.messagesApi.sendMessage(groupId, content);
    }
  }

  startEditMessage(message: GroupMessage): void {
    this.update({ editingMessage: message, replyingToMessage: undefined });
  }

  async completeEdit(messageId: string, content: string): Promise<void> {
    const groupId = this.userState['selectedGroupIdSubject'].value as string | undefined;
    if (!groupId) return;
    await this.messagesApi.editMessage(messageId, content, groupId);
    this.cancelEdit();
  }

  cancelEdit(): void {
    this.update({ editingMessage: undefined });
  }

  startDeleteMessage(message: GroupMessage): void {
    this.update({ messageToDelete: message, isDeleteModalOpen: true });
  }

  async confirmDelete(): Promise<void> {
    const groupId = this.userState['selectedGroupIdSubject'].value as string | undefined;
    const { messageToDelete, deleteForBoth } = this.state;
    if (!groupId || !messageToDelete) return;

    if (deleteForBoth) {
      await this.messagesApi.deleteMessage(messageToDelete.id, groupId);
    } else {
      await this.messagesApi.softDeleteMessage(messageToDelete.id, groupId);
    }
    this.closeDeleteModal();
  }

  closeDeleteModal(): void {
    this.update({ isDeleteModalOpen: false, messageToDelete: undefined, deleteForBoth: false });
  }

  setDeleteForBoth(value: boolean): void {
    this.update({ deleteForBoth: value });
  }

  startReplyToMessage(message: GroupMessage): void {
    this.update({ replyingToMessage: message, editingMessage: undefined });
  }

  cancelReply(): void {
    this.update({ replyingToMessage: undefined });
  }

  forceMessageComponentReload(): void {
    this.update({ forceMessageComponentReload: true });
    setTimeout(() => this.update({ forceMessageComponentReload: false }), 0);
  }

  resetAll(): void {
    this.stateSubject.next({
      isDeleteModalOpen: false,
      deleteForBoth: false,
      forceMessageComponentReload: false
    });
  }
}


