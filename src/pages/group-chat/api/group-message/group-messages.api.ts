import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { SignalRConnectionRegistryService } from '../../../../shared/realtime';
import { BehaviorSubject, firstValueFrom, from, Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { GroupMessage } from '../../../../entities/group-message';
import { E2eeService } from '../../../../features/keys-generator';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../entities/session';

@Injectable({ providedIn: 'root' })
export class GroupMessagesApiService {
  public messages$ = new BehaviorSubject<GroupMessage[]>([]);
  
  private userInfoChangedSubject = new Subject<{
    userName: string;
    image?: string;
    updatedAt: string;
    oldNickName: string;
  }>();
  
  public userInfoChanged$ = this.userInfoChangedSubject.asObservable();
  
  private currentGroupId: string | null = null;
  private listenersSetup = false;
  private currentUserId: string | null = null;
  private readonly API_URL = 'http://localhost:3000/api';

  private groupRatchetCache = new Map<string, boolean>();

  constructor(private registry: SignalRConnectionRegistryService, 
              private e2eeService: E2eeService,
              private http: HttpClient,
              private auth: AuthService) {}

              private setupMessageListener() {
                this.currentUserId = this.auth.getNickName();
                const connection = this.getConnection();
                if (!connection || this.listenersSetup) return;
                    
                try {
                  connection.off('ReceiveMessage');
                  connection.off('MessageEdited');
                  connection.off('MessageDeleted');
                  connection.off('MessageSoftDeleted');
                  connection.off('UserInfoChanged');
                  connection.off('UserInfoDeleted');
                } catch (error) {}
                    
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
                      this.messages$.next([...currentMessages, newMessage]);
                    } else {
                    }
                  }
                });
                    
                connection.on('MessageEdited', (editInfo: any) => {
                  if (editInfo.messageId) {
                    const currentMessages = this.messages$.value;
                    const existingMsg = currentMessages.find(m => m.id === editInfo.messageId);
                    if (existingMsg && existingMsg.content === editInfo.newContent) {
                      return;
                    }
                    
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
                    const updatedMessages = this.messages$.value.map(m => {
                      if (m.id === deleteInfo.messageId) {
                        return { ...m, isDeleted: true };
                      }
                      return m;
                    });
                    this.messages$.next(updatedMessages);
                  }
                });
                    
                connection.on('MessageDeleted', (deleteInfo: any) => {
                  const messageId = deleteInfo.messageId || deleteInfo;
                  const updatedMessages = this.messages$.value.filter(m => m.id !== messageId);
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
                      this.messages$.next([...currentMessages, newMessage]);
                    }
                  }
                });
              
                connection.on('UserInfoChanged', (userInfo: any) => {
                  const normalizedUserInfo = {
                    NewUserName: userInfo.NewUserName || userInfo.newUserName,
                    Image: (userInfo.Image || userInfo.image)?.trim(),
                    UpdatedAt: userInfo.UpdatedAt || userInfo.updatedAt,
                    OldNickName: userInfo.OldNickName || userInfo.oldNickName
                  };
                  this.handleUserInfoChanged(normalizedUserInfo);
                });
              
                connection.on('UserInfoDeleted', (userInfo: any) => {
                  const userName = userInfo.UserName || userInfo.userName || userInfo.userInfo?.userName;
                  this.handleUserInfoDeleted(userName);
                });  
                    
                this.listenersSetup = true;
              }

  async decryptMessageContent(
    groupId: string,
    senderId: string,
    encryptedContent: string,
    messageId?: string
  ): Promise<string> {
    try {
      const parsed = JSON.parse(encryptedContent);
      
      if (!parsed.ciphertext) {
        return encryptedContent;
      }
      
      if (!messageId) {
        throw new Error('messageId is required for decryption');
      }

      if (!this.currentUserId) {
        throw new Error('Current user ID not set');
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      const messageKeyResponse = await firstValueFrom(
        this.http.get<{
          encryptedKey: string;
          ephemeralPublicKey: string;
          chainKeySnapshot: string;
          keyIndex: number;
        }>(`${this.API_URL}/messages/${messageId}/key?userId=${this.currentUserId}`)
      );

      if (!messageKeyResponse) {
        throw new Error('MessageKey not found for current user');
      }

      if (!messageKeyResponse.encryptedKey || 
          !messageKeyResponse.ephemeralPublicKey || 
          !messageKeyResponse.chainKeySnapshot) {
        throw new Error('Invalid MessageKey data');
      }

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
      if (error instanceof Error) {
        if (error.message.includes('MessageKey not found')) {
          return '[⚠️ Message key not available]';
        }
        return `[⚠️ Decryption error: ${error.message}]`;
      }
      return '[⚠️ Decryption failed]';
    }
  }

  private async loadSenderKeyFromMessage(
    messageId: string,
    groupId: string,
    senderId: string
  ): Promise<void> {
    try {  
      if (!this.currentUserId) {
        throw new Error('Current user ID not set');
      }
  
      const messageKeyResponse = await firstValueFrom(
        this.http.get<{
          encryptedKey: string;
          ephemeralPublicKey: string;
          chainKeySnapshot: string;
          keyIndex: number;
        }>(`${this.API_URL}/messages/${messageId}/key?userId=${this.currentUserId}`)
      );
  
      if (!messageKeyResponse) {
        throw new Error('MessageKey not found for current user');
      }
  
      if (!messageKeyResponse.encryptedKey) {
        throw new Error('MessageKey.encryptedKey is missing');
      }
  
      if (!messageKeyResponse.ephemeralPublicKey) {
        throw new Error('MessageKey.ephemeralPublicKey is missing');
      }
  
      if (!messageKeyResponse.chainKeySnapshot) {
        throw new Error('MessageKey.chainKeySnapshot is missing');
      }
  
      const myKeys = this.e2eeService.getKeys();
      if (!myKeys) throw new Error('User keys not available');
  
      await this.e2eeService.decryptSenderKeyFromMember(
        messageKeyResponse.ephemeralPublicKey,
        messageKeyResponse.encryptedKey,
        messageKeyResponse.chainKeySnapshot,
        groupId,
        senderId
      );
  
      const exportedKey = this.e2eeService.exportSenderKey(groupId);
      if (!exportedKey) {
        throw new Error('Sender Key was not loaded into memory after decryption');
      }

      sessionStorage.setItem(`sender_key_${groupId}`, exportedKey);
    } catch (error) {
      throw error;
    }
  }

  private async loadSenderKeyFromHistory(groupId: string): Promise<void> {
    try {
      const savedKey = sessionStorage.getItem(`sender_key_${groupId}`);
      if (savedKey) {
        this.e2eeService.importSenderKey(groupId, savedKey);
        return;
      }
  
      const connection = await this.ensureConnection();
      
      const messages = await connection.invoke<GroupMessage[]>(
        'LoadChatHistoryAsync', 
        groupId, 
        0, 
        200
      );
    
      const keyDistMessage = messages.find(msg => {
        try {
          const parsed = JSON.parse(msg.content);
          const isKeyDist = parsed.type === 'sender_key_distribution' && parsed.groupId === groupId;
          return isKeyDist;
        } catch {
          return false;
        }
      });
  
      if (!keyDistMessage) {
        throw new Error('Sender Key Distribution message not found');
      }
        
      await this.loadSenderKeyFromMessage(
        keyDistMessage.id!, 
        groupId, 
        keyDistMessage.sender
      );
      
      const keyLoaded = this.e2eeService.exportSenderKey(groupId);
      if (!keyLoaded) {
        throw new Error('Sender Key was not loaded into memory');
      }
  
    } catch (error) {
      throw error;
    }
  }

  async initializeGroupE2EE(groupId: string, memberIds: string[]): Promise<void> {
    try {
      const hasStateInMemory = this.e2eeService.exportRatchetState(groupId) !== null;
      if (hasStateInMemory) {
        this.groupRatchetCache.set(groupId, true);
        return;
      }

      if (this.e2eeService.loadRatchetStateFromSession(groupId)) {
        this.groupRatchetCache.set(groupId, true);
        return;
      }
      
      const memberKeys = await Promise.all(
        memberIds.map(memberId => 
          firstValueFrom(
            this.http.get<{ key: string }>(`${this.API_URL}/users/nickName/${memberId}`)
          )
        )
      );

      const myKeys = this.e2eeService.getKeys();
      if (!myKeys) {
        throw new Error('User keys not available');
      }

      const firstMemberPublicKey = this.e2eeService.fromBase64(memberKeys[0].key);
      
      await this.e2eeService.initRatchetAsSender(
        groupId,
        myKeys.xPrivateKey,
        firstMemberPublicKey,
        firstMemberPublicKey
      );

      this.groupRatchetCache.set(groupId, true);

    } catch (error) {
      throw error;
    }
  }

  async receiveSenderKey(
    groupId: string,
    senderId: string,
    encryptedData: {
      ephemeralKey: string;
      encryptedData: string;
      nonce: string;
    }
  ): Promise<void> {
    try {
      await this.e2eeService.decryptSenderKeyFromMember(
        encryptedData.ephemeralKey,
        encryptedData.encryptedData,
        encryptedData.nonce,
        groupId,
        senderId
      );

      const keyJson = this.e2eeService.exportSenderKey(groupId);
      if (keyJson) {
        sessionStorage.setItem(`sender_key_${groupId}`, keyJson);
      }

    } catch (error) {
      throw error;
    }
  }

  async ensureSenderKeyLoaded(groupId: string): Promise<boolean> {
    try {
      let senderKey = this.e2eeService.exportSenderKey(groupId);
      
      if (senderKey) {
        return true;
      }
  
      const savedKey = sessionStorage.getItem(`sender_key_${groupId}`);
      if (savedKey) {
        this.e2eeService.importSenderKey(groupId, savedKey);
        return true;
      }

      await this.loadSenderKeyFromHistory(groupId);
      
      senderKey = this.e2eeService.exportSenderKey(groupId);
      return !!senderKey;
      
    } catch (error) {
      return false;
    }
  }

  hasGroupE2EESession(groupId: string): boolean {
    if (this.groupRatchetCache.has(groupId)) {
      return true;
    }
    
    const state = this.e2eeService.exportRatchetState(groupId);
    const hasState = state !== null;
    
    if (hasState) {
      this.groupRatchetCache.set(groupId, true);
    }
    
    return hasState;
  }

  private handleUserInfoDeleted(userName: string): void {
    if (!userName) {
      return;
    }

    const currentMessages = this.messages$.value;
    const filteredMessages = currentMessages.filter(message => message.sender !== userName);
    
    if (filteredMessages.length !== currentMessages.length) {
      this.messages$.next(filteredMessages);
    }
  }

  private handleUserInfoChanged(userInfo: {
    NewUserName: string;
    Image?: string;
    UpdatedAt: string;
    OldNickName: string;
  }): void {
    const currentMessages = this.messages$.value;
    let hasChanges = false;

    const updatedMessages = currentMessages.map(message => {
      if (message.sender === userInfo.OldNickName || message.sender === userInfo.NewUserName) {
        hasChanges = true;
        return {
          ...message,
          sender: userInfo.NewUserName,
          oldSender: userInfo.OldNickName,
          ...(userInfo.Image && { senderImage: userInfo.Image })
        };
      }
      return message;
    });

    if (hasChanges) {
      this.messages$.next(updatedMessages);
    }

    const mappedUserInfo = {
      userName: userInfo.NewUserName,
      image: userInfo.Image,
      updatedAt: userInfo.UpdatedAt,
      oldNickName: userInfo.OldNickName
    };

    this.userInfoChangedSubject.next(mappedUserInfo);
  }

  private getConnection(): signalR.HubConnection | null {
    const connection = this.registry.getConnection('groupChat');
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
      return connection;
    }
    return null;
  }

  private async ensureConnection(): Promise<signalR.HubConnection> {
    let connection = this.getConnection();
    if (connection) return connection;

    connection = await this.registry.waitForConnection('groupChat', 20, 150);
    return connection;
  }

  loadChatHistory(groupId: string, take = 20, skip = 0): Observable<GroupMessage[]> {
    if (this.currentGroupId !== groupId) {
      this.listenersSetup = false;
      this.groupRatchetCache.delete(this.currentGroupId!);
    }
    
    this.currentGroupId = groupId;

    return from(this.ensureConnection().then(async (connection) => {
      try {
        if (!this.listenersSetup) this.setupMessageListener();
        if (skip === 0) await connection.invoke('JoinGroupAsync', groupId);

        const messages = await connection.invoke<GroupMessage[]>('LoadChatHistoryAsync', groupId, skip, take);
        return messages || [];
      } catch (error) {
        throw error;
      }
    })).pipe(tap(messages => {
      if (skip === 0) {
        this.messages$.next(messages);
      } else {
        const existingIds = new Set(this.messages$.value.map(m => m.id));
        const uniqueNewMessages = messages.filter(m => !existingIds.has(m.id));
        if (uniqueNewMessages.length > 0) {
          this.messages$.next([...uniqueNewMessages, ...this.messages$.value]);
        }
      }
    }));
  }

  private async leaveCurrentGroup() {
    if (this.currentGroupId) {
      try {
        const connection = this.getConnection();
        if (connection) await connection.invoke('LeaveGroupAsync', this.currentGroupId);
      } catch (error) {
      }
    }
  }

  cleanup() {
    this.leaveCurrentGroup();
    this.currentGroupId = null;
    this.messages$.next([]);
    this.listenersSetup = false;
    this.groupRatchetCache.clear();
  }

  async sendMessage(groupId: string, content: string, memberIds: string[]) {
    try {
      if (!this.currentUserId) {
        throw new Error('Current user ID not set');
      }

      if (!this.hasGroupE2EESession(groupId)) {
        await this.initializeGroupE2EE(groupId, memberIds);
      }

      const connection = await this.ensureConnection();
      
      const encrypted = await this.e2eeService.encryptMessageWithHistory(
        groupId,
        content
      );

      const allMemberIds = [...new Set([...memberIds, this.currentUserId])];
      const allMemberKeys = await Promise.all(
        allMemberIds.map(memberId => 
          firstValueFrom(
            this.http.get<{ key: string }>(`${this.API_URL}/users/nickName/${memberId}`)
          )
        )
      );

      const memberMessageKeys = allMemberIds.map((memberId, index) => {
        const memberPublicKey = this.e2eeService.fromBase64(allMemberKeys[index].key);
        
        const messageKey = this.e2eeService.exportMessageKeyForUser(
          groupId, 
          memberPublicKey
        );

        if (!messageKey) {
          throw new Error(`Failed to export message key for member ${memberId}`);
        }

        return {
          userId: memberId,
          encryptedKey: messageKey.encryptedKey,
          ephemeralPublicKey: messageKey.ephemeralPublicKey,
          chainKeySnapshot: messageKey.chainKeySnapshot,
          keyIndex: messageKey.messageNumber
        };
      });

      const encryptedMessageData = {
        ciphertext: encrypted.ciphertext,
        ephemeralKey: encrypted.ephemeralKey,
        nonce: encrypted.nonce,
        messageNumber: encrypted.messageNumber,
        previousChainN: encrypted.previousChainN,
        ratchetId: encrypted.ratchetId
      };

      const encryptedPayload = JSON.stringify(encryptedMessageData);

      const signalRResponse = await connection.invoke(
        'SendMessageAsync', 
        encryptedPayload, 
        groupId
      );

      let messageId: string;
      
      if (typeof signalRResponse === 'string') {
        messageId = signalRResponse;
      } else if (signalRResponse && typeof signalRResponse === 'object') {
        messageId = (signalRResponse as any).messageId || 
                    (signalRResponse as any).id ||
                    JSON.stringify(signalRResponse);
      } else {
        throw new Error(`Invalid messageId from SignalR: ${typeof signalRResponse}`);
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      await this.saveGroupMessageToHistory(
        messageId,
        groupId,
        this.currentUserId,
        memberIds[0], 
        encryptedMessageData,
        memberMessageKeys
      );

      return { messageId, content: encryptedPayload };

    } catch (error) {
      throw error;
    }
  }
  
  private async saveGroupMessageToHistory(
    messageId: string,
    groupId: string,
    senderId: string,
    recipientId: string,
    encrypted: any,
    memberMessageKeys: any[]
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
      senderId: senderId,
      recipientId: recipientId,
      encryptedContent: encryptedContent,
      ephemeralKey: encrypted.ephemeralKey,
      nonce: encrypted.nonce,
      messageNumber: encrypted.messageNumber,
      previousChainN: encrypted.previousChainN,
      ratchetId: encrypted.ratchetId,
      messageKeys: memberMessageKeys
    };

    const savedMessage = await firstValueFrom(
      this.http.post<any>(`${this.API_URL}/messages`, payload)
    );
    
    return savedMessage;
  }

  async editMessage(messageId: string, newContent: string, groupId: string, memberIds: string[]) {
    try {
      const connection = await this.ensureConnection();
      
      const encrypted = await this.e2eeService.encryptMessageWithHistory(
        groupId,
        newContent
      );

      const allMemberIds = [...new Set([...memberIds, this.currentUserId!])];
      const allMemberKeys = await Promise.all(
        allMemberIds.map(memberId => 
          firstValueFrom(
            this.http.get<{ key: string }>(`${this.API_URL}/users/nickName/${memberId}`)
          )
        )
      );

      const memberMessageKeys = allMemberIds.map((memberId, index) => {
        const memberPublicKey = this.e2eeService.fromBase64(allMemberKeys[index].key);
        const messageKey = this.e2eeService.exportMessageKeyForUser(
          groupId,
          memberPublicKey
        );

        if (!messageKey) {
          throw new Error(`Failed to export message key for member ${memberId}`);
        }

        return {
          userId: memberId,
          encryptedKey: messageKey.encryptedKey,
          ephemeralPublicKey: messageKey.ephemeralPublicKey,
          chainKeySnapshot: messageKey.chainKeySnapshot,
          keyIndex: messageKey.messageNumber
        };
      });

      const encryptedContent = JSON.stringify({
        ciphertext: encrypted.ciphertext,
        ephemeralKey: encrypted.ephemeralKey,
        nonce: encrypted.nonce,
        messageNumber: encrypted.messageNumber,
        previousChainN: encrypted.previousChainN,
        ratchetId: encrypted.ratchetId
      });

      await connection.invoke('EditMessageAsync', messageId, encryptedContent, groupId);
      await new Promise(resolve => setTimeout(resolve, 100));

      await firstValueFrom(
        this.http.put(`${this.API_URL}/messages/${messageId}`, {
          encryptedContent: encryptedContent,
          ephemeralKey: encrypted.ephemeralKey,
          nonce: encrypted.nonce,
          messageNumber: encrypted.messageNumber,
          previousChainN: encrypted.previousChainN,
          ratchetId: encrypted.ratchetId,
          messageKeys: memberMessageKeys
        })
      );

    } catch (error) {
      throw error;
    }
  }

  async deleteMessage(messageId: string, groupId: string) {
    try {
      const connection = await this.ensureConnection();
      
      await firstValueFrom(
        this.http.delete(`${this.API_URL}/messages/${messageId}`, {
          body: { deleteType: 'hard' }
        })
      );

      await connection.invoke('DeleteMessageAsync', messageId, groupId);
    } catch (error) {
      throw error;
    }
  }

  async softDeleteMessage(messageId: string, groupId: string) {
    try {
      const connection = await this.ensureConnection();
      
      await firstValueFrom(
        this.http.delete(`${this.API_URL}/messages/${messageId}`, {
          body: { deleteType: 'soft' }
        })
      );

      await connection.invoke('SoftDeleteMessageAsync', messageId, groupId);
    } catch (error) {
      throw error;
    }
  }

  async replyToMessage(messageId: string, content: string, groupId: string, memberIds: string[]) {
    try {
      if (!this.currentUserId) {
        throw new Error('Current user ID not set');
      }
  
      if (!this.hasGroupE2EESession(groupId)) {
        await this.initializeGroupE2EE(groupId, memberIds);
      }
  
      const connection = await this.ensureConnection();
      
      const encrypted = await this.e2eeService.encryptMessageWithHistory(
        groupId,
        content
      );
  
      const allMemberIds = [...new Set([...memberIds, this.currentUserId])];
      const allMemberKeys = await Promise.all(
        allMemberIds.map(memberId => 
          firstValueFrom(
            this.http.get<{ key: string }>(`${this.API_URL}/users/nickName/${memberId}`)
          )
        )
      );
  
      const memberMessageKeys = allMemberIds.map((memberId, index) => {
        const memberPublicKey = this.e2eeService.fromBase64(allMemberKeys[index].key);
        
        const messageKey = this.e2eeService.exportMessageKeyForUser(
          groupId, 
          memberPublicKey
        );
  
        if (!messageKey) {
          throw new Error(`Failed to export message key for member ${memberId}`);
        }
  
        return {
          userId: memberId,
          encryptedKey: messageKey.encryptedKey,
          ephemeralPublicKey: messageKey.ephemeralPublicKey,
          chainKeySnapshot: messageKey.chainKeySnapshot,
          keyIndex: messageKey.messageNumber
        };
      });
  
      const encryptedMessageData = {
        ciphertext: encrypted.ciphertext,
        ephemeralKey: encrypted.ephemeralKey,
        nonce: encrypted.nonce,
        messageNumber: encrypted.messageNumber,
        previousChainN: encrypted.previousChainN,
        ratchetId: encrypted.ratchetId
      };
  
      const encryptedPayload = JSON.stringify(encryptedMessageData);

      const signalRResponse = await connection.invoke(
        'ReplyForMessageAsync',
        messageId,
        encryptedPayload,
        groupId
      );
  
      let newMessageId: string;
      
      if (typeof signalRResponse === 'string') {
        newMessageId = signalRResponse;
      } else if (signalRResponse && typeof signalRResponse === 'object') {
        newMessageId = (signalRResponse as any).messageId || 
                       (signalRResponse as any).id ||
                       JSON.stringify(signalRResponse);
      } else {
        throw new Error(`Invalid messageId from SignalR: ${typeof signalRResponse}`);
      }
  
      await new Promise(resolve => setTimeout(resolve, 100));
  
      await this.saveGroupMessageToHistory(
        newMessageId,
        groupId,
        this.currentUserId,
        memberIds[0],
        encryptedMessageData,
        memberMessageKeys
      );
  
      return { messageId: newMessageId, content: encryptedPayload };
  
    } catch (error) {
      throw error;
    }
  }
}