import { Component, Input } from '@angular/core';
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

@Component({
  selector: 'app-group-chat-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatListItemComponent, SearchInputComponent, InputComponent, ToastComponent],
  templateUrl: './group-chat.list.component.html',
})
export class GroupChatListComponent extends BaseChatListComponent<GroupChat> {
  protected apiService: GroupChatApiService;

  constructor(private groupChatApi: GroupChatApiService, private toastService: ToastService, private authService: AuthService) {
    super();
    this.apiService = this.groupChatApi;
  }

  public image: string | null = null;
  selectedImageUrl: string | null = null;
  @Input() searchPlaceholder = 'Search...';
  @Input() emptyListText = 'Chats not found ;(';

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
    this.errors = [];
  }
  
  createGroup() {
    this.errors = validateCreateGroupForm(this.formData);
    if (this.errors.length > 0) return;

    let usersArray: string[] = [];
    
    if (Array.isArray(this.formData.Users)) {
      usersArray = this.formData.Users;
    } else if (typeof this.formData.Users === 'string') {
      usersArray = (this.formData.Users as string).split(',')
        .map((u: string) => u.trim())
        .filter((u: string) => u.length > 0);
    } else {
      usersArray = [];
    }

    let cleanUsers = usersArray
      .map((u: string) => u.trim())
      .filter((u: string) => u.length > 0);
    
    cleanUsers = Array.from(new Set(cleanUsers));
    
    const admin = this.authService.getNickName() || this.formData.Admin;
    const usersWithoutAdmin = cleanUsers.filter(user => user !== admin);
    
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
          setTimeout(() => {
            this.apiService.connect();
          }, 1000);
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
        console.error('Failed to join group', err);
        this.onSelectChat(nickname, image ?? '', groupId); 
      });
    } else {
      this.onSelectChat(nickname, image ?? '', groupId);
    }
  }
  
}