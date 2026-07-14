export default function PageSkeleton() {
  return (
    <div className="p-8 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-6">
        <div className="h-8 bg-gray-800 rounded-lg w-48 mb-2" />
        <div className="h-4 bg-gray-800 rounded-lg w-72" />
      </div>

      {/* 4 skeleton cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-gray-700 rounded-lg" />
              <div className="flex-1">
                <div className="h-3 bg-gray-700 rounded w-20 mb-2" />
                <div className="h-6 bg-gray-700 rounded w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Skeleton chart area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="h-5 bg-gray-700 rounded w-40 mb-4" />
          <div className="h-64 bg-gray-700 rounded-lg" />
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="h-5 bg-gray-700 rounded w-32 mb-4" />
          <div className="h-64 bg-gray-700 rounded-lg" />
        </div>
      </div>

      {/* Skeleton table (8 rows) */}
      <div className="bg-gray-800 rounded-lg p-4">
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
          {[...Array(8)].map((_, i) => (
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
    </div>
  );
}
