import { validatePassword, validateNickName, validateLogin } 
from '../../../shared/validators';
import { LoginContract } from '../../../entities';

export function validateLoginForm(data: LoginContract): string[] {
    const errors: string[] = [
      validateLogin(data.login),
      validateNickName(data.nickName),
      validatePassword(data.password),
    ].filter(Boolean) as string[];
  
    return errors;
  }
  