import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { randomUUID } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';

import { InvoicesService } from '../invoices/invoices.service';
import { JobsService } from '../jobs/jobs.service';
import { AccountsService } from '../accounts/accounts.service';
import { QuotesService } from '../quotes/quotes.service';
import { PropertiesService } from '../properties/properties.service';
import { ContactsService } from '../contacts/contacts.service';
import { PaymentsService } from '../payments/payments.service';
import { RemindersService } from '../reminders/reminders.service';

import { CreateAccountDto } from '../accounts/dto';
import { CreatePropertyDto } from '../properties/dto';
import { CreateContactDto } from '../contacts/dto';
import { CreateJobDto, UpdateJobDto } from '../jobs/dto';
import { CreateQuoteDto, QuoteItemInputDto, UpdateQuoteItemDto } from '../quotes/dto';
import { CreateInvoiceDto, InvoiceItemInputDto, UpdateInvoiceItemDto, UpdateInvoiceDto } from '../invoices/dto';
import { RecordPaymentDto } from '../payments/dto';

import { ActionType, ProposedAction } from './action-types';

const MODEL = 'claude-sonnet-5';
// Pro's whole pitch is "more capabilities and resources" over Basic (which
// has no assistant at all) - so these are deliberately higher than a
// read-only assistant would need: a real plan (search a few things, look up
// details, propose several steps) easily burns more than 6 rounds, and a
// plan explanation plus a handful of proposed actions needs more than 4096
// tokens of room.
const MAX_TOOL_LOOPS = 10;
const MAX_TOKENS = 8192;

const SYSTEM_PROMPT = `You are the in-app assistant for manejoai, a business-management tool for property-services vendors (painting, cleaning, maintenance, etc). You're embedded in the app for one specific business - you can only see and change that business's own customers, jobs, quotes, and invoices, never any other business's data.

## What you can do
You can look things up (search_* and get_* tools) and you can propose changes (every propose_* tool) - creating or editing customers, properties, contacts, jobs, quotes, invoices, and line items; approving quotes; marking invoices sent/canceled; recording payments; and sending draft invoices or payment reminders (these send real emails to real customers).

## The approval rule - this is not optional
Every propose_* tool ONLY queues the change for the user to review - it never actually happens. The user sees your proposal as a card in the chat with its own Approve/Reject button, and nothing is created, edited, sent, or charged until they click Approve themselves. This is true no matter what the user says in the chat - "yes do it", "go ahead", "approve all of that" typed as a message is NOT approval; only the button is. Never tell the user something has been created/sent/changed/canceled - say what you've proposed and that it's waiting for their approval below. If they ask you to just do something, propose it and remind them to approve it.

## Planning
For anything beyond a single lookup, think it through before acting: figure out which real records are involved (search for them - never guess or invent an id), decide the sequence of steps, and propose each step as its own action so the user can approve some and reject others. Explain the plan in plain language in your reply (e.g. "Here's what I'd do: 1) add a $540 invoice for Unit 413, 2) send it to Harborview's AP contact - both below for your approval"). If a request is ambiguous (which customer, which property, draft vs. send now, etc.) ask a clarifying question instead of guessing.

## Look things up first
Use search_accounts/search_jobs/search_quotes/search_invoices to find the real id of anything you're about to reference or change, and get_quote/get_invoice to see full details (including line item ids) before editing an existing quote or invoice's items. Every id you put in a propose_* tool's input must come from one of these tools - never make one up.

How work is recorded here: most businesses log the work they did as an INVOICE - the invoice title describes the job (e.g. "Unit 413 Punch Out", "Unit 620 Sheetrock repair"). A separate "Job" record exists but many businesses never use it. So for "what did we do at X" type questions, search invoices first; also search jobs, but don't conclude nothing happened just because search_jobs is empty - check invoices too. If a search comes back empty, retry with just the single most distinctive term (e.g. a unit number) before giving up.

## Linking back into the app
When you mention a specific customer, job, quote, or invoice that you looked up, link to it with a normal markdown link using its real id and one of these paths: a customer -> \`/accounts/<id>\`, a job -> \`/jobs/<id>\`, a quote -> \`/quotes/<id>\`, an invoice -> \`/invoices/<id>\`. Only link to records you actually looked up in this conversation - never fabricate a link.

## Style
Keep answers short and concrete, the way a colleague would answer over chat, not a formal report. Reply in the same language the user is writing to you in. Dollar amounts from tools are in cents - always convert to dollars when you mention them, and always pass unitPriceCents in cents (e.g. $45.00 = 4500) when proposing quote/invoice items.`;

