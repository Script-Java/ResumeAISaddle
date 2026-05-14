'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  fetchLlmConfig,
  updateLlmConfig,
  testLlmConnection,
  fetchFeatureConfig,
  updateFeatureConfig,
  fetchPromptConfig,
  updatePromptConfig,
  clearAllApiKeys,
  resetDatabase,
  PROVIDER_INFO,
  fetchFeaturePrompts,
  updateFeaturePrompts,
  FeaturePromptsError,
  updateApiKeys,
  type LLMConfigUpdate,
  type LLMProvider,
  type LLMHealthCheck,
  type PromptOption,
  type ReasoningEffort,
  type FeaturePromptsUpdate,
} from '@/lib/api/config';
import { API_URL } from '@/lib/api/client';
import { getVersionString } from '@/lib/config/version';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { useStatusCache } from '@/lib/context/status-cache';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dropdown } from '@/components/ui/dropdown';
import {
  Save,
  Key,
  Database,
  Activity,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Server,
  FileText,
  Briefcase,
  Sparkles,
  Clock,
  Settings2,
  Globe,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useLanguage } from '@/lib/context/language-context';
import { useTranslations } from '@/lib/i18n';
import type { SupportedLanguage } from '@/lib/api/config';
import type { Locale } from '@/i18n/config';

type Status = 'idle' | 'loading' | 'saving' | 'saved' | 'error' | 'testing';

const PROVIDERS: LLMProvider[] = [
  'openai',
  'openai_compatible',
  'anthropic',
  'openrouter',
  'gemini',
  'deepseek',
  'ollama',
];

const SEGMENTED_BUTTON_BASE =
  'font-medium transition-all duration-200 ease-out rounded-lg disabled:cursor-not-allowed disabled:opacity-50';
const SEGMENTED_BUTTON_ACTIVE = 'bg-white/10 text-zinc-100 shadow-sm border border-white/10';
const SEGMENTED_BUTTON_INACTIVE = 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent';

