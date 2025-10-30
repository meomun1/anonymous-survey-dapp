import nodemailer from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}
export interface TokenInfo {
  token: string;
  studentEmail: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_FROM) {
      console.warn('⚠️ SMTP configuration incomplete, email service disabled');
      this.transporter = null;
      return;
    }

    try {
      this.config = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.SMTP_FROM
      };

      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: { user: this.config.user, pass: this.config.pass },
        tls: { rejectUnauthorized: false }
      });

      console.log('✅ Email service initialized with SMTP');
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
      this.transporter = null;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.transporter) return false;
    try {
      await this.transporter.verify();
      console.log('✅ SMTP connection verified');
      return true;
    } catch (error) {
      console.error('❌ SMTP connection failed:', error);
      return false;
    }
  }

  // ============================================================================
  // CAMPAIGN-LEVEL EMAILS (survey_tokens)
  // ============================================================================
  async sendCampaignTokens(campaignId: string, baseUrl: string = 'http://localhost:3000') {
    if (!this.transporter) return { success: 0, failed: 0, details: [] };
    // Load campaign basics and tokens
    const campaignRes = await (await import('../config/database')).default.query(
      `SELECT id, name FROM survey_campaigns WHERE id = $1 LIMIT 1`,
      [campaignId]
    );
    if (campaignRes.rowCount === 0) return { success: 0, failed: 0, details: [] };
    const campaign = campaignRes.rows[0];
    const tokensRes = await (await import('../config/database')).default.query(
      `SELECT token, student_email FROM survey_tokens WHERE campaign_id = $1`,
      [campaignId]
    );
    const results = await Promise.allSettled(tokensRes.rows.map(async (row: any) => {
      const tokenInfo: TokenInfo = { token: row.token, studentEmail: row.student_email };
      // Generic campaign email (no specific survey info). Reuse template minimally.
      const ok = await this.sendGenericCampaignToken(tokenInfo, campaign.name, baseUrl);
      return { email: row.student_email, success: ok };
    }));
    const details = results.map(r => r.status === 'fulfilled' ? r.value : { email: '', success: false });
    const success = details.filter(d => d.success).length;
    const failed = details.length - success;
    return { success, failed, details };
  }

  private async sendGenericCampaignToken(tokenInfo: TokenInfo, campaignName: string, baseUrl: string) {
    if (!this.transporter) return false;
    const url = `${baseUrl}/campaigns/${encodeURIComponent(campaignName)}`;
    try {
      await this.transporter.sendMail({
        from: this.config!.from,
        to: tokenInfo.studentEmail,
        subject: `Survey Campaign Invitation: ${campaignName}`,
        html: this.genericCampaignHtml(tokenInfo, campaignName, url),
        text: this.genericCampaignText(tokenInfo, campaignName, url)
      });
      return true;
    } catch {
      return false;
    }
  }

  private genericCampaignHtml(tokenInfo: TokenInfo, campaignName: string, url: string) {
    return `
          <!DOCTYPE html>
          <html>
          <head><title>${campaignName} - Survey Access</title></head>
          <body>
            <h1>${campaignName}</h1>
            <p>Your campaign access token:</p>
            <div style="background:#e9ecef;padding:12px;border-radius:6px;font-family:monospace;text-align:center;">${tokenInfo.token}</div>
            <p>Use this token in the survey portal.</p>
            <a href="${url}" style="background:#007bff;color:#fff;padding:10px 18px;text-decoration:none;border-radius:6px;">Open Survey Portal</a>
          </body>
          </html>`;
  }

  private genericCampaignText(tokenInfo: TokenInfo, campaignName: string, url: string) {
    return `Survey Campaign: ${campaignName}

            Token: ${tokenInfo.token}

            Open Portal: ${url}`;
  }

  isAvailable(): boolean {
    return this.transporter !== null;
  }

  // ============================================================================
  // TEACHER EMAILS
  // ============================================================================

  /**
   * Send welcome email to teacher with login credentials
   */
  async sendTeacherWelcomeEmail(
    teacherEmail: string,
    teacherName: string,
    temporaryPassword: string,
    baseUrl: string = 'http://localhost:3002'
  ): Promise<boolean> {
    if (!this.transporter) {
      console.warn('⚠️ Email service not available, skipping teacher welcome email');
      return false;
    }

    const loginUrl = `${baseUrl}/login/teacher`;

    try {
      await this.transporter.sendMail({
        from: this.config!.from,
        to: teacherEmail,
        subject: 'Welcome to Anonymous Survey System - Your Account is Ready',
        html: this.teacherWelcomeHtml(teacherName, teacherEmail, temporaryPassword, loginUrl),
        text: this.teacherWelcomeText(teacherName, teacherEmail, temporaryPassword, loginUrl)
      });
      console.log(`✅ Welcome email sent to teacher: ${teacherEmail}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send welcome email to ${teacherEmail}:`, error);
      return false;
    }
  }

  /**
   * Send password reset email to teacher
   */
  async sendTeacherPasswordResetEmail(
    teacherEmail: string,
    teacherName: string,
    resetToken: string,
    baseUrl: string = 'http://localhost:3002'
  ): Promise<boolean> {
    if (!this.transporter) {
      console.warn('⚠️ Email service not available, skipping password reset email');
      return false;
    }

    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    try {
      await this.transporter.sendMail({
        from: this.config!.from,
        to: teacherEmail,
        subject: 'Password Reset Request - Anonymous Survey System',
        html: this.teacherPasswordResetHtml(teacherName, resetUrl),
        text: this.teacherPasswordResetText(teacherName, resetUrl)
      });
      console.log(`✅ Password reset email sent to: ${teacherEmail}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send password reset email to ${teacherEmail}:`, error);
      return false;
    }
  }

  // ============================================================================
  // EMAIL TEMPLATES - TEACHER WELCOME
  // ============================================================================

  private teacherWelcomeHtml(
    teacherName: string,
    email: string,
    temporaryPassword: string,
    loginUrl: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Welcome to Anonymous Survey System</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
    .credentials { background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px; }
    .credential-row { margin: 10px 0; }
    .credential-label { font-weight: 600; color: #666; display: inline-block; width: 120px; }
    .credential-value { font-family: 'Courier New', monospace; background: #e9ecef; padding: 8px 12px; border-radius: 4px; display: inline-block; }
    .password-warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .cta-button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .cta-button:hover { background: #5568d3; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px; }
    .steps { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
    .step { margin: 15px 0; padding-left: 30px; position: relative; }
    .step-number { position: absolute; left: 0; top: 0; background: #667eea; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; font-size: 28px;">🎓 Welcome to the Team!</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Anonymous Survey System for Universities</p>
  </div>

  <div class="content">
    <p>Hi <strong>${teacherName}</strong>,</p>

    <p>Your teacher account has been created! You now have access to the Anonymous Survey System where you can manage course assignments and view student participation.</p>

    <div class="credentials">
      <h3 style="margin-top: 0; color: #667eea;">Your Login Credentials</h3>
      <div class="credential-row">
        <span class="credential-label">Email:</span>
        <span class="credential-value">${email}</span>
      </div>
      <div class="credential-row">
        <span class="credential-label">Temporary Password:</span>
        <span class="credential-value">${temporaryPassword}</span>
      </div>
    </div>

    <div class="password-warning">
      <strong>⚠️ Important Security Notice:</strong><br>
      You will be required to change your password on first login. Please choose a strong password that you don't use elsewhere.
    </div>

    <div class="steps">
      <h3 style="margin-top: 0; color: #333;">Getting Started (3 Simple Steps)</h3>
      <div class="step">
        <span class="step-number">1</span>
        <strong>Login to Your Account</strong><br>
        Click the button below and use your temporary password
      </div>
      <div class="step">
        <span class="step-number">2</span>
        <strong>Change Your Password</strong><br>
        You'll be prompted to set a secure password
      </div>
      <div class="step">
        <span class="step-number">3</span>
        <strong>Start Managing Courses</strong><br>
        Input course assignments and manage student lists
      </div>
    </div>

    <center>
      <a href="${loginUrl}" class="cta-button">Login to Teacher Portal</a>
    </center>

    <div style="margin-top: 30px; padding: 15px; background: #e7f3ff; border-radius: 5px; font-size: 14px;">
      <strong>💡 What You Can Do:</strong>
      <ul style="margin: 10px 0;">
        <li>View assigned survey campaigns</li>
        <li>Input course assignments during setup phase</li>
        <li>Manage student enrollment in your courses</li>
        <li>View participation statistics</li>
      </ul>
    </div>

  </div>

  <div class="footer">
    <p>If you have any questions or need assistance, please contact your system administrator.</p>
    <p style="font-size: 12px; margin-top: 15px;">This is an automated email. Please do not reply.</p>
  </div>
</body>
</html>`;
  }

  private teacherWelcomeText(
    teacherName: string,
    email: string,
    temporaryPassword: string,
    loginUrl: string
  ): string {
    return `Welcome to Anonymous Survey System

Hi ${teacherName},

Your teacher account has been created!

LOGIN CREDENTIALS:
Email: ${email}
Temporary Password: ${temporaryPassword}

IMPORTANT: You will be required to change your password on first login.

GETTING STARTED:
1. Login to your account: ${loginUrl}
2. Change your password when prompted
3. Start managing courses and student assignments

WHAT YOU CAN DO:
- View assigned survey campaigns
- Input course assignments during setup phase
- Manage student enrollment in your courses
- View participation statistics

If you have any questions, please contact your system administrator.

---
This is an automated email. Please do not reply.`;
  }

  // ============================================================================
  // EMAIL TEMPLATES - PASSWORD RESET
  // ============================================================================

  private teacherPasswordResetHtml(teacherName: string, resetUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Password Reset Request</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .cta-button { display: inline-block; background: #dc3545; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .cta-button:hover { background: #c82333; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; font-size: 28px;">🔐 Password Reset Request</h1>
  </div>

  <div class="content">
    <p>Hi <strong>${teacherName}</strong>,</p>

    <p>We received a request to reset your password for the Anonymous Survey System.</p>

    <center>
      <a href="${resetUrl}" class="cta-button">Reset Your Password</a>
    </center>

    <div class="warning">
      <strong>⚠️ Security Notice:</strong><br>
      This link will expire in 1 hour. If you didn't request this reset, please ignore this email and your password will remain unchanged.
    </div>

    <p style="margin-top: 25px; font-size: 14px; color: #666;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <code style="background: #e9ecef; padding: 8px; border-radius: 4px; display: inline-block; margin-top: 5px; word-break: break-all;">${resetUrl}</code>
    </p>
  </div>

  <div class="footer">
    <p>If you have any questions, please contact your system administrator.</p>
    <p style="font-size: 12px; margin-top: 15px;">This is an automated email. Please do not reply.</p>
  </div>
</body>
</html>`;
  }

  private teacherPasswordResetText(teacherName: string, resetUrl: string): string {
    return `Password Reset Request

Hi ${teacherName},

We received a request to reset your password for the Anonymous Survey System.

Reset your password: ${resetUrl}

SECURITY NOTICE:
This link will expire in 1 hour. If you didn't request this reset, please ignore this email and your password will remain unchanged.

If you have any questions, please contact your system administrator.

---
This is an automated email. Please do not reply.`;
  }
}
