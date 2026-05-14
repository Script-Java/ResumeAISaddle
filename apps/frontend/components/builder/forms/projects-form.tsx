'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

// Lazy-load TipTap-based editor — keeps it out of the initial bundle.
const RichTextEditor = dynamic(
  () => import('@/components/ui/rich-text-editor').then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[100px] border border-black bg-transparent" aria-busy="true" />
    ),
  }
);
import { Project } from '@/components/dashboard/resume-component';
import { Plus, Trash2, Github, Globe } from 'lucide-react';
import { useTranslations } from '@/lib/i18n';

interface ProjectsFormProps {
  data: Project[];
  onChange: (data: Project[]) => void;
}

export const ProjectsForm: React.FC<ProjectsFormProps> = ({ data, onChange }) => {
  const { t } = useTranslations();

  const handleAdd = () => {
    const newId = Math.max(...data.map((d) => d.id), 0) + 1;
    onChange([
      ...data,
      {
        id: newId,
        name: '',
        role: '',
        years: '',
        github: '',
        website: '',
        description: [''],
      },
    ]);
  };

  const handleRemove = (id: number) => {
    onChange(data.filter((item) => item.id !== id));
  };

  const handleChange = (id: number, field: keyof Project, value: string | string[]) => {
    onChange(
      data.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleDescriptionChange = (id: number, index: number, value: string) => {
    onChange(
      data.map((item) => {
        if (item.id === id) {
          const newDesc = [...(item.description || [])];
          newDesc[index] = value;
          return { ...item, description: newDesc };
        }
        return item;
      })
    );
  };

  const handleAddDescription = (id: number) => {
    onChange(
      data.map((item) => {
        if (item.id === id) {
          return { ...item, description: [...(item.description || []), ''] };
        }
        return item;
      })
    );
  };

  const handleRemoveDescription = (id: number, index: number) => {
    onChange(
      data.map((item) => {
        if (item.id === id) {
          const newDesc = [...(item.description || [])];
          newDesc.splice(index, 1);
          return { ...item, description: newDesc };
        }
        return item;
      })
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="rounded-xl border-white/10 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 transition-colors shadow-none"
        >
          <Plus className="w-4 h-4 mr-2" /> {t('builder.forms.projects.addProject')}
        </Button>
      </div>

      <div className="space-y-8">
        {data.map((item) => (
          <div key={item.id} className="p-6 rounded-2xl border border-white/5 bg-zinc-900/30 backdrop-blur-sm relative group">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={() => handleRemove(item.id)}
              aria-label={t('a11y.removeItem')}
              title={t('a11y.removeItem')}
            >
              <Trash2 className="w-4 h-4" />
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pr-8">
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider text-zinc-400">
                  {t('builder.forms.projects.fields.projectName')}
                </Label>
                <Input
                  value={item.name || ''}
                  onChange={(e) => handleChange(item.id, 'name', e.target.value)}
                  placeholder={t('builder.forms.projects.placeholders.projectName')}
                  className="rounded-xl border-white/10 bg-zinc-950 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider text-zinc-400">
                  {t('builder.forms.projects.fields.role')}
                </Label>
                <Input
                  value={item.role || ''}
                  onChange={(e) => handleChange(item.id, 'role', e.target.value)}
                  placeholder={t('builder.forms.projects.placeholders.role')}
                  className="rounded-xl border-white/10 bg-zinc-950 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider text-zinc-400">
                  {t('builder.genericItemForm.fields.years')}{' '}
                  <span className="text-zinc-600">({t('common.optional')})</span>
                </Label>
                <Input
                  value={item.years || ''}
                  onChange={(e) => handleChange(item.id, 'years', e.target.value)}
                  placeholder={t('builder.forms.projects.placeholders.years')}
                  className="rounded-xl border-white/10 bg-zinc-950 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider text-zinc-400">
                  <Github className="w-3 h-3 inline mr-1" />
                  GitHub <span className="text-zinc-600">({t('common.optional')})</span>
                </Label>
                <Input
                  value={item.github || ''}
                  onChange={(e) => handleChange(item.id, 'github', e.target.value)}
                  placeholder={t('builder.forms.projects.placeholders.github')}
                  className="rounded-xl border-white/10 bg-zinc-950 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-emerald-500"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="font-mono text-xs uppercase tracking-wider text-zinc-400">
                  <Globe className="w-3 h-3 inline mr-1" />
                  {t('builder.forms.projects.fields.website')}{' '}
                  <span className="text-zinc-600">({t('common.optional')})</span>
                </Label>
                <Input
                  value={item.website || ''}
                  onChange={(e) => handleChange(item.id, 'website', e.target.value)}
                  placeholder={t('builder.forms.projects.placeholders.website')}
                  className="rounded-xl border-white/10 bg-zinc-950 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="font-mono text-xs uppercase tracking-wider text-zinc-400">
                  {t('builder.genericItemForm.fields.descriptionPoints')}
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAddDescription(item.id)}
                  className="h-6 text-xs text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md"
                >
                  <Plus className="w-3 h-3 mr-1" /> {t('builder.genericItemForm.actions.addPoint')}
                </Button>
              </div>
              {item.description?.map((desc, idx) => (
                <div key={idx} className="flex gap-2">
                  <div className="flex-1">
                    <RichTextEditor
                      value={desc}
                      onChange={(html) => handleDescriptionChange(item.id, idx, html)}
                      placeholder={t('builder.forms.projects.placeholders.description')}
                      minHeight="60px"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveDescription(item.id, idx)}
                    className="h-[60px] w-8 text-muted-foreground hover:text-destructive self-end"
                    aria-label={t('a11y.removeDescription')}
                    title={t('a11y.removeDescription')}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {data.length === 0 && (
          <div className="text-center py-12 bg-zinc-900/20 rounded-2xl border border-dashed border-white/10">
            <p className="font-mono text-sm text-zinc-500 mb-4">
              {t('builder.genericItemForm.noEntries', { label: t('resume.sections.projects') })}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAdd}
              className="rounded-xl border-white/10 bg-zinc-950 text-zinc-300 hover:bg-zinc-800"
            >
              <Plus className="w-4 h-4 mr-2" /> {t('builder.forms.projects.addFirstProject')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
