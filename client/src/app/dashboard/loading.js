export default function Loading() {
  return (
    <div className="space-y-6 pb-20">
      {/* Summary skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="bg-white rounded-lg p-4 shadow-sm">
            <div className="h-3 bg-gray-200 rounded w-20 mb-2 skeleton"></div>
            <div className="h-6 bg-gray-200 rounded w-24 skeleton"></div>
          </div>
        ))}
      </div>

      {/* Form skeleton */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 h-12 bg-gray-200 rounded-lg skeleton"></div>
          <div className="flex-1 h-12 bg-gray-200 rounded-lg skeleton"></div>
        </div>
        <div className="h-20 bg-gray-200 rounded-lg skeleton"></div>
        <div className="grid grid-cols-4 gap-2">
          {[1,2,3,4].map(i => <div key={i} className="h-10 bg-gray-200 rounded-lg skeleton"></div>)}
        </div>
        <div className="h-12 bg-gray-200 rounded-lg skeleton"></div>
      </div>

      {/* List skeleton */}
      <div className="bg-white rounded-lg shadow-sm divide-y">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full skeleton"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4 skeleton"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 skeleton"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded w-20 skeleton"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
