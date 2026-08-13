"use client";

import {
  useCallback,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
} from "react";

import { formatAuPhoneInput } from "@dg/platform-core/au/phone";

type AuPhoneInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "defaultValue" | "onChange"
> & {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, event: ChangeEvent<HTMLInputElement>) => void;
  onValueChange?: (value: string) => void;
};

/**
 * Phone input that applies Australian spacing as you type
 * (e.g. `0412 345 678`, `02 1234 5678`, `+61 412 345 678`).
 */
export function AuPhoneInput({
  value,
  defaultValue,
  onChange,
  onValueChange,
  ...props
}: AuPhoneInputProps) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(() =>
    formatAuPhoneInput(defaultValue ?? ""),
  );

  const display = controlled ? formatAuPhoneInput(value) : internal;

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const next = formatAuPhoneInput(event.target.value);
      if (!controlled) setInternal(next);
      onValueChange?.(next);
      onChange?.(next, event);
    },
    [controlled, onChange, onValueChange],
  );

  return (
    <input
      {...props}
      type="tel"
      inputMode="tel"
      autoComplete={props.autoComplete ?? "tel"}
      value={display}
      onChange={handleChange}
    />
  );
}
