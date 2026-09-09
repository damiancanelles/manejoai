import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateBusinessDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  // Where replies to this business's invoice/reminder emails should land -
  // not the same thing as emailSlug (the sending address itself), which
  // isn't editable here since customers already recognize it once set.
  @IsOptional()
  @IsEmail()
  replyToEmail?: string;
}
