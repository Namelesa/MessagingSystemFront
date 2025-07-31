import { validateEmail, validateFirstName, validateLastName, validateNickName, validateLogin } 
from '../../../shared/validators';
import { EditUserContract } from '../../../entities/user';

export function validateUpdateForm(data: EditUserContract): string[] {
  const fields: [keyof EditUserContract, string, (value: any) => string | null][] = [
    ['firstName', 'First name', validateFirstName],
    ['lastName', 'Last name', validateLastName],
    ['login', 'Login', validateLogin],
    ['email', 'Email', validateEmail],
    ['nickName', 'NickName', validateNickName],
  ];

  const errors = fields
    .map(([key, label, validator]) => {
      const err = validator(data[key]);
      return err ? `${label}: ${err}` : null;
    })
    .filter(Boolean) as string[];

  if (
    data.imageFile &&
    (
      !(data.imageFile instanceof File) ||
      !['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'].includes(data.imageFile.type)
    )
  ) {
    errors.push('Image must be a valid image file (jpeg, png, gif, webp, svg).');
  }

  return errors;
}