import db from '../config/database';
import { Redis } from 'ioredis';
import crypto from 'crypto';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
});

/**
 * Service for managing student authentication tokens
 */
export class TokenService {
  /**
   * Generate campaign-level tokens for provided student emails
   */
  async generateCampaignTokens(campaignId: string, studentEmails: string[]) {
    const created: any[] = [];
    for (const email of studentEmails) {
      const tokenValue = this.generateToken();
      const id = crypto.randomUUID();
      const result = await db.query(
        `INSERT INTO survey_tokens (id, token, campaign_id, student_email)
         VALUES ($1, $2, $3, $4)
         RETURNING id, token, campaign_id, student_email, used, is_completed, created_at, used_at, completed_at`,
        [id, tokenValue, campaignId, email]
      );
      const row = result.rows[0];
      const record = {
        id: row.id,
        campaignId: row.campaign_id,
        token: row.token,
        studentEmail: row.student_email,
        used: !!row.used,
        isCompleted: !!row.is_completed,
        createdAt: row.created_at,
        usedAt: row.used_at,
        completedAt: row.completed_at
      };
      created.push(record);
      await redis.set(`token:${record.token}`, JSON.stringify(record), 'EX', 3600);
    }
    return created;
  }

  /**
   * Validate a campaign token (survey_tokens)
   */
  async validateCampaignToken(token: string) {
    const cached = await redis.get(`token:${token}`);
    if (cached) return JSON.parse(cached);

    const result = await db.query(
      `SELECT id, token, campaign_id, student_email, used, is_completed, created_at, used_at, completed_at
       FROM survey_tokens WHERE token = $1 LIMIT 1`,
      [token]
    );
    const row = result.rows[0];
    if (!row) return null;
    const tokenData = {
      id: row.id,
      campaignId: row.campaign_id,
      token: row.token,
      studentEmail: row.student_email,
      used: !!row.used,
      isCompleted: !!row.is_completed,
      createdAt: row.created_at,
      usedAt: row.used_at,
      completedAt: row.completed_at
    };
    await redis.set(`token:${token}`, JSON.stringify(tokenData), 'EX', 3600);
    return tokenData;
  }

  /**
   * Mark campaign token as used
   */
  async markCampaignTokenUsed(token: string) {
    const result = await db.query(
      `UPDATE survey_tokens SET used = true, used_at = NOW(), updated_at = NOW() WHERE token = $1
       RETURNING id, token, campaign_id, student_email, used, is_completed, created_at, used_at, completed_at`,
      [token]
    );
    const row = result.rows[0];
    if (!row) return null;
    const updated = {
      id: row.id,
      campaignId: row.campaign_id,
      token: row.token,
      studentEmail: row.student_email,
      used: !!row.used,
      isCompleted: !!row.is_completed,
      createdAt: row.created_at,
      usedAt: row.used_at,
      completedAt: row.completed_at
    };
    await redis.set(`token:${token}`, JSON.stringify(updated), 'EX', 3600);
    return updated;
  }

  /**
   * Mark campaign token as completed
   */
  async markCampaignTokenCompleted(token: string) {
    const result = await db.query(
      `UPDATE survey_tokens SET is_completed = true, completed_at = NOW(), updated_at = NOW() WHERE token = $1
       RETURNING id, token, campaign_id, student_email, used, is_completed, created_at, used_at, completed_at`,
      [token]
    );
    const row = result.rows[0];
    if (!row) return null;
    const updated = {
      id: row.id,
      campaignId: row.campaign_id,
      token: row.token,
      studentEmail: row.student_email,
      used: !!row.used,
      isCompleted: !!row.is_completed,
      createdAt: row.created_at,
      usedAt: row.used_at,
      completedAt: row.completed_at
    };
    await redis.set(`token:${token}`, JSON.stringify(updated), 'EX', 3600);
    return updated;
  }

  /**
   * Get tokens for a campaign
   */
  async getCampaignTokens(campaignId: string) {
    const result = await db.query(
      `SELECT id, token, campaign_id, student_email, used, is_completed, created_at, used_at, completed_at
       FROM survey_tokens WHERE campaign_id = $1 ORDER BY created_at DESC`,
      [campaignId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      campaignId: row.campaign_id,
      token: row.token,
      studentEmail: row.student_email,
      used: !!row.used,
      isCompleted: !!row.is_completed,
      createdAt: row.created_at,
      usedAt: row.used_at,
      completedAt: row.completed_at
    }));
  }

  /**
   * Get tokens for a student (optionally filtered by campaign)
   */
  async getStudentTokens(studentEmail: string, campaignId?: string) {
    const result = await db.query(
      `SELECT id, token, campaign_id, student_email, used, is_completed, created_at, used_at, completed_at
       FROM survey_tokens
       WHERE student_email = $1 ${campaignId ? 'AND campaign_id = $2' : ''}
       ORDER BY created_at DESC`,
      campaignId ? [studentEmail, campaignId] : [studentEmail]
    );
    return result.rows.map((row) => ({
      id: row.id,
      campaignId: row.campaign_id,
      token: row.token,
      studentEmail: row.student_email,
      used: !!row.used,
      isCompleted: !!row.is_completed,
      createdAt: row.created_at,
      usedAt: row.used_at,
      completedAt: row.completed_at
    }));
  }

  // Generate a secure random token (shared)
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
} 