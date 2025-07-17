import { WarmupQueueService } from './services/WarmupQueueService';

// Initialize warmup queue service for automated processing
const warmupQueue = new WarmupQueueService();

// Start the warmup queue service
warmupQueue.start().then(() => {
  console.log('🤖 Warmup automation queue started');
}).catch((error) => {
  console.error('❌ Failed to start warmup queue:', error);
});

// Graceful shutdown
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