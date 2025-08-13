import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, HostListener, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, AsyncPipe } from '@angular/common';
import { OtoChatApiService } from '../../api/oto-chat/oto-chat-hub.api';
import { OtoChat } from '../../model/oto.chat';
import { SearchUser } from '../../../../entities/search-user';
import { BaseChatListComponent } from '../../../../shared/chat';
import { ListItemComponent } from '../../../../shared/list';
import { SearchInputComponent } from '../../../../shared/search';
import { UserStateService, UserDeletionInfo, UserUpdateInfo } from '../../service/user-state.service';
import { UserSearchService, UserSearchState } from '../../service/user-search.service';

@Component({
  selector: 'app-oto-chat-list',
  standalone: true,
  imports: [FormsModule, ListItemComponent, SearchInputComponent, CommonModule, AsyncPipe],
  templateUrl: './oto-chat.list.component.html',
})
export class OtoChatListComponent extends BaseChatListComponent<OtoChat> implements OnInit, OnDestroy {
  protected apiService: OtoChatApiService;
  
  @Input() user$: Observable<SearchUser | null> | null = null;
  
  @Output() userSearchQueryChange = new EventEmitter<string>();
  @Output() userSearchFocus = new EventEmitter<void>();
  @Output() userSearchClear = new EventEmitter<void>();
  @Output() chatSelected = new EventEmitter<OtoChat>();
  @Output() foundedUser = new EventEmitter<{ nick: string, image: string }>();
  @Output() userInfoUpdated = new EventEmitter<{ userName: string, image?: string, updatedAt: string, oldNickName: string }>();
  @Output() selectedChatUserUpdated = new EventEmitter<{ oldNickName: string, newNickName: string, image?: string }>();
  @Output() userDeleted = new EventEmitter<{ userName: string }>();
  @Output() chatClosedDueToUserDeletion = new EventEmitter<void>();

  currentUserNickName$: Observable<string>;
  selectedChat$: Observable<string | undefined>;
  searchState$: Observable<UserSearchState>;
  
  public image: string | null = null;
  
  @ViewChild('searchContainer', { static: false }) searchContainerRef!: ElementRef;
  @Input() searchPlaceholder = 'Search...';
  @Input() emptyListText = 'Chats not found ;(';
  @Input() override selectedNickname: string | undefined = undefined;

  private subscriptions: Subscription[] = [];

  constructor(
    private otoChatApi: OtoChatApiService,
    private userStateService: UserStateService,
    private userSearchService: UserSearchService
  ) {
    super();
    this.apiService = this.otoChatApi;
    this.currentUserNickName$ = this.userStateService.currentUserNickName$;
    this.selectedChat$ = this.userStateService.selectedChat$;
    this.searchState$ = this.userSearchService.searchState$;
    this.user$ = this.userSearchService.user$;
  }

