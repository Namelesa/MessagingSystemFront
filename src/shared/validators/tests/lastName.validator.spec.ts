import { validateLastName } from '../validation/lastName.validator';

describe('validateLastName', () => {
  it('should return "Last name is required" if name is empty', () => {
    expect(validateLastName('')).toBe('Last name is required');
    expect(validateLastName(null as any)).toBe('Last name is required');
    expect(validateLastName(undefined as any)).toBe('Last name is required');
  });

  it('should return null if name is valid', () => {
    expect(validateLastName('John')).toBeNull();
    expect(validateLastName('Ivan')).toBeNull();
    expect(validateLastName('Alex')).toBeNull();
  });

  it('should return "Only letters, 3 to 25 characters" if name is invalid', () => {
    expect(validateLastName('Jo')).toBe('Only letters, 3 to 25 characters');
    expect(validateLastName('J'.repeat(26))).toBe('Only letters, 3 to 25 characters');
    expect(validateLastName('John123')).toBe('Only letters, 3 to 25 characters');
    expect(validateLastName('John-Doe')).toBe('Only letters, 3 to 25 characters');
    expect(validateLastName('')).toBe('Last name is required');
  });
});
