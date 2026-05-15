'use client';

import React, { useEffect, useState } from 'react';
import { fetchResume } from '@/lib/api/resume';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from '@/lib/i18n';
import { resolveLocale } from '@/lib/i18n/locale';

const PAGE_DIMENSIONS = {
  A4: { width: 210, height: 297 },
  LETTER: { width: 215.9, height: 279.4 },
} as const;

type PageSize = 'A4' | 'LETTER';

interface PersonalInfo {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
}

function parsePageSize(value: string | null): PageSize {
  if (value === 'A4' || value === 'LETTER') {
    return value;
  }
  return 'A4';
}

export default function PrintCoverLetterPage() {
  const { t, locale } = useTranslations();
  const params = useParams();
  const searchParams = useSearchParams();
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id = params?.id as string;
  const pageSize = parsePageSize(searchParams?.get('pageSize') ?? null);
  const resolvedLocale = resolveLocale(searchParams?.get('lang') || locale);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchResume(id);
        if (cancelled) return;
        setCoverLetter(data.cover_letter || null);
        setPersonalInfo((data.processed_resume as { personalInfo?: PersonalInfo })?.personalInfo || {});
      } catch (err) {
        if (!cancelled) setError('Failed to load cover letter');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [id]);

  const pageDims = PAGE_DIMENSIONS[pageSize];
  const margins = { top: 25, right: 25, bottom: 25, left: 25 };
  const today = new Date().toLocaleDateString(resolvedLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const nameFallback = t('resume.defaults.name');

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-zinc-500">Loading...</div>;
  }

  if (error || !coverLetter) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-red-500">{error || 'No cover letter available'}</p>
      </div>
    );
  }

  const paragraphs = coverLetter
    .split(/\n\n+/)
    .flatMap((p) => p.split('\n'))
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return (
    <div
      className="cover-letter-print bg-white"
      style={{
        width: `${pageDims.width}mm`,
        minHeight: `${pageDims.height}mm`,
        padding: `${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm`,
        boxSizing: 'border-box',
        fontFamily: 'Georgia, serif',
        color: '#000000',
      }}
    >
      <header
        style={{
          marginBottom: '8mm',
          paddingBottom: '4mm',
          borderBottom: '2px solid #000',
        }}
      >
        <h1
          style={{
            fontSize: '18pt',
            fontWeight: 'bold',
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {personalInfo.name || nameFallback}
        </h1>
        <div
          style={{
            marginTop: '2mm',
            fontSize: '9pt',
            fontFamily: 'monospace',
            color: '#666',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4mm',
          }}
        >
          {personalInfo.email && <span>{personalInfo.email}</span>}
          {personalInfo.phone && <span>{personalInfo.phone}</span>}
          {personalInfo.location && <span>{personalInfo.location}</span>}
          {personalInfo.linkedin && <span>{personalInfo.linkedin}</span>}
        </div>
      </header>

      <div
        style={{
          marginBottom: '8mm',
          fontSize: '10pt',
          fontFamily: 'monospace',
          color: '#666',
        }}
      >
        {today}
      </div>

      <div style={{ lineHeight: '1.6' }}>
        {paragraphs.length > 0 ? (
          paragraphs.map((para, idx) => (
            <p
              key={idx}
              style={{
                fontSize: '11pt',
                margin: '0 0 4mm 0',
                textAlign: 'justify',
              }}
            >
              {para}
            </p>
          ))
        ) : (
          <p style={{ fontSize: '11pt', color: '#999' }}>
            {t('coverLetter.print.emptyContent')}
          </p>
        )}
      </div>
    </div>
  );
}