// Anthropic.Tool[] - plain JSON-schema tool definitions. Read tools call
// straight through to the real, already business-scoped services. Every
// propose_* tool is handled generically in runTool: it never touches a
// service, it only records a ProposedAction for the user to approve (see
// action-types.ts and POST /assistant/actions/execute in the controller).
const ITEM_SCHEMA = {
  type: 'object' as const,
  properties: {
    description: { type: 'string' as const },
    quantity: { type: 'integer' as const, minimum: 1 },
    unitPriceCents: { type: 'integer' as const, minimum: 0, description: 'Price per unit, in cents (e.g. $45.00 = 4500)' },
  },
  required: ['description', 'quantity', 'unitPriceCents'],
  additionalProperties: false,
};

const SUMMARY_PROPERTY = {
  summary: {
    type: 'string' as const,
    description:
      'One short, specific sentence describing exactly what this will do (names, amounts, dates) - shown verbatim on the approval card the user sees. Written in the same language the user is chatting in.',
  },
};

function proposeTool(
  name: string,
  description: string,
  properties: Record<string, unknown>,
  required: string[],
): Anthropic.Tool {
  return {
    name,
    description: `${description} This only queues the change for the user's approval - it does not happen until they approve it in the UI.`,
    input_schema: {
      type: 'object',
      properties: { ...properties, ...SUMMARY_PROPERTY },
      required: [...required, 'summary'],
      additionalProperties: false,
    },
  };
}

