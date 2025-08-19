import { validateNickName } from '../validation/nickName.validator';

describe('validateNickName', () => {
  it('should return "NickName is required" if nickName is empty', () => {
    expect(validateNickName('')).toBe('NickName is required');
    expect(validateNickName(null as any)).toBe('NickName is required');
    expect(validateNickName(undefined as any)).toBe('NickName is required');
  });

  it('should return null if nickName is valid', () => {
    expect(validateNickName('abc@')).toBeNull();
    expect(validateNickName('user_1')).toBeNull();
    expect(validateNickName('Nick!23')).toBeNull();
    expect(validateNickName('a_b')).toBeNull();
  });

  it('should return error message if nickName is invalid', () => {
    expect(validateNickName('ab')).toBe('Nick name must be 3 to 15 characters and include at least one special character (!, _, @)');
    expect(validateNickName('abcdefghijklmnop')).toBe('Nick name must be 3 to 15 characters and include at least one special character (!, _, @)');
    expect(validateNickName('username')).toBe('Nick name must be 3 to 15 characters and include at least one special character (!, _, @)');
    expect(validateNickName('user!name@morethan15')).toBe('Nick name must be 3 to 15 characters and include at least one special character (!, _, @)');
    expect(validateNickName('$$$')).toBe('Nick name must be 3 to 15 characters and include at least one special character (!, _, @)');
  });
});
