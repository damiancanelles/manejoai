import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { ClientErrorDto } from './dto';

// No JwtAuthGuard - a crash on the login or sign-up page has no session.
// Abuse is bounded by AlertsService's throttling (same message at most once
// per window, a hard cap per hour) and the DTO's length limits.
@Controller('client-errors')
export class ClientErrorsController {
  constructor(private alerts: AlertsService) {}

  @Post()
  @HttpCode(204)
  report(@Body() dto: ClientErrorDto) {
    void this.alerts.notify(
      `${dto.source === 'web' ? 'Web' : 'Mobile'} app error${dto.where ? ` on ${dto.where}` : ''}: ${dto.message}`.slice(0, 180),
      dto.stack ?? dto.message,
      `client:${dto.source}:${dto.message}`,
    );
  }
}
