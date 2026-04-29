import sgMail from '@sendgrid/mail';
import config from '../config';
import logger from '../utils/logger';

// Initialize SendGrid with API key from SMTP_PASSWORD env var
// (We reuse SMTP_PASSWORD to avoid changing environment variables)
sgMail.setApiKey(config.email.password);

// Enterprise Email Template Base
const getEmailTemplate = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #FFFFFF; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
          ${content}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const getHeader = (icon: string = '🎓') => `
<!-- Header -->
<tr>
  <td style="background: linear-gradient(180deg, #2D6A4F 0%, #3d7a5f 100%); padding: 60px 40px; text-align: center;">
    <div style="background: rgba(255, 255, 255, 0.15); width: 64px; height: 64px; border-radius: 12px; margin: 0 auto 24px; display: inline-flex; align-items: center; justify-content: center;">
      <span style="font-size: 32px; line-height: 64px;">${icon}</span>
    </div>
    <h1 style="margin: 0; color: #FFFFFF; font-size: 36px; font-weight: 400; font-family: Georgia, 'Times New Roman', serif; letter-spacing: 0.5px;">
      Elevare
    </h1>
    <p style="margin: 12px 0 0 0; color: rgba(255, 255, 255, 0.85); font-size: 13px; font-weight: 400; letter-spacing: 2px; text-transform: uppercase;">
      Collaborative Education System
    </p>
  </td>
</tr>
`;

