import { IsIn } from 'class-validator';

export class CheckoutDto {
  @IsIn(['basic', 'pro'])
  tier!: 'basic' | 'pro';
}
