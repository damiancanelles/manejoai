/** The app's paint-roller mark - same artwork as public/favicon.svg, inlined so it can be sized/reused without an extra request. */
export default function LogoMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <linearGradient id="logoBg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#logoBg)" />
      <rect x="16" y="14" width="28" height="13" rx="6.5" fill="#ffffff" />
      <rect x="36" y="24" width="5" height="20" rx="2.5" fill="#ffffff" />
      <rect x="30" y="42" width="17" height="5" rx="2.5" fill="#ffffff" />
      <circle cx="18" cy="45" r="3.2" fill="#f59e0b" />
    </svg>
  );
}
