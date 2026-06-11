"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  CadenceMinutes,
  DayOfWeek,
  Route,
  RouteForm,
  TransitMode,
} from "@/types";
import { DEFAULT_ROUTE_FORM } from "@/types";
import { getRoute, newRoute, saveRoute } from "@/lib/store";
import { timeToMinutes } from "@/lib/regression";
import { useToast } from "@/components/ToastProvider";
import RouteInputPanel from "@/components/RouteInputPanel";
import ModeToggle from "@/components/ModeToggle";
import DaySelector from "@/components/DaySelector";
import TimeWindowPicker from "@/components/TimeWindowPicker";
import CadenceDropdown from "@/components/CadenceDropdown";
import SchedulerToggle from "@/components/SchedulerToggle";
import SaveConfigButton from "@/components/SaveConfigButton";

interface FieldErrors {
  name?: string;
  startLocation?: string;
  endLocation?: string;
  days?: string;
  timeWindow?: string;
  returnTimeWindow?: string;
}

function computeErrors(form: RouteForm): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.name.trim()) {
    errors.name = "Please name this route.";
  }
  if (!form.startLocation.trim()) {
    errors.startLocation = "Please enter a start location.";
  }
  if (!form.endLocation.trim()) {
    errors.endLocation = "Please enter an end location.";
  }
  if (form.selectedDays.length < 1) {
    errors.days = "Please select at least one day to enable scheduling.";
  }
  if (timeToMinutes(form.checkUntil) < timeToMinutes(form.checkFrom) + 15) {
    errors.timeWindow = "End time must be after start time.";
  }
  if (
    form.returnEnabled &&
    timeToMinutes(form.returnCheckUntil) <
      timeToMinutes(form.returnCheckFrom) + 15
  ) {
    errors.returnTimeWindow = "Return end time must be after start time.";
  }

  return errors;
}

function SettingsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { showToast } = useToast();

  const [form, setForm] = useState<RouteForm>(DEFAULT_ROUTE_FORM);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Identity of the route being edited (null when creating).
  const editingRef = useRef<{ id: string; createdAt: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const detectedTz =
        Intl.DateTimeFormat().resolvedOptions().timeZone ||
        DEFAULT_ROUTE_FORM.timezone;

      if (id) {
        const existing = await getRoute(id);
        if (cancelled) return;
        if (existing) {
          editingRef.current = {
            id: existing.id,
            createdAt: existing.createdAt,
          };
          const { id: _id, createdAt: _createdAt, ...rest } = existing;
          setForm({
            ...rest,
            timezone: rest.timezone || detectedTz,
          });
          setLoaded(true);
          return;
        }
        showToast("Route not found.", "error");
      }

      if (cancelled) return;
      setForm((prev) => ({
        ...prev,
        timezone: prev.timezone || detectedTz,
      }));
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, showToast]);

  useEffect(() => {
    setErrors(computeErrors(form));
  }, [form]);

  const isValid = useMemo(
    () => Object.keys(computeErrors(form)).length === 0,
    [form]
  );

  const update = <K extends keyof RouteForm>(key: K, value: RouteForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const isEditing = editingRef.current !== null;

  const handleSave = async () => {
    const validation = computeErrors(form);
    setErrors(validation);

    const firstError = Object.values(validation).find(Boolean);
    if (firstError) {
      showToast(firstError, "error");
      return;
    }

    const route: Route = editingRef.current
      ? {
          ...form,
          id: editingRef.current.id,
          createdAt: editingRef.current.createdAt,
        }
      : newRoute(form);

    setSaving(true);
    const result = await saveRoute(route);
    setSaving(false);

    if (result.success) {
      showToast(
        "Route saved! We'll start tracking on your next configured day.",
        "success"
      );
      router.push(`/route/${route.id}`);
    } else {
      showToast(result.error || "Could not save.", "error");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? "Edit Route" : "New Route"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Set up the commute you want CommuteIQ to track and when we should
          sample traffic.
        </p>
      </header>

      <RouteInputPanel
        name={form.name}
        startLocation={form.startLocation}
        endLocation={form.endLocation}
        onNameChange={(v) => update("name", v)}
        onStartChange={(v) => update("startLocation", v)}
        onEndChange={(v) => update("endLocation", v)}
        nameError={errors.name}
        startError={errors.startLocation}
        endError={errors.endLocation}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ModeToggle
          value={form.mode}
          onChange={(m: TransitMode) => update("mode", m)}
        />
        <CadenceDropdown
          value={form.cadenceMinutes}
          onChange={(v: CadenceMinutes) => update("cadenceMinutes", v)}
        />
      </div>

      <DaySelector
        selected={form.selectedDays}
        onChange={(days: DayOfWeek[]) => update("selectedDays", days)}
        error={errors.days}
      />

      <section className="rounded-card bg-white p-5 shadow-card sm:p-6">
        <h2 className="text-base font-semibold text-gray-900">
          Morning trip (A → B)
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          When should we sample your outbound commute?
        </p>
        <div className="mt-4">
          <TimeWindowPicker
            checkFrom={form.checkFrom}
            checkUntil={form.checkUntil}
            onFromChange={(v) => update("checkFrom", v)}
            onUntilChange={(v) => update("checkUntil", v)}
            error={errors.timeWindow}
          />
        </div>
      </section>

      <section className="rounded-card bg-white p-5 shadow-card sm:p-6">
        <h2 className="text-base font-semibold text-gray-900">
          Return trip (B → A)
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Track the journey back as well.
        </p>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={form.returnEnabled}
            aria-label="Also track the return trip (B → A)"
            onClick={() => update("returnEnabled", !form.returnEnabled)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${
              form.returnEnabled ? "bg-brand-accent" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                form.returnEnabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
          <span className="text-sm font-medium text-gray-900">
            Also track the return trip (B → A)
          </span>
        </div>

        {form.returnEnabled ? (
          <div className="mt-4">
            <TimeWindowPicker
              checkFrom={form.returnCheckFrom}
              checkUntil={form.returnCheckUntil}
              onFromChange={(v) => update("returnCheckFrom", v)}
              onUntilChange={(v) => update("returnCheckUntil", v)}
              error={errors.returnTimeWindow}
            />
            <p className="mt-3 text-sm text-gray-500">
              e.g., track your evening commute home.
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-400">
            Return tracking is off. Turn it on to sample your trip home too.
          </p>
        )}
      </section>

      <section className="rounded-card bg-white p-5 shadow-card sm:p-6">
        <h2 className="text-base font-semibold text-gray-900">Scheduler</h2>
        <p className="mt-1 text-sm text-gray-500">
          Pause or resume automatic traffic checks at any time.
        </p>
        <div className="mt-4">
          <SchedulerToggle
            active={form.schedulerActive}
            onChange={(active) => update("schedulerActive", active)}
            disabled={!loaded || !isValid}
          />
        </div>
      </section>

      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
        <SaveConfigButton
          onClick={handleSave}
          disabled={!loaded || !isValid}
          saving={saving}
        />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center text-sm text-gray-500">Loading…</div>
      }
    >
      <SettingsInner />
    </Suspense>
  );
}
