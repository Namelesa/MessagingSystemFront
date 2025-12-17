import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { OtoChat } from '../model/oto.chat';
import { OtoMessage } from '../../../entities/oto-message';
import { OtoChatApiService } from '../api/oto-chat/oto-chat-hub.api';
import { OtoMessagesService } from '../api/oto-message/oto-messages.api';

interface OtoChatState {
  selectedChat?: OtoChat;
  currentUserNickName: string;
  editingMessage?: OtoMessage;
  replyingToMessage?: OtoMessage;
  showUserDeletedNotification: boolean;
  deletedUserName?: string;
}

@Injectable()
export class OtoChatStore {
  private state$ = new BehaviorSubject<OtoChatState>({
    currentUserNickName: '',
    showUserDeletedNotification: false
  });

  constructor(
    private chatApi: OtoChatApiService,
    private messageApi: OtoMessagesService
  ) {
    this.subscribeToUserEvents();
  }

  get snapshot() {
    return this.state$.value;
  }

  stateChanges$ = this.state$.asObservable();

  patch(partial: Partial<OtoChatState>) {
    this.state$.next({ ...this.snapshot, ...partial });
  }

  selectChat(chat: OtoChat) {
    this.patch({ selectedChat: chat, editingMessage: undefined, replyingToMessage: undefined });
  }

  clearSelectedChat() {
    this.patch({ selectedChat: undefined, editingMessage: undefined, replyingToMessage: undefined });
  }

  setEditingMessage(message?: OtoMessage) {
    this.patch({ editingMessage: message, replyingToMessage: undefined });
  }

  setReplyingTo(message?: OtoMessage) {
    this.patch({ replyingToMessage: message, editingMessage: undefined });
  }

  async sendMessage(content: string) {
    const { selectedChat, replyingToMessage } = this.snapshot;
    if (!selectedChat) return;

    if (replyingToMessage) {
      await this.messageApi.replyToMessage(replyingToMessage.messageId, content, selectedChat.nickName);
      this.setReplyingTo(undefined);
    } else {
      await this.messageApi.sendMessage(selectedChat.nickName, content);
    }
  }

  async editMessage(messageId: string, content: string) {
    await this.messageApi.editMessage(messageId, content);
    this.setEditingMessage(undefined);
  }

  async deleteMessage(messageId: string, forBoth: boolean) {
    await this.messageApi.deleteMessage(messageId, forBoth ? 'hard' : 'soft');
  }

  private subscribeToUserEvents() {
    this.chatApi.userInfoDeleted$.subscribe(deleted => {
      if (this.snapshot.selectedChat?.nickName === deleted.userName) {
        this.clearSelectedChat();
        this.patch({ showUserDeletedNotification: true, deletedUserName: deleted.userName });
      }
    });

    this.chatApi.userInfoUpdated$.subscribe(updated => {
      if (!updated) return;
      if (updated.oldNickName === this.snapshot.currentUserNickName) {
        this.patch({ currentUserNickName: updated.userName });
      }
      if (this.snapshot.selectedChat?.nickName === updated.oldNickName) {
        this.patch({
          selectedChat: {
            ...this.snapshot.selectedChat,
            nickName: updated.userName,
            image: updated.image || this.snapshot.selectedChat?.image
          }
        });
      }
    });
  }
}
