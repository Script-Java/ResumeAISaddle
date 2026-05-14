'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Check,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Briefcase,
  FolderKanban,
  Lightbulb,
} from 'lucide-react';
import { useTranslations } from '@/lib/i18n';
import type { RegenerateItemError, RegeneratedItem } from '@/lib/api/enrichment';

interface RegenerateDiffPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regeneratedItems: RegeneratedItem[];
  regenerateErrors?: RegenerateItemError[];
  error: string | null;
  onAccept: () => void;
  onReject: () => void;
  isApplying: boolean;
}

/**
 * RegenerateDiffPreview Component
 *
 * Third step of the regenerate wizard.
 * Shows side-by-side comparison of original vs regenerated content.
 * Swiss International Style design.
 */
export const RegenerateDiffPreview: React.FC<RegenerateDiffPreviewProps> = ({
  open,
  onOpenChange,
  regeneratedItems,
  regenerateErrors = [],
  error,
  onAccept,
  onReject,
  isApplying,
}) => {
  const { t } = useTranslations();
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(
    new Set(regeneratedItems.map((item) => item.item_id))
  );

  React.useEffect(() => {
    // Expand all items when regeneratedItems changes
    setExpandedItems(new Set(regeneratedItems.map((item) => item.item_id)));
  }, [regeneratedItems]);

  const toggleItem = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  type ItemLabelSource = Pick<RegeneratedItem, 'item_id' | 'item_type' | 'title' | 'subtitle'>;

  const getItemLabel = (item: ItemLabelSource) => {
    if (item.item_type === 'skills') {
      return t('builder.regenerate.selectDialog.skills');
    }

    const title = item.title?.trim();
    const subtitle = item.subtitle?.trim();

    if (title && subtitle) {
      return `${title} | ${subtitle}`;
    }

    return title || item.item_id;
  };

  const getItemIcon = (itemType: string) => {
    switch (itemType) {
      case 'experience':
        return <Briefcase className="w-4 h-4" />;
      case 'project':
        return <FolderKanban className="w-4 h-4" />;
      case 'skills':
        return <Lightbulb className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const resolveErrorMessage = (value: string) => {
    if (value === 'No changes to apply') {
      return t('builder.regenerate.errors.noChangesToApply');
    }

    if (/network|fetch/i.test(value) || value.includes('Failed to fetch')) {
      return t('builder.regenerate.errors.networkError');
    }

    if (/resume content changed|uniquely matched|please regenerate/i.test(value)) {
      return t('builder.regenerate.errors.resumeChanged');
    }

    return t('builder.regenerate.errors.applyFailed');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] p-0 gap-0 rounded-3xl bg-zinc-900/90 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-white/5 bg-zinc-900/50">
          <DialogTitle className="text-xl font-semibold tracking-tight text-zinc-100">
            {t('builder.regenerate.diffPreview.title')}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs text-zinc-400 mt-2">
            {t('builder.regenerate.diffPreview.subtitle')}
          </DialogDescription>
        </DialogHeader>

        {/* Stats Card */}
        <div className="px-6 pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs rounded-full">
            <Check className="w-3 h-3" />
            {t('builder.regenerate.diffPreview.changesCount').replace(
              '{count}',
              String(regeneratedItems.length)
            )}
          </div>
        </div>

        {error ? (
          <div className="px-6 pt-4">
            <div className="border border-red-500/30 bg-red-500/10 px-4 py-3 rounded-xl">
              <p className="font-mono text-xs text-red-400">{resolveErrorMessage(error)}</p>
            </div>
          </div>
        ) : null}

        {regenerateErrors.length > 0 ? (
          <div className="px-6 pt-4">
            <div className="border border-amber-500/30 bg-amber-500/10 px-4 py-3 rounded-xl">
              <p className="font-mono text-xs text-amber-500">
                {t('builder.regenerate.diffPreview.partialFailures', {
                  count: regenerateErrors.length,
                })}
              </p>
              <ul className="mt-2 space-y-1">
                {regenerateErrors.map((failed) => (
                  <li key={failed.item_id} className="font-mono text-xs text-amber-400/80">
                    • {getItemLabel(failed)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {/* Diff Content */}
        <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
          {regeneratedItems.map((item) => (
            <div key={item.item_id} className="border border-white/10 rounded-2xl overflow-hidden bg-zinc-950">
              {/* Item Header */}
              <button
                type="button"
                onClick={() => toggleItem(item.item_id)}
                aria-expanded={expandedItems.has(item.item_id)}
                aria-label={
                  expandedItems.has(item.item_id)
                    ? t('builder.regenerate.diffPreview.collapseItem', { item: getItemLabel(item) })
                    : t('builder.regenerate.diffPreview.expandItem', { item: getItemLabel(item) })
                }
                className="w-full p-4 flex items-center justify-between bg-zinc-900/50 hover:bg-zinc-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getItemIcon(item.item_type)}
                  <span className="font-mono text-sm tracking-wider font-medium truncate text-zinc-200">
                    {getItemLabel(item)}
                  </span>
                </div>
                {expandedItems.has(item.item_id) ? (
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                )}
              </button>

              {/* Item Diff Content */}
              {expandedItems.has(item.item_id) && (
                <div className="border-t border-white/10 bg-zinc-950">
                  {/* Change Summary */}
                  {item.diff_summary && (
                    <div className="p-3 border-b border-white/10">
                      <p className="font-mono text-xs text-blue-400">{item.diff_summary}</p>
                    </div>
                  )}

                  {/* Original Content */}
                  <div className="p-4 border-b border-white/10">
                    <div className="font-mono text-xs uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      {t('builder.regenerate.diffPreview.originalLabel')}
                    </div>
                    <div className="border border-red-500/20 rounded-xl bg-red-500/5 p-4 space-y-1">
                      {item.original_content.length > 0 ? (
                        item.original_content.map((content, idx) => (
                          <p key={idx} className="text-sm text-red-400/80 line-through">
                            <span className="font-mono mr-2">−</span>
                            {content}
                          </p>
                        ))
                      ) : (
                        <p className="text-sm text-zinc-600 italic">
                          {t('builder.regenerate.diffPreview.noContent')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* New Content */}
                  <div className="p-4">
                    <div className="font-mono text-xs uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {t('builder.regenerate.diffPreview.newLabel')}
                    </div>
                    <div className="border border-emerald-500/20 rounded-xl bg-emerald-500/5 p-4 space-y-1">
                      {item.new_content.length > 0 ? (
                        item.new_content.map((content, idx) => (
                          <p key={idx} className="text-sm text-emerald-400">
                            <span className="font-mono mr-2">+</span>
                            {content}
                          </p>
                        ))
                      ) : (
                        <p className="text-sm text-zinc-600 italic">
                          {t('builder.regenerate.diffPreview.noContent')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="p-4 bg-zinc-900/50 border-t border-white/5 flex-row justify-between gap-3">
          <Button
            variant="outline"
            onClick={onReject}
            disabled={isApplying}
            className="rounded-xl border-white/10 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('builder.regenerate.diffPreview.rejectButton')}
          </Button>
          <Button
            onClick={onAccept}
            disabled={isApplying}
            className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black"
          >
            {isApplying ? (
              <>
                <span className="animate-spin mr-2">
                  <Check className="w-4 h-4" />
                </span>
                {t('builder.regenerate.diffPreview.applying')}
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                {t('builder.regenerate.diffPreview.acceptButton')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RegenerateDiffPreview;
