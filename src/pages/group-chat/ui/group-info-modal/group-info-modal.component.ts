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
import { GroupInfoApiService } from '../../api/group-chat/group-info.api';
import { GroupInfoEditData } from '../../model/group-info-edit.model';
import { GroupInfoData } from '../../model/group-info.model';
import { validateEditGroupForm } from '../../model/validate-group';
import { SearchUser } from '../../../../entities/search-user';
import { AuthService } from '../../../../entities/session';
import { InputComponent, ToastComponent, ToastService } from '../../../../shared/ui-elements';
import { ModalHeaderComponent } from '../group-chat-page/group-chat-ui-elements/modal-header/modal.header';
import { AvatarComponent } from '../group-chat-page/group-chat-ui-elements/avatar/avatar';
import { UserListComponent } from '../group-chat-page/group-chat-ui-elements/user-list/user.list';
import { SelectedUsersComponent } from '../group-chat-page/group-chat-ui-elements/selected-users/selected.users';

@Component({
  selector: 'app-group-info-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, InputComponent, ToastComponent, ModalHeaderComponent, AvatarComponent, UserListComponent, SelectedUsersComponent],
  template: `
<div *ngIf="open"
     class="fixed inset-0 z-[99999] flex items-center justify-center"
     style="backdrop-filter: blur(8px); background: rgba(0,0,0,0.5);"
     (click)="onClose()">
  <div
    class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-96 max-w-md mx-4 relative z-[100000]"
    (click)="$event.stopPropagation()">
    
    <app-toast></app-toast>
    
    <app-modal-header
      [title]="getModalTitle()"
      [showEditButton]="!isEditing && !isMembersMode"
      [showSaveButton]="(isEditing && !isMembersMode) || isMembersMode"
      [showCancelButton]="isEditing || isMembersMode"
      [saveDisabled]="!canSave"
      (editClick)="toggleEdit()"
      (saveClick)="handleSave()"
      (cancelClick)="handleCancel()">
    </app-modal-header>

    <div *ngIf="errors.length > 0 && (isEditing || isMembersMode)" class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
      <div class="text-red-600 dark:text-red-400 text-sm font-medium mb-1">Validation Errors:</div>
      <ul class="text-red-600 dark:text-red-400 text-sm">
        <li *ngFor="let error of errors" class="flex items-start">
          <span class="mr-1">•</span>
          <span>{{ error }}</span>
        </li>
      </ul>
    </div>

    <div *ngIf="loading" class="text-center py-4 mt-16">Loading...</div>
    <div *ngIf="error && !loading" class="text-red-500 text-center py-4 mt-16">{{ error }}</div>

    <div *ngIf="groupInfo && !loading && !error" class="mt-4">
      <div class="flex justify-center mb-4">
        <div class="text-center">
          <app-avatar
            [src]="groupInfo.image"
            alt="Group Avatar"
            size="md"
            [editable]="isEditing && !isMembersMode"
            inputId="groupAvatarInput"
            (fileChange)="onAvatarChange($event)">
          </app-avatar>
          
          <div *ngIf="getImageErrors().length > 0" class="mt-2 text-red-500 dark:text-red-400 text-xs">
            <div *ngFor="let error of getImageErrors()">{{ error }}</div>
          </div>
        </div>
      </div>

      <div *ngIf="!isMembersMode">
        <div class="mb-2">
          <b>Group Name: </b>
          <ng-container *ngIf="!isEditing; else nameEdit">{{ groupInfo.groupName }}</ng-container>
          <ng-template #nameEdit>
            <app-input
              [(ngModel)]="editableGroup.GroupName"
              name="groupName"
              [errors]="getFieldErrors('groupName')"
              placeholder="Group Name"
              class="mt-1 w-full">
            </app-input>
          </ng-template>
        </div>

        <div class="mb-2">
          <b>Description: </b>
          <ng-container *ngIf="!isEditing; else descriptionEdit">{{ groupInfo.description }}</ng-container>
          <ng-template #descriptionEdit>
            <app-input
              [(ngModel)]="editableGroup.Description"
              name="description"
              [errors]="getFieldErrors('description')"
              placeholder="Group Description"
              class="mt-1 w-full">
            </app-input>
          </ng-template>
        </div>

        <div class="mb-2" *ngIf="!isEditing">
          <b>Admin: </b> {{ groupInfo.admin }}
        </div>
      </div>

      <div class="mb-2" *ngIf="!isEditing || isMembersMode">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center">
            <b>Members:</b>
            <span class="ml-2 text-sm text-gray-500 dark:text-gray-400">({{ memberCountStatus }})</span>
          </div>
          <button
            *ngIf="!isEditing && !isMembersMode && groupInfo.admin === currentUserNickname"
            (click)="enterMembersMode()"
            class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-600 transition text-sm">
            ➕
          </button>
        </div>

        <div *ngIf="isMembersMode" class="mb-3" (click)="$event.stopPropagation()">
          <input
            type="text"
            [(ngModel)]="userSearchQuery"
            (ngModelChange)="onSearchChange($event)"
            placeholder="Search users..."
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div class="mt-2">
            <div *ngIf="userSuggestions.length > 0"
                 class="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg max-h-40 overflow-y-auto shadow-lg">
              <div *ngFor="let user of userSuggestions"
                   (click)="addUserToSelection(user)"
                   class="px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center">
                <img [src]="user.image" alt="avatar" class="w-6 h-6 rounded-full mr-2" />
                <span class="text-gray-900 dark:text-white">{{ user.nickName }}</span>
              </div>
            </div>
            
            <div *ngIf="showNotFoundMessage" 
                 class="text-gray-500 dark:text-gray-400 text-sm text-center py-2">
              User not found ;(
            </div>
          </div>

          <app-selected-users
            [users]="selectedUsers"
            (removeUser)="removeUserFromSelection($event)">
          </app-selected-users>

          <div *ngIf="getMemberErrors().length > 0" class="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div *ngFor="let error of getMemberErrors()" class="text-red-600 dark:text-red-400 text-xs">
              {{ error }}
            </div>
          </div>
        </div>

        <app-user-list
          *ngIf="groupInfo && groupInfo.members"
          [users]="groupInfo.members"
          [adminNickname]="groupInfo.admin"
          [currentUserNickname]="currentUserNickname"
          [showRemoveButtons]="isMembersMode"
          [variant]="isMembersMode ? 'detailed' : 'simple'"
          (removeUser)="removeUserFromSelection($event)"
          (userClick)="onUserClick($event)">
        </app-user-list>
      </div>
    </div>
    
    <div *ngIf="isEditing && !isMembersMode && groupInfo?.admin === currentUserNickname" class="pt-2">
      <button
        type="button"
        (click)="deleteGroupInfo()"
        class="w-full py-3 text-sm font-semibold rounded-xl border border-red-600 text-red-600 
               hover:bg-red-600 hover:text-white transition-colors duration-300 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-500">
        🗑️ Delete Group
      </button>
    </div>
  </div>
</div>
  `,
})
export class GroupInfoModalComponent implements OnChanges, OnInit {
  @Input() groupId?: string;
  @Input() open = false;
  @Input() userSuggestions: SearchUser[] = [];
  @Output() userSearchQueryChange = new EventEmitter<string>();
  @Output() addMembersRequested = new EventEmitter<string[]>();
  @Output() removeMemberRequested = new EventEmitter<string>();
  @Output() deleteGroupRequested = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();
  @Output() groupUpdated = new EventEmitter<void>();
  @Output() openChatWithUser = new EventEmitter<{ nickName: string, image: string }>();

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
  selectedUsers: SearchUser[] = [];
  selectedUserIndex = -1;
  searchTimeout: any;

