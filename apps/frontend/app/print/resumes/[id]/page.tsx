'use client';

import React, { useEffect, useState } from 'react';
import Resume, { ResumeData } from '@/components/dashboard/resume-component';
import {
  type TemplateType,
  type PageSize,
  type TemplateSettings,
  type SpacingLevel,
  type HeaderFontFamily,
  type BodyFontFamily,
  type AccentColor,
  DEFAULT_TEMPLATE_SETTINGS,
} from '@/lib/types/template-settings';
import { fetchResume } from '@/lib/api/resume';
import { withLocalizedDefaultSections } from '@/lib/utils/section-helpers';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from '@/lib/i18n';
import { resolveLocale } from '@/lib/i18n/locale';

function parseHeaderFont(value: string | null): HeaderFontFamily {
  if (value === 'serif' || value === 'sans-serif' || value === 'mono') {
    return value;
  }
  return DEFAULT_TEMPLATE_SETTINGS.fontSize.headerFont;
}

function parseBodyFont(value: string | null): BodyFontFamily {
  if (value === 'serif' || value === 'sans-serif' || value === 'mono') {
    return value;
  }
  return DEFAULT_TEMPLATE_SETTINGS.fontSize.bodyFont;
}

function parseAccentColor(value: string | null): AccentColor {
  if (value === 'blue' || value === 'green' || value === 'orange' || value === 'red') {
    return value;
  }
  return DEFAULT_TEMPLATE_SETTINGS.accentColor;
}

function parseBoolean(value: string | null, defaultValue: boolean): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return defaultValue;
}

function parseSpacingLevel(value: string | null, defaultValue: SpacingLevel): SpacingLevel {
  if (!value) return defaultValue;
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 1 || num > 5) return defaultValue;
  return num as SpacingLevel;
}

function parseMargin(value: string | null, defaultValue: number): number {
  if (!value) return defaultValue;
  const num = parseInt(value, 10);
  if (isNaN(num)) return defaultValue;
  return Math.max(5, Math.min(25, num));
}

function parseTemplate(value: string | null): TemplateType {
  if (
    value === 'swiss-single' ||
    value === 'swiss-two-column' ||
    value === 'modern' ||
    value === 'modern-two-column'
  ) {
    return value;
  }
  return 'swiss-single';
}

function parsePageSize(value: string | null): PageSize {
  if (value === 'A4' || value === 'LETTER') {
    return value;
  }
  return 'A4';
}

export default function PrintResumePage() {
  const { t, locale } = useTranslations();
  const params = useParams();
  const searchParams = useSearchParams();
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id = params?.id as string;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchResume(id);
        if (cancelled) return;

        if (data.processed_resume) {
          setResumeData(data.processed_resume as ResumeData);
        } else if (data.raw_resume?.content) {
          try {
            const parsed = JSON.parse(data.raw_resume.content) as ResumeData;
            setResumeData(parsed);
          } catch {
            setError('Could not parse resume data');
          }
        } else {
          setError('No resume data available');
        }
      } catch (err) {
        if (!cancelled) setError('Failed to load resume');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [id]);

  const resolvedLocale = resolveLocale(searchParams?.get('lang') || locale);
  const resolvedSearchParams = searchParams ? Object.fromEntries(searchParams.entries()) : {};

  const settings: TemplateSettings = {
    template: parseTemplate(resolvedSearchParams.template ?? null),
    pageSize: parsePageSize(resolvedSearchParams.pageSize ?? null),
    margins: {
      top: parseMargin(resolvedSearchParams.marginTop ?? null, DEFAULT_TEMPLATE_SETTINGS.margins.top),
      bottom: parseMargin(resolvedSearchParams.marginBottom ?? null, DEFAULT_TEMPLATE_SETTINGS.margins.bottom),
      left: parseMargin(resolvedSearchParams.marginLeft ?? null, DEFAULT_TEMPLATE_SETTINGS.margins.left),
      right: parseMargin(resolvedSearchParams.marginRight ?? null, DEFAULT_TEMPLATE_SETTINGS.margins.right),
    },
    spacing: {
      section: parseSpacingLevel(resolvedSearchParams.sectionSpacing ?? null, DEFAULT_TEMPLATE_SETTINGS.spacing.section),
      item: parseSpacingLevel(resolvedSearchParams.itemSpacing ?? null, DEFAULT_TEMPLATE_SETTINGS.spacing.item),
      lineHeight: parseSpacingLevel(resolvedSearchParams.lineHeight ?? null, DEFAULT_TEMPLATE_SETTINGS.spacing.lineHeight),
    },
    fontSize: {
      base: parseSpacingLevel(resolvedSearchParams.fontSize ?? null, DEFAULT_TEMPLATE_SETTINGS.fontSize.base),
      headerScale: parseSpacingLevel(resolvedSearchParams.headerScale ?? null, DEFAULT_TEMPLATE_SETTINGS.fontSize.headerScale),
      headerFont: parseHeaderFont(resolvedSearchParams.headerFont ?? null),
      bodyFont: parseBodyFont(resolvedSearchParams.bodyFont ?? null),
    },
    compactMode: parseBoolean(resolvedSearchParams.compactMode ?? null, DEFAULT_TEMPLATE_SETTINGS.compactMode),
    showContactIcons: parseBoolean(resolvedSearchParams.showContactIcons ?? null, DEFAULT_TEMPLATE_SETTINGS.showContactIcons),
    accentColor: parseAccentColor(resolvedSearchParams.accentColor ?? null),
  };

  const printSettings: TemplateSettings = {
    ...settings,
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  };

  const additionalSectionLabels = {
    technicalSkills: t('resume.additionalLabels.technicalSkills'),
    languages: t('resume.additionalLabels.languages'),
    certifications: t('resume.additionalLabels.certifications'),
    awards: t('resume.additionalLabels.awards'),
  };

  const sectionHeadings = {
    summary: t('resume.sections.summary'),
    experience: t('resume.sections.experience'),
    education: t('resume.sections.education'),
    projects: t('resume.sections.projects'),
    certifications: t('resume.sections.certifications'),
    skills: t('resume.sections.skillsOnly'),
    languages: t('resume.sections.languages'),
    awards: t('resume.sections.awards'),
    links: t('resume.sections.links'),
  };

  const fallbackLabels = { name: t('resume.defaults.name') };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-zinc-500">Loading...</div>;
  }

  if (error || !resumeData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-red-500">{error || 'Unable to load resume'}</p>
      </div>
    );
  }

  const localizedResumeData = withLocalizedDefaultSections(resumeData, t);

  return (
    <div className="resume-print bg-white">
      <Resume
        resumeData={localizedResumeData}
        template={settings.template}
        settings={printSettings}
        additionalSectionLabels={additionalSectionLabels}
        sectionHeadings={sectionHeadings}
        fallbackLabels={fallbackLabels}
      />
    </div>
  );
}