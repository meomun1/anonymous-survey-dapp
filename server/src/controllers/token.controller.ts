import { Request, Response } from 'express';
import { TokenService } from '../services/token.service';
import nodemailer from 'nodemailer';

const tokenService = new TokenService();

// Configure email transporter with fallback for development
const createTransporter = () => {
  // Check if SMTP is properly configured
  if (!process.env.SMTP_HOST || process.env.SMTP_HOST === 'your-smtp-host') {
    console.warn('⚠️ SMTP not configured, emails will be skipped');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const transporter = createTransporter();

export class TokenController {
  // Generate tokens for multiple students
  async generateBatchTokens(req: Request, res: Response) {
    try {
      const { surveyId, students } = req.body;
      
      if (!Array.isArray(students) || students.length === 0) {
        return res.status(400).json({ error: 'Invalid students data' });
      }

      const tokens = await tokenService.generateBatchTokens(surveyId, students);
      
      // Send tokens via email if transporter is configured
      if (transporter) {
        try {
          await Promise.all(tokens.map(async (token) => {
            await transporter.sendMail({
              from: process.env.SMTP_FROM,
              to: token.studentEmail,
              subject: 'Your Survey Token',
              html: `
                <h1>Survey Token</h1>
                <p>Your token for the survey is: <strong>${token.token}</strong></p>
                <p>Please use this token to access the survey.</p>
              `,
            });
          }));
          
          res.status(201).json({
            message: 'Tokens generated and sent successfully',
            count: tokens.length,
            tokens: tokens.map(t => ({ token: t.token, email: t.studentEmail }))
          });
        } catch (emailError) {
          console.warn('⚠️ Email sending failed, but tokens were created:', emailError);
          res.status(201).json({
            message: 'Tokens generated but email sending failed',
            count: tokens.length,
            tokens: tokens.map(t => ({ token: t.token, email: t.studentEmail })),
            warning: 'Emails could not be sent'
          });
        }
      } else {
        console.log('📧 SMTP not configured, tokens created without email notification');
        res.status(201).json({
          message: 'Tokens generated successfully (no email notification)',
          count: tokens.length,
          tokens: tokens.map(t => ({ token: t.token, email: t.studentEmail })),
          info: 'Email sending disabled - tokens shown for testing'
        });
      }
    } catch (error) {
      console.error('❌ Token generation error:', error);
      res.status(500).json({ error: 'Failed to generate tokens' });
    }
  }

  async validateToken(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const { surveyId } = req.query;
      
      const tokenData = await tokenService.validateToken(token, surveyId as string);
      
      if (!tokenData) {
        return res.status(404).json({ 
          error: 'Invalid token',
          details: 'Token is invalid or already completed'
        });
      }

      res.json({
        valid: true,
        token: tokenData.token,
        surveyId: tokenData.surveyId,
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
      const updatedToken = await tokenService.markTokenAsUsed(token);
      
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
      const updatedToken = await tokenService.markTokenAsCompleted(token);
      
      if (!updatedToken) {
        return res.status(404).json({ error: 'Token not found' });
      }

      res.json(updatedToken);
    } catch (error) {
      res.status(500).json({ error: 'Failed to mark token as completed' });
    }
  }

  async getSurveyTokens(req: Request, res: Response) {
    try {
      const { surveyId } = req.params;
      const tokens = await tokenService.getSurveyTokens(surveyId);
      res.json(tokens);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get survey tokens' });
    }
  }
} 