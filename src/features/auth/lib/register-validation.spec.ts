import { RegisterFieldValidationHelper } from './register-validation';

describe('RegisterFieldValidationHelper', () => {

  const validFile = new File(['dummy content'], 'photo.png', { type: 'image/png', lastModified: Date.now() });
  const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'large.png', { type: 'image/png' });
  const invalidFile = new File(['content'], 'file.txt', { type: 'text/plain' });

it('should validate image types and size correctly', () => {
  expect(RegisterFieldValidationHelper.validateImage(undefined)[0]).toBe('* Image is required');
  expect(RegisterFieldValidationHelper.validateImage(invalidFile)[0])
        .toBe('* Image must be a valid image file (jpeg, png, gif, webp, svg)');
  expect(RegisterFieldValidationHelper.validateImage(largeFile)[0])
        .toBe('* Image size must be less than 5MB');
  expect(RegisterFieldValidationHelper.validateImage(validFile)).toEqual([]);
});


    it('should return error for non-File objects', () => {
        const fakeFile = { name: 'fake.png', type: 'image/png', size: 1000 } as unknown as File;
        expect(RegisterFieldValidationHelper.validateImage(fakeFile)[0])
        .toBe('* Image must be a valid file');
    });
  

  it('should return empty arrays when all fields are valid', () => {
    const result = RegisterFieldValidationHelper.validateAllFields({
      firstName: 'John',
      lastName: 'Doe',
      login: 'user_1!',
      email: 'test@example.com',
      nickName: 'Nick_!',
      password: 'Pass1!',
      image: validFile
    });

    expect(result['firstName']).toEqual([]);
    expect(result['lastName']).toEqual([]);
    expect(result['login']).toEqual([]);
    expect(result['email']).toEqual([]);
    expect(result['nickName']).toEqual([]);
    expect(result['password']).toEqual([]);
    expect(result['image']).toEqual([]);
  });

  it('should return errors for invalid fields', () => {
    const result = RegisterFieldValidationHelper.validateAllFields({
      firstName: 'a',
      lastName: 'b',
      login: 'c',
      email: 'd',
      nickName: 'e',
      password: 'f',
      image: undefined
    });

    expect(result['firstName'].length).toBeGreaterThan(0);
    expect(result['lastName'].length).toBeGreaterThan(0);
    expect(result['login'].length).toBeGreaterThan(0);
    expect(result['email'].length).toBeGreaterThan(0);
    expect(result['nickName'].length).toBeGreaterThan(0);
    expect(result['password'].length).toBeGreaterThan(0);
    expect(result['image'][0]).toBe('* Image is required');
  });

  it('should handle unknown field gracefully', () => {
    // @ts-ignore
    expect(RegisterFieldValidationHelper.validateField('unknownField', 'value')).toEqual([]);
  });

  it('should validate image types and size correctly', () => {
    expect(RegisterFieldValidationHelper.validateImage(undefined)[0]).toBe('* Image is required');
    expect(RegisterFieldValidationHelper.validateImage(invalidFile)[0])
      .toBe('* Image must be a valid image file (jpeg, png, gif, webp, svg)');
    expect(RegisterFieldValidationHelper.validateImage(largeFile)[0])
      .toBe('* Image size must be less than 5MB');
    expect(RegisterFieldValidationHelper.validateImage(validFile)).toEqual([]);
  });

  it('should handle mixed validation results', () => {
    const result = RegisterFieldValidationHelper.validateAllFields({
      firstName: 'John',
      lastName: 'b',
      login: 'user_1!',
      email: 'd',
      nickName: 'Nick_!',
      password: 'Pass1!',
      image: validFile
    });

    expect(result['firstName']).toEqual([]);
    expect(result['lastName'].length).toBeGreaterThan(0);
    expect(result['login']).toEqual([]);
    expect(result['email'].length).toBeGreaterThan(0);
    expect(result['nickName']).toEqual([]);
    expect(result['password']).toEqual([]);
    expect(result['image']).toEqual([]);
  });

  it('should correctly check for errors using hasErrors', () => {
    const errorsWith = { firstName: ['error'], password: [] };
    const errorsWithout = { firstName: [], password: [] };

    expect(RegisterFieldValidationHelper.hasErrors(errorsWith)).toBeTrue();
    expect(RegisterFieldValidationHelper.hasErrors(errorsWithout)).toBeFalse();
  });

  it('should return all errors as a flat array', () => {
    const fieldErrors = { firstName: ['e1'], password: ['e2', 'e3'] };
    expect(RegisterFieldValidationHelper.getAllErrors(fieldErrors)).toEqual(['e1','e2','e3']);
  });

});
