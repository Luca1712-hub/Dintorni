"use client";

import { useEffect, useMemo, useState } from "react";
import {
  comuniDellaProvincia,
  elencoProvince,
  labelComune,
  loadComuniItalia,
  trovaComuneDaLabel,
  type ComuneItaliaJson,
  type ComuneOpzione,
} from "@/lib/italia-comuni";

type InnerProps = {
  idPrefix: string;
  rows: ComuneItaliaJson[];
  value: string;
  onChange: (label: string) => void;
  disabled?: boolean;
  legend?: string;
};

function SelettoreProvinciaComuneInner({
  idPrefix,
  rows,
  value,
  onChange,
  disabled,
  legend = "Località",
}: InnerProps) {
  const initial = () => {
    if (!value.trim()) return { sigla: "", codice: "" };
    const found = trovaComuneDaLabel(rows, value);
    return found ? { sigla: found.sigla, codice: found.codice } : { sigla: "", codice: "" };
  };
  const [{ sigla: siglaProv, codice: codiceComune }, setPair] = useState(initial);

  const province = useMemo(() => elencoProvince(rows), [rows]);

  const comuni: ComuneOpzione[] = useMemo(() => {
    if (!siglaProv) return [];
    return comuniDellaProvincia(rows, siglaProv);
  }, [rows, siglaProv]);

  const onProvincia = (sigla: string) => {
    setPair({ sigla, codice: "" });
    onChange("");
  };

  const onComune = (codice: string) => {
    if (!codice) {
      setPair((p) => ({ ...p, codice: "" }));
      onChange("");
      return;
    }
    const row = rows.find((r) => r.codice === codice);
    if (!row) {
      setPair((p) => ({ ...p, codice: "" }));
      onChange("");
      return;
    }
    setPair({ sigla: row.sigla, codice });
    onChange(labelComune(row));
  };

  const idProv = `${idPrefix}-provincia`;
  const idCom = `${idPrefix}-comune`;

  return (
    <div className={`space-y-3 ${disabled ? "pointer-events-none opacity-60" : ""}`}>
      <p className="text-sm font-medium text-foreground">{legend}</p>
      <div>
        <label htmlFor={idProv} className="mb-1 block text-sm font-medium text-foreground">
          Provincia
        </label>
        <select
          id={idProv}
          value={siglaProv}
          disabled={disabled}
          onChange={(e) => onProvincia(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">— Scegli la provincia —</option>
          {province.map((p) => (
            <option key={p.sigla} value={p.sigla}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={idCom} className="mb-1 block text-sm font-medium text-foreground">
          Comune
        </label>
        <select
          id={idCom}
          value={codiceComune}
          onChange={(e) => onComune(e.target.value)}
          disabled={disabled || !siglaProv}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:bg-surface-muted"
        >
          <option value="">{siglaProv ? "— Scegli il comune —" : "— Prima la provincia —"}</option>
          {comuni.map((c) => (
            <option key={c.codice} value={c.codice}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

type Props = {
  idPrefix: string;
  value: string;
  onChange: (label: string) => void;
  disabled?: boolean;
  legend?: string;
};

export function SelettoreProvinciaComune({ idPrefix, value, onChange, disabled, legend }: Props) {
  const [rows, setRows] = useState<ComuneItaliaJson[] | null>(null);
  const [loadErr, setLoadErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await loadComuniItalia();
        if (!cancelled) setRows(data);
      } catch (e) {
        if (!cancelled) {
          setLoadErr(e instanceof Error ? e.message : "Errore caricamento comuni.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadErr) {
    return (
      <p className="text-sm text-red-600" role="alert">
        {loadErr}
      </p>
    );
  }

  if (!rows) {
    return <p className="text-sm text-muted">Caricamento elenco comuni italiani…</p>;
  }

  return (
    <SelettoreProvinciaComuneInner
      key={`${value}|${rows.length}`}
      idPrefix={idPrefix}
      rows={rows}
      value={value}
      onChange={onChange}
      disabled={disabled}
      legend={legend}
    />
  );
}
