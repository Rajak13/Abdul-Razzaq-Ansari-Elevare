'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { AxiosError } from 'axios';

function VerifyOTPForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get('email') || '';

  const [formData, setFormData] = useState({
    email: emailFromQuery,
    otp: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (!emailFromQuery) {
      router.push('/register');
    }
  }, [emailFromQuery, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage('');

    if (!formData.email) {
      setErrors({ email: 'Email is required' });
      return;
    }

    if (!formData.otp || formData.otp.length !== 6) {
      setErrors({ otp: 'Please enter a valid 6-digit OTP' });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.post('/auth/verify-otp', {
        email: formData.email,
        otp: formData.otp,
      });

      // Store token and user data
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      setSuccessMessage('Email verified successfully! Redirecting to dashboard...');
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (error) {
      const axiosError = error as AxiosError<{ error: { message: string } }>;
      setErrors({
        submit: axiosError.response?.data?.error?.message || 'Verification failed. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!formData.email) {
      setErrors({ email: 'Email is required' });
      return;
    }

    setIsResending(true);
    setResendMessage('');
    setErrors({});

    try {
      await apiClient.post('/auth/resend-otp', {
        email: formData.email,
      });

      setResendMessage('OTP has been resent to your email!');
      setTimeout(() => setResendMessage(''), 5000);
    } catch (error) {
      const axiosError = error as AxiosError<{ error: { message: string } }>;
      setErrors({
        submit: axiosError.response?.data?.error?.message || 'Failed to resend OTP. Please try again.',
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Only allow numbers for OTP and limit to 6 digits
    if (name === 'otp') {
      const numericValue = value.replace(/\D/g, '').slice(0, 6);
      setFormData((prev) => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-gradient-to-br from-green-50 to-green-100">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
          <p className="text-gray-600">
            We've sent a 6-digit code to <span className="font-semibold">{formData.email}</span>
          </p>
        </div>

        {/* Form */}
        <form className="space-y-5" onSubmit={handleSubmit}>
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errors.submit}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {successMessage}
            </div>
          )}

          {resendMessage && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
              {resendMessage}
            </div>
          )}

          {/* OTP Input */}
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
              Enter OTP Code
            </label>
            <input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={formData.otp}
              onChange={handleChange}
              className={`block w-full px-4 py-3 border ${
                errors.otp ? 'border-red-300' : 'border-gray-300'
              } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900 text-center text-2xl tracking-widest font-semibold`}
              placeholder="000000"
            />
            {errors.otp && <p className="mt-1 text-sm text-red-600">{errors.otp}</p>}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || formData.otp.length !== 6}
            className="w-full py-3.5 px-4 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? 'Verifying...' : 'Verify Email'}
          </button>

          {/* Resend OTP */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Didn't receive the code?{' '}
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={isResending}
                className="font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
              >
                {isResending ? 'Sending...' : 'Resend OTP'}
              </button>
            </p>
          </div>

          {/* Back to Register */}
          <div className="text-center pt-4 border-t border-gray-200">
            <Link href="/register" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              ← Back to Register
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <VerifyOTPForm />
    </Suspense>
  );
}
