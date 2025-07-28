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

@Component({
  selector: 'app-group-info-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, InputComponent, ToastComponent],
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

  constructor(
    private groupInfoApi: GroupInfoApiService,
    private toastService: ToastService,
    private apiService: GroupChatApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.waitForAuthInit().subscribe(() => {
      const nick = this.authService.getNickName();
      if (nick) {
        this.currentUserNickname = nick;
      }
    });
  }  

  ngOnChanges(changes: SimpleChanges): void {
    if (this.open && this.groupId) {
      this.fetchGroupInfo();
    }
  }

  fetchGroupInfo() {
    this.loading = true;
    this.error = null;
    this.groupInfoApi.getGroupInfo(this.groupId!).subscribe({
      next: (res) => {
        this.groupInfo = res.data;
        this.isEditing = false;
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
    this.close.emit();
  }
}
