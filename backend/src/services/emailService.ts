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
 * Send account suspension notification email
 */
export async function sendSuspensionEmail(
  email: string,
  name: string,
  reason: string,
  suspensionType: 'temporary' | 'permanent',
  expiresAt?: Date,
  locale: string = 'en'
): Promise<void> {
  const translations: Record<string, any> = {
    en: {
      subject: 'Your Elevare Account Has Been Suspended',
      title: 'Account Suspended',
      greeting: 'Hello',
      message: 'Your Elevare account has been suspended due to the following reason:',
      suspensionType: suspensionType === 'temporary' ? 'Temporary Suspension' : 'Permanent Suspension',
      expiresLabel: 'Suspension expires on:',
      appealInfo: 'If you believe this suspension was made in error, you can submit an appeal:',
      appealButton: 'Submit Appeal',
      permanentNote: 'This is a permanent suspension. However, you may still submit an appeal for review.',
      contactSupport: 'If you have any questions, please contact our support team.',
      footer: 'This is an automated message from Elevare. Please do not reply to this email.'
    },
    ne: {
      subject: 'तपाईंको Elevare खाता निलम्बित गरिएको छ',
      title: 'खाता निलम्बित',
      greeting: 'नमस्ते',
      message: 'तपाईंको Elevare खाता निम्न कारणले निलम्बित गरिएको छ:',
      suspensionType: suspensionType === 'temporary' ? 'अस्थायी निलम्बन' : 'स्थायी निलम्बन',
      expiresLabel: 'निलम्बन समाप्त हुने मिति:',
      appealInfo: 'यदि तपाईंलाई लाग्छ कि यो निलम्बन गलत थियो भने, तपाईं अपील पेश गर्न सक्नुहुन्छ:',
      appealButton: 'अपील पेश गर्नुहोस्',
      permanentNote: 'यो स्थायी निलम्बन हो। तथापि, तपाईं अझै पनि समीक्षाको लागि अपील पेश गर्न सक्नुहुन्छ।',
      contactSupport: 'यदि तपाईंसँग कुनै प्रश्नहरू छन् भने, कृपया हाम्रो समर्थन टोलीलाई सम्पर्क गर्नुहोस्।',
      footer: 'यो Elevare बाट स्वचालित सन्देश हो। कृपया यो इमेलको जवाफ नदिनुहोस्।'
    },
    ko: {
      subject: 'Elevare 계정이 정지되었습니다',
      title: '계정 정지',
      greeting: '안녕하세요',
      message: '다음 이유로 Elevare 계정이 정지되었습니다:',
      suspensionType: suspensionType === 'temporary' ? '임시 정지' : '영구 정지',
      expiresLabel: '정지 해제 날짜:',
      appealInfo: '이 정지가 잘못되었다고 생각하시면 이의 신청을 제출할 수 있습니다:',
      appealButton: '이의 신청 제출',
      permanentNote: '이것은 영구 정지입니다. 그러나 검토를 위해 이의 신청을 제출할 수 있습니다.',
      contactSupport: '질문이 있으시면 지원팀에 문의하세요.',
      footer: '이것은 Elevare의 자동 메시지입니다. 이 이메일에 회신하지 마세요.'
    }
  };

  const t = translations[locale] || translations['en'];
  const appealUrl = `${config.corsOrigin}/suspension-appeal`;

  const expiresHtml = expiresAt && suspensionType === 'temporary' ? `
    <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
      <strong>${t.expiresLabel}</strong> ${expiresAt.toLocaleString(locale === 'ne' ? 'ne-NP' : locale === 'ko' ? 'ko-KR' : 'en-US', { 
        dateStyle: 'full', 
        timeStyle: 'short' 
      })}
    </div>
  ` : `
    <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
      <strong>${t.permanentNote}</strong>
    </div>
  `;

  const mailOptions = {
    from: config.email.from,
    to: email,
    subject: t.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc3545; margin: 0;">${t.title}</h1>
          </div>
          
          <p style="font-size: 16px;">${t.greeting} ${name},</p>
          
          <p style="font-size: 16px;">${t.message}</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <strong style="color: #dc3545;">${t.suspensionType}</strong>
            <p style="margin: 10px 0 0 0; color: #333;">${reason}</p>
          </div>
          
          ${expiresHtml}
          
          <div style="margin: 30px 0;">
            <p style="font-size: 16px;">${t.appealInfo}</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${appealUrl}" 
                 style="background-color: #2d6a4f; color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                ${t.appealButton}
              </a>
            </div>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          
          <p style="color: #666; font-size: 14px;">${t.contactSupport}</p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center;">
            ${t.footer}
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Suspension email sent', { email, suspensionType, locale });
  } catch (error) {
    logger.error('Failed to send suspension email', { email, suspensionType, locale, error });
    throw new Error('Failed to send suspension email');
  }
}

