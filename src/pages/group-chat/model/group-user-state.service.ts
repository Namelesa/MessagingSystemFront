import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { GroupMember } from './group-info.model';
import { GroupInfoApiService } from '../api/group-chat/group-info.api';
import { GroupChatApiService } from '../api/group-chat/group-chat-hub.api';
import { AuthService } from '../../../entities/session';

export interface GroupChatSelectionState {
  selectedGroupId?: string;
  selectedChatName?: string;
  selectedChatImage?: string;
}

export interface GroupUserState {
  selection: GroupChatSelectionState;
  members: GroupMember[];
  currentUserNickName: string;
}

@Injectable({ providedIn: 'root' })
export class GroupUserStateService {
  private selectedGroupIdSubject = new BehaviorSubject<string | undefined>(undefined);
  public selectedGroupId$ = this.selectedGroupIdSubject.asObservable();

  private selectedChatNameSubject = new BehaviorSubject<string | undefined>(undefined);
  public selectedChatName$ = this.selectedChatNameSubject.asObservable();

  private selectedChatImageSubject = new BehaviorSubject<string | undefined>(undefined);
  public selectedChatImage$ = this.selectedChatImageSubject.asObservable();

  private membersSubject = new BehaviorSubject<GroupMember[]>([]);
  public members$ = this.membersSubject.asObservable();

  private currentUserNickNameSubject = new BehaviorSubject<string>('');
  public currentUserNickName$ = this.currentUserNickNameSubject.asObservable();

  public userState$: Observable<GroupUserState> = combineLatest([
    this.selectedGroupId$,
    this.selectedChatName$,
    this.selectedChatImage$,
    this.members$,
    this.currentUserNickName$
  ]).pipe(
    map(([selectedGroupId, selectedChatName, selectedChatImage, members, currentUserNickName]) => ({
      selection: { selectedGroupId, selectedChatName, selectedChatImage },
      members,
      currentUserNickName
    })),
    shareReplay(1)
  );

  constructor(
    private groupInfoApi: GroupInfoApiService,
    private groupChatApi: GroupChatApiService,
    private authService: AuthService,
  ) {
    this.authService.waitForAuthInit().subscribe(() => {
      this.currentUserNickNameSubject.next(this.authService.getNickName() || '');
    });

    this.groupChatApi.groupUpdated$.subscribe((updatedGroup) => {
      const selectedId = this.selectedGroupIdSubject.value;
      if (updatedGroup && updatedGroup.groupId && updatedGroup.groupId === selectedId) {
        this.selectedChatNameSubject.next(updatedGroup.groupName);
        this.selectedChatImageSubject.next(updatedGroup.image);
      }
    });
  }

  setSelectedGroup(groupId: string | undefined, groupName?: string, image?: string): void {
    this.selectedGroupIdSubject.next(groupId);
    this.selectedChatNameSubject.next(groupName);
    this.selectedChatImageSubject.next(image);
    if (groupId) {
      this.loadGroupInfo(groupId);
    } else {
      this.membersSubject.next([]);
    }
  }

  clearSelection(): void {
    this.setSelectedGroup(undefined, undefined, undefined);
  }

  loadGroupInfo(groupId: string): void {
    this.groupInfoApi.getGroupInfo(groupId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.selectedChatNameSubject.next(response.data.groupName);
          this.selectedChatImageSubject.next(response.data.image);
          this.membersSubject.next(response.data.members);
        }
      },
      error: () => {
        this.membersSubject.next([]);
      }
    });
  }

  async addMembers(groupId: string, users: string[]): Promise<void> {
    await this.groupChatApi.addGroupMembers(groupId, { users });
    this.groupChatApi.refreshGroups();
    this.loadGroupInfo(groupId);
  }

  async removeMember(groupId: string, user: string): Promise<void> {
    await this.groupChatApi.removeGroupMembers(groupId, { users: [user] });
    this.groupChatApi.refreshGroups();
    this.loadGroupInfo(groupId);
  }

  async deleteGroup(groupId: string): Promise<void> {
    await this.groupChatApi.deleteGroup(groupId);
    this.groupChatApi.refreshGroups();
    this.clearSelection();
  }

  getSelectedGroupId(): string | undefined { return this.selectedGroupIdSubject.value; }
  getMembers(): GroupMember[] { return this.membersSubject.value; }
  getCurrentUserNickName(): string { return this.currentUserNickNameSubject.value; }
  getSelectedChatName(): string | undefined { return this.selectedChatNameSubject.value; }
  getSelectedChatImage(): string | undefined { return this.selectedChatImageSubject.value; }
}



