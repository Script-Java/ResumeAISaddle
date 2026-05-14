'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from '@/lib/i18n';

interface GenericTextFormProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

/**
 * Generic Text Form Component
 *
 * Used for TEXT type sections (like Summary).
 * Renders a single textarea for text content.
 */
export const GenericTextForm: React.FC<GenericTextFormProps> = ({
  value,
  onChange,
  label,
  placeholder,
}) => {
  const { t } = useTranslations();
  const finalLabel = label ?? t('builder.customSections.contentLabel');
  const finalPlaceholder = placeholder ?? t('builder.customSections.defaultTextPlaceholder');

  // Explicitly allow Enter key to create newlines
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.stopPropagation();
    }
  };

  return (
    <div className="space-y-4">
      <Label className="font-mono text-xs uppercase tracking-wider text-zinc-400">
        {finalLabel}
      </Label>
      <Textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={finalPlaceholder}
        className="min-h-[150px] rounded-xl border-white/10 bg-zinc-950 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-emerald-500"
      />
    </div>
  );
};
