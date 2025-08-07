import { Request, Response } from 'express';
import { SurveyService } from '../services/survey.service';

const surveyService = new SurveyService();

export class SurveyController {
  async createSurvey(req: Request, res: Response) {
    try {
      const { title, description, question } = req.body;
      
      const survey = await surveyService.createSurvey({
        title,
        description,
        question,
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

  async getSurveyStats(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const stats = await surveyService.getSurveyStats(id);
      res.json(stats);
    } catch (error) {
      console.error('Failed to get survey stats:', error);
      if (error instanceof Error && error.message === 'Survey not found') {
        return res.status(404).json({ error: 'Survey not found' });
      }
      res.status(500).json({ error: 'Failed to get survey stats' });
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

  async getSurveyResults(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const results = await surveyService.getSurveyResults(id);
      res.json(results);
    } catch (error: any) {
      console.error('Failed to get survey results:', error);
      if (error.message === 'Survey not found') {
        return res.status(404).json({ error: 'Survey not found' });
      }
      if (error.message === 'Survey is not yet published') {
        return res.status(400).json({ error: 'Survey is not yet published' });
      }
      res.status(500).json({ error: 'Failed to get survey results' });
    }
  }

  async publishSurveyWithMerkleProof(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await surveyService.publishSurveyWithMerkleProof(id);
      res.json(result);
    } catch (error: any) {
      console.error('Failed to publish survey with Merkle proof:', error);
      if (error.message === 'Survey not found') {
        return res.status(404).json({ error: 'Survey not found' });
      }
      res.status(500).json({ error: 'Failed to publish survey with Merkle proof' });
    }
  }

  async getSurveyPublicKeys(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const publicKeys = await surveyService.getSurveyPublicKeys(id);
      
      // Convert buffers to base64 for JSON transmission
      const response = {
        blindSignaturePublicKey: Buffer.from(publicKeys.blindSignaturePublicKey).toString('base64'),
        encryptionPublicKey: Buffer.from(publicKeys.encryptionPublicKey).toString('base64')
      };
      
      res.json(response);
    } catch (error: any) {
      console.error('Failed to get survey public keys:', error);
      if (error.message === 'Survey not found') {
        return res.status(404).json({ error: 'Survey not found' });
      }
      res.status(500).json({ error: 'Failed to get survey public keys' });
    }
  }
} 