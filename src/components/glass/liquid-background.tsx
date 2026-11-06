/** Fundo "água e espuma": blobs desfocados em movimento lento (só transform; respeita reduced-motion). */
export function LiquidBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      <div className="animate-drift absolute -top-[18%] -left-[12%] size-[62vmax] rounded-full bg-[var(--blob-1)] opacity-55 blur-[90px] will-change-transform dark:opacity-40" />
      <div className="animate-drift-slow absolute top-[28%] -right-[18%] size-[55vmax] rounded-full bg-[var(--blob-2)] opacity-60 blur-[100px] will-change-transform dark:opacity-35" />
      <div className="animate-drift absolute -bottom-[25%] left-[10%] size-[50vmax] rounded-full bg-[var(--blob-3)] opacity-50 blur-[110px] will-change-transform [animation-delay:-12s] dark:opacity-35" />
      <div className="animate-drift-slow absolute top-[8%] left-[38%] size-[26vmax] rounded-full bg-[var(--blob-4)] opacity-40 blur-[80px] will-change-transform [animation-delay:-20s] dark:opacity-25" />
      {/* bolhas de espuma */}
      <svg className="absolute inset-0 size-full opacity-[0.35] dark:opacity-[0.12]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bubble" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="white" stopOpacity="0.95" />
            <stop offset="60%" stopColor="white" stopOpacity="0.15" />
            <stop offset="100%" stopColor="white" stopOpacity="0.4" />
          </radialGradient>
        </defs>
        {[
          [8, 72, 10], [15, 20, 6], [88, 14, 9], [76, 82, 14], [52, 92, 7], [94, 52, 5], [30, 46, 4], [64, 30, 5],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={`${x}%`} cy={`${y}%`} r={r * 2} fill="url(#bubble)" />
        ))}
      </svg>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_40%,var(--background)_100%)] opacity-60" />
    </div>
  );
}
