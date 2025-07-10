export function validateNickName(nickName: string): string | null {
    if (!nickName) return 'NickName is required';
  
    const pattern = /^(?=.*[!_@])[a-zA-Z0-9!_@]{3,15}$/;
    if (!pattern.test(nickName)) {
      return 'Nick name must be 3 to 15 characters and include at least one special character (!, _, @)';
    }
  
    return null;
  }
  