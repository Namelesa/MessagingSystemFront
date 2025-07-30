import { Component, Input, OnInit } from '@angular/core';
import { BaseChatListComponent } from '../../../shared/chats/list/base.chat.list';
import { GroupChat } from '../../../entities/group-chats';
import { GroupChatApiService } from '../api/group-chat-hub.api';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatListItemComponent, SearchInputComponent } from '../../../shared/chats-ui-elements';
import { InputComponent } from '../../../shared/ui-elements/inputs/ui/input.component';
import { validateCreateGroupForm } from '../model/validate-group';
import { GroupCreateRequest } from '../api/group-create';
import { ToastService, ToastComponent } from '../../../shared/ui-elements';
import { AuthService } from '../../../entities/user/api/auht.service';
import { FindUserStore } from '../../search-user/model/search-user-store';
import { Observable, map, combineLatest } from 'rxjs';

@Component({
  selector: 'app-group-chat-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatListItemComponent, SearchInputComponent, InputComponent, ToastComponent],
  templateUrl: './group-chat.list.component.html',
})
export class GroupChatListComponent extends BaseChatListComponent<GroupChat> implements OnInit {
  protected apiService: GroupChatApiService;

  constructor(
    private groupChatApi: GroupChatApiService, 
    private toastService: ToastService, 
    private authService: AuthService,
    public findUserStore: FindUserStore
  ) {
    super();
    this.apiService = this.groupChatApi;
    this.apiService.connected();
  }

  public image: string | null = null;
  selectedImageUrl: string | null = null;
  @Input() searchPlaceholder = 'Search groups...';
  @Input() emptyListText = 'Groups not found ;(';

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

  search = '';
  isSearchActive = false;

  userSearchQuery = '';
  selectedUsers: Array<{nickName: string, image: string}> = [];
  isUserSearchActive = false;

  filteredChats$: Observable<GroupChat[]> = combineLatest([
    this.chats$,
    new Observable<string>(subscriber => {
      subscriber.next(this.search);
    })
  ]).pipe(
    map(([chats, query]) => {
      if (!query.trim()) {
        return chats || [];
      }
      return (chats || []).filter(chat => 
        this.getChatName(chat).toLowerCase().includes(query.toLowerCase())
      );
    })
  );

  onSearchQueryChange(query: string) {
    this.search = query;
    this.isSearchActive = query.trim().length > 0;
    this.updateFilteredChats();
  }

  onSearchFocus() {
    this.isSearchActive = true;
  }

  clearSearching() {
    this.search = '';
    this.isSearchActive = false;
    this.updateFilteredChats();
  }

  private updateFilteredChats() {
    this.filteredChats$ = combineLatest([
      this.chats$,
      new Observable<string>(subscriber => subscriber.next(this.search))
    ]).pipe(
      map(([chats, query]) => {
        if (!query.trim()) {
          return chats || [];
        }
        return (chats || []).filter(chat => 
          this.getChatName(chat).toLowerCase().includes(query.toLowerCase())
        );
      })
    );
  }

  onUserSearchQueryChange(query: string) {
    this.userSearchQuery = query;
    const trimmed = query.trim();
    if (trimmed) {
      this.findUserStore.findUser(trimmed);
      this.isUserSearchActive = true;
    } else {
      this.findUserStore.clearUser();
      this.isUserSearchActive = false;
    }
  }

  onUserSearchActiveChange(isActive: boolean) {
    this.isUserSearchActive = isActive;
  }

  onUserSearchFocus() {
    this.isUserSearchActive = true;
    this.userSearchQuery = '';
    this.findUserStore.clearUser();
  }

  addUserToGroup(nickName: string, image: string) {
    if (!this.selectedUsers.find(user => user.nickName === nickName)) {
      this.selectedUsers.push({ nickName, image });
      this.updateFormDataUsers();
    }
    this.userSearchQuery = '';
    this.findUserStore.clearUser();
    this.isUserSearchActive = false;
  }

  removeUserFromGroup(nickName: string) {
    this.selectedUsers = this.selectedUsers.filter(user => user.nickName !== nickName);
    this.updateFormDataUsers();
  }

  private updateFormDataUsers() {
    this.formData.Users = this.selectedUsers.map(user => user.nickName);
  }

  get user$() {
    return this.findUserStore.user$;
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
    this.findUserStore.clearUser();
  }
  
  createGroup() {
    this.errors = validateCreateGroupForm(this.formData);
    if (this.errors.length > 0) return;

    const admin = this.authService.getNickName() || this.formData.Admin;
    const usersWithoutAdmin = this.selectedUsers
      .map(user => user.nickName)
      .filter(user => user !== admin);
    
    const totalUniqueUsers = usersWithoutAdmin.length + 1; 
    if (totalUniqueUsers < 3 || totalUniqueUsers > 40) {
      this.errors.push(`Group must have between 3 and 40 unique users. Current count: ${totalUniqueUsers} (including admin)`);
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
          console.error('Group creation error:', error);
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
        console.error('Failed to join group', err);
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
}