# manejoai

Internal tool that replaces the Chase invoicing app + Excel tracker combo with
one system: invoice creation and tracking, job/work records with photos, and
automatic payment-reminder emails.

**Status: working scaffold, not a finished product.** The core data model,
API, and screens are in place and internally consistent, but this hasn't been
installed or run yet - see "Known gaps" below before relying on it.

## Stack

- **API**: NestJS + TypeScript, Postgres via Prisma. `apps/api`
- **Web**: React + Vite + TypeScript + Tailwind. `apps/web`
- One language (TypeScript) across both, per your preference - a future
  React Native mobile app can reuse the same API and most of the same
  business logic.

## What's here

- **Accounts** (customers): `INDIVIDUAL` or `MULTIFAMILY`. A `MULTIFAMILY`
  account can have multiple `Properties` and multiple `Contacts` with roles
  (owner, sales, invoicing/AP) - each contact can be flagged to receive
  invoices and/or payment reminders.
- **Jobs**: work performed for an account (optionally tied to one property),
  with photos attached, and can be linked to the invoice it generated.
- **Invoices**: draft → sent → overdue → paid/canceled, with a running log of
  every reminder email sent against it.
- **Payment reminders**: a daily scheduled job flags invoices overdue once
  their due date passes, waits `REMINDER_GRACE_PERIOD_DAYS` (default 14, "a
  couple weeks") before the first reminder, then repeats every
  `REMINDER_FOLLOWUP_INTERVAL_DAYS` (default 14) until the invoice is marked
  paid or canceled. Email sending is behind a pluggable driver - defaults to
  logging to the console so nothing goes out until you wire up a real
  provider (see below).
- **Excel import**: `apps/api/scripts/import-excel.ts` brings your existing
  invoice history in. See the comment at the top of that file for the
  expected columns and the assumptions it makes.

## First-time setup

1. **Start Postgres**: `docker compose up -d` (requires Docker Desktop).
2. **Install dependencies**: `npm install` from the repo root (this is an npm
   workspaces monorepo - one install covers both apps).
3. **Configure the API**: copy `apps/api/.env.example` to `apps/api/.env` and
   at minimum change `JWT_SECRET` to a random string.
4. **Run migrations**: `npm run prisma:migrate` (creates the tables from
   `apps/api/prisma/schema.prisma`).
5. **Create your admin login**: `npm run seed`. Prints an email/password to
   the terminal - use that to log in (there's no "change password" screen
   yet, see Known gaps).
6. **(Optional) Import your Excel history**:
   `npm run import:excel --workspace=@manejoai/api -- "/path/to/your/file.xlsx"`
7. **Run it**: `npm run dev:api` in one terminal, `npm run dev:web` in
   another. The web app is at http://localhost:5173 and proxies API calls to
   the NestJS server on port 3001.

## Setting up real payment reminder emails

Right now `MAIL_DRIVER=console` in `.env` just logs reminder emails instead of
sending them, so it's safe to try the reminder flow against real invoices
without emailing anyone by accident. You picked a dedicated email service
over sending through Gmail - `apps/api/src/mail/mail.service.ts` already has
a `resend` driver wired up (https://resend.com has a free tier and a simple
API); set `MAIL_DRIVER=resend` and `RESEND_API_KEY` in `.env` to switch it on.
If you'd rather use Postmark, SendGrid, or something else, that's the only
file that needs to change.

## Known gaps / next steps

This is a starting scaffold, not the finished app - built without the ability
to `npm install` or run a build in the environment that wrote it, so treat
the very first `npm install` on your machine as the real first test. Beyond
that, worth knowing before you rely on this day to day:

- No "forgot password" or "change password" screen - use Prisma Studio
  (`npm run prisma:studio`) to update a user's `passwordHash` by hand for now
  if needed.
- No customer-facing portal or online payment collection - matches what you
  described (checks/wire, tracked manually), but flag it if that changes.
- The Excel importer defaults every imported account to `INDIVIDUAL` type and
  a flat 14-day due date (the old tracker didn't have a due-date column) -
  reclassify multifamily accounts and adjust due dates in the UI after
  importing.
- Only one staff role distinction exists (`ADMIN` vs `STAFF`) with no
  permission differences yet between them - fine to start, worth revisiting
  once more than one or two people are using it.
- No automated tests yet.
