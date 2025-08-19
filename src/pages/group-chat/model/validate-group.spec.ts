import { validateCreateGroupForm, validateEditGroupForm, validateImageFile, validateMembersCount } from './validate-group';
import { validateGroupName as vName, validateGroupDescription as vDesc } from '../../../shared/validators';
import { GroupCreateRequest } from '../api/group-chat/group-create';
import { GroupInfoEditData } from './group-info-edit.model';

describe('Group Form Validators', () => {
  describe('validateCreateGroupForm', () => {
    it('returns validators results for typical data', () => {
      const data: GroupCreateRequest = {
        GroupName: 'Test Group',
        Description: 'Some description',
        Admin: 'admin',
        Users: ['u1', 'u2'],
        ImageFile: null,
      };
      const expected = [vName(data.GroupName), vDesc(data.Description)].filter(Boolean) as string[];
      expect(validateCreateGroupForm(data)).toEqual(expected);
    });

    it('returns validators results for edge data', () => {
      const data: GroupCreateRequest = {
        GroupName: '',
        Description: '',
        Admin: 'admin',
        Users: [],
        ImageFile: undefined,
      };
      const expected = [vName(data.GroupName), vDesc(data.Description)].filter(Boolean) as string[];
      expect(validateCreateGroupForm(data)).toEqual(expected);
    });
  });

  describe('validateEditGroupForm', () => {
    it('returns validators results for typical data', () => {
      const data: GroupInfoEditData = {
        GroupName: 'Edited Name',
        Description: 'Edited description',
      };
      const expected = [vName(data.GroupName), vDesc(data.Description)].filter(Boolean) as string[];
      expect(validateEditGroupForm(data)).toEqual(expected);
    });

    it('returns validators results for edge data', () => {
      const data: GroupInfoEditData = {
        GroupName: '',
        Description: '',
      };
      const expected = [vName(data.GroupName), vDesc(data.Description)].filter(Boolean) as string[];
      expect(validateEditGroupForm(data)).toEqual(expected);
    });
  });

  describe('validateImageFile', () => {
    it('returns [] when file is null', () => {
      expect(validateImageFile(null)).toEqual([]);
    });

    it('returns error for wrong type', () => {
      const file = new File(['x'], 'test.txt', { type: 'text/plain' });
      const result = validateImageFile(file);
      expect(result).toContain('Image must be in JPEG, PNG, GIF or WebP format');
    });

    it('returns error for too big file', () => {
      const file = new File(['x'.repeat(6 * 1024 * 1024)], 'big.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });
      const result = validateImageFile(file);
      expect(result).toContain('Image size must not exceed 5MB');
    });

    it('returns [] for valid file', () => {
      const file = new File(['x'], 'ok.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 1000 });
      const result = validateImageFile(file);
      expect(result).toEqual([]);
    });
  });

  describe('validateMembersCount', () => {
    it('errors if adding exceeds max (add mode)', () => {
      const result = validateMembersCount(5, 10, { min: 1, max: 10, mode: 'add' });
      expect(result[0]).toContain('Total members cannot exceed 10');
    });

    it('errors if total less than min (create mode)', () => {
      const result = validateMembersCount(0, 0, { min: 1, max: 5, mode: 'create' });
      expect(result[0]).toContain('Group must have at least 1 members');
    });

    it('errors if total more than max (create mode)', () => {
      const result = validateMembersCount(6, 0, { min: 1, max: 5, mode: 'create' });
      expect(result[0]).toContain('Group cannot have more than 5 members');
    });

    it('returns [] when within limits', () => {
      const result = validateMembersCount(3, 2, { min: 1, max: 10, mode: 'add' });
      expect(result).toEqual([]);
    });
  });
});
