import nodemailer from 'nodemailer';
import config from '../config';
import logger from '../utils/logger';

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465, // true for 465, false for other ports
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
});

/**
 * Send OTP verification email
 */
export async function sendOTPEmail(
  email: string,
  name: string,
  otpCode: string,
  locale: string = 'en'
): Promise<void> {
  const translations: Record<string, any> = {
    en: {
      subject: 'Verify your Elevare account - OTP Code',
      welcome: 'Welcome to Elevare',
      thankYou: 'Thank you for registering. Please verify your email address using the OTP code below:',
      expiresIn: 'This code will expire in 10 minutes.',
      disclaimer: "If you didn't create an account with Elevare, you can safely ignore this email."
    },
    ne: {
      subject: 'तपाईंको Elevare खाता प्रमाणित गर्नुहोस् - OTP कोड',
      welcome: 'Elevare मा स्वागत छ',
      thankYou: 'दर्ता गर्नुभएकोमा धन्यवाद। कृपया तलको OTP कोड प्रयोग गरेर आफ्नो इमेल ठेगाना प्रमाणित गर्नुहोस्:',
      expiresIn: 'यो कोड 10 मिनेटमा समाप्त हुनेछ।',
      disclaimer: 'यदि तपाईंले Elevare सँग खाता सिर्जना गर्नुभएको छैन भने, तपाईं यो इमेललाई सुरक्षित रूपमा बेवास्ता गर्न सक्नुहुन्छ।'
    },
    ko: {
      subject: 'Elevare 계정 인증 - OTP 코드',
      welcome: 'Elevare에 오신 것을 환영합니다',
      thankYou: '등록해 주셔서 감사합니다. 아래 OTP 코드를 사용하여 이메일 주소를 인증하세요:',
      expiresIn: '이 코드는 10분 후에 만료됩니다.',
      disclaimer: 'Elevare 계정을 만들지 않으셨다면 이 이메일을 무시하셔도 됩니다.'
    }
  };

  const t = translations[locale] || translations['en'];

  const mailOptions = {
    from: config.email.from,
    to: email,
    subject: t.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${t.welcome}, ${name}!</h2>
        <p>${t.thankYou}</p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="background-color: #f0f0f0; padding: 20px; border-radius: 10px; display: inline-block;">
            <h1 style="margin: 0; color: #2d6a4f; font-size: 36px; letter-spacing: 8px;">${otpCode}</h1>
          </div>
        </div>
        <p style="text-align: center; color: #666;">${t.expiresIn}</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          ${t.disclaimer}
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('OTP email sent', { email, locale });
  } catch (error) {
    logger.error('Failed to send OTP email', { email, locale, error });
    throw new Error('Failed to send OTP email');
  }
}

/**
 * Send verification email (legacy - kept for backward compatibility)
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  verificationToken: string
): Promise<void> {
  const verificationUrl = `${config.apiUrl}/api/auth/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: config.email.from,
    to: email,
    subject: 'Verify your Elevare account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Elevare, ${name}!</h2>
        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #2d6a4f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          If you didn't create an account with Elevare, you can safely ignore this email.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Verification email sent', { email });
  } catch (error) {
    logger.error('Failed to send verification email', { email, error });
    throw new Error('Failed to send verification email');
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetToken: string,
  locale: string = 'en'
): Promise<void> {
  const resetUrl = `${config.corsOrigin}/reset-password?token=${resetToken}`;

  const translations: Record<string, any> = {
    en: {
      subject: 'Reset your Elevare password',
      title: 'Password Reset Request',
      greeting: 'Hi',
      message: 'We received a request to reset your password. Click the button below to create a new password:',
      button: 'Reset Password',
      orCopy: 'Or copy and paste this link into your browser:',
      expires: 'This link will expire in 1 hour.',
      disclaimer: "If you didn't request a password reset, you can safely ignore this email. Your password will not be changed."
    },
    ne: {
      subject: 'तपाईंको Elevare पासवर्ड रिसेट गर्नुहोस्',
      title: 'पासवर्ड रिसेट अनुरोध',
      greeting: 'नमस्ते',
      message: 'हामीले तपाईंको पासवर्ड रिसेट गर्ने अनुरोध प्राप्त गर्यौं। नयाँ पासवर्ड सिर्जना गर्न तलको बटनमा क्लिक गर्नुहोस्:',
      button: 'पासवर्ड रिसेट गर्नुहोस्',
      orCopy: 'वा यो लिङ्क प्रतिलिपि गरेर आफ्नो ब्राउजरमा टाँस्नुहोस्:',
      expires: 'यो लिङ्क 1 घण्टामा समाप्त हुनेछ।',
      disclaimer: 'यदि तपाईंले पासवर्ड रिसेट अनुरोध गर्नुभएको छैन भने, तपाईं यो इमेललाई सुरक्षित रूपमा बेवास्ता गर्न सक्नुहुन्छ। तपाईंको पासवर्ड परिवर्तन हुने छैन।'
    },
    ko: {
      subject: 'Elevare 비밀번호 재설정',
      title: '비밀번호 재설정 요청',
      greeting: '안녕하세요',
      message: '비밀번호 재설정 요청을 받았습니다. 아래 버튼을 클릭하여 새 비밀번호를 만드세요:',
      button: '비밀번호 재설정',
      orCopy: '또는 이 링크를 복사하여 브라우저에 붙여넣으세요:',
      expires: '이 링크는 1시간 후에 만료됩니다.',
      disclaimer: '비밀번호 재설정을 요청하지 않으셨다면 이 이메일을 무시하셔도 됩니다. 비밀번호는 변경되지 않습니다.'
    }
  };

  const t = translations[locale] || translations['en'];

  const mailOptions = {
    from: config.email.from,
    to: email,
    subject: t.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${t.title}</h2>
        <p>${t.greeting} ${name},</p>
        <p>${t.message}</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #2d6a4f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            ${t.button}
          </a>
        </div>
        <p>${t.orCopy}</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p style="color: #e63946; font-weight: bold;">${t.expires}</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          ${t.disclaimer}
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Password reset email sent', { email, locale });
  } catch (error) {
    logger.error('Failed to send password reset email', { email, locale, error });
    throw new Error('Failed to send password reset email');
  }
}

/**
 * Send notification email
 */
export async function sendNotificationEmail(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const mailOptions = {
    from: config.email.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Notification email sent', { to: options.to, subject: options.subject });
  } catch (error) {
    logger.error('Failed to send notification email', { to: options.to, subject: options.subject, error });
    throw new Error('Failed to send notification email');
  }
}

// Create EmailService class for dependency injection
export class EmailService {
  async sendOTPEmail(email: string, name: string, otpCode: string, locale: string = 'en'): Promise<void> {
    return sendOTPEmail(email, name, otpCode, locale);
  }

  async sendVerificationEmail(email: string, name: string, verificationToken: string): Promise<void> {
    return sendVerificationEmail(email, name, verificationToken);
  }

  async sendPasswordResetEmail(email: string, name: string, resetToken: string, locale: string = 'en'): Promise<void> {
    return sendPasswordResetEmail(email, name, resetToken, locale);
  }

  async sendNotificationEmail(options: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<void> {
    return sendNotificationEmail(options);
  }
}
