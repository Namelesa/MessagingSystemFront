export function validateGroupDescription(name: string): string | null {
    const regex = /^[A-Za-zА-Яа-яЁё0-9]{1,650}$/;
    if (!name) return 'Description is required';
    if (!regex.test(name)) return 'Only letters, 1 to 650 characters';
    return null;
  }
  