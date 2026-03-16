"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SearchableSelectProps {
  label?: string;
  error?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  label,
  error,
  options,
  value,
  onChange,
  placeholder = "Select...",
  className = "",
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = React.useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value],
  );

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options;
    const query = searchQuery.toLowerCase();
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(query) || opt.value.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsOpen(true);
  };

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (selectedOption && selectedOption.value && !searchQuery) {
      setSearchQuery(selectedOption.label);
    }
  };

  const handleInputClick = () => {
    if (!isOpen) {
      setIsOpen(true);
      if (selectedOption && selectedOption.value && !searchQuery) {
        setSearchQuery(selectedOption.label);
      }
    }
  };

  const displayValue = isOpen ? searchQuery : (selectedOption?.label ?? "");

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="block text-sm font-medium text-[var(--fg-secondary)]">
          {label}
        </label>
      )}
      <div className="relative" ref={dropdownRef}>
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onClick={handleInputClick}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "w-full rounded-[8px] border bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--fg-primary)]",
            "placeholder:text-[var(--fg-tertiary)]",
            "transition-all duration-200",
            "hover:border-[var(--border-strong)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)] focus-visible:border-[var(--accent)]",
            error ? "border-[var(--error)]" : "border-[var(--border-default)]",
            disabled && "cursor-not-allowed opacity-50",
          )}
        />
        <div
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-transform",
            isOpen && "rotate-180",
          )}
        >
          <svg
            className="h-4 w-4 text-[var(--fg-tertiary)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>

        {isOpen && !disabled && (
          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)]">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-[var(--fg-tertiary)]">
                No results found
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => handleOptionClick(option.value)}
                  className={cn(
                    "cursor-pointer px-3 py-2 text-sm transition-colors",
                    option.value === value
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "text-[var(--fg-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--fg-primary)]",
                  )}
                >
                  {option.label}
                </div>
              ))
            )}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-[var(--error)]">{error}</p>}
    </div>
  );
}
