import { validateGroupName } from '../validation/groupName.validator';

describe('validateGroupName', () => {
  it('should return "Group name is required" if name is empty', () => {
    expect(validateGroupName('')).toBe('Group name is required');
    expect(validateGroupName(null as any)).toBe('Group name is required');
    expect(validateGroupName(undefined as any)).toBe('Group name is required');
  });

  it('should return null if name is valid', () => {
    expect(validateGroupName('Group1')).toBeNull();
    expect(validateGroupName('Test')).toBeNull();
    expect(validateGroupName('Group')).toBeNull();
    expect(validateGroupName('A'.repeat(350))).toBeNull();
  });

  it('should return "Only letters, 1 to 350 characters" if name is invalid', () => {
    expect(validateGroupName('Group!')).toBe('Only letters, 1 to 350 characters');
    expect(validateGroupName('Name with spaces')).toBe('Only letters, 1 to 350 characters');
    expect(validateGroupName('')).toBe('Group name is required');
    expect(validateGroupName('A'.repeat(351))).toBe('Only letters, 1 to 350 characters');
    expect(validateGroupName('@Group')).toBe('Only letters, 1 to 350 characters');
  });
});
