import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { db } from '../config/database';

/**
 * Service for admin and teacher authentication and JWT management
 */
export class AuthService {
  /**
   * Authenticate admin user and generate JWT token
   * @param {string} email - Admin email
   * @param {string} password - Admin password
   * @returns {Promise<{token: string, refreshToken: string, user: object}>} Auth response
   */
  static async login(email: string, password: string) {
    // Check environment variable for admin login first
    if (email === process.env.ADMIN_EMAIL) {
      const isValidPassword = await bcrypt.compare(
        password,
        process.env.ADMIN_PASSWORD_HASH || ''
      );

      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      const user = {
        id: 'admin_001',
        role: 'admin' as const,
        email: email,
        name: 'Administrator'
      };

      const token = jwt.sign(
        { id: user.id, role: user.role, email: user.email },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      );

      const refreshToken = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      );

      return { token, refreshToken, user };
    }

    // Check database for admin users
    const adminUser = await db.query(
      'SELECT * FROM admins WHERE email = $1 AND is_active = true',
      [email]
    );

    if (adminUser.rows.length > 0) {
      const admin = adminUser.rows[0];
      const isValidPassword = await bcrypt.compare(password, admin.password_hash);

      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      const user = {
        id: admin.id,
        role: 'admin' as const,
        email: admin.email,
        name: admin.name
      };

      const token = jwt.sign(
        { id: user.id, role: user.role, email: user.email },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      );

      const refreshToken = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      );

      return { token, refreshToken, user };
    }

    throw new Error('Invalid credentials');
  }

  /**
   * Authenticate teacher user and generate JWT token
   * @param {string} email - Teacher email
   * @param {string} password - Teacher password
   * @returns {Promise<{token: string, refreshToken: string, user: object}>} Auth response
   */
  static async teacherLogin(email: string, password: string) {
    // Query teacher_logins table with join to teachers table
    const result = await db.query(
      `SELECT tl.id as login_id, tl.email, tl.password_hash, tl.is_active, tl.must_change_password,
              t.id as teacher_id, t.name, t.school_id
       FROM teacher_logins tl
       LEFT JOIN teachers t ON tl.teacher_id = t.id
       WHERE tl.email = $1 AND tl.is_active = true`,
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid credentials');
    }

    const teacherLogin = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, teacherLogin.password_hash);

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Check if teacher record exists
    if (!teacherLogin.teacher_id) {
      throw new Error('Teacher account not properly configured. Please contact administrator.');
    }

    const user = {
      id: teacherLogin.teacher_id,
      role: 'teacher' as const,
      email: teacherLogin.email,
      name: teacherLogin.name,
      schoolId: teacherLogin.school_id,
      mustChangePassword: teacherLogin.must_change_password
    };

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    return { token, refreshToken, user };
  }

  /**
   * Change teacher password (also clears must_change_password flag)
   * @param {string} teacherId - Teacher ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   */
  static async changeTeacherPassword(teacherId: string, currentPassword: string, newPassword: string) {
    // Get teacher login record
    const result = await db.query(
      `SELECT tl.id, tl.email, tl.password_hash
       FROM teacher_logins tl
       WHERE tl.teacher_id = $1 AND tl.is_active = true`,
      [teacherId]
    );

    if (result.rows.length === 0) {
      throw new Error('Teacher login not found');
    }

    const teacherLogin = result.rows[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, teacherLogin.password_hash);

    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password and clear must_change_password flag
    await db.query(
      `UPDATE teacher_logins
       SET password_hash = $1, must_change_password = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [newPasswordHash, teacherLogin.id]
    );

    console.log(`✅ Password changed for teacher: ${teacherLogin.email}`);
  }

  /**
   * Refresh an existing JWT token
   * @param {string} token - Current JWT token
   * @returns {Promise<{token: string}>} New JWT token
   */
  static async refreshToken(token: string) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as {
        id: string;
        role: string;
      };

      const newToken = jwt.sign(
        { id: decoded.id, role: decoded.role },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      );

      return { token: newToken };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}