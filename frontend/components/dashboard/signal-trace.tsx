"use client";

/**
 * The dashboard's signature element: a quiet animated waveform that
 * reads as live sensor/telemetry data streaming in, not a decorative
 * gradient. Pure SVG + CSS animation — no JS render loop, so it's
 * cheap enough to run continuously in a header.
 */
export function SignalTrace({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 80"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="trace-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0" />
          <stop offset="15%" stopColor="var(--color-accent)" stopOpacity="0.7" />
          <stop offset="85%" stopColor="var(--color-accent)" stopOpacity="0.7" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0,40 L60,40 L80,40 L95,12 L110,68 L125,24 L140,40 L220,40 L240,40 L255,18 L268,58 L280,4 L292,72 L305,40 L400,40 L560,40 L580,40 L598,20 L612,55 L628,10 L642,66 L656,40 L760,40 L920,40 L940,40 L956,16 L970,62 L984,28 L998,40 L1200,40"
        fill="none"
        stroke="url(#trace-fade)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1200}
        style={{
          strokeDasharray: 1200,
          animation: "trace-draw 3.2s linear infinite, trace-glow 3.2s ease-in-out infinite",
        }}
      />
    </svg>
  );
}
