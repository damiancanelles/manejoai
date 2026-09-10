import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { ProTierGuard } from '../common/guards/pro-tier.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AssistantService } from './assistant.service';
import { ChatDto } from './dto';

const MAX_HISTORY = 20; // basic cost guard against an unbounded client-side history

// SubscriptionGuard: locked out if the subscription lapsed, same as every
// other feature. ProTierGuard: the assistant is Pro-only ($25), so a Basic
// business (subscribed, full app access) still gets a 403 here.
@UseGuards(JwtAuthGuard, SubscriptionGuard, ProTierGuard)
@Controller('assistant')
export class AssistantController {
  constructor(private assistantService: AssistantService) {}

  @Post('message')
  async message(@Body() dto: ChatDto, @CurrentUser() user: { businessId: string }) {
    if (dto.messages.length === 0) {
      throw new BadRequestException('messages must not be empty');
    }
    const history = dto.messages.slice(-MAX_HISTORY);
    const reply = await this.assistantService.chat(user.businessId, history);
    return { reply };
  }
}
