import { Observable, Subscription } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, HostListener, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { OtoChatApiService } from '../../api/oto-chat/oto-chat-hub.api';
import { OtoChat } from '../../model/oto.chat';
import { SearchUser } from '../../../../entities/search-user';
import { BaseChatListComponent } from '../../../../shared/chat';
import { ListItemComponent } from '../../../../shared/list';
import { SearchInputComponent } from '../../../../shared/search';

@Component({
  selector: 'app-oto-chat-list',
  standalone: true,
  imports: [FormsModule, ListItemComponent, SearchInputComponent, CommonModule],
  templateUrl: './oto-chat.list.component.html',
})
export class OtoChatListComponent extends BaseChatListComponent<OtoChat> implements OnInit, OnDestroy {
  protected apiService: OtoChatApiService;
  @Input() user$: Observable<SearchUser | null> | null = null;
  @Output() userSearchQueryChange = new EventEmitter<string>();
  @Output() userSearchFocus = new EventEmitter<void>();
  @Output() userSearchClear = new EventEmitter<void>();

  public image: string | null = null;
  public isSearchFocused = false;
  public search = '';
  public override searchQuery = '';
  public override searchResults: string[] = [];

  private subscriptions: Subscription[] = [];
  private _selectedNickname?: string;

  @ViewChild('searchContainer', { static: false }) searchContainerRef!: ElementRef;
  @Input() searchPlaceholder = 'Search...';
  @Input() emptyListText = 'Chats not found ;(';
  @Input() currentUserNickName!: string;
  
  @Input()
  override selectedNickname: string | undefined = undefined;
  
  @Output() chatSelected = new EventEmitter<OtoChat>();
  @Output() foundedUser = new EventEmitter<{ nick: string, image: string }>();
  @Output() userInfoUpdated = new EventEmitter<{ userName: string, image?: string, updatedAt: string, oldNickName: string }>();
  @Output() selectedChatUserUpdated = new EventEmitter<{ oldNickName: string, newNickName: string, image?: string }>();
  @Output() userDeleted = new EventEmitter<{ userName: string }>();
  @Output() chatClosedDueToUserDeletion = new EventEmitter<void>();

  constructor(private otoChatApi: OtoChatApiService) {
    super();
    this.apiService = this.otoChatApi;
  }

