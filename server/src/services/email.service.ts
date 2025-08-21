import nodemailer from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export interface SurveyInfo {
  id: string;
  shortId?: string;
  title: string;
  description?: string;
  question: string;
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

  async sendSurveyToken(tokenInfo: TokenInfo, surveyInfo: SurveyInfo, baseUrl: string = 'http://localhost:3000'): Promise<boolean> {
    if (!this.transporter) return false;

    const surveyUrl = `${baseUrl}/surveys/${surveyInfo.shortId || surveyInfo.id}/participate`;

    try {
      await this.transporter.sendMail({
        from: this.config!.from,
        to: tokenInfo.studentEmail,
        subject: `Survey Invitation: ${surveyInfo.title}`,
        html: this.generateTokenEmailHtml(tokenInfo, surveyInfo, surveyUrl),
        text: this.generateTokenEmailText(tokenInfo, surveyInfo, surveyUrl)
      });
      console.log(`📧 Survey token sent to ${tokenInfo.studentEmail}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send email to ${tokenInfo.studentEmail}:`, error);
      return false;
    }
  }

  async sendBatchSurveyTokens(tokens: TokenInfo[], surveyInfo: SurveyInfo, baseUrl: string = 'http://localhost:3000') {
    if (!this.transporter) {
      return { success: 0, failed: tokens.length, details: tokens.map(t => ({ email: t.studentEmail, success: false })) };
    }

    const results = await Promise.allSettled(
      tokens.map(token => this.sendSurveyToken(token, surveyInfo, baseUrl))
    );

    const details = results.map((result, index) => ({
      email: tokens[index].studentEmail,
      success: result.status === 'fulfilled' && result.value
    }));

    const success = details.filter(d => d.success).length;
    const failed = details.length - success;

    return { success, failed, details };
  }

  private generateTokenEmailHtml(tokenInfo: TokenInfo, surveyInfo: SurveyInfo, surveyUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head><title>Survey Invitation</title></head>
<body>
    <h1>📊 Survey Invitation</h1>
    <h2>${surveyInfo.title}</h2>
    ${surveyInfo.description ? `<p><strong>Description:</strong> ${surveyInfo.description}</p>` : ''}
    <p><strong>Question:</strong> ${surveyInfo.question}</p>
    
    <div style="background: #e9ecef; padding: 15px; border-radius: 6px; margin: 20px 0; font-family: monospace; text-align: center;">
        <strong>Your Access Token: ${tokenInfo.token}</strong>
    </div>
    
    <p>Use this token to access the survey. Keep it secure and private.</p>
    <a href="${surveyUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">🚀 Participate in Survey</a>
    
    <p><em>This is an automated message. Please do not reply.</em></p>
</body>
</html>`;
  }

  private generateTokenEmailText(tokenInfo: TokenInfo, surveyInfo: SurveyInfo, surveyUrl: string): string {
    return `
Survey Invitation
=================

Survey: ${surveyInfo.title}
${surveyInfo.description ? `Description: ${surveyInfo.description}\n` : ''}Question: ${surveyInfo.question}

Your Access Token: ${tokenInfo.token}

Use this token to access the survey at: ${surveyUrl}

Keep this token secure and private.

This is an automated message. Please do not reply.`;
  }

  isAvailable(): boolean {
    return this.transporter !== null;
  }
}
