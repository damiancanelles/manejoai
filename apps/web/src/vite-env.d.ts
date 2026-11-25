/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Set at build time to point the frontend at a different API origin
  // instead of the default same-origin relative "/api/..." path - used for
  // the staging site, which calls its own separate backend directly.
  readonly VITE_API_BASE_URL?: string;
  // Address behind every "Contact support" link (see src/lib/support.ts).
  readonly VITE_SUPPORT_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
