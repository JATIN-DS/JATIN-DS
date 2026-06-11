"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Route } from "@/types";
import { deleteRoute, getRoutes, getStorageMode, type StorageMode } from "@/lib/store";
import { useToast } from "@/components/ToastProvider";
import ErrorBanner from "@/components/ErrorBanner";
import RouteCard from "@/components/RouteCard";

export default function HomePage() {
  const { showToast } = useToast();

  const [routes, setRoutes] = useState<Route[]>([]);
  const [storageMode, setStorageMode] = useState<StorageMode | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLocalBanner, setShowLocalBanner] = useState(true);

  const loadRoutes = useCallback(async () => {
    const loaded = await getRoutes();
    setRoutes(loaded);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [loaded, mode] = await Promise.all([getRoutes(), getStorageMode()]);
        if (cancelled) return;
        setRoutes(loaded);
        setStorageMode(mode);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm("Delete this route and all its data?")) return;
      await deleteRoute(id);
      await loadRoutes();
      showToast("Route deleted.", "success");
    },
    [loadRoutes, showToast]
  );

  const sortedRoutes = useMemo(
    () =>
      [...routes].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [routes]
  );

  return (
    <div className="space-y-6">
      {storageMode === "local" && showLocalBanner && (
        <ErrorBanner
          tone="info"
          message="Running in local mode — data is stored in this browser only."
          onDismiss={() => setShowLocalBanner(false)}
        />
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Routes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track traffic across your commutes and find your best time to leave.
          </p>
        </div>
        <Link
          href="/settings"
          className="inline-flex items-center justify-center gap-1.5 self-start rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 sm:self-auto"
        >
          ＋ Add Route
        </Link>
      </div>

      {loading ? (
        <div className="rounded-card bg-white p-10 text-center text-sm text-gray-500 shadow-card">
          Loading…
        </div>
      ) : sortedRoutes.length === 0 ? (
        <section className="flex flex-col items-center rounded-card bg-white px-6 py-12 text-center shadow-card sm:py-16">
          <div
            aria-hidden
            className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-brand-primary/10 text-4xl"
          >
            🧭
          </div>
          <h2 className="text-xl font-semibold text-gray-900">No routes yet</h2>
          <p className="mt-2 max-w-md text-sm text-gray-500">
            Add your first commute route to start tracking traffic and find your best time to
            leave.
          </p>
          <Link
            href="/settings"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            ＋ Add your first route
          </Link>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedRoutes.map((route) => (
            <RouteCard key={route.id} route={route} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