  override ngOnInit() {
    super.ngOnInit();
    this.subscribeToUserInfoChanges();
    this.subscribeToUserDeletion();
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private subscribeToUserInfoChanges() {
    const userInfoSubscription = this.apiService.userInfoUpdated$
      .pipe(
        filter(userInfo => userInfo !== null)
      )
      .subscribe(userInfo => {
        if (userInfo) {    
          this.userInfoUpdated.emit(userInfo);
          
          this.handleUserInfoUpdate(userInfo);
        }
      });

    const chatsSubscription = this.chats$.subscribe(chats => {
      void chats;
    });

    this.subscriptions.push(userInfoSubscription, chatsSubscription);
  }

  private subscribeToUserDeletion() {
    const userDeletedSubscription = this.apiService.userInfoDeleted$
      .subscribe(deletedUserInfo => {
        this.handleUserDeletion(deletedUserInfo);
      });

    this.subscriptions.push(userDeletedSubscription);
  }

  private handleUserDeletion(deletedUserInfo: { userName: string }) {
    if (this.selectedNickname === deletedUserInfo.userName) {
      this.selectedNickname = undefined;
      this.chatClosedDueToUserDeletion.emit();
    }

    this.userDeleted.emit(deletedUserInfo);

    setTimeout(() => {
      this.apiService.refreshChats();
    }, 100);
  }

  private handleUserInfoUpdate(userInfo: { userName: string, image?: string, updatedAt: string, oldNickName: string }) {
    if (userInfo.oldNickName === this.currentUserNickName || userInfo.userName === this.currentUserNickName) {
      this.currentUserNickName = userInfo.userName;
    
      if (userInfo.image) {
        this.image = userInfo.image;
      }
    }
    
    if (this.selectedNickname === userInfo.oldNickName) {
      this.selectedNickname = userInfo.userName;
      
      this.selectedChatUserUpdated.emit({
        oldNickName: userInfo.oldNickName,
        newNickName: userInfo.userName,
        image: userInfo.image
      });
      
      setTimeout(() => {
        const currentChats = (this.apiService as any).chatsSubject?.value || [];
        const updatedChat = currentChats.find((chat: OtoChat) => chat.nickName === userInfo.userName);
        
        if (updatedChat) {
          this.chatSelected.emit(updatedChat);
        }
      }, 100);
    }
  }

  getChatName(chat: OtoChat): string {
    return chat.nickName;
  }  

  onChatClick(chat: OtoChat) {
    this.selectedNickname = chat.nickName;
    this.chatSelected.emit(chat);
  }

  get sortedChats$() {
    return this.chats$.pipe(
      map(chats => {
        if (!chats) return [];
        return [...chats].sort((a, b) => {
          if (a.nickName === this.currentUserNickName) return -1;
          if (b.nickName === this.currentUserNickName) return 1;
          
          const aUpdate = (a as any).lastUserInfoUpdate;
          const bUpdate = (b as any).lastUserInfoUpdate;
          
          if (aUpdate && bUpdate) {
            return new Date(bUpdate).getTime() - new Date(aUpdate).getTime();
          }
          
          return 0;
        });
      })
    );
  }

  isSavedMessagesChat(chat: OtoChat): boolean {
    return chat.nickName === this.currentUserNickName;
  }

  getChatDisplayName(chat: OtoChat): string {
    return this.isSavedMessagesChat(chat) ? 'SavedMessage' : chat.nickName;
  }

  getChatImage(chat: OtoChat): string | null {
    if (this.isSavedMessagesChat(chat)) {
      return this.image;
    }
    
    return (chat as any).image || (chat as any).userImage || null;
  }

  onSearchFocused() {
    this.isSearchFocused = true;
    this.userSearchFocus.emit();
  }

  onSearchActiveChange(isActive: boolean) {
    this.isSearchFocused = isActive;
    if (!isActive) {
      this.onClearSearch();
      this.userSearchClear.emit();
    }
  }

  onSearchQueryChange(query: string) {
    this.search = query;
    this.searchQuery = query;
    const trimmed = query.trim();
    if (trimmed) this.userSearchQueryChange.emit(trimmed);
    else this.userSearchClear.emit();
  }  

  onFoundedUser(userData: { nick: string, image: string }) {
    this.onClearSearch();
    this.userSearchClear.emit();
    this.foundedUser.emit(userData);
  }

  findExistingChat(nickName: string): OtoChat | null {
    const currentChats = (this.apiService as any).chatsSubject?.value || [];
    const foundChat = currentChats.find((chat: OtoChat) => chat.nickName === nickName) || null;
    return foundChat;
  }

  openChatWithUser(userData: { nick: string, image: string }) {
    const existingChat = this.findExistingChat(userData.nick);
    
    if (existingChat) {
      this.onChatClick(existingChat);
    } else {
      this.onFoundedUser(userData);
    }
  }

  private onClearSearch() {
    this.isSearchFocused = false;
    this.search = '';
    this.searchQuery = '';
    this.searchResults = [];
  }

  onSearchResult(results: string[]) {
    this.searchResults = results;
  }

  onStartChat(result: string, image: string | null) {
    this.onClearSearch();
    this.foundedUser.emit({ nick: result, image: image || '' });
  }  

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const clickedInside = this.searchContainerRef?.nativeElement?.contains(event.target);
    const hasQuery = this.search.trim().length > 0;

    if (!clickedInside && !hasQuery) {
      this.onClearSearch();
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

  forceRefreshChats() {
    this.apiService.refreshChats();
  }

  isChatActive(chat: OtoChat): boolean {
    return this.selectedNickname === chat.nickName;
  }
  
  updateActiveChatAfterUserChange(oldNickName: string, newNickName: string) {
    if (this.selectedNickname === oldNickName) {
      this.selectedNickname = newNickName;
    }
  }

  trackByFn(index: number, chat: OtoChat): string {
    return chat.nickName || index.toString();
  }
}