// Base skeleton line with configurable width and height
export function SkeletonLine({
  width = '100%',
  height = '1rem',
  className = '',
}: {
  width?: string;
  height?: string;
  className?: string;
}) {
  return (
    <div
      className={`bg-gray-700 rounded animate-pulse ${className}`}
      style={{ width, height }}
    />
  );
}

// Card skeleton simulating StatCard layout
export function SkeletonCard() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 bg-gray-700 rounded-lg shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="h-3 bg-gray-700 rounded w-20 mb-2" />
          <div className="h-6 bg-gray-700 rounded w-16" />
        </div>
      </div>
    </div>
  );
}

// Table skeleton with configurable row count
export function SkeletonTable({ rows = 8 }: { rows?: number }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 animate-pulse">
      {/* Table title */}
      <div className="h-5 bg-gray-700 rounded w-24 mb-4" />

      <div className="space-y-3">
        {/* Table header */}
        <div className="flex gap-4 pb-2 border-b border-gray-700">
          <div className="h-4 bg-gray-700 rounded w-1/4" />
          <div className="h-4 bg-gray-700 rounded w-1/6" />
          <div className="h-4 bg-gray-700 rounded w-1/6" />
          <div className="h-4 bg-gray-700 rounded w-1/6" />
          <div className="h-4 bg-gray-700 rounded w-1/6" />
        </div>

        {/* Table rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 py-2">
            <div className="h-4 bg-gray-700 rounded w-1/4" />
            <div className="h-4 bg-gray-700 rounded w-1/6" />
            <div className="h-4 bg-gray-700 rounded w-1/6" />
            <div className="h-4 bg-gray-700 rounded w-1/6" />
            <div className="h-4 bg-gray-700 rounded w-1/6" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Chart area skeleton
export function SkeletonChart({ titleWidth = '40%' }: { titleWidth?: string }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 animate-pulse">
      <div
        className="h-5 bg-gray-700 rounded mb-4"
        style={{ width: titleWidth }}
      />
      <div className="h-64 bg-gray-700 rounded-lg" />
    </div>
  );
}

// Filter bar skeleton
export function SkeletonFilter() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 animate-pulse">
      <div className="flex gap-4 items-center">
        <div>
          <div className="h-3 bg-gray-700 rounded w-16 mb-1" />
          <div className="h-9 bg-gray-700 rounded w-32" />
        </div>
        <div className="flex-1">
          <div className="h-3 bg-gray-700 rounded w-16 mb-1" />
          <div className="h-9 bg-gray-700 rounded w-full" />
        </div>
      </div>
    </div>
  );
}

// Full page skeleton combining all components to match Dashboard layout
export function PageSkeleton() {
  return (
    <div className="p-8">
      {/* Header skeleton */}
      <div className="mb-6">
        <div className="h-8 bg-gray-800 rounded-lg w-48 mb-2 animate-pulse" />
        <div className="h-4 bg-gray-800 rounded-lg w-72 animate-pulse" />
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Filter bar */}
      <div className="mb-6">
        <SkeletonFilter />
      </div>

      {/* Charts area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SkeletonChart titleWidth="60%" />
        <SkeletonChart titleWidth="50%" />
      </div>

      {/* Table */}
      <SkeletonTable rows={8} />
    </div>
  );
}

// Default export for convenience
export default {
  SkeletonLine,
  SkeletonCard,
  SkeletonTable,
  SkeletonChart,
  SkeletonFilter,
  PageSkeleton,
};
