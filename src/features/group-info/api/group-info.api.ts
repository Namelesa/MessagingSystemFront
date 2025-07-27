import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../shared/api-result/urls/api.urls';
import { GroupInfoResponse } from '../model/group-info.model';
import { GroupInfoEditData } from '../model/group-info-edit.model';

@Injectable({ providedIn: 'root' })
export class GroupInfoApiService {
  constructor(private http: HttpClient) {}

  getGroupInfo(groupId: string): Observable<GroupInfoResponse> {
    return this.http.get<GroupInfoResponse>(`${environment.groupApiUrl}${groupId}`, { withCredentials: true });
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
      });
  }
} 