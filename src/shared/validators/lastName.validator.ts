export function validateLastName(name: string): string | null {
    const regex = /^[A-Za-zА-Яа-яЁё]{3,25}$/;
    if (!name) return 'Last name is required';
    if (!regex.test(name)) return 'Only letters, 3 to 25 characters';
    return null;
  }
  