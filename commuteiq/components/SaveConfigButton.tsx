"use client";

interface SaveConfigButtonProps {
  onClick: () => void;
  disabled?: boolean;
  saving?: boolean;
}

export default function SaveConfigButton({
  onClick,
  disabled = false,
  saving = false,
}: SaveConfigButtonProps) {
  const isDisabled = disabled || saving;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={saving}
      className={`inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${
        isDisabled
          ? "cursor-not-allowed bg-brand-primary/50"
          : "bg-brand-primary hover:bg-blue-700"
      }`}
    >
      {saving ? "Saving..." : "Save & Activate"}
    </button>
  );
}
