import db from '../config/database';
import Redis from 'ioredis';
import { CryptoService } from './crypto.service';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Service for analytics, Merkle tree calculations, and teacher performance verification
 */
export class AnalyticsService {
  private static readonly ANALYTICS_CACHE_PREFIX = 'analytics:';
  private static readonly CACHE_TTL = 1800; // 30 minutes
  private cryptoService = new CryptoService();

  // Merkle operations are delegated to crypto.service
  async calculateMerkleRoot(commitments: string[]): Promise<string> {
    return this.cryptoService.calculateMerkleRoot(commitments);
  }

  async calculateFinalMerkleRoot(campaignRoots: string[]): Promise<string> {
    return this.cryptoService.calculateFinalMerkleRoot(campaignRoots);
  }

  async generateMerkleProof(commitments: string[], targetCommitment: string): Promise<string[]> {
    return this.cryptoService.generateMerkleProof(commitments, targetCommitment);
  }

  async verifyMerkleProof(commitment: string, proof: string[], root: string): Promise<boolean> {
    return this.cryptoService.verifyMerkleProof(commitment, proof, root);
  }

  /**
   * Calculate Merkle root for all responses in a campaign
   */
  async calculateCampaignMerkleRoot(campaignId: string) {
    // Check if campaign exists
    const campaign = await db.query(
      'SELECT id, name FROM survey_campaigns WHERE id = $1',
      [campaignId]
    );

    if (campaign.rowCount === 0) {
      throw new Error('Campaign not found');
    }

    // Fetch all response commitments for this campaign
    // Note: ORDER BY ensures deterministic Merkle root calculation
    // survey_responses has campaign_id directly, no need to join with surveys
    const result = await db.query(
      `SELECT commitment
       FROM survey_responses
       WHERE campaign_id = $1 AND commitment IS NOT NULL
       ORDER BY created_at`,
      [campaignId]
    );

    if (result.rowCount === 0) {
      throw new Error('No responses found for this campaign');
    }

    const totalCommitments = result.rowCount;
    console.log(`📊 Calculating Merkle root for ${totalCommitments} commitments in campaign ${campaignId}`);

    // Extract commitments efficiently
    const commitments = result.rows.map(row => row.commitment);

    // Performance tracking for large datasets
    const startTime = Date.now();

    // Calculate Merkle root
    const merkleRoot = await this.cryptoService.calculateMerkleRoot(commitments);

    const duration = Date.now() - startTime;
    console.log(`✅ Merkle root calculated in ${duration}ms for ${totalCommitments} commitments`);

    return {
      campaignId,
      merkleRoot,
      totalCommitments,
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * Get saved Merkle root for a campaign
   */
  async getCampaignMerkleRoot(campaignId: string) {
    const result = await db.query(
      'SELECT merkle_root, published_at FROM survey_campaigns WHERE id = $1',
      [campaignId]
    );

    if (result.rowCount === 0) {
      throw new Error('Campaign not found');
    }

    const row = result.rows[0];

    if (!row.merkle_root) {
      throw new Error('Merkle root not calculated for this campaign');
    }

    // Get total commitments
    const commitmentsResult = await db.query(
      `SELECT COUNT(*) as total
       FROM survey_responses
       WHERE campaign_id = $1 AND commitment IS NOT NULL`,
      [campaignId]
    );

    return {
      campaignId,
      merkleRoot: row.merkle_root,
      totalCommitments: parseInt(commitmentsResult.rows[0].total),
      calculatedAt: row.published_at || new Date().toISOString()
    };
  }

  // ============================================================================
  // CAMPAIGN ANALYTICS
  // ============================================================================

  /**
   * Generate campaign analytics
   */
  async generateCampaignAnalytics(campaignId: string) {
    const campaign = await db.query(
      'SELECT * FROM survey_campaigns WHERE id = $1',
      [campaignId]
    );

    if (campaign.rowCount === 0) {
      throw new Error('Campaign not found');
    }

    // Get all parsed responses for this campaign
    const responsesResult = await db.query(
      `SELECT pr.*, s.course_id, s.teacher_id, c.name as course_name, c.code as course_code, t.name as teacher_name
       FROM parsed_responses pr
       JOIN decrypted_responses dr ON pr.decrypted_response_id = dr.id
       JOIN surveys s ON pr.survey_id = s.id
       LEFT JOIN courses c ON s.course_id = c.id
       LEFT JOIN teachers t ON s.teacher_id = t.id
       WHERE s.campaign_id = $1`,
      [campaignId]
    );

    const responses = responsesResult.rows;

    // If no responses yet, return empty analytics instead of throwing error
    if (responses.length === 0) {
      const totalSurveysResult = await db.query(
        'SELECT COUNT(DISTINCT id) as count FROM surveys WHERE campaign_id = $1',
        [campaignId]
      );
      const totalSurveys = parseInt(totalSurveysResult.rows[0]?.count || '0');

      const totalTokensResult = await db.query(
        'SELECT COUNT(*) as count FROM survey_tokens WHERE campaign_id = $1',
        [campaignId]
      );
      const totalTokens = parseInt(totalTokensResult.rows[0]?.count || '0');

      const totalEnrollmentsResult = await db.query(
        'SELECT COUNT(*) as count FROM enrollments WHERE campaign_id = $1',
        [campaignId]
      );
      const totalEnrollments = parseInt(totalEnrollmentsResult.rows[0]?.count || '0');

      return {
        campaignId,
        campaignName: campaign.rows[0]?.name || 'Unknown Campaign',
        totalSurveys,
        totalResponses: 0,
        totalTokens,
        usedTokens: 0,
        totalEnrollments,
        completionRate: 0,
        participationRate: 0,
        averageScore: 0,
        scoreDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        questionStatistics: {},
        schoolBreakdown: [],
        teacherPerformance: []
      };
    }

    // Calculate question statistics
    const questionStatistics: Record<string, Record<string, number>> = {};
    const overallStatistics = {
      totalResponses: responses.length,
      averageScore: 0,
      scoreDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };

    let totalScoreSum = 0;

    // Initialize question statistics
    for (let i = 1; i <= 25; i++) {
      questionStatistics[i.toString()] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    }

    // Process each response
    for (const response of responses) {
      const answers = response.answers;
      
      for (let i = 0; i < answers.length; i++) {
        const questionNum = (i + 1).toString();
        const answer = answers[i];
        
        if (answer >= 1 && answer <= 5) {
          questionStatistics[questionNum][answer.toString()]++;
          overallStatistics.scoreDistribution[answer as keyof typeof overallStatistics.scoreDistribution]++;
          totalScoreSum += answer;
        }
      }
    }

    // Calculate average score
    overallStatistics.averageScore = totalScoreSum / (responses.length * 25);

    // Calculate category statistics (if needed)
    const categoryStatistics = this.calculateCategoryStatistics(questionStatistics);

    // Store analytics in database
    const analyticsId = crypto.randomUUID();
    await db.query(
      `INSERT INTO survey_analytics (
         id, campaign_id, question_statistics, overall_statistics, category_statistics
       )
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (campaign_id) DO UPDATE SET
         question_statistics = EXCLUDED.question_statistics,
         overall_statistics = EXCLUDED.overall_statistics,
         category_statistics = EXCLUDED.category_statistics,
         updated_at = CURRENT_TIMESTAMP`,
      [
        analyticsId,
        campaignId,
        JSON.stringify(questionStatistics),
        JSON.stringify(overallStatistics),
        JSON.stringify(categoryStatistics)
      ]
    );

    // Generate teacher performance data
    await this.generateTeacherPerformance(campaignId, responses);

    // Get campaign details with token counts
    const campaignData = campaign.rows[0];
    const totalSurveysResult = await db.query(
      'SELECT COUNT(DISTINCT id) as count FROM surveys WHERE campaign_id = $1',
      [campaignId]
    );
    const totalSurveys = parseInt(totalSurveysResult.rows[0]?.count || '0');

    const totalTokensResult = await db.query(
      'SELECT COUNT(*) as count FROM survey_tokens WHERE campaign_id = $1',
      [campaignId]
    );
    const totalTokens = parseInt(totalTokensResult.rows[0]?.count || '0');

    const usedTokensResult = await db.query(
      'SELECT COUNT(*) as count FROM survey_tokens WHERE campaign_id = $1 AND is_completed = true',
      [campaignId]
    );
    const usedTokens = parseInt(usedTokensResult.rows[0]?.count || '0');

    // Get total expected responses (based on student enrollments)
    const totalEnrollmentsResult = await db.query(
      'SELECT COUNT(*) as count FROM enrollments WHERE campaign_id = $1',
      [campaignId]
    );
    const totalEnrollments = parseInt(totalEnrollmentsResult.rows[0]?.count || '0');

    // Calculate completion and participation rates
    // completionRate = % of students who completed all their surveys (completed tokens / total tokens)
    // participationRate = % of expected survey responses received (responses / enrollments)
    const completionRate = totalTokens > 0 ? (usedTokens / totalTokens) * 100 : 0;
    const participationRate = totalEnrollments > 0 ? (responses.length / totalEnrollments) * 100 : 0;

    // Get school breakdown
    const schoolBreakdownResult = await db.query(
      `SELECT
        sch.id as school_id,
        sch.name as school_name,
        COUNT(DISTINCT pr.id) as response_count,
        AVG((SELECT AVG(unnest) FROM unnest(pr.answers))) as average_score
       FROM parsed_responses pr
       JOIN decrypted_responses dr ON pr.decrypted_response_id = dr.id
       JOIN surveys s ON pr.survey_id = s.id
       JOIN courses c ON s.course_id = c.id
       JOIN schools sch ON c.school_id = sch.id
       WHERE s.campaign_id = $1
       GROUP BY sch.id, sch.name`,
      [campaignId]
    );

    const schoolBreakdown = schoolBreakdownResult.rows.map(row => ({
      schoolId: row.school_id,
      schoolName: row.school_name,
      responseCount: parseInt(row.response_count),
      averageScore: parseFloat(row.average_score || '0')
    }));

    // Get teacher performance
    const teacherPerformanceResult = await db.query(
      `SELECT
        t.id as teacher_id,
        t.name as teacher_name,
        c.code as course_code,
        c.name as course_name,
        c.school_id,
        COUNT(DISTINCT pr.id) as response_count,
        AVG((SELECT AVG(unnest) FROM unnest(pr.answers))) as average_score
       FROM parsed_responses pr
       JOIN decrypted_responses dr ON pr.decrypted_response_id = dr.id
       JOIN surveys s ON pr.survey_id = s.id
       JOIN teachers t ON s.teacher_id = t.id
       JOIN courses c ON s.course_id = c.id
       WHERE s.campaign_id = $1
       GROUP BY t.id, t.name, c.code, c.name, c.school_id`,
      [campaignId]
    );

    const teacherPerformance = teacherPerformanceResult.rows.map(row => ({
      teacherId: row.teacher_id,
      teacherName: row.teacher_name,
      courseCode: row.course_code,
      courseName: row.course_name,
      schoolId: row.school_id,
      responseCount: parseInt(row.response_count),
      averageScore: parseFloat(row.average_score || '0')
    }));

    return {
      campaignId,
      campaignName: campaignData.name,
      totalSurveys,
      totalResponses: responses.length,
      totalTokens,
      usedTokens,
      totalEnrollments,
      completionRate,
      participationRate,
      averageScore: overallStatistics.averageScore,
      scoreDistribution: overallStatistics.scoreDistribution,
      questionStatistics,
      schoolBreakdown,
      teacherPerformance
    };
  }

  /**
   * Calculate category statistics
   */
  private calculateCategoryStatistics(questionStatistics: Record<string, Record<string, number>>) {
    // Define categories (example mapping)
    const categories = {
      'Teaching Quality': [1, 2, 3, 4, 5],
      'Course Content': [6, 7, 8, 9, 10],
      'Assessment': [11, 12, 13, 14, 15],
      'Communication': [16, 17, 18, 19, 20],
      'Overall Satisfaction': [21, 22, 23, 24, 25]
    };

    const categoryStats: Record<string, Record<string, number>> = {};

    for (const [categoryName, questionNumbers] of Object.entries(categories)) {
      categoryStats[categoryName] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      
      for (const questionNum of questionNumbers) {
        for (const [score, count] of Object.entries(questionStatistics[questionNum])) {
          categoryStats[categoryName][score] += count;
        }
      }
    }

    return categoryStats;
  }

  // ============================================================================
  // TEACHER PERFORMANCE TRACKING
  // ============================================================================

  /**
   * Generate teacher performance data
   */
  async generateTeacherPerformance(campaignId: string, responses: any[]) {
    // Group responses by teacher
    const teacherResponses: Record<string, any[]> = {};
    
    for (const response of responses) {
      const teacherId = response.teacher_id;
      if (!teacherResponses[teacherId]) {
        teacherResponses[teacherId] = [];
      }
      teacherResponses[teacherId].push(response);
    }

    // Calculate performance for each teacher
    for (const [teacherId, teacherResponseList] of Object.entries(teacherResponses)) {
      const totalResponses = teacherResponseList.length;
      let totalScoreSum = 0;
      const scoreDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      // Process all responses for this teacher
      for (const response of teacherResponseList) {
        const answers = response.answers;
        
        for (const answer of answers) {
        if (answer >= 1 && answer <= 5) {
          scoreDistribution[answer as keyof typeof scoreDistribution]++;
          totalScoreSum += answer;
        }
        }
      }

      const averageScore = totalScoreSum / (totalResponses * 25);

      // Store or update teacher performance
      await db.query(
        `INSERT INTO teacher_performance (
           id, teacher_id, campaign_id, average_score, total_responses, score_distribution
         )
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (teacher_id, campaign_id) DO UPDATE SET
           average_score = EXCLUDED.average_score,
           total_responses = EXCLUDED.total_responses,
           score_distribution = EXCLUDED.score_distribution,
           updated_at = CURRENT_TIMESTAMP`,
        [
          crypto.randomUUID(),
          teacherId,
          campaignId,
          averageScore,
          totalResponses,
          JSON.stringify(scoreDistribution)
        ]
      );
    }
  }

  /**
   * Get teacher performance analytics
   */
  async getTeacherPerformance(teacherId: string, campaignIds?: string[]) {
    let query = `
      SELECT tp.*, t.name as teacher_name, sc.name as campaign_name, sc.semester_id
      FROM teacher_performance tp
      JOIN teachers t ON tp.teacher_id = t.id
      JOIN survey_campaigns sc ON tp.campaign_id = sc.id
      WHERE tp.teacher_id = $1
    `;
    const values = [teacherId];

    if (campaignIds && campaignIds.length > 0) {
      query += ` AND tp.campaign_id = ANY($2)`;
      values.push(campaignIds as any);
    }

    query += ' ORDER BY sc.created_at DESC';

    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Verify teacher performance against blockchain Merkle roots
   */
  async verifyTeacherPerformance(teacherId: string, campaignIds: string): Promise<boolean> {
    // Get teacher's commitments from database
    const commitmentsResult = await db.query(
      `SELECT sr.commitment
       FROM survey_responses sr
       JOIN decrypted_responses dr ON sr.id = dr.response_id
       JOIN surveys s ON dr.survey_id = s.id
       WHERE s.teacher_id = $1 AND s.campaign_id = $2`,
      [teacherId, campaignIds]
    );

    if (commitmentsResult.rowCount === 0) {
      throw new Error('No commitments found for teacher');
    }

    const commitments = commitmentsResult.rows.map(row => row.commitment);

    // Get campaign Merkle root from blockchain
    const campaign = await db.query(
      'SELECT merkle_root FROM survey_campaigns WHERE id = $1',
      [campaignIds]
    );
    if (!campaign.rowCount || campaign.rowCount === 0 || !campaign.rows[0].merkle_root) {
      throw new Error('No Merkle root found for campaign');
    }
    const campaignRoot = campaign.rows[0].merkle_root;

    // Verify each commitment against the campaign root
    for (let i = 0; i < commitments.length; i++) {
      const commitment = commitments[i];
      const proof = await this.generateMerkleProof(commitments, commitment);
      
      const isValid = await this.verifyMerkleProof(
        commitment,
        proof,
        campaignRoot
      );
      
      if (!isValid) {
        return false;
      }
    }

    return true;
  }

  // ============================================================================
  // STUDENT COMPLETION TRACKING
  // ============================================================================

  /**
   * Generate student completion data
   */
  async generateStudentCompletion(campaignId: string) {
    // Get total surveys in campaign
    const totalSurveysResult = await db.query(
      'SELECT COUNT(DISTINCT id) as total FROM surveys WHERE campaign_id = $1',
      [campaignId]
    );
    const totalSurveys = parseInt(totalSurveysResult.rows[0]?.total || '0');

    // For each student with a token, check if they completed the campaign
    const result = await db.query(
      `SELECT
         st.student_email,
         st.is_completed,
         $2::integer as total_surveys,
         CASE WHEN st.is_completed THEN $2::integer ELSE 0 END as completed_surveys
       FROM survey_tokens st
       WHERE st.campaign_id = $1`,
      [campaignId, totalSurveys]
    );

    for (const row of result.rows) {
      const completionRate = row.total_surveys > 0
        ? (row.completed_surveys / row.total_surveys) * 100
        : 0;

      await db.query(
        `INSERT INTO student_completion (
           id, student_email, campaign_id, total_surveys, completed_surveys, completion_rate
         )
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (student_email, campaign_id) DO UPDATE SET
           total_surveys = EXCLUDED.total_surveys,
           completed_surveys = EXCLUDED.completed_surveys,
           completion_rate = EXCLUDED.completion_rate,
           updated_at = CURRENT_TIMESTAMP`,
        [
          crypto.randomUUID(),
          row.student_email,
          campaignId,
          row.total_surveys,
          row.completed_surveys,
          completionRate
        ]
      );
    }

    // Fetch complete student data with names and school info
    const completionData = await db.query(
      `SELECT
         sc.id as student_id,
         sc.student_email,
         st.name as student_name,
         sch.name as school_name,
         sc.total_surveys,
         sc.completed_surveys,
         sc.completion_rate
       FROM student_completion sc
       LEFT JOIN students st ON sc.student_email = st.email
       LEFT JOIN schools sch ON st.school_id = sch.id
       WHERE sc.campaign_id = $1
       ORDER BY sc.completion_rate ASC, st.name ASC`,
      [campaignId]
    );

    return {
      students: completionData.rows.map(row => ({
        studentId: row.student_id,
        studentEmail: row.student_email,
        studentName: row.student_name || row.student_email, // Fallback to email if name not found
        schoolName: row.school_name || 'Unknown School',
        totalSurveys: parseInt(row.total_surveys),
        completedSurveys: parseInt(row.completed_surveys),
        completionRate: parseFloat(row.completion_rate)
      }))
    };
  }

  /**
   * Get student completion analytics
   */
  async getStudentCompletion(studentEmail: string, campaignId: string) {
    const result = await db.query(
      'SELECT * FROM student_completion WHERE student_email = $1 AND campaign_id = $2',
      [studentEmail, campaignId]
    );

    if (result.rowCount === 0) {
      throw new Error('Student completion data not found');
    }

    return result.rows[0];
  }

  // ============================================================================
  // UNIVERSITY-WIDE ANALYTICS
  // ============================================================================

  /**
   * Get university-wide analytics
   */
  async getUniversityAnalytics() {
    const cacheKey = `${AnalyticsService.ANALYTICS_CACHE_PREFIX}university`;
    
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await db.query(`
      SELECT 
        COUNT(DISTINCT sc.id) as total_campaigns,
        COUNT(DISTINCT s.id) as total_surveys,
        COUNT(DISTINCT st.student_email) as total_students,
        COUNT(DISTINCT t.id) as total_teachers,
        COUNT(DISTINCT c.id) as total_courses,
        AVG(tp.average_score) as average_teacher_score,
        SUM(sc.total_responses) as total_responses
      FROM survey_campaigns sc
      LEFT JOIN surveys s ON sc.id = s.campaign_id
      LEFT JOIN survey_tokens st ON sc.id = st.campaign_id
      LEFT JOIN teachers t ON s.teacher_id = t.id
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN teacher_performance tp ON sc.id = tp.campaign_id
    `);

    const analytics = result.rows[0];
    
    // Cache the result
    await redis.setex(cacheKey, AnalyticsService.CACHE_TTL, JSON.stringify(analytics));
    
    return analytics;
  }

  /**
   * Get school analytics
   */
  async getSchoolAnalytics(schoolId: string) {
    const result = await db.query(`
      SELECT 
        sch.name as school_name,
        COUNT(DISTINCT t.id) as total_teachers,
        COUNT(DISTINCT c.id) as total_courses,
        COUNT(DISTINCT st.id) as total_students,
        AVG(tp.average_score) as average_teacher_score
      FROM schools sch
      LEFT JOIN teachers t ON sch.id = t.school_id
      LEFT JOIN courses c ON sch.id = c.school_id
      LEFT JOIN students st ON sch.id = st.school_id
      LEFT JOIN surveys s ON t.id = s.teacher_id
      LEFT JOIN teacher_performance tp ON t.id = tp.teacher_id
      WHERE sch.id = $1
      GROUP BY sch.id, sch.name
    `, [schoolId]);

    if (result.rowCount === 0) {
      throw new Error('School not found');
    }

    return result.rows[0];
  }

  // ============================================================================
  // ACCREDITATION DATA GENERATION
  // ============================================================================

  /**
   * Generate accreditation data for a teacher
   */
  async generateAccreditationData(teacherId: string, campaignIds: string[]) {
    // Get teacher performance data
    const performanceData = await this.getTeacherPerformance(teacherId, campaignIds);
    
    // Verify performance against blockchain (verify each campaign separately)
    const verificationResults = await Promise.all(
      campaignIds.map(campaignId => this.verifyTeacherPerformance(teacherId, campaignId))
    );
    const isVerified = verificationResults.every(result => result);
    
    // Get teacher details
    const teacherResult = await db.query(
      'SELECT * FROM teachers WHERE id = $1',
      [teacherId]
    );

    if (teacherResult.rowCount === 0) {
      throw new Error('Teacher not found');
    }

    const teacher = teacherResult.rows[0];

    return {
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email
      },
      performance: performanceData,
      verification: {
        verified: isVerified,
        campaignIds,
        verifiedAt: new Date().toISOString()
      },
      accreditationData: {
        totalCampaigns: performanceData.length,
        averageScore: performanceData.reduce((sum, p) => sum + parseFloat(p.average_score), 0) / performanceData.length,
        totalResponses: performanceData.reduce((sum, p) => sum + p.total_responses, 0),
        blockchainVerified: isVerified
      }
    };
  }
}
