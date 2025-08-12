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
  

