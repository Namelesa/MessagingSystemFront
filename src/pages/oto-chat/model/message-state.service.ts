import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { OtoMessage } from '../../../entities/oto-message';
import { OtoMessagesService } from '../api/oto-message/oto-messages.api';
import { UserStateService } from './user-state.service';
import { OtoChatMessagesWidget } from '../../../widgets/chat-messages';

export interface MessageState {
  editingMessage?: OtoMessage;
  replyingToMessage?: OtoMessage;
  messageToDelete?: OtoMessage;
  isDeleteModalOpen: boolean;
  deleteForBoth: boolean;
  forceMessageComponentReload: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MessageStateService {
  private messageStateSubject = new BehaviorSubject<MessageState>({
    isDeleteModalOpen: false,
    deleteForBoth: false,
    forceMessageComponentReload: false
  });

  public messageState$ = this.messageStateSubject.asObservable();

  private messagesWidgetRef?: OtoChatMessagesWidget;

  constructor(
    private messageService: OtoMessagesService,
    private userStateService: UserStateService
  ) {}

  setMessagesWidget(widget: OtoChatMessagesWidget | undefined): void {
    this.messagesWidgetRef = widget;
  }

  handleNewMessages(messages: OtoMessage[]): void {
    if (this.messagesWidgetRef) {
      this.messagesWidgetRef.handleNewMessages(messages);
    }
  }

  scrollToBottom(): void {
    if (this.messagesWidgetRef) {
      this.messagesWidgetRef.scrollToBottomAfterNewMessage();
    }
  }

  forceMessageUpdate(messageId: string): void {
    if (this.messagesWidgetRef) {
      this.messagesWidgetRef.fullMessageRerender(messageId);
    }
  }

  scrollToMessage(messageId: string): void {
    if (this.messagesWidgetRef) {
      this.messagesWidgetRef.scrollToMessage(messageId);
    }
  }

  getCurrentMessageState(): MessageState {
    return this.messageStateSubject.value;
  }

  private updateState(updates: Partial<MessageState>): void {
    const currentState = this.getCurrentMessageState();
    this.messageStateSubject.next({ ...currentState, ...updates });
  }

  async sendMessage(content: string): Promise<void> {
    const selectedChat = this.userStateService.getSelectedChat();
    if (!selectedChat) return;

    const currentState = this.getCurrentMessageState();

    try {
      if (currentState.replyingToMessage) {
        await this.messageService.replyToMessage(
          currentState.replyingToMessage.messageId, 
          content, 
          selectedChat
        );
        this.cancelReply();
      } else {
        await this.messageService.sendMessage(selectedChat, content);
      }
      
      // ✅ Скроллим вниз после отправки
      setTimeout(() => this.scrollToBottom(), 150);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  startEditMessage(message: OtoMessage): void {
    this.updateState({
      editingMessage: message,
      replyingToMessage: undefined
    });
  }

  async completeEdit(messageId: string, content: string): Promise<void> {
    try {
      await this.messageService.editMessage(messageId, content);
      this.cancelEdit();
      
      setTimeout(() => this.forceMessageUpdate(messageId), 100);
      setTimeout(() => this.scrollToBottom(), 150);
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }

  cancelEdit(): void {
    this.updateState({ editingMessage: undefined });
  }

  startDeleteMessage(message: OtoMessage): void {
    this.updateState({
      messageToDelete: message,
      isDeleteModalOpen: true
    });
  }

  async confirmDelete(): Promise<void> {
    const currentState = this.getCurrentMessageState();
    const selectedChat = this.userStateService.getSelectedChat();
    
    if (!currentState.messageToDelete || !selectedChat) return;

    const deleteType = currentState.deleteForBoth ? 'hard' : 'soft';
    
    try {
      await this.messageService.deleteMessage(currentState.messageToDelete.messageId, deleteType);
      this.closeDeleteModal();
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  closeDeleteModal(): void {
    this.updateState({
      isDeleteModalOpen: false,
      messageToDelete: undefined,
      deleteForBoth: false
    });
  }

  setDeleteForBoth(value: boolean): void {
    this.updateState({ deleteForBoth: value });
  }

  startReplyToMessage(message: OtoMessage): void {
    this.updateState({
      replyingToMessage: message,
      editingMessage: undefined
    });
  }

  cancelReply(): void {
    this.updateState({ replyingToMessage: undefined });
  }

  forceMessageComponentReload(): void {
    this.updateState({ forceMessageComponentReload: true });
    queueMicrotask(() => this.updateState({ forceMessageComponentReload: false }));
  }

  resetAllStates(): void {
    this.messageStateSubject.next({
      isDeleteModalOpen: false,
      deleteForBoth: false,
      forceMessageComponentReload: false
    });
    this.messagesWidgetRef = undefined; 
  }

  resetEditingStates(): void {
    this.updateState({
      editingMessage: undefined,
      replyingToMessage: undefined
    });
  }
}