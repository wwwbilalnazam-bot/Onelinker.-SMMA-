// Skeleton for the Settings page
// Matches: sidebar nav tabs + content form area

function Sk({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <div
      className={`shimmer rounded-lg ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    />
  );
}

function FieldSkeleton({ delay, label = "w-20" }: { delay: number; label?: string }) {
  return (
    <div className="space-y-2">
      <Sk className={`h-4 ${label}`} delay={delay} />
      <Sk className="h-9 w-full" delay={delay + 40} />
    </div>
  );
}

function SectionSkeleton({ delay, fields }: { delay: number; fields: string[] }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 space-y-5">
      <div className="space-y-1.5 pb-1">
        <Sk className="h-5 w-32" delay={delay} />
        <Sk className="h-3.5 w-64" delay={delay + 40} />
      </div>
      <div className="grid gap-4">
        {fields.map((w, i) => (
          <FieldSkeleton key={i} delay={delay + 80 + i * 60} label={w} />
        ))}
      </div>
      <div className="flex justify-end pt-1">
        <Sk className="h-9 w-24" delay={delay + 200} />
      </div>
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Page header */}
      <div className="mb-6 space-y-2">
        <Sk className="h-7 w-24" />
        <Sk className="h-4 w-52" delay={40} />
      </div>

      <div className="flex gap-6">

        {/* Left nav */}
        <div className="w-48 shrink-0 space-y-1">
          {[0, 50, 100, 150, 200, 250].map((d) => (
            <div key={d} className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
              <Sk className="h-4 w-4 rounded-sm" delay={d} />
              <Sk className="h-4 w-20" delay={d + 30} />
            </div>
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 space-y-5">
          <SectionSkeleton
            delay={0}
            fields={["w-16", "w-24", "w-20"]}
          />
          <SectionSkeleton
            delay={100}
            fields={["w-24", "w-16"]}
          />
          <SectionSkeleton
            delay={200}
            fields={["w-20"]}
          />
        </div>

      </div>
    </div>
  );
}
