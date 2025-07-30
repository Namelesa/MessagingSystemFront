import { environment } from "../../../shared/api-result";
import { SearchUser } from "../../../entities/search-user";
import { ApiResponse } from "../../../shared/api-result";
import { HttpClient } from "@angular/common/http";
import { inject } from "@angular/core";

export class FindUserApi {
    private http = inject(HttpClient);
  
    searchUser(nickName: string) {
      return this.http.get<ApiResponse<SearchUser>>(`${environment.messagingApiUrl}find-user?nickName=${nickName}`, {withCredentials: true});
    }
  }