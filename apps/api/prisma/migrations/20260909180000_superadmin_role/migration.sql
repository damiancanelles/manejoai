-- A platform-level role that sees aggregate stats/activity across every
-- business (see the new platform/ module), not any one tenant's own data.
ALTER TYPE "StaffRole" ADD VALUE 'SUPERADMIN';
