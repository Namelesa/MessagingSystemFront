import { Injectable } from '@angular/core';
import { environment } from '../../../shared/api-result';
import { OtoChat } from '../../../entities/oto-chats';
import { BaseChatApiService } from '../../../shared/chats';
import { AuthService } from '../../../entities/user/api/auht.service';

@Injectable({ providedIn: 'root' })
export class OtoChatApiService extends BaseChatApiService<OtoChat> {
  private isConnected = false;

  constructor(private authService: AuthService) {
    super(environment.otoChatHubUrl, 'GetChatsAsync', 'LoadChatHistoryAsync');
  }

  connected(): void {
    if (this.isConnected) {
      return;
    }
    super.connect();
    this.isConnected = true;
  }

  override disconnect(): void {
    if (this.isConnected) {
      super.disconnect();
      this.isConnected = false; 
    }
  }

  protected override getCurrentUser(): string | null {
    const nickName = this.authService.getNickName();
    return nickName;
  }
}
