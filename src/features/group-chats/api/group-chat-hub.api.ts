import { Injectable } from '@angular/core';
import { environment } from '../../../shared/api-result';
import { GroupChat } from '../../../entities/group-chats';
import { BaseChatApiService } from '../../../shared/chats';
import { Observable } from 'rxjs';
import { GroupCreateRequest } from '../api/group-create';
import { AuthApiResult } from '../../../shared/api-result';
import { HttpClient } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';


@Injectable({ providedIn: 'root' })
export class GroupChatApiService extends BaseChatApiService<GroupChat> {
  private isConnected = false;

  constructor(private http: HttpClient) {
    super(environment.groupChatHubUrl, 'GetAllGroupForUserAsync', 'LoadChatHistoryAsync');
  }

  connected(): void {
    if (this.isConnected) return;
    super.connect();
    this.isConnected = true;

    this.connection.on('DeleteGroupAsync', (groupId: string) => {
      this.chatsSubject.next(
        this.chatsSubject.value.filter(g => g.groupId !== groupId)
      );
    });    

    this.connection.on('CreateGroupAsync', (group: GroupChat) => {
      const currentGroups = this.chatsSubject.value;
      const updatedGroups = [...currentGroups, group];
      this.chatsSubject.next(updatedGroups);
    });

    this.connection.on('EditGroupAsync', (group: GroupChat) => {
      const currentGroups = this.chatsSubject.value;
      const updatedGroups = currentGroups.map(g => {
        return g.groupId === group.groupId ? group : g;
      });
      this.chatsSubject.next(updatedGroups);
    });
    
    this.connection.on('GroupMembersAdded', (updatedGroup: GroupChat) => {
      this.updateGroupInList(updatedGroup);
    });  
    
    this.connection.on('GroupMembersRemoved', (updatedGroup: GroupChat) => {
      this.updateGroupInList(updatedGroup);
    });    
  }

  createGroup(data: GroupCreateRequest): Observable<AuthApiResult> {
    const formData = new FormData();

    for (const user of data.Users) {
      if (user && user.trim()) {
        formData.append('Users', user.trim());
      }
    }
  
    const skipKeys = ['Users'];
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && !skipKeys.includes(key)) {
        if (key === 'Admin' && (!value || value === '')) {
          return;
        }
        formData.append(key, value as any);
      }
    });

    return this.http.post<AuthApiResult>(
      `${environment.groupApiUrl}create-group`,
      formData,
      { withCredentials: true }
    );
  }

  joinGroup(groupId: string): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      return Promise.reject('Connection is not established');
    }
    return this.connection.invoke('JoinGroupAsync', groupId);
  }

  leaveGroup(groupId: string): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      return Promise.reject('Connection is not established');
    }
    return this.connection.invoke('LeaveGroupAsync', groupId);
  }

  async deleteGroup(groupId: string): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      return Promise.reject('SignalR connection is not established');
    }
    await this.connection.invoke('DeleteGroupAsync', groupId);
    this.refreshGroups();
  }  

  refreshGroups(): void {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) return;
  
    this.connection.invoke<GroupChat[]>('GetAllGroupForUserAsync')
      .then(groups => {
        const currentGroups = this.chatsSubject.value;
        const updatedGroups = currentGroups.map(existing => {
          const updated = groups?.find(g => g.groupId === existing.groupId);
          return updated ?? existing;
        });
        this.chatsSubject.next(updatedGroups);
      })
      .catch(err => {
        console.error('Failed to refresh group list:', err);
      });
  }
    
  addGroupMembers(groupId: string, members: { users: string[] }): Promise<GroupChat> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      return Promise.reject('SignalR connection is not established');
    }
    return this.connection.invoke('AddMembersToGroupAsync', groupId, members);
  }
  
  removeGroupMembers(groupId: string, members: { users: string[] }): Promise<GroupChat> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      return Promise.reject('SignalR connection is not established');
    }
    return this.connection.invoke('RemoveMembersFromGroupAsync', groupId, members);
  }  

  private updateGroupInList(updatedGroup: GroupChat): void {
    const currentGroups = this.chatsSubject.value;
    const newGroups = currentGroups.map(g =>
      g.groupId === updatedGroup.groupId ? updatedGroup : g
    );
    this.chatsSubject.next(newGroups);
  }  
}