"use client";

import * as React from "react";

import { cn } from "@/lib/cn";
import { Button } from "./button";

export type FileDropzoneProps = {
  label: string;
  accept?: string;
  file: File | null;
  disabled?: boolean;
  error?: string;
  hint?: string;
  onFileChange: (file: File | null) => void;
};

export function FileDropzone({
  label,
  accept,
  file,
  disabled = false,
  error,
  hint,
  onFileChange,
}: FileDropzoneProps) {
  const inputId = React.useId();
  const [isDragging, setIsDragging] = React.useState(false);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || disabled) {
      return;
    }
    onFileChange(fileList[0]);
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-[var(--fg-secondary)]">
        {label}
      </label>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        className={cn(
          "rounded-[8px] border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)]/60 p-4",
          "transition-all duration-200",
          !disabled && "cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--bg-surface)]",
          isDragging && "border-[var(--accent)] bg-[var(--accent-soft)]",
          disabled && "cursor-not-allowed opacity-60",
          error && "border-[var(--error)]",
        )}
        onDragOver={(event) => {
          if (disabled) {
            return;
          }
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          if (disabled) {
            return;
          }
          event.preventDefault();
          setIsDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        onClick={() => {
          if (disabled) {
            return;
          }
          const input = document.getElementById(inputId) as HTMLInputElement | null;
          input?.click();
        }}
        onKeyDown={(event) => {
          if (disabled) {
            return;
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            const input = document.getElementById(inputId) as HTMLInputElement | null;
            input?.click();
          }
        }}
      >
        <input
          id={inputId}
          type="file"
          className="hidden"
          accept={accept}
          disabled={disabled}
          onChange={(event) => handleFiles(event.target.files)}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-[var(--fg-primary)]">
              {file ? file.name : "Drag file here or click to choose"}
            </p>
            {hint ? <p className="text-xs text-[var(--fg-tertiary)]">{hint}</p> : null}
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              const input = document.getElementById(inputId) as HTMLInputElement | null;
              input?.click();
            }}
          >
            Choose File
          </Button>
        </div>
      </div>
      {error ? <p className="text-xs text-[var(--error)]">{error}</p> : null}
    </div>
  );
}
