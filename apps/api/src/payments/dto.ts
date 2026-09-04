import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString } from 'class-validator';

export class RecordPaymentDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  invoiceIds!: string[];

  // The date the payment was actually received - lets staff record a
  // payment after the fact without losing which month it really landed in.
  @IsDateString()
  paidAt!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
