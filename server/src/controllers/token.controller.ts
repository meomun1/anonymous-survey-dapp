import { Request, Response } from 'express';
import { TokenService } from '../services/token.service';
import { EmailService } from '../services/email.service';
import { SurveyService } from '../services/survey.service';
import { CryptoService } from '../services/crypto.service';
import crypto from 'crypto';
import db from '../config/database';

const tokenService = new TokenService();
const emailService = new EmailService();
const surveyService = new SurveyService();
const cryptoService = new CryptoService();

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
          details: 'Token is invalid, campaign is not available, or already completed'
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

  async verifyToken(req: Request, res: Response) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }

      const tokenData = await tokenService.validateCampaignToken(token);

      if (!tokenData) {
        return res.status(404).json({
          error: 'Invalid token',
          details: 'Token is invalid, campaign is not available, or already completed'
        });
      }

      res.json({
        valid: true,
        tokenData: {
          token: tokenData.token,
          campaignId: tokenData.campaignId,
          studentEmail: tokenData.studentEmail,
          isCompleted: tokenData.isCompleted
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to verify token' });
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

  async markTokenBlockchainSubmitted(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const updatedToken = await tokenService.markTokenBlockchainSubmitted(token);

      if (!updatedToken) {
        return res.status(404).json({ error: 'Token not found' });
      }

      res.json(updatedToken);
    } catch (error) {
      res.status(500).json({ error: 'Failed to mark token as blockchain submitted' });
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

  async getStudentSurveys(req: Request, res: Response) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }

      // Validate the token
      const tokenData = await tokenService.validateCampaignToken(token);

      if (!tokenData) {
        return res.status(404).json({ error: 'Invalid token' });
      }

      // Get all surveys for this student's token
      const surveys = await surveyService.getStudentSurveys(token);

      res.json({
        surveys,
        studentName: tokenData.studentEmail.split('@')[0] // Extract name from email
      });
    } catch (error) {
      console.error('Failed to get student surveys:', error);
      res.status(500).json({ error: 'Failed to get student surveys' });
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

  /**
   * Phase 1: Get Ticket & Surveys
   * GET /api/login
   * Authorization: Bearer <token>
   */
  async getTicketAndSurveys(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing authorization header' });
      }

      const token = authHeader.substring(7);
      // Get surveys for token with enrollment data
      const result = await tokenService.getSurveysForToken(token);
      if (!result) {
        return res.status(404).json({ error: 'Invalid token' });
      }

      // Check if ticket already issued AND token already used (Phase 1.2 complete)
      // Allow re-issuing ticket if token not yet used (student can resume after closing tab)
      if (result.ticket && result.used) {
        return res.status(409).json({
          error: 'Workflow already started',
          details: 'This token has already completed Phase 1. Please continue from where you left off.'
        });
      }

      // Generate ticket commitment based on survey count
      const ticketCommitment = tokenService.generateTicketCommitment(result.surveys.length);

      // Mark ticket as issued (idempotent - safe to call multiple times)
      if (!result.ticket) {
        await tokenService.markTicketIssued(token);
      }

      res.json({
        surveys: result.surveys,
        ticketCommitment,
        campaignId: result.campaignId
      });
    } catch (error) {
      console.error('❌ Get ticket error:', error);
      res.status(500).json({ error: 'Failed to get ticket and surveys' });
    }
  }

  /**
   * Phase 1: Sign Blinded Token
   * POST /api/blind-sign-token
   * Authorization: Bearer <token>
   */
  async blindSignToken(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing authorization header' });
      }

      const token = authHeader.substring(7);
      const { blindedToken, campaignId } = req.body;

      if (!blindedToken || !campaignId) {
        return res.status(400).json({ error: 'blindedToken and campaignId are required' });
      }

      // Validate token exists and not yet used
      const tokenData = await tokenService.validateCampaignToken(token);

      if (!tokenData) {
        return res.status(404).json({ error: 'Invalid token' });
      }

      if (tokenData.used) {
        return res.status(409).json({
          error: 'Token already used',
          details: 'This credential has already been used'
        });
      }

      if (tokenData.campaignId !== campaignId) {
        return res.status(400).json({ error: 'Campaign ID mismatch' });
      }

      // Sign the blinded token
      const blindedTokenBuffer = Buffer.from(blindedToken, 'base64');
      const blindSignature = await cryptoService.blindSignCampaign(campaignId, blindedTokenBuffer);

      // Mark token as used
      await tokenService.markCampaignTokenUsed(token);

      res.json({
        blindSignature: Buffer.from(blindSignature).toString('base64')
      });
    } catch (error) {
      console.error('❌ Blind sign token error:', error);
      res.status(500).json({ error: 'Failed to sign blinded token' });
    }
  }

  /**
   * Phase 4: Claim Participation
   * POST /api/participation/claim
   * Authorization: Bearer <preparedReceipt>.<receiptSignature>
   */
  async claimParticipation(req: Request, res: Response) {
    try {
      // Middleware has already verified receipt signature and attached receiptAuth
      if (!req.receiptAuth) {
        return res.status(401).json({ error: 'Receipt signature verification required' });
      }

      const { preparedReceipt, receiptSignature, campaignId } = req.receiptAuth;
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'email is required' });
      }

      // Look up token by email and campaignId
      const tokenResult = await db.query(
        `SELECT id, token, used, is_completed FROM survey_tokens
         WHERE student_email = $1 AND campaign_id = $2 LIMIT 1`,
        [email, campaignId]
      );

      if (tokenResult.rowCount === 0) {
        return res.status(404).json({ error: 'Token not found for this email and campaign' });
      }

      const tokenData = tokenResult.rows[0];

      // Verify token was authorized (used = true)
      if (!tokenData.used) {
        return res.status(400).json({
          error: 'Token not authorized',
          details: 'This token has not been used for authorization yet'
        });
      }

      // Check if already completed
      if (tokenData.is_completed) {
        return res.status(409).json({
          error: 'Participation already claimed',
          details: 'This token has already been marked as completed'
        });
      }

      // Mark token as completed
      await tokenService.markCampaignTokenCompleted(tokenData.token);

      // Store receipt signature as used
      await db.query(
        `INSERT INTO used_claim_signatures (id, prepared_receipt, receipt_signature, campaign_id, student_email, claimed_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [crypto.randomUUID(), preparedReceipt, receiptSignature, campaignId, email]
      );

      res.json({
        success: true,
        participationRecorded: true,
        claimedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('❌ Claim participation error:', error);
      res.status(500).json({ error: 'Failed to claim participation', details: error.message });
    }
  }
} 