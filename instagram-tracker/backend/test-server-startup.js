// Test server startup without warmup queue to isolate the issue
const express = require('express');
const cors = require('cors');
const { testConnection } = require('./dist/database');

const app = express();
const PORT = 3001;

app.use(cors({
  origin: ['http://localhost:3090', 'http://localhost:3000'],
  credentials: true,
}));

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

app.get('/api/models', (req, res) => {
  res.json({ message: 'Models endpoint working' });
});

async function startBasicServer() {
  try {
    console.log('🔄 Testing database connection...');
    const connected = await testConnection();
    
    if (!connected) {
      console.error('❌ Database connection failed');
      process.exit(1);
    }
    
    console.log('✅ Database connected successfully');
    
    app.listen(PORT, () => {
      console.log(`🚀 Basic server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 Test API: http://localhost:${PORT}/api/models`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start basic server:', error);
    process.exit(1);
  }
}

startBasicServer();