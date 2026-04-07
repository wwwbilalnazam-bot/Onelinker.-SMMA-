// Skeleton for the Media Library page
// Matches: header, storage bar, filter tabs, media grid

function Sk({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <div
      className={`shimmer rounded-lg ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    />
  );
}

// Different simulated aspect ratios for visual variety
const GRID_ITEMS = [
  { h: "aspect-square" },
  { h: "aspect-video" },
  { h: "aspect-square" },
  { h: "aspect-square" },
  { h: "aspect-video" },
  { h: "aspect-square" },
  { h: "aspect-square" },
  { h: "aspect-square" },
];

export default function MediaLoading() {
  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Sk className="h-7 w-36" />
          <Sk className="h-4 w-48" delay={40} />
        </div>
        <Sk className="h-9 w-32" delay={80} />
      </div>

      {/* Storage bar card */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <Sk className="h-4 w-20" />
          <Sk className="h-4 w-28" delay={40} />
        </div>
        {/* Track */}
        <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
          <Sk className="h-full w-2/5 rounded-full" />
        </div>
      </div>

      {/* Toolbar: search + filters + view toggle */}
      <div className="flex items-center gap-3">
        <Sk className="h-9 flex-1 max-w-xs" />
        <div className="flex items-center gap-1.5">
          {[0, 50, 100].map((d) => (
            <Sk key={d} className="h-8 w-20 rounded-lg" delay={d} />
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Sk className="h-8 w-8 rounded-lg" delay={40} />
          <Sk className="h-8 w-8 rounded-lg" delay={80} />
        </div>
      </div>

      {/* Media grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {GRID_ITEMS.map(({ h }, i) => (
          <div
            key={i}
            className="group relative rounded-xl border border-border/60 bg-card overflow-hidden"
          >
            <div className={h}>
              <Sk className="absolute inset-0 rounded-none" delay={i * 50} />
            </div>
            {/* Filename + size row */}
            <div className="px-3 py-2.5 space-y-1.5 border-t border-border/40">
              <Sk className="h-3.5 w-3/4" delay={i * 50 + 60} />
              <Sk className="h-3 w-1/2" delay={i * 50 + 90} />
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
