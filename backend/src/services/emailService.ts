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

/**
 * Send report submitted confirmation email
 */
export async function sendReportSubmittedEmail(
  email: string,
  name: string,
  contentType: string,
  reportId: string,
  locale: string = 'en'
): Promise<void> {
  const translations: Record<string, any> = {
    en: {
      subject: 'Report Received - We\'re on it!',
      title: 'Report Received',
      greeting: 'Hello',
      thankYou: 'Thank you for reporting content on Elevare. We take community safety seriously.',
      reportDetails: 'Report Details',
      contentTypeLabel: 'Content Type',
      reportIdLabel: 'Report ID',
      statusLabel: 'Status',
      statusValue: 'Pending Review',
      reviewTime: 'Our moderation team will review this report within 24-48 hours. You\'ll receive an email when there\'s an update.',
      helpingCommunity: 'Thank you for helping keep Elevare a safe learning environment!',
      footer: 'This is an automated notification from Elevare. Please do not reply to this email.'
    },
    ne: {
      subject: 'रिपोर्ट प्राप्त भयो - हामी यसमा काम गर्दैछौं!',
      title: 'रिपोर्ट प्राप्त भयो',
      greeting: 'नमस्ते',
      thankYou: 'Elevare मा सामग्री रिपोर्ट गर्नुभएकोमा धन्यवाद। हामी समुदाय सुरक्षालाई गम्भीरतापूर्वक लिन्छौं।',
      reportDetails: 'रिपोर्ट विवरण',
      contentTypeLabel: 'सामग्री प्रकार',
      reportIdLabel: 'रिपोर्ट ID',
      statusLabel: 'स्थिति',
      statusValue: 'समीक्षा पर्खिरहेको',
      reviewTime: 'हाम्रो मोडरेशन टोलीले 24-48 घण्टा भित्र यो रिपोर्ट समीक्षा गर्नेछ। अपडेट हुँदा तपाईंले इमेल प्राप्त गर्नुहुनेछ।',
      helpingCommunity: 'Elevare लाई सुरक्षित सिकाइ वातावरण राख्न मद्दत गर्नुभएकोमा धन्यवाद!',
      footer: 'यो Elevare बाट स्वचालित सूचना हो। कृपया यो इमेलको जवाफ नदिनुहोस्।'
    },
    ko: {
      subject: '신고 접수 완료 - 검토 중입니다!',
      title: '신고 접수됨',
      greeting: '안녕하세요',
      thankYou: 'Elevare에서 콘텐츠를 신고해 주셔서 감사합니다. 커뮤니티 안전을 매우 중요하게 생각합니다.',
      reportDetails: '신고 세부정보',
      contentTypeLabel: '콘텐츠 유형',
      reportIdLabel: '신고 ID',
      statusLabel: '상태',
      statusValue: '검토 대기 중',
      reviewTime: '중재 팀이 24-48시간 내에 이 신고를 검토할 것입니다. 업데이트가 있으면 이메일을 받으실 것입니다.',
      helpingCommunity: 'Elevare를 안전한 학습 환경으로 유지하는 데 도움을 주셔서 감사합니다!',
      footer: '이것은 Elevare의 자동 알림입니다. 이 이메일에 회신하지 마세요.'
    }
  };

  const contentTypeNames: Record<string, Record<string, string>> = {
    en: { resource: 'Resource', group: 'Study Group', message: 'Message', comment: 'Comment' },
    ne: { resource: 'स्रोत', group: 'अध्ययन समूह', message: 'सन्देश', comment: 'टिप्पणी' },
    ko: { resource: '리소스', group: '스터디 그룹', message: '메시지', comment: '댓글' }
  };

  const t = translations[locale] || translations['en'];
  const contentTypeName = contentTypeNames[locale]?.[contentType] || contentTypeNames['en'][contentType];

  const mailOptions = {
    from: config.email.from,
    to: email,
    subject: `${t.subject} (#${reportId.substring(0, 8)})`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F5F3EF;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F3EF; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); overflow: hidden;">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #2D6A4F 0%, #52B788 100%); padding: 40px; text-align: center;">
                    <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 700;">Elevare</h1>
                    <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Educational Platform</p>
                  </td>
                </tr>

                <!-- Success Banner -->
                <tr>
                  <td style="background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%); padding: 20px 40px; border-bottom: 3px solid #2D6A4F;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="40" valign="top">
                          <div style="width: 32px; height: 32px; background-color: #2D6A4F; border-radius: 50%; text-align: center; line-height: 32px; color: white; font-size: 20px; font-weight: bold;">✓</div>
                        </td>
                        <td valign="middle">
                          <h2 style="margin: 0; color: #1B5E20; font-size: 20px; font-weight: 700;">${t.title}</h2>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 20px 0; font-size: 16px; color: #2C3E50;">${t.greeting} <strong>${name}</strong>,</p>
                    <p style="margin: 0 0 30px 0; font-size: 16px; color: #2C3E50; line-height: 1.6;">${t.thankYou}</p>

                    <!-- Report Details Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%); border-radius: 12px; border-left: 4px solid #2D6A4F; margin-bottom: 30px;">
                      <tr>
                        <td style="padding: 24px;">
                          <p style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #1B5E20; text-transform: uppercase;">${t.reportDetails}</p>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 8px 0; font-size: 14px; color: #5F6368;">${t.contentTypeLabel}:</td>
                              <td style="padding: 8px 0; font-size: 14px; color: #2C3E50; font-weight: 600;">${contentTypeName}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; font-size: 14px; color: #5F6368;">${t.reportIdLabel}:</td>
                              <td style="padding: 8px 0; font-size: 14px; color: #2C3E50; font-weight: 600;">#${reportId.substring(0, 8)}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; font-size: 14px; color: #5F6368;">${t.statusLabel}:</td>
                              <td style="padding: 8px 0; font-size: 14px; color: #E65100; font-weight: 600;">${t.statusValue}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 20px 0; font-size: 15px; color: #2C3E50; line-height: 1.6;">${t.reviewTime}</p>
                    <p style="margin: 0; font-size: 16px; color: #2D6A4F; font-weight: 600;">🛡️ ${t.helpingCommunity}</p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #F8F9FA; padding: 30px 40px; border-top: 1px solid #E0E0E0;">
                    <p style="margin: 0; font-size: 12px; color: #9E9E9E; line-height: 1.5;">${t.footer}</p>
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
    logger.info('Report submitted email sent', { email, contentType, reportId, locale });
  } catch (error) {
    logger.error('Failed to send report submitted email', { email, contentType, reportId, locale, error });
    throw new Error('Failed to send report submitted email');
  }
}

