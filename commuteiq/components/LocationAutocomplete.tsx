"use client";

import { useEffect, useId, useRef, useState } from "react";
import { placesAutocomplete } from "@/lib/store";

interface LocationAutocompleteProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
}

export default function LocationAutocomplete({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
}: LocationAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  // Only fetch/show suggestions while the user is actively in this field, so a
  // pre-filled value (e.g. on the edit page) doesn't pop open a dropdown.
  const [focused, setFocused] = useState(false);

  // Track the latest in-flight query so stale responses can be discarded.
  const latestQueryRef = useRef("");
  // Suppress the next fetch right after a suggestion is picked.
  const skipNextRef = useRef(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const listboxId = useId();

  useEffect(() => {
    // Never search or open the list unless the field is focused.
    if (!focused) return;

    if (skipNextRef.current) {
      skipNextRef.current = false;
      return;
    }

    const query = value.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setLoading(false);
      setHighlightedIndex(-1);
      setOpen(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(async () => {
      latestQueryRef.current = query;
      const results = await placesAutocomplete(query);
      // Ignore stale responses (a newer query has since started).
      if (cancelled || latestQueryRef.current !== query) return;
      setSuggestions(results);
      setHighlightedIndex(-1);
      setOpen(results.length > 0);
      setLoading(false);
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [value, focused]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  const select = (suggestion: string) => {
    skipNextRef.current = true;
    onChange(suggestion);
    setOpen(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) {
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        setOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((i) => (i + 1) % suggestions.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) =>
          i <= 0 ? suggestions.length - 1 : i - 1
        );
        break;
      case "Enter":
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          e.preventDefault();
          select(suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setHighlightedIndex(-1);
        break;
      default:
        break;
    }
  };

  const handleBlur = () => {
    // Delay so a click on a suggestion registers before the list closes.
    blurTimeoutRef.current = setTimeout(() => {
      setFocused(false);
      setOpen(false);
      setHighlightedIndex(-1);
    }, 150);
  };

  const handleFocus = () => {
    setFocused(true);
    if (suggestions.length > 0) setOpen(true);
  };

  const errorId = `${id}-error`;
  const activeOptionId =
    open && highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined;

  return (
    <div className="relative">
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-gray-900"
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeOptionId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none ${
          error
            ? "border-brand-error focus:border-brand-error"
            : "border-gray-300 focus:border-brand-primary"
        }`}
      />

      {loading ? (
        <p className="mt-1 text-xs text-gray-400">Searching…</p>
      ) : null}

      {open && suggestions.length > 0 ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 z-20 mt-1 max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-card"
        >
          {suggestions.map((suggestion, index) => {
            const highlighted = index === highlightedIndex;
            return (
              <li key={`${suggestion}-${index}`} role="presentation">
                <button
                  id={`${listboxId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={highlighted}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => select(suggestion)}
                  className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm text-gray-900 transition-colors ${
                    highlighted ? "bg-gray-50" : "hover:bg-gray-50"
                  }`}
                >
                  <span aria-hidden className="leading-5">
                    📍
                  </span>
                  <span className="leading-5">{suggestion}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-brand-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
