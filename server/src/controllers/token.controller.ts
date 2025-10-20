import { Request, Response } from 'express';
import { TokenService } from '../services/token.service';
import { EmailService } from '../services/email.service';
import { SurveyService } from '../services/survey.service';

const tokenService = new TokenService();
const emailService = new EmailService();
const surveyService = new SurveyService();

export class TokenController {
  // Generate campaign tokens for multiple students (optional direct API)
  async generateCampaignTokens(req: Request, res: Response) {
    try {
      const { campaignId, studentEmails } = req.body;
      
      if (!campaignId || !Array.isArray(studentEmails) || studentEmails.length === 0) {
        return res.status(400).json({ error: 'campaignId and studentEmails[] are required' });
      }

      const tokens = await tokenService.generateCampaignTokens(campaignId, studentEmails);
      // Send campaign emails best-effort
      let emailResult: any = null;
      if (emailService.isAvailable()) {
        try {
          emailResult = await emailService.sendCampaignTokens(campaignId);
        } catch (e) {
          console.warn('⚠️ Failed to send campaign emails:', e);
        }
      }
      res.status(201).json({
        message: 'Campaign tokens generated',
        count: tokens.length,
        emails: emailResult
      });
    } catch (error) {
      console.error('❌ Token generation error:', error);
      res.status(500).json({ error: 'Failed to generate tokens' });
    }
  }

  async validateToken(req: Request, res: Response) {
    try {
      const { token } = req.params;
      
      const tokenData = await tokenService.validateCampaignToken(token);
      
      if (!tokenData) {
        return res.status(404).json({ 
          error: 'Invalid token',
          details: 'Token is invalid or already completed'
        });
      }

      res.json({
        valid: true,
        token: tokenData.token,
        campaignId: tokenData.campaignId,
        studentEmail: tokenData.studentEmail,
        isCompleted: tokenData.isCompleted
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to validate token' });
    }
  }

  async markTokenAsUsed(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const updatedToken = await tokenService.markCampaignTokenUsed(token);
      
      if (!updatedToken) {
        return res.status(404).json({ error: 'Token not found' });
      }

      res.json(updatedToken);
    } catch (error) {
      res.status(500).json({ error: 'Failed to mark token as used' });
    }
  }

  async markTokenAsCompleted(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const updatedToken = await tokenService.markCampaignTokenCompleted(token);
      
      if (!updatedToken) {
        return res.status(404).json({ error: 'Token not found' });
      }

      res.json(updatedToken);
    } catch (error) {
      res.status(500).json({ error: 'Failed to mark token as completed' });
    }
  }

  async getCampaignTokens(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;
      const tokens = await tokenService.getCampaignTokens(campaignId);
      res.json(tokens);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get campaign tokens' });
    }
  }

  async getStudentTokens(req: Request, res: Response) {
    try {
      const { email } = req.params;
      const { campaignId } = req.query;
      const tokens = await tokenService.getStudentTokens(email, campaignId as string | undefined);
      res.json(tokens);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get student tokens' });
    }
  }

  // Test email service and SMTP connection
  async testEmailService(req: Request, res: Response) {
    try {
      const status = {
        available: emailService.isAvailable(),
        smtpTested: false,
        message: ''
      };

      if (status.available) {
        try {
          const connectionTest = await emailService.testConnection();
          status.smtpTested = true;
          status.message = connectionTest ? 'SMTP connection successful' : 'SMTP connection failed';
        } catch (error) {
          status.message = `SMTP test error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      } else {
        status.message = 'Email service not available - check SMTP configuration';
      }

      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Failed to test email service' });
    }
  }
} 