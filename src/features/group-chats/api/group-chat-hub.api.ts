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
  constructor(private http: HttpClient) {
    super(environment.groupChatHubUrl, 'GetAllGroupForUserAsync', 'LoadChatHistoryAsync');
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
}