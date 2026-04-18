"use client";

import { useEffect, useMemo, useState } from "react";
import {
  comuniDellaProvincia,
  elencoProvince,
  loadComuniItalia,
  type ComuneItaliaJson,
  type ComuneOpzione,
} from "@/lib/italia-comuni";

export type ZonaComuniRichiestaValue = {
  provinciaSigla: string;
  tuttaProvincia: boolean;
  comuniLabels: string[];
};

export const MAX_COMUNI_RICHIESTA = 50;

type Props = {
  value: ZonaComuniRichiestaValue;
  onChange: (next: ZonaComuniRichiestaValue) => void;
  disabled?: boolean;
};

export function SelettoreProvinciaComuniRichiesta({ value, onChange, disabled }: Props) {
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

  const province = useMemo(() => (rows ? elencoProvince(rows) : []), [rows]);

  const comuniInProvincia: ComuneOpzione[] = useMemo(() => {
    if (!rows || !value.provinciaSigla) return [];
    return comuniDellaProvincia(rows, value.provinciaSigla);
  }, [rows, value.provinciaSigla]);

  const onProvincia = (sigla: string) => {
    onChange({
      provinciaSigla: sigla,
      tuttaProvincia: false,
      comuniLabels: [],
    });
  };

  const onTuttaProvincia = (checked: boolean) => {
    if (checked) {
      onChange({
        provinciaSigla: value.provinciaSigla,
        tuttaProvincia: true,
        comuniLabels: [],
      });
    } else {
      onChange({
        provinciaSigla: value.provinciaSigla,
        tuttaProvincia: false,
        comuniLabels: [],
      });
    }
  };

  const toggleComune = (label: string) => {
    if (value.tuttaProvincia || disabled) return;
    const set = new Set(value.comuniLabels);
    if (set.has(label)) {
      set.delete(label);
    } else {
      if (set.size >= MAX_COMUNI_RICHIESTA) return;
      set.add(label);
    }
    onChange({
      provinciaSigla: value.provinciaSigla,
      tuttaProvincia: false,
      comuniLabels: [...set].sort((a, b) => a.localeCompare(b, "it")),
    });
  };

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

  const idProv = "richiesta-zona-provincia";
  const idTutta = "richiesta-zona-tutta-provincia";

  return (
    <div className={`space-y-4 ${disabled ? "pointer-events-none opacity-60" : ""}`}>
      <div>
        <label htmlFor={idProv} className="mb-1 block text-sm font-medium text-foreground">
          Provincia
        </label>
        <select
          id={idProv}
          value={value.provinciaSigla}
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

      {value.provinciaSigla ? (
        <div className="rounded-lg border border-border bg-surface-muted/80 p-3">
          <label htmlFor={idTutta} className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
            <input
              id={idTutta}
              type="checkbox"
              checked={value.tuttaProvincia}
              disabled={disabled}
              onChange={(e) => onTuttaProvincia(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">Cerca in tutti i comuni della provincia</span>
              <span className="mt-0.5 block text-xs font-normal text-muted">
                La richiesta sarà visibile ai negozi situati in qualsiasi comune della provincia
                selezionata.
              </span>
            </span>
          </label>
        </div>
      ) : null}

      {value.provinciaSigla && !value.tuttaProvincia ? (
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">
            Comuni in cui cercare
            <span className="ml-2 font-normal text-muted">
              ({value.comuniLabels.length} / {MAX_COMUNI_RICHIESTA})
            </span>
          </p>
          <p className="mb-2 text-xs text-muted">
            Seleziona uno o più comuni. Solo i negozi con sede in uno di questi comuni vedranno la
            richiesta.
          </p>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-border bg-surface p-2">
            <ul className="space-y-1">
              {comuniInProvincia.map((c) => (
                <li key={c.codice}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-surface-muted">
                    <input
                      type="checkbox"
                      checked={value.comuniLabels.includes(c.label)}
                      disabled={disabled}
                      onChange={() => toggleComune(c.label)}
                    />
                    {c.nome}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
