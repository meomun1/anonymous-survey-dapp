import { Request, Response } from 'express';
import { publicResponseService } from '../services/publicResponse.service';

export class PublicResponseController {
  // Get all responses for admin selection (admin only)
  async getResponsesForSelection(req: Request, res: Response) {
    try {
      const { surveyId } = req.params;
      
      const responses = await publicResponseService.getAllResponsesForSelection(surveyId);
      
      res.json({
        success: true,
        data: responses
      });
    } catch (error: any) {
      console.error('Error getting responses for selection:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get responses for selection'
      });
    }
  }

  // Update public responses (admin only)
  async updatePublicResponses(req: Request, res: Response) {
    try {
      const { surveyId } = req.params;
      const { items } = req.body;

      if (!Array.isArray(items)) {
        return res.status(400).json({
          success: false,
          error: 'Items must be an array'
        });
      }

      // Validate items structure
      for (const item of items) {
        if (!item.responseId || typeof item.isPositive !== 'boolean') {
          return res.status(400).json({
            success: false,
            error: 'Each item must have responseId and isPositive fields'
          });
        }
      }

      await publicResponseService.updatePublicResponses(surveyId, items);
      
      res.json({
        success: true,
        message: 'Public responses updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating public responses:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update public responses'
      });
    }
  }

  // Toggle public survey visibility (admin only)
  async togglePublicVisibility(req: Request, res: Response) {
    try {
      const { surveyId } = req.params;
      const { isPublicEnabled } = req.body;

      if (typeof isPublicEnabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'isPublicEnabled must be a boolean'
        });
      }

      await publicResponseService.togglePublicVisibility(surveyId, isPublicEnabled);
      
      res.json({
        success: true,
        message: `Public survey ${isPublicEnabled ? 'enabled' : 'disabled'} successfully`
      });
    } catch (error: any) {
      console.error('Error toggling public visibility:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to toggle public visibility'
      });
    }
  }

  // Get public survey results (public endpoint)
  async getPublicSurveyResults(req: Request, res: Response) {
    try {
      const { surveyId, id } = req.params as any;
      const effectiveSurveyId = surveyId || id;
      
      const results = await publicResponseService.getPublicSurveyResults(effectiveSurveyId);
      
      res.json({
        success: true,
        data: results
      });
    } catch (error: any) {
      // Downgrade logging for expected states to avoid noisy error logs
      if (error.message === 'Public survey is not enabled') {
        console.warn('Public survey not enabled for requested survey');
        return res.status(404).json({
          success: false,
          error: 'Public survey is not available'
        });
      }

      if (error.message === 'Survey not found or not published') {
        console.warn('Survey not found or not published for public results');
        return res.status(404).json({
          success: false,
          error: 'Survey not found or not published'
        });
      }

      console.error('Error getting public survey results:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get public survey results'
      });
    }
  }

  // Get public response statistics (admin only)
  async getPublicResponseStats(req: Request, res: Response) {
    try {
      const { surveyId } = req.params;
      
      const stats = await publicResponseService.getPublicResponseStats(surveyId);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error getting public response stats:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get public response statistics'
      });
    }
  }
}

export const publicResponseController = new PublicResponseController();
