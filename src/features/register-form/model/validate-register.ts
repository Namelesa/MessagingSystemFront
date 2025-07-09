import { validateEmail, validatePassword, validateFirstName, validateLastName, validateNickName, validateLogin } 
from '../../../shared/validators';
import { RegisterContract } from '../../../entities/user/api/register-contract';

export function validateRegisterForm(data: RegisterContract): string[] {
    const errors: string[] = [
      validateFirstName(data.firstName),
      validateLastName(data.lastName),
      validateLogin(data.login),
      validateEmail(data.email),
      validateNickName(data.nickName),
      validatePassword(data.password),
    ].filter(Boolean) as string[];
  
    if (data.image && (!(data.image instanceof File) || !['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    .includes(data.image.type))) {
      errors.push('Image must be a valid image file (jpeg, png, gif, webp, svg).');
    }
  
    return errors;
  }
  