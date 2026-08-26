import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { ContactRole } from '@prisma/client';

export class CreateContactDto {
  @IsString()
  accountId!: string;

  @IsEnum(ContactRole)
  role!: ContactRole;

  @IsString()
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  receivesInvoices?: boolean;

  @IsOptional()
  @IsBoolean()
  receivesReminders?: boolean;
}

export class UpdateContactDto {
  @IsOptional()
  @IsEnum(ContactRole)
  role?: ContactRole;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  receivesInvoices?: boolean;

  @IsOptional()
  @IsBoolean()
  receivesReminders?: boolean;
}
