import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GroupUserStateService } from './group-user-state.service';
import { GroupChat } from '../model/group.chat';
import { GroupMessageStateService } from './group-message-state.service';
import { GroupMessagesApiService } from '../api/group-message/group-messages.api';

export interface GroupNavigationState {
  isNavigating: boolean;
}

@Injectable({ providedIn: 'root' })
export class GroupNavigationService {
  private stateSubject = new BehaviorSubject<GroupNavigationState>({ isNavigating: false });
  public state$ = this.stateSubject.asObservable();

  constructor(
    private userState: GroupUserStateService,
    private messageState: GroupMessageStateService,
    private messagesApi: GroupMessagesApiService
  ) {}

  private update(updates: Partial<GroupNavigationState>): void {
    const curr = this.stateSubject.value;
    this.stateSubject.next({ ...curr, ...updates });
  }

  selectGroup(chat: GroupChat): void {
    this.update({ isNavigating: true });

    this.userState.setSelectedGroup(chat.groupId, chat.groupName, chat.image);
    this.messageState.resetAll();
    this.messageState.forceMessageComponentReload();
    if (chat.groupId) {
      this.messagesApi.loadChatHistory(chat.groupId, 20, 0).subscribe();
    }

    this.update({ isNavigating: false });
  }

  selectGroupByIds(groupId: string, groupName: string, image: string): void {
    this.update({ isNavigating: true });

    this.userState.setSelectedGroup(groupId, groupName, image);
    this.messageState.resetAll();
    this.messageState.forceMessageComponentReload();
    this.messagesApi.loadChatHistory(groupId, 20, 0).subscribe();

    this.update({ isNavigating: false });
  }

  resetSelectedGroup(): void {
    this.userState.clearSelection();
    this.messageState.resetAll();
  }
}


