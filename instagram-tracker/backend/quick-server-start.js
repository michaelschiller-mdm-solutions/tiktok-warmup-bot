// Quick server start without migration timeout issues
const express = require('express');
const cors = require('cors');
const { db } = require('./dist/database');

async function quickStart() {
  try {
    console.log('🚀 Starting server without migration delays...');
    
    // Test database connection first
    console.log('🔌 Testing database connection...');
    const dbTest = await db.query('SELECT NOW() as current_time');
    console.log(`✅ Database connected: ${dbTest.rows[0].current_time}`);
    
    // Create Express app
    const app = express();
    
    // Basic middleware
    app.use(cors({
      origin: 'http://localhost:3090',
      credentials: true
    }));
    app.use(express.json());
    
    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        message: 'Server running without migration timeout'
      });
    });
    
    // Start server
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log('🔗 CORS enabled for: http://localhost:3090');
      console.log('\n🎯 Server started successfully without migration timeout!');
      console.log('💡 You can now test the automation system');
    });
    
    // Start the warmup queue service
    console.log('🤖 Starting warmup automation queue...');
    const { WarmupQueueService } = require('./dist/services/WarmupQueueService');
    const queueService = new WarmupQueueService();
    
    try {
      await queueService.start();
      console.log('✅ Warmup automation queue started successfully');
    } catch (queueError) {
      console.log('⚠️ Warmup queue failed to start:', queueError.message);
      console.log('💡 Server will continue running for frontend connectivity');
    }
    
  } catch (error) {
    console.error('❌ Quick start failed:', error);
    process.exit(1);
  }
}

quickStart();