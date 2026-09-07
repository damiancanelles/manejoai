import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  // Business info - replaces what used to be the hardcoded COMPANY config,
  // shown from here on on this business's own invoices/emails.
  @IsString()
  businessName!: string;

  @IsString()
  addressLine1!: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  // The first user of the new business - becomes its ADMIN.
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;
}
