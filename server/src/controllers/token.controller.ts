import { Request, Response } from 'express';
import { TokenService } from '../services/token.service';
import { EmailService } from '../services/email.service';
import { SurveyService } from '../services/survey.service';

const tokenService = new TokenService();
const emailService = new EmailService();
const surveyService = new SurveyService();

export class TokenController {
  // Generate tokens for multiple students
  async generateBatchTokens(req: Request, res: Response) {
    try {
      const { surveyId, students } = req.body;
      
      if (!Array.isArray(students) || students.length === 0) {
        return res.status(400).json({ error: 'Invalid students data' });
      }

      // Generate tokens first
      const tokens = await tokenService.generateBatchTokens(surveyId, students);
      
      // Get survey information for email
      const survey = await surveyService.getSurvey(surveyId);
      if (!survey) {
        return res.status(404).json({ error: 'Survey not found' });
      }

      // Send tokens via email
      if (emailService.isAvailable()) {
        try {
          const emailResults = await emailService.sendBatchSurveyTokens(
            tokens.map(t => ({ token: t.token, studentEmail: t.studentEmail })),
            {
              id: survey.id,
              shortId: survey.shortId,
              title: survey.title,
              description: survey.description,
              question: survey.question
            }
          );

          if (emailResults.success > 0) {
            console.log(`📧 Successfully sent ${emailResults.success} survey tokens via email`);
          }
          
          if (emailResults.failed > 0) {
            console.warn(`⚠️ Failed to send ${emailResults.failed} survey tokens via email`);
          }

          res.status(201).json({
            message: 'Tokens generated and emails sent',
            count: tokens.length,
            emailsSent: emailResults.success,
            emailsFailed: emailResults.failed,
            tokens: tokens.map(t => ({ token: t.token, email: t.studentEmail })),
            emailDetails: emailResults.details
          });
        } catch (emailError) {
          console.warn('⚠️ Email sending failed, but tokens were created:', emailError);
          res.status(201).json({
            message: 'Tokens generated but email sending failed',
            count: tokens.length,
            tokens: tokens.map(t => ({ token: t.token, email: t.studentEmail })),
            warning: 'Emails could not be sent',
            error: emailError instanceof Error ? emailError.message : 'Unknown error'
          });
        }
      } else {
        console.log('📧 Email service not available, tokens created without email notification');
        res.status(201).json({
          message: 'Tokens generated successfully (no email notification)',
          count: tokens.length,
          tokens: tokens.map(t => ({ token: t.token, email: t.studentEmail })),
          info: 'Email service disabled - tokens shown for testing'
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