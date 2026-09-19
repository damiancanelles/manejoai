// The assistant returns web-shaped paths like "/invoices/abc123" (see
// assistant.service.ts's `link` field and its [label](/path) markdown links)
// since the same backend serves both clients. There's no browser URL here,
// so this maps those paths onto the mobile nav tree - cross-tab where the
// web route's screen lives under a different tab (Quotes/Customers are
// under "More" on mobile, not their own tabs).
type AnyNav = { navigate: (...args: any[]) => void };

export function openAssistantLink(navigation: AnyNav, path: string) {
  let match = path.match(/^\/invoices\/([^/]+)/);
  if (match) return navigation.navigate('Invoices', { screen: 'InvoiceDetail', params: { invoiceId: match[1] } });
  if (path === '/invoices') return navigation.navigate('Invoices', { screen: 'InvoicesList' });

  match = path.match(/^\/quotes\/([^/]+)/);
  if (match) return navigation.navigate('More', { screen: 'Quotes', params: { screen: 'QuoteDetail', params: { quoteId: match[1] } } });
  if (path === '/quotes') return navigation.navigate('More', { screen: 'Quotes', params: { screen: 'QuotesList' } });

  match = path.match(/^\/jobs\/([^/]+)/);
  if (match) return navigation.navigate('Jobs', { screen: 'JobDetail', params: { jobId: match[1] } });
  if (path === '/jobs') return navigation.navigate('Jobs', { screen: 'JobsList' });

  match = path.match(/^\/accounts\/([^/]+)/);
  if (match) return navigation.navigate('More', { screen: 'Customers', params: { screen: 'CustomerDetail', params: { accountId: match[1] } } });
}
