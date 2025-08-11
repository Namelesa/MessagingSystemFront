import { Injectable } from '@angular/core';
import { OtoChat } from '../model/oto.chat';
import { AuthService } from '../../../entities/session';
import { environment } from '../../../shared/api-urls';
import { BaseChatApiService } from '../../../shared/chat';

@Injectable({
  providedIn: 'root'
})
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
    (window as any).__otoChatConnection = (this as any).connection;
    (window as any).__otoMessages$ = this.messages$;
    (window as any).__otoUserInfoDeleted$ = this.userInfoDeleted$;
    (window as any).__otoLoadHistory = (nick: string, take: number, skip: number) => this.loadChatHistory(nick, take, skip);
  }

  override disconnect(): void {
    if (this.isConnected) {
      super.disconnect();
      this.isConnected = false;
      (window as any).__otoChatConnection = undefined;
    }
  }

  protected override getCurrentUser(): string | null {
    const nickName = this.authService.getNickName();
    return nickName;
  }

  protected override handleUserInfoChanged(userInfo: { NewUserName: string, Image?: string, UpdatedAt: string, OldNickName: string }): void {    
    if (!userInfo.NewUserName || !userInfo.OldNickName) {
      console.error('OTO Chat: Invalid user info structure', userInfo);
      return;
    }
    
    super.handleUserInfoChanged(userInfo);

    const currentUser = this.getCurrentUser();
    void currentUser; // suppress unused var warning if not used further
  }

  protected override updateChatUserInfo(userInfo: { NewUserName: string, Image?: string, UpdatedAt: string, OldNickName: string }): void {    
    const currentChats = this.chatsSubject.value;
    
    const updatedChats = currentChats.map(chat => {
      if (chat.nickName === userInfo.OldNickName) {
        const updatedChat = {
          ...chat,
          nickName: userInfo.NewUserName,
          image: userInfo.Image || chat.image,
          lastUserInfoUpdate: userInfo.UpdatedAt
        };
        return updatedChat;
      }
      
      return chat;
    });
    
    const hasChanges = updatedChats.some((chat, index) => 
      chat.nickName !== currentChats[index].nickName || 
      chat.image !== currentChats[index].image
    );
    
    if (hasChanges) {
      this.chatsSubject.next(updatedChats);
    }
  }
}


