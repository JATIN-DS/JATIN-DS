"use client";

interface SchedulerToggleProps {
  active: boolean;
  onChange: (active: boolean) => void;
  disabled?: boolean;
}

export default function SchedulerToggle({
  active,
  onChange,
  disabled = false,
}: SchedulerToggleProps) {
  return (
    <div
      className={`flex items-center gap-3 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label="Scheduler"
        disabled={disabled}
        onClick={() => onChange(!active)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${
          active ? "bg-brand-accent" : "bg-gray-300"
        } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            active ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
      <span className="text-sm font-medium text-gray-900">
        {active ? "🟢 Scheduler Active" : "⏸ Scheduler Paused"}
      </span>
    </div>
  );
}
