import express, { Express } from 'express';
import { createServer, Server } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { testConnection } from './database';
import { runMigrations } from './scripts/migrate';

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
import centralContentRouter from './routes/centralContent';
import iphoneManagementRouter from './routes/iphone-management';
import sprintsRouter from './routes/sprints';
import contentQueueRouter from './routes/contentQueue';
import campaignPoolsRouter from './routes/campaignPools';
import emergencyContentRouter from './routes/emergencyContent';
import highlightGroupsRouter from './routes/highlightGroups';
import ganttRouter from './routes/gantt';
import maintenanceStatusRouter from './routes/maintenanceStatus';
import botIntegrationRouter from './routes/botIntegration';
import settingsRoutes from './routes/settings';
import automationRouter, { setupWebSocket } from './routes/automation';
import warmupContentAssignmentRouter from './routes/warmupContentAssignment';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3090';

// Initialize Express app
const app: Express = express();
const server: Server = createServer(app); // Create an HTTP server

// Test database connection on startup
testConnection().then(connected => {
  if (!connected) {
    process.exit(1);
  }
});

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: ['http://localhost:3090', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploaded content with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, '../uploads')));

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

// Central Content API Routes
app.use('/api/central', centralContentRouter);
app.use('/api/content-queue', contentQueueRouter);

// Sprint Management API Routes
app.use('/api/sprints', sprintsRouter);
app.use('/api/campaign-pools', campaignPoolsRouter);

// Emergency Content API Routes
app.use('/api/emergency-content', emergencyContentRouter);

// Highlight Groups API Routes
app.use('/api/highlight-groups', highlightGroupsRouter);

// iPhone Management API Routes
app.use('/api/iphones', iphoneManagementRouter);

// Gantt Chart API Routes
app.use('/api/gantt', ganttRouter);

// Maintenance Status API Routes
app.use('/api/maintenance-status', maintenanceStatusRouter);

// Bot Integration API Routes
app.use('/api/bot-integration', botIntegrationRouter);

// Settings API Routes
app.use('/api/settings', settingsRoutes);

// Automation API Routes
app.use('/api/automation', automationRouter);

// Warmup Content Assignment API Routes
app.use('/api/warmup-content-assignment', warmupContentAssignmentRouter);

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

// Import and initialize warmup queue service
import { WarmupQueueService } from './services/WarmupQueueService';

// Start server
async function startServer() {
  try {
    // Run migrations first to ensure database schema is up-to-date
    console.log('🔄 Running database migrations...');
    await runMigrations();
    console.log('✅ Migrations completed successfully.');

    await testConnection();
    console.log('✅ Database connected successfully');
    
    // Initialize and start warmup queue service
    console.log('🤖 Starting warmup automation queue...');
    const warmupQueue = new WarmupQueueService();
    await warmupQueue.start();
    console.log('✅ Warmup automation queue started');
    
    // Graceful shutdown handlers for warmup queue
    process.on('SIGINT', async () => {
      console.log('🛑 Shutting down gracefully...');
      await warmupQueue.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('🛑 Shutting down gracefully...');
      await warmupQueue.stop();
      process.exit(0);
    });
    
    // Attach WebSocket server
    setupWebSocket(server);

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Dashboard: http://localhost:${PORT}/health`);
      console.log(`🔗 CORS enabled for: ${CORS_ORIGIN}`);
      console.log(`📁 Static files served from: ${path.join(__dirname, '../uploads')}`);
      console.log(`🤖 Warmup automation: ACTIVE (polling every 30s)`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app; 