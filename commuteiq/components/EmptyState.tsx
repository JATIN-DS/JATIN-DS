"use client";

export default function EmptyState() {
  return (
    <section className="flex flex-col items-center rounded-card bg-white px-6 py-12 text-center shadow-card sm:py-16">
      <div
        aria-hidden
        className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-brand-primary/10 text-4xl"
      >
        🛣️
      </div>
      <h2 className="text-xl font-semibold text-gray-900">No commute data yet</h2>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        The scheduler checks this route automatically during its tracking window. As data comes in,
        your travel-time trends and optimal departure recommendation will appear here. You can also
        tap <span className="font-medium text-gray-700">Check traffic now</span> above to record a
        reading immediately.
      </p>
    </section>
  );
}
