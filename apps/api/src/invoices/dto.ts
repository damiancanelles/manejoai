import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { InvoiceStatus } from '@prisma/client';

export class InvoiceItemInputDto {
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

export class UpdateInvoiceItemDto {
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

export class CreateInvoiceDto {
  @IsString()
  accountId!: string;

  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsOptional()
  @IsString()
  jobId?: string;

  // The invoice total isn't entered directly - it's the sum of these line
  // items (quantity * unitPriceCents), computed server-side.
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemInputDto)
  items!: InvoiceItemInputDto[];

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsDateString()
  dueDate!: string;

  // What the customer sees as this invoice's title (e.g. "Unit 731L
  // Resurface 1 vanity bathroom sink") - required, not a freeform note.
  @IsString()
  @IsNotEmpty()
  title!: string;
}

export class UpdateInvoiceDto {
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}