/**
 * Send account unsuspension notification email
 */
export async function sendUnsuspensionEmail(
  email: string,
  name: string,
  reason: string,
  locale: string = 'en'
): Promise<void> {
  const translations: Record<string, any> = {
    en: {
      subject: 'Your Elevare Account Has Been Reinstated',
      title: 'Account Reinstated',
      greeting: 'Hello',
      message: 'Good news! Your Elevare account suspension has been lifted.',
      reasonLabel: 'Reason for reinstatement:',
      accessInfo: 'You now have full access to your account and can continue using all Elevare features.',
      loginButton: 'Login to Elevare',
      guidelinesReminder: 'Please remember to follow our community guidelines to maintain a positive environment for all users.',
      contactSupport: 'If you have any questions, please contact our support team.',
      footer: 'This is an automated message from Elevare. Please do not reply to this email.'
    },
    ne: {
      subject: 'तपाईंको Elevare खाता पुनर्स्थापित गरिएको छ',
      title: 'खाता पुनर्स्थापित',
      greeting: 'नमस्ते',
      message: 'शुभ समाचार! तपाईंको Elevare खाता निलम्बन हटाइएको छ।',
      reasonLabel: 'पुनर्स्थापनाको कारण:',
      accessInfo: 'तपाईंसँग अब आफ्नो खातामा पूर्ण पहुँच छ र सबै Elevare सुविधाहरू प्रयोग गर्न जारी राख्न सक्नुहुन्छ।',
      loginButton: 'Elevare मा लगइन गर्नुहोस्',
      guidelinesReminder: 'कृपया सबै प्रयोगकर्ताहरूको लागि सकारात्मक वातावरण कायम राख्न हाम्रो समुदाय दिशानिर्देशहरू पालना गर्न सम्झनुहोस्।',
      contactSupport: 'यदि तपाईंसँग कुनै प्रश्नहरू छन् भने, कृपया हाम्रो समर्थन टोलीलाई सम्पर्क गर्नुहोस्।',
      footer: 'यो Elevare बाट स्वचालित सन्देश हो। कृपया यो इमेलको जवाफ नदिनुहोस्।'
    },
    ko: {
      subject: 'Elevare 계정이 복원되었습니다',
      title: '계정 복원',
      greeting: '안녕하세요',
      message: '좋은 소식입니다! Elevare 계정 정지가 해제되었습니다.',
      reasonLabel: '복원 사유:',
      accessInfo: '이제 계정에 대한 전체 액세스 권한이 있으며 모든 Elevare 기능을 계속 사용할 수 있습니다.',
      loginButton: 'Elevare 로그인',
      guidelinesReminder: '모든 사용자를 위한 긍정적인 환경을 유지하기 위해 커뮤니티 가이드라인을 준수해 주세요.',
      contactSupport: '질문이 있으시면 지원팀에 문의하세요.',
      footer: '이것은 Elevare의 자동 메시지입니다. 이 이메일에 회신하지 마세요.'
    }
  };

  const t = translations[locale] || translations['en'];
  const loginUrl = `${config.corsOrigin}/login`;

  const mailOptions = {
    from: config.email.from,
    to: email,
    subject: t.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2d6a4f; margin: 0;">✓ ${t.title}</h1>
          </div>
          
          <p style="font-size: 16px;">${t.greeting} ${name},</p>
          
          <p style="font-size: 16px; color: #2d6a4f; font-weight: bold;">${t.message}</p>
          
          <div style="background-color: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
            <strong style="color: #155724;">${t.reasonLabel}</strong>
            <p style="margin: 10px 0 0 0; color: #155724;">${reason}</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #333;">${t.accessInfo}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" 
               style="background-color: #2d6a4f; color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              ${t.loginButton}
            </a>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>⚠️ ${t.guidelinesReminder}</strong>
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          
          <p style="color: #666; font-size: 14px;">${t.contactSupport}</p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center;">
            ${t.footer}
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Unsuspension email sent', { email, locale });
  } catch (error) {
    logger.error('Failed to send unsuspension email', { email, locale, error });
    throw new Error('Failed to send unsuspension email');
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

  async sendSuspensionEmail(
    email: string,
    name: string,
    reason: string,
    suspensionType: 'temporary' | 'permanent',
    expiresAt?: Date,
    locale: string = 'en'
  ): Promise<void> {
    return sendSuspensionEmail(email, name, reason, suspensionType, expiresAt, locale);
  }

  async sendUnsuspensionEmail(
    email: string,
    name: string,
    reason: string,
    locale: string = 'en'
  ): Promise<void> {
    return sendUnsuspensionEmail(email, name, reason, locale);
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
