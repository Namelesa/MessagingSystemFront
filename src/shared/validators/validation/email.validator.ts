export function validateEmail(email: string): string | null {
    if (!email) return 'Email is required';
  
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email) ? null : 'Invalid email';
  }
  