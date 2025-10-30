import { Request, Response } from 'express';
import { SurveyService } from '../services/survey.service';

const surveyService = new SurveyService();

export class SurveyController {
  async createSurvey(req: Request, res: Response) {
    try {
      const { campaignId, title, description, templateId, courseId, teacherId, status } = req.body;
      if (!campaignId || !title) {
        return res.status(400).json({ error: 'campaignId and title are required' });
      }
      
      const survey = await surveyService.createSurvey({
        campaignId,
        title,
        description,
        templateId,
        courseId,
        teacherId,
        status,
      });

      res.status(201).json(survey);
    } catch (error) {
      console.error('Failed to create survey:', error);
      res.status(500).json({ error: 'Failed to create survey' });
    }
  }

  async getSurvey(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const survey = await surveyService.getSurvey(id);
      res.json(survey);
    } catch (error) {
      console.error('Failed to get survey:', error);
      if (error instanceof Error && error.message === 'Survey not found') {
        return res.status(404).json({ error: 'Survey not found' });
      }
      res.status(500).json({ error: 'Failed to get survey' });
    }
  }

  async getAllSurveys(req: Request, res: Response) {
    try {
      const surveys = await surveyService.getAllSurveys();
      res.json(surveys);
    } catch (error) {
      console.error('Failed to get surveys:', error);
      res.status(500).json({ error: 'Failed to get surveys' });
    }
  }

  async deleteSurvey(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await surveyService.deleteSurvey(id);
      res.json(result);
    } catch (error) {
      console.error('Failed to delete survey:', error);
      if (error instanceof Error && error.message === 'Survey not found') {
        return res.status(404).json({ error: 'Survey not found' });
      }
      res.status(500).json({ error: 'Failed to delete survey' });
    }
  }

  async updateSurvey(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { title, description, templateId } = req.body;
      
      const survey = await surveyService.updateSurvey(id, {
        title,
        description,
        templateId,
      });
  
      res.json(survey);
    } catch (error) {
      console.error('Failed to update survey:', error);
      res.status(500).json({ error: 'Failed to update survey' });
    }
  }

  // New: get surveys by campaign
  async getSurveysByCampaign(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;
      const surveys = await surveyService.getSurveysByCampaign(campaignId);
      res.json(surveys);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get campaign surveys' });
    }
  }

  // New: get eligible surveys for a token
  async getSurveysForToken(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const surveys = await surveyService.getSurveysForToken(token);
      res.json(surveys);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get surveys for token' });
    }
  }
} 