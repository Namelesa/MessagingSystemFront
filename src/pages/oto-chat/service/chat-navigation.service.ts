import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { OtoChat } from '../model/oto.chat';
import { UserStateService } from './user-state.service';
import { MessageStateService } from './message-state.service';

export interface NavigationState {
  pendingChatUser?: { nickName: string; image: string };
  isNavigating: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ChatNavigationService {
  private navigationStateSubject = new BehaviorSubject<NavigationState>({
    isNavigating: false
  });

  public navigationState$ = this.navigationStateSubject.asObservable();

  constructor(
    private router: Router,
    private userStateService: UserStateService,
    private messageStateService: MessageStateService
  ) {}

  getCurrentNavigationState(): NavigationState {
    return this.navigationStateSubject.value;
  }

  private updateState(updates: Partial<NavigationState>): void {
    const currentState = this.getCurrentNavigationState();
    this.navigationStateSubject.next({ ...currentState, ...updates });
  }

  checkForOpenChatUser(): void {
    const nav = this.router.getCurrentNavigation();
    const stateFromNav = nav?.extras?.state as { openChatWithUser?: { nickName: string; image: string } } | undefined;
    const stateFromHistory = (window.history?.state as any) || {};
    const url = new URL(window.location.href);
    const queryNick = url.searchParams.get('openChatUser');
    const queryImage = url.searchParams.get('openChatImage');
    
    const userData = stateFromNav?.openChatWithUser || 
                    stateFromHistory.openChatWithUser || 
                    (queryNick ? { nickName: queryNick, image: queryImage || '' } : undefined);
    
    if (userData) {
      this.updateState({ pendingChatUser: userData });
    }
  }

  handlePendingChatUser(chatListComponent?: any): void {
    const currentState = this.getCurrentNavigationState();
    
    if (currentState.pendingChatUser) {
      const userData = currentState.pendingChatUser;
      
      if (chatListComponent) {
        chatListComponent.openChatWithUser({ 
          nick: userData.nickName, 
          image: userData.image 
        });
      } else {
        this.selectFoundUser({ 
          nick: userData.nickName, 
          image: userData.image 
        });
      }
      
      this.updateState({ pendingChatUser: undefined });
    }
  }

  selectChat(chat: OtoChat): void {
    this.updateState({ isNavigating: true });
    
    this.userStateService.setSelectedChat(chat.nickName, chat.image, chat);
    this.messageStateService.resetEditingStates();
    this.messageStateService.forceMessageComponentReload();
    
    this.updateState({ isNavigating: false });
  }

  selectFoundUser(userData: { nick: string; image: string }): void {
    const foundUserChat: OtoChat = {
      nickName: userData.nick,
      image: userData.image,
    };

    this.selectChat(foundUserChat);
  }

  resetSelectedChat(): void {
    this.userStateService.clearSelectedChat();
    this.messageStateService.resetAllStates();
  }

  closeCurrentChat(): void {
    this.resetSelectedChat();
  }

  handleChatClosedDueToUserDeletion(): void {
    this.resetSelectedChat();
  }
}