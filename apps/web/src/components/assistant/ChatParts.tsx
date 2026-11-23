import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { downloadStatementPdf } from '../../lib/statementPdf';
import { downloadInvoicePdfById } from '../../lib/invoicePdf';
import { downloadQuotePdfById } from '../../lib/quotePdf';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n';

export type ActionStatus = 'pending' | 'approving' | 'approved' | 'rejected' | 'error';

export interface UIAction {
  id: string;
  type: string;
  summary: string;
  params: Record<string, unknown>;
  status: ActionStatus;
  link?: string;
  error?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  images?: { mediaType: string; data: string }[];
  actions?: UIAction[];
}

// Matches a plain markdown link whose target is an in-app path, e.g.
// "[Unit 413 Punch Out](/invoices/abc123)" - anything else (plain text,
// links without that shape) passes through untouched.
const LINK_RE = /\[([^\]]+)\]\((\/[^\s)]+)\)/g;

// get_statement hands the assistant a /statements/account/<id> or
// /statements/property/<id> "link" (see assistant.service.ts) - it never
// opens a page, it's the chat's own signal to download a PDF right there.
const STATEMENT_RE = /^\/statements\/(account|property)\/([^/?]+)(?:\?(.*))?$/;

// An approved action whose link points at a real invoice or quote (creating
// one, approving a quote into an invoice, marking one sent, etc. - see every
// propose_* case in assistant.service.ts's executeAction) can offer a direct
// PDF download right on the card, same id the "View result" link already uses.
const INVOICE_LINK_RE = /^\/invoices\/([^/?]+)$/;
const QUOTE_LINK_RE = /^\/quotes\/([^/?]+)$/;

/** A statement link downloads a PDF on click instead of navigating - same visual style as a normal chat link. */
function StatementLink({ href, label }: { href: string; label: string }) {
  const { business } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const match = href.match(STATEMENT_RE);
    if (!match || !business) return;
    const [, scope, id, qs] = match;
    const params = new URLSearchParams(qs ?? '');
    setDownloading(true);
    setError(null);
    try {
      await downloadStatementPdf(
        scope as 'account' | 'property',
        id,
        business,
        params.get('dateFrom') ?? undefined,
        params.get('dateTo') ?? undefined,
      );
    } catch (err: any) {
      setError(err.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={downloading}
        className="font-medium text-indigo-600 underline hover:text-indigo-700 disabled:opacity-50"
      >
        {downloading ? '…' : label}
      </button>
      {error && <span className="ml-1 text-xs text-red-600">({error})</span>}
    </>
  );
}

/** Renders assistant text, turning `[label](/path)` into a real in-SPA navigation link - or, for a /statements/... path, a PDF-download button instead. */
export function ChatText({ text }: { text: string }) {
  const parts: (string | { label: string; href: string })[] = [];
  let lastIndex = 0;
  for (const m of text.matchAll(LINK_RE)) {
    if (m.index! > lastIndex) parts.push(text.slice(lastIndex, m.index));
    parts.push({ label: m[1], href: m[2] });
    lastIndex = m.index! + m[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return (
    <>
      {parts.map((part, i) =>
        typeof part === 'string' ? (
          <Fragment key={i}>{part}</Fragment>
        ) : STATEMENT_RE.test(part.href) ? (
          <StatementLink key={i} href={part.href} label={part.label} />
        ) : (
          <Link key={i} to={part.href} className="font-medium text-indigo-600 underline hover:text-indigo-700">
            {part.label}
          </Link>
        ),
      )}
    </>
  );
}

export function ActionCard({ action, onApprove, onReject }: { action: UIAction; onApprove: () => void; onReject: () => void }) {
  const t = useT();
  const { business } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const invoiceId = action.link?.match(INVOICE_LINK_RE)?.[1];
  const quoteId = action.link?.match(QUOTE_LINK_RE)?.[1];

  async function handleDownload() {
    if (!business || downloading) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      if (invoiceId) await downloadInvoicePdfById(invoiceId, business);
      else if (quoteId) await downloadQuotePdfById(quoteId, business);
    } catch (err: any) {
      setDownloadError(err.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-sm">
      <p className="text-slate-800">{action.summary}</p>
      {action.status === 'pending' && (
        <div className="mt-2 flex gap-2">
          <button
            onClick={onApprove}
            className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            {t('assistant.approve')}
          </button>
          <button
            onClick={onReject}
            className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            {t('assistant.reject')}
          </button>
        </div>
      )}
      {action.status === 'approving' && <p className="mt-1.5 text-xs text-slate-500">{t('assistant.approving')}</p>}
      {action.status === 'approved' && (
        <div className="mt-1.5 space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-green-700">✓ {t('assistant.approved')}</span>
            {action.link && (
              <Link to={action.link} className="font-medium text-indigo-600 underline hover:text-indigo-700">
                {t('assistant.viewResult')}
              </Link>
            )}
            {(invoiceId || quoteId) && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="font-medium text-indigo-600 underline hover:text-indigo-700 disabled:opacity-50"
              >
                {downloading ? '…' : t('common.downloadPdf')}
              </button>
            )}
          </div>
          {downloadError && <p className="text-xs text-red-600">{downloadError}</p>}
        </div>
      )}
      {action.status === 'rejected' && <p className="mt-1.5 text-xs text-slate-400">{t('assistant.rejected')}</p>}
      {action.status === 'error' && (
        <div className="mt-1.5 space-y-1.5">
          <p className="text-xs text-red-700">{action.error || t('assistant.actionFailed')}</p>
          <button
            onClick={onApprove}
            className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            {t('assistant.retry')}
          </button>
        </div>
      )}
    </div>
  );
}
