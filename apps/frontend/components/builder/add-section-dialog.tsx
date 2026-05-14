'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, FileText, List, ListOrdered } from 'lucide-react';
import type { SectionType } from '@/components/dashboard/resume-component';
import { useTranslations } from '@/lib/i18n';

interface AddSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (displayName: string, sectionType: SectionType) => void;
}

type SelectableSectionType = Exclude<SectionType, 'personalInfo'>;

/**
 * AddSectionDialog Component
 *
 * Dialog for creating new custom sections.
 * Allows user to enter a name and select a section type.
 */
export const AddSectionDialog: React.FC<AddSectionDialogProps> = ({
  open,
  onOpenChange,
  onAdd,
}) => {
  const { t } = useTranslations();
  const [displayName, setDisplayName] = useState('');
  const [sectionType, setSectionType] = useState<SelectableSectionType>('text');

  const handleSubmit = () => {
    if (displayName.trim()) {
      onAdd(displayName.trim(), sectionType);
      setDisplayName('');
      setSectionType('text');
      onOpenChange(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && displayName.trim()) {
      handleSubmit();
    }
  };

  const sectionTypes: {
    type: SelectableSectionType;
    label: string;
    icon: React.ReactNode;
    description: string;
  }[] = [
    {
      type: 'text',
      label: t('builder.customSections.sectionTypes.textBlockLabel'),
      icon: <FileText className="w-5 h-5" />,
      description: t('builder.customSections.sectionTypes.textBlockDescription'),
    },
    {
      type: 'itemList',
      label: t('builder.customSections.sectionTypes.itemListLabel'),
      icon: <ListOrdered className="w-5 h-5" />,
      description: t('builder.customSections.sectionTypes.itemListDescription'),
    },
    {
      type: 'stringList',
      label: t('builder.customSections.sectionTypes.stringListLabel'),
      icon: <List className="w-5 h-5" />,
      description: t('builder.customSections.sectionTypes.stringListDescription'),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-zinc-900/90 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 p-0 gap-0 rounded-3xl overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-white/5 bg-zinc-900/50">
          <DialogTitle className="text-xl font-semibold tracking-tight text-zinc-100">
            {t('builder.customSections.dialogTitle')}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs text-zinc-400 mt-2">
            {t('builder.customSections.dialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Section Name */}
          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-wider text-zinc-400">
              {t('builder.customSections.sectionNameLabel')}
            </Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('builder.customSections.sectionNamePlaceholder')}
              className="rounded-xl border-white/10 bg-zinc-950 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-emerald-500"
              autoFocus
            />
          </div>

          {/* Section Type */}
          <div className="space-y-3">
            <Label className="font-mono text-xs uppercase tracking-wider text-zinc-400">
              {t('builder.customSections.sectionTypeLabel')}
            </Label>
            <div className="space-y-2">
              {sectionTypes.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setSectionType(item.type)}
                  className={`w-full p-4 rounded-xl border text-left transition-colors ${
                    sectionType === item.type
                      ? 'border-emerald-500/50 bg-emerald-500/10 shadow-sm'
                      : 'border-white/10 bg-zinc-950/50 hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg border ${
                        sectionType === item.type
                          ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400'
                          : 'border-white/5 bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <div className={`font-sans font-medium text-sm ${sectionType === item.type ? 'text-zinc-100' : 'text-zinc-300'}`}>{item.label}</div>
                      <div className="font-mono text-xs text-zinc-500 mt-0.5">
                        {item.description}
                      </div>
                    </div>
                    {sectionType === item.type && (
                      <div className="w-4 h-4 rounded-full border-2 border-emerald-500 bg-emerald-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-zinc-900/50 border-t border-white/5 flex-row justify-end gap-3">
          <DialogClose asChild>
            <Button variant="outline" className="rounded-xl border-white/10 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100">
              {t('common.cancel')}
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!displayName.trim()} className="rounded-xl">
            <Plus className="w-4 h-4 mr-2" />
            {t('builder.addSection')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * AddSectionButton Component
 *
 * Button that triggers the AddSectionDialog.
 */
interface AddSectionButtonProps {
  onAdd: (displayName: string, sectionType: SectionType) => void;
}

export const AddSectionButton: React.FC<AddSectionButtonProps> = ({ onAdd }) => {
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border-dashed border-2 border-white/10 py-6 bg-zinc-900/20 text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200 hover:border-white/20 transition-all shadow-none"
      >
        <Plus className="w-5 h-5 mr-2" />
        {t('builder.customSections.addCustomSectionButton')}
      </Button>
      <AddSectionDialog open={open} onOpenChange={setOpen} onAdd={onAdd} />
    </>
  );
};
