import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { testConnection } from './database';

// Import routes
import modelsRouter from './routes/models';
import accountsRouter from './routes/accounts';
import targetUsersRouter from './routes/targetUsers';
import followsRouter from './routes/follows';
import postsRouter from './routes/posts';
import analyticsRouter from './routes/analytics';
import importRouter from './routes/import';
import reviewsRouter from './routes/reviews';
import botAccountsRouter from './routes/bot/accounts';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3090';

// Initialize Express app
const app: Express = express();

// Test database connection on startup
testConnection().then(connected => {
  if (!connected) {
    process.exit(1);
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// API Routes
app.use('/api/models', modelsRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/target-users', targetUsersRouter);
app.use('/api/follows', followsRouter);
app.use('/api/posts', postsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/import', importRouter);
app.use('/api/reviews', reviewsRouter);

// Bot API Routes
app.use('/api/bot/accounts', botAccountsRouter);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/health`);
  console.log(`🔗 CORS enabled for: ${CORS_ORIGIN}`);
});

export default app; 