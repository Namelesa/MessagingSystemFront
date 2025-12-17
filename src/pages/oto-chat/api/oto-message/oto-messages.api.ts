import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { SignalRConnectionRegistryService } from '../../../../shared/realtime';
import { E2eeService } from '../../../../features/keys-generator';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OtoMessagesService {
  private currentUserId: string | null = null;

  constructor(
    private registry: SignalRConnectionRegistryService, 
    private e2eeService: E2eeService,
    private http: HttpClient
  ) {}

  setCurrentUserId(userId: string) {
    this.currentUserId = userId;
  }

  private getConnection(): signalR.HubConnection | null {
    const connection = this.registry.getConnection('otoChat');
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
      return connection;
    }
    return null;
  }

  async initializeE2EESession(contactNickName: string): Promise<void> {
    try {
      const hasStateInMemory = this.e2eeService.exportRatchetState(contactNickName) !== null;
      
      if (hasStateInMemory) {
        return;
      }
  
      if (this.e2eeService.loadRatchetStateFromSession(contactNickName)) {
        return;
      }
  
      const response = await firstValueFrom(
        this.http.get<{ key: string }>(`http://localhost:3000/api/users/nickName/${contactNickName}`)
      );
  
      const myKeys = this.e2eeService.getKeys();
      if (!myKeys) {
        throw new Error('User keys not available');
      }
  
      const theirXPublic = this.e2eeService.fromBase64(response.key);
  
      await this.e2eeService.initRatchetAsSender(
        contactNickName,
        myKeys.xPrivateKey,
        theirXPublic,
        theirXPublic
      );
  
    } catch (error) {
      throw error;
    }
  }

  async decryptMessageContent(sender: string, content: string, messageId?: string): Promise<string> {
    try {      
      const parsed = JSON.parse(content);
      
      if (!parsed.ciphertext) {
        return content;
      }
      
      if (!messageId) {
        throw new Error('messageId is required');
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));

      const messageKeyResponse = await firstValueFrom(
        this.http.get<{
          encryptedKey: string;
          ephemeralPublicKey: string;
          chainKeySnapshot: string;
          keyIndex: number;
        }>(`http://localhost:3000/api/messages/${messageId}/key?userId=${this.currentUserId}`)
      );
            
      const myKeys = this.e2eeService.getKeys();
      if (!myKeys) throw new Error('User keys not available');
      
      const messageKey = await this.e2eeService.importMessageKeyForUser(
        messageKeyResponse.encryptedKey,
        messageKeyResponse.ephemeralPublicKey,
        myKeys.xPrivateKey
      );
            
      const cipher = this.e2eeService.fromBase64(parsed.ciphertext);
      const nonce = this.e2eeService.fromBase64(parsed.nonce);
      
      const decrypted = await this.e2eeService.decryptWithKey(
        cipher,
        nonce,
        messageKey
      );
            
      return decrypted;
      
    } catch (error) {
      throw error;
    }
  }

  async sendMessage(recipient: string, content: string) {
    try {
      if (!this.currentUserId) {
        throw new Error('Current user ID not set');
      }
  
      const hasSession = this.hasE2EESession(recipient);
      if (!hasSession) {
        await this.initializeE2EESession(recipient);
      }
  
      const connection = this.getConnection() ||
        await this.registry.waitForConnection('otoChat', 20, 150);
  
      const encrypted = await this.e2eeService.encryptMessageWithHistory(
        recipient,
        content
      );
  
      const [recipientKeyResponse, senderKeyResponse] = await Promise.all([
        firstValueFrom(
          this.http.get<{ key: string }>(
            `http://localhost:3000/api/users/nickName/${recipient}`
          )
        ),
        firstValueFrom(
          this.http.get<{ key: string }>(
            `http://localhost:3000/api/users/nickName/${this.currentUserId}`
          )
        )
      ]);
  
      const recipientPublicKey = this.e2eeService.fromBase64(recipientKeyResponse.key);
      const senderPublicKey = this.e2eeService.fromBase64(senderKeyResponse.key);
      
      const recipientMessageKey = this.e2eeService.exportMessageKeyForUser(
        recipient,
        recipientPublicKey
      );
  
      if (!recipientMessageKey) {
        throw new Error('Failed to export message key for recipient');
      }
  
      const senderMessageKey = this.e2eeService.exportMessageKeyForUser(
        recipient,
        senderPublicKey
      );
  
      if (!senderMessageKey) {
        throw new Error('Failed to export message key for sender');
      }
  
      const encryptedMessageData = {
        ciphertext: encrypted.ciphertext,
        ephemeralKey: encrypted.ephemeralKey,
        nonce: encrypted.nonce,
        messageNumber: encrypted.messageNumber,
        previousChainN: encrypted.previousChainN,
        ratchetId: encrypted.ratchetId
      };
  
      const signalRResponse = await connection.invoke(
        'SendMessageAsync', 
        recipient, 
        JSON.stringify(encryptedMessageData)
      );
  
      let messageId: string;
      
      if (typeof signalRResponse === 'string') {
        messageId = signalRResponse;
      } else if (signalRResponse && typeof signalRResponse === 'object') {
        messageId = (signalRResponse as any).messageId || 
                    (signalRResponse as any).id ||
                    JSON.stringify(signalRResponse);
      } else {
        throw new Error(`Invalid messageId type from SignalR: ${typeof signalRResponse}`);
      }
  
      const savedMessage = await this.saveMessageToHistory(
        messageId,
        recipient,
        encrypted,
        recipientMessageKey,
        senderMessageKey
      );
  
      return savedMessage;
      
    } catch (error) {
      throw error;
    }
  }
  
  private async saveMessageToHistory(
    messageId: string,
    recipient: string,
    encrypted: any,
    recipientMessageKey: any,
    senderMessageKey: any
  ): Promise<any> {
        
    if (typeof messageId !== 'string') {
      throw new Error(`messageId must be a string, got ${typeof messageId}`);
    }
  
    const encryptedContent = JSON.stringify({
      ciphertext: encrypted.ciphertext,
      ephemeralKey: encrypted.ephemeralKey,
      nonce: encrypted.nonce,
      messageNumber: encrypted.messageNumber,
      previousChainN: encrypted.previousChainN,
      ratchetId: encrypted.ratchetId
    });
    
    const payload = {
      id: messageId,
      senderId: this.currentUserId,
      recipientId: recipient,
      encryptedContent: encryptedContent,
      ephemeralKey: encrypted.ephemeralKey,
      nonce: encrypted.nonce,
      messageNumber: encrypted.messageNumber,
      previousChainN: encrypted.previousChainN,
      ratchetId: encrypted.ratchetId,
      messageKeys: [
        {
          userId: recipient,
          encryptedKey: recipientMessageKey.encryptedKey,
          ephemeralPublicKey: recipientMessageKey.ephemeralPublicKey,
          chainKeySnapshot: recipientMessageKey.chainKeySnapshot,
          keyIndex: recipientMessageKey.messageNumber
        },
        {
          userId: this.currentUserId!,
          encryptedKey: senderMessageKey.encryptedKey,
          ephemeralPublicKey: senderMessageKey.ephemeralPublicKey,
          chainKeySnapshot: senderMessageKey.chainKeySnapshot,
          keyIndex: senderMessageKey.messageNumber
        }
      ]
    };
  
    const savedMessage = await firstValueFrom(
      this.http.post<any>('http://localhost:3000/api/messages', payload)
    );
    
    return savedMessage;
  }

  hasE2EESession(contactNickName: string): boolean {
    const state = this.e2eeService.exportRatchetState(contactNickName);
    return state !== null;
  }

  async editMessage(messageId: string, content: string) {
    try {
      const connection = this.getConnection() || await this.registry.waitForConnection('otoChat', 20, 150);
      await connection.invoke('EditMessageAsync', messageId, content);
    } catch (error) {
      throw error;
    }
  }

  async deleteMessage(messageId: string, deleteType: 'soft' | 'hard') {
    try {
      const connection = this.getConnection() || await this.registry.waitForConnection('otoChat', 20, 150);
      await connection.invoke('DeleteMessageAsync', messageId, deleteType);
    } catch (error) {
      throw error;
    }
  }

  async replyToMessage(messageId: string, content: string, recipient: string) {
    try {
      if (!this.hasE2EESession(recipient)) {
        await this.initializeE2EESession(recipient);
      }

      const connection = this.getConnection() || await this.registry.waitForConnection('otoChat', 20, 150);
      await connection.invoke('ReplyToMessageAsync', recipient, content, messageId);
    } catch (error) {
      throw error;
    }
  }
}