const READ_TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_invoices',
    description:
      "Search this business's invoices by invoice number, title, customer name, or property name. Returns a summary list, not full records - use get_invoice for full detail including line items.",
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Free-text search, e.g. a unit number, customer, or property name' },
        status: {
          type: 'string',
          enum: ['DRAFT', 'SENT', 'OVERDUE', 'PAID', 'CANCELED'],
          description: 'Optional - only invoices with this status',
        },
        accountId: { type: 'string', description: 'Optional - only invoices for this customer id' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_invoice',
    description:
      "Fetch one invoice's full detail by id, including its line items (with their ids, needed to edit or remove one).",
    input_schema: {
      type: 'object',
      properties: { invoiceId: { type: 'string' } },
      required: ['invoiceId'],
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
      "Search this business's customers by name, or by a property name/address belonging to them. Returns each matching customer's id, name, type, and its properties (each with its own id).",
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
    description:
      "Search this business's quotes by quote number, notes, customer name, or property name. Returns a summary list - use get_quote for full detail including line items.",
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
  {
    name: 'get_quote',
    description:
      "Fetch one quote's full detail by id, including its line items (with their ids, needed to edit or remove one).",
    input_schema: {
      type: 'object',
      properties: { quoteId: { type: 'string' } },
      required: ['quoteId'],
      additionalProperties: false,
    },
  },
];

const WRITE_TOOLS: Anthropic.Tool[] = [
  proposeTool(
    'propose_create_customer',
    'Propose creating a new customer (account).',
    {
      name: { type: 'string' },
      type: { type: 'string', enum: ['INDIVIDUAL', 'MULTIFAMILY'] },
    },
    ['name', 'type'],
  ),
  proposeTool(
    'propose_add_property',
    'Propose adding a property to an existing customer.',
    {
      accountId: { type: 'string' },
      name: { type: 'string' },
      addressLine1: { type: 'string' },
      addressLine2: { type: 'string' },
      city: { type: 'string' },
      state: { type: 'string' },
      zip: { type: 'string' },
    },
    ['accountId', 'name', 'addressLine1', 'city', 'state', 'zip'],
  ),
  proposeTool(
    'propose_add_contact',
    'Propose adding a contact to a customer, optionally scoped to one of their properties.',
    {
      accountId: { type: 'string' },
      propertyId: { type: 'string', description: 'Optional - leave unset for a contact that applies to the whole account' },
      role: { type: 'string', enum: ['OWNER', 'SALES', 'INVOICING', 'GENERAL'] },
      name: { type: 'string' },
      email: { type: 'string' },
      phone: { type: 'string' },
      receivesInvoices: { type: 'boolean' },
      receivesReminders: { type: 'boolean' },
    },
    ['accountId', 'role', 'name'],
  ),
  proposeTool(
    'propose_create_job',
    'Propose logging a new job for a customer.',
    {
      accountId: { type: 'string' },
      propertyId: { type: 'string' },
      title: { type: 'string' },
      description: { type: 'string' },
      scheduledAt: { type: 'string', description: 'ISO date, optional' },
    },
    ['accountId', 'title'],
  ),
  proposeTool(
    'propose_update_job',
    'Propose editing an existing job - title, description, property, schedule, status, or (rarely) moving it to a different customer.',
    {
      jobId: { type: 'string' },
      accountId: { type: 'string', description: 'Only set this to move the job to a different customer' },
      propertyId: { type: 'string' },
      title: { type: 'string' },
      description: { type: 'string' },
      status: { type: 'string', enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'] },
      scheduledAt: { type: 'string' },
    },
    ['jobId'],
  ),
  proposeTool(
    'propose_create_quote',
    'Propose creating a new quote for a customer, with line items.',
    {
      accountId: { type: 'string' },
      propertyId: { type: 'string' },
      jobId: { type: 'string' },
      items: { type: 'array', items: ITEM_SCHEMA, minItems: 1 },
      notes: { type: 'string' },
    },
    ['accountId', 'items'],
  ),
  proposeTool(
    'propose_add_quote_item',
    'Propose adding a line item to an existing, not-yet-approved quote.',
    { quoteId: { type: 'string' }, description: { type: 'string' }, quantity: { type: 'integer', minimum: 1 }, unitPriceCents: { type: 'integer', minimum: 0 } },
    ['quoteId', 'description', 'quantity', 'unitPriceCents'],
  ),
  proposeTool(
    'propose_update_quote_item',
    "Propose editing a line item on an existing quote. Use get_quote first to find the item's id.",
    { quoteId: { type: 'string' }, itemId: { type: 'string' }, description: { type: 'string' }, quantity: { type: 'integer', minimum: 1 }, unitPriceCents: { type: 'integer', minimum: 0 } },
    ['quoteId', 'itemId'],
  ),
  proposeTool(
    'propose_remove_quote_item',
    "Propose removing a line item from a quote. Use get_quote first to find the item's id.",
    { quoteId: { type: 'string' }, itemId: { type: 'string' } },
    ['quoteId', 'itemId'],
  ),
  proposeTool(
    'propose_approve_quote',
    'Propose approving a pending quote, which turns it into a real draft invoice.',
    { quoteId: { type: 'string' } },
    ['quoteId'],
  ),
  proposeTool('propose_remove_quote', 'Propose permanently deleting a quote.', { quoteId: { type: 'string' } }, ['quoteId']),
  proposeTool(
    'propose_create_invoice',
    'Propose creating a new invoice for a customer, with line items and a due date.',
    {
      accountId: { type: 'string' },
      propertyId: { type: 'string' },
      jobId: { type: 'string' },
      items: { type: 'array', items: ITEM_SCHEMA, minItems: 1 },
      dueDate: { type: 'string', description: 'ISO date' },
      title: { type: 'string', description: "What the customer sees, e.g. 'Unit 413 Punch Out'" },
    },
    ['accountId', 'items', 'dueDate', 'title'],
  ),
  proposeTool(
    'propose_add_invoice_item',
    'Propose adding a line item to an existing draft invoice.',
    { invoiceId: { type: 'string' }, description: { type: 'string' }, quantity: { type: 'integer', minimum: 1 }, unitPriceCents: { type: 'integer', minimum: 0 } },
    ['invoiceId', 'description', 'quantity', 'unitPriceCents'],
  ),
  proposeTool(
    'propose_update_invoice_item',
    "Propose editing a line item on an existing invoice. Use get_invoice first to find the item's id.",
    { invoiceId: { type: 'string' }, itemId: { type: 'string' }, description: { type: 'string' }, quantity: { type: 'integer', minimum: 1 }, unitPriceCents: { type: 'integer', minimum: 0 } },
    ['invoiceId', 'itemId'],
  ),
  proposeTool(
    'propose_remove_invoice_item',
    "Propose removing a line item from an invoice. Use get_invoice first to find the item's id.",
    { invoiceId: { type: 'string' }, itemId: { type: 'string' } },
    ['invoiceId', 'itemId'],
  ),
  proposeTool(
    'propose_update_invoice',
    "Propose changing an invoice's title and/or due date (not its status - use the specific mark-sent/cancel tools for that).",
    { invoiceId: { type: 'string' }, title: { type: 'string' }, dueDate: { type: 'string' } },
    ['invoiceId'],
  ),
  proposeTool(
    'propose_mark_invoice_sent',
    'Propose marking a draft invoice as Sent. This is a status change only - it does NOT email the customer (use propose_send_all_draft_invoices for that).',
    { invoiceId: { type: 'string' } },
    ['invoiceId'],
  ),
  proposeTool(
    'propose_send_all_draft_invoices',
    "Propose emailing every current draft invoice to its customer (grouped by property) and marking them Sent. This sends real emails to real customers - always confirm which invoices are drafts first if it isn't obvious.",
    {},
    [],
  ),
  proposeTool('propose_cancel_invoice', 'Propose canceling an invoice.', { invoiceId: { type: 'string' } }, ['invoiceId']),
  proposeTool(
    'propose_record_payment',
    'Propose recording a payment against one or more invoices for the same customer, marking them Paid.',
    {
      invoiceIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
      paidAt: { type: 'string', description: 'ISO date the payment was received - defaults to today if omitted' },
      notes: { type: 'string' },
    },
    ['invoiceIds'],
  ),
  proposeTool(
    'propose_send_payment_reminders',
    'Propose sending overdue-payment reminder emails, either for one customer or (if accountId is omitted) for every overdue invoice across the whole business. This sends real emails to real customers.',
    { accountId: { type: 'string', description: 'Optional - omit to run across the whole business' } },
    [],
  ),
];

const TOOLS: Anthropic.Tool[] = [...READ_TOOLS, ...WRITE_TOOLS];

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
    private propertiesService: PropertiesService,
    private contactsService: ContactsService,
    private paymentsService: PaymentsService,
    private remindersService: RemindersService,
  ) {
    this.client = new Anthropic({ apiKey: this.config.get<string>('ANTHROPIC_API_KEY') });
  }

  /**
   * Runs one tool, scoped to businessId - the only place tool names map to
   * real service calls. Every "propose_*" tool is handled the same way
   * here: it never calls a service, it just records what the model wants
   * to do into `pending` for the user to see and approve (or reject) in
   * the UI - see executeAction() for what actually runs on approval.
   */
  private async runTool(name: string, input: any, businessId: string, pending: ProposedAction[]): Promise<unknown> {
    if (name.startsWith('propose_')) {
      const { summary, ...params } = input ?? {};
      const type = name.slice('propose_'.length) as ActionType;
      const action: ProposedAction = { id: randomUUID(), type, summary: String(summary ?? ''), params };
      pending.push(action);
      return {
        status: 'queued_for_approval',
        actionId: action.id,
        note: "Recorded. The user sees this as a card with Approve/Reject in the chat - nothing happens until they click Approve. Keep planning, or wrap up your reply now.",
      };
    }

    switch (name) {
      case 'search_invoices': {
        const rows = await this.invoicesService.findAll(
          { search: input.search, status: input.status, accountId: input.accountId },
          businessId,
        );
        return rows.slice(0, 25).map((i) => ({
          id: i.id,
          invoiceNumber: i.invoiceNumber,
          title: i.title,
          status: i.status,
          amountCents: i.amountCents,
          dueDate: i.dueDate,
          customer: i.account?.name,
          property: i.property?.name,
        }));
      }
      case 'get_invoice': {
        const inv: any = await this.invoicesService.findOne(input.invoiceId, businessId);
        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          title: inv.title,
          status: inv.status,
          amountCents: inv.amountCents,
          issueDate: inv.issueDate,
          dueDate: inv.dueDate,
          customer: inv.account ? { id: inv.account.id, name: inv.account.name } : undefined,
          property: inv.property?.name,
          job: inv.job?.title,
          items: (inv.items ?? []).map((it: any) => ({
            id: it.id,
            description: it.description,
            quantity: it.quantity,
            unitPriceCents: it.unitPriceCents,
          })),
        };
      }
      case 'search_jobs': {
        const rows = await this.jobsService.findAll(
          { search: input.search, status: input.status, accountId: input.accountId },
          businessId,
        );
        return rows.slice(0, 25).map((j) => ({
          id: j.id,
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
          properties: a.properties.map((p) => ({ id: p.id, name: p.name })),
        }));
      }
      case 'search_quotes': {
        const rows = await this.quotesService.findAll(
          { search: input.search, status: input.status, accountId: input.accountId },
          businessId,
        );
        return rows.slice(0, 25).map((q) => ({
          id: q.id,
          quoteNumber: q.quoteNumber,
          notes: q.notes,
          status: q.status,
          amountCents: q.amountCents,
          customer: q.account?.name,
          property: q.property?.name,
        }));
      }
      case 'get_quote': {
        const q: any = await this.quotesService.findOne(input.quoteId, businessId);
        return {
          id: q.id,
          quoteNumber: q.quoteNumber,
          notes: q.notes,
          status: q.status,
          amountCents: q.amountCents,
          issueDate: q.issueDate,
          customer: q.account ? { id: q.account.id, name: q.account.name } : undefined,
          property: q.property?.name,
          job: q.job?.title,
          invoice: q.invoice ? { id: q.invoice.id, invoiceNumber: q.invoice.invoiceNumber } : undefined,
          items: (q.items ?? []).map((it: any) => ({
            id: it.id,
            description: it.description,
            quantity: it.quantity,
            unitPriceCents: it.unitPriceCents,
          })),
        };
      }
      default:
        return { error: `Unknown tool: ${name}` };
    }
  }

  async chat(
    businessId: string,
    history: { role: 'user' | 'assistant'; content: string }[],
  ): Promise<{ reply: string; actions: ProposedAction[] }> {
    const messages: Anthropic.MessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
    const pending: ProposedAction[] = [];

    for (let i = 0; i < MAX_TOOL_LOOPS; i++) {
      let response: Anthropic.Message;
      try {
        response = await this.client.messages.create({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: SYSTEM_PROMPT,
          thinking: { type: 'adaptive' },
          output_config: { effort: 'high' },
          tools: TOOLS,
          messages,
        });
      } catch (err) {
        this.logger.error(`Claude request failed: ${(err as Error).message}`);
        if (err instanceof Anthropic.RateLimitError) {
          throw new BadRequestException("I'm getting a lot of requests right now - try again in a moment.");
        }
        if (err instanceof Anthropic.APIError) {
          throw new BadRequestException('Something went wrong talking to the assistant - try again.');
        }
        throw err;
      }

      if (response.stop_reason === 'refusal') {
        return { reply: "I can't help with that.", actions: pending };
      }

      if (response.stop_reason !== 'tool_use') {
        const text = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
        return { reply: text?.text ?? '', actions: pending };
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
            const output = await this.runTool(tu.name, tu.input, businessId, pending);
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

    return {
      reply: 'That took more digging than I can do in one go - try narrowing your question a bit.',
      actions: pending,
    };
  }

  private requireId(value: unknown, field: string): string {
    if (typeof value !== 'string' || !value) throw new BadRequestException(`Missing ${field}.`);
    return value;
  }

  /** plainToInstance + class-validator, the same validation the real REST DTOs get from Nest's global ValidationPipe. */
  private async toDto<T extends object>(cls: new () => T, params: unknown): Promise<T> {
    const instance = plainToInstance(cls, params ?? {});
    const errors = await validate(instance as object, { whitelist: true });
    if (errors.length) {
      const flatten = (e: (typeof errors)[number]): string[] => [
        ...Object.values(e.constraints ?? {}),
        ...(e.children ?? []).flatMap(flatten),
      ];
      throw new BadRequestException(errors.flatMap(flatten).join('; ') || 'Invalid input.');
    }
    return instance;
  }

  /**
   * What actually runs when the user clicks Approve on a proposed action -
   * the only place a chat-originated change reaches a real service. `type`
   * and `params` are exactly what was shown on the approval card; params
   * are re-validated here against the same DTOs the REST endpoints use, so
   * this has no more trust than the user driving the UI by hand.
   */
  async executeAction(
    type: ActionType,
    rawParams: Record<string, unknown>,
    userId: string,
    businessId: string,
  ): Promise<{ result: unknown; link?: string }> {
    switch (type) {
      case 'create_customer': {
        const dto = await this.toDto(CreateAccountDto, rawParams);
        const account = await this.accountsService.create(dto, businessId);
        return { result: account, link: `/accounts/${account.id}` };
      }
      case 'add_property': {
        const dto = await this.toDto(CreatePropertyDto, rawParams);
        const property: any = await this.propertiesService.create(dto, businessId);
        return { result: property, link: property.accountId ? `/accounts/${property.accountId}` : undefined };
      }
      case 'add_contact': {
        const dto = await this.toDto(CreateContactDto, rawParams);
        const contact: any = await this.contactsService.create(dto, businessId);
        return { result: contact, link: contact.accountId ? `/accounts/${contact.accountId}` : undefined };
      }
      case 'create_job': {
        const dto = await this.toDto(CreateJobDto, rawParams);
        const job: any = await this.jobsService.create(dto, userId, businessId);
        return { result: job, link: `/jobs/${job.id}` };
      }
      case 'update_job': {
        const { jobId, ...rest } = rawParams as Record<string, unknown>;
        const id = this.requireId(jobId, 'jobId');
        const dto = await this.toDto(UpdateJobDto, rest);
        const job = await this.jobsService.update(id, dto, businessId);
        return { result: job, link: `/jobs/${id}` };
      }
      case 'create_quote': {
        const dto = await this.toDto(CreateQuoteDto, rawParams);
        const quote: any = await this.quotesService.create(dto, userId, businessId);
        return { result: quote, link: `/quotes/${quote.id}` };
      }
      case 'add_quote_item': {
        const { quoteId, ...rest } = rawParams as Record<string, unknown>;
        const id = this.requireId(quoteId, 'quoteId');
        const dto = await this.toDto(QuoteItemInputDto, rest);
        const quote = await this.quotesService.addItem(id, dto, businessId);
        return { result: quote, link: `/quotes/${id}` };
      }
      case 'update_quote_item': {
        const { quoteId, itemId, ...rest } = rawParams as Record<string, unknown>;
        const id = this.requireId(quoteId, 'quoteId');
        const itId = this.requireId(itemId, 'itemId');
        const dto = await this.toDto(UpdateQuoteItemDto, rest);
        const quote = await this.quotesService.updateItem(id, itId, dto, businessId);
        return { result: quote, link: `/quotes/${id}` };
      }
      case 'remove_quote_item': {
        const { quoteId, itemId } = rawParams as Record<string, unknown>;
        const id = this.requireId(quoteId, 'quoteId');
        const itId = this.requireId(itemId, 'itemId');
        const quote = await this.quotesService.removeItem(id, itId, businessId);
        return { result: quote, link: `/quotes/${id}` };
      }
      case 'approve_quote': {
        const { quoteId } = rawParams as Record<string, unknown>;
        const id = this.requireId(quoteId, 'quoteId');
        const quote: any = await this.quotesService.approve(id, userId, businessId);
        const invoiceId = quote?.invoice?.id;
        return { result: quote, link: invoiceId ? `/invoices/${invoiceId}` : `/quotes/${id}` };
      }
      case 'remove_quote': {
        const { quoteId } = rawParams as Record<string, unknown>;
        const id = this.requireId(quoteId, 'quoteId');
        const result = await this.quotesService.remove(id, businessId);
        return { result, link: '/quotes' };
      }
      case 'create_invoice': {
        const dto = await this.toDto(CreateInvoiceDto, rawParams);
        const invoice: any = await this.invoicesService.create(dto, userId, businessId);
        return { result: invoice, link: `/invoices/${invoice.id}` };
      }
      case 'add_invoice_item': {
        const { invoiceId, ...rest } = rawParams as Record<string, unknown>;
        const id = this.requireId(invoiceId, 'invoiceId');
        const dto = await this.toDto(InvoiceItemInputDto, rest);
        const invoice = await this.invoicesService.addItem(id, dto, businessId);
        return { result: invoice, link: `/invoices/${id}` };
      }
      case 'update_invoice_item': {
        const { invoiceId, itemId, ...rest } = rawParams as Record<string, unknown>;
        const id = this.requireId(invoiceId, 'invoiceId');
        const itId = this.requireId(itemId, 'itemId');
        const dto = await this.toDto(UpdateInvoiceItemDto, rest);
        const invoice = await this.invoicesService.updateItem(id, itId, dto, businessId);
        return { result: invoice, link: `/invoices/${id}` };
      }
      case 'remove_invoice_item': {
        const { invoiceId, itemId } = rawParams as Record<string, unknown>;
        const id = this.requireId(invoiceId, 'invoiceId');
        const itId = this.requireId(itemId, 'itemId');
        const invoice = await this.invoicesService.removeItem(id, itId, businessId);
        return { result: invoice, link: `/invoices/${id}` };
      }
      case 'update_invoice': {
        const { invoiceId, title, dueDate } = rawParams as Record<string, unknown>;
        const id = this.requireId(invoiceId, 'invoiceId');
        const dto = await this.toDto(UpdateInvoiceDto, { title, dueDate });
        const invoice = await this.invoicesService.update(id, dto, businessId);
        return { result: invoice, link: `/invoices/${id}` };
      }
      case 'mark_invoice_sent': {
        const { invoiceId } = rawParams as Record<string, unknown>;
        const id = this.requireId(invoiceId, 'invoiceId');
        const invoice = await this.invoicesService.markSent(id, businessId);
        return { result: invoice, link: `/invoices/${id}` };
      }
      case 'send_all_draft_invoices': {
        const result = await this.invoicesService.sendAllDrafts(businessId);
        return { result, link: '/invoices' };
      }
      case 'cancel_invoice': {
        const { invoiceId } = rawParams as Record<string, unknown>;
        const id = this.requireId(invoiceId, 'invoiceId');
        const invoice = await this.invoicesService.cancel(id, businessId);
        return { result: invoice, link: `/invoices/${id}` };
      }
      case 'record_payment': {
        const params: Record<string, unknown> = { ...rawParams };
        if (!params.paidAt) params.paidAt = new Date().toISOString();
        const dto = await this.toDto(RecordPaymentDto, params);
        const payment = await this.paymentsService.record(dto, userId, businessId);
        const link = dto.invoiceIds.length === 1 ? `/invoices/${dto.invoiceIds[0]}` : '/invoices';
        return { result: payment, link };
      }
      case 'send_payment_reminders': {
        const { accountId } = rawParams as { accountId?: string };
        const flaggedOverdue = await this.remindersService.flagOverdueInvoices(accountId, businessId);
        const digest = await this.remindersService.sendOverdueDigest(accountId, businessId);
        return { result: { flaggedOverdue, ...digest }, link: accountId ? `/accounts/${accountId}` : '/invoices' };
      }
      default:
        throw new BadRequestException(`Unknown action type: ${type}`);
    }
  }
}
