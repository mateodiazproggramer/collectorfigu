'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { citiesByDepartment, type ColombiaCity } from '@/lib/colombia-locations';

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

const MAX_RESULTS = 60;

type CitySelectProps = {
  label: string;
  name?: string;
  value: string;
  department: string;
  onSelect: (city: string) => void;
  error?: string;
};

export function CitySelect({ label, name, value, department, onSelect, error }: CitySelectProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const options = useMemo(() => citiesByDepartment(department), [department]);

  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery(value);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [value]);

  const results = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return options.slice(0, MAX_RESULTS);
    const starts: ColombiaCity[] = [];
    const includes: ColombiaCity[] = [];
    for (const entry of options) {
      const normalizedCity = normalize(entry.city);
      if (normalizedCity.startsWith(needle)) starts.push(entry);
      else if (normalizedCity.includes(needle)) includes.push(entry);
    }
    return [...starts, ...includes].slice(0, MAX_RESULTS);
  }, [query, options]);

  function select(entry: ColombiaCity) {
    onSelect(entry.city);
    setQuery(entry.city);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative grid gap-2 text-sm font-bold text-brand-inkSoft">
      <span>{label}</span>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-inkSoft/60" />
        <input
          id={name}
          className={`input-brand pl-10 ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
          placeholder="Busca tu ciudad o municipio..."
          aria-invalid={error ? true : undefined}
          role="combobox"
          aria-expanded={open}
        />
      </div>
      {error ? <span className="text-xs font-bold text-red-600">{error}</span> : null}

      {open && results.length ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-[4.6rem] max-h-64 overflow-y-auto rounded-2xl border border-brand-line bg-white shadow-[0_18px_45px_rgba(15,23,42,.18)]">
          {results.map((entry) => (
            <button
              key={entry.city}
              type="button"
              onClick={() => select(entry)}
              className={`flex w-full items-center gap-2 border-b border-brand-line px-4 py-2.5 text-left text-sm transition last:border-0 hover:bg-brand-paper2 ${entry.city === value ? 'bg-brand-violet/5 font-black text-brand-violet' : 'text-brand-ink'}`}
            >
              <MapPin size={14} className="shrink-0 text-brand-inkSoft/50" />
              <span className="truncate">{entry.city}</span>
            </button>
          ))}
        </div>
      ) : null}
      {open && query.trim() && !results.length ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-[4.6rem] rounded-2xl border border-brand-line bg-white p-4 text-sm font-semibold text-brand-inkSoft shadow-[0_18px_45px_rgba(15,23,42,.18)]">
          No encontramos esa ciudad en este departamento.
        </div>
      ) : null}
    </div>
  );
}