const getFooter = () => `
<!-- Footer -->
<tr>
  <td style="background-color: #fafafa; padding: 40px 60px; border-top: 1px solid #e5e5e5;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding-bottom: 20px;">
          <p style="margin: 0 0 4px 0; color: #1a1a1a; font-size: 14px; font-weight: 600;">
            Need assistance?
          </p>
          <p style="margin: 0; color: #666666; font-size: 13px; line-height: 1.6;">
            Our enterprise support team is available 24/7.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding-bottom: 20px;">
          <a href="${config.corsOrigin}/help" style="color: #2D6A4F; text-decoration: none; font-size: 13px; margin-right: 20px;">Help Center</a>
          <span style="color: #cccccc;">|</span>
          <a href="mailto:support@elevare.com" style="color: #2D6A4F; text-decoration: none; font-size: 13px; margin-left: 20px;">Contact Support</a>
        </td>
      </tr>
      <tr>
        <td style="padding-top: 20px; border-top: 1px solid #e5e5e5;">
          <p style="margin: 0 0 8px 0; color: #999999; font-size: 11px; line-height: 1.6;">
            © ${new Date().getFullYear()} ELEVARE INC. ALL RIGHTS RESERVED.
          </p>
          <p style="margin: 0; color: #999999; font-size: 11px;">
            <a href="${config.corsOrigin}/privacy" style="color: #999999; text-decoration: none;">Privacy Policy</a>
            <span style="margin: 0 8px;">•</span>
            <a href="${config.corsOrigin}/terms" style="color: #999999; text-decoration: none;">Terms of Service</a>
          </p>
        </td>
      </tr>
    </table>
  </td>
</tr>
`;

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
      subject: 'Verify your Elevare account',
      title: 'Verify your identity',
      welcome: `Welcome to the Elevare professional network, <strong style="color: #1a1a1a;">${name}</strong>. To finalize your account setup and access your organization's dashboard, please enter the verification code below.`,
      codeLabel: 'Verification Code',
      expiresIn: 'This code will expire in 10 minutes.',
      securityNotice: '<strong>Security Notice:</strong> This code is confidential. Never share it with anyone.',
      disclaimer: 'If you did not request this verification, please ignore this email or contact security@elevare.edu.'
    },
    ne: {
      subject: 'तपाईंको Elevare खाता प्रमाणित गर्नुहोस्',
      title: 'तपाईंको पहिचान प्रमाणित गर्नुहोस्',
      welcome: `Elevare व्यावसायिक नेटवर्कमा स्वागत छ, <strong style="color: #1a1a1a;">${name}</strong>। आफ्नो खाता सेटअप अन्तिम रूप दिन र आफ्नो संगठनको ड्यासबोर्ड पहुँच गर्न, कृपया तलको प्रमाणीकरण कोड प्रविष्ट गर्नुहोस्।`,
      codeLabel: 'प्रमाणीकरण कोड',
      expiresIn: 'यो कोड 10 मिनेटमा समाप्त हुनेछ।',
      securityNotice: '<strong>सुरक्षा सूचना:</strong> यो कोड गोप्य छ। यसलाई कसैसँग साझा नगर्नुहोस्। Elevare ले तपाईंको प्रमाणीकरण कोड इमेल, फोन, वा अन्य कुनै माध्यमबाट कहिल्यै सोध्दैन।',
      disclaimer: 'यदि तपाईंले यो प्रमाणीकरण अनुरोध गर्नुभएको छैन भने, कृपया यो इमेललाई बेवास्ता गर्नुहोस् वा security@elevare.edu मा सम्पर्क गर्नुहोस्।'
    },
    ko: {
      subject: 'Elevare 계정 인증',
      title: '신원 확인',
      welcome: `Elevare 전문 네트워크에 오신 것을 환영합니다, <strong style="color: #1a1a1a;">${name}</strong>님. 계정 설정을 완료하고 조직의 대시보드에 액세스하려면 아래 인증 코드를 입력하세요.`,
      codeLabel: '인증 코드',
      expiresIn: '이 코드는 10분 후에 만료됩니다.',
      securityNotice: '<strong>보안 알림:</strong> 이 코드는 기밀입니다. 누구와도 공유하지 마세요. Elevare는 이메일, 전화 또는 기타 방법으로 인증 코드를 요청하지 않습니다.',
      disclaimer: '이 인증을 요청하지 않으셨다면 이 이메일을 무시하거나 security@elevare.edu로 문의하세요.'
    }
  };

  const t = translations[locale] || translations['en'];

  const content = `
    ${getHeader()}
    
    <!-- Main Content -->
    <tr>
      <td style="padding: 60px 60px 40px 60px;">
        <h2 style="margin: 0 0 24px 0; color: #1a1a1a; font-size: 28px; font-weight: 400; font-family: Georgia, 'Times New Roman', serif; text-align: center; line-height: 1.3;">
          ${t.title}
        </h2>
        <p style="margin: 0 0 40px 0; color: #666666; font-size: 15px; line-height: 1.7; text-align: center;">
          ${t.welcome}
        </p>

        <!-- OTP Code -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9f9f9; border-radius: 4px; margin-bottom: 32px;">
          <tr>
            <td style="padding: 40px; text-align: center;">
              <p style="margin: 0 0 16px 0; color: #999999; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                ${t.codeLabel}
              </p>
              <div style="margin: 0 0 16px 0;">
                <span style="color: #2D6A4F; font-size: 42px; font-weight: 700; letter-spacing: 16px; font-family: 'Courier New', monospace;">
                  ${otpCode}
                </span>
              </div>
              <p style="margin: 0; color: #DC2626; font-size: 13px; font-weight: 500;">
                ${t.expiresIn}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Security Notice -->
    <tr>
      <td style="padding: 0 60px 60px 60px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFF9E6; border-left: 3px solid #F59E0B; border-radius: 4px;">
          <tr>
            <td style="padding: 20px 24px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right: 12px; vertical-align: top;">
                    <div style="width: 20px; height: 20px; background-color: #F59E0B; border-radius: 50%; text-align: center; line-height: 20px; color: white; font-size: 12px; font-weight: bold;">!</div>
                  </td>
                  <td>
                    <p style="margin: 0; color: #92400E; font-size: 13px; line-height: 1.6;">
                      ${t.securityNotice}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${getFooter()}
  `;

  const msg = {
    to: email,
    from: config.email.from,
    subject: t.subject,
    html: getEmailTemplate(content),
  };

  try {
    await sgMail.send(msg);
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

  const content = `
    ${getHeader()}
    
    <!-- Main Content -->
    <tr>
      <td style="padding: 60px 60px 40px 60px;">
        <h2 style="margin: 0 0 24px 0; color: #1a1a1a; font-size: 28px; font-weight: 400; font-family: Georgia, 'Times New Roman', serif; text-align: center; line-height: 1.3;">
          Verify your identity
        </h2>
        <p style="margin: 0 0 32px 0; color: #666666; font-size: 15px; line-height: 1.7; text-align: center;">
          Welcome to the Elevare professional network, <strong style="color: #1a1a1a;">${name}</strong>. To finalize your account setup and access your organization's dashboard, please verify your email address.
        </p>

        <!-- CTA Button -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #2D6A4F; border-radius: 4px;">
                    <a href="${verificationUrl}" style="display: inline-block; padding: 16px 40px; color: #FFFFFF; text-decoration: none; font-weight: 500; font-size: 15px; letter-spacing: 0.3px;">
                      Confirm Email Address →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Security Fallback -->
    <tr>
      <td style="padding: 0 60px 40px 60px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9f9f9; border-radius: 4px;">
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 8px 0; color: #999999; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                Security Fallback
              </p>
              <p style="margin: 0 0 12px 0; color: #666666; font-size: 13px; line-height: 1.6;">
                If the button above does not work, please copy and paste the following URL into your browser:
              </p>
              <p style="margin: 0; word-break: break-all; color: #2D6A4F; font-size: 12px; font-family: 'Courier New', monospace; line-height: 1.6;">
                ${verificationUrl}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Security Notice -->
    <tr>
      <td style="padding: 0 60px 60px 60px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFF9E6; border-left: 3px solid #F59E0B; border-radius: 4px;">
          <tr>
            <td style="padding: 20px 24px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right: 12px; vertical-align: top;">
                    <div style="width: 20px; height: 20px; background-color: #F59E0B; border-radius: 50%; text-align: center; line-height: 20px; color: white; font-size: 12px; font-weight: bold;">!</div>
                  </td>
                  <td>
                    <p style="margin: 0; color: #92400E; font-size: 13px; line-height: 1.6;">
                      <strong>Security Notice:</strong> This link will expire in 24 hours. If you did not request this account creation, please ignore this email or contact security@elevare.edu.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${getFooter()}
  `;

  const msg = {
    to: email,
    from: config.email.from,
    subject: 'Verify your Elevare account',
    html: getEmailTemplate(content),
  };

  try {
    await sgMail.send(msg);
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
  const resetUrl = `${config.corsOrigin}/${locale}/reset-password?token=${resetToken}`;

  const translations: Record<string, any> = {
    en: {
      subject: 'Reset your Elevare password',
      title: 'Password reset requested',
      message: `We received a request to reset the password for your Elevare account, <strong style="color: #1a1a1a;">${name}</strong>. Click the button below to create a new password.`,
      button: 'Reset Password',
      fallbackLabel: 'Security Fallback',
      fallbackText: 'If the button above does not work, please copy and paste the following URL into your browser:',
      expires: '<strong>Security Notice:</strong> This link will expire in 1 hour. If you did not request a password reset, please ignore this email or contact security@elevare.edu. Your password will not be changed.',
    },
    ne: {
      subject: 'तपाईंको Elevare पासवर्ड रिसेट गर्नुहोस्',
      title: 'पासवर्ड रिसेट अनुरोध गरिएको',
      message: `हामीले तपाईंको Elevare खाताको पासवर्ड रिसेट गर्ने अनुरोध प्राप्त गर्यौं, <strong style="color: #1a1a1a;">${name}</strong>। नयाँ पासवर्ड सिर्जना गर्न तलको बटनमा क्लिक गर्नुहोस्।`,
      button: 'पासवर्ड रिसेट गर्नुहोस्',
      fallbackLabel: 'सुरक्षा फलब्याक',
      fallbackText: 'यदि माथिको बटनले काम गर्दैन भने, कृपया निम्न URL प्रतिलिपि गरेर आफ्नो ब्राउजरमा टाँस्नुहोस्:',
      expires: '<strong>सुरक्षा सूचना:</strong> यो लिङ्क 1 घण्टामा समाप्त हुनेछ। यदि तपाईंले पासवर्ड रिसेट अनुरोध गर्नुभएको छैन भने, कृपया यो इमेललाई बेवास्ता गर्नुहोस् वा security@elevare.edu मा सम्पर्क गर्नुहोस्। तपाईंको पासवर्ड परिवर्तन हुने छैन।',
    },
    ko: {
      subject: 'Elevare 비밀번호 재설정',
      title: '비밀번호 재설정 요청됨',
      message: `Elevare 계정의 비밀번호 재설정 요청을 받았습니다, <strong style="color: #1a1a1a;">${name}</strong>님. 아래 버튼을 클릭하여 새 비밀번호를 만드세요.`,
      button: '비밀번호 재설정',
      fallbackLabel: '보안 대체',
      fallbackText: '위 버튼이 작동하지 않으면 다음 URL을 복사하여 브라우저에 붙여넣으세요:',
      expires: '<strong>보안 알림:</strong> 이 링크는 1시간 후에 만료됩니다. 비밀번호 재설정을 요청하지 않으셨다면 이 이메일을 무시하거나 security@elevare.edu로 문의하세요. 비밀번호는 변경되지 않습니다.',
    }
  };

  const t = translations[locale] || translations['en'];

  const content = `
    ${getHeader('🔐')}
    
    <!-- Main Content -->
    <tr>
      <td style="padding: 60px 60px 40px 60px;">
        <h2 style="margin: 0 0 24px 0; color: #1a1a1a; font-size: 28px; font-weight: 400; font-family: Georgia, 'Times New Roman', serif; text-align: center; line-height: 1.3;">
          ${t.title}
        </h2>
        <p style="margin: 0 0 32px 0; color: #666666; font-size: 15px; line-height: 1.7; text-align: center;">
          ${t.message}
        </p>

        <!-- CTA Button -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #2D6A4F; border-radius: 4px;">
                    <a href="${resetUrl}" style="display: inline-block; padding: 16px 40px; color: #FFFFFF; text-decoration: none; font-weight: 500; font-size: 15px; letter-spacing: 0.3px;">
                      ${t.button} →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Security Fallback -->
    <tr>
      <td style="padding: 0 60px 40px 60px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9f9f9; border-radius: 4px;">
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 8px 0; color: #999999; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                ${t.fallbackLabel}
              </p>
              <p style="margin: 0 0 12px 0; color: #666666; font-size: 13px; line-height: 1.6;">
                ${t.fallbackText}
              </p>
              <p style="margin: 0; word-break: break-all; color: #2D6A4F; font-size: 12px; font-family: 'Courier New', monospace; line-height: 1.6;">
                ${resetUrl}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Security Notice -->
    <tr>
      <td style="padding: 0 60px 60px 60px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFF9E6; border-left: 3px solid #F59E0B; border-radius: 4px;">
          <tr>
            <td style="padding: 20px 24px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right: 12px; vertical-align: top;">
                    <div style="width: 20px; height: 20px; background-color: #F59E0B; border-radius: 50%; text-align: center; line-height: 20px; color: white; font-size: 12px; font-weight: bold;">!</div>
                  </td>
                  <td>
                    <p style="margin: 0; color: #92400E; font-size: 13px; line-height: 1.6;">
                      ${t.expires}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${getFooter()}
  `;

  const msg = {
    to: email,
    from: config.email.from,
    subject: t.subject,
    html: getEmailTemplate(content),
  };

  try {
    await sgMail.send(msg);
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
      title: 'Account suspended',
      greeting: `Your Elevare account has been temporarily suspended, <strong style="color: #1a1a1a;">${name}</strong>.`,
      reasonLabel: 'Reason for suspension',
      expiresLabel: 'Suspension period',
      expiresUntil: 'Your account will be automatically reinstated on',
      appealInfo: 'If you believe this action was taken in error, you may submit an appeal for administrative review.',
      appealButton: 'Submit an Appeal',
      permanentNote: 'This is a permanent suspension. You may submit an appeal for administrative review.',
      guidelinesNote: 'Please review our Community Guidelines to understand our policies.',
      footer: 'If you have questions, contact our support team at support@elevare.com'
    },
    ne: {
      subject: 'महत्वपूर्ण: तपाईंको Elevare खाता स्थिति',
      title: 'खाता निलम्बित',
      greeting: `तपाईंको Elevare खाता अस्थायी रूपमा निलम्बित गरिएको छ, <strong style="color: #1a1a1a;">${name}</strong>।`,
      reasonLabel: 'निलम्बनको कारण',
      expiresLabel: 'निलम्बन अवधि',
      expiresUntil: 'तपाईंको खाता स्वचालित रूपमा पुनर्स्थापित हुनेछ',
      appealInfo: 'यदि तपाईंलाई लाग्छ कि यो कार्य गलत थियो भने, तपाईं प्रशासनिक समीक्षाको लागि अपील पेश गर्न सक्नुहुन्छ।',
      appealButton: 'अपील पेश गर्नुहोस्',
      permanentNote: 'यो स्थायी निलम्बन हो। तपाईं प्रशासनिक समीक्षाको लागि अपील पेश गर्न सक्नुहुन्छ।',
      guidelinesNote: 'कृपया हाम्रो नीतिहरू बुझ्न हाम्रो समुदाय दिशानिर्देशहरू समीक्षा गर्नुहोस्।',
      footer: 'यदि तपाईंसँग प्रश्नहरू छन् भने, support@elevare.com मा हाम्रो समर्थन टोलीलाई सम्पर्क गर्नुहोस्'
    },
    ko: {
      subject: '중요: Elevare 계정 상태',
      title: '계정 정지됨',
      greeting: `Elevare 계정이 일시적으로 정지되었습니다, <strong style="color: #1a1a1a;">${name}</strong>님.`,
      reasonLabel: '정지 사유',
      expiresLabel: '정지 기간',
      expiresUntil: '계정이 자동으로 복원됩니다',
      appealInfo: '이 조치가 잘못되었다고 생각하시면 관리자 검토를 위해 이의 신청을 제출할 수 있습니다.',
      appealButton: '이의 신청 제출',
      permanentNote: '이것은 영구 정지입니다. 관리자 검토를 위해 이의 신청을 제출할 수 있습니다.',
      guidelinesNote: '정책을 이해하려면 커뮤니티 가이드라인을 검토하세요.',
      footer: '질문이 있으신가요? support@elevare.com으로 지원팀에 문의하세요'
    }
  };

  const t = translations[locale] || translations['en'];
  const appealUrl = `${config.corsOrigin}/suspension-appeal`;

  const expiresHtml = expiresAt && suspensionType === 'temporary' ? `
    <tr>
      <td style="padding: 0 60px 40px 60px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFF9E6; border-left: 3px solid #F59E0B; border-radius: 4px;">
          <tr>
            <td style="padding: 20px 24px;">
              <p style="margin: 0 0 8px 0; color: #92400E; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                ${t.expiresLabel}
              </p>
              <p style="margin: 0; color: #92400E; font-size: 14px; line-height: 1.6;">
                ${t.expiresUntil}:<br>
                <strong style="font-size: 15px;">${expiresAt.toLocaleString(locale === 'ne' ? 'ne-NP' : locale === 'ko' ? 'ko-KR' : 'en-US', { 
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
      <td style="padding: 0 60px 40px 60px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FEF2F2; border-left: 3px solid #EF4444; border-radius: 4px;">
          <tr>
            <td style="padding: 20px 24px;">
              <p style="margin: 0; color: #991B1B; font-size: 14px; line-height: 1.6;">
                ${t.permanentNote}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  const content = `
    ${getHeader('⚠️')}
    
    <tr>
      <td style="padding: 60px 60px 40px 60px;">
        <h2 style="margin: 0 0 24px 0; color: #1a1a1a; font-size: 28px; font-weight: 400; font-family: Georgia, 'Times New Roman', serif; text-align: center; line-height: 1.3;">
          ${t.title}
        </h2>
        <p style="margin: 0 0 40px 0; color: #666666; font-size: 15px; line-height: 1.7; text-align: center;">
          ${t.greeting}
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9f9f9; border-radius: 4px; margin-bottom: 32px;">
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 8px 0; color: #999999; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                ${t.reasonLabel}
              </p>
              <p style="margin: 0; color: #1a1a1a; font-size: 15px; line-height: 1.6;">
                ${reason}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${expiresHtml}

    <tr>
      <td style="padding: 0 60px 40px 60px;">
        <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;">
          ${t.appealInfo}
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #2D6A4F; border-radius: 4px;">
                    <a href="${appealUrl}" style="display: inline-block; padding: 14px 32px; color: #FFFFFF; text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 0.3px;">
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

    <tr>
      <td style="padding: 0 60px 60px 60px;">
        <p style="margin: 0; color: #999999; font-size: 13px; line-height: 1.6; text-align: center;">
          ${t.guidelinesNote}
        </p>
      </td>
    </tr>

    ${getFooter()}
  `;

  const msg = {
    to: email,
    from: config.email.from,
    subject: t.subject,
    html: getEmailTemplate(content),
  };

  try {
    await sgMail.send(msg);
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
      title: 'Account reinstated',
      greeting: `We're pleased to inform you that your Elevare account has been reinstated, <strong style="color: #1a1a1a;">${name}</strong>.`,
      reasonLabel: 'Reinstatement details',
      accessInfo: 'You now have full access to all Elevare features and can continue your learning journey.',
      loginButton: 'Access Your Account',
      guidelinesReminder: 'Please continue to follow our Community Guidelines to maintain a positive learning environment.',
      welcomeBack: 'Welcome back to Elevare!'
    },
    ne: {
      subject: 'शुभ समाचार: तपाईंको Elevare खाता सक्रिय छ',
      title: 'खाता पुनर्स्थापित',
      greeting: `हामी तपाईंलाई सूचित गर्न पाउँदा खुसी छौं कि तपाईंको Elevare खाता पुनर्स्थापित गरिएको छ, <strong style="color: #1a1a1a;">${name}</strong>।`,
      reasonLabel: 'पुनर्स्थापना विवरण',
      accessInfo: 'तपाईंसँग अब सबै Elevare सुविधाहरूमा पूर्ण पहुँच छ र आफ्नो सिकाइ यात्रा जारी राख्न सक्नुहुन्छ।',
      loginButton: 'आफ्नो खाता पहुँच गर्नुहोस्',
      guidelinesReminder: 'कृपया सकारात्मक सिकाइ वातावरण कायम राख्न हाम्रो समुदाय दिशानिर्देशहरू पालना गर्न जारी राख्नुहोस्।',
      welcomeBack: 'Elevare मा फिर्ता स्वागत छ!'
    },
    ko: {
      subject: '좋은 소식: Elevare 계정이 활성화되었습니다',
      title: '계정 복원됨',
      greeting: `Elevare 계정이 복원되었음을 알려드리게 되어 기쁩니다, <strong style="color: #1a1a1a;">${name}</strong>님.`,
      reasonLabel: '복원 세부정보',
      accessInfo: '이제 모든 Elevare 기능에 대한 전체 액세스 권한이 있으며 학습 여정을 계속할 수 있습니다.',
      loginButton: '계정 액세스',
      guidelinesReminder: '긍정적인 학습 환경을 유지하기 위해 커뮤니티 가이드라인을 계속 준수해 주세요.',
      welcomeBack: 'Elevare에 다시 오신 것을 환영합니다!'
    }
  };

  const t = translations[locale] || translations['en'];
  const loginUrl = `${config.corsOrigin}/login`;

  const content = `
    ${getHeader('✅')}
    
    <tr>
      <td style="padding: 60px 60px 40px 60px;">
        <h2 style="margin: 0 0 24px 0; color: #1a1a1a; font-size: 28px; font-weight: 400; font-family: Georgia, 'Times New Roman', serif; text-align: center; line-height: 1.3;">
          ${t.title}
        </h2>
        <p style="margin: 0 0 40px 0; color: #666666; font-size: 15px; line-height: 1.7; text-align: center;">
          ${t.greeting}
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F0FDF4; border-left: 3px solid #10B981; border-radius: 4px; margin-bottom: 32px;">
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 8px 0; color: #065F46; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                ${t.reasonLabel}
              </p>
              <p style="margin: 0; color: #065F46; font-size: 14px; line-height: 1.6;">
                ${reason}
              </p>
            </td>
          </tr>
        </table>

        <p style="margin: 0 0 32px 0; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;">
          ${t.accessInfo}
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #2D6A4F; border-radius: 4px;">
                    <a href="${loginUrl}" style="display: inline-block; padding: 16px 40px; color: #FFFFFF; text-decoration: none; font-weight: 500; font-size: 15px; letter-spacing: 0.3px;">
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

    <tr>
      <td style="padding: 0 60px 40px 60px;">
        <p style="margin: 0; color: #999999; font-size: 13px; line-height: 1.6; text-align: center;">
          ${t.guidelinesReminder}
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding: 0 60px 60px 60px;">
        <p style="margin: 0; color: #2D6A4F; font-size: 18px; font-weight: 600; text-align: center; font-family: Georgia, 'Times New Roman', serif;">
          ${t.welcomeBack}
        </p>
      </td>
    </tr>

    ${getFooter()}
  `;

  const msg = {
    to: email,
    from: config.email.from,
    subject: t.subject,
    html: getEmailTemplate(content),
  };

  try {
    await sgMail.send(msg);
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
  const msg = {
    to: options.to,
    from: config.email.from,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  try {
    await sgMail.send(msg);
    logger.info('Notification email sent', { to: options.to, subject: options.subject });
  } catch (error) {
    logger.error('Failed to send notification email', { to: options.to, subject: options.subject, error });
    throw new Error('Failed to send notification email');
  }
}

/**
 * Send report submitted notification email
 */
export async function sendReportSubmittedEmail(
  email: string,
  name: string,
  reportId: string,
  locale: string = 'en'
): Promise<void> {
  const translations: Record<string, any> = {
    en: {
      subject: 'Report Submitted - Elevare Moderation',
      title: 'Report received',
      greeting: `Thank you for helping maintain our community standards, <strong style="color: #1a1a1a;">${name}</strong>.`,
      message: 'Your report has been successfully submitted to our moderation team for review.',
      reportIdLabel: 'Report Reference',
      nextSteps: 'Our moderation team will review your report within 24-48 hours. You will receive email updates as the status changes.',
      trackButton: 'Track Report Status',
      footer: 'Thank you for contributing to a safe learning environment.'
    },
    ne: {
      subject: 'रिपोर्ट पेश गरियो - Elevare मोडरेशन',
      title: 'रिपोर्ट प्राप्त भयो',
      greeting: `हाम्रो समुदाय मापदण्ड कायम राख्न मद्दत गर्नुभएकोमा धन्यवाद, <strong style="color: #1a1a1a;">${name}</strong>।`,
      message: 'तपाईंको रिपोर्ट सफलतापूर्वक हाम्रो मोडरेशन टोलीलाई समीक्षाको लागि पेश गरिएको छ।',
      reportIdLabel: 'रिपोर्ट सन्दर्भ',
      nextSteps: 'हाम्रो मोडरेशन टोलीले 24-48 घण्टा भित्र तपाईंको रिपोर्ट समीक्षा गर्नेछ। स्थिति परिवर्तन हुँदा तपाईंले इमेल अपडेटहरू प्राप्त गर्नुहुनेछ।',
      trackButton: 'रिपोर्ट स्थिति ट्र्याक गर्नुहोस्',
      footer: 'सुरक्षित सिकाइ वातावरणमा योगदान गर्नुभएकोमा धन्यवाद।'
    },
    ko: {
      subject: '신고 제출됨 - Elevare 관리',
      title: '신고 접수됨',
      greeting: `커뮤니티 기준 유지를 도와주셔서 감사합니다, <strong style="color: #1a1a1a;">${name}</strong>님.`,
      message: '신고가 검토를 위해 관리팀에 성공적으로 제출되었습니다.',
      reportIdLabel: '신고 참조',
      nextSteps: '관리팀이 24-48시간 내에 신고를 검토합니다. 상태가 변경되면 이메일 업데이트를 받게 됩니다.',
      trackButton: '신고 상태 추적',
      footer: '안전한 학습 환경에 기여해 주셔서 감사합니다.'
    }
  };

  const t = translations[locale] || translations['en'];
  const trackUrl = `${config.corsOrigin}/reports/${reportId}`;

  const content = `
    ${getHeader('📋')}
    
    <tr>
      <td style="padding: 60px 60px 40px 60px;">
        <h2 style="margin: 0 0 24px 0; color: #1a1a1a; font-size: 28px; font-weight: 400; font-family: Georgia, 'Times New Roman', serif; text-align: center; line-height: 1.3;">
          ${t.title}
        </h2>
        <p style="margin: 0 0 40px 0; color: #666666; font-size: 15px; line-height: 1.7; text-align: center;">
          ${t.greeting}
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F0F9FF; border-left: 3px solid #0EA5E9; border-radius: 4px; margin-bottom: 32px;">
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 8px 0; color: #075985; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                ${t.reportIdLabel}
              </p>
              <p style="margin: 0; color: #075985; font-size: 16px; font-weight: 600; font-family: 'Courier New', monospace;">
                #${reportId}
              </p>
            </td>
          </tr>
        </table>

        <p style="margin: 0 0 32px 0; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;">
          ${t.message}
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #2D6A4F; border-radius: 4px;">
                    <a href="${trackUrl}" style="display: inline-block; padding: 16px 40px; color: #FFFFFF; text-decoration: none; font-weight: 500; font-size: 15px; letter-spacing: 0.3px;">
                      ${t.trackButton} →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding: 0 60px 40px 60px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9f9f9; border-radius: 4px;">
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 8px 0; color: #999999; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                Next Steps
              </p>
              <p style="margin: 0; color: #666666; font-size: 13px; line-height: 1.6;">
                ${t.nextSteps}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding: 0 60px 60px 60px;">
        <p style="margin: 0; color: #2D6A4F; font-size: 16px; font-weight: 600; text-align: center; font-family: Georgia, 'Times New Roman', serif;">
          ${t.footer}
        </p>
      </td>
    </tr>

    ${getFooter()}
  `;

  const msg = {
    to: email,
    from: config.email.from,
    subject: t.subject,
    html: getEmailTemplate(content),
  };

  try {
    await sgMail.send(msg);
    logger.info('Report submitted email sent', { email, reportId, locale });
  } catch (error) {
    logger.error('Failed to send report submitted email', { email, reportId, locale, error });
    throw new Error('Failed to send report submitted email');
  }
}

/**
 * Send report under review notification email
 */
export async function sendReportUnderReviewEmail(
  email: string,
  name: string,
  reportId: string,
  locale: string = 'en'
): Promise<void> {
  const translations: Record<string, any> = {
    en: {
      subject: 'Report Under Review - Elevare Moderation',
      title: 'Report being reviewed',
      greeting: `Your report is now under active review, <strong style="color: #1a1a1a;">${name}</strong>.`,
      message: 'Our moderation team has begun investigating the content you reported.',
      reportIdLabel: 'Report Reference',
      statusInfo: 'We are carefully reviewing the reported content against our community guidelines. You will be notified once a decision has been made.',
      trackButton: 'View Report Details',
      footer: 'Thank you for your patience.'
    },
    ne: {
      subject: 'रिपोर्ट समीक्षाधीन - Elevare मोडरेशन',
      title: 'रिपोर्ट समीक्षा भइरहेको छ',
      greeting: `तपाईंको रिपोर्ट अब सक्रिय समीक्षाधीन छ, <strong style="color: #1a1a1a;">${name}</strong>।`,
      message: 'हाम्रो मोडरेशन टोलीले तपाईंले रिपोर्ट गर्नुभएको सामग्रीको अनुसन्धान सुरु गरेको छ।',
      reportIdLabel: 'रिपोर्ट सन्दर्भ',
      statusInfo: 'हामी हाम्रो समुदाय दिशानिर्देशहरू विरुद्ध रिपोर्ट गरिएको सामग्रीको सावधानीपूर्वक समीक्षा गर्दैछौं। निर्णय भएपछि तपाईंलाई सूचित गरिनेछ।',
      trackButton: 'रिपोर्ट विवरण हेर्नुहोस्',
      footer: 'तपाईंको धैर्यताको लागि धन्यवाद।'
    },
    ko: {
      subject: '신고 검토 중 - Elevare 관리',
      title: '신고 검토 중',
      greeting: `신고가 현재 검토 중입니다, <strong style="color: #1a1a1a;">${name}</strong>님.`,
      message: '관리팀이 신고하신 콘텐츠를 조사하기 시작했습니다.',
      reportIdLabel: '신고 참조',
      statusInfo: '커뮤니티 가이드라인에 따라 신고된 콘텐츠를 신중하게 검토하고 있습니다. 결정이 내려지면 알려드리겠습니다.',
      trackButton: '신고 세부정보 보기',
      footer: '기다려 주셔서 감사합니다.'
    }
  };

  const t = translations[locale] || translations['en'];
  const trackUrl = `${config.corsOrigin}/reports/${reportId}`;

  const content = `
    ${getHeader('🔍')}
    
    <tr>
      <td style="padding: 60px 60px 40px 60px;">
        <h2 style="margin: 0 0 24px 0; color: #1a1a1a; font-size: 28px; font-weight: 400; font-family: Georgia, 'Times New Roman', serif; text-align: center; line-height: 1.3;">
          ${t.title}
        </h2>
        <p style="margin: 0 0 40px 0; color: #666666; font-size: 15px; line-height: 1.7; text-align: center;">
          ${t.greeting}
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFF9E6; border-left: 3px solid #F59E0B; border-radius: 4px; margin-bottom: 32px;">
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 8px 0; color: #92400E; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                ${t.reportIdLabel}
              </p>
              <p style="margin: 0; color: #92400E; font-size: 16px; font-weight: 600; font-family: 'Courier New', monospace;">
                #${reportId}
              </p>
            </td>
          </tr>
        </table>

        <p style="margin: 0 0 32px 0; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;">
          ${t.message}
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #2D6A4F; border-radius: 4px;">
                    <a href="${trackUrl}" style="display: inline-block; padding: 16px 40px; color: #FFFFFF; text-decoration: none; font-weight: 500; font-size: 15px; letter-spacing: 0.3px;">
                      ${t.trackButton} →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding: 0 60px 60px 60px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9f9f9; border-radius: 4px;">
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0; color: #666666; font-size: 13px; line-height: 1.6; text-align: center;">
                ${t.statusInfo}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${getFooter()}
  `;

  const msg = {
    to: email,
    from: config.email.from,
    subject: t.subject,
    html: getEmailTemplate(content),
  };

  try {
    await sgMail.send(msg);
    logger.info('Report under review email sent', { email, reportId, locale });
  } catch (error) {
    logger.error('Failed to send report under review email', { email, reportId, locale, error });
    throw new Error('Failed to send report under review email');
  }
}

/**
 * Send report resolved notification email
 */
export async function sendReportResolvedEmail(
  email: string,
  name: string,
  reportId: string,
  resolution: string,
  locale: string = 'en'
): Promise<void> {
  const translations: Record<string, any> = {
    en: {
      subject: 'Report Resolved - Elevare Moderation',
      title: 'Report resolved',
      greeting: `Your report has been resolved, <strong style="color: #1a1a1a;">${name}</strong>.`,
      message: 'Our moderation team has completed the review and taken appropriate action.',
      reportIdLabel: 'Report Reference',
      resolutionLabel: 'Resolution Details',
      viewButton: 'View Full Details',
      footer: 'Thank you for helping maintain our community standards.'
    },
    ne: {
      subject: 'रिपोर्ट समाधान भयो - Elevare मोडरेशन',
      title: 'रिपोर्ट समाधान भयो',
      greeting: `तपाईंको रिपोर्ट समाधान गरिएको छ, <strong style="color: #1a1a1a;">${name}</strong>।`,
      message: 'हाम्रो मोडरेशन टोलीले समीक्षा पूरा गरेको छ र उपयुक्त कारबाही गरेको छ।',
      reportIdLabel: 'रिपोर्ट सन्दर्भ',
      resolutionLabel: 'समाधान विवरण',
      viewButton: 'पूर्ण विवरण हेर्नुहोस्',
      footer: 'हाम्रो समुदाय मापदण्ड कायम राख्न मद्दत गर्नुभएकोमा धन्यवाद।'
    },
    ko: {
      subject: '신고 해결됨 - Elevare 관리',
      title: '신고 해결됨',
      greeting: `신고가 해결되었습니다, <strong style="color: #1a1a1a;">${name}</strong>님.`,
      message: '관리팀이 검토를 완료하고 적절한 조치를 취했습니다.',
      reportIdLabel: '신고 참조',
      resolutionLabel: '해결 세부정보',
      viewButton: '전체 세부정보 보기',
      footer: '커뮤니티 기준 유지를 도와주셔서 감사합니다.'
    }
  };

  const t = translations[locale] || translations['en'];
  const viewUrl = `${config.corsOrigin}/reports/${reportId}`;

  const content = `
    ${getHeader('✅')}
    
    <tr>
      <td style="padding: 60px 60px 40px 60px;">
        <h2 style="margin: 0 0 24px 0; color: #1a1a1a; font-size: 28px; font-weight: 400; font-family: Georgia, 'Times New Roman', serif; text-align: center; line-height: 1.3;">
          ${t.title}
        </h2>
        <p style="margin: 0 0 40px 0; color: #666666; font-size: 15px; line-height: 1.7; text-align: center;">
          ${t.greeting}
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F0FDF4; border-left: 3px solid #10B981; border-radius: 4px; margin-bottom: 24px;">
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 8px 0; color: #065F46; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                ${t.reportIdLabel}
              </p>
              <p style="margin: 0; color: #065F46; font-size: 16px; font-weight: 600; font-family: 'Courier New', monospace;">
                #${reportId}
              </p>
            </td>
          </tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9f9f9; border-radius: 4px; margin-bottom: 32px;">
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 8px 0; color: #999999; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                ${t.resolutionLabel}
              </p>
              <p style="margin: 0; color: #1a1a1a; font-size: 14px; line-height: 1.6;">
                ${resolution}
              </p>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #2D6A4F; border-radius: 4px;">
                    <a href="${viewUrl}" style="display: inline-block; padding: 16px 40px; color: #FFFFFF; text-decoration: none; font-weight: 500; font-size: 15px; letter-spacing: 0.3px;">
                      ${t.viewButton} →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding: 0 60px 60px 60px;">
        <p style="margin: 0; color: #2D6A4F; font-size: 16px; font-weight: 600; text-align: center; font-family: Georgia, 'Times New Roman', serif;">
          ${t.footer}
        </p>
      </td>
    </tr>

    ${getFooter()}
  `;

  const msg = {
    to: email,
    from: config.email.from,
    subject: t.subject,
    html: getEmailTemplate(content),
  };

  try {
    await sgMail.send(msg);
    logger.info('Report resolved email sent', { email, reportId, locale });
  } catch (error) {
    logger.error('Failed to send report resolved email', { email, reportId, locale, error });
    throw new Error('Failed to send report resolved email');
  }
}

/**
 * Send report dismissed notification email
 */
export async function sendReportDismissedEmail(
  email: string,
  name: string,
  reportId: string,
  reason: string,
  locale: string = 'en'
): Promise<void> {
  const translations: Record<string, any> = {
    en: {
      subject: 'Report Update - Elevare Moderation',
      title: 'Report dismissed',
      greeting: `Your report has been reviewed, <strong style="color: #1a1a1a;">${name}</strong>.`,
      message: 'After careful review, our moderation team has determined that the reported content does not violate our community guidelines.',
      reportIdLabel: 'Report Reference',
      reasonLabel: 'Dismissal Reason',
      appealInfo: 'If you believe this decision was made in error, you may submit an appeal for further review.',
      appealButton: 'Submit an Appeal',
      footer: 'Thank you for helping us maintain community standards.'
    },
    ne: {
      subject: 'रिपोर्ट अपडेट - Elevare मोडरेशन',
      title: 'रिपोर्ट खारेज गरियो',
      greeting: `तपाईंको रिपोर्ट समीक्षा गरिएको छ, <strong style="color: #1a1a1a;">${name}</strong>।`,
      message: 'सावधानीपूर्वक समीक्षा पछि, हाम्रो मोडरेशन टोलीले निर्धारण गरेको छ कि रिपोर्ट गरिएको सामग्रीले हाम्रो समुदाय दिशानिर्देशहरू उल्लङ्घन गर्दैन।',
      reportIdLabel: 'रिपोर्ट सन्दर्भ',
      reasonLabel: 'खारेज कारण',
      appealInfo: 'यदि तपाईंलाई लाग्छ कि यो निर्णय गलत थियो भने, तपाईं थप समीक्षाको लागि अपील पेश गर्न सक्नुहुन्छ।',
      appealButton: 'अपील पेश गर्नुहोस्',
      footer: 'समुदाय मापदण्ड कायम राख्न मद्दत गर्नुभएकोमा धन्यवाद।'
    },
    ko: {
      subject: '신고 업데이트 - Elevare 관리',
      title: '신고 기각됨',
      greeting: `신고가 검토되었습니다, <strong style="color: #1a1a1a;">${name}</strong>님.`,
      message: '신중한 검토 후, 관리팀은 신고된 콘텐츠가 커뮤니티 가이드라인을 위반하지 않는다고 판단했습니다.',
      reportIdLabel: '신고 참조',
      reasonLabel: '기각 사유',
      appealInfo: '이 결정이 잘못되었다고 생각하시면 추가 검토를 위해 이의 신청을 제출할 수 있습니다.',
      appealButton: '이의 신청 제출',
      footer: '커뮤니티 기준 유지를 도와주셔서 감사합니다.'
    }
  };

  const t = translations[locale] || translations['en'];
  const appealUrl = `${config.corsOrigin}/reports/${reportId}/appeal`;

  const content = `
    ${getHeader('ℹ️')}
    
    <tr>
      <td style="padding: 60px 60px 40px 60px;">
        <h2 style="margin: 0 0 24px 0; color: #1a1a1a; font-size: 28px; font-weight: 400; font-family: Georgia, 'Times New Roman', serif; text-align: center; line-height: 1.3;">
          ${t.title}
        </h2>
        <p style="margin: 0 0 40px 0; color: #666666; font-size: 15px; line-height: 1.7; text-align: center;">
          ${t.greeting}
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F3F4F6; border-left: 3px solid #6B7280; border-radius: 4px; margin-bottom: 24px;">
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 8px 0; color: #374151; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                ${t.reportIdLabel}
              </p>
              <p style="margin: 0; color: #374151; font-size: 16px; font-weight: 600; font-family: 'Courier New', monospace;">
                #${reportId}
              </p>
            </td>
          </tr>
        </table>

        <p style="margin: 0 0 24px 0; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;">
          ${t.message}
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9f9f9; border-radius: 4px; margin-bottom: 32px;">
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 8px 0; color: #999999; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                ${t.reasonLabel}
              </p>
              <p style="margin: 0; color: #1a1a1a; font-size: 14px; line-height: 1.6;">
                ${reason}
              </p>
            </td>
          </tr>
        </table>
        <p style="margin: 0 0 20px 0; color: #666666; font-size: 13px; line-height: 1.6; text-align: center;">
          ${t.appealInfo}
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #2D6A4F; border-radius: 4px;">
                    <a href="${appealUrl}" style="display: inline-block; padding: 14px 32px; color: #FFFFFF; text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 0.3px;">
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

    <tr>
      <td style="padding: 0 60px 60px 60px;">
        <p style="margin: 0; color: #999999; font-size: 13px; text-align: center;">
          ${t.footer}
        </p>
      </td>
    </tr>

    ${getFooter()}
  `;

  const msg = {
    to: email,
    from: config.email.from,
    subject: t.subject,
    html: getEmailTemplate(content),
  };

  try {
    await sgMail.send(msg);
    logger.info('Report dismissed email sent', { email, reportId, locale });
  } catch (error) {
    logger.error('Failed to send report dismissed email', { email, reportId, locale, error });
    throw new Error('Failed to send report dismissed email');
  }
}

// EmailService class for backward compatibility
export class EmailService {
  async sendOTP(email: string, name: string, otpCode: string, locale?: string) {
    return sendOTPEmail(email, name, otpCode, locale);
  }

  async sendVerification(email: string, name: string, verificationToken: string) {
    return sendVerificationEmail(email, name, verificationToken);
  }

  async sendPasswordReset(email: string, name: string, resetToken: string, locale?: string) {
    return sendPasswordResetEmail(email, name, resetToken, locale);
  }

  async sendSuspension(
    email: string,
    name: string,
    reason: string,
    suspensionType: 'temporary' | 'permanent',
    expiresAt?: Date,
    locale?: string
  ) {
    return sendSuspensionEmail(email, name, reason, suspensionType, expiresAt, locale);
  }

  async sendUnsuspension(email: string, name: string, reason: string, locale?: string) {
    return sendUnsuspensionEmail(email, name, reason, locale);
  }

  async sendNotification(options: { to: string; subject: string; text: string; html: string }) {
    return sendNotificationEmail(options);
  }

  async sendNotificationEmail(options: { to: string; subject: string; text: string; html: string }) {
    return sendNotificationEmail(options);
  }

  async sendReportSubmitted(
    email: string,
    name: string,
    reportId: string,
    locale?: string
  ) {
    return sendReportSubmittedEmail(email, name, reportId, locale);
  }

  async sendReportUnderReview(
    email: string,
    name: string,
    reportId: string,
    locale?: string
  ) {
    return sendReportUnderReviewEmail(email, name, reportId, locale);
  }

  async sendReportResolved(
    email: string,
    name: string,
    reportId: string,
    resolution: string,
    locale?: string
  ) {
    return sendReportResolvedEmail(email, name, reportId, resolution, locale);
  }

  async sendReportDismissed(
    email: string,
    name: string,
    reportId: string,
    reason: string,
    locale?: string
  ) {
    return sendReportDismissedEmail(email, name, reportId, reason, locale);
  }
}

export default new EmailService();
