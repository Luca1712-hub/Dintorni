"use client";

import { useId, useState } from "react";

type Props = {
  id?: string;
  name?: string;
  label: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  placeholder?: string;
};

function IconEye({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconEyeOff({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

export function PasswordInput({
  id: idProp,
  name,
  label,
  value,
  defaultValue,
  onChange,
  required,
  minLength,
  autoComplete,
  placeholder,
}: Props) {
  const [visible, setVisible] = useState(false);
  const autoId = useId();
  const id = idProp ?? autoId;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border py-2 pl-3 pr-11 outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:bg-surface-muted hover:text-foreground"
          aria-label={visible ? "Nascondi password" : "Mostra password"}
          aria-pressed={visible}
        >
          {visible ? (
            <IconEyeOff className="h-5 w-5" />
          ) : (
            <IconEye className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}
