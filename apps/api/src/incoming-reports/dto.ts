import { IsOptional, IsString } from 'class-validator';

// Staff confirms/edits Claude's suggestions before this becomes a real Job -
// see IncomingReport in schema.prisma. accountId/propertyId are usually
// pre-filled from matchedProperty but always editable in case the auto-match
// was wrong or there wasn't one.
export class ConvertReportDto {
  @IsString()
  accountId!: string;

  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
