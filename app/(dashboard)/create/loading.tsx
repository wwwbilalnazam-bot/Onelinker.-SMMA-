// Skeleton for the Compose page
// Matches: account selector, composer area, live preview panel

function Sk({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <div
      className={`shimmer rounded-lg ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    />
  );
}

export default function ComposeLoading() {
  return (
    <div className="flex h-full">

      {/* Left — editor */}
      <div className="flex-1 flex flex-col p-6 gap-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between">
          <Sk className="h-7 w-28" />
          <div className="flex items-center gap-2">
            <Sk className="h-9 w-24" delay={40} />
            <Sk className="h-9 w-24" delay={80} />
          </div>
        </div>

        {/* Account selector */}
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
          <Sk className="h-4 w-36" />
          <div className="flex gap-2 flex-wrap">
            {[0, 60, 120, 180, 240].map((d) => (
              <div key={d} className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2">
                <Sk className="h-6 w-6 rounded-md" delay={d} />
                <Sk className="h-3.5 w-20" delay={d + 40} />
              </div>
            ))}
          </div>
        </div>

        {/* Composer card */}
        <div className="flex-1 rounded-xl border border-border/60 bg-card overflow-hidden">
          {/* Textarea area */}
          <div className="p-4 space-y-3 min-h-[180px]">
            <Sk className="h-4 w-full" delay={20} />
            <Sk className="h-4 w-5/6" delay={60} />
            <Sk className="h-4 w-4/5" delay={100} />
            <Sk className="h-4 w-1/2" delay={140} />
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-border/40">
            {[0, 50, 100, 150, 200].map((d) => (
              <Sk key={d} className="h-7 w-16 rounded-lg" delay={d} />
            ))}
          </div>
        </div>

        {/* Schedule row */}
        <div className="rounded-xl border border-border/60 bg-card px-4 py-3.5 flex items-center gap-4">
          <Sk className="h-4 w-24" />
          <Sk className="h-9 flex-1 max-w-xs" delay={40} />
          <div className="ml-auto flex gap-2">
            <Sk className="h-9 w-28" delay={60} />
            <Sk className="h-9 w-28" delay={100} />
          </div>
        </div>

      </div>

      {/* Right — live preview */}
      <div className="w-72 shrink-0 border-l border-border/50 flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/40 space-y-2">
          <Sk className="h-5 w-28" />
          <Sk className="h-3.5 w-36" delay={40} />
        </div>

        {/* Platform tabs */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border/40">
          {[0, 60, 120].map((d) => (
            <Sk key={d} className="h-7 w-20 rounded-lg" delay={d} />
          ))}
        </div>

        {/* Preview card */}
        <div className="flex-1 p-4">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <Sk className="h-9 w-9 rounded-full" />
              <div className="space-y-1.5">
                <Sk className="h-3.5 w-24" delay={40} />
                <Sk className="h-3 w-16" delay={70} />
              </div>
            </div>
            <Sk className="h-4 w-full" delay={80} />
            <Sk className="h-4 w-4/5" delay={110} />
            <Sk className="h-4 w-3/5" delay={140} />
            {/* Image placeholder */}
            <Sk className="h-36 w-full rounded-xl" delay={160} />
            {/* Action row */}
            <div className="flex items-center gap-4 pt-1">
              <Sk className="h-4 w-10" delay={180} />
              <Sk className="h-4 w-10" delay={210} />
              <Sk className="h-4 w-10" delay={240} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
