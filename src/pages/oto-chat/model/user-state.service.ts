import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, combineLatest } from 'rxjs';
import { map, distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { OtoChatApiService } from '../api/oto-chat/oto-chat-hub.api';
import { AuthService } from '../../../entities/session';
import { OtoChat } from './oto.chat';

export interface UserDeletionInfo {
  userName: string;
}

export interface UserUpdateInfo {
  userName: string;
  image?: string;
  updatedAt: string;
  oldNickName: string;
}

export interface SelectedChatUpdateInfo {
  oldNickName: string;
  newNickName: string;
  image?: string;
}

export interface ChatState {
  selectedChat?: string;
  selectedChatImage?: string;
  selectedOtoChat?: OtoChat;
  currentUserNickName: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserStateService implements OnDestroy {
  private currentUserNickNameSubject = new BehaviorSubject<string>('');
  public currentUserNickName$ = this.currentUserNickNameSubject.asObservable();

  private selectedChatSubject = new BehaviorSubject<string | undefined>(undefined);
  public selectedChat$ = this.selectedChatSubject.asObservable();

  private selectedChatImageSubject = new BehaviorSubject<string | undefined>(undefined);
  public selectedChatImage$ = this.selectedChatImageSubject.asObservable();

  private selectedOtoChatSubject = new BehaviorSubject<OtoChat | undefined>(undefined);
  public selectedOtoChat$ = this.selectedOtoChatSubject.asObservable();

  private userDeletedNotificationSubject = new BehaviorSubject<{show: boolean, userName: string}>({show: false, userName: ''});
  public userDeletedNotification$ = this.userDeletedNotificationSubject.asObservable();

  public chatState$: Observable<ChatState> = combineLatest([
    this.selectedChat$,
    this.selectedChatImage$,
    this.selectedOtoChat$,
    this.currentUserNickName$
  ]).pipe(
    map(([selectedChat, selectedChatImage, selectedOtoChat, currentUserNickName]) => ({
      selectedChat,
      selectedChatImage,
      selectedOtoChat,
      currentUserNickName
    })),
    distinctUntilChanged((prev, curr) => 
      prev.selectedChat === curr.selectedChat &&
      prev.selectedChatImage === curr.selectedChatImage &&
      prev.selectedOtoChat?.nickName === curr.selectedOtoChat?.nickName &&
      prev.currentUserNickName === curr.currentUserNickName
    ),
    shareReplay(1)
  );

  public displayChatInfo$ = this.chatState$.pipe(
    map(state => ({
      displayName: this.getDisplayChatName(state.selectedOtoChat?.nickName || ''),
      displayImage: this.getDisplayChatImage(
        state.selectedOtoChat?.nickName || '',
        state.selectedOtoChat?.image || '',
        'assets/bookmark.svg'
      )
    })),
    shareReplay(1)
  );

  private subscriptions: Subscription[] = [];

  constructor(
    private otoChatApi: OtoChatApiService,
    private authService: AuthService
  ) {
    this.initializeCurrentUser();
  }

  private initializeCurrentUser(): void {
    this.authService.waitForAuthInit().subscribe(() => {
      const nickName = this.authService.getNickName() || '';
      this.currentUserNickNameSubject.next(nickName);
    });
  }

  getCurrentUserNickName(): string {
    return this.currentUserNickNameSubject.value;
  }

  getSelectedChat(): string | undefined {
    return this.selectedChatSubject.value;
  }

  getSelectedChatImage(): string | undefined {
    return this.selectedChatImageSubject.value;
  }

  getSelectedOtoChat(): OtoChat | undefined {
    return this.selectedOtoChatSubject.value;
  }

  setSelectedChat(chat: string | undefined, image?: string, otoChat?: OtoChat): void {
    this.selectedChatSubject.next(chat);
    this.selectedChatImageSubject.next(image);
    this.selectedOtoChatSubject.next(otoChat);
  }

  updateSelectedOtoChat(otoChat: OtoChat): void {
    this.selectedOtoChatSubject.next(otoChat);
    this.selectedChatSubject.next(otoChat.nickName);
    this.selectedChatImageSubject.next(otoChat.image);
  }

  clearSelectedChat(): void {
    this.selectedChatSubject.next(undefined);
    this.selectedChatImageSubject.next(undefined);
    this.selectedOtoChatSubject.next(undefined);
  }

  showUserDeletedNotification(userName: string): void {
    this.userDeletedNotificationSubject.next({show: true, userName});
  }

  hideUserDeletedNotification(): void {
    this.userDeletedNotificationSubject.next({show: false, userName: ''});
  }

  subscribeToUserDeletion(callback: (deletedUserInfo: UserDeletionInfo) => void): Subscription {
    return this.otoChatApi.userInfoDeleted$.subscribe(callback);
  }

  subscribeToUserInfoUpdates(callback: (userInfo: UserUpdateInfo) => void): Subscription {
    return this.otoChatApi.userInfoUpdated$.subscribe(userInfo => {
      if (userInfo) {
        callback(userInfo);
      }
    });
  }

  handleUserDeletion(deletedUserInfo: UserDeletionInfo): {
    shouldCloseChat: boolean;
    shouldShowNotification: boolean;
  } {
    const selectedChat = this.getSelectedChat();
    const shouldCloseChat = selectedChat === deletedUserInfo.userName;
    
    if (shouldCloseChat) {
      this.clearSelectedChat();
      this.showUserDeletedNotification(deletedUserInfo.userName);
    }

    return {
      shouldCloseChat,
      shouldShowNotification: shouldCloseChat
    };
  }

  handleUserInfoUpdate(userInfo: UserUpdateInfo): {
    shouldUpdateCurrentUser: boolean;
    shouldUpdateSelectedChat: boolean;
    selectedChatUpdateInfo?: SelectedChatUpdateInfo;
  } {
    const currentUserNickName = this.getCurrentUserNickName();
    const selectedChat = this.getSelectedChat();
    const selectedOtoChat = this.getSelectedOtoChat();
    
    const shouldUpdateCurrentUser = userInfo.oldNickName === currentUserNickName || 
                                  userInfo.userName === currentUserNickName;
    
    if (shouldUpdateCurrentUser) {
      this.currentUserNickNameSubject.next(userInfo.userName);
    }

    const shouldUpdateSelectedChat = selectedChat === userInfo.oldNickName;
    let selectedChatUpdateInfo: SelectedChatUpdateInfo | undefined;

    if (shouldUpdateSelectedChat && selectedOtoChat) {
      const updatedChat: OtoChat = {
        ...selectedOtoChat,
        nickName: userInfo.userName,
        image: userInfo.image || selectedOtoChat.image
      };
      
      this.updateSelectedOtoChat(updatedChat);
      
      selectedChatUpdateInfo = {
        oldNickName: userInfo.oldNickName,
        newNickName: userInfo.userName,
        image: userInfo.image
      };
    }

    return {
      shouldUpdateCurrentUser,
      shouldUpdateSelectedChat,
      selectedChatUpdateInfo
    };
  }

  refreshChats(): void {
    this.otoChatApi.refreshChats();
  }

  isChatWithCurrentUser(chatNickName: string): boolean {
    return chatNickName === this.getCurrentUserNickName();
  }

  getDisplayChatName(chatNickName: string): string {
    return this.isChatWithCurrentUser(chatNickName) ? 'SavedMessage' : chatNickName;
  }

  getDisplayChatImage(chatNickName: string, chatImage: string, currentUserImage?: string): string {
    if (this.isChatWithCurrentUser(chatNickName)) {
      return currentUserImage || 'assets/bookmark.svg';
    }
    return chatImage;
  }

  sortChats(chats: OtoChat[]): OtoChat[] {
    return [...chats].sort((a, b) => {
      if (this.isChatWithCurrentUser(a.nickName)) return -1;
      if (this.isChatWithCurrentUser(b.nickName)) return 1;
      
      const aUpdate = (a as any).lastUserInfoUpdate;
      const bUpdate = (b as any).lastUserInfoUpdate;
      
      if (aUpdate && bUpdate) {
        return new Date(bUpdate).getTime() - new Date(aUpdate).getTime();
      }
      
      return 0;
    });
  }

  isChatActive(chatNickName: string): boolean {
    return this.getSelectedChat() === chatNickName;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.currentUserNickNameSubject.complete();
    this.selectedChatSubject.complete();
    this.selectedChatImageSubject.complete();
    this.selectedOtoChatSubject.complete();
    this.userDeletedNotificationSubject.complete();
  }
}

export * from './user-state.service';
