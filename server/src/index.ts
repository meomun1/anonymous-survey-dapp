import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { redisClient } from './config/redis';
import { specs } from './config/swagger';
import { corsMiddleware } from './config/cors';
import { apiLimiter } from './config/rateLimit';
import { errorHandler } from './utils/errorHandler';
import surveyRoutes from './routes/survey.routes';
import tokenRoutes from './routes/token.routes';
import responseRoutes from './routes/response.routes';
import cryptoRoutes from './routes/crypto.routes';
import authRoutes from './routes/auth.routes';
import publicResponseRoutes from './routes/publicResponse.routes';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(corsMiddleware);
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Rate limiting
app.use('/api', apiLimiter);

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

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// API Status Page
app.get('/api-status', (req, res) => {
  res.json({
    status: 'API is running',
    endpoints: {
      auth: '/api/auth',
      surveys: '/api/surveys',
      tokens: '/api/tokens',
      crypto: '/api/crypto',
      responses: '/api/responses',
      publicResponses: '/api/public-responses'
    },
    documentation: '/api-docs',
    health: '/health'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/crypto', cryptoRoutes);
app.use('/api/public-responses', publicResponseRoutes);

// Global error handling middleware
app.use(errorHandler);

// Start server
app.listen(port, async () => {
  try {
    // Connect to Redis
    await redisClient.connect();
    console.log('Connected to Redis');

    console.log(`Server is running on port ${port}`);
    console.log(`Health check available at: http://localhost:${port}/health`);
    console.log(`API documentation available at: /api-docs`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}); 