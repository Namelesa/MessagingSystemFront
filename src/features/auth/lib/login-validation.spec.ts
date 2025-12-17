import { LoginFieldValidationHelper } from './login-validation';

describe('LoginFieldValidationHelper', () => {

  it('should return empty arrays when all fields are valid', () => {
    const result = LoginFieldValidationHelper.validateAllFields({
      login: 'user_1!',
      nickName: 'Nick_!',
      password: 'Pass1!'
    });

    expect(result['login']).toEqual([]);
    expect(result['nickName']).toEqual([]);
    expect(result['password']).toEqual([]);
  });

  it('should return errors for invalid fields', () => {
    const result = LoginFieldValidationHelper.validateAllFields({
      login: 'a',
      nickName: 'b',
      password: 'c'
    });

    expect(result['login'][0]).toBe(
      'Login must be 5 to 20 characters long and include at least one special character (!, _, @).")'
    );
    expect(result['nickName'][0]).toBe(
      'Nick name must be 3 to 15 characters and include at least one special character (!, _, @)'
    );
    expect(result['password'][0]).toBe(
      'Password must be 5 to 115 characters and include at least one letter, one number, and one special character (!, _, @)'
    );
  });

  it('should return empty array for unknown field', () => {
    // @ts-ignore
    expect(LoginFieldValidationHelper.validateField('unknownField', 'value')).toEqual([]);
  });

  it('should handle mixed validation results', () => {
    const result = LoginFieldValidationHelper.validateAllFields({
      login: 'valid_1!',
      nickName: 'b',
      password: 'Pass1!'
    });

    expect(result['login']).toEqual([]);
    expect(result['nickName'].length).toBeGreaterThan(0);
    expect(result['password']).toEqual([]);
  });

  it('should correctly check for errors using hasErrors', () => {
    const errorsWith = { login: ['error'], password: [] };
    const errorsWithout = { login: [], password: [] };

    expect(LoginFieldValidationHelper.hasErrors(errorsWith)).toBeTrue();
    expect(LoginFieldValidationHelper.hasErrors(errorsWithout)).toBeFalse();
  });

  it('should return all errors as a flat array', () => {
    const fieldErrors = { login: ['e1'], password: ['e2', 'e3'] };
    expect(LoginFieldValidationHelper.getAllErrors(fieldErrors)).toEqual(['e1','e2','e3']);
  });
});
