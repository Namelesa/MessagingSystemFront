import { Injectable } from '@angular/core';
import { environment } from '../../../shared/api-result';
import { OtoChat } from '../../../entities/oto-chats';
import { BaseChatApiService } from '../../../shared/chats';

@Injectable({ providedIn: 'root' })
export class OtoChatApiService extends BaseChatApiService<OtoChat> {
  constructor() {
    super(environment.otoChatHubUrl, 'GetChatsAsync', 'LoadChatHistoryAsync');
  }
}
