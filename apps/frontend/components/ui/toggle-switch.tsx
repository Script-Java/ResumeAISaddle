'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Minimalistic Bento Toggle Switch Component
 */

export interface ToggleSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  className,
}) => {
  const labelId = React.useId();

  const handleToggle = () => {
    if (!disabled) {
      onCheckedChange(!checked);
    }
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 border border-white/5 bg-zinc-900/40 rounded-2xl',
        'shadow-xl shadow-black/20 hover:bg-zinc-800/50 transition-colors',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <div className="flex-1 mr-4">
        <div id={labelId} className="text-sm font-semibold tracking-wide text-zinc-200">
          {label}
        </div>
        {description && <div className="text-xs text-zinc-500 font-medium mt-1">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          'relative inline-flex h-6 w-12 shrink-0 cursor-pointer items-center rounded-full',
          'border border-transparent transition-colors duration-200 ease-in-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900',
          'disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-zinc-300' : 'bg-zinc-700'
        )}
      >
        <span
          className={cn(
            'pointer-events-none block h-5 w-5 rounded-full bg-zinc-950 shadow-sm ring-0',
            'transition-transform duration-200 ease-in-out',
            checked ? 'translate-x-6' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  );
};
