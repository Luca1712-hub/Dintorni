"use client";

import { useRef } from "react";

const btnClass =
  "rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50";

type Props = {
  onPick: (files: FileList | null) => void;
  disabled?: boolean;
  /** Galleria: più file per volta (chat/richiesta). */
  multiple?: boolean;
  galleryLabel?: string;
  cameraLabel?: string;
  className?: string;
};

/** Apre galleria o fotocamera del dispositivo (su mobile `capture` avvia la camera). */
export function ImageAttachButtons({
  onPick,
  disabled = false,
  multiple = true,
  galleryLabel = "Galleria",
  cameraLabel = "Scatta foto",
  className = "",
}: Props) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onPick(e.target.files);
    e.target.value = "";
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        disabled={disabled}
        onChange={onChange}
        aria-hidden
        tabIndex={-1}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={disabled}
        onChange={onChange}
        aria-hidden
        tabIndex={-1}
      />
      <button
        type="button"
        disabled={disabled}
        className={btnClass}
        onClick={() => galleryRef.current?.click()}
      >
        {galleryLabel}
      </button>
      <button
        type="button"
        disabled={disabled}
        className={btnClass}
        onClick={() => cameraRef.current?.click()}
      >
        {cameraLabel}
      </button>
    </div>
  );
}
