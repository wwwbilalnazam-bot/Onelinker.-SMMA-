function Sk({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <div
      className={`shimmer rounded-lg ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    />
  );
}

function PostCardSkeleton({ delay }: { delay: number }) {
  return (
    <div className="relative flex gap-4 rounded-2xl border border-border/50 bg-card p-5 overflow-hidden">
      {/* Checkbox */}
      <Sk className="h-5 w-5 rounded-md shrink-0" delay={delay} />

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Sk className="h-4 w-full max-w-md" delay={delay + 20} />
            <Sk className="h-4 w-3/5" delay={delay + 50} />
          </div>
          <Sk className="h-6 w-20 rounded-full shrink-0" delay={delay + 30} />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Sk className="h-5 w-14 rounded-md" delay={delay + 80} />
          <Sk className="h-5 w-14 rounded-md" delay={delay + 100} />
          <Sk className="h-4 w-20" delay={delay + 120} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-start gap-1 shrink-0">
        <Sk className="h-8 w-8 rounded-lg" delay={delay + 60} />
        <Sk className="h-8 w-8 rounded-lg" delay={delay + 90} />
      </div>
    </div>
  );
}

export default function PostsLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Sk className="h-7 w-32" />
          <Sk className="h-4 w-56" delay={40} />
        </div>
        <div className="flex items-center gap-2">
          <Sk className="h-9 w-9 rounded-xl" delay={60} />
          <Sk className="h-9 w-28 rounded-xl" delay={80} />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[0, 80, 160].map((d) => (
          <div key={d} className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <Sk className="h-3 w-20" delay={d} />
              <Sk className="h-8 w-8 rounded-xl" delay={d + 40} />
            </div>
            <Sk className="h-8 w-16" delay={d + 60} />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl">
        {[0, 60, 120, 180, 240].map((d) => (
          <Sk key={d} className="h-9 w-24 rounded-lg" delay={d} />
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <Sk className="h-10 flex-1 max-w-md rounded-xl" />
        <Sk className="h-10 w-32 rounded-xl" delay={50} />
        <Sk className="h-10 w-20 rounded-xl" delay={100} />
      </div>

      {/* Post cards */}
      <div className="space-y-2.5">
        {[0, 80, 160, 240, 320].map((d) => (
          <PostCardSkeleton key={d} delay={d} />
        ))}
      </div>
    </div>
  );
}
