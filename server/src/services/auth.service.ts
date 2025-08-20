import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

/**
 * Service for admin authentication and JWT management
 */
export class AuthService {
  /**
   * Authenticate admin user and generate JWT token
   * @param {string} email - Admin email
   * @param {string} password - Admin password
   * @returns {Promise<{token: string}>} JWT token
   */
  static async login(email: string, password: string) {
    // In a real application, you would validate against a database
    // For now, we'll use a hardcoded admin user
    if (email !== process.env.ADMIN_EMAIL) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(
      password,
      process.env.ADMIN_PASSWORD_HASH || ''
    );

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    const token = jwt.sign(
      { id: 'admin', role: 'admin' },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    return { token };
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