import { validateEmail, validateFirstName, validateLastName, validateNickName, validateLogin } from '../../../shared/validators';
import { EditUserContract } from '../../../entities/user';

const FIELD_VALIDATORS: Record<keyof EditUserContract, {
  label: string;
  validator: (value: any) => string | null;
}> = {
  firstName: { label: 'First name', validator: validateFirstName },
  lastName: { label: 'Last name', validator: validateLastName },
  login: { label: 'Login', validator: validateLogin },
  email: { label: 'Email', validator: validateEmail },
  nickName: { label: 'NickName', validator: validateNickName },
  imageFile: { 
    label: 'Image', 
    validator: (file: File | undefined) => {
      if (!file) return null;
      
      if (!(file instanceof File)) {
        return 'must be a valid file';
      }
      
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        return 'must be a valid image file (jpeg, png, gif, webp, svg)';
      }
      
      const maxSizeInBytes = 5 * 1024 * 1024; 
      if (file.size > maxSizeInBytes) {
        return 'must be smaller than 5MB';
      }
      
      return null;
    }
  }
};

export function validateSingleField(fieldName: keyof EditUserContract, value: any): string[] {
  const fieldConfig = FIELD_VALIDATORS[fieldName];
  
  if (!fieldConfig) {
    console.warn(`No validator found for field: ${fieldName}`);
    return [];
  }
  
  const error = fieldConfig.validator(value);
  
  if (error) {
    return [`${fieldConfig.label}: ${error}`];
  }
  
  return [];
}

export function validateUpdateForm(data: EditUserContract): string[] {
  const errors: string[] = [];
  
  (Object.keys(FIELD_VALIDATORS) as Array<keyof EditUserContract>).forEach(fieldName => {
    const fieldErrors = validateSingleField(fieldName, data[fieldName]);
    errors.push(...fieldErrors);
  });
  
  return errors;
}

export function isFormValid(data: EditUserContract): boolean {
  return validateUpdateForm(data).length === 0;
}

export function getRequiredFields(): Array<keyof EditUserContract> {
  return ['firstName', 'lastName', 'login', 'email', 'nickName'];
}

export function checkRequiredFields(data: EditUserContract): {
  isComplete: boolean;
  missingFields: Array<keyof EditUserContract>;
} {
  const requiredFields = getRequiredFields();
  const missingFields = requiredFields.filter(field => {
    const value = data[field];
    return !value || (typeof value === 'string' && value.trim() === '');
  });
  
  return {
    isComplete: missingFields.length === 0,
    missingFields
  };
}