import db from '../config/database';
import crypto from 'crypto';
import Redis from 'ioredis';
import { CryptoService } from './crypto.service';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Service for survey management with automatic key generation and blockchain integration
 */
export class SurveyService {
  private static readonly SURVEY_CACHE_PREFIX = 'survey:';
  private static readonly SURVEY_LIST_CACHE_KEY = 'survey:list';
  private static readonly CACHE_TTL = 3600; // 1 hour

  private cryptoService: CryptoService;
  private fallbackMode: boolean;

  constructor() {
    this.cryptoService = new CryptoService();
    this.fallbackMode = process.env.SOLANA_FALLBACK_MODE === 'true';
  }

  /**
   * Get eligible surveys for a student by campaign token, with completion status
   */
  async getSurveysForToken(token: string) {
    // 1) Resolve token -> campaignId, studentEmail
    const tokenRes = await db.query(
      `SELECT campaign_id, student_email FROM survey_tokens WHERE token = $1 LIMIT 1`,
      [token]
    );
    if (tokenRes.rowCount === 0) {
      throw new Error('Invalid token');
    }
    const campaignId = tokenRes.rows[0].campaign_id as string;
    const studentEmail = tokenRes.rows[0].student_email as string;

    // 2) Resolve studentId and semesterId
    const studentRes = await db.query(
      `SELECT id FROM students WHERE email = $1 LIMIT 1`,
      [studentEmail]
    );
    if (studentRes.rowCount === 0) {
      throw new Error('Student not found for token email');
    }
    const studentId = studentRes.rows[0].id as string;

    const campaignRes = await db.query(
      `SELECT semester_id FROM survey_campaigns WHERE id = $1 LIMIT 1`,
      [campaignId]
    );
    if (campaignRes.rowCount === 0) {
      throw new Error('Campaign not found for token');
    }
    const semesterId = campaignRes.rows[0].semester_id as string;

    // 3) Eligible surveys = surveys in this campaign for student's enrolled courses in semester
    const surveysRes = await db.query(
      `SELECT 
         s.*, 
         c.name as course_name, c.code as course_code, 
         t.name as teacher_name,
         CASE WHEN scp.id IS NOT NULL THEN true ELSE false END as is_completed
       FROM surveys s
       LEFT JOIN courses c ON s.course_id = c.id
       LEFT JOIN teachers t ON s.teacher_id = t.id
       JOIN enrollments e ON e.course_id = s.course_id AND e.semester_id = $2 AND e.student_id = $3
       LEFT JOIN survey_completions scp ON scp.survey_id = s.id AND scp.student_email = $4
       WHERE s.campaign_id = $1
       ORDER BY c.code ASC, t.name ASC`,
      [campaignId, semesterId, studentId, studentEmail]
    );

    return surveysRes.rows.map((row: any) => ({
      id: row.id,
      campaignId: row.campaign_id,
      title: row.title,
      description: row.description,
      templateId: row.template_id,
      totalQuestions: row.total_questions,
      courseId: row.course_id,
      teacherId: row.teacher_id,
      courseName: row.course_name,
      courseCode: row.course_code,
      teacherName: row.teacher_name,
      status: row.status,
      totalResponses: row.total_responses,
      openedAt: row.opened_at,
      closedAt: row.closed_at,
      createdAt: row.created_at,
      isCompleted: !!row.is_completed
    }));
  }

  /**
   * Create a new survey as a child of a campaign
   */
  async createSurvey(data: {
    campaignId: string;
    title: string;
    description?: string;
    templateId?: string;
    courseId?: string | null;
    teacherId?: string | null;
    status?: 'draft' | 'active' | 'closed' | 'published';
  }) {
    const surveyId = crypto.randomUUID();
    const templateId = data.templateId || 'teaching_quality_25q';
    const totalQuestions = 25;
    
    const insertSurvey = await db.query(
      `INSERT INTO surveys (
         id, campaign_id, title, description, template_id, total_questions,
         course_id, teacher_id, status, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6,
         $7, $8, $9, NOW(), NOW()
       ) RETURNING *`,
      [
        surveyId,
        data.campaignId,
        data.title,
        data.description || null,
        templateId,
        totalQuestions,
        data.courseId || null,
        data.teacherId || null,
        data.status || 'draft'
      ]
    );

    // Invalidate list cache
    await redis.del(SurveyService.SURVEY_LIST_CACHE_KEY);

    return insertSurvey.rows[0];
  }

