export function validatePassword(password: string): string | null {
    if (!password) return 'Password is required';
  
    const pattern = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!_@])[a-zA-Z\d!_@]{5,15}$/;
    if (!pattern.test(password)) {
      return 'Password must be 5 to 15 characters and include at least one letter, one number, and one special character (!, _, @)';
    }
  
    return null;
  }
  