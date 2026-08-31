import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class QuoteItemInputDto {
  @IsString()
  description!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  // Price per unit, in cents
  @IsInt()
  @Min(0)
  unitPriceCents!: number;
}

export class UpdateQuoteItemDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  unitPriceCents?: number;
}

export class CreateQuoteDto {
  @IsString()
  accountId!: string;

  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsOptional()
  @IsString()
  jobId?: string;

  // The quote total isn't entered directly - it's the sum of these line
  // items (quantity * unitPriceCents), computed server-side. Same rule as
  // invoices.
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemInputDto)
  items!: QuoteItemInputDto[];

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateQuoteDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
