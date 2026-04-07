function Sk({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <div
      className={`shimmer rounded-lg ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    />
  );
}

function CommentRowSkeleton({ delay }: { delay: number }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 border-b border-border/30 last:border-0">
      <Sk className="h-10 w-10 rounded-full shrink-0" delay={delay} />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between">
          <Sk className="h-4 w-28" delay={delay + 30} />
          <Sk className="h-3 w-12" delay={delay + 50} />
        </div>
        <Sk className="h-3.5 w-full" delay={delay + 60} />
        <Sk className="h-3.5 w-4/5" delay={delay + 80} />
        <div className="flex items-center gap-2 pt-0.5">
          <Sk className="h-5 w-16 rounded-full" delay={delay + 100} />
        </div>
      </div>
    </div>
  );
}

export default function CommentsLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Sk className="h-7 w-40" />
          <Sk className="h-4 w-64" delay={40} />
        </div>
        <Sk className="h-9 w-9 rounded-xl" delay={60} />
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[0, 80, 160].map((d) => (
          <div key={d} className="rounded-2xl border border-border/50 bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <Sk className="h-3 w-16" delay={d} />
              <Sk className="h-8 w-8 rounded-xl" delay={d + 40} />
            </div>
            <Sk className="h-8 w-12" delay={d + 60} />
          </div>
        ))}
      </div>

      {/* Split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ minHeight: "420px", height: "calc(100vh - 380px)" }}>

        {/* Left panel */}
        <div className="lg:col-span-2 flex flex-col rounded-2xl border border-border/50 bg-card overflow-hidden">
          <div className="p-3 border-b border-border/40 space-y-2.5">
            <Sk className="h-9 w-full rounded-xl" />
            <div className="flex gap-1">
              {[0, 50, 100, 150].map((d) => (
                <Sk key={d} className="h-8 flex-1 rounded-md" delay={d} />
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            {[0, 80, 160, 240, 320].map((d) => (
              <CommentRowSkeleton key={d} delay={d} />
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="lg:col-span-3 flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-card">
          <Sk className="h-16 w-16 rounded-2xl" />
          <Sk className="h-4 w-36 mt-4" delay={40} />
          <Sk className="h-3 w-52 mt-2" delay={80} />
        </div>
      </div>
    </div>
  );
}
