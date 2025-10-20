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
}
