import {
  validateEmail,
  validatePassword,
  validateFirstName,
  validateLastName,
  validateNickName,
  validateLogin,
} from '../../../shared/validators';

export class RegisterFieldValidationHelper {
  private static readonly FIELD_VALIDATORS = {
    firstName: validateFirstName,
    lastName: validateLastName,
    login: validateLogin,
    email: validateEmail,
    nickName: validateNickName,
    password: validatePassword,
  } as const;

  static validateField(
    fieldName: keyof typeof RegisterFieldValidationHelper.FIELD_VALIDATORS,
    value: string
  ): string[] {
    const validator = this.FIELD_VALIDATORS[fieldName];
    if (!validator) return [];
    const error = validator(value);
    return error ? [error] : [];
  }

  static validateImage(file: File | undefined): string[] {
    if (!file) return ['* Image is required'];
    if (!(file instanceof File)) return ['* Image must be a valid file'];

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      return ['* Image must be a valid image file (jpeg, png, gif, webp, svg)'];
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return ['* Image size must be less than 5MB'];
    }
    return [];
  }

  static validateAllFields(formData: {
    firstName: string;
    lastName: string;
    login: string;
    email: string;
    nickName: string;
    password: string;
    image: File | undefined;
  }): { [key: string]: string[] } {
    return {
      firstName: this.validateField('firstName', formData.firstName),
      lastName: this.validateField('lastName', formData.lastName),
      login: this.validateField('login', formData.login),
      email: this.validateField('email', formData.email),
      nickName: this.validateField('nickName', formData.nickName),
      password: this.validateField('password', formData.password),
      image: this.validateImage(formData.image),
    };
  }

  static hasErrors(fieldErrors: { [key: string]: string[] }): boolean {
    return Object.values(fieldErrors).some(errors => errors.length > 0);
  }

  static getAllErrors(fieldErrors: { [key: string]: string[] }): string[] {
    return Object.values(fieldErrors).flat();
  }
}
