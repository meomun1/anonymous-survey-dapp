import { Request, Response } from 'express';
import { CampaignService } from '../services/campaign.service';

const campaignService = new CampaignService();

export class CampaignController {
  // ============================================================================
  // CAMPAIGN CRUD OPERATIONS
  // ============================================================================

  async createCampaign(req: Request, res: Response) {
    try {
      const { name, type, semesterId } = req.body;
      const createdBy = (req as any).user?.id; // Assuming auth middleware sets req.user
      
      if (!createdBy) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const campaign = await campaignService.createCampaign({
        name,
        type,
        semesterId,
        createdBy,
      });

      res.status(201).json(campaign);
    } catch (error) {
      console.error('Failed to create campaign:', error);
      res.status(500).json({ error: 'Failed to create campaign' });
    }
  }

  async getCampaigns(req: Request, res: Response) {
    try {
      const { status, type, semesterId } = req.query;
      
      const campaigns = await campaignService.getCampaigns({
        status: status as string,
        type: type as string,
        semesterId: semesterId as string
      });
      res.json(campaigns);
    } catch (error) {
      console.error('Failed to get campaigns:', error);
      res.status(500).json({ error: 'Failed to get campaigns' });
    }
  }

  async getCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const campaign = await campaignService.getCampaign(id);
      res.json(campaign);
    } catch (error) {
      console.error('Failed to get campaign:', error);
      if (error instanceof Error && error.message === 'Campaign not found') {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      res.status(500).json({ error: 'Failed to get campaign' });
    }
  }

  async updateCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, type, status } = req.body;
      
      const campaign = await campaignService.updateCampaign(id, {
        name,
        type,
        status,
      });

      res.json(campaign);
    } catch (error) {
      console.error('Failed to update campaign:', error);
      if (error instanceof Error && error.message === 'Campaign not found') {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      res.status(500).json({ error: 'Failed to update campaign' });
    }
  }

  async deleteCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const campaign = await campaignService.deleteCampaign(id);
      res.json(campaign);
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      if (error instanceof Error && error.message === 'Campaign not found') {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      if (error instanceof Error && error.message.includes('Cannot delete campaign')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to delete campaign' });
    }
  }

  // ============================================================================
  // CAMPAIGN WORKFLOW OPERATIONS
  // ============================================================================

  async openCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const campaign = await campaignService.openCampaign(id);
      res.json(campaign);
    } catch (error) {
      console.error('Failed to open campaign:', error);
      if (error instanceof Error && error.message.includes('not found or not in draft status')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to open campaign' });
    }
  }

  async closeCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const campaign = await campaignService.closeCampaign(id);
      res.json(campaign);
    } catch (error) {
      console.error('Failed to close campaign:', error);
      if (error instanceof Error && error.message.includes('not found or not in teachers_input status')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to close campaign' });
    }
  }

  async launchCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await campaignService.launchCampaign(id);
      res.json(result);
    } catch (error) {
      console.error('Failed to launch campaign:', error);
      if (error instanceof Error && error.message.includes('not found or not in open status')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to launch campaign' });
    }
  }

  /**
   * Publish responses Merkle root to blockchain (Tree #1)
   * NEW: Replaces old publishCampaign
   */
  async publishCampaignResponses(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await campaignService.publishCampaignResponses(id);
      res.json({
        success: true,
        message: 'Responses Merkle root published successfully',
        merkleRoot: result.merkleRoot,
        totalResponses: result.totalResponses
      });
    } catch (error) {
      console.error('Failed to publish campaign responses:', error);
      if (error instanceof Error && error.message.includes('Campaign not found')) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      if (error instanceof Error && error.message.includes('No responses found')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to publish campaign responses' });
    }
  }

  /**
   * Publish claimed receipts Merkle root to blockchain (Tree #2)
   * NEW: Can be called multiple times for batched updates
   */
  async publishClaimedReceipts(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await campaignService.publishClaimedReceipts(id);
      res.json({
        success: true,
        message: 'Claimed receipts Merkle root published successfully',
        merkleRoot: result.merkleRoot,
        totalClaimed: result.totalClaimed
      });
    } catch (error) {
      console.error('Failed to publish claimed receipts:', error);
      if (error instanceof Error && error.message.includes('Campaign not found')) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      if (error instanceof Error && error.message.includes('No claimed receipts found')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to publish claimed receipts' });
    }
  }

  /**
   * Close campaign on blockchain (prevents further updates)
   * NEW
   */
  async closeCampaignOnBlockchain(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const signature = await campaignService.closeCampaignOnBlockchain(id);
      res.json({
        success: true,
        message: 'Campaign closed on blockchain successfully',
        signature
      });
    } catch (error) {
      console.error('Failed to close campaign on blockchain:', error);
      if (error instanceof Error && error.message.includes('Blockchain service not available')) {
        return res.status(503).json({ error: 'Blockchain service not available' });
      }
      res.status(500).json({ error: 'Failed to close campaign on blockchain' });
    }
  }

  /**
   * Publish campaign - change status to published
   * This should be called after Merkle roots are published to blockchain
   */
  async publishCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Simply update status to published
      const campaign = await campaignService.updateCampaign(id, { status: 'published' });
      res.json(campaign);
    } catch (error) {
      console.error('Failed to publish campaign:', error);
      if (error instanceof Error && error.message === 'Campaign not found') {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      res.status(500).json({ error: 'Failed to publish campaign' });
    }
  }

  // ============================================================================
  // SURVEY MANAGEMENT WITHIN CAMPAIGNS
  // ============================================================================

  async getCampaignSurveys(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const surveys = await campaignService.getCampaignSurveys(id);
      res.json(surveys);
    } catch (error) {
      console.error('Failed to get campaign surveys:', error);
      res.status(500).json({ error: 'Failed to get campaign surveys' });
    }
  }

  async createSurveysFromAssignments(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const surveys = await campaignService.createSurveysFromAssignments(id);
      res.status(201).json(surveys);
    } catch (error) {
      console.error('Failed to create surveys from assignments:', error);
      if (error instanceof Error && error.message.includes('Can only create surveys')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to create surveys from assignments' });
    }
  }

  // ============================================================================
  // CAMPAIGN STATISTICS AND ANALYTICS
  // ============================================================================

  async getCampaignStats(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const stats = await campaignService.getCampaignStats(id);
      res.json(stats);
    } catch (error) {
      console.error('Failed to get campaign stats:', error);
      if (error instanceof Error && error.message === 'Campaign not found') {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      res.status(500).json({ error: 'Failed to get campaign stats' });
    }
  }

  async getCampaignAnalytics(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const analytics = await campaignService.getCampaignAnalytics(id);
      res.json(analytics);
    } catch (error) {
      console.error('Failed to get campaign analytics:', error);
      if (error instanceof Error && error.message === 'Campaign not found') {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      res.status(500).json({ error: 'Failed to get campaign analytics' });
    }
  }
}