  private readonly MIN_MEMBERS = 3;
  private readonly MAX_MEMBERS = 40;
  private readonly MAX_IMAGE_SIZE = 5 * 1024 * 1024; 
  private readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  constructor(
    private groupInfoApi: GroupInfoApiService,
    private toastService: ToastService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.authService.waitForAuthInit().subscribe(() => {
      const nick = this.authService.getNickName();
      if (nick) {
        this.currentUserNickname = nick;
      }
    });

    this.groupInfoApi.groupInfo$.subscribe(groupInfo => {
      if (groupInfo && this.open) {
        this.groupInfo = groupInfo.data;
      }
    });
  }  

  ngOnChanges(changes: SimpleChanges): void {
    const openedJustNow = !!changes['open'] && changes['open'].currentValue && !changes['open'].previousValue;
    const groupChanged = !!changes['groupId'] && !changes['groupId'].firstChange && this.open;

    if ((openedJustNow || groupChanged) && this.groupId) {
      this.fetchGroupInfo();
    }

    if (!!changes['open'] && !changes['open'].currentValue) {
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

        this.groupInfoApi.forceRefresh();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load group info.';
        this.loading = false;
      },
    });
  }

  private updateGroupInfoFromUserChange(userInfo: { userName: string, image?: string, updatedAt: string, oldNickName: string }): void {
    if (!this.groupInfo) return;
  
    let hasChanges = false;
  
    if (this.groupInfo.admin === userInfo.oldNickName) {
      this.groupInfo.admin = userInfo.userName;
      hasChanges = true;
    }
  
    if (this.groupInfo.members) {
      this.groupInfo.members = this.groupInfo.members.map(member => {
        if (member.nickName === userInfo.oldNickName) {
          hasChanges = true;
          return {
            ...member,
            nickName: userInfo.userName,
            image: userInfo.image || member.image
          };
        }
        return member;
      });
    }
  
    if (hasChanges) {
      this.groupInfo = { ...this.groupInfo };
    }
  }  

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    this.isMembersMode = false; 
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

  private validateImage(file: File): string[] {
    const errors: string[] = [];
    
    if (!this.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      errors.push('Image must be in JPEG, PNG, GIF or WebP format');
    }
    
    if (file.size > this.MAX_IMAGE_SIZE) {
      errors.push('Image size must not exceed 5MB');
    }
    
    return errors;
  }

  private validateMemberCount(): string[] {
    const errors: string[] = [];
    const currentMemberCount = this.groupInfo?.members?.length || 0;
    const selectedCount = this.selectedUsers.length;
    
    if (this.isMembersMode) {
      const totalAfterAddition = currentMemberCount + selectedCount;
      
      if (totalAfterAddition > this.MAX_MEMBERS) {
        errors.push(`Total members cannot exceed ${this.MAX_MEMBERS}. Current: ${currentMemberCount}, adding: ${selectedCount}`);
      }
    } else {
      if (currentMemberCount < this.MIN_MEMBERS) {
        errors.push(`Group must have at least ${this.MIN_MEMBERS} members (including admin)`);
      }
      
      if (currentMemberCount > this.MAX_MEMBERS) {
        errors.push(`Group cannot have more than ${this.MAX_MEMBERS} members (including admin)`);
      }
    }
    
    return errors;
  }

  private validateForm(): string[] {
    let errors: string[] = [];
    
    const baseErrors = validateEditGroupForm(this.editableGroup);
    errors = [...errors, ...baseErrors];
    
    if (this.selectedAvatarFile) {
      const imageErrors = this.validateImage(this.selectedAvatarFile);
      errors = [...errors, ...imageErrors];
    }
    
    const memberErrors = this.validateMemberCount();
    errors = [...errors, ...memberErrors];
    
    return errors;
  }

  saveChanges(): void {
    this.editableGroup.ImageFile = this.selectedAvatarFile ?? undefined;
    this.errors = this.validateForm();
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
        
        this.groupInfoApi.forceRefresh();
        
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
    this.deleteGroupRequested.emit();
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
      
      const imageErrors = this.validateImage(file);
      if (imageErrors.length > 0) {
        this.toastService.show(imageErrors.join(', '), 'error');
        input.value = ''; 
        return;
      }
      
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

  getImageErrors(): string[] {
    return this.errors.filter((e) =>
      e.toLowerCase().includes('image') || 
      e.toLowerCase().includes('format') ||
      e.toLowerCase().includes('size')
    );
  }

  getMemberErrors(): string[] {
    return this.errors.filter((e) =>
      e.toLowerCase().includes('member') || 
      e.toLowerCase().includes('exceed') ||
      e.toLowerCase().includes('at least')
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
    this.selectedUsers = [];
    this.userSearchQuery = '';
    this.showNotFoundMessage = false;
    this.errors = [];
  }
  
  exitMembersMode(): void {
    this.isMembersMode = false;
    this.isAddingMember = false;
    this.selectedUsers = [];
    this.userSearchQuery = '';
    this.userSuggestions = [];
    this.isSearchActive = false;
    this.errors = [];
  }

  public onMembersAddedSuccess(): void {
    this.selectedUsers = [];
    this.userSearchQuery = '';
    this.userSuggestions = [];
    this.selectedUserIndex = -1;
    this.showNotFoundMessage = false;
  }

  onSearchChange(input: string): void {
    this.userSearchQuery = input;
    clearTimeout(this.searchTimeout);
  
    const nicknames = input.split(',').map(n => n.trim()).filter(n => !!n);
  
    if (nicknames.length === 0) {
      this.userSuggestions = [];
      this.showNotFoundMessage = false;
      return;
    }
  
    const lastNickname = nicknames[nicknames.length - 1];
  
    this.searchTimeout = setTimeout(() => {
      this.userSearchQueryChange.emit(lastNickname);
    }, 300);
  }

  addUserToSelection(user: SearchUser): void {
    if (!this.selectedUsers.find(u => u.nickName === user.nickName)) {
      const currentMemberCount = this.groupInfo?.members?.length || 0;
      const totalAfterAddition = currentMemberCount + this.selectedUsers.length + 1;
      
      if (totalAfterAddition > this.MAX_MEMBERS) {
        this.toastService.show(`Cannot add user. Maximum ${this.MAX_MEMBERS} members allowed.`, 'error');
        return;
      }
      
      this.selectedUsers.push(user);
      this.userSearchQuery = '';
      this.userSuggestions = [];
      this.selectedUserIndex = -1;
      this.errors = [];
    }
  }
  
  async removeUserFromSelection(nickName: string): Promise<void> {
    if (this.selectedUsers.some(u => u.nickName === nickName)) {
      this.selectedUsers = this.selectedUsers.filter(u => u.nickName !== nickName);
      return;
    }

    const currentMemberCount = this.groupInfo?.members?.length || 0;
    if (currentMemberCount - 1 < this.MIN_MEMBERS) {
      this.toastService.show(`Cannot remove member. Minimum ${this.MIN_MEMBERS} members required.`, 'error');
      return;
    }

    this.removeMemberRequested.emit(nickName);
  }

  async confirmAddMembers(): Promise<void> {
    const nicknames = this.selectedUsers.map(u => u.nickName);

    if (nicknames.length === 0) {
      this.toastService.show('No users selected to add.', 'error');
      return;
    }

    this.errors = this.validateMemberCount();
    if (this.errors.length > 0) {
      return;
    }

    this.addMembersRequested.emit(nicknames);
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

  onUserClick(user: { nickName: string, image: string }): void {
    this.close.emit();
    this.openChatWithUser.emit(user);
  }

  get canSave(): boolean {
    if (this.isMembersMode) {
      return this.selectedUsers.length > 0 && this.getMemberErrors().length === 0;
    }
    return this.errors.length === 0;
  }

  get memberCountStatus(): string {
    const currentCount = this.groupInfo?.members?.length || 0;
    return `${currentCount}/${this.MAX_MEMBERS}`;
  }
}

