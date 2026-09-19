// Param lists for every stack. Grows as WO-1/WO-2 screens replace
// placeholders - JobDetail/QuoteDetail/InvoiceDetail already take real ids
// now that their list screens exist and can navigate to them.
export type JobsStackParamList = {
  JobsList: undefined;
  JobDetail: { jobId: string; title?: string };
  JobNew: undefined;
};

export type InvoicesStackParamList = {
  InvoicesList: undefined;
  InvoiceDetail: { invoiceId: string; invoiceNumber?: string };
};

export type QuotesStackParamList = {
  QuotesList: undefined;
  QuoteDetail: { quoteId: string; quoteNumber?: string };
};

export type CustomersStackParamList = {
  CustomersList: undefined;
  CustomerDetail: { accountId: string; accountName?: string };
};

// Customers/Quotes below are entry points into their own nested stack
// (CustomersStack/QuotesStack) rather than a single screen - see
// MoreStack.tsx. Their own List/Detail params live in the param lists
// above, not here.
export type MoreStackParamList = {
  More: undefined;
  Customers: undefined;
  Quotes: undefined;
  JobReports: undefined;
  Reports: undefined;
  Settings: undefined;
  Billing: undefined;
};

export type AppTabParamList = {
  Dashboard: undefined;
  Jobs: undefined;
  Invoices: undefined;
  Assistant: undefined;
  More: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
};
