import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, HostListener } from '@angular/core';
import { BaseChatListComponent } from '../../../shared/chats';
import { OtoChat } from '../../../entities/oto-chats';
import { OtoChatApiService } from '../api/oto-chat-hub.api';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatListItemComponent } from '../../../shared/chats-ui-elements';
import { map } from 'rxjs/operators';
import { SearchUserComponent } from '../../search-user';

@Component({
  selector: 'app-oto-chat-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatListItemComponent, SearchUserComponent],
  templateUrl: './oto-chat.list.component.html',
})
export class OtoChatListComponent extends BaseChatListComponent<OtoChat> {
  protected apiService: OtoChatApiService;

  public image: string | null = null;
  public isSearchFocused = false;
  public search = '';

  @ViewChild('searchContainer', { static: false }) searchContainerRef!: ElementRef;
  @Input() searchPlaceholder = 'Search...';
  @Input() emptyListText = 'Chats not found ;(';
  @Input() currentUserNickName!: string;
  @Input() declare selectedNickname?: string;
  @Output() chatSelected = new EventEmitter<OtoChat>();

  constructor(private otoChatApi: OtoChatApiService) {
    super();
    this.apiService = this.otoChatApi;
  }

  getChatName(chat: OtoChat): string {
    return chat.nickName;
  }  

  onChatClick(chat: OtoChat) {
    this.chatSelected.emit(chat);
  }

  get sortedChats$() {
    return this.chats$.pipe(
      map(chats => {
        if (!chats) return [];
        return [...chats].sort((a, b) => {
          if (a.nickName === this.currentUserNickName) return -1;
          if (b.nickName === this.currentUserNickName) return 1;
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

  onSearchFocused() {
    this.isSearchFocused = true;
  }

  onSearchActiveChange(isActive: boolean) {
    this.isSearchFocused = isActive;
  }

  onSearchQueryChange(query: string) {
    this.search = query;
  }  

  onStartChat(nick: string, image: string) {
    this.startChat(nick, image);
    this.isSearchFocused = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const clickedInside = this.searchContainerRef?.nativeElement?.contains(event.target);
    const hasQuery = this.search.trim().length > 0;

    if (!clickedInside && !hasQuery) {
        this.isSearchFocused = false;
    }
  }
}