/**
 * Send report under review notification email
 */
export async function sendReportUnderReviewEmail(
  email: string,
  name: string,
  contentType: string,
  reportId: string,
  locale: string = 'en'
): Promise<void> {
  const translations: Record<string, any> = {
    en: {
      subject: 'Your Report is Being Reviewed',
      title: 'Report Under Review',
      greeting: 'Hello',
      message: 'Your report is now being actively reviewed by our moderation team.',
      reportId: 'Report ID',
      contentType: 'Content Type',
      status: 'Status',
      statusValue: 'Under Review',
      investigating: 'Our team is carefully investigating the reported content to determine if it violates our Community Guidelines.',
      updates: 'You\'ll receive another email once the review is complete and action has been taken.',
      thankYou: 'Thank you for your patience and for helping maintain a safe community.',
      footer: 'This is an automated notification from Elevare. Please do not reply to this email.'
    },
    ne: {
      subject: 'तपाईंको रिपोर्ट समीक्षा भइरहेको छ',
      title: 'रिपोर्ट समीक्षाधीन',
      greeting: 'नमस्ते',
      message: 'तपाईंको रिपोर्ट अहिले हाम्रो मोडरेशन टोलीद्वारा सक्रिय रूपमा समीक्षा भइरहेको छ।',
      reportId: 'रिपोर्ट ID',
      contentType: 'सामग्री प्रकार',
      status: 'स्थिति',
      statusValue: 'समीक्षाधीन',
      investigating: 'हाम्रो टोलीले रिपोर्ट गरिएको सामग्रीले हाम्रो समुदाय दिशानिर्देश उल्लङ्घन गर्छ कि गर्दैन भनेर निर्धारण गर्न सावधानीपूर्वक अनुसन्धान गरिरहेको छ।',
      updates: 'समीक्षा पूरा भएपछि र कारबाही गरिसकेपछि तपाईंले अर्को इमेल प्राप्त गर्नुहुनेछ।',
      thankYou: 'तपाईंको धैर्यताको लागि र सुरक्षित समुदाय कायम राख्न मद्दत गर्नुभएकोमा धन्यवाद।',
      footer: 'यो Elevare बाट स्वचालित सूचना हो। कृपया यो इमेलको जवाफ नदिनुहोस्।'
    },
    ko: {
      subject: '신고가 검토 중입니다',
      title: '신고 검토 중',
      greeting: '안녕하세요',
      message: '귀하의 신고가 현재 중재 팀에서 적극적으로 검토되고 있습니다.',
      reportId: '신고 ID',
      contentType: '콘텐츠 유형',
      status: '상태',
      statusValue: '검토 중',
      investigating: '우리 팀은 신고된 콘텐츠가 커뮤니티 가이드라인을 위반하는지 확인하기 위해 신중하게 조사하고 있습니다.',
      updates: '검토가 완료되고 조치가 취해지면 다시 이메일을 받으실 것입니다.',
      thankYou: '인내심을 가져주시고 안전한 커뮤니티를 유지하는 데 도움을 주셔서 감사합니다.',
      footer: '이것은 Elevare의 자동 알림입니다. 이 이메일에 회신하지 마세요.'
    }
  };

  const contentTypeNames: Record<string, Record<string, string>> = {
    en: { resource: 'Resource', group: 'Study Group', message: 'Message', comment: 'Comment' },
    ne: { resource: 'स्रोत', group: 'अध्ययन समूह', message: 'सन्देश', comment: 'टिप्पणी' },
    ko: { resource: '리소스', group: '스터디 그룹', message: '메시지', comment: '댓글' }
  };

  const t = translations[locale] || translations['en'];
  const contentTypeName = contentTypeNames[locale]?.[contentType] || contentTypeNames['en'][contentType];

  const mailOptions = {
    from: config.email.from,
    to: email,
    subject: `${t.subject} (#${reportId.substring(0, 8)})`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F5F3EF;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F3EF; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); overflow: hidden;">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #2D6A4F 0%, #52B788 100%); padding: 40px; text-align: center;">
                    <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 700;">Elevare</h1>
                    <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Educational Platform</p>
                  </td>
                </tr>

                <!-- Status Banner -->
                <tr>
                  <td style="background: linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%); padding: 20px 40px; border-bottom: 3px solid #FFA726;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="40" valign="top">
                          <div style="width: 32px; height: 32px; background-color: #FFA726; border-radius: 50%; text-align: center; line-height: 32px; color: white; font-size: 20px;">⏳</div>
                        </td>
                        <td valign="middle">
                          <h2 style="margin: 0; color: #E65100; font-size: 20px; font-weight: 700;">${t.title}</h2>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 20px 0; font-size: 16px; color: #2C3E50;">${t.greeting} <strong>${name}</strong>,</p>
                    <p style="margin: 0 0 30px 0; font-size: 16px; color: #2C3E50; line-height: 1.6;">${t.message}</p>

                    <!-- Report Info -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: #F8F9FA; border-radius: 8px; margin-bottom: 30px;">
                      <tr>
                        <td style="padding: 20px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 8px 0; font-size: 14px; color: #5F6368;">${t.reportId}:</td>
                              <td style="padding: 8px 0; font-size: 14px; color: #2C3E50; font-weight: 600;">#${reportId.substring(0, 8)}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; font-size: 14px; color: #5F6368;">${t.contentType}:</td>
                              <td style="padding: 8px 0; font-size: 14px; color: #2C3E50; font-weight: 600;">${contentTypeName}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; font-size: 14px; color: #5F6368;">${t.status}:</td>
                              <td style="padding: 8px 0; font-size: 14px; color: #FFA726; font-weight: 600;">${t.statusValue}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 20px 0; font-size: 15px; color: #2C3E50; line-height: 1.6;">${t.investigating}</p>
                    <p style="margin: 0 0 20px 0; font-size: 15px; color: #2C3E50; line-height: 1.6;">${t.updates}</p>
                    <p style="margin: 0; font-size: 16px; color: #2D6A4F; font-weight: 600;">${t.thankYou}</p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #F8F9FA; padding: 30px 40px; border-top: 1px solid #E0E0E0;">
                    <p style="margin: 0; font-size: 12px; color: #9E9E9E; line-height: 1.5;">${t.footer}</p>
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
    logger.info('Report under review email sent', { email, contentType, reportId, locale });
  } catch (error) {
    logger.error('Failed to send report under review email', { email, contentType, reportId, locale, error });
    throw new Error('Failed to send report under review email');
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

  async sendReportSubmittedEmail(
    email: string,
    name: string,
    contentType: string,
    reportId: string,
    locale: string = 'en'
  ): Promise<void> {
    return sendReportSubmittedEmail(email, name, contentType, reportId, locale);
  }

  async sendReportUnderReviewEmail(
    email: string,
    name: string,
    contentType: string,
    reportId: string,
    locale: string = 'en'
  ): Promise<void> {
    return sendReportUnderReviewEmail(email, name, contentType, reportId, locale);
  }

  async sendReportResolvedEmail(
    email: string,
    name: string,
    contentType: string,
    reportId: string,
    actionTaken: string,
    locale: string = 'en'
  ): Promise<void> {
    return sendReportResolvedEmail(email, name, contentType, reportId, actionTaken, locale);
  }

  async sendReportDismissedEmail(
    email: string,
    name: string,
    contentType: string,
    reportId: string,
    reason: string,
    locale: string = 'en'
  ): Promise<void> {
    return sendReportDismissedEmail(email, name, contentType, reportId, reason, locale);
  }
}

