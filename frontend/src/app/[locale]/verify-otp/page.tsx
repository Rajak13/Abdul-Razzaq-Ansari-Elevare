'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter, Link } from '@/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import apiClient from '@/lib/api-client';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { 
  Mail, 
  ArrowLeft, 
  CheckCircle2, 
  RefreshCw, 
  Info, 
  ShieldCheck,
  AlertCircle 
} from 'lucide-react';

function VerifyOTPForm() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get('email') || '';
  const t = useTranslations('auth.verifyOtp');
  const tValidation = useTranslations('auth.validation');
  const { refreshUser } = useAuth();

  // 6 separate OTP digits
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);

  // Redirect if no email provided
  useEffect(() => {
    if (!emailFromQuery) {
      router.push('/register');
    }
  }, [emailFromQuery, router]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Cooldown countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle digit input
  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric input
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned && value !== '') return;

    const newOtp = [...otp];
    const lastChar = cleaned.slice(-1);
    newOtp[index] = lastChar;
    setOtp(newOtp);

    if (errors.otp || errors.submit) {
      setErrors({});
    }

    // Auto-advance to next input if digit entered
    if (lastChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // If all 6 digits are filled, automatically trigger submission
    if (lastChar && index === 5) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === 6) {
        verifyCode(fullOtp);
      }
    }
  };

  // Handle key down (Backspace and arrow navigation)
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // Move back and clear previous
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle paste full 6-digit code
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;

    const newOtp = [...otp];
    pasteData.split('').forEach((char, idx) => {
      if (idx < 6) newOtp[idx] = char;
    });
    setOtp(newOtp);

    // Focus last filled or next input
    const nextIndex = Math.min(pasteData.length, 5);
    inputRefs.current[nextIndex]?.focus();

    if (pasteData.length === 6) {
      verifyCode(pasteData);
    }
  };

  const verifyCode = async (code: string) => {
    if (!emailFromQuery) {
      setErrors({ submit: tValidation('emailRequired') });
      return;
    }

    if (code.length !== 6) {
      setErrors({ otp: t('invalidCode') });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await apiClient.post('/auth/verify-otp', {
        email: emailFromQuery,
        otp: code,
      });

      // Save token and user info for client fallback
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('auth_token', response.data.token);
      }
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      setIsVerified(true);
      toast.success(t('success'));

      // Refresh auth context so protected routes recognize authentication immediately
      try {
        await refreshUser();
      } catch (err) {
        // Continue even if refreshUser background fetch logs an error
      }

      // Perform a full reload/navigation to dashboard to initialize authenticated session cleanly
      setTimeout(() => {
        window.location.href = `/${locale}/dashboard`;
      }, 1200);
    } catch (error) {
      const axiosError = error as AxiosError<{ error: { message: string } }>;
      setErrors({
        submit: axiosError.response?.data?.error?.message || t('failed'),
      });
      // Clear inputs on failure and refocus first digit
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyCode(otp.join(''));
  };

  const handleResendOTP = async () => {
    if (!emailFromQuery || resendCooldown > 0) return;

    setIsResending(true);
    setErrors({});

    try {
      await apiClient.post('/auth/resend-otp', {
        email: emailFromQuery,
      });

      toast.success(t('resendSuccess'));
      setResendCooldown(60); // 60s cooldown
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error) {
      const axiosError = error as AxiosError<{ error: { message: string } }>;
      setErrors({
        submit: axiosError.response?.data?.error?.message || t('failed'),
      });
    } finally {
      setIsResending(false);
    }
  };

  const fullCode = otp.join('');

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 sm:px-6 py-12 bg-background overflow-hidden">
      {/* Background ambient decorative glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none -z-10" />

      <div className="max-w-lg w-full bg-card border border-border shadow-2xl rounded-3xl p-6 sm:p-10 space-y-7 transition-all">
        {/* Header Icon */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 text-primary border border-primary/20 rounded-2xl flex items-center justify-center shadow-inner transition-transform duration-300 hover:scale-105">
              {isVerified ? (
                <CheckCircle2 className="w-9 h-9 sm:w-11 sm:h-11 text-emerald-500 animate-in zoom-in-75 duration-300" />
              ) : (
                <Mail className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border border-border shadow-sm">
              <ShieldCheck className="w-4 h-4 text-primary" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {isVerified ? 'Verification Successful!' : t('heading')}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-sm">
              {t('description')}{' '}
              <span className="font-semibold text-foreground break-all inline-block px-1.5 py-0.5 rounded bg-muted/60 text-xs sm:text-sm">
                {emailFromQuery}
              </span>
            </p>
          </div>
        </div>

        {/* Error notification */}
        {errors.submit && (
          <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{errors.submit}</span>
          </div>
        )}

        {/* Success notification */}
        {isVerified && (
          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-4 py-3.5 rounded-xl text-sm font-medium animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{t('success')}</span>
          </div>
        )}

        {/* OTP Input Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs sm:text-sm font-semibold text-foreground tracking-wide uppercase">
                {t('code')}
              </label>
              <span className="text-xs text-muted-foreground font-mono">
                {fullCode.length}/6 digits
              </span>
            </div>

            {/* 6 Digit Input Boxes */}
            <div className="grid grid-cols-6 gap-2 sm:gap-3">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  disabled={isLoading || isVerified}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className={`w-full h-13 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-xl border bg-muted/30 text-foreground transition-all duration-150 outline-none
                    ${
                      digit
                        ? 'border-primary ring-2 ring-primary/20 bg-background font-mono'
                        : 'border-input hover:border-primary/50'
                    }
                    ${errors.otp || errors.submit ? 'border-destructive ring-2 ring-destructive/20' : ''}
                    focus:border-primary focus:ring-4 focus:ring-primary/20 focus:bg-background disabled:opacity-50 disabled:cursor-not-allowed`}
                />
              ))}
            </div>

            {errors.otp && (
              <p className="mt-2 text-xs sm:text-sm text-destructive font-medium">
                {errors.otp}
              </p>
            )}
          </div>

          {/* Prominent Spam / Junk Notification Callout */}
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-xs sm:text-sm text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <Info className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-amber-950 dark:text-amber-300">
                {t('spamNoticeTitle')}
              </p>
              <p className="text-amber-800/90 dark:text-amber-300/80 leading-relaxed text-xs sm:text-sm">
                {t('spamNoticeDesc')}
              </p>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={isLoading || isVerified || fullCode.length !== 6}
            className="w-full py-3.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{t('submitting')}</span>
              </>
            ) : isVerified ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Verified!</span>
              </>
            ) : (
              t('submit')
            )}
          </button>

          {/* Resend Code Section */}
          <div className="flex flex-col sm:flex-row items-center justify-between pt-2 gap-2 text-xs sm:text-sm">
            <span className="text-muted-foreground">{t('didntReceive')}</span>

            {resendCooldown > 0 ? (
              <span className="text-muted-foreground font-medium text-xs sm:text-sm bg-muted/60 px-2.5 py-1 rounded-md">
                {t('resendIn', { seconds: resendCooldown })}
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={isResending || isLoading}
                className="font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('resending')}</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{t('resend')}</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Return link */}
          <div className="text-center pt-4 border-t border-border">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              <span>{t('changeEmail')} {t('backToRegister')}</span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      }
    >
      <VerifyOTPForm />
    </Suspense>
  );
}