  /**
   * Update an existing survey
   * @param {string} id - Survey ID
   * @param {Object} data - Updated survey data (title, description, templateId)
   * @returns {Promise<Object>} Updated survey object
   */
  async updateSurvey(id: string, data: {
    title?: string;
    description?: string;
    templateId?: string;
  }) {
    try {
      // Check if survey exists
      const existingSurvey = await db.query(
        'SELECT id FROM surveys WHERE id = $1 LIMIT 1',
        [id]
      );

      if (existingSurvey.rowCount === 0) {
        throw new Error('Survey not found');
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramCount = 1;

      if (data.title !== undefined) {
        updateFields.push(`title = $${++paramCount}`);
        updateValues.push(data.title);
      }
      if (data.description !== undefined) {
        updateFields.push(`description = $${++paramCount}`);
        updateValues.push(data.description);
      }
      if (data.templateId !== undefined) {
        updateFields.push(`template_id = $${++paramCount}`);
        updateValues.push(data.templateId);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push(`updated_at = $${++paramCount}`);
      updateValues.push(new Date());

      // Add survey ID as first parameter
      updateValues.unshift(id);

      const updateQuery = `
        UPDATE surveys 
        SET ${updateFields.join(', ')}
        WHERE id = $1
        RETURNING *
      `;

      const result = await db.query(updateQuery, updateValues);
      
      // Clear cache
      await Promise.all([
        redis.del(`${SurveyService.SURVEY_CACHE_PREFIX}${id}`),
        redis.del(SurveyService.SURVEY_LIST_CACHE_KEY)
      ]);

      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to update survey: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a survey with caching
   * @param {string} id - Survey ID
   * @returns {Promise<Object>} Survey object with tokens and responses
   */
  async getSurvey(id: string) {
    const cachedSurvey = await redis.get(`${SurveyService.SURVEY_CACHE_PREFIX}${id}`);
    if (cachedSurvey) {
      return JSON.parse(cachedSurvey);
    }

    const surveyRes = await db.query(
      `SELECT s.*, c.name as course_name, c.code as course_code, t.name as teacher_name
       FROM surveys s
       LEFT JOIN courses c ON s.course_id = c.id
       LEFT JOIN teachers t ON s.teacher_id = t.id
       WHERE s.id = $1 LIMIT 1`,
      [id]
    );
    const survey = surveyRes.rows[0];
    if (!survey) {
      throw new Error('Survey not found');
    }
    await redis.set(
      `${SurveyService.SURVEY_CACHE_PREFIX}${id}`,
      JSON.stringify(survey),
      'EX',
      SurveyService.CACHE_TTL
    );

    return survey as any;
  }

  /**
   * Get all surveys with counts
   * @returns {Promise<Array>} Array of surveys with response and token counts
   */
  async getAllSurveys() {
    const cachedSurveys = await redis.get(SurveyService.SURVEY_LIST_CACHE_KEY);
    if (cachedSurveys) {
      return JSON.parse(cachedSurveys);
    }

    const surveysRes = await db.query(`
      SELECT s.*, c.name as course_name, c.code as course_code, t.name as teacher_name
      FROM surveys s
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN teachers t ON s.teacher_id = t.id
      ORDER BY s.created_at DESC`);
    const surveys = surveysRes.rows;

    await redis.set(
      SurveyService.SURVEY_LIST_CACHE_KEY,
      JSON.stringify(surveys),
      'EX',
      SurveyService.CACHE_TTL
    );

    return surveys;
  }

  /**
   * Get all surveys by campaign
   */
  async getSurveysByCampaign(campaignId: string) {
    const result = await db.query(
      `SELECT s.*, c.name as course_name, c.code as course_code, t.name as teacher_name
       FROM surveys s
       LEFT JOIN courses c ON s.course_id = c.id
       LEFT JOIN teachers t ON s.teacher_id = t.id
       WHERE s.campaign_id = $1
       ORDER BY c.code ASC, t.name ASC`,
      [campaignId]
    );
    return result.rows;
  }

  /**
   * Delete a survey and all related data
   * @param {string} id - Survey ID
   * @returns {Promise<{success: boolean}>} Success confirmation
   */
  async deleteSurvey(id: string) {
    const surveyRes = await db.query(`SELECT id FROM surveys WHERE id = $1 LIMIT 1`, [id]);
    const survey = surveyRes.rows[0];

    if (!survey) {
      throw new Error('Survey not found');
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM surveys WHERE id = $1', [id]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    // Invalidate caches
    await Promise.all([
      redis.del(SurveyService.SURVEY_LIST_CACHE_KEY),
      redis.del(`${SurveyService.SURVEY_CACHE_PREFIX}${id}`)
    ]);

    return { success: true };
  }
  
} 