/**
 * Send report resolved notification email
 */
export async function sendReportResolvedEmail(
  email: string,
  name: string,
  contentType: string,
  reportId: string,
  actionTaken: string,
  locale: string = 'en'
): Promise<void> {
  const translations: Record<string, any> = {
    en: {
      subject: 'Your Report Has Been Resolved',
      title: 'Report Resolved',
      greeting: 'Hello',
      message: 'Your report has been reviewed and resolved by our moderation team.',
      reportId: 'Report ID',
      contentType: 'Content Type',
      status: 'Status',
      statusValue: 'Resolved',
      actionTaken: 'Action Taken',
      thankYou: 'Thank you for your vigilance in keeping Elevare safe. Your contribution helps maintain a positive learning environment for everyone.',
      helpingCommunity: 'Together, we build a better community!',
      footer: 'This is an automated notification from Elevare. Please do not reply to this email.'
    },
    ne: {
      subject: 'तपाईंको रिपोर्ट समाधान भयो',
      title: 'रिपोर्ट समाधान भयो',
      greeting: 'नमस्ते',
      message: 'तपाईंको रिपोर्ट हाम्रो मोडरेशन टोलीद्वारा समीक्षा र समाधान गरिएको छ।',
      reportId: 'रिपोर्ट ID',
      contentType: 'सामग्री प्रकार',
      status: 'स्थिति',
      statusValue: 'समाधान भयो',
      actionTaken: 'गरिएको कारबाही',
      thankYou: 'Elevare लाई सुरक्षित राख्नमा तपाईंको सतर्कताको लागि धन्यवाद। तपाईंको योगदानले सबैका लागि सकारात्मक सिकाइ वातावरण कायम राख्न मद्दत गर्छ।',
      helpingCommunity: 'सँगै, हामी राम्रो समुदाय निर्माण गर्छौं!',
      footer: 'यो Elevare बाट स्वचालित सूचना हो। कृपया यो इमेलको जवाफ नदिनुहोस्।'
    },
    ko: {
      subject: '신고가 해결되었습니다',
      title: '신고 해결됨',
      greeting: '안녕하세요',
      message: '귀하의 신고가 중재 팀에서 검토되어 해결되었습니다.',
      reportId: '신고 ID',
      contentType: '콘텐츠 유형',
      status: '상태',
      statusValue: '해결됨',
      actionTaken: '취해진 조치',
      thankYou: 'Elevare를 안전하게 유지하는 데 대한 귀하의 경계심에 감사드립니다. 귀하의 기여는 모두를 위한 긍정적인 학습 환경을 유지하는 데 도움이 됩니다.',
      helpingCommunity: '함께 더 나은 커뮤니티를 만듭니다!',
      footer: '이것은 Elevare의 자동 알림입니다. 이 이메일에 회신하지 마세요.'
    }
  };

  const contentTypeNames: Record<string, Record<string, string>> = {
    en: { resource: 'Resource', group: 'Study Group', message: 'Message', comment: 'Comment' },
    ne: { resource: 'स्रोत', group: 'अध्ययन समूह', message: 'सन्देश', comment: 'टिप्पणी' },
    ko: { resource: '리소스', group: '스터디 그룹', message: '메시지', comment: '댓글' }
  };

  const actionNames: Record<string, Record<string, string>> = {
    en: {
      delete_content: 'Content removed',
      warn_user: 'User warned',
      suspend_user: 'User suspended',
      ban: 'User banned',
      resolve: 'Violation confirmed'
    },
    ne: {
      delete_content: 'सामग्री हटाइयो',
      warn_user: 'प्रयोगकर्तालाई चेतावनी दिइयो',
      suspend_user: 'प्रयोगकर्ता निलम्बित',
      ban: 'प्रयोगकर्ता प्रतिबन्धित',
      resolve: 'उल्लङ्घन पुष्टि भयो'
    },
    ko: {
      delete_content: '콘텐츠 삭제됨',
      warn_user: '사용자 경고됨',
      suspend_user: '사용자 정지됨',
      ban: '사용자 차단됨',
      resolve: '위반 확인됨'
    }
  };

  const t = translations[locale] || translations['en'];
  const contentTypeName = contentTypeNames[locale]?.[contentType] || contentTypeNames['en'][contentType];
  const actionName = actionNames[locale]?.[actionTaken] || actionTaken;

  const mailOptions = {
    from: config.email.from,
    to: email,
    subject: `${t.subject} (#${reportId.substring(0, 8)})`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F5F3EF;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F3EF; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); overflow: hidden;">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #2D6A4F 0%, #52B788 100%); padding: 40px; text-align: center;">
                    <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 700;">Elevare</h1>
                    <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Educational Platform</p>
                  </td>
                </tr>

                <!-- Success Banner -->
                <tr>
                  <td style="background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%); padding: 20px 40px; border-bottom: 3px solid #2D6A4F;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="40" valign="top">
                          <div style="width: 32px; height: 32px; background-color: #2D6A4F; border-radius: 50%; text-align: center; line-height: 32px; color: white; font-size: 20px; font-weight: bold;">✓</div>
                        </td>
                        <td valign="middle">
                          <h2 style="margin: 0; color: #1B5E20; font-size: 20px; font-weight: 700;">${t.title}</h2>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 20px 0; font-size: 16px; color: #2C3E50;">${t.greeting} <strong>${name}</strong>,</p>
                    <p style="margin: 0 0 30px 0; font-size: 16px; color: #2C3E50; line-height: 1.6;">${t.message}</p>

                    <!-- Report Details -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%); border-radius: 12px; border-left: 4px solid #2D6A4F; margin-bottom: 30px;">
                      <tr>
                        <td style="padding: 24px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 8px 0; font-size: 14px; color: #1B5E20;">${t.reportId}:</td>
                              <td style="padding: 8px 0; font-size: 14px; color: #2C3E50; font-weight: 600;">#${reportId.substring(0, 8)}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; font-size: 14px; color: #1B5E20;">${t.contentType}:</td>
                              <td style="padding: 8px 0; font-size: 14px; color: #2C3E50; font-weight: 600;">${contentTypeName}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; font-size: 14px; color: #1B5E20;">${t.status}:</td>
                              <td style="padding: 8px 0; font-size: 14px; color: #2D6A4F; font-weight: 600;">${t.statusValue}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; font-size: 14px; color: #1B5E20;">${t.actionTaken}:</td>
                              <td style="padding: 8px 0; font-size: 14px; color: #2C3E50; font-weight: 600;">${actionName}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 20px 0; font-size: 15px; color: #2C3E50; line-height: 1.6;">${t.thankYou}</p>
                    <p style="margin: 0; font-size: 18px; color: #2D6A4F; font-weight: 600; text-align: center;">🛡️ ${t.helpingCommunity}</p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #F8F9FA; padding: 30px 40px; border-top: 1px solid #E0E0E0;">
                    <p style="margin: 0; font-size: 12px; color: #9E9E9E; line-height: 1.5;">${t.footer}</p>
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
    logger.info('Report resolved email sent', { email, contentType, reportId, actionTaken, locale });
  } catch (error) {
    logger.error('Failed to send report resolved email', { email, contentType, reportId, actionTaken, locale, error });
    throw new Error('Failed to send report resolved email');
  }
}

