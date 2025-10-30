import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { CryptoService } from '../services/crypto.service';

const analyticsService = new AnalyticsService();
const cryptoService = new CryptoService();

export class AnalyticsController {
  // ============================================================================
  // MERKLE TREE CALCULATIONS
  // ============================================================================

  async calculateMerkleRoot(req: Request, res: Response) {
    try {
      const { commitments } = req.body;
      
      if (!Array.isArray(commitments) || commitments.length === 0) {
        return res.status(400).json({ error: 'Commitments array is required' });
      }

      const merkleRoot = await cryptoService.calculateMerkleRoot(commitments);
      res.json({ merkleRoot });
    } catch (error) {
      console.error('Failed to calculate Merkle root:', error);
      res.status(500).json({ error: 'Failed to calculate Merkle root' });
    }
  }

  async calculateFinalMerkleRoot(req: Request, res: Response) {
    try {
      const { campaignRoots } = req.body;
      
      if (!Array.isArray(campaignRoots) || campaignRoots.length === 0) {
        return res.status(400).json({ error: 'Campaign roots array is required' });
      }

      const finalMerkleRoot = await cryptoService.calculateFinalMerkleRoot(campaignRoots);
      res.json({ finalMerkleRoot });
    } catch (error) {
      console.error('Failed to calculate final Merkle root:', error);
      res.status(500).json({ error: 'Failed to calculate final Merkle root' });
    }
  }

