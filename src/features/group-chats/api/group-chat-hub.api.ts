import { Injectable } from '@angular/core';
import { environment } from '../../../shared/api-result';
import { GroupChat } from '../../../entities/group-chats';
import { BaseChatApiService } from '../../../shared/chats';
import { Observable } from 'rxjs';
import { GroupCreateRequest } from '../api/group-create';
import { AuthApiResult } from '../../../shared/api-result';
import { HttpClient } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { AuthService } from '../../../entities/user/api/auht.service';

@Injectable({ providedIn: 'root' })
export class GroupChatApiService extends BaseChatApiService<GroupChat> {
  private isConnected = false;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    super(environment.groupChatHubUrl, 'GetAllGroupForUserAsync', 'LoadChatHistoryAsync');
  }

  connected(): void {
    if (this.isConnected) {
      return;
    }
    this.isConnected = true;

    this.connection.onreconnected(() => {
    });

    this.connection.onclose(() => {
    });

    const originalOn = this.connection.on.bind(this.connection);
    this.connection.on = (methodName: string, newMethod: (...args: any[]) => any) => {
      return originalOn(methodName, (...args: any[]) => {
        return newMethod(...args);
      });
    };

    this.connection.on('DeleteGroupAsync', (groupId: string) => {
      const currentGroups = this.chatsSubject.value;
      const updatedGroups = currentGroups.filter(g => g.groupId !== groupId);
      this.chatsSubject.next(updatedGroups);
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
      const currentUser = this.getCurrentUser();
      
      if (currentUser) {
        const isUserAdmin = updatedGroup.admin === currentUser;
        const isUserInGroup = this.isUserInGroupMembers(updatedGroup, currentUser);
        
        if (isUserAdmin || isUserInGroup) {
          const currentGroups = this.chatsSubject.value;
          const groupExists = currentGroups.some(g => g.groupId === updatedGroup.groupId);

          if (!groupExists) {
            const updatedGroups = [...currentGroups, updatedGroup];
            this.chatsSubject.next(updatedGroups);
          } else {
            const updatedGroups = currentGroups.map(g =>
              g.groupId === updatedGroup.groupId ? updatedGroup : g
            );
            this.chatsSubject.next(updatedGroups);
          }
        } else {
          const currentGroups = this.chatsSubject.value;
          const updatedGroups = currentGroups.filter(g => g.groupId !== updatedGroup.groupId);
          this.chatsSubject.next(updatedGroups);
        }
      }
    });
    
    this.connection.on('GroupMembersRemoved', (updatedGroup: GroupChat) => {
      const currentUser = this.getCurrentUser();
      
      if (currentUser) {
        const isUserAdmin = updatedGroup.admin === currentUser;
        const isUserStillInGroup = this.isUserInGroupMembers(updatedGroup, currentUser);
        
        if (isUserAdmin || isUserStillInGroup) {
          const currentGroups = this.chatsSubject.value;
          const updatedGroups = currentGroups.map(g =>
            g.groupId === updatedGroup.groupId ? updatedGroup : g
          );
          this.chatsSubject.next(updatedGroups);
        } else {
          const currentGroups = this.chatsSubject.value;
          const updatedGroups = currentGroups.filter(g => g.groupId !== updatedGroup.groupId);
          this.chatsSubject.next(updatedGroups);
        }
      }
    });

    this.connection.on('UserRemovedFromGroup', (data: any) => {  
      const currentUser = this.getCurrentUser();
      
      if (data.groupId) {
        const currentGroups = this.chatsSubject.value;
        const updatedGroups = currentGroups.filter(g => g.groupId !== data.groupId);
        
        this.chatsSubject.next(updatedGroups);
      }
    });
  }

  protected override handleUserInfoChanged(userInfo: { NewUserName: string, Image?: string, UpdatedAt: string, OldNickName: string }): void {
    super.handleUserInfoChanged(userInfo);
    this.updateGroupsUserInfo(userInfo);
  }

private updateGroupsUserInfo(userInfo: { NewUserName: string, Image?: string, UpdatedAt: string, OldNickName: string }): void {  
  const currentGroups = this.chatsSubject.value;
  
  let hasChanges = false;
  
  const updatedGroups = currentGroups.map(group => {
    let updatedGroup = { ...group };
    let groupChanged = false;
    
    if (group.admin === userInfo.OldNickName) {
      updatedGroup.admin = userInfo.NewUserName;
      groupChanged = true;
      hasChanges = true;
    }
    
    if (group.users && Array.isArray(group.users)) {
      const updatedUsers = group.users.map(user => 
        user === userInfo.OldNickName ? userInfo.NewUserName : user
      );
      
      if (updatedUsers.some((user, index) => user !== group.users![index])) {
        updatedGroup.users = updatedUsers;
        groupChanged = true;
        hasChanges = true;
      }
    }
    
    if (group.members && Array.isArray(group.members)) {
      const updatedMembers = group.members.map(member => {
        if (member.nickName === userInfo.OldNickName) {
          return {
            ...member,
            nickName: userInfo.NewUserName,
            ...(userInfo.Image && { 
              image: userInfo.Image, 
              userImage: userInfo.Image, 
              avatar: userInfo.Image 
            })
          };
        }
        return member;
      });
      
      const membersChanged = updatedMembers.some((member, index) => {
        const original = group.members![index];
        return member.nickName !== original.nickName || 
               member.image !== original.image;
      });
      
      if (membersChanged) {
        updatedGroup.members = updatedMembers;
        groupChanged = true;
        hasChanges = true;
      }
    }  
    return updatedGroup;
  });
  
  if (hasChanges) {
    this.chatsSubject.next(updatedGroups);
  }
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
    
    return this.connection.invoke('JoinGroupAsync', groupId)
      .then(() => {
      })
      .catch(error => {
        console.error('Error joining group:', error);
        throw error;
      });
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
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      return;
    }
  
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
        console.error('[GroupChatApiService] Failed to refresh group list:', err);
      });
  }
    
  addGroupMembers(groupId: string, members: { users: string[] }): Promise<GroupChat> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      return Promise.reject('SignalR connection is not established');
    }
    
    return this.connection.invoke('AddMembersToGroupAsync', groupId, members)
      .then(result => {
        return result;
      })
      .catch(error => {
        console.error('Error adding members to group:', error);
        throw error;
      });
  }
  
  removeGroupMembers(groupId: string, members: { users: string[] }): Promise<GroupChat> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      return Promise.reject('SignalR connection is not established');
    }
    
    return this.connection.invoke('RemoveMembersFromGroupAsync', groupId, members)
      .then(result => {
        return result;
      })
      .catch(error => {
        console.error('Error removing members from group:', error);
        throw error;
      });
  }  

  private isUserInGroupMembers(group: GroupChat, userName: string): boolean {
    if (group.users && Array.isArray(group.users)) {
      const foundInUsers = group.users.some(user => user === userName);
      if (foundInUsers) {
        return true;
      }
    }
    
    if (group.members && Array.isArray(group.members)) {
      const foundInMembers = group.members.some(member => member.nickName === userName);
      if (foundInMembers) {
        return true;
      }
    }
    return false;
  }

  protected override getCurrentUser(): string | null {
    const nickName = this.authService.getNickName();
    return nickName;
  }

  override disconnect(): void {
    if (this.isConnected) {
      super.disconnect();
      this.isConnected = false;
    }
  }
}