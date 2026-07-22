import { clsx } from 'clsx';
import { Sparkles } from 'lucide-react';

type LimitedEditionBadgeProps = {
  isLimitedEdition?: boolean | null;
  size?: 'sm' | 'md';
};

export function LimitedEditionBadge({ isLimitedEdition, size = 'sm' }: LimitedEditionBadgeProps) {
  if (!isLimitedEdition) return null;

  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center gap-1 rounded-full border font-black',
        size === 'md' ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]',
        'border-amber-200 bg-amber-50 text-amber-700',
      )}
    >
      <Sparkles size={size === 'md' ? 13 : 11} /> Edición limitada
    </span>
  );
}
