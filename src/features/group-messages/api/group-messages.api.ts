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
      } else {
      }
      return;
    }

    try {
      connection.off('ReceiveMessage');
      connection.off('MessageEdited');
      connection.off('MessageDeleted');
    } catch (error) {
      console.warn('Error removing listeners:', error);
    }

connection.on('ReceiveMessage', (msg: GroupMessage) => {
  if (msg.groupId === this.currentGroupId) {
    const currentMessages = this.messages$.value;
  
    const messageExists = currentMessages.some(m => {
      const exists = m.id === msg.id;
      return exists;
    });
    
    if (!messageExists) {
      const newMessages = [...currentMessages, msg];
      this.messages$.next(newMessages);
    } else {
      const duplicateMsg = currentMessages.find(m => m.id === msg.id);
    }
  }
});

    connection.on('MessageEdited', (msg: GroupMessage) => {
      if (msg.groupId === this.currentGroupId) {
        const currentMessages = this.messages$.value;
        const updatedMessages = currentMessages.map(m => 
          m.id === msg.id ? msg : m
        );
        this.messages$.next(updatedMessages);
      }
    });

    connection.on('MessageDeleted', (messageId: string, groupId: string) => {
      if (groupId === this.currentGroupId) {
        const currentMessages = this.messages$.value;
        const updatedMessages = currentMessages.map(m => 
          m.id === messageId ? { ...m, isDeleted: true } : m
        );
        this.messages$.next(updatedMessages);
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
      console.log('Connection exists but state is:', connection.state);
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