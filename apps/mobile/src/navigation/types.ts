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
  InvoiceNew: undefined;
};

export type QuotesStackParamList = {
  QuotesList: undefined;
  QuoteDetail: { quoteId: string; quoteNumber?: string };
  QuoteNew: undefined;
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
  // Named MoreHome, not More, so this stack's landing screen doesn't share
  // a name with the "More" tab that hosts it - React Navigation warns about
  // ambiguous nested same-name screens otherwise ("More, More > More").
  MoreHome: undefined;
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

// A CREW account's entire app - two tabs, no nested stacks. See CrewTabs.tsx
// and RootNavigator's role branch.
export type CrewTabParamList = {
  Clock: undefined;
  Report: undefined;
};
