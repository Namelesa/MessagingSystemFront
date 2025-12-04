import { validateSingleField, validateUpdateForm, isFormValid, getRequiredFields, checkRequiredFields } from './validate-update';
import { EditUserContract } from '../../../entities/user';

describe('User Form Validation', () => {

  const validData: EditUserContract = {
    firstName: 'John',
    lastName: 'Doe',
    login: 'johndoe',
    email: 'john@example.com',
    nickName: 'Johnny',
    imageFile: undefined
  };

  describe('validateSingleField', () => {
    it('should return no errors for valid firstName', () => {
      expect(validateSingleField('firstName', 'John')).toEqual([]);
    });

    it('should return error for invalid email', () => {
      const errors = validateSingleField('email', 'not-an-email');
      expect(errors.length).toBe(1);
      expect(errors[0]).toContain('Email');
    });

    it('should validate imageFile correctly', () => {
      const file = new File(['dummy content'], 'photo.bmp', { type: 'image/bmp' });
      const errors = validateSingleField('imageFile', file);
      expect(errors.length).toBe(1);
      expect(errors[0]).toContain('must be a valid image file');
    });

    it('should accept valid imageFile', () => {
      const file = new File(['dummy content'], 'photo.png', { type: 'image/png' });
      expect(validateSingleField('imageFile', file)).toEqual([]);
    });
  });

  describe('validateUpdateForm', () => {
    it('should return errors if some fields are invalid', () => {
      const data = { ...validData, email: 'invalid-email', firstName: '' };
      const errors = validateUpdateForm(data);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('Email'))).toBeTrue();
      expect(errors.some(e => e.includes('First name'))).toBeTrue();
    });
  });

  describe('validateSingleField', () => {
    it('should return no errors for valid firstName', () => {
      expect(validateSingleField('firstName', 'John')).toEqual([]);
    });
  
    it('should return error for invalid email', () => {
      const errors = validateSingleField('email', 'not-an-email');
      expect(errors.length).toBe(1);
      expect(errors[0]).toContain('Email');
    });
  
    it('should return empty array for unknown field', () => {
      const errors = validateSingleField('unknownField' as any, 'some value');
      expect(errors).toEqual([]);
    });
  
    it('should validate imageFile correctly', () => {
      const file = new File(['dummy content'], 'photo.bmp', { type: 'image/bmp' });
      const errors = validateSingleField('imageFile', file);
      expect(errors.length).toBe(1);
      expect(errors[0]).toContain('must be a valid image file');
    });
  
    it('should accept valid imageFile', () => {
      const file = new File(['dummy content'], 'photo.png', { type: 'image/png' });
      expect(validateSingleField('imageFile', file)).toEqual([]);
    });
  });

  describe('isFormValid', () => {
    it('should return false if data is invalid', () => {
      const data = { ...validData, login: '' };
      expect(isFormValid(data)).toBeFalse();
    });
  });

  describe('getRequiredFields', () => {
    it('should return all required field keys', () => {
      expect(getRequiredFields()).toEqual(['firstName', 'lastName', 'login', 'email', 'nickName']);
    });
  });

  describe('checkRequiredFields', () => {
    it('should return isComplete true for full data', () => {
      const result = checkRequiredFields(validData);
      expect(result.isComplete).toBeTrue();
      expect(result.missingFields).toEqual([]);
    });

    it('should detect missing required fields', () => {
      const data = { ...validData, firstName: '', email: '' };
      const result = checkRequiredFields(data);
      expect(result.isComplete).toBeFalse();
      expect(result.missingFields).toEqual(['firstName', 'email']);
    });
  });

  describe('validateSingleField - imageFile edge cases', () => {

    it('should return error if value is not a File instance', () => {
      const notAFile = { name: 'fake.png', type: 'image/png', size: 1024 };
      const errors = validateSingleField('imageFile', notAFile as any);
      expect(errors.length).toBe(1);
      expect(errors[0]).toContain('must be a valid file');
    });
  
    it('should return error if file size exceeds 5MB', () => {
      const bigFile = new File(['a'.repeat(6 * 1024 * 1024)], 'big.png', { type: 'image/png' });
      const errors = validateSingleField('imageFile', bigFile);
      expect(errors.length).toBe(1);
      expect(errors[0]).toContain('must be smaller than 5MB');
    });
  
  });  
});
