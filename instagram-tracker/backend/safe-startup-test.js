// Safe startup test - verify server can start without hanging
const { spawn } = require('child_process');

console.log('🧪 Testing safe server startup...');

const serverProcess = spawn('npm', ['run', 'dev'], {
  cwd: process.cwd(),
  stdio: 'pipe'
});

let serverStarted = false;
let startupTimeout;

// Set a timeout to kill the process if it doesn't start within 30 seconds
startupTimeout = setTimeout(() => {
  if (!serverStarted) {
    console.log('❌ Server startup timeout - killing process');
    serverProcess.kill('SIGTERM');
    process.exit(1);
  }
}, 30000);

serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output);
  
  // Check if server started successfully
  if (output.includes('Server running on port')) {
    console.log('✅ Server started successfully!');
    serverStarted = true;
    clearTimeout(startupTimeout);
    
    // Test API endpoint
    setTimeout(async () => {
      try {
        const response = await fetch('http://localhost:3001/health');
        const result = await response.json();
        console.log('✅ Health check passed:', result);
        
        // Test models endpoint
        const modelsResponse = await fetch('http://localhost:3001/api/models');
        console.log('✅ Models endpoint status:', modelsResponse.status);
        
        console.log('🎉 All tests passed - server is working correctly!');
        serverProcess.kill('SIGTERM');
        process.exit(0);
        
      } catch (error) {
        console.error('❌ API test failed:', error.message);
        serverProcess.kill('SIGTERM');
        process.exit(1);
      }
    }, 2000);
  }
});

serverProcess.stderr.on('data', (data) => {
  const error = data.toString();
  console.error('STDERR:', error);
  
  // Don't exit on warnings, only on actual errors
  if (error.includes('Error') && !error.includes('warning')) {
    console.log('❌ Server startup failed');
    clearTimeout(startupTimeout);
    serverProcess.kill('SIGTERM');
    process.exit(1);
  }
});

serverProcess.on('close', (code) => {
  clearTimeout(startupTimeout);
  if (!serverStarted) {
    console.log(`❌ Server process exited with code ${code}`);
    process.exit(1);
  }
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('🛑 Stopping test...');
  clearTimeout(startupTimeout);
  serverProcess.kill('SIGTERM');
  process.exit(0);
});