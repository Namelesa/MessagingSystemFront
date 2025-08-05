import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, from, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { GroupMessage } from '../model/group-message.model';
import { GroupChatApiService } from '../../group-chats';

@Injectable({ providedIn: 'root' })
export class GroupMessagesApiService {
  public messages$ = new BehaviorSubject<GroupMessage[]>([]);
  private currentGroupId: string | null = null;
  private listenersSetup = false;

  constructor(private chatApi: GroupChatApiService) {}

  private setupMessageListener() {
    const connection = this.getConnection();
    if (!connection || this.listenersSetup) {
      if (!connection) {
        console.log('No connection available');
      } else {
        console.log('Listeners already setup');
      }
      return;
    }

    try {
      connection.off('ReceiveMessage');
      connection.off('MessageEdited');
      connection.off('MessageDeleted');
      connection.off('MessageSoftDeleted');
    } catch (error) {
      console.warn('Error removing listeners:', error);
    }

    connection.on('ReceiveMessage', (msg: any) => {
      if (msg.groupId === this.currentGroupId) {
        const currentMessages = this.messages$.value;
        
        const messageExists = currentMessages.some(m => m.id === msg.id);
        
        if (!messageExists) {
          const newMessage: GroupMessage = {
            id: msg.id,
            groupId: msg.groupId,
            sender: msg.sender,
            content: msg.content,
            sendTime: msg.sendTime,
            isEdited: false,
            editTime: undefined,
            isDeleted: false,
            replyFor: msg.replyTo || undefined
          };
          
          const newMessages = [...currentMessages, newMessage];
          this.messages$.next(newMessages);
        }
      }
    });

    connection.on('MessageEdited', (editInfo: any) => {
      if (editInfo.messageId) {
        const currentMessages = this.messages$.value;
        const updatedMessages = currentMessages.map(m => {
          if (m.id === editInfo.messageId) {
            return {
              ...m,
              content: editInfo.newContent,
              isEdited: true,
              editTime: editInfo.editedAt
            };
          }
          return m;
        });
        this.messages$.next(updatedMessages);
      }
    });

    connection.on('MessageSoftDeleted', (deleteInfo: any) => {
      if (deleteInfo.messageId) {
        const currentMessages = this.messages$.value;
        const updatedMessages = currentMessages.map(m => {
          if (m.id === deleteInfo.messageId) {
            return {
              ...m,
              isDeleted: true
            };
          }
          return m;
        });
        this.messages$.next(updatedMessages);
      }
    });

    connection.on('MessageDeleted', (deleteInfo: any) => {
      const messageId = deleteInfo.messageId || deleteInfo;
      const currentMessages = this.messages$.value;
      const updatedMessages = currentMessages.filter(m => m.id !== messageId);
      this.messages$.next(updatedMessages);
    });

    connection.on('MessageReplied', (replyData: any) => {
      if (replyData.groupId === this.currentGroupId) {
        const currentMessages = this.messages$.value;
        
        const messageExists = currentMessages.some(m => m.id === replyData.messageId);
        
        if (!messageExists) {
          const newMessage: GroupMessage = {
            id: replyData.messageId,
            groupId: this.currentGroupId!,
            sender: replyData.sender,
            content: replyData.content,
            sendTime: replyData.sentAt,
            isEdited: false,
            editTime: undefined,
            isDeleted: false,
            replyFor: replyData.replyTo
          };
          
          const newMessages = [...currentMessages, newMessage];
          this.messages$.next(newMessages);
        }
      }
    });

    this.listenersSetup = true;
  }

  private getConnection(): signalR.HubConnection | null {
    const connection = (this.chatApi as any).connection;
    
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
      return connection;
    }
    
    if (connection) {
    } else {
      console.log('No connection found');
    }
    
    return null;
  }

  private async ensureConnection(): Promise<signalR.HubConnection> {
    const connection = this.getConnection();
    if (connection) {
      return connection;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
    const retryConnection = this.getConnection();
    if (!retryConnection) {
      throw new Error('SignalR connection not established');
    }
    return retryConnection;
  }

  loadChatHistory(groupId: string, take = 20, skip = 0): Observable<GroupMessage[]> {
    if (this.currentGroupId !== groupId) {
      this.listenersSetup = false;
    }
    
    this.currentGroupId = groupId;
    
    return from(
      this.ensureConnection().then(async (connection) => {
        try {
          if (!this.listenersSetup) {
            this.setupMessageListener();
          }
          
          if (skip === 0) {
            await connection.invoke('JoinGroupAsync', groupId);
          }
          
          const messages = await connection.invoke<GroupMessage[]>(
            'LoadChatHistoryAsync', 
            groupId, 
            skip, 
            take
          );
          
          return messages || [];
        } catch (error) {
          console.error('Error in loadChatHistory:', error);
          throw error;
        }
      })
    ).pipe(
      tap(messages => {
        if (skip === 0) {
          this.messages$.next(messages);
        } else {
          const currentMessages = this.messages$.value;
          const existingIds = new Set(currentMessages.map(m => m.id));
          const uniqueNewMessages = messages.filter(m => !existingIds.has(m.id));
          
          if (uniqueNewMessages.length > 0) {
            const updatedMessages = [...uniqueNewMessages, ...currentMessages];
            this.messages$.next(updatedMessages);
          }
        }
      })
    );
  }

  private async leaveCurrentGroup() {
    if (this.currentGroupId) {
      try {
        const connection = this.getConnection();
        if (connection) {
          await connection.invoke('LeaveGroupAsync', this.currentGroupId);
        }
      } catch (error) {
        console.error('Error leaving group:', error);
      }
    }
  }

  cleanup() {
    this.leaveCurrentGroup();
    this.currentGroupId = null;
    this.messages$.next([]);
    this.listenersSetup = false;
  }

  async sendMessage(groupId: string, content: string) {
    try {
      const connection = await this.ensureConnection();
      await connection.invoke('SendMessageAsync', content, groupId);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async editMessage(messageId: string, content: string, groupId: string) {
    try {
      const connection = await this.ensureConnection();
      await connection.invoke('EditMessageAsync', messageId, content, groupId);
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }

  async deleteMessage(messageId: string, groupId: string) {
    try {
      const connection = await this.ensureConnection();
      await connection.invoke('DeleteMessageAsync', messageId, groupId);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  async softDeleteMessage(messageId: string, groupId: string) {
    try {
      const connection = await this.ensureConnection();
      await connection.invoke('SoftDeleteMessageAsync', messageId, groupId);
    } catch (error) {
      console.error('Error soft deleting message:', error);
      throw error;
    }
  }

  async replyToMessage(messageId: string, content: string, groupId: string) {
    try {
      const connection = await this.ensureConnection();
      await connection.invoke('ReplyForMessageAsync', messageId, content, groupId);
    } catch (error) {
      console.error('Error replying to message:', error);
      throw error;
    }
  }
}