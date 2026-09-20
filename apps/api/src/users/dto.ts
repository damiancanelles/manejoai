import { IsEmail, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  newPassword!: string;
}

export class RegisterPushTokenDto {
  // An Expo push token, e.g. "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]" -
  // not validated more strictly than "a string", since Expo's own token
  // format isn't a stable contract to hard-code a regex against.
  @IsString()
  token!: string;
}

export class CreateCrewUserDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;
}
