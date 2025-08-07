import { Router } from 'express';
import { AuthService } from '../services/auth.service';

const router = Router();

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
});

// Refresh token
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