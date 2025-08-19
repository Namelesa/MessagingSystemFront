import { validatePassword } from '../validation/password.validator';

describe('validatePassword', () => {
  it('should return "Password is required" if password is empty', () => {
    expect(validatePassword('')).toBe('Password is required');
    expect(validatePassword(null as any)).toBe('Password is required');
    expect(validatePassword(undefined as any)).toBe('Password is required');
  });

  it('should return null if password is valid', () => {
    expect(validatePassword('abc1!')).toBeNull();
    expect(validatePassword('Pass_word1')).toBeNull();
    expect(validatePassword('MySecure@123')).toBeNull();
  });

  it('should return error message if password is invalid', () => {
    expect(validatePassword('abc')).toBe('Password must be 5 to 115 characters and include at least one letter, one number, and one special character (!, _, @)');
    expect(validatePassword('abcdef')).toBe('Password must be 5 to 115 characters and include at least one letter, one number, and one special character (!, _, @)');
    expect(validatePassword('123456')).toBe('Password must be 5 to 115 characters and include at least one letter, one number, and one special character (!, _, @)');
    expect(validatePassword('!!!!!!!')).toBe('Password must be 5 to 115 characters and include at least one letter, one number, and one special character (!, _, @)');
    expect(validatePassword('a1')).toBe('Password must be 5 to 115 characters and include at least one letter, one number, and one special character (!, _, @)');
    expect(validatePassword('a1!'.repeat(40))).toBe('Password must be 5 to 115 characters and include at least one letter, one number, and one special character (!, _, @)');
  });
});
