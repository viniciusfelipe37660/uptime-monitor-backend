import { IsEmail, IsString, Length } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(12, 128, {
    message: 'Password must be between 12 and 128 characters',
  })
  password!: string;
}
