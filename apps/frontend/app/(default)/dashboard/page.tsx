'use client';

import { BentoGrid } from '@/components/home/bento-grid';
import { ResumeUploadDialog } from '@/components/dashboard/resume-upload-dialog';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { useTranslations } from '@/lib/i18n';

// Optimized Imports for Performance (No Barrel Imports)
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Settings from 'lucide-react/dist/esm/icons/settings';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';

import {
  fetchResume,
  fetchResumeList,
  deleteResume,
  retryProcessing,
  fetchJobDescription,
  type ResumeListItem,
} from '@/lib/api/resume';
import { useStatusCache } from '@/lib/context/status-cache';

type ProcessingStatus = 'pending' | 'processing' | 'ready' | 'failed' | 'loading';

export default function DashboardPage() {
  const { t, locale } = useTranslations();
  const [masterResumeId, setMasterResumeId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('loading');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [tailoredResumes, setTailoredResumes] = useState<ResumeListItem[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const router = useRouter();

  // Status cache for optimistic counter updates and LLM status check
  const {
    status: systemStatus,
    isLoading: statusLoading,
    incrementResumes,
    decrementResumes,
    setHasMasterResume,
  } = useStatusCache();

  // Request id guard for concurrent loadTailoredResumes invocations
  const loadRequestIdRef = useRef(0);
  // Lightweight in-memory cache for job snippets to avoid N+1 refetches
  const jobSnippetCacheRef = useRef<Record<string, string>>({});

  // Check if LLM is configured (API key is set)
  const isLlmConfigured = !statusLoading && systemStatus?.llm_configured;

  const isTailorEnabled =
    Boolean(masterResumeId) && processingStatus === 'ready' && isLlmConfigured;

  const formatDate = (value: string) => {
    if (!value) return t('common.unknown');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t('common.unknown');

    const dateLocale =
      locale === 'es' ? 'es-ES' : locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : 'en-US';

    return date.toLocaleDateString(dateLocale, {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const checkResumeStatus = useCallback(async (resumeId: string) => {
    try {
      setProcessingStatus('loading');
      const data = await fetchResume(resumeId);
      const status = data.raw_resume?.processing_status || 'pending';
      setProcessingStatus(status as ProcessingStatus);
    } catch (err: unknown) {
      console.error('Failed to check resume status:', err);
      // If resume not found (404), clear the stale localStorage
      if (err instanceof Error && err.message.includes('404')) {
        localStorage.removeItem('master_resume_id');
        setMasterResumeId(null);
        return;
      }
      setProcessingStatus('failed');
    }
  }, []);

  useEffect(() => {
    const storedId = localStorage.getItem('master_resume_id');
    if (storedId) {
      setMasterResumeId(storedId);
      checkResumeStatus(storedId);
    }
  }, [checkResumeStatus]);

  const loadTailoredResumes = useCallback(async () => {
    try {
      const data = await fetchResumeList(true);
      const masterFromList = data.find((r) => r.is_master);
      const storedId = localStorage.getItem('master_resume_id');
      const resolvedMasterId = masterFromList?.resume_id || storedId;

      if (resolvedMasterId) {
        localStorage.setItem('master_resume_id', resolvedMasterId);
        setMasterResumeId(resolvedMasterId);
        checkResumeStatus(resolvedMasterId);
      } else {
        localStorage.removeItem('master_resume_id');
        setMasterResumeId(null);
      }

      const filtered = data.filter((r) => r.resume_id !== resolvedMasterId);
      setTailoredResumes(filtered);

      // Only fetch job descriptions for resumes that are actually tailored
      // (identified by having a non-null parent_id). This avoids N+1 calls
      // for untailored resumes.
      const tailoredWithParent = filtered.filter((r) => r.parent_id);

      // Guard against concurrent invocations overwriting each other
      const requestId = ++loadRequestIdRef.current;

      // Fetch job description snippets for tailored resumes in parallel and attach to state
      // Use a small in-memory cache to avoid re-fetching the same snippet repeatedly.
      const jobSnippets: Record<string, string> = {};
      await Promise.all(
        tailoredWithParent.map(async (r) => {
          // Use cached snippet when available
          if (jobSnippetCacheRef.current[r.resume_id]) {
            jobSnippets[r.resume_id] = jobSnippetCacheRef.current[r.resume_id];
            return;
          }
          try {
            const jd = await fetchJobDescription(r.resume_id);
            const snippet = (jd?.content || '').slice(0, 80);
            jobSnippetCacheRef.current[r.resume_id] = snippet;
            jobSnippets[r.resume_id] = snippet;
          } catch {
            // ignore missing job descriptions and cache empty result
            jobSnippetCacheRef.current[r.resume_id] = '';
            jobSnippets[r.resume_id] = '';
          }
        })
      );

      // Only apply results if this invocation is the latest (prevents stale overwrite)
      if (requestId === loadRequestIdRef.current) {
        setTailoredResumes((prev) =>
          prev.map((r) => ({ ...r, jobSnippet: jobSnippets[r.resume_id] || '' }))
        );
      }
    } catch (err) {
      console.error('Failed to load tailored resumes:', err);
    }
  }, [checkResumeStatus]);

  useEffect(() => {
    loadTailoredResumes();
  }, [loadTailoredResumes]);

  // Refresh list when window gains focus (e.g., returning from viewer after delete)
  useEffect(() => {
    const handleFocus = () => {
      loadTailoredResumes();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadTailoredResumes, checkResumeStatus]);

  const handleUploadComplete = (resumeId: string) => {
    localStorage.setItem('master_resume_id', resumeId);
    setMasterResumeId(resumeId);
    // Check status after upload completes
    checkResumeStatus(resumeId);
    // Update cached counters
    incrementResumes();
    setHasMasterResume(true);
  };

  const handleRetryProcessing = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!masterResumeId) return;
    setIsRetrying(true);
    try {
      const result = await retryProcessing(masterResumeId);
      if (result.processing_status === 'ready') {
        setProcessingStatus('ready');
      } else if (
        result.processing_status === 'processing' ||
        result.processing_status === 'pending'
      ) {
        setProcessingStatus(result.processing_status);
      } else {
        setProcessingStatus('failed');
      }
    } catch (err) {
      console.error('Retry processing failed:', err);
      setProcessingStatus('failed');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDeleteAndReupload = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const confirmDeleteAndReupload = async () => {
    if (!masterResumeId) return;
    try {
      await deleteResume(masterResumeId);
      decrementResumes();
      setHasMasterResume(false);
      localStorage.removeItem('master_resume_id');
      setMasterResumeId(null);
      setProcessingStatus('loading');
      setIsUploadDialogOpen(true);
      await loadTailoredResumes();
    } catch (err) {
      console.error('Failed to delete resume:', err);
    }
  };

  const getStatusDisplay = () => {
    switch (processingStatus) {
      case 'loading':
        return {
          text: t('dashboard.status.checking'),
          icon: <Loader2 className="w-3 h-3 animate-spin" />,
          color: 'text-steel-grey',
        };
      case 'processing':
        return {
          text: t('dashboard.status.processing'),
          icon: <Loader2 className="w-3 h-3 animate-spin" />,
          color: 'text-blue-700',
        };
      case 'ready':
        return { text: t('dashboard.status.ready'), icon: null, color: 'text-green-700' };
      case 'failed':
        return {
          text: t('dashboard.status.failed'),
          icon: <AlertCircle className="w-3 h-3" />,
          color: 'text-red-600',
        };
      default:
        return { text: t('dashboard.status.pending'), icon: null, color: 'text-steel-grey' };
    }
  };

  const getMonogram = (title: string): string => {
    const words = title.split(/\s+/).filter((w) => /^[a-zA-Z]/.test(w));
    return words
      .slice(0, 3)
      .map((w) => w.charAt(0).toUpperCase())
      .join('');
  };

  // High-end minimalist palette
  const cardPalette = [
    { bg: 'rgba(255,255,255,0.03)', fg: '#e4e4e7', border: 'rgba(255,255,255,0.08)' },
    { bg: 'rgba(255,255,255,0.02)', fg: '#d4d4d8', border: 'rgba(255,255,255,0.06)' },
    { bg: 'rgba(255,255,255,0.04)', fg: '#f4f4f5', border: 'rgba(255,255,255,0.1)' },
  ];

  const hashTitle = (title: string): number => {
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = (hash << 5) - hash + title.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  const tailoredSlots = tailoredResumes.reduce((acc, _, index) => {
    return acc + (index % 3 === 0 ? 2 : 1);
  }, 0);
  
  // Master is col-span-2 row-span-2 = 4 slots on md and above. Create Resume is 1 slot.
  const totalSlots = 4 + 1 + tailoredSlots;
  
  // Ensure the grid is a perfect rectangle by making the total slots a multiple of 4.
  // We also ensure a minimum of 16 slots (4 rows) to completely fill typical screens.
  const targetSlots = Math.max(16, Math.ceil(totalSlots / 4) * 4);
  const fillersNeeded = targetSlots - totalSlots;

  const fillerPalette = ['bg-zinc-900/20', 'bg-zinc-800/10', 'bg-zinc-950/30', 'bg-zinc-900/10'];

  return (
    <div className="space-y-6 bg-zinc-950 min-h-screen" style={{
      backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
      backgroundSize: '40px 40px',
    }}>
      {/* Configuration Warning Banner */}
      {masterResumeId && !isLlmConfigured && !statusLoading && (
        <div className="mx-4 md:mx-8 pt-6">
          <div
            className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border border-amber-500/25 bg-zinc-900/80 backdrop-blur-xl shadow-lg shadow-black/30"
            style={{ boxShadow: '0 0 0 1px rgba(245,158,11,0.1), 0 8px 24px rgba(0,0,0,0.4), 0 0 40px rgba(245,158,11,0.04) inset' }}
          >
            <div className="flex items-center gap-3.5">
              <div className="shrink-0 w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-100 leading-snug">
                  {t('dashboard.llmNotConfiguredTitle')}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                  {t('dashboard.llmNotConfiguredMessage')}
                </p>
              </div>
            </div>
            <Link href="/settings" className="shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs border-amber-500/25 text-amber-300 bg-amber-500/8 hover:bg-amber-500/15 hover:border-amber-500/40 hover:text-amber-200 rounded-xl transition-all"
              >
                <Settings className="w-3.5 h-3.5 mr-1.5" />
                {t('nav.settings')}
              </Button>
            </Link>
          </div>
        </div>
      )}

      <BentoGrid>
        {/* 1. Master Resume Logic */}
        {!masterResumeId ? (
          // LLM Not Configured or Upload State
          !isLlmConfigured && !statusLoading ? (
            <Link href="/settings" className="block h-full col-span-1 md:col-span-2 lg:col-span-2 row-span-2 min-h-[300px]">
              <Card
                className="h-full border border-white/5 bg-zinc-900/40 hover:bg-zinc-800/60 transition-all hover:border-white/10 group relative overflow-hidden"
              >
                <div className="flex-1 flex flex-col justify-between relative z-10 p-8 h-full">
                  <div className="w-14 h-14 border border-white/10 bg-white/5 flex items-center justify-center mb-4 rounded-2xl transition-all">
                    <AlertTriangle className="w-6 h-6 text-zinc-400 group-hover:text-zinc-300" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-medium text-zinc-200 mb-2">
                      {t('dashboard.setupRequiredTitle')}
                    </CardTitle>
                    <CardDescription className="text-zinc-500 text-sm">
                      {t('dashboard.setupRequiredMessage')}
                    </CardDescription>
                    <div className="flex items-center gap-2 mt-6 text-zinc-400 group-hover:text-zinc-300 transition-colors">
                      <Settings className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {t('nav.goToSettings')}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ) : (
            <div className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 min-h-[300px] h-full">
              <ResumeUploadDialog
                open={isUploadDialogOpen}
                onOpenChange={setIsUploadDialogOpen}
                onUploadComplete={handleUploadComplete}
                trigger={
                  <Card
                    className="h-full border border-white/5 bg-zinc-900/40 hover:bg-zinc-800/60 transition-all hover:border-white/10 group cursor-pointer relative overflow-hidden shadow-xl shadow-black/20"
                  >
                    <div className="flex-1 flex flex-col justify-between relative z-10 p-8 pointer-events-none h-full">
                      <div className="w-14 h-14 border border-white/10 flex items-center justify-center mb-4 rounded-2xl bg-white/5 group-hover:bg-white/10 transition-all">
                        <span className="text-2xl text-zinc-300 relative group-hover:scale-110 transition-transform">+</span>
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-medium text-zinc-200">
                          {t('dashboard.initializeMasterResume')}
                        </CardTitle>
                        <CardDescription className="mt-2 text-zinc-500 text-sm">
                          {t('dashboard.initializeSequence')}
                        </CardDescription>
                      </div>
                    </div>
                  </Card>
                }
              />
            </div>
          )
        ) : (
          // Master Resume Exists
          <Card
            className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 min-h-[300px] border border-white/5 bg-zinc-900/40 hover:bg-zinc-800/60 transition-all hover:border-white/10 group cursor-pointer relative overflow-hidden shadow-xl shadow-black/20"
            onClick={() => router.push(`/resumes/${masterResumeId}`)}
          >
            <div className="flex-1 flex flex-col h-full relative z-10 p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 border border-white/10 bg-white/5 text-zinc-300 flex items-center justify-center rounded-2xl transition-all group-hover:bg-white/10">
                  <span className="font-semibold text-2xl">M</span>
                </div>
                <div className="flex gap-1">
                  {(processingStatus === 'failed' || processingStatus === 'processing') && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-zinc-800/50 text-zinc-400 z-10 relative rounded-lg border border-transparent hover:border-white/10"
                        onClick={handleRetryProcessing}
                        disabled={isRetrying}
                        aria-label={t('dashboard.retryProcessing')}
                        title={t('dashboard.retryProcessing')}
                      >
                        {isRetrying ? (
                          <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                        ) : (
                          <RefreshCw className="w-4 h-4 text-zinc-400" />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <CardTitle className="text-2xl font-medium text-zinc-100 group-hover:text-white transition-colors">
                {t('dashboard.masterResume')}
              </CardTitle>

              <div
                className={`text-sm mt-auto pt-4 flex flex-col gap-3 font-medium ${
                  processingStatus === 'ready' ? 'text-zinc-300' :
                  processingStatus === 'failed' ? 'text-red-400' :
                  processingStatus === 'processing' ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  {getStatusDisplay().icon}
                  <span>{t('dashboard.statusLine', { status: getStatusDisplay().text })}</span>
                </div>
                {(processingStatus === 'failed' || processingStatus === 'processing') && (
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 bg-zinc-900/50 border-white/10 text-zinc-300 hover:bg-zinc-800 rounded-lg"
                      onClick={handleRetryProcessing}
                      disabled={isRetrying}
                    >
                      {isRetrying
                        ? t('dashboard.retryingProcessing')
                        : t('dashboard.retryProcessing')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 bg-red-950/20 border-red-900/30 text-red-400 hover:bg-red-900/40 rounded-lg"
                      onClick={handleDeleteAndReupload}
                    >
                      {t('dashboard.deleteAndReupload')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* 2. Tailored Resumes */}
        {tailoredResumes.map((resume, index) => {
          const title =
            resume.title || resume.jobSnippet || resume.filename || t('dashboard.tailoredResume');
          const color = cardPalette[hashTitle(title) % cardPalette.length];
          // Alternate spans for Bento effect
          const colSpan = index % 3 === 0 ? 'col-span-1 md:col-span-2' : 'col-span-1';
          
          return (
            <Card
              key={resume.resume_id}
              className={`${colSpan} row-span-1 min-h-[220px] border border-white/5 bg-zinc-900/40 hover:bg-zinc-800/60 transition-all group cursor-pointer relative overflow-hidden`}
              onClick={() => router.push(`/resumes/${resume.resume_id}`)}
            >
              <div className="flex-1 flex flex-col p-6 relative z-10 h-full">
                <div className="flex justify-between items-start mb-6">
                  <div
                    className="w-12 h-12 flex items-center justify-center rounded-xl transition-all border"
                    style={{ backgroundColor: color.bg, color: color.fg, borderColor: color.border }}
                  >
                    <span className="font-semibold text-lg">{getMonogram(title)}</span>
                  </div>
                  <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest border border-white/5 px-2 py-0.5 rounded-md bg-zinc-800/30">
                    {resume.processing_status}
                  </span>
                </div>
                <CardTitle className="text-lg font-medium text-zinc-200 group-hover:text-white transition-colors">
                  <span className="block leading-tight mb-1 w-full line-clamp-2">
                    {title}
                  </span>
                </CardTitle>
                <CardDescription className="mt-auto pt-4 text-xs font-medium text-zinc-500 group-hover:text-zinc-400">
                  {t('dashboard.edited', {
                    date: formatDate(resume.updated_at || resume.created_at),
                  })}{' '}
                </CardDescription>
              </div>
            </Card>
          );
        })}

        {/* 3. Create Tailored Resume */}
        <Card 
          className="col-span-1 row-span-1 min-h-[220px] border border-dashed border-white/10 bg-zinc-900/20 hover:bg-zinc-800/40 hover:border-white/20 transition-all group relative overflow-hidden flex flex-col items-center justify-center text-center cursor-pointer"
          onClick={() => isTailorEnabled && router.push('/tailor')}
        >
          <div className="relative z-10 flex flex-col items-center justify-center h-full p-6">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${
                isTailorEnabled 
                  ? 'bg-white/5 border-white/10 text-zinc-300 group-hover:bg-white/10 group-hover:scale-105' 
                  : 'bg-zinc-900 border-zinc-800 text-zinc-600'
              }`}
            >
              <Plus className="w-6 h-6" />
            </div>
            <p className={`mt-4 font-medium transition-colors ${
              isTailorEnabled ? 'text-zinc-300 group-hover:text-zinc-100' : 'text-zinc-600'
            }`}>
              {t('dashboard.createResume')}
            </p>
          </div>
        </Card>

        {/* 4. Fillers to complete the grid */}
        {Array.from({ length: fillersNeeded }).map((_, index) => (
          <Card
            key={`filler-${index}`}
            className={`hidden md:block col-span-1 row-span-1 min-h-[220px] ${fillerPalette[index % fillerPalette.length]} border border-white/5 opacity-40 pointer-events-none rounded-3xl transition-opacity hover:opacity-50`}
          />
        ))}

        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title={t('confirmations.deleteMasterResumeTitle')}
          description={t('confirmations.deleteMasterResumeDescription')}
          confirmLabel={t('dashboard.deleteAndReupload')}
          cancelLabel={t('confirmations.keepResumeCancelLabel')}
          onConfirm={confirmDeleteAndReupload}
          variant="danger"
        />
      </BentoGrid>
    </div>
  );
}
