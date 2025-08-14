import { validateGroupName, validateGroupDescription } from '../../../shared/validators';
import { GroupCreateRequest } from '../api/group-chat/group-create';
import { GroupInfoEditData } from './group-info-edit.model';

export function validateCreateGroupForm(data: GroupCreateRequest): string[] {
    const errors: string[] = [
      validateGroupName(data.GroupName),
      validateGroupDescription(data.Description),
    ].filter(Boolean) as string[];
    
    return errors;
  }
  
export function validateEditGroupForm(data: GroupInfoEditData): string[] {
  const errors: string[] = [
    validateGroupName(data.GroupName),
    validateGroupDescription(data.Description),
  ].filter(Boolean) as string[];
  return errors;
}

export function validateImageFile(file: File | null | undefined): string[] {
  if (!file) return [];
  const errors: string[] = [];
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024;
  if (!allowed.includes(file.type)) errors.push('Image must be in JPEG, PNG, GIF or WebP format');
  if (file.size > maxSize) errors.push('Image size must not exceed 5MB');
  return errors;
}

export function validateMembersCount(currentMembers: number, addingMembers: number, options: { min: number; max: number; mode: 'create' | 'add' }): string[] {
  const { min, max, mode } = options;
  const errors: string[] = [];
  if (mode === 'add') {
    const total = currentMembers + addingMembers;
    if (total > max) errors.push(`Total members cannot exceed ${max}. Current: ${currentMembers}, adding: ${addingMembers}`);
  } else {
    const total = currentMembers;
    if (total < min) errors.push(`Group must have at least ${min} members (including admin)`);
    if (total > max) errors.push(`Group cannot have more than ${max} members (including admin)`);
  }
  return errors;
}
  

