import { BadRequestException, Body, Controller, Post, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { ProTierGuard } from '../common/guards/pro-tier.guard';
import { CrewGuard } from '../common/guards/crew.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AssistantService } from './assistant.service';
import { TranscriptionService } from './transcription.service';
import { SpreadsheetService } from './spreadsheet.service';
import { ChatDto, ExecuteActionDto } from './dto';

const MAX_HISTORY = 20; // basic cost guard against an unbounded client-side history

// SubscriptionGuard: locked out if the subscription lapsed, same as every
// other feature. ProTierGuard: the assistant is Pro-only ($25), so a Basic
// business (subscribed, full app access) still gets a 403 here. CrewGuard:
// crew accounts never reach the assistant.
@UseGuards(JwtAuthGuard, SubscriptionGuard, CrewGuard, ProTierGuard)
@Controller('assistant')
export class AssistantController {
  constructor(
    private assistantService: AssistantService,
    private transcriptionService: TranscriptionService,
    private spreadsheetService: SpreadsheetService,
  ) {}

  // Voice input for the chat - multipart/form-data with a single "audio"
  // field. Returns the transcript only; the widget sends it through
  // POST /assistant/message itself, same as anything typed.
  @Post('transcribe')
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async transcribe(@UploadedFile() audio: Express.Multer.File) {
    if (!audio) {
      throw new BadRequestException('audio file is required');
    }
    const text = await this.transcriptionService.transcribe(audio.buffer, audio.mimetype);
    return { text };
  }

  // A spreadsheet attached from the dedicated chat page - multipart with a
  // single "file" field. Returns the parsed text only, same as /transcribe;
  // the page inserts it into the compose box for the user to see/edit
  // before sending.
  @Post('parse-spreadsheet')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async parseSpreadsheet(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    const text = this.spreadsheetService.parseToText(file.buffer);
    return { text };
  }

  @Post('message')
  async message(@Body() dto: ChatDto, @CurrentUser() user: { businessId: string }) {
    if (dto.messages.length === 0) {
      throw new BadRequestException('messages must not be empty');
    }
    const history = dto.messages.slice(-MAX_HISTORY);
    const { reply, actions } = await this.assistantService.chat(user.businessId, history);
    return { reply, actions };
  }

  // Streaming twin of POST /assistant/message, used only by the web chat
  // (the widget and the dedicated /assistant page) - the mobile app keeps
  // calling the plain JSON endpoint above unchanged. Responds with
  // newline-delimited JSON instead of one JSON body: beyond the nicer
  // "what's it doing" UI, this is what keeps a long multi-tool-call request
  // from hitting Heroku's 30s router timeout, which only applies before the
  // first byte of a response - once bytes are flowing, there's no cap. Uses
  // @Res() directly because Nest's normal response handling expects one
  // return value, not an open connection written to over time.
  @Post('message/stream')
  async messageStream(@Body() dto: ChatDto, @CurrentUser() user: { businessId: string }, @Res() res: Response) {
    if (dto.messages.length === 0) {
      throw new BadRequestException('messages must not be empty');
    }
    const history = dto.messages.slice(-MAX_HISTORY);

    res.writeHead(200, {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    });
    await this.assistantService.chatStream(user.businessId, history, (event) => {
      res.write(`${JSON.stringify(event)}\n`);
    });
    res.end();
  }

  // What actually runs a change the assistant proposed - only reachable by
  // the user clicking Approve on a card in the UI. Same guards as chatting,
  // so a lapsed or downgraded business can't execute a stale action either.
  @Post('actions/execute')
  async executeAction(
    @Body() dto: ExecuteActionDto,
    @CurrentUser() user: { userId: string; businessId: string },
  ) {
    const { link } = await this.assistantService.executeAction(dto.type, dto.params, user.userId, user.businessId);
    return { ok: true, link };
  }
}
