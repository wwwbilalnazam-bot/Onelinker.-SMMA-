// Skeleton for the Accounts page
// Matches: header, connect-account prompt, account card list

function Sk({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <div
      className={`shimmer rounded-lg ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    />
  );
}

function AccountCardSkeleton({ delay }: { delay: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-3">
        {/* Platform icon */}
        <Sk className="h-11 w-11 rounded-xl shrink-0" delay={delay} />

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <Sk className="h-4 w-28" delay={delay + 30} />
            <Sk className="h-5 w-20 rounded-full" delay={delay + 50} />
          </div>
          <Sk className="h-3.5 w-20" delay={delay + 70} />
          <div className="flex gap-3 pt-0.5">
            <Sk className="h-3 w-24" delay={delay + 90} />
            <Sk className="h-3 w-24" delay={delay + 110} />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Sk className="h-8 w-14" delay={delay + 60} />
          <Sk className="h-8 w-8" delay={delay + 80} />
        </div>
      </div>
    </div>
  );
}

function PlatformChipSkeleton({ delay }: { delay: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 flex items-center gap-3">
      <Sk className="h-9 w-9 rounded-lg" delay={delay} />
      <Sk className="h-4 w-20" delay={delay + 40} />
    </div>
  );
}

export default function AccountsLoading() {
  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Sk className="h-7 w-40" />
          <Sk className="h-4 w-64" delay={40} />
        </div>
        <Sk className="h-9 w-36" delay={80} />
      </div>

      {/* Connect platform chips */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <Sk className="h-4 w-36 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {[0, 40, 80, 120, 160, 200, 240, 280, 320, 360].map((d) => (
            <PlatformChipSkeleton key={d} delay={d} />
          ))}
        </div>
      </div>

      {/* Section label */}
      <div className="flex items-center gap-3">
        <Sk className="h-4 w-36" />
        <div className="flex-1 h-px bg-border/40" />
        <Sk className="h-4 w-16" delay={40} />
      </div>

      {/* Account cards */}
      <div className="space-y-3">
        <AccountCardSkeleton delay={0} />
        <AccountCardSkeleton delay={80} />
        <AccountCardSkeleton delay={160} />
      </div>

      {/* Info box */}
      <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-2">
        <Sk className="h-4 w-40" />
        <Sk className="h-3.5 w-full" delay={40} />
        <Sk className="h-3.5 w-5/6" delay={80} />
      </div>

    </div>
  );
}
