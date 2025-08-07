import { PrismaClient } from '../generated/prisma';
import { Redis } from 'ioredis';
import crypto from 'crypto';

const prisma = new PrismaClient();
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
        const token = this.generateToken();
        return prisma.token.create({
          data: {
            token,
            surveyId,
            studentEmail: student.email,
            used: false,
            isCompleted: false
          }
        });
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
    const tokenData = await prisma.token.findUnique({
      where: { token },
      include: { survey: true }
    });

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
    const updatedToken = await prisma.token.update({
      where: { token },
      data: { used: true }
    });

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
    const updatedToken = await prisma.token.update({
      where: { token },
      data: { isCompleted: true }
    });

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
    return prisma.token.findMany({
      where: { surveyId },
      include: { survey: true }
    });
  }
} 