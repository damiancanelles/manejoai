// The full set of changes the Pro assistant can propose. Every one of these
// is "proposed only" from the model's side (see TOOLS/runTool in
// assistant.service.ts) - nothing here ever touches the database on its
// own. A ProposedAction is just a plan the user reviews and either approves
// (POST /assistant/actions/execute, which is what actually calls the real,
// already-guarded service) or rejects (discarded client-side, no API call).
export const ACTION_TYPES = [
  'create_customer',
  'add_property',
  'add_contact',
  'create_job',
  'update_job',
  'create_quote',
  'add_quote_item',
  'update_quote_item',
  'remove_quote_item',
  'approve_quote',
  'remove_quote',
  'create_invoice',
  'add_invoice_item',
  'update_invoice_item',
  'remove_invoice_item',
  'update_invoice',
  'mark_invoice_sent',
  'send_all_draft_invoices',
  'cancel_invoice',
  'record_payment',
  'send_payment_reminders',
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export interface ProposedAction {
  id: string;
  type: ActionType;
  // One sentence, written by the model, shown on the approval card - e.g.
  // "Create an invoice for Unit 413 Punch Out - $540, due Oct 10."
  summary: string;
  // The exact params the action will run with if approved - echoed back by
  // the client on POST /assistant/actions/execute and re-validated there
  // against the same DTOs the real REST endpoints use.
  params: Record<string, unknown>;
}
