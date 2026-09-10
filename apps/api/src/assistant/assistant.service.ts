import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { InvoicesService } from '../invoices/invoices.service';
import { JobsService } from '../jobs/jobs.service';
import { AccountsService } from '../accounts/accounts.service';
import { QuotesService } from '../quotes/quotes.service';

const MODEL = 'claude-sonnet-5';
const MAX_TOOL_LOOPS = 6; // cost/runaway safety net, not expected to be hit in normal use

const SYSTEM_PROMPT = `You are the in-app assistant for manejoai, a business-management tool for property-services vendors (painting, cleaning, maintenance, etc). You're embedded in the app for one specific business - you can only see that business's own customers, jobs, quotes, and invoices, never any other business's data.

You're read-only for now: you can look things up and answer questions, but you cannot create, edit, or cancel anything. If asked to make a change, say so plainly and suggest doing it from the relevant page in the app.

Use the search tools to answer questions - don't guess at data you haven't looked up. Keep answers short and concrete (a sentence or a short list), the way a colleague would answer over chat, not a formal report. Dollar amounts are in cents in tool results - always convert to dollars when you mention them.`;

// Anthropic.Tool[] - plain JSON-schema tool definitions, same style as
// report-parsing.service.ts. Each name maps to a handler below that calls
// the real, already business-scoped service - Claude's tool input never
// carries a businessId, so there's no new path for cross-tenant data.
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_invoices',
    description:
      "Search this business's invoices by invoice number, title, customer name, or property name. Returns a summary list, not full records.",
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Free-text search, e.g. a unit number, customer, or property name' },
        status: {
          type: 'string',
          enum: ['DRAFT', 'SENT', 'AWAITING_PAYMENT', 'OVERDUE', 'PAID', 'CANCELED'],
          description: 'Optional - only invoices with this status',
        },
        accountId: { type: 'string', description: 'Optional - only invoices for this customer id' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'search_jobs',
    description:
      "Search this business's logged jobs by title, description, customer name, or property name. Returns a summary list.",
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Free-text search, e.g. a unit number, customer, or property name' },
        status: {
          type: 'string',
          enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'],
          description: 'Optional - only jobs with this status',
        },
        accountId: { type: 'string', description: 'Optional - only jobs for this customer id' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'search_accounts',
    description:
      "Search this business's customers by name, or by a property name/address belonging to them. Returns each matching customer's id, name, type, and its properties.",
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Free-text search over customer name or property name' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'search_quotes',
    description: "Search this business's quotes by quote number, notes, customer name, or property name.",
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Free-text search, e.g. a unit number, customer, or property name' },
        status: {
          type: 'string',
          enum: ['PENDING', 'APPROVED'],
          description: 'Optional - only quotes with this status',
        },
        accountId: { type: 'string', description: 'Optional - only quotes for this customer id' },
      },
      additionalProperties: false,
    },
  },
];

@Injectable()
export class AssistantService {
  private logger = new Logger(AssistantService.name);
  private client: Anthropic;

  constructor(
    private config: ConfigService,
    private invoicesService: InvoicesService,
    private jobsService: JobsService,
    private accountsService: AccountsService,
    private quotesService: QuotesService,
  ) {
    this.client = new Anthropic({ apiKey: this.config.get<string>('ANTHROPIC_API_KEY') });
  }

  /** Runs one tool, scoped to businessId - the only place tool names map to real service calls. */
  private async runTool(name: string, input: any, businessId: string): Promise<unknown> {
    switch (name) {
      case 'search_invoices': {
        const rows = await this.invoicesService.findAll(
          { search: input.search, status: input.status, accountId: input.accountId },
          businessId,
        );
        return rows.slice(0, 25).map((i) => ({
          invoiceNumber: i.invoiceNumber,
          title: i.title,
          status: i.status,
          amountCents: i.amountCents,
          dueDate: i.dueDate,
          customer: i.account?.name,
          property: i.property?.name,
        }));
      }
      case 'search_jobs': {
        const rows = await this.jobsService.findAll(
          { search: input.search, status: input.status, accountId: input.accountId },
          businessId,
        );
        return rows.slice(0, 25).map((j) => ({
          title: j.title,
          description: j.description,
          status: j.status,
          createdAt: j.createdAt,
          customer: j.account?.name,
          property: j.property?.name,
        }));
      }
      case 'search_accounts': {
        const rows = await this.accountsService.findAll(businessId, input.search);
        return rows.slice(0, 25).map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          properties: a.properties.map((p) => p.name),
        }));
      }
      case 'search_quotes': {
        const rows = await this.quotesService.findAll(
          { search: input.search, status: input.status, accountId: input.accountId },
          businessId,
        );
        return rows.slice(0, 25).map((q) => ({
          quoteNumber: q.quoteNumber,
          notes: q.notes,
          status: q.status,
          amountCents: q.amountCents,
          customer: q.account?.name,
          property: q.property?.name,
        }));
      }
      default:
        return { error: `Unknown tool: ${name}` };
    }
  }

  async chat(businessId: string, history: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
    const messages: Anthropic.MessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));

    for (let i = 0; i < MAX_TOOL_LOOPS; i++) {
      let response: Anthropic.Message;
      try {
        response = await this.client.messages.create({
          model: MODEL,
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          thinking: { type: 'adaptive' },
          output_config: { effort: 'low' },
          tools: TOOLS,
          messages,
        });
      } catch (err) {
        this.logger.error(`Claude request failed: ${(err as Error).message}`);
        if (err instanceof Anthropic.RateLimitError) {
          throw new BadRequestException("I'm getting a lot of requests right now - try again in a moment.");
        }
        if (err instanceof Anthropic.APIError) {
          throw new BadRequestException("Something went wrong talking to the assistant - try again.");
        }
        throw err;
      }

      if (response.stop_reason === 'refusal') {
        return "I can't help with that.";
      }

      if (response.stop_reason !== 'tool_use') {
        const text = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
        return text?.text ?? '';
      }

      // One turn can carry several tool_use blocks (parallel tool use) -
      // run them all, then reply with every tool_result in one user
      // message (splitting them across messages trains Claude to stop
      // batching, per Anthropic's own guidance).
      const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
      messages.push({ role: 'assistant', content: response.content });

      const results = await Promise.all(
        toolUses.map(async (tu) => {
          try {
            const output = await this.runTool(tu.name, tu.input, businessId);
            return { tool_use_id: tu.id, content: JSON.stringify(output) };
          } catch (err) {
            this.logger.error(`Tool ${tu.name} failed: ${(err as Error).message}`);
            return { tool_use_id: tu.id, content: `Error: ${(err as Error).message}`, is_error: true };
          }
        }),
      );

      messages.push({
        role: 'user',
        content: results.map((r) => ({
          type: 'tool_result' as const,
          tool_use_id: r.tool_use_id,
          content: r.content,
          ...(r.is_error ? { is_error: true } : {}),
        })),
      });
    }

    return "That took more digging than I can do in one go - try narrowing your question a bit.";
  }
}
