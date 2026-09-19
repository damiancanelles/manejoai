// Param lists kept small on purpose for WO-0 - each stack only knows about
// the placeholder screens that exist today. Expect these to grow (e.g.
// JobsStackParamList gaining JobDetail: { jobId: string }) as WO-1/WO-2
// screens replace the placeholders.
export type JobsStackParamList = {
  JobsList: undefined;
};

export type InvoicesStackParamList = {
  InvoicesList: undefined;
};

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
