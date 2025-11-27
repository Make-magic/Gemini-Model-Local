
import React, { useState } from 'react';
import { KeyRound, Info, Check, AlertCircle, ShieldCheck, Wifi, Loader2, XCircle } from 'lucide-react';
import { Toggle } from '../shared/Tooltip';
import { useResponsiveValue } from '../../hooks/useDevice';
import { SETTINGS_INPUT_CLASS } from '../../constants/appConstants';
import { geminiServiceInstance } from '../../services/geminiService';

interface ApiConfigSectionProps {
  useCustomApiConfig: boolean;
  setUseCustomApiConfig: (value: boolean) => void;
  apiKey: string | null;
  setApiKey: (value: string | null) => void;
  apiProxyUrl: string | null;
  setApiProxyUrl: (value: string | null) => void;
  useApiProxy: boolean;
  setUseApiProxy: (value: boolean) => void;
  t: (key: string) => string;
}

export const ApiConfigSection: React.FC<ApiConfigSectionProps> = ({
  useCustomApiConfig,
  setUseCustomApiConfig,
  apiKey,
  setApiKey,
  apiProxyUrl,
  setApiProxyUrl,
  useApiProxy,
  setUseApiProxy,
  t,
}) => {
  const [isApiKeyFocused, setIsApiKeyFocused] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const inputBaseClasses = "w-full p-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-offset-0 text-sm custom-scrollbar font-mono";
  const iconSize = useResponsiveValue(18, 20);

  // Visual blur effect for API key when not focused
  const apiKeyBlurClass = !isApiKeyFocused && useCustomApiConfig && apiKey ? 'text-transparent [text-shadow:0_0_6px_var(--theme-text-primary)] tracking-widest' : '';

  const getProxyPlaceholder = () => {
    if (!useCustomApiConfig) return 'Enable custom config first';
    if (!useApiProxy) return 'Enable proxy URL to set value';
    return 'e.g., http://127.0.0.1:5345';
  };

  const hasEnvKey = !!process.env.API_KEY;

  const handleTestConnection = async () => {
      // Use the settings from the current form state
      const proxyToUse = useApiProxy ? (apiProxyUrl || '').trim() : undefined;
      const keyToTest = apiKey || (useCustomApiConfig ? '' : process.env.API_KEY) || '';
      
      if (!keyToTest) {
          setTestResult({ success: false, message: "API Key is required for testing." });
          return;
      }

      if (useApiProxy && !proxyToUse) {
          setTestResult({ success: false, message: "Proxy URL is enabled but empty." });
          return;
      }

      // Pick first key if multiple
      const firstKey = keyToTest.split('\n')[0].trim();
      
      setIsTesting(true);
      setTestResult(null);

      try {
          let modelCount = 0;

          if (useApiProxy && proxyToUse) {
              // Direct fetch for proxy verification.
              // We strip /v1beta/models or similar suffixes to ensure we hit the list endpoint correctly
              let baseUrl = proxyToUse.replace(/\/+$/, '');
              // If the user pasted the full path including version, strip it for the test logic or assume they know what they are doing.
              // Best practice: Proxy URL should be the base (e.g. http://localhost:8080). 
              // We append /v1beta/models to check standard Gemini compatibility.
              
              // Handle case where user puts /v1beta at the end
              if (baseUrl.endsWith('/v1beta')) {
                  baseUrl = baseUrl.substring(0, baseUrl.length - 7);
              }

              const url = `${baseUrl}/v1beta/models?key=${firstKey}`;
              
              // Use a Simple Request (no custom headers) to attempt to bypass strict CORS preflight (OPTIONS)
              // if the server allows it.
              const response = await fetch(url, {
                  method: 'GET',
                  mode: 'cors', 
                  // Explicitly NOT setting Content-Type to avoid preflight for this test if possible
              });

              if (!response.ok) {
                  const text = await response.text();
                  let errorMsg = `HTTP ${response.status}`;
                  if (response.status === 404) errorMsg += " (Not Found - Check Proxy URL)";
                  else if (response.status === 403) errorMsg += " (Forbidden - Check API Key)";
                  
                  try {
                      const json = JSON.parse(text);
                      if (json.error && json.error.message) {
                          errorMsg += `: ${json.error.message}`;
                      }
                  } catch (e) {
                      errorMsg += `: ${text.substring(0, 100)}`;
                  }
                  throw new Error(errorMsg);
              }

              const data = await response.json();
              const models = data.models || [];
              modelCount = models.length;
          } else {
              // Standard SDK check for direct connection
              const models = await geminiServiceInstance.getAvailableModels(firstKey, undefined);
              modelCount = models.length;
          }

          if (modelCount > 0) {
              setTestResult({ success: true, message: `Connected! Found ${modelCount} models.` });
          } else {
              setTestResult({ success: false, message: "Connected, but no models returned." });
          }
      } catch (error) {
          let msg = error instanceof Error ? error.message : String(error);
          if (msg.includes('Failed to fetch')) {
              msg = "Network Error: Could not connect. Check Proxy URL and CORS settings.";
          }
          setTestResult({ success: false, message: msg });
      } finally {
          setIsTesting(false);
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <h3 className="text-base font-semibold text-[var(--theme-text-primary)] flex items-center gap-2">
             <KeyRound size={iconSize} className="text-[var(--theme-text-link)]" strokeWidth={1.5} />
             {t('settingsApiConfig')}
         </h3>
      </div>

      <div className="overflow-hidden">
        {/* Header Toggle */}
        <div className="flex items-center justify-between py-2 cursor-pointer" onClick={() => setUseCustomApiConfig(!useCustomApiConfig)}>
            <div className="flex flex-col">
                <span className="text-sm font-medium text-[var(--theme-text-primary)] flex items-center gap-2">
                  {t('settingsUseCustomApi')}
                  {hasEnvKey && !useCustomApiConfig && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-600 border border-green-500/20">
                          <ShieldCheck size={10} /> Env Key Active
                      </span>
                  )}
                </span>
                <span className="text-xs text-[var(--theme-text-tertiary)] mt-0.5">
                    {useCustomApiConfig 
                        ? (hasEnvKey ? 'Overriding environment API key' : 'Using your own API keys')
                        : (hasEnvKey ? t('apiConfig_default_info') : 'No API key found in environment. Enable custom key to proceed.')
                    }
                </span>
            </div>
            <Toggle
              id="use-custom-api-config-toggle"
              checked={useCustomApiConfig}
              onChange={setUseCustomApiConfig}
            />
        </div>

        {/* Content */}
        <div className={`transition-all duration-300 ease-in-out ${useCustomApiConfig ? 'opacity-100 max-h-[600px] pt-4' : 'opacity-50 max-h-0 overflow-hidden'}`}>
            <div className="space-y-5">
                {/* API Key Input */}
                <div className="space-y-2">
                    <label htmlFor="api-key-input" className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)]">
                        {t('settingsApiKey')}
                    </label>
                    <div className="relative">
                        <textarea
                          id="api-key-input"
                          rows={3}
                          value={apiKey || ''}
                          onChange={(e) => { setApiKey(e.target.value || null); setTestResult(null); }}
                          onFocus={() => setIsApiKeyFocused(true)}
                          onBlur={() => setIsApiKeyFocused(false)}
                          className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS} resize-y min-h-[80px] ${apiKeyBlurClass}`}
                          placeholder={t('apiConfig_key_placeholder')}
                          spellCheck={false}
                        />
                        {!isApiKeyFocused && apiKey && (
                            <div className="absolute top-3 right-3 pointer-events-none">
                                <Check size={16} className="text-[var(--theme-text-success)]" strokeWidth={1.5} />
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-[var(--theme-text-tertiary)] flex gap-1.5">
                        <Info size={14} className="flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                        <span>{t('settingsApiKeyHelpText')}</span>
                    </p>
                </div>

                {/* Proxy Settings */}
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between py-2">
                        <label htmlFor="use-api-proxy-toggle" className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] cursor-pointer flex items-center gap-2" onClick={() => setUseApiProxy(!useApiProxy)}>
                            API Proxy
                        </label>
                        <Toggle
                          id="use-api-proxy-toggle"
                          checked={useApiProxy}
                          onChange={(val) => { setUseApiProxy(val); setTestResult(null); }}
                        />
                    </div>
                    
                    <div className={`transition-all duration-200 ${useApiProxy ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                        <div className="flex gap-2">
                            <input
                                id="api-proxy-url-input"
                                type="text"
                                value={apiProxyUrl || ''}
                                onChange={(e) => { setApiProxyUrl(e.target.value || null); setTestResult(null); }}
                                className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS}`}
                                placeholder={getProxyPlaceholder()}
                                aria-label="API Proxy URL"
                            />
                            <button
                                onClick={handleTestConnection}
                                disabled={isTesting || !apiKey}
                                className="flex items-center justify-center px-4 rounded-lg bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-tertiary)]/80 text-[var(--theme-text-primary)] border border-[var(--theme-border-secondary)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Test Connection"
                            >
                                {isTesting ? <Loader2 size={18} className="animate-spin" /> : <Wifi size={18} />}
                            </button>
                        </div>
                        
                        {testResult && (
                            <div className={`mt-2 text-xs flex items-center gap-2 p-2 rounded-md ${testResult.success ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'}`}>
                                {testResult.success ? <Check size={14} /> : <XCircle size={14} />}
                                <span>{testResult.message}</span>
                            </div>
                        )}

                         <p className="text-xs text-[var(--theme-text-tertiary)] mt-2 flex gap-1.5">
                            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                            <span>Overwrites default base URL. <strong>CORS support is required</strong> on the proxy.</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
