import { validateGroupDescription } from '../validation/groupDescription.validator.js';

describe('validateGroupDescription', () => {
  it('should return "Description is required" if name is empty', () => {
    expect(validateGroupDescription('')).toBe('Description is required');
    expect(validateGroupDescription(null as any)).toBe('Description is required');
    expect(validateGroupDescription(undefined as any)).toBe('Description is required');
  });

  it('should return null if name is valid', () => {
    expect(validateGroupDescription('Description1')).toBeNull();
    expect(validateGroupDescription('Test')).toBeNull();
    expect(validateGroupDescription('Опис')).toBeNull();
    expect(validateGroupDescription('A'.repeat(650))).toBeNull();
  });

  it('should return "Only letters, 1 to 650 characters" if name is invalid', () => {
    expect(validateGroupDescription('Invalid!')).toBe('Only letters, 1 to 650 characters');
    expect(validateGroupDescription('With spaces inside')).toBe('Only letters, 1 to 650 characters');
    expect(validateGroupDescription('A'.repeat(651))).toBe('Only letters, 1 to 650 characters');
    expect(validateGroupDescription('@Description')).toBe('Only letters, 1 to 650 characters');
  });
});