  async generateMerkleProof(req: Request, res: Response) {
    try {
      const { commitments, targetCommitment } = req.body;
      
      if (!Array.isArray(commitments) || !targetCommitment) {
        return res.status(400).json({ error: 'Commitments array and target commitment are required' });
      }

      const proof = await cryptoService.generateMerkleProof(commitments, targetCommitment);
      res.json({ proof });
    } catch (error) {
      console.error('Failed to generate Merkle proof:', error);
      if (error instanceof Error && error.message.includes('Target commitment not found')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to generate Merkle proof' });
    }
  }

  async verifyMerkleProof(req: Request, res: Response) {
    try {
      const { commitment, proof, root } = req.body;

      if (!commitment || !proof || !root) {
        return res.status(400).json({ error: 'Commitment, proof, and root are required' });
      }

      const isValid = await cryptoService.verifyMerkleProof(commitment, proof, root);
      res.json({ isValid });
    } catch (error) {
      console.error('Failed to verify Merkle proof:', error);
      res.status(500).json({ error: 'Failed to verify Merkle proof' });
    }
  }

  async calculateCampaignMerkleRoot(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;
      const result = await analyticsService.calculateCampaignMerkleRoot(campaignId);
      res.json(result);
    } catch (error) {
      console.error('Failed to calculate campaign Merkle root:', error);
      if (error instanceof Error && error.message === 'Campaign not found') {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      if (error instanceof Error && error.message === 'No responses found for this campaign') {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to calculate campaign Merkle root' });
    }
  }

  async getCampaignMerkleRoot(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;
      const result = await analyticsService.getCampaignMerkleRoot(campaignId);
      res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'Campaign not found') {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      if (error instanceof Error && error.message === 'Merkle root not calculated for this campaign') {
        // This is expected - campaign hasn't been published yet, so no merkle root exists
        // Don't log as error, just return 404
        return res.status(404).json({ error: error.message });
      }
      console.error('Failed to get campaign Merkle root:', error);
      res.status(500).json({ error: 'Failed to get campaign Merkle root' });
    }
  }

  // ============================================================================
  // CAMPAIGN ANALYTICS
  // ============================================================================

  async generateCampaignAnalytics(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;
      const analytics = await analyticsService.generateCampaignAnalytics(campaignId);
      res.json(analytics);
    } catch (error) {
      console.error('Failed to generate campaign analytics:', error);
      if (error instanceof Error && error.message === 'Campaign not found') {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      if (error instanceof Error && error.message === 'No responses found for campaign') {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to generate campaign analytics' });
    }
  }

  // ============================================================================
  // TEACHER PERFORMANCE TRACKING
  // ============================================================================

  async getTeacherPerformance(req: Request, res: Response) {
    try {
      const { teacherId } = req.params;
      const { campaignIds } = req.query;
      
      const performance = await analyticsService.getTeacherPerformance(
        teacherId,
        campaignIds ? (campaignIds as string).split(',') : undefined
      );
      res.json(performance);
    } catch (error) {
      console.error('Failed to get teacher performance:', error);
      res.status(500).json({ error: 'Failed to get teacher performance' });
    }
  }

  async verifyTeacherPerformance(req: Request, res: Response) {
    try {
      const { teacherId } = req.params;
      const { campaignId } = req.body;
      
      if (!campaignId) {
        return res.status(400).json({ error: 'Campaign ID is required' });
      }

      const isVerified = await analyticsService.verifyTeacherPerformance(teacherId, campaignId);
      res.json({ verified: isVerified });
    } catch (error) {
      console.error('Failed to verify teacher performance:', error);
      if (error instanceof Error && error.message.includes('No commitments found')) {
        return res.status(400).json({ error: error.message });
      }
      if (error instanceof Error && error.message.includes('No Merkle root found')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to verify teacher performance' });
    }
  }

  // ============================================================================
  // STUDENT COMPLETION TRACKING
  // ============================================================================

  async generateStudentCompletion(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;
      const completion = await analyticsService.generateStudentCompletion(campaignId);
      res.json(completion);
    } catch (error) {
      console.error('Failed to generate student completion:', error);
      res.status(500).json({ error: 'Failed to generate student completion' });
    }
  }

  async getStudentCompletion(req: Request, res: Response) {
    try {
      const { studentEmail, campaignId } = req.params;
      const completion = await analyticsService.getStudentCompletion(studentEmail, campaignId);
      res.json(completion);
    } catch (error) {
      console.error('Failed to get student completion:', error);
      if (error instanceof Error && error.message === 'Student completion data not found') {
        return res.status(404).json({ error: 'Student completion data not found' });
      }
      res.status(500).json({ error: 'Failed to get student completion' });
    }
  }

  // ============================================================================
  // UNIVERSITY-WIDE ANALYTICS
  // ============================================================================

  async getUniversityAnalytics(req: Request, res: Response) {
    try {
      const analytics = await analyticsService.getUniversityAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error('Failed to get university analytics:', error);
      res.status(500).json({ error: 'Failed to get university analytics' });
    }
  }

  async getSchoolAnalytics(req: Request, res: Response) {
    try {
      const { schoolId } = req.params;
      const analytics = await analyticsService.getSchoolAnalytics(schoolId);
      res.json(analytics);
    } catch (error) {
      console.error('Failed to get school analytics:', error);
      if (error instanceof Error && error.message === 'School not found') {
        return res.status(404).json({ error: 'School not found' });
      }
      res.status(500).json({ error: 'Failed to get school analytics' });
    }
  }

  // ============================================================================
  // ACCREDITATION DATA GENERATION
  // ============================================================================

  async generateAccreditationData(req: Request, res: Response) {
    try {
      const { teacherId } = req.params;
      const { campaignIds } = req.body;
      
      if (!Array.isArray(campaignIds) || campaignIds.length === 0) {
        return res.status(400).json({ error: 'Campaign IDs array is required' });
      }

      const accreditationData = await analyticsService.generateAccreditationData(teacherId, campaignIds);
      res.json(accreditationData);
    } catch (error) {
      console.error('Failed to generate accreditation data:', error);
      if (error instanceof Error && error.message === 'Teacher not found') {
        return res.status(404).json({ error: 'Teacher not found' });
      }
      res.status(500).json({ error: 'Failed to generate accreditation data' });
    }
  }
}
