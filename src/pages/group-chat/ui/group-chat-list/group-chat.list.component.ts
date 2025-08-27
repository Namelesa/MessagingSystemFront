import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, Input, OnInit, Output, EventEmitter, HostListener, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Observable, map, combineLatest, BehaviorSubject } from 'rxjs';
import { GroupChatApiService } from '../../api/group-chat/group-chat-hub.api';
import { GroupCreateRequest } from '../../api/group-chat/group-create';
import { validateCreateGroupForm } from '../../model/validate-group';
import { SearchUser } from '../../../../entities/search-user';
import { AuthService } from '../../../../entities/session';
import { GroupChat } from '../../model/group.chat';
import { InputComponent, ToastService } from '../../../../shared/ui-elements';
import { SearchInputComponent } from '../../../../shared/search';
import { BaseChatListComponent } from '../../../../shared/realtime';
import { GroupSearchService } from '../../model/group-search.service';
import { ListItemComponent } from '../../../../shared/list';

@Component({
  selector: 'app-group-chat-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ListItemComponent, SearchInputComponent, InputComponent],
  templateUrl: './group-chat.list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupChatListComponent extends BaseChatListComponent<GroupChat> implements OnInit {
  protected apiService: GroupChatApiService;
  @Input() user$: Observable<SearchUser | null> | null = null;
  @Output() userSearchQueryChange = new EventEmitter<string>();
  @Output() userSearchClear = new EventEmitter<void>();
  @Output() userSearchFocus = new EventEmitter<void>();
  @Input() searchPlaceholder = 'Search groups...';
  @Input() emptyListText = 'Groups not found ;(';

  constructor(
    private groupChatApi: GroupChatApiService, 
    private toastService: ToastService, 
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private groupSearch: GroupSearchService
  ) {
    super();
    this.apiService = this.groupChatApi;
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.filteredChats$ = combineLatest([
      this.chats$,
      this.searchQuerySubject.asObservable()
    ]).pipe(
      map(([chats, query]) => {
        const trimmed = (query || '').trim();
        if (!trimmed) return chats || [];
        const lower = trimmed.toLowerCase();
        return (chats || []).filter(chat => (this.getChatName(chat) || '').toLowerCase().includes(lower));
      })
    );
  }

  public image: string | null = null;
  selectedImageUrl: string | null = null;
  showCreateGroupModal = false;
  
  formData: GroupCreateRequest = {
    GroupName: '',
    Description: '',
    Users: [],
    ImageFile: null,
    Admin: '',
  };

  newGroupImage: File | null = null;
  errors: string[] = [];

  private searchQuerySubject = new BehaviorSubject<string>('');
  search = '';
  isSearchActive = false;

  userSearchQuery = '';
  selectedUsers: Array<{nickName: string, image: string}> = [];
  isUserSearchActive = false;

  filteredChats$!: Observable<GroupChat[]>;

  trackByChat = (index: number, chat: GroupChat) => chat.groupId || chat.groupName || index;

  onSearchQueryChange(query: string) {
    this.search = query;
    this.isSearchActive = query.trim().length > 0;
    this.searchQuerySubject.next(query);
    this.cdr.markForCheck();
  }

  onSearchFocus() {
    this.isSearchActive = true;
    this.cdr.markForCheck();
  }

  clearSearching() {
    this.search = '';
    this.isSearchActive = false;
    this.searchQuerySubject.next('');
    this.cdr.markForCheck();
  }

  private updateFilteredChats() { /* no-op: kept for compatibility */ }

  onUserSearchQueryChange(query: string) {
    this.userSearchQuery = query;
    const trimmed = query.trim();
    this.isUserSearchActive = !!trimmed;
    this.groupSearch.onSearchQueryChange(query);
    this.userSearchQueryChange.emit(query);
  }

  onUserSearchActiveChange(isActive: boolean) {
    this.isUserSearchActive = isActive;
  }

  onUserSearchFocus() {
    this.isUserSearchActive = true;
    this.userSearchQuery = '';
    this.groupSearch.onFocus();
    this.userSearchFocus.emit();
  }

  addUserToGroup(nickName: string, image: string) {
    if (!this.selectedUsers.find(user => user.nickName === nickName)) {
      this.selectedUsers.push({ nickName, image });
      this.updateFormDataUsers();
    }
    this.userSearchQuery = '';
    this.isUserSearchActive = false;
    this.userSearchClear.emit();
  }

  removeUserFromGroup(nickName: string) {
    this.selectedUsers = this.selectedUsers.filter(user => user.nickName !== nickName);
    this.updateFormDataUsers();
  }

  private updateFormDataUsers() {
    this.formData.Users = this.selectedUsers.map(user => user.nickName);
  }

  onUserClear() {
    this.userSearchQuery = '';
    this.isUserSearchActive = false;
    this.groupSearch.clear();
    this.userSearchClear.emit();
  }

  openCreateGroupModal() {
    this.showCreateGroupModal = true;
    const currentUser = this.authService.getNickName() || '';
    
    this.formData = {
      GroupName: '',
      Description: '',
      Users: [], 
      ImageFile: null,
      Admin: currentUser,
    };
    
    this.selectedImageUrl = null;
    this.selectedUsers = [];
    this.userSearchQuery = '';
    this.isUserSearchActive = false;
    this.errors = [];
  }
  
  closeCreateGroupModal() {
    this.showCreateGroupModal = false;
    this.formData = {
      GroupName: '',
      Description: '',
      Users: [],
      ImageFile: null,
      Admin: '',
    };
    this.selectedImageUrl = null;
    this.selectedUsers = [];
    this.userSearchQuery = '';
    this.isUserSearchActive = false;
    this.errors = [];
  }
  
  createGroup() {
    this.errors = validateCreateGroupForm(this.formData);
    if (this.errors.length > 0) return;

    if(this.formData.ImageFile == null){
      this.toastService.show('Please select an image for the group.', 'error');
    }

    const admin = this.authService.getNickName() || this.formData.Admin;
    const usersWithoutAdmin = this.selectedUsers
      .map(user => user.nickName)
      .filter(user => user !== admin);
    
    const totalUniqueUsers = usersWithoutAdmin.length + 1; 
    if (totalUniqueUsers < 3 || totalUniqueUsers > 40) {
      this.errors.push(`Group must have between 3 and 40 unique users. Current count: ${totalUniqueUsers} (including admin)`);
      this.toastService.show(`Group must have between 3 and 40 unique users`, 'error');
      return;
    }

    const requestData: GroupCreateRequest = {
      ...this.formData,
      Users: usersWithoutAdmin,
      Admin: admin
    };

    this.groupChatApi.createGroup(requestData).subscribe({
      next: (result) => {
        if (result?.message == null) {
          this.toastService.show('Group created successfully!', 'success');
          this.closeCreateGroupModal();
        } else {
          this.toastService.show('Group creation failed. Server returned unexpected result.', 'error');
        }
      },
      error: (error: any) => {
        if (error.error?.message) {
          this.toastService.show(`Failed to create group: ${error.error.message}`, 'error');
        } else {
          this.toastService.show('Failed to create group. Please try again.', 'error');
        }
      }
    });
  }
  
  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      const file = input.files[0];
      this.formData.ImageFile = file;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedImageUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      this.formData.ImageFile = undefined;
      this.selectedImageUrl = null;
    }
  }

  getFieldErrors(fieldName: string): string[] {
    const fieldMapping: { [key: string]: string[] } = {
      'groupName': ['Group name', 'Only letters, 1 to 350 characters'],
      'groupDescription': ['Description', 'Only letters, 1 to 650 characters'],
      'groupMembers': ['Group Members'],
    };

    const keywords = fieldMapping[fieldName];
    if (!keywords) return [];

    return this.errors.filter(error =>
      keywords.some(keyword => error.toLowerCase().includes(keyword.toLowerCase()))
    );
  }   

  getChatName(chat: GroupChat): string {
    return chat.groupName;
  }

  onSelectGroupChat(nickname: string, image: string | null, groupId?: string) {
    this.selectedNickname = nickname;
    this.image = image;

    if (groupId) {
      this.groupChatApi.joinGroup(groupId).then(() => {
        this.onSelectChat(nickname, image ?? '', groupId); 
      }).catch(err => {
        this.onSelectChat(nickname, image ?? '', groupId); 
      });
    } else {
      this.onSelectChat(nickname, image ?? '', groupId);
    }
  }

  selectGroupFromSearch(chat: GroupChat) {
    this.onSelectGroupChat(this.getChatName(chat), chat.image, chat.groupId);
    this.clearSearch();
  }

  @HostListener('document:keydown.escape')
  onEscapePressed() {
  this.resetSelectedChat();
}

private resetSelectedChat(): void {
  this.selectedImageUrl = null;
  this.cdr.detectChanges();
}
}