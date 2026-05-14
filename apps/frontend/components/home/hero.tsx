'use client';

import React from 'react';
import { useTranslations } from '@/lib/i18n';

export default function Hero() {
  const { t } = useTranslations();

  return (
    <section
      className="h-screen w-full p-4 md:p-12 lg:p-24 bg-background"
      style={{
        backgroundImage:
          'linear-gradient(rgba(29, 78, 216, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(29, 78, 216, 0.1) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}
    >
      <div className="flex h-full w-full flex-col items-center justify-center border border-black text-blue-700 bg-background shadow-sw-xl">
        <h1 className="mb-12 text-center font-mono text-6xl font-bold uppercase leading-none tracking-tighter md:text-8xl lg:text-9xl selection:bg-blue-700 selection:text-white">
          {t('home.brandLine1')}
          <br />
          {t('home.brandLine2')}
        </h1>


      </div>
    </section>
  );
}
