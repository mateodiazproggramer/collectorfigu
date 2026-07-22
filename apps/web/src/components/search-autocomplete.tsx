'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

type Suggestion = {
  id: string;
  slug: string;
  name: string;
  price: number;
  images?: Array<{ url: string; isMain?: boolean; variantId?: string | null }>;
};

const SUGGESTIONS_LIMIT = 12;

function suggestionImage(product: Suggestion) {
  const general = (product.images ?? []).filter((image) => !image.variantId);
  return general.find((image) => image.isMain)?.url ?? general[0]?.url ?? product.images?.[0]?.url;
}

type SearchAutocompleteProps = {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  inputClassName?: string;
};

export function SearchAutocomplete({ name = 'q', defaultValue = '', placeholder, ariaLabel, className, inputClassName }: SearchAutocompleteProps) {
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    const query = value.trim();
    if (query.length < 2) {
      setSuggestions([]);
      return undefined;
    }
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/products?q=${encodeURIComponent(query)}&limit=${SUGGESTIONS_LIMIT}&available=true&sort=price_desc`);
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(data.items ?? []);
        setTotalMatches(data.meta?.total ?? data.items?.length ?? 0);
        setOpen(true);
      } catch {
        setSuggestions([]);
        setTotalMatches(0);
      }
    }, 250);
    return () => window.clearTimeout(debounceRef.current);
  }, [value]);

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <input
        name={name}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onFocus={() => { if (suggestions.length) setOpen(true); }}
        autoComplete="off"
        aria-label={ariaLabel}
        placeholder={placeholder}
        className={inputClassName}
      />
      {open && suggestions.length ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,.18)]">
          <div className="max-h-80 overflow-y-auto">
            {suggestions.map((product) => (
              <Link
                key={product.id}
                href={`/productos/${product.slug}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 border-b border-slate-100 p-3 text-left transition last:border-0 hover:bg-slate-50"
              >
                <span className="grid h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  {suggestionImage(product) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={suggestionImage(product)} alt={product.name} className="h-full w-full object-cover" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-900">{product.name}</span>
                  <span className="block font-mono text-xs font-black text-brand-blue">{formatCurrency(product.price)}</span>
                </span>
              </Link>
            ))}
          </div>
          <Link
            href={`/productos?q=${encodeURIComponent(value.trim())}&sort=price_desc`}
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 border-t border-slate-100 bg-slate-50 p-3 text-center text-sm font-black text-brand-blue transition hover:bg-slate-100"
          >
            Ver todos los resultados{totalMatches ? ` (${totalMatches})` : ''} <ArrowRight size={15} />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
