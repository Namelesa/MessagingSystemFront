import { validateGroupName, validateGroupDescription } from '../../../shared/validators';
import { GroupCreateRequest } from '../api/group-create';

export function validateCreateGroupForm(data: GroupCreateRequest): string[] {
    const errors: string[] = [
      validateGroupName(data.GroupName),
      validateGroupDescription(data.Description),
    ].filter(Boolean) as string[];
  
    return errors;
  }
  