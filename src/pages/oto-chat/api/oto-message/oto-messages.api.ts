import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { SignalRConnectionRegistryService } from '../../../../shared/realtime';

@Injectable({ providedIn: 'root' })
export class OtoMessagesService {
  constructor(private registry: SignalRConnectionRegistryService) {}

  private getConnection(): signalR.HubConnection | null {
    const connection = this.registry.getConnection('otoChat');
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
      return connection;
    }
    return null;
  }

  async sendMessage(recipient: string, content: string) {
    try {
      const connection = this.getConnection() || await this.registry.waitForConnection('otoChat', 20, 150);
      await connection.invoke('SendMessageAsync', recipient, content);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async editMessage(messageId: string, content: string) {
    try {
      const connection = this.getConnection() || await this.registry.waitForConnection('otoChat', 20, 150);
      await connection.invoke('EditMessageAsync', messageId, content);
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }

  async deleteMessage(messageId: string, deleteType: 'soft' | 'hard') {
    try {
      const connection = this.getConnection() || await this.registry.waitForConnection('otoChat', 20, 150);
      await connection.invoke('DeleteMessageAsync', messageId, deleteType);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  async replyToMessage(messageId: string, content: string, recipient: string) {
    try {
      const connection = this.getConnection() || await this.registry.waitForConnection('otoChat', 20, 150);
      await connection.invoke('ReplyToMessageAsync', recipient, content, messageId);
    } catch (error) {
      console.error('Error replying to message:', error);
      throw error;
    }
  }
}