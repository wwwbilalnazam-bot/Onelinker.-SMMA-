// Skeleton for the Calendar page
// Matches: month nav, weekday headers, 5-row × 7-col calendar grid

function Sk({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <div
      className={`shimmer rounded-lg ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    />
  );
}

// Simulate a few cells having post chips
const CELL_POSTS: Record<number, number[]> = {
  2: [1],
  5: [1, 2],
  8: [1],
  12: [1, 2, 3],
  16: [1],
  20: [1, 2],
  24: [1],
  28: [1],
};

export default function CalendarLoading() {
  return (
    <div className="p-6 space-y-4 h-full flex flex-col max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sk className="h-8 w-8 rounded-lg" />
          <Sk className="h-7 w-36" delay={40} />
          <Sk className="h-8 w-8 rounded-lg" delay={80} />
        </div>
        <div className="flex items-center gap-2">
          <Sk className="h-8 w-16 rounded-lg" delay={40} />
          <Sk className="h-9 w-28" delay={80} />
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 rounded-xl border border-border/60 bg-card overflow-hidden">

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-border/50">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((_, i) => (
            <div key={i} className="py-3 px-3 border-r border-border/40 last:border-0">
              <Sk className="h-4 w-7" delay={i * 30} />
            </div>
          ))}
        </div>

        {/* 5 weeks of day cells */}
        {Array.from({ length: 5 }, (_, week) => (
          <div key={week} className="grid grid-cols-7 border-b border-border/40 last:border-0" style={{ minHeight: 100 }}>
            {Array.from({ length: 7 }, (_, day) => {
              const cell = week * 7 + day;
              const posts = CELL_POSTS[cell] ?? [];
              const baseDelay = cell * 15;
              return (
                <div
                  key={day}
                  className="relative p-2 border-r border-border/40 last:border-0 flex flex-col gap-1.5"
                >
                  {/* Day number */}
                  <Sk
                    className="h-6 w-6 rounded-full self-start"
                    delay={baseDelay}
                  />
                  {/* Post chips */}
                  {posts.map((_, pi) => (
                    <Sk
                      key={pi}
                      className="h-5 w-full rounded-md"
                      delay={baseDelay + pi * 40 + 60}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>

    </div>
  );
}
