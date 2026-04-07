// Skeleton for the main dashboard home page
// Matches: stats grid, quick actions, recent posts list

function Sk({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <div
      className={`shimmer rounded-lg ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    />
  );
}

function StatCardSkeleton({ delay }: { delay: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <Sk className="h-9 w-9 rounded-lg" delay={delay} />
        <Sk className="h-4 w-16" delay={delay + 40} />
      </div>
      <Sk className="h-8 w-12 mb-1.5" delay={delay + 80} />
      <Sk className="h-3.5 w-24" delay={delay + 120} />
    </div>
  );
}

function PostRowSkeleton({ delay }: { delay: number }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5 border-b border-border/40 last:border-0">
      <Sk className="h-8 w-8 rounded-lg shrink-0 mt-0.5" delay={delay} />
      <div className="flex-1 min-w-0 space-y-2">
        <Sk className="h-4 w-full max-w-sm" delay={delay + 30} />
        <Sk className="h-3.5 w-2/3" delay={delay + 60} />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Sk className="h-5 w-16 rounded-full" delay={delay + 40} />
        <Sk className="h-4 w-20" delay={delay + 80} />
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Sk className="h-7 w-52" />
          <Sk className="h-4 w-36" delay={40} />
        </div>
        <Sk className="h-9 w-28" delay={80} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 60, 120, 180].map((d) => (
          <div key={d} className="rounded-xl border border-border/60 bg-card p-4">
            <Sk className="h-8 w-8 rounded-lg mb-3" delay={d} />
            <Sk className="h-4 w-20 mb-1.5" delay={d + 40} />
            <Sk className="h-3 w-28" delay={d + 80} />
          </div>
        ))}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardSkeleton delay={0} />
        <StatCardSkeleton delay={60} />
        <StatCardSkeleton delay={120} />
        <StatCardSkeleton delay={180} />
      </div>

      {/* Recent posts */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <Sk className="h-5 w-28" />
          <Sk className="h-4 w-16" delay={40} />
        </div>
        {/* Rows */}
        {[0, 80, 160, 240, 320].map((d) => (
          <PostRowSkeleton key={d} delay={d} />
        ))}
      </div>

    </div>
  );
}
