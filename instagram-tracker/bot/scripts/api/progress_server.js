const ProgressReporter = require('../../services/ProgressReporter');

/**
 * Standalone Progress Server
 * Starts the WebSocket progress reporting server on port 3001
 * 
 * Usage: node scripts/api/progress_server.js [port]
 */

const port = process.argv[2] ? parseInt(process.argv[2]) : 3001;

console.log('🚀 Starting Instagram Account Setup Progress Server...');

const progressReporter = new ProgressReporter(port);
progressReporter.start();

console.log(`📡 WebSocket server is listening on port ${port}`);
console.log('💡 Frontend can connect to: ws://localhost:' + port);
console.log('🛑 Press Ctrl+C to stop the server\n');

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down progress server...');
    progressReporter.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down progress server...');
    progressReporter.stop();
    process.exit(0);
});

// Keep the process alive
process.stdin.resume(); 