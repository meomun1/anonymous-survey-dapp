import { Router } from 'express';
import { AuthService } from '../services/auth.service';

const router = Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Admin login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "admin@school.edu"
 *               password:
 *                 type: string
 *                 example: "admin123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT access token
 *                 refreshToken:
 *                   type: string
 *                   description: JWT refresh token
 *                 user:
 *                   type: object
 *                   description: User information
 *       401:
 *         description: Authentication failed
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
});

/**
 * @swagger
 * /auth/teacher/login:
 *   post:
 *     summary: Teacher login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "teacher@school.edu"
 *               password:
 *                 type: string
 *                 example: "teacher123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT access token
 *                 refreshToken:
 *                   type: string
 *                   description: JWT refresh token
 *                 user:
 *                   type: object
 *                   description: Teacher information
 *       401:
 *         description: Authentication failed
 */
router.post('/teacher/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.teacherLogin(email, password);
    res.json(result);
  } catch (error) {
    console.error('Teacher login error:', error);
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Authentication failed'
    });
  }
});

/**
 * @swagger
 * /auth/teacher/change-password:
 *   post:
 *     summary: Change teacher password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - teacherId
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               teacherId:
 *                 type: string
 *                 description: Teacher ID
 *               currentPassword:
 *                 type: string
 *                 description: Current password
 *               newPassword:
 *                 type: string
 *                 description: New password
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Current password is incorrect
 */
router.post('/teacher/change-password', async (req, res) => {
  try {
    const { teacherId, currentPassword, newPassword } = req.body;

    if (!teacherId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    await AuthService.changeTeacherPassword(teacherId, currentPassword, newPassword);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    if (error instanceof Error && error.message === 'Current password is incorrect') {
      return res.status(401).json({ error: error.message });
    }
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to change password'
    });
  }
});

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Refresh token
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: New JWT access token
 *                 refreshToken:
 *                   type: string
 *                   description: New JWT refresh token
 *       401:
 *         description: Token refresh failed
 */
router.post('/refresh', async (req, res) => {
  try {
    const { token } = req.body;
    const result = await AuthService.refreshToken(token);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: 'Token refresh failed' });
  }
});

export default router; 