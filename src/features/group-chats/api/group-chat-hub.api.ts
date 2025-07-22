import { Injectable } from '@angular/core';
import { environment } from '../../../shared/api-result';
import { GroupChat } from '../../../entities/group-chats';
import { BaseChatApiService } from '../../../shared/chats';

@Injectable({ providedIn: 'root' })
export class GroupChatApiService extends BaseChatApiService<GroupChat> {
  constructor() {
    super(environment.groupChatHubUrl, 'GetAllGroupForUserAsync', 'LoadGroupChatHistoryAsync');
  }
}