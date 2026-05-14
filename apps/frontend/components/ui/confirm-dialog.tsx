'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './dialog';
import { Button } from './button';
import { useTranslations } from '@/lib/i18n';

/**
 * Swiss International Style Confirm Dialog Component
 *
 * A modal dialog for confirming user actions with semantic variants:
 * - danger: Destructive actions (delete, remove)
 * - warning: Caution actions (reset, overwrite)
 * - success: Positive confirmations
 * - default: Neutral confirmations
 */

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  errorMessage?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmDisabled?: boolean;
  variant?: 'danger' | 'warning' | 'success' | 'default';
  closeOnConfirm?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  showCancelButton?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  errorMessage,
  confirmLabel,
  cancelLabel,
  confirmDisabled = false,
  variant = 'default',
  closeOnConfirm = true,
  onConfirm,
  onCancel,
  showCancelButton = true,
}) => {
  const { t } = useTranslations();
  const finalConfirmLabel = confirmLabel ?? t('common.confirm');
  const finalCancelLabel = cancelLabel ?? t('common.cancel');

  const handleConfirm = () => {
    if (confirmDisabled) return;
    onConfirm();
    if (closeOnConfirm) {
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const variantStyles = {
    danger: {
      icon: (
        <div className="w-11 h-11 rounded-xl border border-red-500/30 bg-red-500/10 flex items-center justify-center shrink-0">
          <span className="text-red-400 text-lg font-bold">!</span>
        </div>
      ),
      buttonVariant: 'destructive' as const,
    },
    warning: {
      icon: (
        <div className="w-11 h-11 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-center shrink-0">
          <span className="text-amber-400 text-lg font-bold">!</span>
        </div>
      ),
      buttonVariant: 'warning' as const,
    },
    success: {
      icon: (
        <div className="w-11 h-11 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center shrink-0">
          <span className="text-emerald-400 text-lg font-bold">&#10003;</span>
        </div>
      ),
      buttonVariant: 'success' as const,
    },
    default: {
      icon: (
        <div className="w-11 h-11 rounded-xl border border-zinc-500/30 bg-zinc-500/10 flex items-center justify-center shrink-0">
          <span className="text-zinc-400 text-lg font-bold">?</span>
        </div>
      ),
      buttonVariant: 'default' as const,
    },
  };

  const { icon, buttonVariant } = variantStyles[variant];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 gap-0">
        <DialogHeader className="p-5 sm:p-6 pb-3 sm:pb-4">
          <div className="flex items-start gap-3 sm:gap-4">
            {icon}
            <div className="flex-1 min-w-0 pt-0.5">
              <DialogTitle className="text-base sm:text-lg font-semibold text-zinc-100">
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm text-zinc-400 mt-1.5 leading-relaxed">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {errorMessage && (
          <div className="px-5 sm:px-6 pb-4">
            <div className="border border-red-500/20 bg-red-500/5 p-3 rounded-xl text-sm text-red-400">
              {errorMessage}
            </div>
          </div>
        )}
        <DialogFooter className="p-4 sm:p-6 pt-3 sm:pt-4 border-t border-white/5 flex-col sm:flex-row gap-2 sm:gap-3">
          {showCancelButton && (
            <Button variant="outline" onClick={handleCancel} className="w-full sm:w-auto rounded-xl">
              {finalCancelLabel}
            </Button>
          )}
          <Button
            variant={buttonVariant}
            onClick={handleConfirm}
            className="w-full sm:w-auto rounded-xl"
            disabled={confirmDisabled}
          >
            {finalConfirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
