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
   * Generate a secure random token
   * @returns {string} 64-character hex token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create tokens for multiple students
   * @param {string} surveyId - Survey ID to associate tokens with
   * @param {Array} students - Array of student objects with email
   * @returns {Promise<Array>} Created token records
   */
  async generateBatchTokens(surveyId: string, students: { email: string }[]) {
    const tokens = await Promise.all(
      students.map(async (student) => {
        const tokenValue = this.generateToken();
        const id = crypto.randomUUID();
        const result = await db.query(
          `INSERT INTO tokens (id, survey_id, token, student_email, used, "isCompleted", created_at, updated_at)
           VALUES ($1, $2, $3, $4, false, false, NOW(), NOW())
           RETURNING id, survey_id, token, student_email, used, "isCompleted", created_at, updated_at`,
          [id, surveyId, tokenValue, student.email]
        );
        const row = result.rows[0];
        return {
          id: row.id,
          surveyId: row.survey_id,
          token: row.token,
          studentEmail: row.student_email,
          used: row.used,
          isCompleted: row.isCompleted ?? row.iscompleted ?? row["isCompleted"],
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        } as any;
      })
    );

    // Cache the tokens
    await Promise.all(
      tokens.map(token => 
        redis.set(`token:${token.token}`, JSON.stringify(token), 'EX', 3600)
      )
    );

    return tokens;
  }

  /**
   * Validate if a token can be used for survey participation
   * @param {string} token - Token to validate
   * @param {string} surveyId - Optional survey ID to check against
   * @returns {Promise<Object|null>} Token data if valid, null if invalid
   */
  async validateToken(token: string, surveyId?: string) {
    // Try to get from cache first
    const cachedToken = await redis.get(`token:${token}`);
    if (cachedToken) {
      const tokenData = JSON.parse(cachedToken);
      if (this.isTokenValid(tokenData, surveyId)) {
        return tokenData;
      }
      return null;
    }

    // If not in cache, get from database
    const result = await db.query(
      `SELECT id, survey_id, token, student_email, used, "isCompleted" AS "isCompleted", created_at, updated_at
       FROM tokens WHERE token = $1 LIMIT 1`,
      [token]
    );
    const row = result.rows[0];
    const tokenData = row
      ? {
          id: row.id,
          surveyId: row.survey_id,
          token: row.token,
          studentEmail: row.student_email,
          used: row.used,
          isCompleted: row.isCompleted,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      : null;

    if (!tokenData) return null;

    // Cache the token if it's valid
    if (this.isTokenValid(tokenData, surveyId)) {
      await redis.set(`token:${token}`, JSON.stringify(tokenData), 'EX', 3600);
      return tokenData;
    }

    return null;
  }

  /**
   * Check if token meets validation criteria
   * @param {any} tokenData - Token object to validate
   * @param {string} surveyId - Optional survey ID to check
   * @returns {boolean} True if valid
   */
  private isTokenValid(tokenData: any, surveyId?: string): boolean {
    if (!tokenData) return false;
    
    // Only check if token is completed
    if (tokenData.isCompleted) return false;
    
    // Check if token belongs to the correct survey (if surveyId provided)
    if (surveyId && tokenData.surveyId !== surveyId) return false;
    
    return true;
  }

  /**
   * Mark token as used when student starts survey
   * @param {string} token - Token to mark as used
   * @returns {Promise<Object>} Updated token
   */
  async markTokenAsUsed(token: string) {
    const result = await db.query(
      `UPDATE tokens SET used = true, updated_at = NOW() WHERE token = $1
       RETURNING id, survey_id, token, student_email, used, "isCompleted" AS "isCompleted", created_at, updated_at`,
      [token]
    );
    const row = result.rows[0];
    const updatedToken = row
      ? {
          id: row.id,
          surveyId: row.survey_id,
          token: row.token,
          studentEmail: row.student_email,
          used: row.used,
          isCompleted: row.isCompleted,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      : null;

    // Invalidate cache
    await redis.del(`token:${token}`);

    return updatedToken;
  }

  /**
   * Mark token as completed when student finishes survey
   * @param {string} token - Token to mark as completed
   * @returns {Promise<Object>} Updated token
   */
  async markTokenAsCompleted(token: string) {
    const result = await db.query(
      `UPDATE tokens SET "isCompleted" = true, updated_at = NOW() WHERE token = $1
       RETURNING id, survey_id, token, student_email, used, "isCompleted" AS "isCompleted", created_at, updated_at`,
      [token]
    );
    const row = result.rows[0];
    const updatedToken = row
      ? {
          id: row.id,
          surveyId: row.survey_id,
          token: row.token,
          studentEmail: row.student_email,
          used: row.used,
          isCompleted: row.isCompleted,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      : null;

    // Invalidate cache
    await redis.del(`token:${token}`);

    return updatedToken;
  }

  /**
   * Get all tokens for a survey
   * @param {string} surveyId - Survey ID to get tokens for
   * @returns {Promise<Array>} Array of token records
   */
  async getSurveyTokens(surveyId: string) {
    const result = await db.query(
      `SELECT id, survey_id, token, student_email, used, "isCompleted" AS "isCompleted", created_at, updated_at
       FROM tokens WHERE survey_id = $1 ORDER BY created_at DESC`,
      [surveyId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      surveyId: row.survey_id,
      token: row.token,
      studentEmail: row.student_email,
      used: row.used,
      isCompleted: row.isCompleted,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
} 