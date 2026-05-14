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
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Sparkles, Briefcase, FolderKanban, Lightbulb } from 'lucide-react';
import { useTranslations } from '@/lib/i18n';
import type { RegenerateItemInput } from '@/lib/api/enrichment';

interface RegenerateInstructionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: RegenerateItemInput[];
  instruction: string;
  onInstructionChange: (instruction: string) => void;
  error: string | null;
  onBack: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

/**
 * RegenerateInstructionDialog Component
 *
 * Second step of the regenerate wizard.
 * Shows selected items and allows user to input improvement instructions.
 * Swiss International Style design.
 */
export const RegenerateInstructionDialog: React.FC<RegenerateInstructionDialogProps> = ({
  open,
  onOpenChange,
  selectedItems,
  instruction,
  onInstructionChange,
  error,
  onBack,
  onGenerate,
  isGenerating,
}) => {
  const { t } = useTranslations();

  const resolveErrorMessage = (value: string) => {
    if (value === 'No items selected') {
      return t('builder.regenerate.selectDialog.noItemsSelected');
    }

    if (/network|fetch/i.test(value) || value.includes('Failed to fetch')) {
      return t('builder.regenerate.errors.networkError');
    }

    return t('builder.regenerate.errors.generationFailed');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow Enter key in textarea without closing dialog
    if (e.key === 'Enter') {
      e.stopPropagation();
    }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 rounded-3xl bg-zinc-900/90 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-white/5 bg-zinc-900/50">
          <DialogTitle className="text-xl font-semibold tracking-tight text-zinc-100">
            {t('builder.regenerate.instructionDialog.title')}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs text-zinc-400 mt-2">
            {t('builder.regenerate.instructionDialog.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {error ? (
            <div className="border border-red-500/30 bg-red-500/10 px-4 py-3 rounded-xl">
              <p className="font-mono text-xs text-red-400">{resolveErrorMessage(error)}</p>
            </div>
          ) : null}
          {/* Selected Items Summary */}
          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider text-zinc-400">
              {t('builder.regenerate.instructionDialog.selectedItems')}
            </label>
            <div className="bg-zinc-950 border border-white/10 rounded-xl p-3 space-y-2 max-h-32 overflow-y-auto">
              {selectedItems.map((item) => (
                <div key={item.item_id} className="flex items-center gap-2 text-sm">
                  <span className="text-zinc-500">{getItemIcon(item.item_type)}</span>
                  <span className="font-medium truncate text-zinc-200">{item.title}</span>
                  {item.subtitle && (
                    <span className="text-zinc-500 text-xs truncate">| {item.subtitle}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Instruction Input */}
          <div className="space-y-2">
            <label
              htmlFor="regenerate-instruction"
              className="font-mono text-xs uppercase tracking-wider text-zinc-400"
            >
              {t('builder.regenerate.instructionDialog.hint')}
            </label>
            <Textarea
              id="regenerate-instruction"
              value={instruction}
              onChange={(e) => onInstructionChange(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={2000}
              placeholder={t('builder.regenerate.instructionDialog.placeholder')}
              className="min-h-[120px] rounded-xl border-white/10 bg-zinc-950 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-emerald-500"
              disabled={isGenerating}
            />
          </div>
        </div>

        <DialogFooter className="p-4 bg-zinc-900/50 border-t border-white/5 flex-row justify-between gap-3">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isGenerating}
            className="rounded-xl border-white/10 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('builder.regenerate.instructionDialog.backButton')}
          </Button>
          <Button onClick={onGenerate} disabled={isGenerating} className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black gap-2">
            {isGenerating ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                {t('builder.regenerate.diffPreview.loading')}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {t('builder.regenerate.instructionDialog.generateButton')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RegenerateInstructionDialog;
