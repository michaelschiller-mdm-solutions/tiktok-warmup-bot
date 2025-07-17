"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WarmupQueueService_1 = require("./services/WarmupQueueService");
const warmupQueue = new WarmupQueueService_1.WarmupQueueService();
warmupQueue.start().then(() => {
    console.log('🤖 Warmup automation queue started');
}).catch((error) => {
    console.error('❌ Failed to start warmup queue:', error);
});
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
//# sourceMappingURL=app.js.map