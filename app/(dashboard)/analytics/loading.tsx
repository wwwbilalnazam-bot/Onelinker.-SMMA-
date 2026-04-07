import React from "react";

// Skeleton for the Analytics page
// Matches: date range selector, 4 stat cards, area chart, bar chart, top posts list

function Sk({ className, delay = 0, style }: { className: string; delay?: number; style?: React.CSSProperties }) {
  return (
    <div
      className={`shimmer rounded-lg ${className}`}
      style={{ ...(delay ? { animationDelay: `${delay}ms` } : undefined), ...style }}
    />
  );
}

function StatCardSkeleton({ delay }: { delay: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <Sk className="h-9 w-9 rounded-lg" delay={delay} />
        <Sk className="h-4 w-14 rounded-full" delay={delay + 40} />
      </div>
      <Sk className="h-8 w-20 mb-1.5" delay={delay + 60} />
      <Sk className="h-3.5 w-24" delay={delay + 90} />
    </div>
  );
}

function TopPostSkeleton({ delay }: { delay: number }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/40 last:border-0">
      <Sk className="h-6 w-6 rounded-full shrink-0 mt-0.5" delay={delay} />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Sk className="h-4 w-full" delay={delay + 30} />
        <Sk className="h-3.5 w-2/3" delay={delay + 60} />
        <div className="flex gap-3 pt-0.5">
          <Sk className="h-3.5 w-12" delay={delay + 80} />
          <Sk className="h-3.5 w-12" delay={delay + 100} />
          <Sk className="h-3.5 w-16" delay={delay + 120} />
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsLoading() {
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Sk className="h-7 w-32" />
          <Sk className="h-4 w-52" delay={40} />
        </div>
        {/* Date range buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/40 border border-border/40">
          <Sk className="h-7 w-12 rounded-md" />
          <Sk className="h-7 w-14 rounded-md" delay={40} />
          <Sk className="h-7 w-14 rounded-md" delay={80} />
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardSkeleton delay={0} />
        <StatCardSkeleton delay={60} />
        <StatCardSkeleton delay={120} />
        <StatCardSkeleton delay={180} />
      </div>

      {/* Main area chart */}
      <div className="rounded-xl border border-border/60 bg-card p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="space-y-2">
            <Sk className="h-5 w-36" />
            <Sk className="h-3.5 w-52" delay={40} />
          </div>
          <div className="flex gap-4">
            {[0, 60, 120].map((d) => (
              <div key={d} className="flex items-center gap-1.5">
                <Sk className="h-2.5 w-2.5 rounded-full" delay={d} />
                <Sk className="h-3 w-14" delay={d + 30} />
              </div>
            ))}
          </div>
        </div>
        {/* Chart area — Y axis + bars */}
        <div className="flex gap-3 h-56">
          <div className="flex flex-col justify-between py-1">
            {[0, 60, 120, 180, 240].map((d) => (
              <Sk key={d} className="h-3 w-8" delay={d} />
            ))}
          </div>
          <div className="flex-1 flex items-end gap-px">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end gap-0.5">
                <Sk
                  className="w-full rounded-t-sm"
                  style={{
                    height: `${30 + Math.sin(i * 0.8) * 40 + Math.random() * 30}%`,
                    animationDelay: `${i * 40}ms`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
        {/* X axis */}
        <div className="flex justify-between mt-2 pl-11">
          {[0, 60, 120, 180, 240, 300, 360, 420, 480, 540].map((d) => (
            <Sk key={d} className="h-3 w-8" delay={d} />
          ))}
        </div>
      </div>

      {/* Bottom row: bar chart + top posts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Platform bar chart */}
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <Sk className="h-5 w-36 mb-1.5" />
          <Sk className="h-3.5 w-48 mb-5" delay={40} />
          <div className="space-y-4">
            {[0, 70, 140, 210].map((d) => (
              <div key={d} className="flex items-center gap-3">
                <Sk className="h-4 w-16" delay={d} />
                <div className="flex-1 h-7 bg-muted/30 rounded-md overflow-hidden">
                  <Sk
                    className="h-full rounded-md"
                    style={{
                      width: `${40 + (d / 210) * 50}%`,
                      animationDelay: `${d}ms`,
                    }}
                  />
                </div>
                <Sk className="h-3.5 w-10 shrink-0" delay={d + 40} />
              </div>
            ))}
          </div>
        </div>

        {/* Top posts */}
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <Sk className="h-5 w-32 mb-1.5" />
          <Sk className="h-3.5 w-44 mb-4" delay={40} />
          <TopPostSkeleton delay={0} />
          <TopPostSkeleton delay={80} />
          <TopPostSkeleton delay={160} />
        </div>

      </div>
    </div>
  );
}
