import { Injectable } from '@angular/core';
import { OtoChatApiService } from '../../oto-chats/api/oto-chat-hub.api';
import * as signalR from '@microsoft/signalr';

@Injectable({ providedIn: 'root' })
export class OtoMessagesService {
  constructor(private chatApi: OtoChatApiService) {}

  private getConnection(): signalR.HubConnection | null {
    const connection = (this.chatApi as any).connection;
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
      return connection;
    }
    return null;
  }

  async sendMessage(recipient: string, content: string) {
    try {
      const connection = this.getConnection();
      if (!connection) {
        throw new Error('Connection not established');
      }
      await connection.invoke('SendMessageAsync', recipient, content);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async editMessage(messageId: string, content: string) {
    try {
      const connection = this.getConnection();
      if (!connection) {
        throw new Error('Connection not established');
      }
      await connection.invoke('EditMessageAsync', messageId, content);
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }

  async deleteMessage(messageId: string, deleteType: 'soft' | 'hard') {
    try {
      const connection = this.getConnection();
      if (!connection) {
        throw new Error('Connection not established');
      }
      await connection.invoke('DeleteMessageAsync', messageId, deleteType);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  async replyToMessage(messageId: string, content: string, recipient: string) {
    try {
      const connection = this.getConnection();
      if (!connection) {
        throw new Error('Connection not established');
      }
      await connection.invoke('ReplyToMessageAsync', recipient, content, messageId);
    } catch (error) {
      console.error('Error replying to message:', error);
      throw error;
    }
  }
}