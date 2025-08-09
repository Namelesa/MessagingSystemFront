import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../shared/api-result';
import { GroupInfoResponse } from '../model/group-info.model';
import { GroupInfoEditData } from '../model/group-info-edit.model';
// Removed dependency on another feature to comply with FSD

@Injectable({ providedIn: 'root' })
export class GroupInfoApiService {
  private groupInfoSubject = new BehaviorSubject<GroupInfoResponse | null>(null);
  public groupInfo$: Observable<GroupInfoResponse | null> = this.groupInfoSubject.asObservable();
  
  private currentGroupId: string | null = null;
  private userInfoSubscription: Subscription | null = null;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  // Subscriptions to user info changes are now handled at composition level (page/widget)

  getGroupInfo(groupId: string): Observable<GroupInfoResponse> {
    this.currentGroupId = groupId;
    
    return this.http.get<GroupInfoResponse>(`${environment.groupApiUrl}${groupId}`, { withCredentials: true })
      .pipe(
        tap(groupInfo => {
          this.groupInfoSubject.next(groupInfo);
        })
      );
  }

  updateGroupInfo(id: string, data: GroupInfoEditData): Observable<GroupInfoResponse> {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value as any);
      }
    });

    return this.http.put<GroupInfoResponse>(`${environment.groupApiUrl}edit-group`, formData, 
      { 
        params: { id }, 
        withCredentials: true 
      }).pipe(
        tap(updatedGroupInfo => {
          this.groupInfoSubject.next(updatedGroupInfo);
          // Refreshing chat lists is handled by the page via GroupChatApiService
        })
      );
  }

  private handleUserInfoDeleted(userName: string): void {
    const currentGroupInfo = this.groupInfoSubject.value;
    
    if (!currentGroupInfo || !userName) {
      return;
    }
  
    let hasChanges = false;
    const updatedGroupInfo = { ...currentGroupInfo };
    updatedGroupInfo.data = { ...currentGroupInfo.data };
  
    if (currentGroupInfo.data.admin === userName) {
      updatedGroupInfo.data.admin = '';
      hasChanges = true;
    }

    if (currentGroupInfo.data.members && Array.isArray(currentGroupInfo.data.members)) {
      const filteredMembers = currentGroupInfo.data.members.filter(member => member.nickName !== userName);
      if (filteredMembers.length !== currentGroupInfo.data.members.length) {
        updatedGroupInfo.data.members = filteredMembers;
        hasChanges = true;
      }
    }
  
    if (currentGroupInfo.data.users && Array.isArray(currentGroupInfo.data.users)) {
      const filteredUsers = currentGroupInfo.data.users.filter(user => user !== userName);
      if (filteredUsers.length !== currentGroupInfo.data.users.length) {
        updatedGroupInfo.data.users = filteredUsers;
        hasChanges = true;
      }
    }
  
    if (hasChanges) {
      this.groupInfoSubject.next(updatedGroupInfo);
    }
  }

  private handleUserInfoChanged(userInfo: { NewUserName: string, Image?: string, UpdatedAt: string, OldNickName: string }): void {
    const currentGroupInfo = this.groupInfoSubject.value;
    
    if (!currentGroupInfo) {
      return;
    }
  
    let hasChanges = false;
    const updatedGroupInfo = { ...currentGroupInfo };
    updatedGroupInfo.data = { ...currentGroupInfo.data };
  
    if (currentGroupInfo.data.admin === userInfo.OldNickName) {
      updatedGroupInfo.data.admin = userInfo.NewUserName;
      hasChanges = true;
    }
  
    if (currentGroupInfo.data.members && Array.isArray(currentGroupInfo.data.members)) {
      const updatedMembers = currentGroupInfo.data.members.map(member => {
        if (member.nickName === userInfo.OldNickName || member.nickName === userInfo.NewUserName) {
          hasChanges = true;
          const updatedMember = {
            ...member,
            nickName: userInfo.NewUserName
          };
          
          if (userInfo.Image) {
            updatedMember.image = userInfo.Image;
          }
          
          return updatedMember;
        }
        return member;
      });
      
      updatedGroupInfo.data.members = updatedMembers;
    }
  
    if (currentGroupInfo.data.users && Array.isArray(currentGroupInfo.data.users)) {
      const updatedUsers = currentGroupInfo.data.users.map(user => 
        user === userInfo.OldNickName ? userInfo.NewUserName : user
      );
      
      if (updatedUsers.some((user, index) => user !== currentGroupInfo.data.users![index])) {
        updatedGroupInfo.data.users = updatedUsers;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      this.groupInfoSubject.next(updatedGroupInfo);
    }
  }

  getCurrentGroupInfo(): GroupInfoResponse | null {
    return this.groupInfoSubject.value;
  }

  refreshGroupInfo(groupId: string): Observable<GroupInfoResponse> {
    return this.getGroupInfo(groupId);
  }

  clearGroupInfo(): void {
    this.groupInfoSubject.next(null);
    this.currentGroupId = null;
    
    if (this.userInfoSubscription) {
      this.userInfoSubscription.unsubscribe();
      this.userInfoSubscription = null;
    }
  }

  forceRefresh(): void {
    if (this.currentGroupId) {
      this.refreshGroupInfo(this.currentGroupId).subscribe();
    }
  }
}