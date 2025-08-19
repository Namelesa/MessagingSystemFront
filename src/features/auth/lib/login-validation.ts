import { validateLogin, validateNickName, validatePassword } from '../../../shared/validators';

export class LoginFieldValidationHelper {
  private static readonly FIELD_VALIDATORS = {
    login: validateLogin,
    nickName: validateNickName,
    password: validatePassword,
  } as const;

  static validateField(
    fieldName: keyof typeof LoginFieldValidationHelper.FIELD_VALIDATORS,
    value: string
  ): string[] {
    const validator = this.FIELD_VALIDATORS[fieldName];
    if (!validator) return [];
    const error = validator(value);
    return error ? [error] : [];
  }

  static validateAllFields(formData: {
    login: string;
    nickName: string;
    password: string;
  }): { [key: string]: string[] } {
    return {
      login: this.validateField('login', formData.login),
      nickName: this.validateField('nickName', formData.nickName),
      password: this.validateField('password', formData.password),
    };
  }

  static hasErrors(fieldErrors: { [key: string]: string[] }): boolean {
    return Object.values(fieldErrors).some(errors => errors.length > 0);
  }

  static getAllErrors(fieldErrors: { [key: string]: string[] }): string[] {
    return Object.values(fieldErrors).flat();
  }
}