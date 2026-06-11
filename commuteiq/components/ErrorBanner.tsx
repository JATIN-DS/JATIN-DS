"use client";

export type BannerTone = "info" | "warning" | "error";

interface ErrorBannerProps {
  message: string;
  tone?: BannerTone;
  onDismiss?: () => void;
}

const TONE_STYLES: Record<BannerTone, { container: string; icon: string; button: string }> = {
  info: {
    container: "border-brand-primary/30 bg-brand-primary/5 text-blue-900",
    icon: "ℹ️",
    button: "text-brand-primary hover:bg-brand-primary/10",
  },
  warning: {
    container: "border-brand-warning/40 bg-brand-warning/10 text-amber-900",
    icon: "⚠️",
    button: "text-brand-warning hover:bg-brand-warning/10",
  },
  error: {
    container: "border-brand-error/40 bg-brand-error/10 text-red-900",
    icon: "🚫",
    button: "text-brand-error hover:bg-brand-error/10",
  },
};

export default function ErrorBanner({ message, tone = "info", onDismiss }: ErrorBannerProps) {
  const styles = TONE_STYLES[tone];
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-card border px-4 py-3 text-sm ${styles.container}`}
    >
      <span aria-hidden className="mt-0.5 leading-none">
        {styles.icon}
      </span>
      <p className="flex-1 font-medium">{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className={`-mr-1 -mt-1 rounded-md p-1 text-lg leading-none transition-colors ${styles.button}`}
        >
          ×
        </button>
      )}
    </div>
  );
}