/**
 * Send report dismissed notification email
 */
export async function sendReportDismissedEmail(
  email: string,
  name: string,
  contentType: string,
  reportId: string,
  _reason: string,
  locale: string = 'en'
): Promise<void> {
  const translations: Record<string, any> = {
    en: {
      subject: 'Your Report Has Been Reviewed',
      title: 'Report Reviewed',
      greeting: 'Hello',
      message: 'Your report has been carefully reviewed by our moderation team.',
      reportId: 'Report ID',
      contentType: 'Content Type',
      status: 'Status',
      statusValue: 'No Violation Found',
      outcome: 'Outcome',
      outcomeMessage: 'After thorough review, we determined that the reported content does not violate our Community Guidelines.',
      thankYou: 'We appreciate your vigilance and commitment to keeping Elevare safe. Please continue to report any content that concerns you.',
      guidelines: 'If you have questions about our Community Guidelines, please visit our Help Center.',
      footer: 'This is an automated notification from Elevare. Please do not reply to this email.'
    },
    ne: {
      subject: 'तपाईंको रिपोर्ट समीक्षा गरिएको छ',
      title: 'रिपोर्ट समीक्षा गरियो',
      greeting: 'नमस्ते',
      message: 'तपाईंको रिपोर्ट हाम्रो मोडरेशन टोलीद्वारा सावधानीपूर्वक समीक्षा गरिएको छ।',
      reportId: 'रिपोर्ट ID',
      contentType: 'सामग्री प्रकार',
      status: 'स्थिति',
      statusValue: 'कुनै उल्लङ्घन फेला परेन',
      outcome: 'परिणाम',
      outcomeMessage: 'पूर्ण समीक्षा पछि, हामीले निर्धारण गर्यौं कि रिपोर्ट गरिएको सामग्रीले हाम्रो समुदाय दिशानिर्देश उल्लङ्घन गर्दैन।',
      thankYou: 'हामी तपाईंको सतर्कता र Elevare लाई सुरक्षित राख्ने प्रतिबद्धताको कदर गर्छौं। कृपया तपाईंलाई चिन्ता लाग्ने कुनै पनि सामग्री रिपोर्ट गर्न जारी राख्नुहोस्।',
      guidelines: 'यदि तपाईंसँग हाम्रो समुदाय दिशानिर्देशहरूको बारेमा प्रश्नहरू छन् भने, कृपया हाम्रो सहायता केन्द्र भ्रमण गर्नुहोस्।',
      footer: 'यो Elevare बाट स्वचालित सूचना हो। कृपया यो इमेलको जवाफ नदिनुहोस्।'
    },
    ko: {
      subject: '신고가 검토되었습니다',
      title: '신고 검토됨',
      greeting: '안녕하세요',
      message: '귀하의 신고가 중재 팀에서 신중하게 검토되었습니다.',
      reportId: '신고 ID',
      contentType: '콘텐츠 유형',
      status: '상태',
      statusValue: '위반 사항 없음',
      outcome: '결과',
      outcomeMessage: '철저한 검토 후, 신고된 콘텐츠가 커뮤니티 가이드라인을 위반하지 않는다고 판단했습니다.',
      thankYou: 'Elevare를 안전하게 유지하려는 귀하의 경계심과 헌신에 감사드립니다. 우려되는 콘텐츠가 있으면 계속 신고해 주세요.',
      guidelines: '커뮤니티 가이드라인에 대한 질문이 있으시면 도움말 센터를 방문하세요.',
      footer: '이것은 Elevare의 자동 알림입니다. 이 이메일에 회신하지 마세요.'
    }
  };

  const contentTypeNames: Record<string, Record<string, string>> = {
    en: { resource: 'Resource', group: 'Study Group', message: 'Message', comment: 'Comment' },
    ne: { resource: 'स्रोत', group: 'अध्ययन समूह', message: 'सन्देश', comment: 'टिप्पणी' },
    ko: { resource: '리소스', group: '스터디 그룹', message: '메시지', comment: '댓글' }
  };

  const t = translations[locale] || translations['en'];
  const contentTypeName = contentTypeNames[locale]?.[contentType] || contentTypeNames['en'][contentType];

  const mailOptions = {
    from: config.email.from,
    to: email,
    subject: `${t.subject} (#${reportId.substring(0, 8)})`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F5F3EF;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F3EF; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); overflow: hidden;">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #2D6A4F 0%, #52B788 100%); padding: 40px; text-align: center;">
                    <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 700;">Elevare</h1>
                    <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Educational Platform</p>
                  </td>
                </tr>

                <!-- Info Banner -->
                <tr>
                  <td style="background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%); padding: 20px 40px; border-bottom: 3px solid #1976D2;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="40" valign="top">
                          <div style="width: 32px; height: 32px; background-color: #1976D2; border-radius: 50%; text-align: center; line-height: 32px; color: white; font-size: 20px;">ℹ</div>
                        </td>
                        <td valign="middle">
                          <h2 style="margin: 0; color: #0D47A1; font-size: 20px; font-weight: 700;">${t.title}</h2>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 20px 0; font-size: 16px; color: #2C3E50;">${t.greeting} <strong>${name}</strong>,</p>
                    <p style="margin: 0 0 30px 0; font-size: 16px; color: #2C3E50; line-height: 1.6;">${t.message}</p>

                    <!-- Report Details -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: #F8F9FA; border-radius: 8px; margin-bottom: 30px;">
                      <tr>
                        <td style="padding: 20px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 8px 0; font-size: 14px; color: #5F6368;">${t.reportId}:</td>
                              <td style="padding: 8px 0; font-size: 14px; color: #2C3E50; font-weight: 600;">#${reportId.substring(0, 8)}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; font-size: 14px; color: #5F6368;">${t.contentType}:</td>
                              <td style="padding: 8px 0; font-size: 14px; color: #2C3E50; font-weight: 600;">${contentTypeName}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; font-size: 14px; color: #5F6368;">${t.status}:</td>
                              <td style="padding: 8px 0; font-size: 14px; color: #1976D2; font-weight: 600;">${t.statusValue}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Outcome Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%); border-radius: 12px; border-left: 4px solid #1976D2; margin-bottom: 30px;">
                      <tr>
                        <td style="padding: 24px;">
                          <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #0D47A1; text-transform: uppercase;">${t.outcome}</p>
                          <p style="margin: 0; font-size: 15px; color: #2C3E50; line-height: 1.6;">${t.outcomeMessage}</p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 20px 0; font-size: 15px; color: #2C3E50; line-height: 1.6;">${t.thankYou}</p>
                    <p style="margin: 0; font-size: 14px; color: #5F6368; line-height: 1.6;">💡 ${t.guidelines}</p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #F8F9FA; padding: 30px 40px; border-top: 1px solid #E0E0E0;">
                    <p style="margin: 0; font-size: 12px; color: #9E9E9E; line-height: 1.5;">${t.footer}</p>
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
    logger.info('Report dismissed email sent', { email, contentType, reportId, locale });
  } catch (error) {
    logger.error('Failed to send report dismissed email', { email, contentType, reportId, locale, error });
    throw new Error('Failed to send report dismissed email');
  }
}

