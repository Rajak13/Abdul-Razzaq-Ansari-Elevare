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
      subject: 'Important: Your Elevare Account Status',
      title: 'Account Suspended',
      greeting: 'Hello',
      message: 'We regret to inform you that your Elevare account has been temporarily suspended.',
      suspensionType: suspensionType === 'temporary' ? 'Temporary Suspension' : 'Permanent Suspension',
      reasonLabel: 'Reason',
      expiresLabel: 'Suspension Period',
      expiresUntil: 'Your account will be automatically reinstated on',
      appealInfo: 'If you believe this action was taken in error, you may submit an appeal for review.',
      appealButton: 'Submit an Appeal',
      permanentNote: 'This is a permanent suspension. You may submit an appeal for administrative review.',
      guidelinesNote: 'Please review our Community Guidelines to understand our policies.',
      contactSupport: 'Questions? Contact our support team at support@elevare.com',
      footer: 'This is an automated notification from Elevare. Please do not reply to this email.'
    },
    ne: {
      subject: 'महत्वपूर्ण: तपाईंको Elevare खाता स्थिति',
      title: 'खाता निलम्बित',
      greeting: 'नमस्ते',
      message: 'हामी तपाईंलाई सूचित गर्न खेद व्यक्त गर्दछौं कि तपाईंको Elevare खाता अस्थायी रूपमा निलम्बित गरिएको छ।',
      suspensionType: suspensionType === 'temporary' ? 'अस्थायी निलम्बन' : 'स्थायी निलम्बन',
      reasonLabel: 'कारण',
      expiresLabel: 'निलम्बन अवधि',
      expiresUntil: 'तपाईंको खाता स्वचालित रूपमा पुनर्स्थापित हुनेछ',
      appealInfo: 'यदि तपाईंलाई लाग्छ कि यो कार्य गलत थियो भने, तपाईं समीक्षाको लागि अपील पेश गर्न सक्नुहुन्छ।',
      appealButton: 'अपील पेश गर्नुहोस्',
      permanentNote: 'यो स्थायी निलम्बन हो। तपाईं प्रशासनिक समीक्षाको लागि अपील पेश गर्न सक्नुहुन्छ।',
      guidelinesNote: 'कृपया हाम्रो नीतिहरू बुझ्न हाम्रो समुदाय दिशानिर्देशहरू समीक्षा गर्नुहोस्।',
      contactSupport: 'प्रश्नहरू? support@elevare.com मा हाम्रो समर्थन टोलीलाई सम्पर्क गर्नुहोस्',
      footer: 'यो Elevare बाट स्वचालित सूचना हो। कृपया यो इमेलको जवाफ नदिनुहोस्।'
    },
    ko: {
      subject: '중요: Elevare 계정 상태',
      title: '계정 정지',
      greeting: '안녕하세요',
      message: 'Elevare 계정이 일시적으로 정지되었음을 알려드립니다.',
      suspensionType: suspensionType === 'temporary' ? '임시 정지' : '영구 정지',
      reasonLabel: '사유',
      expiresLabel: '정지 기간',
      expiresUntil: '계정이 자동으로 복원됩니다',
      appealInfo: '이 조치가 잘못되었다고 생각하시면 검토를 위해 이의 신청을 제출할 수 있습니다.',
      appealButton: '이의 신청 제출',
      permanentNote: '이것은 영구 정지입니다. 관리자 검토를 위해 이의 신청을 제출할 수 있습니다.',
      guidelinesNote: '정책을 이해하려면 커뮤니티 가이드라인을 검토하세요.',
      contactSupport: '질문이 있으신가요? support@elevare.com으로 지원팀에 문의하세요',
      footer: '이것은 Elevare의 자동 알림입니다. 이 이메일에 회신하지 마세요.'
    }
  };

  const t = translations[locale] || translations['en'];
  const appealUrl = `${config.corsOrigin}/suspension-appeal`;

  const expiresHtml = expiresAt && suspensionType === 'temporary' ? `
    <tr>
      <td style="padding: 30px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%); border-radius: 12px; border-left: 4px solid #FFA726;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #E65100;">
                ${t.expiresLabel}
              </p>
              <p style="margin: 0; font-size: 16px; color: #E65100; font-weight: 500;">
                ${t.expiresUntil}:<br>
                <strong style="font-size: 18px;">${expiresAt.toLocaleString(locale === 'ne' ? 'ne-NP' : locale === 'ko' ? 'ko-KR' : 'en-US', { 
                  dateStyle: 'full', 
                  timeStyle: 'short' 
                })}</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  ` : `
    <tr>
      <td style="padding: 30px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%); border-radius: 12px; border-left: 4px solid #E53935;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0; font-size: 15px; color: #C62828; font-weight: 500;">
                ⚠️ ${t.permanentNote}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  const mailOptions = {
    from: config.email.from,
    to: email,
    subject: t.subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${t.subject}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F5F3EF;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F3EF; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); overflow: hidden;">
                
                <!-- Header with gradient -->
                <tr>
                  <td style="background: linear-gradient(135deg, #2D6A4F 0%, #52B788 100%); padding: 40px; text-align: center;">
                    <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                      Elevare
                    </h1>
                    <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 500;">
                      Educational Platform
                    </p>
                  </td>
                </tr>

                <!-- Alert Banner -->
                <tr>
                  <td style="background: linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%); padding: 20px 40px; border-bottom: 3px solid #E53935;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="40" valign="top">
                          <div style="width: 32px; height: 32px; background-color: #E53935; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: bold;">
                            !
                          </div>
                        </td>
                        <td valign="middle">
                          <h2 style="margin: 0; color: #C62828; font-size: 20px; font-weight: 700;">
                            ${t.title}
                          </h2>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 20px 0; font-size: 16px; color: #2C3E50; line-height: 1.6;">
                      ${t.greeting} <strong>${name}</strong>,
                    </p>
                    <p style="margin: 0 0 30px 0; font-size: 16px; color: #2C3E50; line-height: 1.6;">
                      ${t.message}
                    </p>

                    <!-- Reason Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%); border-radius: 12px; border-left: 4px solid #2D6A4F; margin-bottom: 30px;">
                      <tr>
                        <td style="padding: 24px;">
                          <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1B5E20; text-transform: uppercase; letter-spacing: 0.5px;">
                            ${t.reasonLabel}
                          </p>
                          <p style="margin: 0; font-size: 16px; color: #2C3E50; line-height: 1.6; font-weight: 500;">
                            ${reason}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                ${expiresHtml}

                <!-- Appeal Section -->
                <tr>
                  <td style="padding: 0 40px 40px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%); border-radius: 12px; padding: 24px;">
                      <tr>
                        <td>
                          <p style="margin: 0 0 20px 0; font-size: 15px; color: #1B5E20; line-height: 1.6;">
                            ${t.appealInfo}
                          </p>
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="border-radius: 8px; background: linear-gradient(135deg, #2D6A4F 0%, #52B788 100%); box-shadow: 0 4px 12px rgba(45, 106, 79, 0.3);">
                                <a href="${appealUrl}" style="display: inline-block; padding: 14px 32px; color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 15px; letter-spacing: 0.3px;">
                                  ${t.appealButton} →
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Guidelines Note -->
                <tr>
                  <td style="padding: 0 40px 40px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; border-radius: 8px; border: 1px solid #E0E0E0;">
                      <tr>
                        <td style="padding: 16px;">
                          <p style="margin: 0; font-size: 14px; color: #5F6368; line-height: 1.5;">
                            💡 ${t.guidelinesNote}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #F8F9FA; padding: 30px 40px; border-top: 1px solid #E0E0E0;">
                    <p style="margin: 0 0 12px 0; font-size: 14px; color: #5F6368; line-height: 1.5;">
                      ${t.contactSupport}
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #9E9E9E; line-height: 1.5;">
                      ${t.footer}
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
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
      subject: 'Great News: Your Elevare Account is Active',
      title: 'Account Reinstated',
      greeting: 'Hello',
      message: 'We\'re pleased to inform you that your Elevare account has been reinstated!',
      reasonLabel: 'Reinstatement Details',
      accessInfo: 'You now have full access to all Elevare features and can continue your learning journey.',
      loginButton: 'Access Your Account',
      guidelinesReminder: 'Please continue to follow our Community Guidelines to maintain a positive learning environment.',
      welcomeBack: 'Welcome back to Elevare!',
      contactSupport: 'Questions? Contact our support team at support@elevare.com',
      footer: 'This is an automated notification from Elevare. Please do not reply to this email.'
    },
    ne: {
      subject: 'शुभ समाचार: तपाईंको Elevare खाता सक्रिय छ',
      title: 'खाता पुनर्स्थापित',
      greeting: 'नमस्ते',
      message: 'हामी तपाईंलाई सूचित गर्न पाउँदा खुसी छौं कि तपाईंको Elevare खाता पुनर्स्थापित गरिएको छ!',
      reasonLabel: 'पुनर्स्थापना विवरण',
      accessInfo: 'तपाईंसँग अब सबै Elevare सुविधाहरूमा पूर्ण पहुँच छ र आफ्नो सिकाइ यात्रा जारी राख्न सक्नुहुन्छ।',
      loginButton: 'आफ्नो खाता पहुँच गर्नुहोस्',
      guidelinesReminder: 'कृपया सकारात्मक सिकाइ वातावरण कायम राख्न हाम्रो समुदाय दिशानिर्देशहरू पालना गर्न जारी राख्नुहोस्।',
      welcomeBack: 'Elevare मा फिर्ता स्वागत छ!',
      contactSupport: 'प्रश्नहरू? support@elevare.com मा हाम्रो समर्थन टोलीलाई सम्पर्क गर्नुहोस्',
      footer: 'यो Elevare बाट स्वचालित सूचना हो। कृपया यो इमेलको जवाफ नदिनुहोस्।'
    },
    ko: {
      subject: '좋은 소식: Elevare 계정이 활성화되었습니다',
      title: '계정 복원',
      greeting: '안녕하세요',
      message: 'Elevare 계정이 복원되었음을 알려드리게 되어 기쁩니다!',
      reasonLabel: '복원 세부정보',
      accessInfo: '이제 모든 Elevare 기능에 대한 전체 액세스 권한이 있으며 학습 여정을 계속할 수 있습니다.',
      loginButton: '계정 액세스',
      guidelinesReminder: '긍정적인 학습 환경을 유지하기 위해 커뮤니티 가이드라인을 계속 준수해 주세요.',
      welcomeBack: 'Elevare에 다시 오신 것을 환영합니다!',
      contactSupport: '질문이 있으신가요? support@elevare.com으로 지원팀에 문의하세요',
      footer: '이것은 Elevare의 자동 알림입니다. 이 이메일에 회신하지 마세요.'
    }
  };

  const t = translations[locale] || translations['en'];
  const loginUrl = `${config.corsOrigin}/login`;

  const mailOptions = {
    from: config.email.from,
    to: email,
    subject: t.subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${t.subject}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F5F3EF;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F3EF; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); overflow: hidden;">
                
                <!-- Header with gradient -->
                <tr>
                  <td style="background: linear-gradient(135deg, #2D6A4F 0%, #52B788 100%); padding: 40px; text-align: center;">
                    <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                      Elevare
                    </h1>
                    <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 500;">
                      Educational Platform
                    </p>
                  </td>
                </tr>

                <!-- Success Banner -->
                <tr>
                  <td style="background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%); padding: 20px 40px; border-bottom: 3px solid #2D6A4F;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="40" valign="top">
                          <div style="width: 32px; height: 32px; background-color: #2D6A4F; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: bold;">
                            ✓
                          </div>
                        </td>
                        <td valign="middle">
                          <h2 style="margin: 0; color: #1B5E20; font-size: 20px; font-weight: 700;">
                            ${t.title}
                          </h2>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 20px 0; font-size: 16px; color: #2C3E50; line-height: 1.6;">
                      ${t.greeting} <strong>${name}</strong>,
                    </p>
                    <p style="margin: 0 0 30px 0; font-size: 18px; color: #2D6A4F; line-height: 1.6; font-weight: 600;">
                      🎉 ${t.message}
                    </p>

                    <!-- Reason Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%); border-radius: 12px; border-left: 4px solid #2D6A4F; margin-bottom: 30px;">
                      <tr>
                        <td style="padding: 24px;">
                          <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1B5E20; text-transform: uppercase; letter-spacing: 0.5px;">
                            ${t.reasonLabel}
                          </p>
                          <p style="margin: 0; font-size: 16px; color: #2C3E50; line-height: 1.6; font-weight: 500;">
                            ${reason}
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Access Info -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%); border-radius: 12px; margin-bottom: 30px;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="margin: 0; font-size: 15px; color: #E65100; line-height: 1.6; font-weight: 500;">
                            ✨ ${t.accessInfo}
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Login Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="border-radius: 8px; background: linear-gradient(135deg, #2D6A4F 0%, #52B788 100%); box-shadow: 0 4px 12px rgba(45, 106, 79, 0.3);">
                                <a href="${loginUrl}" style="display: inline-block; padding: 16px 40px; color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 16px; letter-spacing: 0.3px;">
                                  ${t.loginButton} →
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Guidelines Reminder -->
                <tr>
                  <td style="padding: 0 40px 40px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFF8E1; border-radius: 8px; border: 1px solid #FFE082;">
                      <tr>
                        <td style="padding: 16px;">
                          <p style="margin: 0; font-size: 14px; color: #E65100; line-height: 1.5;">
                            💡 ${t.guidelinesReminder}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Welcome Back Message -->
                <tr>
                  <td style="padding: 0 40px 40px 40px; text-align: center;">
                    <p style="margin: 0; font-size: 20px; color: #2D6A4F; font-weight: 700;">
                      ${t.welcomeBack}
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #F8F9FA; padding: 30px 40px; border-top: 1px solid #E0E0E0;">
                    <p style="margin: 0 0 12px 0; font-size: 14px; color: #5F6368; line-height: 1.5;">
                      ${t.contactSupport}
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #9E9E9E; line-height: 1.5;">
                      ${t.footer}
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
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
