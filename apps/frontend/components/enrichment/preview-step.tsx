'use client';

import { Button } from '@/components/ui/button';
import { Check, X, Briefcase, FolderKanban } from 'lucide-react';
import type { EnhancedDescription } from '@/lib/api/enrichment';
import { useTranslations } from '@/lib/i18n';

interface PreviewStepProps {
  enhancements: EnhancedDescription[];
  onApply: () => void;
  onCancel: () => void;
}

export function PreviewStep({ enhancements, onApply, onCancel }: PreviewStepProps) {
  const { t } = useTranslations();
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-100 mb-2">{t('enrichment.preview.title')}</h2>
        <p className="text-zinc-400 font-mono text-sm">{t('enrichment.preview.description')}</p>
      </div>

      {/* Enhancements list */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
        {enhancements.map((enhancement) => (
          <EnhancementCard key={enhancement.item_id} enhancement={enhancement} />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-white/5 mt-6">
        <Button variant="outline" onClick={onCancel} className="gap-2 rounded-xl border-white/10 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100">
          <X className="w-4 h-4" />
          {t('common.cancel')}
        </Button>
        <Button onClick={onApply} className="gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black">
          <Check className="w-4 h-4" />
          {t('enrichment.preview.applyButton')}
        </Button>
      </div>
    </div>
  );
}

interface EnhancementCardProps {
  enhancement: EnhancedDescription;
}

function EnhancementCard({ enhancement }: EnhancementCardProps) {
  const { t } = useTranslations();
  const itemTypeLabel =
    enhancement.item_type === 'experience'
      ? t('enrichment.itemType.experience')
      : t('enrichment.itemType.project');

  return (
    <div className="border border-white/10 rounded-2xl bg-zinc-950 overflow-hidden shadow-md">
      {/* Card header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-zinc-900/50">
        {enhancement.item_type === 'experience' ? (
          <Briefcase className="w-4 h-4 text-zinc-400" />
        ) : (
          <FolderKanban className="w-4 h-4 text-zinc-400" />
        )}
        <span className="font-mono text-sm font-bold uppercase text-zinc-300">{itemTypeLabel}</span>
        <span className="text-zinc-600">|</span>
        <span className="font-semibold text-zinc-200">{enhancement.title}</span>
      </div>

      {/* Content preview */}
      <div className="p-4">
        <div className="space-y-4">
          {/* Existing bullets - keeping */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold uppercase text-zinc-500">
                {t('enrichment.preview.keepingLabel')}
              </span>
              <span className="text-xs text-zinc-500">
                {t('enrichment.preview.existingCount', {
                  count: enhancement.original_description.length,
                })}
              </span>
            </div>
            <ul className="space-y-2">
              {enhancement.original_description.map((bullet, i) => (
                <li key={i} className="text-sm text-zinc-400 pl-4 border-l-2 border-white/10 py-1">
                  {bullet}
                </li>
              ))}
              {enhancement.original_description.length === 0 && (
                <li className="text-sm text-zinc-600 italic pl-4">
                  {t('enrichment.preview.noExistingDescription')}
                </li>
              )}
            </ul>
          </div>

          {/* New bullets - adding */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold uppercase text-emerald-500">
                {t('enrichment.preview.addingLabel')}
              </span>
              <span className="text-xs text-emerald-500/80">
                {t('enrichment.preview.newCount', {
                  count: enhancement.enhanced_description.length,
                })}
              </span>
            </div>
            <ul className="space-y-2">
              {enhancement.enhanced_description.map((bullet, i) => (
                <li
                  key={i}
                  className="text-sm text-zinc-300 pl-4 border-l-2 border-emerald-500 bg-emerald-500/5 py-2 pr-3 rounded-r-lg"
                >
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
