export type Tone = 'neutral' | 'accent' | 'warning' | 'success' | 'danger';

// One shared mapping for every status badge (invoices, jobs, quotes) -
// mirrors the semantics scattered across the web app's status pill classes
// (bg-green-100/text-green-700 for PAID, bg-red-100 for OVERDUE, etc.),
// centralized here so a new screen doesn't have to reinvent it.
const TONES: Record<string, Tone> = {
  DRAFT: 'neutral',
  SENT: 'accent',
  OVERDUE: 'danger',
  PAID: 'success',
  CANCELED: 'neutral',
  SCHEDULED: 'warning',
  IN_PROGRESS: 'accent',
  COMPLETED: 'success',
  PENDING: 'warning',
  APPROVED: 'success',
};

export function statusTone(status: string): Tone {
  return TONES[status] ?? 'neutral';
}
