import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { ImageMediaType, ParsedReport } from './types';

const TOOL_NAME = 'extract_job_report';

/**
 * Turns one worker message-burst (text + photos) into a best-effort guess
 * at a Job's title/description and which property it's for. Never trusted
 * outright - see IncomingReport in schema.prisma - staff confirm everything
 * this produces before it becomes a real Job.
 */
@Injectable()
export class ReportParsingService {
  private logger = new Logger(ReportParsingService.name);
  private client: Anthropic;

  constructor(private config: ConfigService) {
    this.client = new Anthropic({ apiKey: this.config.get<string>('ANTHROPIC_API_KEY') });
  }

  async parse(text: string, images: { buffer: Buffer; contentType: ImageMediaType }[]): Promise<ParsedReport> {
    const content: Anthropic.MessageParam['content'] = images.map((img) => ({
      type: 'image' as const,
      source: { type: 'base64' as const, media_type: img.contentType, data: img.buffer.toString('base64') },
    }));

    content.push({
      type: 'text',
      text:
        `A field worker posted this message in a job-reports chat:\n\n"${text || '(no text, photos only)'}"\n\n` +
        'Extract a short job title, a one-paragraph description of the work described/shown in the photos, ' +
        'and the property name if one is mentioned (building name, address, unit number - whatever text ' +
        'identifies which property this is for). If no property is mentioned anywhere, propertyText must be null.',
    });

    const response = await this.client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 1024,
      tools: [
        {
          name: TOOL_NAME,
          description: 'Record the extracted job report fields.',
          input_schema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Short job title, e.g. "Interior paint - Unit 4B"' },
              description: { type: 'string', description: 'One-paragraph description of the work performed' },
              propertyText: {
                type: ['string', 'null'],
                description: 'The property/building/address text mentioned, or null if none was mentioned',
              },
            },
            required: ['title', 'description', 'propertyText'],
            additionalProperties: false,
          },
        },
      ],
      tool_choice: { type: 'tool', name: TOOL_NAME },
      messages: [{ role: 'user', content }],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );
    if (!toolUse) {
      this.logger.error(`No tool_use block in Claude's response (stop_reason: ${response.stop_reason})`);
      throw new Error("Claude didn't return the expected structured extraction");
    }
    return toolUse.input as ParsedReport;
  }
}
