'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from '@/lib/i18n';
import { User, Settings, LogOut } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export const BentoGrid = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslations();
  const [profileOpen, setProfileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Fetch the real user email from Supabase on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email ?? null;
      setUserEmail(email);
    });
    // Keep in sync if session changes (e.g., logout from another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [profileOpen]);

  return (
    // 1. Outer Wrapper: Dark subtle grid background
    <div
      className="min-h-screen w-full flex justify-center items-start py-8 px-4 md:px-8 overflow-hidden bg-zinc-950"
      style={{
        backgroundImage:
          'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        backgroundPosition: 'center center',
      }}
    >
      {/* 2. Main Container: Frosted glass, minimalist border */}
      <div className="w-full max-w-[90rem] min-h-[85vh] border border-white/5 bg-zinc-900/40 backdrop-blur-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden rounded-3xl relative">
        
        {/* Header Section */}
        <div className="border-b border-white/5 p-8 md:p-10 shrink-0 relative z-30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-zinc-800/80 border border-white/10 shadow-lg shadow-black/20">
                <Image
                  src="/logo.png"
                  alt="Recro AI"
                  width={32}
                  height={32}
                  className="w-8 h-8"
                />
              </div>
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-zinc-100">
                Recro AI
              </h1>
            </div>

            <div className="relative shrink-0" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-zinc-800 border border-white/10 hover:bg-zinc-700 hover:border-white/20 transition-all shadow-lg overflow-hidden relative"
                aria-label="Profile Menu"
              >
                <Image 
                  src="/default-avatar.png" 
                  alt="Profile" 
                  fill
                  className="object-cover"
                />
              </button>
              
              {profileOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-zinc-900 border border-white/10 shadow-2xl shadow-black/50 rounded-2xl overflow-hidden z-50 py-2">
                  <div className="px-4 py-3 border-b border-white/5 mb-2">
                    <p className="text-sm font-medium text-zinc-200">User Profile</p>
                    <p className="text-xs text-zinc-500 truncate">
                      {userEmail ?? '—'}
                    </p>
                  </div>
                  
                  <Link
                    href="/settings"
                    className="flex items-center px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                    onClick={() => setProfileOpen(false)}
                  >
                    <Settings className="w-4 h-4 mr-3" />
                    {t('nav.settings')}
                  </Link>
                  
                  <button
                    className="w-full flex items-center px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left"
                    onClick={() => {
                      setProfileOpen(false);
                      // Add logout logic here
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="max-w-3xl mt-5">
            <p className="text-sm md:text-base text-zinc-400 font-medium tracking-wide leading-relaxed">
              Upload your main resume once, and our AI will automatically tailor it to perfectly match any job description you provide, highlighting your most relevant skills to help you stand out.
            </p>
          </div>
        </div>

        {/* Content Grid - Bento Box Layout */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 p-6 md:p-8">
          {/* Bento grid layout: 4 columns on large screens, dense packing */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 grid-flow-row-dense">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 flex justify-between items-center text-xs text-zinc-500 border-t border-white/5 shrink-0 relative z-30 backdrop-blur-sm bg-zinc-950/20">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-zinc-800/50 border border-white/5">
              <Image
                src="/logo.png"
                alt="Recro AI"
                width={16}
                height={16}
                className="w-4 h-4 opacity-80"
              />
            </div>
            <span className="font-semibold tracking-wide text-zinc-400">Recro AI</span>
          </div>
          <Link
            href="/settings"
            className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors font-medium"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('nav.settings')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

