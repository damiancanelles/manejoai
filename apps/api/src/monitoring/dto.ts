import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/** A crash report from the web or mobile app (see client-errors.controller.ts). */
export class ClientErrorDto {
  @IsIn(['web', 'mobile'])
  source!: 'web' | 'mobile';

  @IsString()
  @MaxLength(500)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  stack?: string;

  // Page path (web) or screen name (mobile) - never a full URL with a query
  // string, which could carry a reset token.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  where?: string;
}