  override ngOnInit() {
    super.ngOnInit();
    this.subscribeToServices();
    this.syncSelectedChatWithService();
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private syncSelectedChatWithService(): void {
    const selectedChatSubscription = this.selectedChat$.subscribe(chat => {
      this.selectedNickname = chat;
    });

    this.subscriptions.push(selectedChatSubscription);
  }

  private subscribeToServices(): void {
    const userInfoSubscription = this.userStateService.subscribeToUserInfoUpdates(userInfo => {
      this.handleUserInfoUpdate(userInfo);
      this.userInfoUpdated.emit(userInfo);
    });

    const userDeletedSubscription = this.userStateService.subscribeToUserDeletion(deletedUserInfo => {
      this.handleUserDeletion(deletedUserInfo);
    });

    const searchStateSubscription = this.searchState$.subscribe(searchState => {
      this.searchQuery = searchState.searchQuery;
      this.searchResults = searchState.searchResults;
      this.isSearchFocused = searchState.isSearchFocused;
    });

    this.subscriptions.push(userInfoSubscription, userDeletedSubscription, searchStateSubscription);
  }

  private handleUserDeletion(deletedUserInfo: UserDeletionInfo): void {
    const result = this.userStateService.handleUserDeletion(deletedUserInfo);
    
    if (result.shouldCloseChat) {
      this.chatClosedDueToUserDeletion.emit();
    }

    this.userDeleted.emit(deletedUserInfo);
    this.userStateService.refreshChats();
  }

  private handleUserInfoUpdate(userInfo: UserUpdateInfo): void {
    const result = this.userStateService.handleUserInfoUpdate(userInfo);
    
    if (result.shouldUpdateCurrentUser && userInfo.image) {
      this.image = userInfo.image;
    }
    
    if (result.shouldUpdateSelectedChat && result.selectedChatUpdateInfo) {
      this.selectedChatUserUpdated.emit(result.selectedChatUpdateInfo);
      
      setTimeout(() => {
        const currentChats = (this.apiService as any).chatsSubject?.value || [];
        const updatedChat = currentChats.find((chat: OtoChat) => chat.nickName === userInfo.userName);
        
        if (updatedChat) {
          this.chatSelected.emit(updatedChat);
        }
      }, 100);
    }
  }

  get sortedChats$(): Observable<OtoChat[]> {
    return this.chats$.pipe(
      map(chats => {
        if (!chats) return [];
        return this.userStateService.sortChats(chats);
      })
    );
  }

  getChatName(chat: OtoChat): string {
    return chat.nickName;
  }  

  onChatClick(chat: OtoChat): void {
    this.userStateService.setSelectedChat(chat.nickName, chat.image, chat);
    this.chatSelected.emit(chat);
  }

  isSavedMessagesChat(chat: OtoChat): boolean {
    return this.userStateService.isChatWithCurrentUser(chat.nickName);
  }

  getChatDisplayName(chat: OtoChat): string {
    return this.userStateService.getDisplayChatName(chat.nickName);
  }

  getChatImage(chat: OtoChat): string | null {
    if (this.isSavedMessagesChat(chat)) {
      return this.image;
    }
    
    return (chat as any).image || (chat as any).userImage || null;
  }

  isChatActive(chat: OtoChat): boolean {
    return this.userStateService.isChatActive(chat.nickName);
  }

  onSearchFocused(): void {
    this.userSearchService.onSearchFocus();
    this.userSearchFocus.emit();
  }

  onSearchActiveChange(isActive: boolean): void {
    this.userSearchService.onSearchActiveChange(isActive);
    if (!isActive) {
      this.userSearchClear.emit();
    }
  }

  onSearchQueryChange(query: string): void {
    this.userSearchService.onSearchQueryChange(query);
    this.userSearchQueryChange.emit(query);
  }  

  onFoundedUser(userData: { nick: string, image: string }): void {
    this.userSearchService.onFoundUser(userData);
    this.foundedUser.emit(userData);
  }

  onSearchResult(results: string[]): void {
    this.userSearchService.onSearchResult(results);
  }

  onStartChat(result: string, image: string | null): void {
    this.userSearchService.startChatWithUser({ nick: result, image: image || '' });
    this.foundedUser.emit({ nick: result, image: image || '' });
  }

  findExistingChat(nickName: string): OtoChat | null {
    const currentChats = (this.apiService as any).chatsSubject?.value || [];
    const foundChat = currentChats.find((chat: OtoChat) => chat.nickName === nickName) || null;
    return foundChat;
  }

  openChatWithUser(userData: { nick: string, image: string }): void {
    const existingChat = this.findExistingChat(userData.nick);
    
    if (existingChat) {
      this.onChatClick(existingChat);
    } else {
      this.onFoundedUser(userData);
    }
  }

  getChatLastUpdate(chat: OtoChat): Date | null {
    const lastUpdate = (chat as any).lastUpdated || (chat as any).lastUserInfoUpdate;
    return lastUpdate ? new Date(lastUpdate) : null;
  }

  isRecentlyUpdated(chat: OtoChat): boolean {
    const lastUpdate = this.getChatLastUpdate(chat);
    if (!lastUpdate) return false;
    
    const now = new Date();
    const diffInMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
    return diffInMinutes < 5;
  }

  forceRefreshChats(): void {
    this.userStateService.refreshChats();
  }

  trackByFn(index: number, chat: OtoChat): string {
    return chat.nickName || index.toString();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const searchState = this.userSearchService.getCurrentSearchState();
    const clickedInside = this.searchContainerRef?.nativeElement?.contains(event.target);
    const hasQuery = searchState.searchQuery.trim().length > 0;

    if (!clickedInside && !hasQuery) {
      this.userSearchService.clearSearch();
    }
  }

  updateActiveChatAfterUserChange(oldNickName: string, newNickName: string): void {
    console.warn('updateActiveChatAfterUserChange is deprecated. Updates are handled automatically by UserStateService.');
  }

  get isSearchFocused(): boolean {
    return this.userSearchService.getCurrentSearchState().isSearchFocused;
  }

  set isSearchFocused(value: boolean) {
  }

  get search(): string {
    return this.userSearchService.getCurrentSearchState().searchQuery;
  }

  set search(value: string) {
  }

  public override searchQuery = '';
  public override searchResults: string[] = [];
}