import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroupInfoApiService } from '../api/group-info.api';
import { GroupInfoData } from '../model/group-info.model';
import { GroupInfoEditData } from '../model/group-info-edit.model';
import { validateCreateGroupForm } from '../model/validate-group';
import { InputComponent, ToastComponent, ToastService } from '../../../shared/ui-elements';
import { GroupChatApiService } from '../../group-chats';
import { AuthService } from '../../../entities/user/api/auht.service';
import { SearchUser } from '../../../entities/search-user';
import { FindUserStore } from '../../../features/search-user/model/search-user-store';
import { ModalHeaderComponent, AvatarComponent, UserListComponent, SelectedUsersComponent } from '../../../shared/group-chat-ui-elements';

@Component({
  selector: 'app-group-info-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, InputComponent, ToastComponent, ModalHeaderComponent, AvatarComponent, UserListComponent, SelectedUsersComponent],
  templateUrl: './group-info-modal.component.html',
})
export class GroupInfoModalComponent implements OnChanges, OnInit {
  @Input() groupId?: string;
  @Input() open = false;
  @Output() close = new EventEmitter<void>();
  @Output() groupUpdated = new EventEmitter<void>();

  groupInfo!: GroupInfoData;
  loading = false;
  error: string | null = null;
  hasError = false;
  isEditing = false;

  editableGroup: GroupInfoEditData = {
    GroupName: '',
    Description: '',
    ImageFile: undefined,
  };
  selectedAvatarFile: File | null = null;
  errors: string[] = [];

  currentUserNickname = '';

  isAddingModeOnly = false;
  isMembersMode = false;
  isSearchActive = false;
  showNotFoundMessage = false;

  isAddingMember = false;
  userSearchQuery = '';
  userSuggestions: SearchUser[] = [];
  selectedUsers: SearchUser[] = [];
  selectedUserIndex = -1;
  searchTimeout: any;

  constructor(
    private groupInfoApi: GroupInfoApiService,
    private toastService: ToastService,
    private apiService: GroupChatApiService,
    private authService: AuthService,
    private findUserStore: FindUserStore
  ) {}

  ngOnInit(): void {
    this.authService.waitForAuthInit().subscribe(() => {
      const nick = this.authService.getNickName();
      if (nick) {
        this.currentUserNickname = nick;
      }
    });

    this.findUserStore.user$.subscribe(user => {
      if (user && !this.selectedUsers.some(u => u.nickName === user.nickName)) {
        this.userSuggestions = [user];
      } else {
        this.userSuggestions = [];
      }
    });    
  }  

  ngOnChanges(changes: SimpleChanges): void {
    if (this.open && this.groupId) {
      this.fetchGroupInfo();
    }
    
    if (!this.open) {
      this.isEditing = false;
      this.isMembersMode = false;
      this.selectedUsers = [];
      this.userSearchQuery = '';
      this.userSuggestions = [];
    }
  }

  fetchGroupInfo() {
    this.loading = true;
    this.error = null;
    this.groupInfoApi.getGroupInfo(this.groupId!).subscribe({
      next: (res) => {
        this.groupInfo = res.data;
        this.isEditing = false;
        this.isMembersMode = false;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load group info.';
        this.loading = false;
      },
    });
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    this.isMembersMode = false; // Выходим из режима управления участниками при редактировании
    
    if (this.isEditing && this.groupInfo) {
      this.editableGroup = {
        GroupName: this.groupInfo.groupName,
        Description: this.groupInfo.description,
        ImageFile: undefined,
      };
      this.selectedAvatarFile = null;
      this.errors = [];
    }
  }

  toggleAddingMode(): void {
    this.isAddingModeOnly = !this.isAddingModeOnly;
    this.isAddingMember = this.isAddingModeOnly;
  }  

  saveChanges(): void {
    this.editableGroup.ImageFile = this.selectedAvatarFile ?? undefined;
    this.errors = validateCreateGroupForm(this.editableGroup);
    if (this.errors.length > 0) return;

    this.updateGroupInfo(this.editableGroup);
  }

  updateGroupInfo(updatedData: GroupInfoEditData) {
    if (!this.groupId) return;

    this.loading = true;
    this.error = null;

    this.groupInfoApi.updateGroupInfo(this.groupId, updatedData).subscribe({
      next: (res) => {
        this.toastService.show('Group updated successfully', 'success');
        this.close.emit();
        this.groupUpdated.emit();
        this.isEditing = false;
        this.loading = false;
      },
      error: (err) => {
        this.toastService.show(err?.error?.message || 'Failed to update group info.', 'error');
        this.loading = false;
      },
    });
  }

