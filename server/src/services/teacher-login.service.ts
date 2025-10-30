import db from '../config/database';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { EmailService } from './email.service';

/**
 * Service for managing teacher login accounts
 */
export class TeacherLoginService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Generate a secure temporary password
   */
  private generateTemporaryPassword(): string {
    // Generate a random password: 3 words + 3 numbers + 1 symbol
    const words = ['Survey', 'Teacher', 'Course', 'Student', 'Quality', 'Learning'];
    const word1 = words[Math.floor(Math.random() * words.length)];
    const word2 = words[Math.floor(Math.random() * words.length)];
    const numbers = Math.floor(100 + Math.random() * 900); // 3 digit number
    const symbols = ['!', '@', '#', '$', '%'];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];

    return `${word1}${word2}${numbers}${symbol}`;
  }

  /**
   * Create teacher login account with email notification
   */
  async createTeacherLogin(teacherId: string, teacherEmail: string, teacherName: string): Promise<{
    success: boolean;
    temporaryPassword?: string;
    emailSent?: boolean;
    error?: string;
  }> {
    try {
      // Check if teacher login already exists
      const existing = await db.query(
        'SELECT id FROM teacher_logins WHERE email = $1',
        [teacherEmail]
      );

      if (existing.rowCount && existing.rowCount > 0) {
        return {
          success: false,
          error: 'Teacher login already exists for this email'
        };
      }

      // Generate temporary password
      const temporaryPassword = this.generateTemporaryPassword();

      // Hash password
      const passwordHash = await bcrypt.hash(temporaryPassword, 10);

      // Create teacher login record with must_change_password flag
      const loginId = crypto.randomUUID();
      await db.query(
        `INSERT INTO teacher_logins (id, email, password_hash, teacher_id, is_active, must_change_password)
         VALUES ($1, $2, $3, $4, true, true)`,
        [loginId, teacherEmail, passwordHash, teacherId]
      );

      console.log(`✅ Teacher login created for: ${teacherEmail}`);

      // Send welcome email
      let emailSent = false;
      if (this.emailService.isAvailable()) {
        emailSent = await this.emailService.sendTeacherWelcomeEmail(
          teacherEmail,
          teacherName,
          temporaryPassword
        );
      } else {
        console.warn(`⚠️ Email service not available. Temporary password: ${temporaryPassword}`);
      }

      return {
        success: true,
        temporaryPassword,
        emailSent
      };
    } catch (error) {
      console.error('Failed to create teacher login:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if teacher has login credentials
   */
  async hasLoginCredentials(teacherId: string): Promise<boolean> {
    const result = await db.query(
      'SELECT id FROM teacher_logins WHERE teacher_id = $1',
      [teacherId]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Get teacher login status for display
   */
  async getTeacherLoginStatus(teacherId: string): Promise<{
    hasLogin: boolean;
    isActive?: boolean;
    email?: string;
    createdAt?: string;
  }> {
    const result = await db.query(
      `SELECT email, is_active, created_at
       FROM teacher_logins
       WHERE teacher_id = $1`,
      [teacherId]
    );

    if (result.rowCount === 0) {
      return { hasLogin: false };
    }

    const row = result.rows[0];
    return {
      hasLogin: true,
      isActive: row.is_active,
      email: row.email,
      createdAt: row.created_at
    };
  }

  /**
   * Disable teacher login
   */
  async disableTeacherLogin(teacherId: string): Promise<boolean> {
    const result = await db.query(
      `UPDATE teacher_logins
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE teacher_id = $1`,
      [teacherId]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Enable teacher login
   */
  async enableTeacherLogin(teacherId: string): Promise<boolean> {
    const result = await db.query(
      `UPDATE teacher_logins
       SET is_active = true, updated_at = CURRENT_TIMESTAMP
       WHERE teacher_id = $1`,
      [teacherId]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(email: string): Promise<{
    success: boolean;
    token?: string;
    teacherName?: string;
    error?: string;
  }> {
    try {
      // Check if teacher login exists
      const result = await db.query(
        `SELECT tl.id, tl.teacher_id, t.name
         FROM teacher_logins tl
         JOIN teachers t ON tl.teacher_id = t.id
         WHERE tl.email = $1 AND tl.is_active = true`,
        [email]
      );

      if (result.rowCount === 0) {
        return {
          success: false,
          error: 'No active teacher account found with this email'
        };
      }

      const { name: teacherName } = result.rows[0];

      // Generate reset token (32 bytes = 64 hex chars)
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Store reset token (you'd need a password_reset_tokens table)
      // For now, we'll return it for the caller to handle

      return {
        success: true,
        token,
        teacherName
      };
    } catch (error) {
      console.error('Failed to generate password reset token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Reset password using reset token
   */
  async resetPassword(token: string, newPassword: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    // This would verify the token from password_reset_tokens table
    // and update the password if valid
    // Implementation depends on having a password_reset_tokens table
    return {
      success: false,
      error: 'Password reset functionality requires password_reset_tokens table'
    };
  }
}
