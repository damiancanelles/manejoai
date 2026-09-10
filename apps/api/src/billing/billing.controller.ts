import { BadRequestException, Body, Controller, Headers, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BillingService } from './billing.service';
import { CheckoutDto } from './dto';

@Controller()
export class BillingController {
  constructor(private billingService: BillingService) {}

  // Deliberately no SubscriptionGuard here - this is how a lapsed business
  // resubscribes, so it has to work even when their access is locked.
  @UseGuards(JwtAuthGuard)
  @Post('billing/checkout')
  async checkout(@Body() dto: CheckoutDto, @CurrentUser() user: { businessId: string }) {
    const url = await this.billingService.createCheckoutSession(user.businessId, dto.tier);
    return { url };
  }

  @UseGuards(JwtAuthGuard)
  @Post('billing/portal')
  async portal(@CurrentUser() user: { businessId: string }) {
    const url = await this.billingService.createPortalSession(user.businessId);
    return { url };
  }

  // No JwtAuthGuard - Stripe's servers call this, not a logged-in user.
  // Verified instead by the signature in the Stripe-Signature header (see
  // BillingService.handleWebhookEvent). Reads req.rawBody (Buffer) rather
  // than the normally-parsed @Body() - Stripe's signature check needs the
  // exact original bytes, which NestFactory.create(AppModule, { rawBody: true })
  // in main.ts makes available here without changing @Body() parsing
  // anywhere else in the app.
  @Post('stripe/webhook')
  @HttpCode(200)
  async webhook(@Req() req: Request & { rawBody?: Buffer }, @Headers('stripe-signature') signature?: string) {
    if (!req.rawBody || !signature) {
      throw new BadRequestException('Missing Stripe signature or raw body.');
    }
    await this.billingService.handleWebhookEvent(req.rawBody, signature);
    return { received: true };
  }
}
