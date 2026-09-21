import { IsDateString, IsOptional, IsString } from 'class-validator';

// Admin/staff fixing a missed clock-in entirely (the crew member forgot to
// use the app that day) - clockOut is optional so this can also record an
// already-finished shift in one go.
export class CreateManualTimeEntryDto {
  @IsString()
  userId!: string;

  @IsDateString()
  clockIn!: string;

  @IsOptional()
  @IsDateString()
  clockOut?: string;
}

// Admin/staff correcting an existing entry's times - both optional since a
// PATCH might only need to fix one side (e.g. just the clock-out time).
export class UpdateTimeEntryDto {
  @IsOptional()
  @IsDateString()
  clockIn?: string;

  @IsOptional()
  @IsDateString()
  clockOut?: string;
}
