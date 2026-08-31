import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { ContactRole } from '@prisma/client';

export class CreateContactDto {
  @IsString()
  accountId!: string;

  // Leave unset for a contact that applies to the whole account; set it to
  // scope the contact to one property (e.g. that building's manager).
  @IsOptional()
  @IsString()
  propertyId?: string;

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
  // null clears the property, making the contact apply to the whole account again
  @IsOptional()
  @IsString()
  propertyId?: string | null;

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
