import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { SignalRConnectionRegistryService } from '../../../../shared/realtime';
import { BehaviorSubject, from, Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { GroupMessage } from '../../../../entities/group-message';

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

  constructor(private registry: SignalRConnectionRegistryService) {}

  private setupMessageListener() {
    const connection = this.getConnection();
    if (!connection || this.listenersSetup) {
      return;
    }

    try {
      connection.off('ReceiveMessage');
      connection.off('MessageEdited');
      connection.off('MessageDeleted');
      connection.off('MessageSoftDeleted');
      connection.off('UserInfoChanged');
      connection.off('UserInfoDeleted');
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
          this.messages$.next([...currentMessages, newMessage]);
        }
      }
    });

    connection.on('MessageEdited', (editInfo: any) => {
      if (editInfo.messageId) {
        const updatedMessages = this.messages$.value.map(m => {
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

  private handleUserInfoDeleted(userName: string): void {
    if (!userName) {
      console.error('No valid userName found for deletion');
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
    if (this.currentGroupId !== groupId) this.listenersSetup = false;
    this.currentGroupId = groupId;

    return from(this.ensureConnection().then(async (connection) => {
      try {
        if (!this.listenersSetup) this.setupMessageListener();
        if (skip === 0) await connection.invoke('JoinGroupAsync', groupId);

        const messages = await connection.invoke<GroupMessage[]>('LoadChatHistoryAsync', groupId, skip, take);
        return messages || [];
      } catch (error) {
        console.error('Error in loadChatHistory:', error);
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
    const connection = await this.ensureConnection();
    await connection.invoke('SendMessageAsync', content, groupId);
  }

  async editMessage(messageId: string, content: string, groupId: string) {
    const connection = await this.ensureConnection();
    await connection.invoke('EditMessageAsync', messageId, content, groupId);
  }

  async deleteMessage(messageId: string, groupId: string) {
    const connection = await this.ensureConnection();
    await connection.invoke('DeleteMessageAsync', messageId, groupId);
  }

  async softDeleteMessage(messageId: string, groupId: string) {
    const connection = await this.ensureConnection();
    await connection.invoke('SoftDeleteMessageAsync', messageId, groupId);
  }

  async replyToMessage(messageId: string, content: string, groupId: string) {
    const connection = await this.ensureConnection();
    await connection.invoke('ReplyForMessageAsync', messageId, content, groupId);
  }
}