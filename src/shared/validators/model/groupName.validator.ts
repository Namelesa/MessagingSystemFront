export function validateGroupName(name: string): string | null {
    const regex = /^[A-Za-zА-Яа-яЁё0-9]{1,350}$/;
    if (!name) return 'Group name is required';
    if (!regex.test(name)) return 'Only letters, 1 to 350 characters';
    return null;
  }
  