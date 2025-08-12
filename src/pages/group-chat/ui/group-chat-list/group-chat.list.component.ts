import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { Observable, map, combineLatest } from 'rxjs';
import { GroupChatApiService } from '../../api/group-chat/group-chat-hub.api';
import { GroupCreateRequest } from '../../api/group-chat/group-create';
import { validateCreateGroupForm } from '../../model/validate-group';
import { SearchUser } from '../../../../entities/search-user';
import { AuthService } from '../../../../entities/session';
import { GroupChat } from '../../model/group.chat';
import { InputComponent, ToastService, ToastComponent } from '../../../../shared/ui-elements';
import { SearchInputComponent } from '../../../../shared/search';
import { BaseChatListComponent } from '../../../../shared/chat';
import { ListItemComponent } from '../../../../shared/list';

@Component({
  selector: 'app-group-chat-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ListItemComponent, SearchInputComponent, InputComponent, ToastComponent],
  template: `<aside class="w-64 h-full bg-gray-100 text-black flex flex-col dark:bg-gray-900 dark:text-gray-200">
    <div class="p-4 border border-white dark:border-transparent flex items-center justify-between">
      <shared-search-input
        [query]="search"
        (queryChange)="onSearchQueryChange($event)"
        (clear)="clearSearching()"
        [placeholder]="searchPlaceholder"
        (focus)="onSearchFocus()"
      ></shared-search-input>
      <button 
        class="w-10 h-10 bg-transparent border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-blue-500 hover:text-blue-500 transition-all duration-200 flex-shrink-0 ml-2" 
        (click)="openCreateGroupModal()"
        title="Create Group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  
    <div *ngIf="showCreateGroupModal" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50" (click)="closeCreateGroupModal()">
      <app-toast></app-toast>
      <div class="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl w-96 max-w-md mx-4 transform transition-all duration-300 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
        <h2 class="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">Create Group</h2>
        
        <form (ngSubmit)="createGroup()" class="space-y-6">
          <div class="flex flex-col items-center mb-6">
            <div class="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center mb-4 overflow-hidden border-4 border-white dark:border-gray-700 shadow-lg">
              <img *ngIf="selectedImageUrl" [src]="selectedImageUrl" alt="Group Avatar" class="w-full h-full object-cover">
              <svg *ngIf="!selectedImageUrl" class="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
              
              <label
                *ngIf="selectedImageUrl"
                for="fileInput"
                class="absolute inset-0 bg-black bg-opacity-40 dark:bg-opacity-60 rounded-full flex flex-col items-center justify-center
                       text-white opacity-0 hover:opacity-100 cursor-pointer transition-opacity duration-300"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6 mb-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M3 7h4l3-3h4l3 3h4v12H3V7z"
                  />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16 13a4 4 0 01-8 0" />
                </svg>
                <span class="text-xs select-none">Change</span>
              </label>
            </div>
          </div>
    
          <app-input
            [(ngModel)]="formData.GroupName"
            name="groupName"
            placeholder="Group Name"
            [required]="true"
            [errors]="getFieldErrors('groupName')"
            class="mb-4"
          ></app-input>
    
          <app-input
            [(ngModel)]="formData.Description"
            name="groupDescription"
            placeholder="Group Description"
            [required]="true"
            [errors]="getFieldErrors('groupDescription')"
            class="mb-4"
          ></app-input>

          <div class="mb-2">
            <div class="relative border border-gray-300 rounded-lg dark: border-gray-700">
              <shared-search-input
                [query]="userSearchQuery"
                (queryChange)="onUserSearchQueryChange($event)"
                (clear)="onUserClear()"
                [placeholder]="'Search users...'"
                (focus)="onUserSearchFocus()"
              ></shared-search-input>

              <div *ngIf="userSearchQuery.trim() && isUserSearchActive" class="absolute top-full left-0 right-0 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10 mt-1 max-h-40 overflow-y-auto">
                <ng-container *ngIf="user$ | async as user; else noUserFound">
                  <div
                    class="p-3 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition flex items-center gap-3"
                    (click)="addUserToGroup(user.nickName, user.image)"
                  >
                    <img
                      [src]="user.image"
                      alt="Avatar"
                      class="w-8 h-8 rounded-full object-cover"
                    />
                    <span class="font-medium text-gray-800 dark:text-gray-200">{{ user.nickName }}</span>
                  </div>
                </ng-container>
                <ng-template #noUserFound>
                  <div class="p-3 text-center text-gray-500 dark:text-gray-400">
                    User not found
                  </div>
                </ng-template>
              </div>
            </div>

            <div *ngIf="selectedUsers.length > 0" class="mt-3">
              <div class="flex flex-wrap gap-2">
                <div
                  *ngFor="let user of selectedUsers"
                  class="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm"
                >
                  <img
                    [src]="user.image"
                    alt="Avatar"
                    class="w-5 h-5 rounded-full object-cover"
                  />
                  <span>{{ user.nickName }}</span>
                  <button
                    type="button"
                    (click)="removeUserFromGroup(user.nickName)"
                    class="ml-1 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 focus:outline-none"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div *ngIf="getFieldErrors('groupMembers').length > 0" class="mt-2">
              <div *ngFor="let error of getFieldErrors('groupMembers')" class="text-red-500 text-sm">
                {{ error }}
              </div>
            </div>
          </div>
    
          <input
            #fileInput
            id="fileInput"
            (change)="onFileChange($event)"
            type="file"
            accept="image/*"
            name="image"
            class="hidden"
          />
          
          <button
            *ngIf="!selectedImageUrl"
            type="button"
            (click)="fileInput.click()"
            class="w-full px-6 py-4 rounded-2xl text-center mb-6
                   bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600
                   text-gray-700 dark:text-gray-300
                   border-2 border-dashed border-gray-300 dark:border-gray-600
                   hover:border-blue-400 dark:hover:border-blue-500
                   hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-gray-600 dark:hover:to-gray-500
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                   transition-all duration-300 transform hover:scale-[1.02]
                   font-medium"
          >
            <svg class="w-5 h-5 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            Upload Group Avatar
          </button>
      
          <button 
            type="submit" 
            class="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-4 rounded-2xl 
                   hover:from-blue-600 hover:to-indigo-700 
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                   transform transition-all duration-300 hover:scale-[1.02] 
                   shadow-lg hover:shadow-xl
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            Create Group
          </button>
        </form>
      </div>
    </div>

    <ng-container *ngIf="loading$ | async; else notLoading">
      <div class="flex-grow flex items-center justify-center text-gray-500">
        Loading...
      </div>
    </ng-container>

    <ng-template #notLoading>
      <ng-container *ngIf="error$ | async as error; else showChats">
        <div class="flex-grow flex items-center justify-center text-red-500 px-4">
          Error: {{ error }}
        </div>
      </ng-container>
    </ng-template>

    <ng-template #showChats>
      <ul class="flex-grow overflow-y-auto border border-white dark:border-transparent">
        <ng-container *ngIf="!isSearchActive || !search.trim()">
          <li *ngIf="(chats$ | async)?.length === 0" class="p-4 text-center text-black dark:text-gray-500">
            {{ emptyListText }}
          </li>

          <shared-list-item
            *ngFor="let chat of chats$ | async"
            [name]="getChatName(chat)"
            [image]="chat.image"
            [active]="selectedNickname === getChatName(chat)"
            (click)="onSelectGroupChat(getChatName(chat), chat.image, chat.groupId || '')"
          ></shared-list-item>
        </ng-container>

        <ng-container *ngIf="isSearchActive && search.trim()">
          <ng-container *ngIf="(filteredChats$ | async)?.length as resultCount">
            <li *ngIf="resultCount === 0" class="p-4 text-center text-gray-500 dark:text-gray-400">
              <div class="flex flex-col items-center gap-2">
                <svg class="w-8 h-8 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.664-2.447M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                <div>No groups found for "{{ search }}"</div>
                <button 
                  (click)="clearSearching()" 
                  class="text-blue-500 hover:text-blue-700 text-sm underline"
                >
                  Clear search
                </button>
              </div>
            </li>

            <shared-list-item
              *ngFor="let chat of filteredChats$ | async"
              [name]="getChatName(chat)"
              [image]="chat.image"
              [active]="selectedNickname === getChatName(chat)"
              (click)="selectGroupFromSearch(chat)"
            ></shared-list-item>
          </ng-container>
        </ng-container>
      </ul>
    </ng-template>
  </aside>`,
})
export class GroupChatListComponent extends BaseChatListComponent<GroupChat> implements OnInit {
  protected apiService: GroupChatApiService;
  @Input() user$: Observable<SearchUser | null> | null = null;
  @Output() userSearchQueryChange = new EventEmitter<string>();
  @Output() userSearchClear = new EventEmitter<void>();
  @Output() userSearchFocus = new EventEmitter<void>();

  constructor(
    private groupChatApi: GroupChatApiService, 
    private toastService: ToastService, 
    private authService: AuthService,
  ) {
    super();
    this.apiService = this.groupChatApi;
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
    this.isUserSearchActive = !!trimmed;
    this.userSearchQueryChange.emit(query);
  }

  onUserSearchActiveChange(isActive: boolean) {
    this.isUserSearchActive = isActive;
  }

  onUserSearchFocus() {
    this.isUserSearchActive = true;
    this.userSearchQuery = '';
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
}

