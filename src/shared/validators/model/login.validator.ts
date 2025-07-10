export function validateLogin(login: string): string | null {
    if (!login) return 'Login is required';
  
    const pattern = /^(?=.*[!_@])[a-zA-Z0-9!_@]{5,20}$/;
    if (!pattern.test(login)) {
      return 'Login must be 5 to 20 characters long and include at least one special character (!, _, @).")';
    }
  
    return null;
  }
  