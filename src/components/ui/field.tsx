import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useId } from "react";
import { cn } from "@/lib/cn";

/**
 * Network Spine (RC3, S-20/S-22): form primitives. Every field is labelled
 * (auto ids when omitted), errors connect via aria-describedby, and the
 * invalid state marks the control with aria-invalid — no color-only signals.
 */

const controlBase =
  "w-full rounded-sm border border-fg/20 bg-surface px-3 text-sm text-fg placeholder:text-subtle transition-colors duration-150 focus:border-fg/50";

export function Field({
  label,
  hint,
  error,
  id,
  required,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string | null;
  id?: string;
  required?: boolean;
  children: ReactNode;
}) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <div>
      {label ? (
        <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium">
          {label}
          {required ? <span className="text-subtle"> · required</span> : null}
        </label>
      ) : null}
      {children}
      {hint && !error ? <p className="mt-1 text-xs text-subtle">{hint}</p> : null}
      {error ? (
        <p id={`${fieldId}-error`} className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({
  invalid,
  className,
  id,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; id?: string }) {
  return (
    <input
      id={id}
      aria-invalid={invalid || undefined}
      className={cn(controlBase, "h-10", invalid && "border-danger/60", className)}
      {...rest}
    />
  );
}

export function Textarea({
  invalid,
  className,
  id,
  rows = 4,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean; id?: string }) {
  return (
    <textarea
      id={id}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(controlBase, "py-2.5", invalid && "border-danger/60", className)}
      {...rest}
    />
  );
}

export function Select({
  invalid,
  className,
  id,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean; id?: string }) {
  return (
    <select
      id={id}
      aria-invalid={invalid || undefined}
      className={cn(controlBase, "h-10 appearance-none pr-8", invalid && "border-danger/60", className)}
      {...rest}
    >
      {children}
    </select>
  );
}

/** Checkbox + radio with a labelled, tappable row (44px target). */
export function CheckRow({
  checked,
  onChange,
  label,
  description,
  type = "checkbox",
  name,
  value,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  type?: "checkbox" | "radio";
  name?: string;
  value?: string;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-sm p-2 transition-colors duration-150 hover:bg-raised/60">
      <input
        id={id}
        type={type}
        checked={checked}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-(--accent)"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-muted">{description}</span> : null}
      </span>
    </label>
  );
}
