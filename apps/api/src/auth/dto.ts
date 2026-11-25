import { Equals, IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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

  // The "I agree to the Terms of Service and Privacy Policy" checkbox on the
  // sign-up page. Required, and must be true - saved as User.termsAcceptedAt.
  @IsBoolean()
  @Equals(true, { message: 'You must agree to the Terms of Service and Privacy Policy.' })
  acceptTerms!: boolean;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;

  // Language for the reset email - whatever the app is showing.
  @IsOptional()
  @IsIn(['en', 'es'])
  lang?: 'en' | 'es';
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  token!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;
}
