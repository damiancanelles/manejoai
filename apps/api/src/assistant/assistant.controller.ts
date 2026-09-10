import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AssistantService } from './assistant.service';
import { ChatDto } from './dto';

const MAX_HISTORY = 20; // basic cost guard against an unbounded client-side history

// Locked out the same as every other feature - a business whose
// subscription has lapsed doesn't get free AI usage either.
@UseGuards(JwtAuthGuard, SubscriptionGuard)
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
