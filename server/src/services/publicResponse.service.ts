import db from '../config/database';
import { redisClient } from '../config/redis';
import { v4 as uuidv4 } from 'uuid';

export interface PublicResponseItem {
  id: string;
  surveyId: string;
  responseId: string;
  isPositive: boolean;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicResponseWithDetails extends PublicResponseItem {
  decryptedAnswer: string;
  commitmentHash: string;
}

export interface PublicResponseStats {
  totalSelected: number;
  positiveCount: number;
  negativeCount: number;
  positiveRate: number;
  negativeRate: number;
}

export class PublicResponseService {
  // Get all public responses for a survey with response details
  async getPublicResponses(surveyId: string): Promise<PublicResponseWithDetails[]> {
    const query = `
      SELECT 
        pr.id,
        pr.survey_id as "surveyId",
        pr.response_id as "responseId",
        pr.is_positive as "isPositive",
        pr.published_at as "publishedAt",
        pr.created_at as "createdAt",
        pr.updated_at as "updatedAt",
        sr.decrypted_answer as "decryptedAnswer",
        sr.commitment_hash as "commitmentHash"
      FROM public_responses pr
      JOIN survey_responses sr ON pr.response_id = sr.id
      WHERE pr.survey_id = $1
      ORDER BY pr.published_at DESC
    `;

    const result = await db.query(query, [surveyId]);
    return result.rows;
  }

  // Get public response statistics for a survey
  async getPublicResponseStats(surveyId: string): Promise<PublicResponseStats> {
    const query = `
      SELECT 
        COUNT(*) as "totalSelected",
        COUNT(CASE WHEN is_positive = true THEN 1 END) as "positiveCount",
        COUNT(CASE WHEN is_positive = false THEN 1 END) as "negativeCount"
      FROM public_responses
      WHERE survey_id = $1
    `;

    const result = await db.query(query, [surveyId]);
    const row = result.rows[0];
    
    const totalSelected = parseInt(row.totalSelected) || 0;
    const positiveCount = parseInt(row.positiveCount) || 0;
    const negativeCount = parseInt(row.negativeCount) || 0;
    
    return {
      totalSelected,
      positiveCount,
      negativeCount,
      positiveRate: totalSelected > 0 ? (positiveCount / totalSelected) * 100 : 0,
      negativeRate: totalSelected > 0 ? (negativeCount / totalSelected) * 100 : 0
    };
  }

  // Get all responses for a survey (for admin selection)
  async getAllResponsesForSelection(surveyId: string): Promise<Array<{
    id: string;
    decryptedAnswer: string;
    commitmentHash: string;
    createdAt: Date;
    isPublic: boolean;
    isPositive: boolean | null;
  }>> {
    const query = `
      SELECT 
        sr.id,
        sr.decrypted_answer as "decryptedAnswer",
        sr.commitment_hash as "commitmentHash",
        sr.created_at as "createdAt",
        CASE WHEN pr.id IS NOT NULL THEN true ELSE false END as "isPublic",
        pr.is_positive as "isPositive"
      FROM survey_responses sr
      LEFT JOIN public_responses pr ON sr.id = pr.response_id AND pr.survey_id = $1
      WHERE sr.survey_id = $1
      ORDER BY sr.created_at DESC
    `;

    const result = await db.query(query, [surveyId]);
    return result.rows;
  }

  // Update public responses for a survey
  async updatePublicResponses(surveyId: string, items: Array<{
    responseId: string;
    isPositive: boolean;
  }>): Promise<void> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // First, remove all existing public responses for this survey
      await client.query(
        'DELETE FROM public_responses WHERE survey_id = $1',
        [surveyId]
      );

      // Then insert the new selections
      for (const item of items) {
        await client.query(
          `INSERT INTO public_responses (id, survey_id, response_id, is_positive, published_at)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
          [uuidv4(), surveyId, item.responseId, item.isPositive]
        );
      }

      await client.query('COMMIT');

      // Clear cache
      await redisClient.del(`public_responses:${surveyId}`);
      await redisClient.del(`public_stats:${surveyId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Toggle public survey visibility
  async togglePublicVisibility(surveyId: string, isPublicEnabled: boolean): Promise<void> {
    const query = `
      UPDATE surveys 
      SET is_public_enabled = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await db.query(query, [surveyId, isPublicEnabled]);
    
    // Clear cache
    await redisClient.del(`survey:${surveyId}`);
    await redisClient.del(`survey:list`);
  }

  // Check if survey has public responses enabled
  async isPublicEnabled(surveyId: string): Promise<boolean> {
    const query = 'SELECT is_public_enabled FROM surveys WHERE id = $1';
    const result = await db.query(query, [surveyId]);
    
    if (result.rows.length === 0) {
      throw new Error('Survey not found');
    }
    
    return result.rows[0].is_public_enabled;
  }

  // Get public survey results (for public page)
  async getPublicSurveyResults(surveyId: string): Promise<{
    survey: {
      id: string;
      title: string;
      description: string;
      question: string;
      isPublished: boolean;
      publishedAt: Date;
    };
    responses: PublicResponseWithDetails[];
    stats: PublicResponseStats;
  }> {
    // Check if public is enabled
    const isEnabled = await this.isPublicEnabled(surveyId);
    if (!isEnabled) {
      throw new Error('Public survey is not enabled');
    }

    // Get survey info
    const surveyQuery = `
      SELECT id, title, description, question, is_published as "isPublished", published_at as "publishedAt"
      FROM surveys 
      WHERE id = $1 AND is_published = true
    `;
    const surveyResult = await db.query(surveyQuery, [surveyId]);
    
    if (surveyResult.rows.length === 0) {
      throw new Error('Survey not found or not published');
    }

    const survey = surveyResult.rows[0];
    const responses = await this.getPublicResponses(surveyId);
    const stats = await this.getPublicResponseStats(surveyId);

    return {
      survey,
      responses,
      stats
    };
  }
}

export const publicResponseService = new PublicResponseService();
