import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

export const GoogleIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const GoogleAuthButton = ({
  mode = 'signin', // 'signin' or 'signup'
  onSuccess,
  onError,
  disabled = false,
}) => {
  const [loading, setLoading] = useState(false);
  const hiddenBtnRef = useRef(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) {
      console.warn('VITE_GOOGLE_CLIENT_ID is not configured in .env');
      return;
    }

    const initGsi = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => {
              setLoading(false);
              if (response?.credential) {
                if (onSuccess) onSuccess(response.credential);
              } else {
                if (onError) onError('Google authentication was cancelled or failed to return credentials.');
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Render official GSI button in hidden container so we can trigger it securely
          if (hiddenBtnRef.current) {
            hiddenBtnRef.current.innerHTML = '';
            window.google.accounts.id.renderButton(hiddenBtnRef.current, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: mode === 'signup' ? 'signup_with' : 'signin_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: 320,
            });
          }
        } catch (err) {
          console.error('Failed to initialize Google Identity Services:', err);
        }
      }
    };

    // If GSI script already loaded
    if (window.google?.accounts?.id) {
      initGsi();
    } else {
      // Poll briefly if script is still loading
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGsi();
        }
      }, 200);
      const timer = setTimeout(() => clearInterval(interval), 5000);
      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    }
  }, [clientId, mode, onSuccess, onError]);

  const handleCustomClick = () => {
    if (disabled || loading) return;

    if (!clientId) {
      if (onError) onError('Google Client ID is missing. Please check VITE_GOOGLE_CLIENT_ID.');
      return;
    }

    setLoading(true);

    try {
      if (window.google?.accounts?.id) {
        // Try triggering the rendered hidden Google button for native GIS popup
        const innerBtn = hiddenBtnRef.current?.querySelector('div[role=button]') || hiddenBtnRef.current?.querySelector('button');
        if (innerBtn) {
          innerBtn.click();
        } else {
          // Fallback to Google prompt
          window.google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
              setLoading(false);
              // If prompt skipped or not displayed, user can click or retry
            }
          });
        }
      } else {
        setLoading(false);
        if (onError) onError('Google Identity Services script is still loading. Please try again in a moment.');
      }
    } catch (err) {
      setLoading(false);
      console.error('Google click error:', err);
      if (onError) onError('Could not initiate Google sign in. Please try again.');
    }

    // Safety timeout to reset loading state if popup closed without callback
    setTimeout(() => {
      setLoading(false);
    }, 6000);
  };

  const label = mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google';

  return (
    <div className="w-full space-y-2">
      {/* Hidden rendered GSI button container for reliable click delegation */}
      <div ref={hiddenBtnRef} className="hidden" aria-hidden="true" />

      {/* Styled Voyara Theme Google Button */}
      <button
        type="button"
        onClick={handleCustomClick}
        disabled={disabled || loading}
        className="w-full py-2.5 px-4 bg-white dark:bg-slate-900 hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl shadow-xs transition-all flex items-center justify-center space-x-3 text-xs sm:text-sm font-semibold cursor-pointer group disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-500 animate-spin" />
        ) : (
          <GoogleIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 transition-transform group-hover:scale-110" />
        )}
        <span>{loading ? 'Connecting with Google...' : label}</span>
      </button>
    </div>
  );
};
