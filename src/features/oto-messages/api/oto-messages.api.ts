import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { OtoChatApiService } from '../../oto-chats/api/oto-chat-hub.api';

@Injectable({ providedIn: 'root' })
export class OtoMessagesApi {
  constructor(private otoChatApiService: OtoChatApiService) {}
}