const unwrapCodeBlock = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const fenced = trimmed.match(/^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```\s*$/);
  if (fenced) {
    return fenced[1]?.trimEnd() || null;
  }
  return trimmed;
};

const getHealthCheckMessage = (
  t: (key: string, params?: Record<string, string | number>) => string,
  baseKey: string,
  code?: string,
  fallback?: string
): string | null => {
  if (code) {
    const key = `${baseKey}.${code}`;
    const localized = t(key);
    return localized !== key ? localized : (fallback ?? code);
  }
  return fallback ?? null;
};

export default function SettingsPage() {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);

  // LLM Config state
  const [provider, setProvider] = useState<LLMProvider>('openai');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiBase, setApiBase] = useState('');
  const [hasStoredApiKey, setHasStoredApiKey] = useState(false);
  // 'auto' is the UI sentinel for "do not send reasoning_effort". Maps to
  // empty string when persisted to the backend (so gpt-5 auto-migration
  // won't re-fire on next load). Typed tightly so invalid values can't leak
  // through the save path.
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort | 'auto'>('auto');

  // Use cached system status (loaded on app start, refreshes every 30 min)
  const {
    status: systemStatus,
    isLoading: statusLoading,
    lastFetched,
    refreshStatus,
  } = useStatusCache();

  // Health check result from manual test
  const [healthCheck, setHealthCheck] = useState<LLMHealthCheck | null>(null);

  // Feature config state
  const [enableCoverLetter, setEnableCoverLetter] = useState(false);
  const [enableOutreach, setEnableOutreach] = useState(false);
  const [featureConfigLoading, setFeatureConfigLoading] = useState(false);
  const [promptConfigLoading, setPromptConfigLoading] = useState(false);
  const [promptOptions, setPromptOptions] = useState<PromptOption[]>([]);
  const [defaultPromptId, setDefaultPromptId] = useState('keywords');

  // Custom feature prompts (cover letter, cold outreach). Empty string
  // means "use default"; the backend's *_default fields give us the
  // actual default text for placeholder display.
  const [coverLetterPrompt, setCoverLetterPrompt] = useState('');
  const [outreachPrompt, setOutreachPrompt] = useState('');
  const [coverLetterDefault, setCoverLetterDefault] = useState('');
  const [outreachDefault, setOutreachDefault] = useState('');
  const [featurePromptSaving, setFeaturePromptSaving] = useState<string | null>(null);
  const [featurePromptError, setFeaturePromptError] = useState<{
    field: string;
    missing: string[];
  } | null>(null);

  // Danger Zone state
  const [showClearApiKeysDialog, setShowClearApiKeysDialog] = useState(false);
  const [showResetDatabaseDialog, setShowResetDatabaseDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessDialogMessage] = useState({ title: '', description: '' });
  const [isResetting, setIsResetting] = useState(false);

  // Language settings
  const {
    contentLanguage,
    uiLanguage,
    setContentLanguage,
    setUiLanguage,
    languageNames,
    supportedLanguages,
    isLoading: languageLoading,
  } = useLanguage();

  // Translations
  const { t } = useTranslations();
  const providerInfo = PROVIDER_INFO[provider] ?? PROVIDER_INFO['openai'];
  const fallbackPromptOptions = useMemo<PromptOption[]>(
    () => [
      {
        id: 'nudge',
        label: t('tailor.promptOptions.nudge.label'),
        description: t('tailor.promptOptions.nudge.description'),
      },
      {
        id: 'keywords',
        label: t('tailor.promptOptions.keywords.label'),
        description: t('tailor.promptOptions.keywords.description'),
      },
      {
        id: 'full',
        label: t('tailor.promptOptions.full.label'),
        description: t('tailor.promptOptions.full.description'),
      },
    ],
    [t]
  );
  const promptOptionOverrides = useMemo<Record<string, { label: string; description: string }>>(
    () => ({
      nudge: {
        label: t('tailor.promptOptions.nudge.label'),
        description: t('tailor.promptOptions.nudge.description'),
      },
      keywords: {
        label: t('tailor.promptOptions.keywords.label'),
        description: t('tailor.promptOptions.keywords.description'),
      },
      full: {
        label: t('tailor.promptOptions.full.label'),
        description: t('tailor.promptOptions.full.description'),
      },
    }),
    [t]
  );
  const localizedPromptOptions = useMemo(() => {
    const options = promptOptions.length ? promptOptions : fallbackPromptOptions;
    return options.map((option) => {
      const override = promptOptionOverrides[option.id];
      return override ? { ...option, ...override } : option;
    });
  }, [promptOptions, fallbackPromptOptions, promptOptionOverrides]);
  const healthDetailItems = useMemo(() => {
    if (!healthCheck) return [];

    return [
      {
        key: 'testPrompt',
        label: t('settings.llmConfiguration.testPromptLabel'),
        value: unwrapCodeBlock(healthCheck.test_prompt),
      },
      {
        key: 'modelOutput',
        label: t('settings.llmConfiguration.modelOutputLabel'),
        value: unwrapCodeBlock(healthCheck.model_output),
      },
      {
        key: 'reasoningContent',
        label: t('settings.llmConfiguration.reasoningContentLabel'),
        value: unwrapCodeBlock(healthCheck.reasoning_content),
      },
      {
        key: 'errorDetail',
        label: t('settings.llmConfiguration.errorDetailLabel'),
        value: unwrapCodeBlock(healthCheck.error_detail),
      },
    ].filter((item) => item.value);
  }, [healthCheck, t]);
  const healthCheckError = useMemo(() => {
    if (!healthCheck) return null;
    return getHealthCheckMessage(
      t,
      'settings.llmConfiguration.healthErrors',
      healthCheck.error_code,
      healthCheck.error
    );
  }, [healthCheck, t]);
  const healthCheckWarning = useMemo(() => {
    if (!healthCheck) return null;
    return getHealthCheckMessage(
      t,
      'settings.llmConfiguration.healthWarnings',
      healthCheck.warning_code,
      healthCheck.warning
    );
  }, [healthCheck, t]);

  // Load LLM config and feature config on mount
  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const [llmConfig, featureConfig, promptConfig, featurePrompts] = await Promise.all([
          fetchLlmConfig().catch(() => null),
          fetchFeatureConfig().catch(() => null),
          fetchPromptConfig().catch(() => null),
          fetchFeaturePrompts().catch(() => null),
        ]);

        if (cancelled) return;

        if (llmConfig) {
          const providerFromBackend = llmConfig.provider || 'openai';
          const safeProvider = PROVIDERS.includes(providerFromBackend as LLMProvider)
            ? (providerFromBackend as LLMProvider)
            : 'openai';
          setProvider(safeProvider);
          setModel(llmConfig.model || PROVIDER_INFO[safeProvider].defaultModel);
          const isMaskedKey = Boolean(llmConfig.api_key) && llmConfig.api_key.includes('*');
          setHasStoredApiKey(Boolean(llmConfig.api_key));
          setApiKey(isMaskedKey ? '' : llmConfig.api_key || '');
          setApiBase(llmConfig.api_base || '');
          setReasoningEffort((llmConfig.reasoning_effort as ReasoningEffort | null) ?? 'auto');

          if (providerFromBackend !== safeProvider) {
            setError(t('settings.errors.unknownProvider', { provider: providerFromBackend }));
          }
        }

        if (featureConfig) {
          setEnableCoverLetter(featureConfig.enable_cover_letter);
          setEnableOutreach(featureConfig.enable_outreach_message);
        }

        if (promptConfig) {
          setPromptOptions(promptConfig.prompt_options || []);
          setDefaultPromptId(promptConfig.default_prompt_id || 'keywords');
        }

        if (featurePrompts) {
          setCoverLetterPrompt(featurePrompts.cover_letter_prompt);
          setOutreachPrompt(featurePrompts.outreach_message_prompt);
          setCoverLetterDefault(featurePrompts.cover_letter_default);
          setOutreachDefault(featurePrompts.outreach_message_default);
        }

        setStatus('idle');
      } catch (err) {
        console.error('Failed to load settings', err);
        if (!cancelled) {
          setError(t('settings.errors.unableToConnectBackend'));
          setStatus('error');
        }
      }
    }

    loadConfig();
    return () => {
      cancelled = true;
    };
  }, [t]);

  // Handle provider change
  const handleProviderChange = (newProvider: LLMProvider) => {
    setProvider(newProvider);
    setModel(PROVIDER_INFO[newProvider].defaultModel);

    if (newProvider === 'ollama') {
      setApiBase('http://localhost:11434');
    } else if (newProvider === 'openai_compatible') {
      // llama.cpp default; user can override for vLLM / LM Studio / etc.
      setApiBase('http://localhost:8080/v1');
    } else {
      setApiBase('');
    }

    // Clear API key input when switching providers to avoid accidental cross-provider usage.
    setApiKey('');
    setHasStoredApiKey(false);
  };

  // Save configuration
  const handleSave = async () => {
    setStatus('saving');
    setError(null);
    setHealthCheck(null);

    try {
      if (requiresApiKey && !apiKey.trim() && !hasStoredApiKey) {
        setError(t('settings.errors.apiKeyRequired'));
        setStatus('error');
        return;
      }

      const trimmedKey = apiKey.trim();
      const update: LLMConfigUpdate = {
        provider,
        model: model.trim(),
        api_base: apiBase.trim() || null,
        // Map UI sentinel 'auto' → '' so the server persists an empty string
        // and the gpt-5 auto-migration won't re-fire.
        reasoning_effort: reasoningEffort === 'auto' ? '' : (reasoningEffort as ReasoningEffort),
      };
      // Key-send policy (applies to BOTH requiresKey=true and false):
      //   - User typed a new key → send it (overwrite stored).
      //   - User cleared the field AND has a stored key → omit so stored
      //     key is preserved (matches existing UX; users rotate explicitly).
      //   - No new key, no stored key → send '' so the backend clears the
      //     field (mainly the required path; same shape for consistency).
      if (trimmedKey) {
        update.api_key = trimmedKey;
        const apiKeysProviderMap: Record<string, string> = {
          'openai': 'openai',
          'anthropic': 'anthropic',
          'gemini': 'google',
          'openrouter': 'openrouter',
          'deepseek': 'deepseek',
        };
        const mappedProvider = apiKeysProviderMap[provider];
        if (mappedProvider) {
          try {
            await updateApiKeys({ [mappedProvider]: trimmedKey });
          } catch (e) {
            console.warn("Failed to sync api key to provider storage", e);
          }
        }
      } else if (!hasStoredApiKey) {
        update.api_key = '';
      }

      await updateLlmConfig(update);

      // Refresh cached system status after save
      await refreshStatus();

      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to save config', err);
      setError((err as Error).message || t('settings.errors.unableToSaveConfiguration'));
      setStatus('error');
    }
  };

  // Test connection with current form values (pre-save testing)
  const handleTestConnection = async () => {
    setStatus('testing');
    setError(null);
    setHealthCheck(null);

    try {
      // Build config from current form values
      const testConfig: LLMConfigUpdate = {
        provider,
        model: model.trim() || providerInfo.defaultModel,
        api_base: apiBase.trim() || null,
        reasoning_effort: reasoningEffort === 'auto' ? '' : (reasoningEffort as ReasoningEffort),
      };

      // Send the user-typed key if present (for any provider, required or
      // optional). If blank, omit the field so the backend falls back to
      // the stored key for that provider.
      if (apiKey.trim()) {
        testConfig.api_key = apiKey.trim();
      }

      const result = await testLlmConnection(testConfig);
      setHealthCheck(result);
      setStatus('idle');
    } catch (err) {
      console.error('Failed to test connection', err);
      setHealthCheck({ healthy: false, provider, model, error: (err as Error).message });
      setStatus('idle');
    }
  };

  // Update feature config
  const handleFeatureConfigChange = async (
    key: 'enable_cover_letter' | 'enable_outreach_message',
    value: boolean
  ) => {
    setFeatureConfigLoading(true);
    try {
      const updated = await updateFeatureConfig({ [key]: value });
      setEnableCoverLetter(updated.enable_cover_letter);
      setEnableOutreach(updated.enable_outreach_message);
    } catch (err) {
      console.error('Failed to update feature config', err);
      // Revert on error
      if (key === 'enable_cover_letter') {
        setEnableCoverLetter(!value);
      } else {
        setEnableOutreach(!value);
      }
    } finally {
      setFeatureConfigLoading(false);
    }
  };

  const handleFeaturePromptSave = async (
    field: 'cover_letter_prompt' | 'outreach_message_prompt',
    value: string
  ) => {
    setFeaturePromptSaving(field);
    // Only clear the error for the field being saved; keep errors on the
    // other field visible until the user addresses them.
    setFeaturePromptError((prev) => (prev?.field === field ? null : prev));
    try {
      const update: FeaturePromptsUpdate = { [field]: value };
      const fresh = await updateFeaturePrompts(update);
      setCoverLetterPrompt(fresh.cover_letter_prompt);
      setOutreachPrompt(fresh.outreach_message_prompt);
    } catch (err) {
      if (err instanceof FeaturePromptsError) {
        setFeaturePromptError({ field: err.detail.field, missing: err.detail.missing });
      } else {
        setError((err as Error).message);
      }
    } finally {
      setFeaturePromptSaving(null);
    }
  };

  const handlePromptConfigChange = async (value: string) => {
    setPromptConfigLoading(true);
    setError(null);
    try {
      const updated = await updatePromptConfig({ default_prompt_id: value });
      setDefaultPromptId(updated.default_prompt_id);
      if (updated.prompt_options?.length) {
        setPromptOptions(updated.prompt_options);
      }
    } catch (err) {
      console.error('Failed to update prompt config', err);
      setError((err as Error).message || t('settings.errors.unableToSaveConfiguration'));
    } finally {
      setPromptConfigLoading(false);
    }
  };

  // Handle Clear API Keys
  const handleClearApiKeys = async () => {
    setIsResetting(true);
    try {
      await clearAllApiKeys();

      // Refetch full LLM config to ensure local state is synced with backend
      const llmConfig = await fetchLlmConfig().catch(() => null);
      if (llmConfig) {
        setProvider(llmConfig.provider || 'openai');
        setModel(llmConfig.model || PROVIDER_INFO['openai'].defaultModel);
        const isMaskedKey = Boolean(llmConfig.api_key) && llmConfig.api_key.includes('*');
        setHasStoredApiKey(Boolean(llmConfig.api_key));
        setApiKey(isMaskedKey ? '' : llmConfig.api_key || '');
        setApiBase(llmConfig.api_base || '');
        setReasoningEffort(llmConfig.reasoning_effort ?? 'auto');
      } else {
        // Fallback if refetch fails
        setApiKey('');
        setHasStoredApiKey(false);
      }

      setHealthCheck(null);
      // Refresh status
      await refreshStatus();
      setError(null);
      setSuccessDialogMessage({
        title: t('common.success'),
        description: t('common.keysCleared'),
      });
      setShowSuccessDialog(true);
    } catch (err) {
      console.error('Failed to clear API keys', err);
      setError(t('settings.errors.failedToClearApiKeys'));
    } finally {
      setIsResetting(false);
      setShowClearApiKeysDialog(false);
    }
  };

  // Handle Reset Database
  const handleResetDatabase = async () => {
    setIsResetting(true);
    try {
      await resetDatabase();

      // Clear all related localStorage keys
      localStorage.removeItem('master_resume_id');
      localStorage.removeItem('resume_builder_draft');
      localStorage.removeItem('resume_builder_settings');
      localStorage.removeItem('resume_matcher_content_language');
      localStorage.removeItem('resume_matcher_ui_language');

      // Refresh status to show empty counts
      await refreshStatus();
      // Clear health check as context is lost
      setHealthCheck(null);
      setError(null);
      setSuccessDialogMessage({
        title: t('common.success'),
        description: t('common.databaseReset'),
      });
      setShowSuccessDialog(true);
    } catch (err) {
      console.error('Failed to reset database', err);
      setError(t('settings.errors.failedToResetDatabase'));
    } finally {
      setIsResetting(false);
      setShowResetDatabaseDialog(false);
    }
  };

  // Format last fetched time for display
  const formatLastFetched = () => {
    if (!lastFetched) return t('settings.systemStatus.lastFetched.never');
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastFetched.getTime()) / 1000);
    if (diff < 60) return t('settings.systemStatus.lastFetched.justNow');
    if (diff < 3600)
      return t('settings.systemStatus.lastFetched.minutesAgo', { minutes: Math.floor(diff / 60) });
    return t('settings.systemStatus.lastFetched.hoursAgo', { hours: Math.floor(diff / 3600) });
  };

  const requiresApiKey = providerInfo.requiresKey ?? true;

  return (
    <div 
      className="flex flex-col items-center justify-start p-4 sm:p-6 md:p-12 min-h-screen overflow-y-auto overflow-x-hidden bg-zinc-950"
      style={{
        backgroundImage:
          'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        backgroundPosition: 'center center',
      }}
    >
      <div className="w-full max-w-5xl space-y-8 min-w-0">
        {/* Header */}
        <div className="w-full border border-white/5 bg-zinc-900/40 backdrop-blur-2xl shadow-2xl shadow-black/50 p-4 sm:p-6 md:p-8 rounded-3xl flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100 break-words">
              {t('settings.title')}
            </h1>
            <p className="text-sm font-medium tracking-wide text-zinc-400 mt-2">
              {t('settings.subtitle')}
            </p>
          </div>
          <Link href="/dashboard" className="shrink-0 w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full sm:w-auto bg-zinc-800/50 border-white/10 text-zinc-200 hover:bg-zinc-700/50 rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
          </Link>
        </div>

        <div className="space-y-12">
          {/* API Key Not Configured Warning */}
          {!statusLoading && systemStatus && !systemStatus.llm_configured && (
            <div className="border border-amber-500/20 bg-amber-500/5 p-6 rounded-3xl shadow-xl shadow-black/20">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="w-5 h-5 text-amber-500/80" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-amber-100">
                    {t('settings.setupRequired.title')}
                  </p>
                  <p className="text-sm text-amber-200/60 mt-1">
                    {t('settings.setupRequired.description')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* System Status Panel */}
          <section className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="p-2 rounded-xl bg-white/5 border border-white/10 shrink-0">
                  <Activity className="w-4 h-4 text-zinc-300" />
                </div>
                <h2 className="text-lg sm:text-xl font-medium tracking-wide text-zinc-100">
                  {t('settings.systemStatus.title')}
                </h2>
                {lastFetched && (
                  <span className="text-xs font-medium text-zinc-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatLastFetched()}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshStatus}
                disabled={statusLoading}
                className="gap-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-white/5 rounded-lg self-start sm:self-auto"
              >
                <RefreshCw className={`w-4 h-4 ${statusLoading ? 'animate-spin' : ''}`} />
                {t('settings.systemStatus.refresh')}
              </Button>
            </div>

            {statusLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-600" />
              </div>
            ) : !systemStatus ? (
              <div className="flex flex-col items-center justify-center p-12 gap-4 border border-dashed border-red-500/30 bg-red-500/5 rounded-3xl">
                <p className="text-sm font-semibold text-red-400">
                  {t('settings.systemStatus.unableToConnect')}
                </p>
                <p className="text-xs text-zinc-500">
                  {t('settings.systemStatus.expectedAt', { apiUrl: API_URL })}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshStatus}
                  className="gap-2 text-sm border-red-500/20 text-red-300 hover:bg-red-500/10 rounded-lg"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t('common.retry')}
                </Button>
              </div>
            ) : (
                <div className="@container">
                  <div className="grid grid-cols-2 @xl:grid-cols-4 gap-3 sm:gap-4">
                    {/* LLM Status */}
                    <div className="border border-white/5 bg-zinc-900/40 p-4 sm:p-6 rounded-2xl shadow-xl shadow-black/20 hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-center gap-2 mb-3 sm:mb-4">
                        <div className="p-1.5 sm:p-2 rounded-lg bg-white/5">
                          <Server className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 truncate">
                          {t('settings.statusCards.llm')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {systemStatus.llm_healthy ? (
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 shrink-0" />
                        )}
                        <span className="text-xs sm:text-sm font-semibold text-zinc-200 truncate">
                          {systemStatus.llm_healthy
                            ? t('settings.statusValues.healthy')
                            : t('settings.statusValues.offline')}
                        </span>
                      </div>
                    </div>

                    {/* Database Status */}
                    <div className="border border-white/5 bg-zinc-900/40 p-4 sm:p-6 rounded-2xl shadow-xl shadow-black/20 hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-center gap-2 mb-3 sm:mb-4">
                        <div className="p-1.5 sm:p-2 rounded-lg bg-white/5">
                          <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 truncate">
                          {t('settings.statusCards.database')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0" />
                        <span className="text-xs sm:text-sm font-semibold text-zinc-200 truncate">
                          {t('settings.statusValues.connected')}
                        </span>
                      </div>
                    </div>

                    {/* Resumes Count */}
                    <div className="border border-white/5 bg-zinc-900/40 p-4 sm:p-6 rounded-2xl shadow-xl shadow-black/20 hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-center gap-2 mb-3 sm:mb-4">
                        <div className="p-1.5 sm:p-2 rounded-lg bg-white/5">
                          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 truncate">
                          {t('settings.statusCards.resumes')}
                        </span>
                      </div>
                      <span className="text-2xl sm:text-3xl font-semibold text-zinc-100">
                        {systemStatus.database_stats.total_resumes || 0}
                      </span>
                    </div>

                    {/* Jobs Count */}
                    <div className="border border-white/5 bg-zinc-900/40 p-4 sm:p-6 rounded-2xl shadow-xl shadow-black/20 hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-center gap-2 mb-3 sm:mb-4">
                        <div className="p-1.5 sm:p-2 rounded-lg bg-white/5">
                          <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 truncate">
                          {t('settings.statusCards.jobs')}
                        </span>
                      </div>
                      <span className="text-2xl sm:text-3xl font-semibold text-zinc-100">
                        {systemStatus.database_stats.total_jobs || 0}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            {/* Additional Stats Row */}
            {systemStatus && (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="border border-white/5 bg-zinc-900/40 p-4 sm:p-6 rounded-2xl shadow-xl shadow-black/20 hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-white/5">
                      <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 truncate">
                      {t('settings.statusCards.improvements')}
                    </span>
                  </div>
                    <span className="text-2xl sm:text-3xl font-semibold text-zinc-100">
                      {systemStatus.database_stats.total_improvements || 0}
                  </span>
                </div>
                <div className="border border-white/5 bg-zinc-900/40 p-4 sm:p-6 rounded-2xl shadow-xl shadow-black/20 hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-white/5">
                      <FileText className="w-4 h-4 text-zinc-400" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      {t('settings.statusCards.masterResume')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {systemStatus.has_master_resume ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <span className="text-sm font-semibold text-zinc-200">
                          {t('settings.statusValues.configured')}
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-amber-500" />
                        <span className="text-sm font-semibold text-amber-400">
                          {t('settings.statusValues.notSet')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* LLM Configuration */}
          <section className="border border-white/5 bg-zinc-900/40 p-4 sm:p-6 md:p-8 rounded-3xl shadow-2xl shadow-black/50 space-y-6 sm:space-y-8 min-w-0 overflow-hidden">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <Key className="w-5 h-5 text-zinc-300" />
              </div>
              <h2 className="text-xl font-medium tracking-wide text-zinc-100">
                {t('settings.llmConfigurationTitle')}
              </h2>
            </div>

            <div className="grid gap-5 sm:gap-8 min-w-0 [&>*]:min-w-0">
              {/* Provider Selection */}
              <Dropdown
                label={t('settings.providerLabel')}
                value={provider}
                onChange={(value) => handleProviderChange(value as LLMProvider)}
                options={PROVIDERS.map((p) => ({
                  id: p,
                  label: PROVIDER_INFO[p].name,
                  description: `Default: ${PROVIDER_INFO[p].defaultModel}`,
                }))}
              />

              {/* Model Input */}
              <div className="space-y-2 sm:space-y-3">
                <Label htmlFor="model" className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-300">
                  {t('settings.llmConfiguration.modelLabel')}
                </Label>
                <Input
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={providerInfo.defaultModel}
                  className="bg-zinc-950/50 border-white/10 text-zinc-200 placeholder:text-zinc-600 rounded-xl text-sm"
                />
              </div>

              {/* API Key Input */}
              <div className="space-y-2 sm:space-y-3">
                <Label htmlFor="apiKey" className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-300">
                  {t('settings.llmConfiguration.apiKeyLabel')}{' '}
                  {!requiresApiKey && (
                    <span className="text-zinc-500 font-normal normal-case">
                      {t('settings.llmConfiguration.apiKeyOptional')}
                    </span>
                  )}
                </Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    requiresApiKey
                      ? t('settings.llmConfiguration.apiKeyPlaceholder')
                      : t('settings.llmConfiguration.apiKeyOptionalPlaceholder')
                  }
                  className="bg-zinc-950/50 border-white/10 text-zinc-200 placeholder:text-zinc-600 rounded-xl text-sm"
                />
                {hasStoredApiKey && !apiKey && (
                  <p className="text-xs sm:text-sm text-emerald-500/80 font-medium">
                    {t('settings.llmConfiguration.leaveBlankToKeepExistingKey')}
                  </p>
                )}
              </div>

              {/* API Base URL */}
              <div className="space-y-2 sm:space-y-3">
                <Label htmlFor="apiBase" className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-300">
                  {t('settings.llmConfiguration.baseUrlLabel')}
                </Label>
                <Input
                  id="apiBase"
                  value={apiBase}
                  onChange={(e) => setApiBase(e.target.value)}
                  placeholder={t('settings.llmConfiguration.baseUrlPlaceholder')}
                  className="bg-zinc-950/50 border-white/10 text-zinc-200 placeholder:text-zinc-600 rounded-xl text-sm"
                />
              </div>

              {/* Reasoning Effort (optional, only applies to reasoning-capable models) */}
              <Dropdown
                label={t('settings.llmConfiguration.reasoningEffortLabel')}
                value={reasoningEffort}
                onChange={(value) => setReasoningEffort(value as ReasoningEffort | 'auto')}
                options={[
                  {
                    id: 'auto',
                    label: t('settings.llmConfiguration.reasoningEffortAuto'),
                    description: t('settings.llmConfiguration.reasoningEffortAutoDesc'),
                  },
                  { id: 'minimal', label: t('settings.llmConfiguration.reasoningEffortMinimal') },
                  { id: 'low', label: t('settings.llmConfiguration.reasoningEffortLow') },
                  { id: 'medium', label: t('settings.llmConfiguration.reasoningEffortMedium') },
                  { id: 'high', label: t('settings.llmConfiguration.reasoningEffortHigh') },
                ]}
              />

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button
                  onClick={handleSave}
                  disabled={status === 'saving' || status === 'loading'}
                  className="w-full sm:flex-1 bg-white text-black hover:bg-zinc-200 rounded-xl font-medium"
                >
                  {status === 'saving' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : status === 'saved' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {t('common.success')}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {t('common.save')}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={status === 'testing' || status === 'saving'}
                  className="w-full sm:flex-1 bg-zinc-800/50 border-white/10 text-zinc-200 hover:bg-zinc-700/50 rounded-xl"
                >
                  {status === 'testing' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Activity className="w-4 h-4 mr-2" />
                      {t('settings.llmConfiguration.testConnection')}
                    </>
                  )}
                </Button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="border border-red-500/20 bg-red-500/5 p-4 rounded-xl shadow-xl shadow-black/20">
                  <p className="text-sm text-red-400 font-medium break-words">
                    {t('settings.llmConfiguration.errorPrefix', { error })}
                  </p>
                </div>
              )}

              {/* Health Check Result */}
              {healthCheck && (
                <div
                  className={`border p-4 sm:p-6 rounded-2xl break-words shadow-xl shadow-black/20 ${
                    healthCheck.healthy
                      ? 'border-emerald-500/20 bg-emerald-500/5'
                      : 'border-red-500/20 bg-red-500/5'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {healthCheck.healthy ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span className="text-base font-semibold text-zinc-100">
                      {healthCheck.healthy
                        ? t('settings.llmConfiguration.connectionSuccessful')
                        : t('settings.llmConfiguration.connectionFailed')}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400 font-medium">
                    {t('settings.llmConfiguration.connectionDetails', {
                      provider: healthCheck.provider,
                      model: healthCheck.model,
                    })}
                  </p>
                  {healthCheckError && (
                    <p className="text-sm text-red-400 font-medium mt-2 break-words">
                      {healthCheckError}
                    </p>
                  )}
                  {healthCheckWarning && (
                    <p className="text-sm text-amber-500/80 font-medium mt-2 break-words">
                      {healthCheckWarning}
                    </p>
                  )}
                  {healthDetailItems.length > 0 && (
                    <div className="mt-4 space-y-4">
                      {healthDetailItems.map((item) =>
                        item.key === 'reasoningContent' ? (
                          <details key={item.key} className="group">
                            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300">
                              {item.label}
                            </summary>
                            <pre className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-white/5 bg-black/40 p-4 text-xs text-zinc-300 font-mono">
                              {item.value}
                            </pre>
                          </details>
                        ) : (
                          <div key={item.key}>
                            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                              {item.label}
                            </p>
                            <pre className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-white/5 bg-black/40 p-4 text-xs text-zinc-300 font-mono">
                              {item.value}
                            </pre>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Content Generation Section */}
          <section className="border border-white/5 bg-zinc-900/40 p-4 sm:p-6 md:p-8 rounded-3xl shadow-2xl shadow-black/50 space-y-6 sm:space-y-8">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <Settings2 className="w-5 h-5 text-zinc-300" />
              </div>
              <h2 className="text-xl font-medium tracking-wide text-zinc-100">
                {t('settings.contentGeneration.title')}
              </h2>
            </div>

            <div className="space-y-6">
              <p className="text-sm text-zinc-400 font-medium mb-6">
                {t('settings.contentGeneration.description')}
              </p>

              <div className="space-y-8">
                <ToggleSwitch
                  checked={enableCoverLetter}
                  onCheckedChange={(checked) => {
                    setEnableCoverLetter(checked);
                    handleFeatureConfigChange('enable_cover_letter', checked);
                  }}
                  label={t('settings.contentGeneration.coverLetter.label')}
                  description={t('settings.contentGeneration.coverLetter.description')}
                  disabled={featureConfigLoading}
                />
                {enableCoverLetter && (
                  <div className="pl-6 space-y-4 border-l border-white/10 ml-2">
                    <Label htmlFor="coverLetterPrompt" className="text-zinc-300">
                      {t('settings.contentGeneration.customPromptLabel')}
                    </Label>
                    <textarea
                      id="coverLetterPrompt"
                      rows={8}
                      value={coverLetterPrompt}
                      onChange={(e) => setCoverLetterPrompt(e.target.value)}
                      placeholder={coverLetterDefault}
                      className="w-full rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-xs text-zinc-300 break-words focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors placeholder:text-zinc-700"
                    />
                    <p className="text-sm text-zinc-500 font-medium">
                      {t('settings.contentGeneration.customPromptHelp')}
                    </p>
                    {featurePromptError?.field === 'cover_letter_prompt' && (
                      <p className="text-sm text-red-400 font-medium break-words">
                        {t('settings.contentGeneration.customPromptErrorMissing', {
                          missing: featurePromptError.missing.join(', '),
                        })}
                      </p>
                    )}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <Button
                        variant="outline"
                        onClick={() =>
                          handleFeaturePromptSave('cover_letter_prompt', coverLetterPrompt)
                        }
                        disabled={featurePromptSaving === 'cover_letter_prompt'}
                        className="w-full sm:w-auto bg-white text-black hover:bg-zinc-200 border-none rounded-xl"
                      >
                        {featurePromptSaving === 'cover_letter_prompt' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          t('common.save')
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleFeaturePromptSave('cover_letter_prompt', '')}
                        disabled={featurePromptSaving === 'cover_letter_prompt'}
                        className="w-full sm:w-auto bg-zinc-800/50 border-white/10 text-zinc-200 hover:bg-zinc-700/50 rounded-xl"
                      >
                        {t('settings.contentGeneration.customPromptResetButton')}
                      </Button>
                    </div>
                  </div>
                )}
                <ToggleSwitch
                  checked={enableOutreach}
                  onCheckedChange={(checked) => {
                    setEnableOutreach(checked);
                    handleFeatureConfigChange('enable_outreach_message', checked);
                  }}
                  label={t('settings.contentGeneration.outreachMessage.label')}
                  description={t('settings.contentGeneration.outreachMessage.description')}
                  disabled={featureConfigLoading}
                />
                {enableOutreach && (
                  <div className="pl-4 sm:pl-6 space-y-4 border-l border-white/10 ml-2">
                    <Label htmlFor="outreachPrompt" className="text-zinc-300">
                      {t('settings.contentGeneration.customPromptLabel')}
                    </Label>
                    <textarea
                      id="outreachPrompt"
                      rows={8}
                      value={outreachPrompt}
                      onChange={(e) => setOutreachPrompt(e.target.value)}
                      placeholder={outreachDefault}
                      className="w-full rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-xs text-zinc-300 break-words focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors placeholder:text-zinc-700"
                    />
                    <p className="text-sm text-zinc-500 font-medium">
                      {t('settings.contentGeneration.customPromptHelp')}
                    </p>
                    {featurePromptError?.field === 'outreach_message_prompt' && (
                      <p className="text-sm text-red-400 font-medium break-words">
                        {t('settings.contentGeneration.customPromptErrorMissing', {
                          missing: featurePromptError.missing.join(', '),
                        })}
                      </p>
                    )}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <Button
                        variant="outline"
                        onClick={() =>
                          handleFeaturePromptSave('outreach_message_prompt', outreachPrompt)
                        }
                        disabled={featurePromptSaving === 'outreach_message_prompt'}
                        className="w-full sm:w-auto bg-white text-black hover:bg-zinc-200 border-none rounded-xl"
                      >
                        {featurePromptSaving === 'outreach_message_prompt' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          t('common.save')
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleFeaturePromptSave('outreach_message_prompt', '')}
                        disabled={featurePromptSaving === 'outreach_message_prompt'}
                        className="w-full sm:w-auto bg-zinc-800/50 border-white/10 text-zinc-200 hover:bg-zinc-700/50 rounded-xl"
                      >
                        {t('settings.contentGeneration.customPromptResetButton')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-8 border-t border-white/5">
                <Dropdown
                  options={localizedPromptOptions}
                  value={defaultPromptId}
                  onChange={handlePromptConfigChange}
                  label={t('settings.promptSettings.title')}
                  description={t('settings.promptSettings.description')}
                  disabled={promptConfigLoading}
                />
              </div>
            </div>
          </section>

          {/* Language Settings Section */}
          <section className="border border-white/5 bg-zinc-900/40 p-4 sm:p-6 md:p-8 rounded-3xl shadow-2xl shadow-black/50 space-y-6 sm:space-y-8">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <Globe className="w-5 h-5 text-zinc-300" />
              </div>
              <h2 className="text-xl font-medium tracking-wide text-zinc-100">
                {t('settings.uiLanguage')} & {t('settings.contentLanguage')}
              </h2>
            </div>

            {/* UI Language */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 mb-2">
                  {t('settings.uiLanguage')}
                </h3>
                <p className="text-sm text-zinc-500 font-medium mb-4">{t('settings.uiLanguageDescription')}</p>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {supportedLanguages.map((lang) => (
                    <button
                      key={`ui-${lang}`}
                      onClick={() => setUiLanguage(lang as Locale)}
                      disabled={languageLoading}
                      className={`px-4 py-3 text-sm ${SEGMENTED_BUTTON_BASE} ${uiLanguage === lang ? SEGMENTED_BUTTON_ACTIVE : SEGMENTED_BUTTON_INACTIVE}`}
                    >
                      {languageNames[lang]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Content Language */}
            <div className="space-y-4 pt-8 border-t border-white/5">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 mb-2">
                  {t('settings.contentLanguage')}
                </h3>
                <p className="text-sm text-zinc-500 font-medium mb-4">
                  {t('settings.contentLanguageDescription')}
                </p>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {supportedLanguages.map((lang) => (
                    <button
                      key={`content-${lang}`}
                      onClick={() => setContentLanguage(lang as SupportedLanguage)}
                      disabled={languageLoading}
                      className={`px-4 py-3 text-sm ${SEGMENTED_BUTTON_BASE} ${contentLanguage === lang ? SEGMENTED_BUTTON_ACTIVE : SEGMENTED_BUTTON_INACTIVE}`}
                    >
                      {languageNames[lang]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="border border-red-500/20 bg-red-500/5 p-4 sm:p-6 md:p-8 rounded-3xl shadow-2xl shadow-black/50 space-y-6 sm:space-y-8">
            <div className="flex items-center gap-3 border-b border-red-500/20 pb-4">
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-5 h-5 text-red-500/80" />
              </div>
              <h2 className="text-xl font-medium tracking-wide text-red-400">
                {t('settings.dangerZone')}
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Clear API Keys */}
              <div className="border border-red-500/20 bg-red-500/10 p-6 rounded-2xl space-y-6">
                <div>
                  <h3 className="font-semibold text-red-300 mb-2">
                    {t('settings.clearApiKeys')}
                  </h3>
                  <p className="text-sm text-red-400/80 font-medium">{t('settings.clearApiKeysDescription')}</p>
                </div>
                <Button
                  variant="outline"
                  className="w-full bg-transparent border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/40 rounded-xl"
                  onClick={() => setShowClearApiKeysDialog(true)}
                  disabled={isResetting}
                >
                  <Key className="w-4 h-4 mr-2" />
                  {t('settings.clearApiKeys')}
                </Button>
              </div>

              {/* Reset Database */}
              <div className="border border-red-500/20 bg-red-500/10 p-6 rounded-2xl space-y-6">
                <div>
                  <h3 className="font-semibold text-red-300 mb-2">
                    {t('settings.resetDatabase')}
                  </h3>
                  <p className="text-sm text-red-400/80 font-medium">{t('settings.resetDatabaseDescription')}</p>
                </div>
                <Button
                  variant="destructive"
                  className="w-full bg-red-500/80 hover:bg-red-500 text-white rounded-xl"
                  onClick={() => setShowResetDatabaseDialog(true)}
                  disabled={isResetting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('settings.resetDatabase')}
                </Button>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="bg-zinc-900/40 backdrop-blur-2xl p-6 border border-white/5 shadow-2xl shadow-black/50 rounded-3xl flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Recro AI"
              width={24}
              height={24}
              className="w-6 h-6 opacity-90"
            />
            <span className="text-sm font-medium tracking-wide text-zinc-500">
              {getVersionString().toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {statusLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                <span className="text-sm font-medium text-zinc-500">
                  {t('settings.footer.status.checking')}
                </span>
              </>
            ) : systemStatus ? (
              <>
                <div
                  className={`w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor] ${systemStatus.status === 'ready' ? 'bg-emerald-500 text-emerald-500' : 'bg-amber-500 text-amber-500'}`}
                ></div>
                <span
                  className={`text-sm font-semibold tracking-wide ${systemStatus.status === 'ready' ? 'text-emerald-500' : 'text-amber-500'}`}
                >
                  {systemStatus.status === 'ready'
                    ? t('settings.footer.status.ready')
                    : t('settings.footer.status.setupRequired')}
                </span>
              </>
            ) : (
              <span className="text-sm font-medium text-zinc-500">
                {t('settings.footer.status.offline')}
              </span>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showClearApiKeysDialog}
        onOpenChange={setShowClearApiKeysDialog}
        title={t('confirmations.clearApiKeys')}
        description={t('confirmations.clearApiKeysDescription')}
        confirmLabel={t('common.delete')}
        variant="warning"
        onConfirm={handleClearApiKeys}
      />

      <ConfirmDialog
        open={showResetDatabaseDialog}
        onOpenChange={setShowResetDatabaseDialog}
        title={t('confirmations.resetDatabase')}
        description={t('confirmations.resetDatabaseDescription')}
        confirmLabel={t('common.reset')}
        variant="danger"
        onConfirm={handleResetDatabase}
      />

      <ConfirmDialog
        open={showSuccessDialog}
        onOpenChange={setShowSuccessDialog}
        title={successMessage.title}
        description={successMessage.description}
        confirmLabel={t('common.close')}
        showCancelButton={false}
        variant="success"
        onConfirm={() => setShowSuccessDialog(false)}
      />
    </div>
  );
}