/**
 * Send admin notification email for new abuse report
 */
export async function sendAdminReportNotificationEmail(
  email: string,
  name: string,
  contentType: string,
  reason: string,
  reportId: string
): Promise<void> {
  const contentTypeNames: Record<string, string> = {
    resource: 'Resource',
    study_group: 'Study Group',
    message: 'Message',
    comment: 'Comment',
    note: 'Note',
    file: 'File',
    whiteboard: 'Whiteboard',
    profile: 'Profile'
  };

  const reasonNames: Record<string, string> = {
    spam: 'Spam',
    harassment: 'Harassment',
    inappropriate_content: 'Inappropriate Content',
    copyright_violation: 'Copyright Violation',
    hate_speech: 'Hate Speech',
    violence: 'Violence',
    other: 'Other'
  };

  const contentTypeName = contentTypeNames[contentType] || contentType;
  const reasonName = reasonNames[reason] || reason;
  const reviewUrl = `${config.corsOrigin}/admin/moderation/reports/${reportId}`;

  const mailOptions = {
    from: config.email.from,
    to: email,
    subject: `[Admin Alert] New Abuse Report - ${contentTypeName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F5F3EF;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F3EF; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); overflow: hidden;">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #2D6A4F 0%, #52B788 100%); padding: 40px; text-align: center;">
                    <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 700;">Elevare Admin</h1>
                    <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Moderation Alert</p>
                  </td>
                </tr>

                <!-- Alert Banner -->
                <tr>
                  <td style="background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%); padding: 20px 40px; border-bottom: 3px solid #FF9800;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="40" valign="top">
                          <div style="width: 32px; height: 32px; background-color: #FF9800; border-radius: 50%; text-align: center; line-height: 32px; color: white; font-size: 20px; font-weight: bold;">!</div>
                        </td>
                        <td valign="middle">
                          <h2 style="margin: 0; color: #E65100; font-size: 20px; font-weight: 700;">New Abuse Report</h2>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 20px 0; font-size: 16px; color: #2C3E50;">Hello <strong>${name}</strong>,</p>
                    <p style="margin: 0 0 30px 0; font-size: 16px; color: #2C3E50; line-height: 1.6;">
                      A new abuse report has been submitted and requires moderation review.
                    </p>

                    <!-- Report Details -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%); border-radius: 12px; border-left: 4px solid #FF9800; margin-bottom: 30px;">
                      <tr>
                        <td style="padding: 24px;">
                          <p style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #E65100; text-transform: uppercase;">Report Details</p>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 8px 0; font-size: 14px; color: #5F6368;">Report ID:</td>
                              <td style="padding: 8px 0; font-size: 14px; color: #2C3E50; font-weight: 600;">#${reportId.substring(0, 8)}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; font-size: 14px; color: #5F6368;">Content Type:</td>
                              <td style="padding: 8px 0; font-size: 14px; color: #2C3E50; font-weight: 600;">${contentTypeName}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; font-size: 14px; color: #5F6368;">Reason:</td>
                              <td style="padding: 8px 0; font-size: 14px; color: #2C3E50; font-weight: 600;">${reasonName}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; font-size: 14px; color: #5F6368;">Status:</td>
                              <td style="padding: 8px 0; font-size: 14px; color: #FF9800; font-weight: 600;">Pending Review</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Action Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="border-radius: 8px; background: linear-gradient(135deg, #2D6A4F 0%, #52B788 100%); box-shadow: 0 4px 12px rgba(45, 106, 79, 0.3);">
                                <a href="${reviewUrl}" style="display: inline-block; padding: 16px 40px; color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 16px; letter-spacing: 0.3px;">
                                  Review Report →
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 30px 0 0 0; font-size: 14px; color: #5F6368; line-height: 1.6;">
                      Please review this report as soon as possible to maintain community safety and trust.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #F8F9FA; padding: 30px 40px; border-top: 1px solid #E0E0E0;">
                    <p style="margin: 0; font-size: 12px; color: #9E9E9E; line-height: 1.5;">
                      This is an automated notification from Elevare Admin Dashboard. Please do not reply to this email.
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
    logger.info('Admin report notification email sent', { email, contentType, reportId, reason });
  } catch (error) {
    logger.error('Failed to send admin report notification email', { email, contentType, reportId, reason, error });
    throw new Error('Failed to send admin report notification email');
  }
}
