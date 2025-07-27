import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, from } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../shared/api-result/urls/api.urls';
import { GroupMessage } from '../model/group-message.model';

@Injectable({ providedIn: 'root' })
export class GroupMessagesApiService {
  private connection: signalR.HubConnection | null = null;
  public messages$ = new BehaviorSubject<GroupMessage[]>([]);
  private currentGroupId: string | null = null;
  private connectionStarted: Promise<void> | null = null;

  constructor() {
  }

  private ensureConnection(): Promise<void> {
    if (!this.connection) {
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(environment.groupChatHubUrl, { withCredentials: true })
        .withAutomaticReconnect()
        .build();
      
      this.connection.on('ReceiveMessage', (msg: GroupMessage) => {
        if (msg.groupId === this.currentGroupId) {
          this.messages$.next([...this.messages$.value, msg]);
        }
      });

      this.connectionStarted = this.connection.start();
    }
    return this.connectionStarted!;
  }

  loadChatHistory(groupId: string, skip = 0, take = 20) {
    if (this.currentGroupId && this.currentGroupId !== groupId && this.connection) {
      this.connection.invoke('LeaveGroupAsync', this.currentGroupId).catch(err => 
        console.log('Error leaving group:', err)
      );
    }
    
    this.currentGroupId = groupId;
    return from(
      this.ensureConnection().then(async () => {
        await this.connection!.invoke('JoinGroupAsync', groupId);
        return this.connection!.invoke<GroupMessage[]>('LoadChatHistoryAsync', groupId, skip, take);
      })
    ).pipe(
      tap(messages => {
        if (skip === 0) {
          this.messages$.next(messages ?? []);
        }
      })
    );
  }

  cleanup() {
    if (this.currentGroupId && this.connection) {
      this.connection.invoke('LeaveGroupAsync', this.currentGroupId).catch(err => 
        console.log('Error leaving group on cleanup:', err)
      );
      this.currentGroupId = null;
    }
    this.messages$.next([]);
  }
}
