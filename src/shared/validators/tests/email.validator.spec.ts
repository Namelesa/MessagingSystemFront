import { validateEmail } from '../validation/email.validator';

describe('validateEmail', () => {
  it('should return "Email is required" if email is empty', () => {
    expect(validateEmail('')).toBe('Email is required');
    expect(validateEmail(null as any)).toBe('Email is required');
    expect(validateEmail(undefined as any)).toBe('Email is required');
  });

  it('should return null if email is valid', () => {
    expect(validateEmail('test@example.com')).toBeNull();
    expect(validateEmail('user.name+tag@domain.co.uk')).toBeNull();
    expect(validateEmail('a@b.io')).toBeNull();
  });

  it('should return "Invalid email" if email is invalid', () => {
    expect(validateEmail('invalid')).toBe('Invalid email');
    expect(validateEmail('user@domain')).toBe('Invalid email');
    expect(validateEmail('user@.com')).toBe('Invalid email');
    expect(validateEmail('user@@domain.com')).toBe('Invalid email');
    expect(validateEmail('user domain.com')).toBe('Invalid email');
  });
});
