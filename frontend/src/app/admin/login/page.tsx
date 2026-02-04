'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

type OtpFormData = z.infer<typeof otpSchema>;

export default function AdminLoginPage() {
  const [showOtp, setShowOtp] = useState(false);
  const [email, setEmail] = useState('');
  const router = useRouter();
  const { login, verifyOtp, isLoggingIn, isVerifyingOtp } = useAdminAuth();
  const { toast } = useToast();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: '',
    },
  });

  const onLoginSubmit = async (data: LoginFormData) => {
    try {
      login(
        { email: data.email, password: data.password },
        {
          onSuccess: (response: any) => {
            if (response.requiresOtp) {
              setEmail(data.email);
              setShowOtp(true);
              toast({
                title: 'OTP Required',
                description: 'Please enter the OTP from your authenticator app',
              });
            } else if (response.success) {
              // Login successful without MFA - redirect to dashboard
              toast({
                title: 'Login Successful',
                description: 'Redirecting to dashboard...',
              });
              router.push('/admin/dashboard');
            }
          },
          onError: (error: any) => {
            toast({
              title: 'Login Failed',
              description: error.response?.data?.message || 'Invalid credentials',
              variant: 'destructive',
            });
          },
        }
      );
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const onOtpSubmit = async (data: OtpFormData) => {
    try {
      verifyOtp(
        { email, otp: data.otp },
        {
          onError: (error: any) => {
            toast({
              title: 'Verification Failed',
              description: error.response?.data?.message || 'Invalid OTP',
              variant: 'destructive',
            });
          },
        }
      );
    } catch (error) {
      console.error('OTP verification error:', error);
    }
  };

  return (
    <div className="admin-auth-container">
      {/* Form Section */}
      <div className="admin-auth-form">
        <div className="max-w-md mx-auto w-full">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Elevare Admin</h1>
            <p className="text-muted-foreground">
              Secure administrative access
            </p>
          </div>

          {!showOtp ? (
            <Card>
              <CardHeader>
                <CardTitle>Sign In</CardTitle>
                <CardDescription>
                  Enter your credentials to access the admin dashboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@elevare.com"
                      {...loginForm.register('email')}
                      disabled={isLoggingIn}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-sm text-destructive">
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      {...loginForm.register('password')}
                      disabled={isLoggingIn}
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-destructive">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoggingIn}
                  >
                    {isLoggingIn ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Enter the 6-digit code from your authenticator app
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp">Authentication Code</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="000000"
                      maxLength={6}
                      {...otpForm.register('otp')}
                      disabled={isVerifyingOtp}
                      className="text-center text-2xl tracking-widest"
                    />
                    {otpForm.formState.errors.otp && (
                      <p className="text-sm text-destructive">
                        {otpForm.formState.errors.otp.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isVerifyingOtp}
                  >
                    {isVerifyingOtp ? 'Verifying...' : 'Verify'}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setShowOtp(false);
                      otpForm.reset();
                    }}
                  >
                    Back to Login
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Lock className="inline w-4 h-4 mr-1" />
            Secured with multi-factor authentication
          </div>
        </div>
      </div>

      {/* Illustration Section */}
      <div className="admin-auth-illustration">
        <div className="admin-auth-illustration-container">
          <div className="text-center">
            <Shield className="w-24 h-24 mx-auto mb-4 text-white/50" />
            <p className="text-white/70">
              Space for custom Canva illustration
              <br />
              (400x300px)
              <br />
              Theme: Security & Administration
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
