"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getStorageMode, type StorageMode } from "@/lib/store";

export default function NavBar() {
  const pathname = usePathname();
  const [storageMode, setStorageMode] = useState<StorageMode | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mode = await getStorageMode();
        if (!cancelled) setStorageMode(mode);
      } catch {
        /* keep indicator hidden on failure */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const routesActive = pathname === "/" || pathname.startsWith("/route");

  const links: ReadonlyArray<{ href: string; label: string; active: boolean }> = [
    { href: "/", label: "My Routes", active: routesActive },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <nav
        aria-label="Primary"
        className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6 lg:px-8"
      >
        <Link
          href="/"
          className="flex items-center gap-1.5 text-base font-bold tracking-tight text-gray-900"
        >
          <span aria-hidden>🧭</span>
          <span>CommuteIQ</span>
        </Link>

        <ul className="flex flex-1 flex-wrap items-center gap-1">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={link.active ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  link.active
                    ? "bg-brand-primary/10 text-brand-primary"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          {storageMode === "local" && (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
              Local mode
            </span>
          )}
        </div>
      </nav>
    </header>
  );
}
