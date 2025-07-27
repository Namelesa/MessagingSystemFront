import { validateGroupName, validateGroupDescription } from '../../../shared/validators';
import { GroupInfoEditData } from './group-info-edit.model';

export function validateCreateGroupForm(data: GroupInfoEditData): string[] {
    const errors: string[] = [
      validateGroupName(data.GroupName),
      validateGroupDescription(data.Description),
    ].filter(Boolean) as string[];
  
    return errors;
  }
  