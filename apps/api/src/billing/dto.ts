import { IsIn } from 'class-validator';

// Shared by POST /billing/checkout (new subscription) and
// POST /billing/change-plan (swap the price on an existing one).
export class PlanDto {
  @IsIn(['basic', 'pro'])
  tier!: 'basic' | 'pro';
}
