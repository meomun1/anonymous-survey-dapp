import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { redisClient } from './config/redis';
import surveyRoutes from './routes/survey.routes';
import tokenRoutes from './routes/token.routes';
import responseRoutes from './routes/response.routes';
import cryptoRoutes from './routes/crypto.routes';
import authRoutes from './routes/auth.routes';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check Redis connection
    const redisStatus = redisClient.isReady ? 'connected' : 'disconnected';
    
    res.json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      server: 'Anonymous Survey Server',
      redis: redisStatus,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/crypto', cryptoRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(port, async () => {
  try {
    // Connect to Redis
    await redisClient.connect();
    console.log('Connected to Redis');

    console.log(`Server is running on port ${port}`);
    console.log(`Health check available at: http://localhost:${port}/health`);
    console.log(`API documentation available at: README.md`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}); 