  deleteGroupInfo() {
    if (this.groupInfo?.admin !== this.currentUserNickname) {
      this.toastService.show('Only the group admin can delete the group.', 'error');
      return;
    }
  
    this.loading = true;

    this.apiService.deleteGroup(this.groupInfo.groupId).then(res => {
      this.toastService.show('Group deleted successfully', 'success');
      this.groupUpdated.emit();
      this.close.emit();
      this.loading = false;
    }).catch(err => {
      this.toastService.show(err?.message || 'Failed to delete group.', 'error');
      this.loading = false;
    });
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.selectedAvatarFile = null;
    this.errors = [];
    if (this.groupInfo) {
      this.editableGroup = {
        GroupName: this.groupInfo.groupName,
        Description: this.groupInfo.description,
        ImageFile: undefined,
      };
    }
  }

  onAvatarChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedAvatarFile = file;

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string' && this.groupInfo) {
          this.groupInfo.image = reader.result;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  getFieldErrors(fieldName: string): string[] {
    const fieldMapping: { [key: string]: string } = {
      groupName: 'group name',
      description: 'description',
    };

    const fieldNameLower = fieldMapping[fieldName];
    if (!fieldNameLower) return [];

    return this.errors.filter((e) =>
      e.toLowerCase().includes(fieldNameLower)
    );
  }

  onClose() {
    this.isEditing = false;
    this.isMembersMode = false;
    this.selectedUsers = [];
    this.userSearchQuery = '';
    this.userSuggestions = [];
    this.close.emit();
  }

  enterMembersMode(): void {
    this.isMembersMode = true;
    this.isEditing = false; 
    this.isAddingMember = true;
    this.selectedUsers = []; // Сбрасываем выбранных пользователей
    this.userSearchQuery = '';
  }
  
  exitMembersMode(): void {
    this.isMembersMode = false;
    this.isAddingMember = false;
    this.selectedUsers = [];
    this.userSearchQuery = '';
    this.userSuggestions = [];
    this.isSearchActive = false;
  }

  onSearchChange(input: string): void {
    this.userSearchQuery = input;
    clearTimeout(this.searchTimeout);
  
    const nicknames = input.split(',').map(n => n.trim()).filter(n => !!n);
  
    if (nicknames.length === 0) {
      this.userSuggestions = [];
      return;
    }
  
    const lastNickname = nicknames[nicknames.length - 1];
  
    this.searchTimeout = setTimeout(() => {
      this.findUserStore.findUser(lastNickname);
    }, 300);
  }

  addUserToSelection(user: SearchUser): void {
    if (!this.selectedUsers.find(u => u.nickName === user.nickName)) {
      this.selectedUsers.push(user);
      this.userSearchQuery = '';
      this.userSuggestions = [];
      this.selectedUserIndex = -1;
    }
  }
  

  async removeUserFromSelection(nickName: string): Promise<void> {
  if (this.selectedUsers.some(u => u.nickName === nickName)) {
    this.selectedUsers = this.selectedUsers.filter(u => u.nickName !== nickName);
    return;
  }

  try {
    await this.apiService.removeGroupMembers(this.groupId!, { users: [nickName] });
    
    this.toastService.show(`Successfully removed member from the group.`, 'success');
    
    this.groupUpdated.emit();
    this.onClose();
    
  } catch (error) {
    console.error('Failed to remove member:', error);
    this.toastService.show('Failed to remove member from group. Please check your connection or try again later.', 'error');
  }
}

  async confirmAddMembers(): Promise<void> {
  const nicknames = this.selectedUsers.map(u => u.nickName);

  if (nicknames.length === 0) {
    this.toastService.show('No users selected to add.', 'error');
    return;
  }

  try {
    await this.apiService.addGroupMembers(this.groupId!, { users: nicknames });
    
    this.toastService.show(`Successfully added ${nicknames.length} member(s) to the group.`, 'success');
    
    this.groupUpdated.emit();
    this.onClose();

  } catch (error) {
    console.error('Failed to add members:', error);
    this.toastService.show('Failed to add members to group. Please check your connection or try again later.', 'error');
  }
  }

  handleSave(): void {
  if (this.isMembersMode) {
    this.confirmAddMembers().then(() => {
    });
  } else {
    this.saveChanges();
  }
  } 
  
  getModalTitle(): string {
    return this.isMembersMode ? 'Manage Members' : 'Group Info';
  }
  
  handleCancel(): void {
    if (this.isMembersMode) {
      this.exitMembersMode();
    } else {
      this.cancelEdit();
    }
  }
}